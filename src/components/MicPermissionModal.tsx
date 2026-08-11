import React, { useState, useEffect } from "react";
import {
  Mic,
  MicOff,
  X,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Apple,
} from "lucide-react";

interface MicPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestPermission: () => Promise<void>;
  errorMessage?: string | null;
}

export const MicPermissionModal: React.FC<MicPermissionModalProps> = ({
  isOpen,
  onClose,
  onRequestPermission,
  errorMessage,
}) => {
  const [activeTab, setActiveTab] = useState<"ios" | "android" | "desktop">("ios");
  const [copied, setCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [permissionState, setPermissionState] = useState<
    "granted" | "denied" | "prompt" | "unknown"
  >("unknown");

  // Auto detect user platform
  useEffect(() => {
    const ua = navigator.userAgent || "";
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
      setActiveTab("ios");
    } else if (/Android/.test(ua)) {
      setActiveTab("android");
    } else {
      setActiveTab("desktop");
    }

    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
        setPermissionState(result.state as any);
        result.onchange = () => {
          setPermissionState(result.state as any);
        };
      }
    } catch (e) {
      console.log("Permissions API not fully supported:", e);
    }
  };

  const handleTestMic = async () => {
    setIsTesting(true);
    try {
      await onRequestPermission();
      await checkPermissionStatus();
      onClose();
    } catch (err) {
      console.error("Mic test error:", err);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Quyền Truy Cập Microphone (Micro)
              </h3>
              <p className="text-xs text-slate-400">
                Hướng dẫn bật quyền Micro trên Android & iOS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          
          {/* Error Banner if mic request failed */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-amber-200 mb-0.5">
                  Không thể kích hoạt Micro:
                </span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Quick Permission Status Badge */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-300 font-medium">Trạng thái quyền Micro:</span>
            </div>
            {permissionState === "granted" ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã cấp quyền
              </span>
            ) : permissionState === "denied" ? (
              <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium flex items-center gap-1.5">
                <MicOff className="w-3.5 h-3.5" /> Đã bị chặn / Từ chối
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-medium flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Chưa cấp quyền
              </span>
            )}
          </div>

          {/* Device Tabs Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Chọn hệ điều hành thiết bị của bạn:
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab("ios")}
                className={`py-2 px-3 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "ios"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Apple className="w-3.5 h-3.5" /> iOS (iPhone/iPad)
              </button>
              <button
                onClick={() => setActiveTab("android")}
                className={`py-2 px-3 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "android"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Android
              </button>
              <button
                onClick={() => setActiveTab("desktop")}
                className={`py-2 px-3 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "desktop"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                Trình duyệt PC
              </button>
            </div>
          </div>

          {/* Instructions Content */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
            {activeTab === "ios" && (
              <div className="space-y-2.5">
                <h4 className="font-semibold text-slate-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">iOS</span>
                  Bật quyền Micro trên Safari / Chrome iOS:
                </h4>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-300 leading-relaxed">
                  <li>
                    Mở ứng dụng <strong className="text-slate-100">Cài đặt (Settings)</strong> trên iPhone/iPad.
                  </li>
                  <li>
                    Cuộn xuống tìm ứng dụng <strong className="text-slate-100">Safari</strong> (hoặc Chrome).
                  </li>
                  <li>
                    Vào mục <strong className="text-slate-100">Microphone (Micro)</strong> &rarr; Chọn <strong className="text-emerald-400">Cho phép (Allow)</strong> hoặc <strong className="text-cyan-400">Hỏi (Ask)</strong>.
                  </li>
                  <li>
                    Nếu mở từ ứng dụng khác (Zalo, Facebook, TikTok), hãy bấm nút chia sẻ chọn <strong className="text-cyan-400">"Mở bằng Safari"</strong>.
                  </li>
                </ol>
              </div>
            )}

            {activeTab === "android" && (
              <div className="space-y-2.5">
                <h4 className="font-semibold text-slate-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">AND</span>
                  Bật quyền Micro trên Android (Chrome, Edge):
                </h4>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-300 leading-relaxed">
                  <li>
                    Bấm vào <strong className="text-slate-100">biểu tượng ổ khóa hoặc nút cài đặt</strong> bên trái thanh địa chỉ URL.
                  </li>
                  <li>
                    Chọn <strong className="text-slate-100">Cài đặt trang web (Permissions/Site Settings)</strong> &rarr; <strong className="text-slate-100">Microphone</strong>.
                  </li>
                  <li>
                    Chuyển sang <strong className="text-emerald-400">Cho phép (Allow)</strong>.
                  </li>
                  <li>
                    Hoặc vào <strong className="text-slate-100">Cài đặt máy &rarr; Ứng dụng &rarr; Chrome &rarr; Quyền &rarr; Micro &rarr; Cho phép khi dùng ứng dụng</strong>.
                  </li>
                </ol>
              </div>
            )}

            {activeTab === "desktop" && (
              <div className="space-y-2.5">
                <h4 className="font-semibold text-slate-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">PC</span>
                  Bật quyền Micro trên Máy tính:
                </h4>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-300 leading-relaxed">
                  <li>
                    Nhấp biểu tượng <strong className="text-slate-100">Ổ khóa (Lock)</strong> trên thanh địa chỉ URL góc trên trái.
                  </li>
                  <li>
                    Gạt nút <strong className="text-slate-100">Microphone (Micro)</strong> sang trạng thái <strong className="text-emerald-400">Bật (On/Allow)</strong>.
                  </li>
                  <li>
                    Tải lại trang (F5 hoặc Ctrl+R) để áp dụng quyền mới.
                  </li>
                </ol>
              </div>
            )}
          </div>

          {/* Copy Link for In-App Browsers */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <span className="text-slate-300 font-medium block truncate">
                Mở bằng trình duyệt gốc (Safari / Chrome):
              </span>
              <span className="text-slate-500 text-[11px] truncate block">
                Nếu gặp lỗi trên Webview Zalo / Facebook
              </span>
            </div>
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép URL</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
          >
            Đóng
          </button>

          <button
            onClick={handleTestMic}
            disabled={isTesting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang kết nối Micro...</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Cấp quyền & Thử Micro</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
