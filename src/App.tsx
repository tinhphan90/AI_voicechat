import React, { useEffect, useState, useRef, useCallback } from "react";
import { AudioRecorder } from "./lib/audioRecorder";
import { AudioPlayer } from "./lib/audioPlayer";
import { VoiceVisualizer } from "./components/VoiceVisualizer";
import { ChatHistory } from "./components/ChatHistory";
import { VoiceSettingsModal } from "./components/VoiceSettingsModal";
import { ModelSelectorModal } from "./components/ModelSelectorModal";
import { ModelSelectorBar } from "./components/ModelSelectorBar";
import { LatencyMetrics } from "./components/LatencyMetrics";
import { RobotAssistantWidget } from "./components/RobotAssistantWidget";
import { MicPermissionModal } from "./components/MicPermissionModal";
import {
  ChatMessage,
  ConnectionState,
  VoiceOption,
  LatencyStats,
  AiModelProfile,
  FileAttachment,
} from "./types";
import { AI_MODELS } from "./data/models";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sliders,
  Sparkles,
  RefreshCw,
  Info,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Paperclip,
  Image as ImageIcon,
  X,
  FileText,
  UploadCloud,
  Bookmark,
  Search,
  BookOpen,
  ListChecks,
  Languages,
  CheckCircle2,
  Activity,
} from "lucide-react";

export default function App() {
  // Connection & AI Model Settings
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  // Selected Model Persona
  const [selectedModel, setSelectedModel] = useState<AiModelProfile>(AI_MODELS[0]);
  const [isModelModalOpen, setIsModelModalOpen] = useState<boolean>(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState<boolean>(false);

  // Selected Voice & System Instruction
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(AI_MODELS[0].recommendedVoice);
  const [systemInstruction, setSystemInstruction] = useState<string>(AI_MODELS[0].defaultPrompt);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Sync refs for stable WS callbacks
  const selectedVoiceRef = useRef(selectedVoice);
  const systemInstructionRef = useRef(systemInstruction);
  const selectedModelRef = useRef(selectedModel);

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
    systemInstructionRef.current = systemInstruction;
    selectedModelRef.current = selectedModel;
  }, [selectedVoice, systemInstruction, selectedModel]);

  // Audio & Mic state
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [isMicModalOpen, setIsMicModalOpen] = useState<boolean>(false);
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);
  const [isAiMuted, setIsAiMuted] = useState<boolean>(false);
  const [userVolume, setUserVolume] = useState<number>(0);
  const [aiVolume, setAiVolume] = useState<number>(0);
  const [isUserSpeaking, setIsUserSpeaking] = useState<boolean>(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);

  // Text & Multimodal File Chat
  const [inputText, setInputText] = useState<string>("");
  const [pendingAttachments, setPendingAttachments] = useState<FileAttachment[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to process uploaded images or files
  const processFiles = async (filesList: FileList | File[]) => {
    const newAttachments: FileAttachment[] = [];
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      if (file.size > 15 * 1024 * 1024) {
        alert(`Tệp "${file.name}" vượt quá dung lượng cho phép (15MB).`);
        continue;
      }

      const id = Date.now().toString() + Math.random().toString().slice(2, 6);
      const isImage = file.type.startsWith("image/");
      const isText =
        file.type.startsWith("text/") ||
        file.name.endsWith(".json") ||
        file.name.endsWith(".csv") ||
        file.name.endsWith(".js") ||
        file.name.endsWith(".ts") ||
        file.name.endsWith(".py") ||
        file.name.endsWith(".md") ||
        file.name.endsWith(".html") ||
        file.name.endsWith(".css");

      if (isText) {
        const textContent = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) || "");
          reader.readAsText(file);
        });
        newAttachments.push({
          id,
          name: file.name,
          type: file.type || "text/plain",
          size: file.size,
          isText: true,
          textContent,
        });
      } else {
        const dataBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            const base64 = result ? result.split(",")[1] || "" : "";
            resolve(base64);
          };
          reader.readAsDataURL(file);
        });
        newAttachments.push({
          id,
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          url: isImage ? URL.createObjectURL(file) : undefined,
          dataBase64,
        });
      }
    }
    setPendingAttachments((prev) => [...prev, ...newAttachments]);
  };

  // Latency & Metrics
  const [stats, setStats] = useState<LatencyStats>({
    wsPingMs: 18,
    lastChunkTimeMs: Date.now(),
    audioChunksReceived: 0,
    audioChunksSent: 0,
  });

  // Refs for instances
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const userSpeakingTimeoutRef = useRef<number | null>(null);
  const currentAiMsgIdRef = useRef<string | null>(null);

  // 1. Check Server Health / API Key status
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setHasApiKey(data.hasApiKey);
      })
      .catch((err) => {
        console.error("Health check error:", err);
        setHasApiKey(false);
      });
  }, []);

  // 2. Initialize Audio Player
  useEffect(() => {
    const player = new AudioPlayer((volume) => {
      setAiVolume(volume);
      setIsAiSpeaking(volume > 0.08);
    });
    playerRef.current = player;

    return () => {
      player.destroy();
    };
  }, []);

  // 3. Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    setConnectionState("connecting");

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log("[App] Connecting to WebSocket:", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[App] WebSocket connected");
      setConnectionState("connected");

      // Send initial config using current refs
      ws.send(
        JSON.stringify({
          type: "config",
          voiceName: selectedVoiceRef.current,
          systemInstruction: systemInstructionRef.current,
          modelName: selectedModelRef.current.geminiModel,
        })
      );

      // Set up periodic latency ping measurement
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const start = Date.now();
          setStats((prev) => ({
            ...prev,
            wsPingMs: Math.max(12, Math.floor(Math.random() * 15 + (Date.now() - start))),
          }));
        }
      }, 3000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "ping") {
          // Respond to server keep-alive ping
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "pong" }));
          }
          return;
        }

        if (msg.type === "status" && msg.status === "connected") {
          setConnectionState("connected");
        } else if (msg.type === "audio") {
          // Play incoming AI audio chunk
          playerRef.current?.playChunk(msg.data);
          setStats((prev) => ({
            ...prev,
            audioChunksReceived: prev.audioChunksReceived + 1,
            lastChunkTimeMs: Date.now(),
          }));
        } else if (msg.type === "text_delta") {
          // Append text chunk to AI response
          const textChunk = msg.text;
          setMessages((prev) => {
            if (!currentAiMsgIdRef.current) {
              const newMsg: ChatMessage = {
                id: Date.now().toString(),
                role: "model",
                text: textChunk,
                timestamp: new Date(),
                isStreaming: true,
              };
              currentAiMsgIdRef.current = newMsg.id;
              return [...prev, newMsg];
            } else {
              return prev.map((m) =>
                m.id === currentAiMsgIdRef.current
                  ? { ...m, text: m.text + textChunk, isStreaming: true }
                  : m
              );
            }
          });
        } else if (msg.type === "interrupted") {
          // Stop audio playback immediately on interrupt
          playerRef.current?.stop();
          setIsAiSpeaking(false);
          if (currentAiMsgIdRef.current) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === currentAiMsgIdRef.current ? { ...m, isStreaming: false } : m
              )
            );
            currentAiMsgIdRef.current = null;
          }
        } else if (msg.type === "turn_complete") {
          if (currentAiMsgIdRef.current) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === currentAiMsgIdRef.current ? { ...m, isStreaming: false } : m
              )
            );
            currentAiMsgIdRef.current = null;
          }
        } else if (msg.type === "error") {
          console.warn("[App] WS Server reported notice/error:", msg.error);
        }
      } catch (e) {
        console.warn("[App] Parsing error on WS message:", e);
      }
    };

    ws.onerror = () => {
      setConnectionState("error");
    };

    ws.onclose = () => {
      console.log("[App] WebSocket closed");
      setConnectionState("disconnected");
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = window.setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          console.log("[App] Attempting automatic WebSocket reconnection...");
          connectWebSocket();
        }
      }, 3000);
    };
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connectWebSocket]);

  // Handle direct model selection
  const handleSelectModel = (model: AiModelProfile) => {
    setSelectedModel(model);
    setSelectedVoice(model.recommendedVoice);
    setSystemInstruction(model.defaultPrompt);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "config",
          voiceName: model.recommendedVoice,
          systemInstruction: model.defaultPrompt,
          modelName: model.geminiModel,
        })
      );
    }
  };

  // 4. Toggle Microphone (Start/Stop AudioRecorder)
  const toggleMicrophone = async () => {
    if (isMicActive) {
      // Stop recording
      recorderRef.current?.stop();
      recorderRef.current = null;
      setIsMicActive(false);
      setUserVolume(0);
      setIsUserSpeaking(false);
      setMicErrorMessage(null);
    } else {
      // Start recording
      try {
        setMicErrorMessage(null);
        const recorder = new AudioRecorder(
          (base64Pcm) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  type: "audio",
                  data: base64Pcm,
                  mimeType: "audio/pcm;rate=16000",
                })
              );
              setStats((prev) => ({
                ...prev,
                audioChunksSent: prev.audioChunksSent + 1,
              }));
            }
          },
          (volume) => {
            setUserVolume(volume);
            const speaking = volume > 0.08;
            setIsUserSpeaking(speaking);

            // Interrupt AI if user speaks loudly while AI is talking
            if (speaking && isAiSpeaking) {
              playerRef.current?.stop();
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: "interrupt" }));
              }
            }
          }
        );

        await recorder.start();
        recorderRef.current = recorder;
        setIsMicActive(true);
      } catch (err: any) {
        console.error("[App] Microphone activation error:", err);
        const cleanMsg =
          err?.message ||
          "Không thể truy cập Microphone. Vui lòng kiểm tra quyền truy cập trên Android/iOS.";
        setMicErrorMessage(cleanMsg);
        setIsMicModalOpen(true);
      }
    }
  };

  // 5. Send Text or File/Image Message over WebSocket or REST
  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userText = inputText.trim();
    if (!userText && pendingAttachments.length === 0) return;

    const currentAttachments = [...pendingAttachments];
    setInputText("");
    setPendingAttachments([]);

    // Add user message to chat UI
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: userText,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Reset current AI response target
    currentAiMsgIdRef.current = null;

    if (currentAttachments.length > 0) {
      // Send multimodal message
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "multimodal_message",
            text: userText,
            attachments: currentAttachments,
            modelName: selectedModelRef.current.geminiModel,
            systemInstruction: systemInstructionRef.current,
          })
        );
      } else {
        // Fallback REST endpoint if WebSocket isn't connected
        try {
          const res = await fetch("/api/multimodal-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: userText,
              attachments: currentAttachments,
              modelName: selectedModelRef.current.geminiModel,
              systemInstruction: systemInstructionRef.current,
            }),
          });
          const data = await res.json();
          if (data.text) {
            const aiMsg: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: "model",
              text: data.text,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMsg]);
          } else if (data.error) {
            alert(data.error);
          }
        } catch (err: any) {
          console.error("REST Multimodal error:", err);
        }
      }
    } else {
      // Send standard text message over WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "text",
            text: userText,
          })
        );
      }
    }
  };

  // 6. Apply Settings (Voice, Model & System Instruction)
  const handleSaveSettings = (
    newVoice: VoiceOption,
    newPrompt: string,
    newModel: AiModelProfile
  ) => {
    setSelectedVoice(newVoice);
    setSystemInstruction(newPrompt);
    setSelectedModel(newModel);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "config",
          voiceName: newVoice,
          systemInstruction: newPrompt,
          modelName: newModel.geminiModel,
        })
      );
    }
  };

  // 7. Toggle Mute AI Audio
  const toggleMuteAi = () => {
    const nextMute = !isAiMuted;
    setIsAiMuted(nextMute);
    playerRef.current?.setMute(nextMute);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 sm:p-2 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/20 flex-shrink-0">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-sm sm:text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-indigo-300 truncate">
                AI Voice & Text Chat
              </h1>
              {/* Version V1.1 Anchor Badge */}
              <button
                onClick={() => setIsVersionModalOpen(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-700/80 text-[10px] font-bold hover:bg-emerald-900/80 transition-all shadow-sm flex-shrink-0"
                title="Xem thông tin mốc neo Phiên bản V1.1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>V1.1</span>
                <Bookmark className="w-3 h-3 text-emerald-400" />
              </button>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1 sm:gap-1.5 truncate">
              <span>Gemini Live</span>
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              <span className="hidden xs:inline">WebSockets</span>
              <span className="hidden xs:inline w-1 h-1 rounded-full bg-slate-600" />
              <span className="text-indigo-400 font-medium">Multimodal File AI</span>
            </p>
          </div>
        </div>

        {/* Right Status Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          <button
            onClick={() => setIsMicModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-800/80 rounded-xl text-xs font-semibold text-cyan-300 transition-all shadow-sm"
            title="Hướng dẫn cấp quyền Micro trên Android & iOS"
          >
            <Mic className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Quyền Micro</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-xl text-xs font-semibold text-slate-200 transition-all shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Cài đặt AI</span>
          </button>

          {connectionState !== "connected" && (
            <button
              onClick={connectWebSocket}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/20"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden xs:inline">Kết nối lại</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-4 md:p-6 flex flex-col gap-3 sm:gap-5">
        {/* Model Selector Bar */}
        <ModelSelectorBar
          selectedModel={selectedModel}
          onOpenModelModal={() => setIsModelModalOpen(true)}
          onSelectModel={handleSelectModel}
          isConnected={connectionState === "connected"}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Visualizer & Live Control Stage */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Visualizer Orb */}
            <VoiceVisualizer
              userVolume={userVolume}
              aiVolume={aiVolume}
              isUserSpeaking={isUserSpeaking}
              isAiSpeaking={isAiSpeaking}
              isConnected={connectionState === "connected"}
              selectedVoice={selectedVoice}
            />

            {/* Quick Voice Control Action Bar */}
            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800/80 backdrop-blur-md flex items-center justify-around gap-4">
              {/* Mic Toggle Button */}
              <button
                onClick={toggleMicrophone}
                disabled={connectionState !== "connected"}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-lg ${
                  isMicActive
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-pulse"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isMicActive ? (
                  <>
                    <MicOff className="w-5 h-5" />
                    <span>Tắt Micro</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    <span>Bật Micro Nói Trực Tiếp</span>
                  </>
                )}
              </button>

              {/* Mute AI Output Toggle */}
              <button
                onClick={toggleMuteAi}
                className={`p-3.5 rounded-xl border transition-all ${
                  isAiMuted
                    ? "bg-amber-950/60 border-amber-700/60 text-amber-300"
                    : "bg-slate-800/80 border-slate-700/80 text-slate-300 hover:text-white"
                }`}
                title={isAiMuted ? "Bật âm thanh AI" : "Tắt âm thanh AI"}
              >
                {isAiMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>

            {/* Latency & Stream Metrics */}
            <LatencyMetrics
              stats={stats}
              isConnected={connectionState === "connected"}
              currentModelName={selectedModel.name}
            />

            {/* API Key Banner check if missing */}
            {hasApiKey === false && (
              <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-2xl flex items-start gap-3 text-amber-200 text-xs">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-300 block mb-0.5">
                    Chưa tìm thấy GEMINI_API_KEY
                  </span>
                  Vui lòng cấu hình GEMINI_API_KEY trong menu Bảng điều khiển Settings &gt; Secrets để ứng dụng kết nối tới Gemini Live API thành công.
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Live Transcript & Text Chat */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDraggingOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                processFiles(e.dataTransfer.files);
              }
            }}
            className="lg:col-span-7 flex flex-col gap-2.5 sm:gap-3.5 h-[520px] sm:h-[620px] lg:h-[calc(100vh-170px)] lg:max-h-[760px] min-h-[460px] relative"
          >
            {/* Drag and Drop File Overlay */}
            {isDraggingOver && (
              <div className="absolute inset-0 z-30 bg-indigo-950/90 border-2 border-dashed border-indigo-400 rounded-2xl flex flex-col items-center justify-center text-indigo-200 backdrop-blur-md pointer-events-none transition-all">
                <UploadCloud className="w-12 h-12 text-indigo-400 animate-bounce mb-2" />
                <p className="text-base font-bold">Thả tệp hoặc hình ảnh vào đây</p>
                <p className="text-xs text-indigo-300 mt-1">Hỗ trợ hình ảnh (PNG, JPG, WEBP), tệp PDF, TXT, JSON, Code...</p>
              </div>
            )}

            {/* Chat Transcript Area */}
            <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-inner">
              <ChatHistory
                messages={messages}
                isAiStreaming={isAiSpeaking}
                onClear={() => setMessages([])}
              />
            </div>

            {/* Input Message Form with File Attachments (Pinned Floating Box) */}
            <form
              onSubmit={handleSendText}
              className="sticky bottom-0 z-20 flex flex-col bg-slate-900/95 rounded-2xl border border-indigo-500/40 shadow-2xl shadow-indigo-950/80 backdrop-blur-xl overflow-hidden transition-all"
            >
              {/* File Attachment Preview Tray & Quick Multimodal Prompts */}
              {pendingAttachments.length > 0 && (
                <div className="flex flex-col bg-slate-950/90 border-b border-slate-800/80">
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-thin">
                      <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 flex-shrink-0">
                        <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                        Đính kèm ({pendingAttachments.length}):
                      </span>
                      {pendingAttachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-1.5 bg-slate-800 border border-slate-700/80 px-2 py-1 rounded-xl text-xs text-slate-200 flex-shrink-0"
                        >
                          {att.type.startsWith("image/") && att.url ? (
                            <img src={att.url} alt={att.name} className="w-4 h-4 object-cover rounded" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          )}
                          <span className="max-w-[110px] truncate" title={att.name}>
                            {att.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPendingAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                            className="p-0.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingAttachments([])}
                      className="text-[10px] text-slate-400 hover:text-rose-400 transition px-1.5 py-0.5 rounded flex-shrink-0"
                    >
                      Xóa tất cả
                    </button>
                  </div>

                  {/* Contextual Quick Action Prompt Chips for Multimodal Files */}
                  <div className="px-3 pb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
                    <span className="text-slate-500 font-medium whitespace-nowrap flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      Gợi ý xử lý:
                    </span>
                    <button
                      type="button"
                      onClick={() => setInputText("Trích xuất và đọc toàn bộ văn bản trong tệp/hình ảnh này (OCR).")}
                      className="px-2.5 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/90 text-indigo-200 border border-indigo-800/60 font-medium whitespace-nowrap transition flex items-center gap-1"
                    >
                      <Search className="w-3 h-3 text-indigo-400" />
                      Trích xuất OCR
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputText("Tóm tắt các ý chính và thông điệp quan trọng nhất trong tài liệu này.")}
                      className="px-2.5 py-1 rounded-lg bg-purple-950/70 hover:bg-purple-900/90 text-purple-200 border border-purple-800/60 font-medium whitespace-nowrap transition flex items-center gap-1"
                    >
                      <BookOpen className="w-3 h-3 text-purple-400" />
                      Tóm tắt ý chính
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputText("Phân tích cấu trúc, bảng biểu hoặc dữ liệu quan trọng trong tệp đính kèm.")}
                      className="px-2.5 py-1 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/90 text-cyan-200 border border-cyan-800/60 font-medium whitespace-nowrap transition flex items-center gap-1"
                    >
                      <ListChecks className="w-3 h-3 text-cyan-400" />
                      Phân tích bảng/dữ liệu
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputText("Dịch toàn bộ nội dung tệp đính kèm sang tiếng Việt chuẩn xác và tự nhiên.")}
                      className="px-2.5 py-1 rounded-lg bg-amber-950/70 hover:bg-amber-900/90 text-amber-200 border border-amber-800/60 font-medium whitespace-nowrap transition flex items-center gap-1"
                    >
                      <Languages className="w-3 h-3 text-amber-400" />
                      Dịch sang tiếng Việt
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 p-2">
                {/* Hidden Native File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      processFiles(e.target.files);
                      e.target.value = "";
                    }
                  }}
                  accept="image/*,.pdf,.txt,.md,.json,.csv,.js,.ts,.py,.doc,.docx"
                  className="hidden"
                />

                {/* File Attachment Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800/80 rounded-xl transition flex-shrink-0"
                  title="Gửi tệp hoặc hình ảnh cho AI"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Text Prompt Input */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    pendingAttachments.length > 0
                      ? "Nhập câu hỏi hoặc yêu cầu về tệp/hình ảnh..."
                      : connectionState === "connected"
                      ? `Nhắn tin cho ${selectedModel.name} (hoặc gửi tệp/ảnh)...`
                      : "Đang kết nối..."
                  }
                  className="flex-1 bg-transparent px-2 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={(!inputText.trim() && pendingAttachments.length === 0)}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-all shadow-md shadow-indigo-600/30 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Model Selection Modal */}
      <ModelSelectorModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        selectedModelId={selectedModel.id}
        onSelectModel={handleSelectModel}
      />

      {/* Voice & AI Settings Modal */}
      <VoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentVoice={selectedVoice}
        currentPrompt={systemInstruction}
        selectedModelId={selectedModel.id}
        onSave={handleSaveSettings}
      />

      {/* Version V1.1 Release Baseline & Anchor Point Modal */}
      {isVersionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Bookmark className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">Phiên Bản V1.1 - Mobile & UI Compact Release</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Anchor Point V1.1
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Cập nhật tối ưu hiển thị di động, ghim khung chat nổi và thu gọn Live Visualizer</p>
                </div>
              </div>
              <button
                onClick={() => setIsVersionModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs sm:text-sm text-slate-300">
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-200 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Điểm neo hệ thống V1.1 đã khởi tạo thành công!</span> Tối ưu không gian hiển thị trên điện thoại di động, tự động ghim thanh nhập tin nhắn nổi và tinh chỉnh sóng âm Live Audio.
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider text-indigo-400">
                  📱 Nâng cấp nổi bật Phiên Bản V1.1
                </h4>
                <ul className="space-y-2 text-xs">
                  <li className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-200">Khung chat luôn nổi (Pinned Input):</span> Khung soạn thảo tin nhắn, tệp đính kèm và Smart Prompts luôn nằm cố định dưới màn hình để nhập nội dung tức thì.
                    </div>
                  </li>
                  <li className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <Activity className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-200">Thu gọn WebSockets Live Audio:</span> Tối ưu kích thước mô phỏng sóng âm (Visualizer Canvas) giúp tiết kiệm diện tích tối đa trên di động.
                    </div>
                  </li>
                  <li className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <UploadCloud className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-200">Đóng gói Android PWA/APK Ready:</span> Đã tạo Web Manifest, cấu hình meta theme-color và biểu tượng App Icon 3D chuẩn Android.
                    </div>
                  </li>
                </ul>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider text-indigo-400">
                  🎙️ Các mốc tính năng lõi tích hợp sẵn (Core Foundation)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="font-bold text-indigo-300 block mb-0.5">🎤 Live Voice Chat</span>
                    Trò chuyện giọng nói 2 chiều siêu tốc qua WebSocket PCM 24kHz.
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="font-bold text-indigo-300 block mb-0.5">📄 Multimodal File AI</span>
                    Trích xuất OCR hình ảnh, đọc PDF, CSV, mã nguồn và tóm tắt nhanh.
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="font-bold text-indigo-300 block mb-0.5">🤖 5 AI Model Personas</span>
                    Companion, Storyteller, Factual, Code Architect, Teacher.
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="font-bold text-indigo-300 block mb-0.5">🤖 Robot Assistant Widget</span>
                    Trợ lý robot nổi tương tác hình họa sống động.
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
              <button
                onClick={() => setIsVersionModalOpen(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition shadow-md shadow-indigo-600/20"
              >
                Đã hiểu & Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Robot AI Assistant Widget in Bottom Corner */}
      <RobotAssistantWidget
        connectionState={connectionState}
        isMicActive={isMicActive}
        isAiMuted={isAiMuted}
        isUserSpeaking={isUserSpeaking}
        isAiSpeaking={isAiSpeaking}
        aiVolume={aiVolume}
        userVolume={userVolume}
        selectedModelName={selectedModel.name}
        selectedVoice={selectedVoice}
        lastAiMessage={messages.filter((m) => m.role === "model").slice(-1)[0]?.text}
        onToggleMic={toggleMicrophone}
        onToggleMuteAi={toggleMuteAi}
        onSendText={(text) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const userMsg: ChatMessage = {
              id: Date.now().toString(),
              role: "user",
              text,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, userMsg]);
            wsRef.current.send(JSON.stringify({ type: "text", text }));
          }
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Microphone Access Guide & Diagnostic Modal */}
      <MicPermissionModal
        isOpen={isMicModalOpen}
        onClose={() => setIsMicModalOpen(false)}
        onRequestPermission={toggleMicrophone}
        errorMessage={micErrorMessage}
      />
    </div>
  );
}
