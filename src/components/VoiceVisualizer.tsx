import React, { useEffect, useRef } from "react";
import { Mic, Volume2, Sparkles, Activity } from "lucide-react";

interface VoiceVisualizerProps {
  userVolume: number;
  aiVolume: number;
  isUserSpeaking: boolean;
  isAiSpeaking: boolean;
  isConnected: boolean;
  selectedVoice: string;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  userVolume,
  aiVolume,
  isUserSpeaking,
  isAiSpeaking,
  isConnected,
  selectedVoice,
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
      const baseRadius = 42;

      // Determine active status and intensity
      const activeVolume = isAiSpeaking ? aiVolume : isUserSpeaking ? userVolume : 0.05;
      const activeColor = isAiSpeaking
        ? "rgba(99, 102, 241, " // Indigo for AI
        : isUserSpeaking
        ? "rgba(16, 185, 129, " // Emerald for User
        : "rgba(148, 163, 184, "; // Slate for Idle

      // Outer glowing pulse rings
      const ringCount = 3;
      for (let i = ringCount; i >= 1; i--) {
        const pulse = Math.sin(angle * 2 + i) * 5 * activeVolume;
        const radius = Math.max(1, baseRadius + i * 10 + pulse * 8);

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `${activeColor}${0.15 / i})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Core Organic Waveform Orb
      ctx.beginPath();
      const points = 60;
      angle += 0.03 + activeVolume * 0.05;

      for (let i = 0; i <= points; i++) {
        const theta = (i / points) * Math.PI * 2;
        // Harmonic noise simulation
        const wave =
          Math.sin(theta * 5 + angle * 3) * 12 * activeVolume +
          Math.cos(theta * 8 - angle * 2) * 8 * activeVolume;

        const r = Math.max(1, baseRadius + wave);
        const x = centerX + r * Math.cos(theta);
        const y = centerY + r * Math.sin(theta);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Radial Gradient Fill
      const innerGradR = Math.max(0, 10);
      const outerGradR = Math.max(innerGradR + 1, baseRadius + 20);
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        innerGradR,
        centerX,
        centerY,
        outerGradR
      );

      if (isAiSpeaking) {
        gradient.addColorStop(0, "rgba(129, 140, 248, 0.9)");
        gradient.addColorStop(0.6, "rgba(99, 102, 241, 0.6)");
        gradient.addColorStop(1, "rgba(67, 56, 202, 0.1)");
      } else if (isUserSpeaking) {
        gradient.addColorStop(0, "rgba(52, 211, 153, 0.9)");
        gradient.addColorStop(0.6, "rgba(16, 185, 129, 0.6)");
        gradient.addColorStop(1, "rgba(5, 150, 105, 0.1)");
      } else {
        gradient.addColorStop(0, "rgba(226, 232, 240, 0.6)");
        gradient.addColorStop(0.6, "rgba(203, 213, 225, 0.3)");
        gradient.addColorStop(1, "rgba(148, 163, 184, 0.05)");
      }

      ctx.fillStyle = gradient;
      ctx.fill();

      // Sharp inner border
      ctx.strokeStyle = isAiSpeaking
        ? "#818cf8"
        : isUserSpeaking
        ? "#34d399"
        : "#cbd5e1";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [userVolume, aiVolume, isUserSpeaking, isAiSpeaking]);

  return (
    <div className="relative flex flex-col items-center justify-center p-3.5 sm:p-4 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden">
      {/* Background ambient glow */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 blur-2xl pointer-events-none ${
          isAiSpeaking
            ? "bg-indigo-500/20 opacity-100"
            : isUserSpeaking
            ? "bg-emerald-500/20 opacity-100"
            : "bg-transparent opacity-0"
        }`}
      />

      {/* Top Status Header */}
      <div className="relative z-10 w-full flex items-center justify-between mb-1 px-1 text-[11px] sm:text-xs font-medium text-slate-400">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              isConnected
                ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"
                : "bg-rose-500"
            }`}
          />
          <span className="text-slate-300 font-semibold tracking-wide text-[11px]">
            {isConnected ? "WEBSOCKETS LIVE" : "DISCONNECTED"}
          </span>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-0.5 bg-slate-800/80 rounded-full border border-slate-700/60 text-indigo-300 text-[11px]">
          <Sparkles className="w-3 h-3" />
          <span>Giọng AI: {selectedVoice}</span>
        </div>
      </div>

      {/* Main Interactive Canvas */}
      <div className="relative flex items-center justify-center my-1.5">
        <canvas
          ref={canvasRef}
          width={240}
          height={160}
          className="relative z-10 cursor-pointer"
        />

        {/* Center Dynamic Icon Overlay */}
        <div className="absolute z-20 pointer-events-none flex flex-col items-center justify-center text-white">
          {isAiSpeaking ? (
            <div className="flex flex-col items-center animate-bounce">
              <Volume2 className="w-7 h-7 text-indigo-300 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
              <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-200 mt-0.5">
                AI Đang nói
              </span>
            </div>
          ) : isUserSpeaking ? (
            <div className="flex flex-col items-center animate-pulse">
              <Mic className="w-7 h-7 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-200 mt-0.5">
                Bạn đang nói
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center opacity-60">
              <Activity className="w-6 h-6 text-slate-400" />
              <span className="text-[9px] uppercase font-medium tracking-wider text-slate-400 mt-0.5">
                Sẵn sàng trò chuyện
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Realtime Audio Volume Equalizer Bars */}
      <div className="relative z-10 flex items-center gap-1 mt-0.5 h-4">
        {Array.from({ length: 14 }).map((_, i) => {
          const vol = isAiSpeaking ? aiVolume : isUserSpeaking ? userVolume : 0.05;
          const factor = Math.sin((i / 14) * Math.PI) * vol;
          const barHeight = Math.max(3, Math.floor(factor * 16));

          return (
            <div
              key={i}
              className={`w-0.5 rounded-full transition-all duration-75 ${
                isAiSpeaking
                  ? "bg-indigo-400"
                  : isUserSpeaking
                  ? "bg-emerald-400"
                  : "bg-slate-700"
              }`}
              style={{ height: `${barHeight}px` }}
            />
          );
        })}
      </div>
    </div>
  );
};
