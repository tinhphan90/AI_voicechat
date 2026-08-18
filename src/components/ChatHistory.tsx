import React, { useEffect, useRef, useState } from "react";
import { ChatMessage, FileAttachment } from "../types";
import { User, Bot, Copy, Check, Volume2, Sparkles, FileText, Image as ImageIcon, FileCode, Paperclip, X, ZoomIn } from "lucide-react";

interface ChatHistoryProps {
  messages: ChatMessage[];
  isAiStreaming: boolean;
  onClear: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  messages,
  isAiStreaming,
  onClear,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAiStreaming]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getFileIcon = (mimeType: string, filename: string) => {
    if (mimeType.startsWith("image/")) return <ImageIcon className="w-4 h-4 text-pink-400 flex-shrink-0" />;
    if (
      filename.endsWith(".js") ||
      filename.endsWith(".ts") ||
      filename.endsWith(".json") ||
      filename.endsWith(".html") ||
      filename.endsWith(".css") ||
      filename.endsWith(".py")
    ) {
      return <FileCode className="w-4 h-4 text-cyan-400 flex-shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-amber-400 flex-shrink-0" />;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/80 rounded-2xl border border-slate-800/80 backdrop-blur-md overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-slate-900/90">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <h3 className="text-xs sm:text-sm font-semibold text-slate-200">
            Nội dung cuộc trò chuyện
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/50 font-medium">
            {messages.length} tin nhắn
          </span>
        </div>

        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="text-[11px] text-slate-400 hover:text-rose-400 hover:bg-slate-800 px-2 py-0.5 rounded-lg transition-colors"
          >
            Xóa lịch sử
          </button>
        )}
      </div>

      {/* Messages List */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2.5 sm:p-3.5 space-y-2.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 text-slate-500">
            <Bot className="w-10 h-10 mb-2 text-slate-600 stroke-[1.5]" />
            <p className="text-xs sm:text-sm font-medium text-slate-400">
              Chưa có tin nhắn nào
            </p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              Bắt đầu nói qua Micro hoặc tải tệp/hình ảnh để AI phân tích và phản hồi ngay lập tức.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";

            return (
              <div
                key={msg.id}
                className={`flex gap-2 sm:gap-2.5 ${
                  isUser ? "flex-row-reverse" : "flex-row"
                } group`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold ${
                    isUser
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20"
                      : "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`relative max-w-[86%] sm:max-w-[82%] rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? "bg-emerald-900/40 text-emerald-100 border border-emerald-700/50 rounded-tr-none"
                      : "bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-tl-none"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1 text-[10px] opacity-75">
                    <span className="font-semibold text-slate-300">
                      {isUser ? "Bạn" : "Gemini AI"}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Render Attachments if any */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2.5">
                      {msg.attachments.map((att) => {
                        const isImage = att.type.startsWith("image/") || Boolean(att.url);
                        const imgSrc = att.url || (att.dataBase64 ? `data:${att.type};base64,${att.dataBase64}` : null);

                        if (isImage && imgSrc) {
                          return (
                            <div
                              key={att.id}
                              onClick={() => setPreviewImage({ url: imgSrc, name: att.name })}
                              className="relative group/img cursor-pointer overflow-hidden rounded-xl border border-slate-700/80 max-w-[200px] max-h-[160px] bg-slate-950/60 transition-transform hover:scale-[1.02]"
                            >
                              <img
                                src={imgSrc}
                                alt={att.name}
                                className="w-full h-full object-cover rounded-xl"
                              />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <ZoomIn className="w-5 h-5 drop-shadow" />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950/90 to-transparent p-1 px-2 text-[10px] text-slate-200 truncate">
                                {att.name}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={att.id}
                            className="flex items-center gap-2 p-2 px-3 rounded-xl bg-slate-950/60 border border-slate-700/70 text-xs text-slate-200 max-w-full"
                          >
                            {getFileIcon(att.type, att.name)}
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium truncate max-w-[160px]" title={att.name}>
                                {att.name}
                              </span>
                              <span className="text-[10px] text-slate-400">{formatFileSize(att.size)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {msg.text && (
                    <p className="whitespace-pre-wrap text-slate-200">
                      {msg.text}
                      {msg.isStreaming && (
                        <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse align-middle rounded-sm" />
                      )}
                    </p>
                  )}

                  {/* Quick Copy Action */}
                  <button
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white bg-slate-900/60 rounded transition-all"
                    title="Sao chép"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Streaming Loading Indicator */}
        {isAiStreaming && (
          <div className="flex items-center gap-2 text-indigo-400 text-xs pl-11 py-1">
            <Volume2 className="w-4 h-4 animate-bounce" />
            <span>AI đang truyền âm thanh & phản hồi qua WebSocket...</span>
          </div>
        )}
      </div>

      {/* Image Zoom Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage.url}
              alt={previewImage.name}
              className="max-h-[80vh] max-w-full object-contain rounded-xl"
            />
            <span className="text-xs text-slate-300 mt-2 px-3 py-1 bg-slate-800/80 rounded-lg">
              {previewImage.name}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
