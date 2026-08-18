import React, { useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, Sparkles, RefreshCw, Radio } from "lucide-react";

interface VoiceVisualizerProps {
  userVolume: number;
  aiVolume: number;
  isUserSpeaking: boolean;
  isAiSpeaking: boolean;
  isConnected: boolean;
  connectionState?: "connected" | "connecting" | "disconnected" | "error";
  selectedVoice: string;
  isMicActive?: boolean;
  onToggleMic?: () => void;
  onReconnect?: () => void;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  userVolume,
  aiVolume,
  isUserSpeaking,
  isAiSpeaking,
  isConnected,
  connectionState = isConnected ? "connected" : "disconnected",
  selectedVoice,
  isMicActive,
  onToggleMic,
  onReconnect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = 54;

      // Determine active status and intensity
      const activeVolume = isAiSpeaking ? aiVolume : isUserSpeaking ? userVolume : 0.05;
      const activeColor = isAiSpeaking
        ? "rgba(99, 102, 241, " // Indigo for AI
        : isMicActive || isUserSpeaking
        ? "rgba(244, 63, 94, " // Rose for User Mic
        : "rgba(16, 185, 129, "; // Emerald for Idle/Ready

      // Outer glowing pulse rings
      const ringCount = 3;
      for (let i = ringCount; i >= 1; i--) {
        const pulse = Math.sin(angle * 2 + i) * 6 * activeVolume;
        const radius = Math.max(1, baseRadius + i * 14 + pulse * 10);

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `${activeColor}${0.35 / i})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Core Organic Waveform Orb
      ctx.beginPath();
      const points = 60;
      angle += 0.03 + activeVolume * 0.06;

      for (let i = 0; i <= points; i++) {
        const theta = (i / points) * Math.PI * 2;
        const wave =
          Math.sin(theta * 5 + angle * 3) * 14 * activeVolume +
          Math.cos(theta * 8 - angle * 2) * 9 * activeVolume;

        const r = Math.max(1, baseRadius + wave);
        const x = centerX + r * Math.cos(theta);
        const y = centerY + r * Math.sin(theta);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Radial Gradient Fill
      const innerGradR = Math.max(0, 10);
      const outerGradR = Math.max(innerGradR + 1, baseRadius + 24);
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        innerGradR,
        centerX,
        centerY,
        outerGradR
      );

      if (isAiSpeaking) {
        gradient.addColorStop(0, "rgba(129, 140, 248, 0.95)");
        gradient.addColorStop(0.6, "rgba(99, 102, 241, 0.7)");
        gradient.addColorStop(1, "rgba(67, 56, 202, 0.15)");
      } else if (isMicActive || isUserSpeaking) {
        gradient.addColorStop(0, "rgba(251, 113, 133, 0.95)");
        gradient.addColorStop(0.6, "rgba(244, 63, 94, 0.7)");
        gradient.addColorStop(1, "rgba(190, 18, 60, 0.15)");
      } else {
        gradient.addColorStop(0, "rgba(52, 211, 153, 0.95)");
        gradient.addColorStop(0.6, "rgba(16, 185, 129, 0.65)");
        gradient.addColorStop(1, "rgba(5, 150, 105, 0.15)");
      }

      ctx.fillStyle = gradient;
      ctx.fill();

      // Sharp inner border
      ctx.strokeStyle = isAiSpeaking
        ? "#a5b4fc"
        : isMicActive || isUserSpeaking
        ? "#fda4af"
        : "#6ee7b7";
      ctx.lineWidth = 3;
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [userVolume, aiVolume, isUserSpeaking, isAiSpeaking, isMicActive]);

  return (
    <div className="relative flex flex-col items-center justify-center p-3.5 sm:p-5 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden w-full">
      {/* Background ambient glow */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 blur-3xl pointer-events-none ${
          isAiSpeaking
            ? "bg-indigo-500/25 opacity-100"
            : isMicActive || isUserSpeaking
            ? "bg-rose-500/25 opacity-100"
            : "bg-emerald-500/15 opacity-100"
        }`}
      />

      {/* Top Status Header */}
      <div className="relative z-10 w-full flex items-center justify-between mb-1 px-1 text-xs font-medium text-slate-400">
        <button
          onClick={onReconnect}
          type="button"
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer text-left"
          title={connectionState === "connected" ? "Đã kết nối trực tiếp" : "Chạm để kết nối lại"}
        >
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              connectionState === "connected"
                ? "bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]"
                : connectionState === "connecting"
                ? "bg-amber-400 animate-ping"
                : "bg-rose-500 shadow-[0_0_8px_#f43f5e]"
            }`}
          />
          <span className="text-slate-200 font-extrabold tracking-wide text-[11px] sm:text-xs">
            {connectionState === "connected"
              ? "LIVE • DUPLOID VOIP"
              : connectionState === "connecting"
              ? "ĐANG KẾT NỐI LẠI..."
              : "MẤT KẾT NỐI • THỬ LẠI"}
          </span>
          {connectionState !== "connected" && (
            <RefreshCw className="w-3 h-3 text-amber-400 animate-spin ml-1" />
          )}
        </button>

        <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/90 rounded-full border border-slate-700 text-indigo-300 text-[11px] sm:text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Giọng AI: {selectedVoice}</span>
        </div>
      </div>

      {/* Main Interactive Ultra-Large Canvas & Center Button */}
      <div
        onClick={onToggleMic}
        className="relative flex items-center justify-center my-2 cursor-pointer group select-none"
        title="Chạm nút tròn để Bật / Tắt Microphone"
      >
        <canvas
          ref={canvasRef}
          width={280}
          height={180}
          className="relative z-10 transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
        />

        {/* Center Dynamic Icon Overlay with Huge Touch Area */}
        <div className="absolute z-20 pointer-events-none flex flex-col items-center justify-center text-white drop-shadow-lg">
          {isAiSpeaking ? (
            <div className="flex flex-col items-center">
              <Volume2 className="w-10 h-10 text-white drop-shadow-[0_0_12px_rgba(165,180,252,0.9)] animate-pulse" />
              <span className="text-xs uppercase font-black tracking-widest text-white mt-1">
                NGẮT LỜI
              </span>
            </div>
          ) : isMicActive || isUserSpeaking ? (
            <div className="flex flex-col items-center">
              <MicOff className="w-10 h-10 text-white drop-shadow-[0_0_12px_rgba(251,113,133,0.9)] animate-pulse" />
              <span className="text-xs uppercase font-black tracking-widest text-white mt-1">
                TẮT MIC
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Mic className="w-11 h-11 text-white drop-shadow-[0_0_12px_rgba(110,231,183,0.9)] group-hover:scale-110 transition-transform" />
              <span className="text-xs uppercase font-black tracking-widest text-white mt-1">
                BẬT MIC
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Realtime Audio Volume Equalizer Bars */}
      <div className="relative z-10 flex items-center gap-1.5 my-1 h-5">
        {Array.from({ length: 16 }).map((_, i) => {
          const vol = isAiSpeaking ? aiVolume : isUserSpeaking || isMicActive ? userVolume : 0.05;
          const factor = Math.sin((i / 16) * Math.PI) * vol;
          const barHeight = Math.max(4, Math.floor(factor * 20));

          return (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-75 ${
                isAiSpeaking
                  ? "bg-indigo-400"
                  : isMicActive || isUserSpeaking
                  ? "bg-rose-400"
                  : "bg-emerald-400/60"
              }`}
              style={{ height: `${barHeight}px` }}
            />
          );
        })}
      </div>

      {/* Guidance Hint */}
      <div className="relative z-10 text-center mt-1 text-[11px] sm:text-xs font-bold text-slate-300">
        {isMicActive ? (
          <span className="text-rose-300 flex items-center justify-center gap-1">
            <Radio className="w-3.5 h-3.5 animate-pulse text-rose-400" />
            ĐANG LẮNG NGHE • CHẠM NÚT TRÒN GIỮA ĐỂ TẮT MIC
          </span>
        ) : (
          <span className="text-emerald-300">
            ✨ CHẠM VÀO NÚT MICRO Ở GIỮA ĐỂ BẮT ĐẦU NÓI TRỰC TIẾP
          </span>
        )}
      </div>
    </div>
  );
};

