import React, { useState, useEffect } from "react";
import { VoiceOption, VoiceProfile, SystemPromptPreset, AiModelProfile } from "../types";
import { AI_MODELS } from "../data/models";
import { X, Check, Mic, MessageSquare, Volume2, Sparkles, Sliders, Bot, Zap } from "lucide-react";

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVoice: VoiceOption;
  currentPrompt: string;
  selectedModelId: string;
  onSave: (voice: VoiceOption, systemPrompt: string, model: AiModelProfile) => void;
}

const VOICE_PROFILES: VoiceProfile[] = [
  { id: "Zephyr", name: "Zephyr", gender: "Nữ", description: "Giọng đọc truyền cảm, ấm áp, nhịp điệu tự nhiên (Nữ)" },
  { id: "Puck", name: "Puck", gender: "Nam", description: "Giọng nói năng động, trẻ trung, thân thiện (Nam)" },
  { id: "Charon", name: "Charon", gender: "Nam", description: "Giọng nói trầm ấm, điềm tĩnh, chuyên nghiệp (Nam)" },
  { id: "Kore", name: "Kore", gender: "Nữ", description: "Giọng nói trong trẻo, êm dịu, dễ nghe (Nữ)" },
  { id: "Fenrir", name: "Fenrir", gender: "Nam", description: "Giọng nói mạnh mẽ, tự tin, truyền cảm hứng (Nam)" },
];

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  currentVoice,
  currentPrompt,
  selectedModelId,
  onSave,
}) => {
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(currentVoice);
  const [promptText, setPromptText] = useState<string>(currentPrompt);
  const [modelId, setModelId] = useState<string>(selectedModelId);

  useEffect(() => {
    if (isOpen) {
      setSelectedVoice(currentVoice);
      setPromptText(currentPrompt);
      setModelId(selectedModelId);
    }
  }, [isOpen, currentVoice, currentPrompt, selectedModelId]);

  if (!isOpen) return null;

  const currentModelObj = AI_MODELS.find((m) => m.id === modelId) || AI_MODELS[0];

  const handleSelectModel = (model: AiModelProfile) => {
    setModelId(model.id);
    setPromptText(model.defaultPrompt);
    setSelectedVoice(model.recommendedVoice);
  };

  const handleApply = () => {
    onSave(selectedVoice, promptText, currentModelObj);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Cấu hình Cài đặt AI & Giọng nói</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Section 1: AI Model Persona Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-indigo-300 mb-3">
              <Bot className="w-4 h-4" />
              <span>Chọn Mô Hình AI Persona</span>
            </label>

            <div className="grid grid-cols-1 gap-2">
              {AI_MODELS.map((model) => {
                const isSelected = modelId === model.id;
                return (
                  <button
                    key={model.id}
                    onClick={() => handleSelectModel(model)}
                    className={`flex items-start justify-between p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? "bg-indigo-950/70 border-indigo-500 shadow-md shadow-indigo-900/30 text-white"
                        : "bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{model.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-800 text-indigo-300 border border-slate-700">
                          {model.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-snug">
                        {model.description}
                      </p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Voice Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-indigo-300 mb-3">
              <Volume2 className="w-4 h-4" />
              <span>Giọng nói AI (Prebuilt Gemini Voices)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {VOICE_PROFILES.map((vp) => {
                const isSelected = selectedVoice === vp.id;
                return (
                  <button
                    key={vp.id}
                    onClick={() => setSelectedVoice(vp.id)}
                    className={`flex items-start justify-between p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? "bg-indigo-950/70 border-indigo-500 shadow-md text-white"
                        : "bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{vp.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            vp.gender === "Nữ"
                              ? "bg-pink-900/60 text-pink-300 border border-pink-700/40"
                              : "bg-blue-900/60 text-blue-300 border border-blue-700/40"
                          }`}
                        >
                          {vp.gender}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-snug">
                        {vp.description}
                      </p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: System Instructions Prompt */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-indigo-300 mb-3">
              <Sparkles className="w-4 h-4" />
              <span>Hướng Dẫn Vai Trò (System Instructions)</span>
            </label>

            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={3}
              placeholder="Nhập hướng dẫn chi tiết cho AI..."
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-900/90 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 rounded-xl transition-all"
          >
            Lưu & Khởi Động Lại Phiên Live
          </button>
        </div>
      </div>
    </div>
  );
};
