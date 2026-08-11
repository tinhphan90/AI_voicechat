import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  MessageSquare,
  X,
  Send,
  Bot,
  Zap,
  Sliders,
  ChevronUp,
} from "lucide-react";
import { ConnectionState, VoiceOption } from "../types";

interface RobotAssistantWidgetProps {
  connectionState: ConnectionState;
  isMicActive: boolean;
  isAiMuted: boolean;
  isUserSpeaking: boolean;
  isAiSpeaking: boolean;
  aiVolume: number;
  userVolume: number;
  selectedModelName: string;
  selectedVoice: VoiceOption;
  lastAiMessage?: string;
  onToggleMic: () => void;
  onToggleMuteAi: () => void;
  onSendText: (text: string) => void;
  onOpenSettings?: () => void;
}

export const RobotAssistantWidget: React.FC<RobotAssistantWidgetProps> = ({
  connectionState,
  isMicActive,
  isAiMuted,
  isUserSpeaking,
  isAiSpeaking,
  aiVolume,
  userVolume,
  selectedModelName,
  selectedVoice,
  lastAiMessage,
  onToggleMic,
  onToggleMuteAi,
  onSendText,
  onOpenSettings,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [speechBubbleText, setSpeechBubbleText] = useState<string>("Xin chào! Tôi là Trợ lý Robot AI. Bấm để trò chuyện cùng tôi nhé! 🤖");
  const [showSpeechBubble, setShowSpeechBubble] = useState<boolean>(true);
  const [inputText, setInputText] = useState<string>("");
  const [isBlinking, setIsBlinking] = useState<boolean>(false);

  // Auto blink eyes every few seconds
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 4000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Update speech bubble when AI speaks or status changes
  useEffect(() => {
    if (isAiSpeaking) {
      if (lastAiMessage) {
        setSpeechBubbleText(lastAiMessage);
      } else {
        setSpeechBubbleText("Đang trả lời bằng giọng nói... 🔊");
      }
      setShowSpeechBubble(true);
    } else if (isUserSpeaking) {
      setSpeechBubbleText("Tôi đang lắng nghe bạn... 🎙️");
      setShowSpeechBubble(true);
    } else if (connectionState === "connecting") {
      setSpeechBubbleText("Đang kết nối hệ thống Gemini Live...");
      setShowSpeechBubble(true);
    } else if (connectionState === "error") {
      setSpeechBubbleText("Rất tiếc, đã xảy ra lỗi kết nối! ⚠️");
      setShowSpeechBubble(true);
    } else if (lastAiMessage && lastAiMessage.length > 0) {
      setSpeechBubbleText(lastAiMessage);
    }
  }, [isAiSpeaking, isUserSpeaking, connectionState, lastAiMessage]);

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendText(inputText.trim());
    setInputText("");
  };

  const isConnected = connectionState === "connected";

  // Calculate dynamic glow and pulse scale based on volume
  const activeVolume = isAiSpeaking ? aiVolume : isUserSpeaking ? userVolume : 0;
  const pulseScale = 1 + Math.min(activeVolume * 0.4, 0.25);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none">
      <div className="pointer-events-auto flex flex-col items-end">
        {/* Floating Quick Control & Chat Window Popover */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="mb-3 w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-slate-900/95 border border-indigo-500/30 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-indigo-900/80 via-slate-900 to-purple-900/80 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-9 h-9 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center shadow-inner">
                    <Bot className="w-5 h-5 text-indigo-300" />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                        isConnected ? "bg-emerald-400" : "bg-amber-400"
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {selectedModelName}
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                    </h3>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      Giọng: <span className="text-indigo-300 font-medium">{selectedVoice}</span>
                      <span className="text-slate-600">•</span>
                      <span>{isConnected ? "Đã kết nối Live" : "Đang ngoại tuyến"}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {onOpenSettings && (
                    <button
                      onClick={onOpenSettings}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                      title="Cài đặt giọng nói"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Status & Live Preview Banner */}
              <div className="p-3.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isAiSpeaking
                        ? "bg-purple-400 animate-ping"
                        : isUserSpeaking
                        ? "bg-cyan-400 animate-pulse"
                        : isMicActive
                        ? "bg-emerald-400"
                        : "bg-slate-500"
                    }`}
                  />
                  <span className="text-xs font-medium text-slate-300 truncate">
                    {isAiSpeaking
                      ? "Robot đang nói..."
                      : isUserSpeaking
                      ? "Robot đang nghe bạn..."
                      : isMicActive
                      ? "Micro đang bật"
                      : "Micro đang tắt"}
                  </span>
                </div>

                {/* Quick Mic Button inside Popover */}
                <button
                  onClick={onToggleMic}
                  disabled={!isConnected}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-md ${
                    isMicActive
                      ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {isMicActive ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      <span>Tắt Mic</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      <span>Bật Mic</span>
                    </>
                  )}
                </button>
              </div>

              {/* Speech / Output Message Content */}
              <div className="p-4 space-y-3 max-h-56 overflow-y-auto">
                <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-2xl p-3 text-xs text-indigo-100 leading-relaxed shadow-inner">
                  <div className="flex items-center justify-between mb-1 text-[10px] text-indigo-300/80 font-medium uppercase tracking-wider">
                    <span>Phản hồi mới nhất</span>
                    {isAiSpeaking && <span className="text-purple-400 font-bold animate-pulse">AUDIO LIVE</span>}
                  </div>
                  {speechBubbleText}
                </div>

                {/* Sample Prompt Suggestions */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 block">Gợi ý nói chuyện:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Xin chào Robot!",
                      "Giới thiệu bản thân nhé",
                      "Thời tiết hôm nay thế nào?",
                      "Kể cho tôi một câu chuyện",
                    ].map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSendText(prompt)}
                        disabled={!isConnected}
                        className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-indigo-900/60 hover:border-indigo-500/50 border border-slate-700/70 text-slate-300 rounded-lg transition disabled:opacity-40 text-left"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Text Input Footer */}
              <form
                onSubmit={handleSubmitText}
                className="p-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={isConnected ? "Gửi tin nhắn cho Robot..." : "Đang chờ kết nối..."}
                  disabled={!isConnected}
                  className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || !isConnected}
                  className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition shadow-md disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Speech Bubble Overlay above Robot */}
        <AnimatePresence>
          {!isOpen && showSpeechBubble && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              className="mb-2 max-w-xs bg-slate-900/90 border border-indigo-500/40 text-indigo-100 text-xs px-3.5 py-2.5 rounded-2xl rounded-br-none shadow-xl backdrop-blur-md relative group flex items-start gap-2"
            >
              <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <p className="line-clamp-2 leading-snug">{speechBubbleText}</p>
              <button
                onClick={() => setShowSpeechBubble(false)}
                className="text-slate-500 hover:text-slate-300 transition -mr-1 -mt-1"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Main Animated Robot Widget Button */}
        <div className="relative group flex items-center justify-center">
          {/* External Audio Wave Halo when speaking */}
          {(isAiSpeaking || isUserSpeaking) && (
            <motion.div
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.6, 0.1, 0.6],
              }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className={`absolute inset-0 rounded-full blur-md ${
                isAiSpeaking ? "bg-purple-500/50" : "bg-cyan-500/50"
              }`}
            />
          )}

          {/* Interactive Robot Button */}
          <motion.button
            onClick={() => {
              setIsOpen(!isOpen);
              setShowSpeechBubble(false);
            }}
            style={{ transform: `scale(${pulseScale})` }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-b from-slate-800 via-slate-900 to-indigo-950 border-2 transition-all shadow-2xl flex items-center justify-center overflow-visible cursor-pointer ${
              isAiSpeaking
                ? "border-purple-400 shadow-purple-500/40"
                : isUserSpeaking
                ? "border-cyan-400 shadow-cyan-500/40"
                : isMicActive
                ? "border-emerald-400 shadow-emerald-500/30"
                : "border-indigo-500/50 hover:border-indigo-400 shadow-indigo-900/50"
            }`}
          >
            {/* SVG Interactive Robot Character Design */}
            <svg
              viewBox="0 0 100 100"
              className="w-12 h-12 sm:w-16 sm:h-16 overflow-visible"
            >
              {/* Top Antenna */}
              <line x1="50" y1="20" x2="50" y2="8" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" />
              {/* Antenna Glowing Orb Tip */}
              <circle
                cx="50"
                cy="6"
                r={isAiSpeaking || isUserSpeaking ? "5" : "4"}
                fill={
                  isAiSpeaking
                    ? "#c084fc"
                    : isUserSpeaking
                    ? "#22d3ee"
                    : isConnected
                    ? "#34d399"
                    : "#f59e0b"
                }
                className={isAiSpeaking || isUserSpeaking ? "animate-ping" : ""}
              />
              <circle
                cx="50"
                cy="6"
                r="4"
                fill={
                  isAiSpeaking
                    ? "#a855f7"
                    : isUserSpeaking
                    ? "#06b6d4"
                    : isConnected
                    ? "#10b981"
                    : "#d97706"
                }
              />

              {/* Side Ears / Headphones */}
              <rect x="18" y="32" width="8" height="24" rx="4" fill="#334155" stroke="#6366f1" strokeWidth="1.5" />
              <rect x="74" y="32" width="8" height="24" rx="4" fill="#334155" stroke="#6366f1" strokeWidth="1.5" />
              <circle cx="22" cy="44" r="2.5" fill={isAiSpeaking ? "#a855f7" : "#818cf8"} />
              <circle cx="78" cy="44" r="2.5" fill={isAiSpeaking ? "#a855f7" : "#818cf8"} />

              {/* Robot Head Outer Helmet */}
              <rect
                x="24"
                y="20"
                width="52"
                height="48"
                rx="16"
                fill="url(#robotHeadGrad)"
                stroke="#6366f1"
                strokeWidth="2"
              />

              {/* Helmet Metallic Gradient Definition */}
              <defs>
                <linearGradient id="robotHeadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="50%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#1e1b4b" />
                </linearGradient>
                <linearGradient id="visorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#020617" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
              </defs>

              {/* Robot Visor Screen */}
              <rect
                x="29"
                y="27"
                width="42"
                height="26"
                rx="10"
                fill="url(#visorGrad)"
                stroke={isAiSpeaking ? "#c084fc" : isUserSpeaking ? "#22d3ee" : "#475569"}
                strokeWidth="1.5"
              />

              {/* Visor Glare Accent */}
              <path d="M 32 30 L 42 30 L 34 40 L 32 40 Z" fill="#ffffff" opacity="0.15" />

              {/* Robot Eyes */}
              {isBlinking ? (
                /* Closed Blinking Eyes */
                <>
                  <line x1="36" y1="40" x2="44" y2="40" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="56" y1="40" x2="64" y2="40" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" />
                </>
              ) : isAiSpeaking ? (
                /* AI Speaking: Happy Arcs ^ ^ */
                <>
                  <path d="M 35 42 Q 40 35 45 42" stroke="#c084fc" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M 55 42 Q 60 35 65 42" stroke="#c084fc" strokeWidth="3" fill="none" strokeLinecap="round" />
                </>
              ) : isUserSpeaking ? (
                /* User Speaking: Wide Listening Glowing Eyes */
                <>
                  <circle cx="40" cy="40" r="5" fill="#22d3ee" />
                  <circle cx="60" cy="40" r="5" fill="#22d3ee" />
                  <circle cx="41" cy="39" r="2" fill="#ffffff" />
                  <circle cx="61" cy="39" r="2" fill="#ffffff" />
                </>
              ) : (
                /* Normal Idle Expressive Glowing Eyes */
                <>
                  <circle cx="40" cy="40" r="4" fill="#818cf8" />
                  <circle cx="60" cy="40" r="4" fill="#818cf8" />
                  <circle cx="41.5" cy="38.5" r="1.5" fill="#ffffff" />
                  <circle cx="61.5" cy="38.5" r="1.5" fill="#ffffff" />
                </>
              )}

              {/* Robot Mouth / LED Speaker Lines */}
              {isAiSpeaking ? (
                /* Dynamic Mouth Wave Soundbars when AI talks */
                <g>
                  <line x1="38" y1="60" x2="38" y2="60" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
                  <line x1="43" y1="58" x2="43" y2="62" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
                  <line x1="50" y1="57" x2="50" y2="63" stroke="#e879f9" strokeWidth="2" strokeLinecap="round" />
                  <line x1="57" y1="58" x2="57" y2="62" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
                  <line x1="62" y1="60" x2="62" y2="60" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
                </g>
              ) : (
                /* Cute Static LED Smile */
                <path d="M 42 59 Q 50 63 58 59" stroke="#6366f1" strokeWidth="2" fill="none" strokeLinecap="round" />
              )}

              {/* Robot Neck & Chest Collar */}
              <path d="M 40 68 L 60 68 L 65 78 L 35 78 Z" fill="#1e293b" stroke="#475569" strokeWidth="1" />
              {/* Chest Glowing Emblem */}
              <circle
                cx="50"
                cy="74"
                r="3"
                fill={isMicActive ? "#10b981" : "#6366f1"}
                className={isMicActive ? "animate-pulse" : ""}
              />
            </svg>

            {/* Micro Quick Status Icon Badge on Robot Button */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                onToggleMic();
              }}
              className={`absolute -top-1 -right-1 p-1.5 rounded-full border-2 border-slate-900 transition-all ${
                isMicActive
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/50 hover:bg-rose-500"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700"
              }`}
              title={isMicActive ? "Tắt micro" : "Bật micro trực tiếp"}
            >
              {isMicActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            </div>

            {/* Mute AI Audio Indicator Badge */}
            {isAiMuted && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMuteAi();
                }}
                className="absolute -bottom-1 -left-1 p-1.5 rounded-full bg-amber-600 text-white border-2 border-slate-900 shadow-md"
                title="Âm thanh AI đang tắt"
              >
                <VolumeX className="w-3.5 h-3.5" />
              </div>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};
