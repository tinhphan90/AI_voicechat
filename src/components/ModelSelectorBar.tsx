import React from "react";
import { AiModelProfile } from "../types";
import { AI_MODELS } from "../data/models";
import {
  Sparkles,
  ChevronDown,
  MessageCircle,
  PenTool,
  BookOpen,
  Code2,
  GraduationCap,
  Bot,
  Zap,
} from "lucide-react";

interface ModelSelectorBarProps {
  selectedModel: AiModelProfile;
  onOpenModelModal: () => void;
  onSelectModel: (model: AiModelProfile) => void;
  isConnected: boolean;
}

const getModelIcon = (iconName: string) => {
  switch (iconName) {
    case "MessageCircle":
      return <MessageCircle className="w-4 h-4" />;
    case "PenTool":
      return <PenTool className="w-4 h-4" />;
    case "BookOpen":
      return <BookOpen className="w-4 h-4" />;
    case "Code2":
      return <Code2 className="w-4 h-4" />;
    case "GraduationCap":
      return <GraduationCap className="w-4 h-4" />;
    default:
      return <Bot className="w-4 h-4" />;
  }
};

export const ModelSelectorBar: React.FC<ModelSelectorBarProps> = ({
  selectedModel,
  onOpenModelModal,
  onSelectModel,
  isConnected,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800/90 backdrop-blur-md rounded-2xl p-3 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Selected Model Card Overview */}
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl bg-gradient-to-br ${selectedModel.accentColor} text-white shadow-md flex-shrink-0`}
          >
            {getModelIcon(selectedModel.iconName)}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Mô hình AI đang chọn:
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                {selectedModel.badge}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              {selectedModel.name}
              <span className="text-xs font-normal text-slate-400 font-mono">
                ({selectedModel.geminiModel})
              </span>
            </h2>
          </div>
        </div>

        {/* Action Button to Change Model */}
        <button
          onClick={onOpenModelModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all border border-indigo-500/50"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
          <span>Đổi Mô hình AI</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-80" />
        </button>
      </div>

      {/* Quick Model Pills */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
        <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap mr-1">
          Nhanh:
        </span>
        {AI_MODELS.map((model) => {
          const isActive = selectedModel.id === model.id;
          return (
            <button
              key={model.id}
              onClick={() => onSelectModel(model)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                isActive
                  ? "bg-slate-800 text-white border-indigo-500 shadow-sm"
                  : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <span className={isActive ? "text-indigo-400" : "text-slate-500"}>
                {getModelIcon(model.iconName)}
              </span>
              <span>{model.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
