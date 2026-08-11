import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

function formatErrStr(err: any): string {
  if (!err) return "Unspecified error";
  if (typeof err === "string") return err;
  if (typeof err.message === "string" && err.message) return err.message;
  if (err.error) {
    if (typeof err.error === "string") return err.error;
    if (typeof err.error.message === "string" && err.error.message) return err.error.message;
  }
  return "Session event or error occurred";
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json({ limit: "25mb" }));

  // Health check endpoint
  app.get(["/api/health", "/health", "/healthz"], (req, res) => {
    res.json({
      status: "ok",
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString()
    });
  });

  // Multimodal REST Endpoint (Image and File processing)
  app.post("/api/multimodal-chat", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "GEMINI_API_KEY_MISSING: Chưa cấu hình GEMINI_API_KEY trong Settings > Secrets." });
      }

      const { text, attachments, modelName, systemInstruction } = req.body;
      const ai = new GoogleGenAI({ apiKey });

      const parts: any[] = [];
      if (attachments && Array.isArray(attachments)) {
        for (const att of attachments) {
          if (att.dataBase64) {
            parts.push({
              inlineData: {
                mimeType: att.type || "image/png",
                data: att.dataBase64
              }
            });
          } else if (att.textContent) {
            parts.push({
              text: `[Nội dung tệp đính kèm (${att.name})]:\n${att.textContent}`
            });
          }
        }
      }

      if (text) {
        parts.push({ text });
      }

      if (parts.length === 0) {
        return res.status(400).json({ error: "Vui lòng nhập tin nhắn hoặc gửi tệp đính kèm." });
      }

      const targetModel = (modelName && !modelName.includes("live-preview")) ? modelName : "gemini-2.5-flash";

      const response = await ai.models.generateContent({
        model: targetModel,
        contents: parts,
        config: {
          systemInstruction: systemInstruction || "Bạn là trợ lý AI thông minh phân tích tệp và hình ảnh chuyên nghiệp. Hãy phản hồi đầy đủ, rõ ràng và mạch lạc bằng tiếng Việt."
        }
      });

      return res.json({ text: response.text });
    } catch (err: any) {
      console.error("[REST Multimodal Error]:", err);
      return res.status(500).json({ error: formatErrStr(err) });
    }
  });

  server.on("clientError", (err: any, socket: any) => {
    if (socket.writable) {
      socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
    } else {
      socket.destroy();
    }
  });

  // WebSocket Server setup (noServer mode to avoid conflict with Vite middleware)
  const wss = new WebSocketServer({ noServer: true });

  wss.on("error", (err: any) => {
    const msg = err?.message || (typeof err === "string" ? err : "Server WebSocket notice");
    console.warn("[WebSocketServer] Notice:", msg);
  });

  server.on("upgrade", (request, socket, head) => {
    socket.on("error", () => {
      // Quietly destroy on socket error during upgrade
    });
    try {
      const host = request.headers.host || "localhost";
      const url = new URL(request.url || "", `http://${host}`);
      if (url.pathname === "/ws") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      }
    } catch (err) {
      socket.destroy();
    }
  });

  wss.on("connection", async (clientWs: WebSocket) => {
    console.log("[WebSocket] Client connected");

    clientWs.on("error", () => {
      // Quietly consume socket-level connection resets/errors
    });
    if ((clientWs as any)._socket) {
      try {
        (clientWs as any)._socket.on("error", () => {
          // Quietly consume underlying socket error
        });
      } catch (e) {
        // ignore
      }
    }

    // Helper to safety send WS messages
    const sendToClient = (data: object) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        try {
          clientWs.send(JSON.stringify(data), (_err) => {
            // Callback handles socket write errors cleanly without triggering uncaught senderOnError
          });
        } catch (e) {
          // ignore
        }
      }
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[WebSocket] GEMINI_API_KEY is not configured.");
      sendToClient({
        type: "error",
        error: "GEMINI_API_KEY_MISSING: Chưa cấu hình GEMINI_API_KEY trong Settings > Secrets."
      });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    let liveSession: any = null;
    let isConnectedToLive = false;
    let isInitializing = false;
    let currentConfig: { voiceName?: string; systemInstruction?: string; modelName?: string } | null = null;
    let pendingConfig: { voiceName?: string; systemInstruction?: string; modelName?: string } | null = null;

    const initLiveSession = async (configOverride?: {
      voiceName?: string;
      systemInstruction?: string;
      modelName?: string;
    }) => {
      const voiceName = configOverride?.voiceName || "Zephyr";
      const modelName = configOverride?.modelName || "gemini-3.1-flash-live-preview";
      const systemInstruction = configOverride?.systemInstruction ||
        "Bạn là một trợ lý AI thông minh, thân thiện, phản hồi trò chuyện bằng tiếng Việt hoặc ngôn ngữ người dùng sử dụng. Hãy giữ câu trả lời tự nhiên, ngắn gọn và mạch lạc như trò chuyện thoại thực tế.";

      // If session is already connected with identical config, re-confirm status
      if (
        liveSession &&
        isConnectedToLive &&
        currentConfig?.voiceName === voiceName &&
        currentConfig?.modelName === modelName &&
        currentConfig?.systemInstruction === systemInstruction
      ) {
        console.log("[LiveAPI] Session already active with matching configuration.");
        sendToClient({ type: "status", status: "connected", voiceName, modelName });
        return;
      }

      if (isInitializing) {
        console.log("[LiveAPI] Session initialization in progress, queueing next config...");
        pendingConfig = { voiceName, systemInstruction, modelName };
        return;
      }
      isInitializing = true;

      try {
        if (liveSession) {
          console.log("[LiveAPI] Closing previous live session...");
          try {
            await liveSession.close();
          } catch (e) {
            // silent ignore on close
          }
          liveSession = null;
          isConnectedToLive = false;
        }

        console.log(`[LiveAPI] Connecting model ${modelName} with voice ${voiceName}...`);

        liveSession = await ai.live.connect({
          model: modelName,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName }
              }
            },
            systemInstruction
          },
          callbacks: {
            onmessage: (message: LiveServerMessage) => {
              // 1. Check for model audio output
              const parts = message.serverContent?.modelTurn?.parts;
              if (parts && parts.length > 0) {
                for (const part of parts) {
                  if (part.inlineData?.data) {
                    sendToClient({
                      type: "audio",
                      data: part.inlineData.data,
                      mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000"
                    });
                  }
                  if (part.text) {
                    sendToClient({
                      type: "text_delta",
                      text: part.text,
                      role: "model"
                    });
                  }
                }
              }

              // 2. Check for interruption signal
              if (message.serverContent?.interrupted) {
                sendToClient({ type: "interrupted" });
              }

              // 3. Check for turn completion
              if (message.serverContent?.turnComplete) {
                sendToClient({ type: "turn_complete" });
              }
            },
            onerror: (err: any) => {
              const errMsg = formatErrStr(err);
              console.warn("[LiveAPI] Session notice/error:", errMsg);
              sendToClient({
                type: "error",
                error: errMsg
              });
            },
            onclose: (event: any) => {
              const code = event?.code || event?.status || "";
              const reason = event?.reason || "";
              console.log(`[LiveAPI] Session closed ${code} ${reason}`.trim());
              isConnectedToLive = false;
              sendToClient({ type: "session_closed" });
            }
          }
        });

        isConnectedToLive = true;
        currentConfig = { voiceName, systemInstruction, modelName };
        sendToClient({ type: "status", status: "connected", voiceName, modelName });
        console.log("[LiveAPI] Connected successfully.");
      } catch (error: any) {
        const errMsg = formatErrStr(error);
        console.warn("[LiveAPI] Connection failed:", errMsg);
        isConnectedToLive = false;
        sendToClient({
          type: "error",
          error: errMsg || "Không thể khởi tạo Gemini Live Session. Kiểm tra API Key."
        });
      } finally {
        isInitializing = false;
        if (pendingConfig) {
          const nextConfig = pendingConfig;
          pendingConfig = null;
          await initLiveSession(nextConfig);
        }
      }
    };

    // Listen to client messages
    clientWs.on("message", async (rawMessage: Buffer) => {
      try {
        const msg = JSON.parse(rawMessage.toString());

        if (msg.type === "config") {
          await initLiveSession({
            voiceName: msg.voiceName,
            systemInstruction: msg.systemInstruction,
            modelName: msg.modelName
          });
          return;
        }

        if (!liveSession || !isConnectedToLive) {
          sendToClient({
            type: "error",
            error: "Chưa kết nối thành công tới Gemini Live API."
          });
          return;
        }

        if (msg.type === "audio") {
          try {
            // Send PCM 16kHz audio from client mic to Gemini Live
            liveSession.sendRealtimeInput({
              audio: {
                data: msg.data, // Base64 PCM 16kHz
                mimeType: msg.mimeType || "audio/pcm;rate=16000"
              }
            });
          } catch (err: any) {
            console.warn("[LiveAPI] Failed to send audio input:", err?.message || err);
          }
        } else if (msg.type === "text") {
          try {
            // Send text prompt to Gemini Live
            liveSession.sendRealtimeInput({
              text: msg.text
            });
          } catch (err: any) {
            console.warn("[LiveAPI] Failed to send text input:", err?.message || err);
          }
        } else if (msg.type === "multimodal_message") {
          try {
            const { text, attachments, modelName, systemInstruction } = msg;
            const parts: any[] = [];

            if (attachments && Array.isArray(attachments)) {
              for (const att of attachments) {
                if (att.dataBase64) {
                  parts.push({
                    inlineData: {
                      mimeType: att.type || "image/png",
                      data: att.dataBase64
                    }
                  });
                } else if (att.textContent) {
                  parts.push({
                    text: `[Nội dung tệp đính kèm (${att.name})]:\n${att.textContent}`
                  });
                }
              }
            }

            if (text) {
              parts.push({ text });
            }

            if (parts.length === 0) {
              sendToClient({ type: "error", error: "Không có thông tin tệp hoặc văn bản." });
              return;
            }

            const targetModel = (modelName && !modelName.includes("live-preview")) ? modelName : "gemini-2.5-flash";

            sendToClient({ type: "text_delta", text: "", role: "model" });

            const responseStream = await ai.models.generateContentStream({
              model: targetModel,
              contents: parts,
              config: {
                systemInstruction: systemInstruction || "Bạn là một trợ lý AI phân tích tệp và hình ảnh thông minh. Hãy phản hồi ngắn gọn, mạch lạc, chính xác bằng tiếng Việt."
              }
            });

            for await (const chunk of responseStream) {
              if (chunk.text) {
                sendToClient({
                  type: "text_delta",
                  text: chunk.text,
                  role: "model"
                });
              }
            }
            sendToClient({ type: "turn_complete" });
          } catch (err: any) {
            const errMsg = formatErrStr(err);
            console.warn("[WebSocket Multimodal Error]:", errMsg);
            sendToClient({
              type: "error",
              error: `Lỗi xử lý tệp/hình ảnh: ${errMsg}`
            });
          }
        } else if (msg.type === "interrupt") {
          // Handle client-requested interrupt
          sendToClient({ type: "interrupted" });
        }
      } catch (err: any) {
        console.warn("[WebSocket] Error processing client message:", err?.message || err);
      }
    });

    clientWs.on("close", () => {
      console.log("[WebSocket] Client disconnected");
      if (liveSession) {
        try {
          liveSession.close();
        } catch (e) {
          // ignore
        }
      }
    });
  });

  // Vite middleware for dev or Static file serving for prod
  const distPath = path.join(process.cwd(), "dist");
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Application index file not found. Ensure production build completed.");
      }
    });
  } else {
    const isHmrDisabled = process.env.DISABLE_HMR === "true";
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: isHmrDisabled ? null : {},
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`[Server] Port ${PORT} is currently in use.`);
    } else {
      console.error("[Server] HTTP Server error:", err);
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] App running on http://localhost:${PORT}`);
  });
}

process.on("unhandledRejection", (reason: any) => {
  console.warn("[Server] Unhandled Rejection caught:", reason?.message || reason);
});

process.on("uncaughtException", (err: any) => {
  console.warn("[Server] Uncaught Exception caught:", err?.message || err);
});

startServer().catch((err) => {
  console.error("[Server] Fatal startup error:", err);
  process.exit(1);
});
