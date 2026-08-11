export type Role = "user" | "model" | "system";

export interface FileAttachment {
  id: string;
  name: string;
  type: string; // mimeType, e.g. "image/png", "application/pdf", "text/plain"
  size: number; // size in bytes
  url?: string; // object URL or data URL for image thumbnail preview
  dataBase64?: string; // raw base64 string without header
  isText?: boolean;
  textContent?: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
  attachments?: FileAttachment[];
}

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export type VoiceOption = "Zephyr" | "Puck" | "Charon" | "Kore" | "Fenrir";

export interface VoiceProfile {
  id: VoiceOption;
  name: string;
  gender: "Nữ" | "Nam";
  description: string;
}

export interface AiModelProfile {
  id: string;
  geminiModel: string;
  name: string;
  category: "Conversational" | "Creative" | "Factual" | "Technical" | "Education";
  badge: string;
  iconName: string;
  description: string;
  defaultPrompt: string;
  recommendedVoice: VoiceOption;
  accentColor: string;
}

export interface SystemPromptPreset {
  id: string;
  title: string;
  prompt: string;
  icon: string;
}

export interface LatencyStats {
  wsPingMs: number;
  lastChunkTimeMs: number;
  audioChunksReceived: number;
  audioChunksSent: number;
}
