import React from "react";
import { AiModelProfile } from "../types";
import { AI_MODELS } from "../data/models";
import {
  X,
  Check,
  Sparkles,
  Bot,
  MessageCircle,
  PenTool,
  BookOpen,
  Code2,
  GraduationCap,
  Zap,
  Volume2,
} from "lucide-react";

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModelId: string;
  onSelectModel: (model: AiModelProfile) => void;
}

const getModelIcon = (iconName: string) => {
  switch (iconName) {
    case "MessageCircle":
      return <MessageCircle className="w-5 h-5" />;
    case "PenTool":
      return <PenTool className="w-5 h-5" />;
    case "BookOpen":
      return <BookOpen className="w-5 h-5" />;
    case "Code2":
      return <Code2 className="w-5 h-5" />;
    case "GraduationCap":
      return <GraduationCap className="w-5 h-5" />;
    default:
      return <Bot className="w-5 h-5" />;
  }
};

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedModelId,
  onSelectModel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Chọn Mô Hình AI & Persona</h2>
              <p className="text-xs text-slate-400">
                Lựa chọn mô hình AI chuyên biệt phù hợp cho phiên trò chuyện realtime của bạn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Model Grid */}
        <div className="p-6 space-y-3 max-h-[75vh] overflow-y-auto">
          {AI_MODELS.map((model) => {
            const isSelected = selectedModelId === model.id;

            return (
              <div
                key={model.id}
                onClick={() => {
                  onSelectModel(model);
                  onClose();
                }}
                className={`group relative flex items-start justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-slate-800/90 border-indigo-500 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/50 text-white"
                    : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700 text-slate-300"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon with gradient badge */}
                  <div
                    className={`p-3 rounded-2xl bg-gradient-to-br ${model.accentColor} text-white shadow-md flex-shrink-0 mt-0.5`}
                  >
                    {getModelIcon(model.iconName)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {model.name}
                      </h3>
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                        {model.badge}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                        <Zap className="w-3 h-3 text-amber-400" />
                        {model.geminiModel}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {model.description}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 text-slate-300 font-medium">
                        <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                        Giọng thoại đề xuất: <strong className="text-white">{model.recommendedVoice}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Selection Checkmark Indicator */}
                <div className="flex-shrink-0 ml-3">
                  {isSelected ? (
                    <div className="p-1.5 rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border border-slate-700 group-hover:border-slate-500 transition-colors" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-400">
          <span>Tất cả các mô hình sử dụng kết nối độ trễ cực thấp qua WebSockets</span>
          <button
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
