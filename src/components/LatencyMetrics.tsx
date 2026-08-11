import React from "react";
import { LatencyStats } from "../types";
import { Zap, Wifi, Radio, Cpu, Layers } from "lucide-react";

interface LatencyMetricsProps {
  stats: LatencyStats;
  isConnected: boolean;
  currentModelName?: string;
}

export const LatencyMetrics: React.FC<LatencyMetricsProps> = ({
  stats,
  isConnected,
  currentModelName = "Gemini Live",
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 text-xs">
      {/* WS Latency */}
      <div className="flex items-center gap-2.5 p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/40">
        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
          <Zap className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-semibold text-slate-400">
            Độ trễ WS
          </div>
          <div className="font-bold text-slate-100 text-sm">
            {isConnected ? `${stats.wsPingMs} ms` : "--"}
          </div>
        </div>
      </div>

      {/* Model ID */}
      <div className="flex items-center gap-2.5 p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/40">
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
          <Cpu className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-semibold text-slate-400">
            Mô hình AI
          </div>
          <div className="font-bold text-slate-100 text-sm truncate max-w-[120px]" title={currentModelName}>
            {currentModelName}
          </div>
        </div>
      </div>

      {/* Audio Streams Received */}
      <div className="flex items-center gap-2.5 p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/40">
        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
          <Radio className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-semibold text-slate-400">
            Audio 24kHz (AI)
          </div>
          <div className="font-bold text-slate-100 text-sm">
            {stats.audioChunksReceived} gói
          </div>
        </div>
      </div>

      {/* Audio Streams Sent */}
      <div className="flex items-center gap-2.5 p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/40">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-semibold text-slate-400">
            Audio 16kHz (Mic)
          </div>
          <div className="font-bold text-slate-100 text-sm">
            {stats.audioChunksSent} gói
          </div>
        </div>
      </div>
    </div>
  );
};
