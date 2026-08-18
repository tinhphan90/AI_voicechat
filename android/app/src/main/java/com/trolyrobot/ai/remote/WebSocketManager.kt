package com.trolyrobot.ai.remote

import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.trolyrobot.ai.data.ConnectionState
import com.trolyrobot.ai.data.FileAttachment
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit

interface WebSocketListenerCallback {
    fun onConnectionStateChanged(state: ConnectionState, errorMsg: String? = null)
    fun onAudioReceived(base64Pcm: String)
    fun onTextDeltaReceived(text: String, role: String)
    fun onTurnComplete()
    fun onInterrupted()
    fun onError(error: String)
    fun onToolCall(name: String, args: JsonObject?)
}

/**
 * Android WebSocketManager using OkHttp
 * Handles real-time bi-directional streaming for Gemini Live API and Multimodal Chat.
 * Features bulletproof connection recovery, heartbeat keep-alive, and anti-loop guards.
 */
class WebSocketManager(
    private val callback: WebSocketListenerCallback
) {
    private var client: OkHttpClient = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .connectTimeout(15, TimeUnit.SECONDS)
        .pingInterval(10, TimeUnit.SECONDS) // Automatic native WS Ping/Pong frames every 10s
        .retryOnConnectionFailure(true)
        .build()

    private var activeWebSocket: WebSocket? = null
    private val gson = Gson()
    private var currentUrl: String = ""
    private var retryCount = 0
    private var connectionSeq = 0
    private var isManualDisconnect = false
    private var isSocketOpen = false
    private val handler = android.os.Handler(android.os.Looper.getMainLooper())
    private var reconnectRunnable: Runnable? = null

    companion object {
        private const val TAG = "WebSocketManager"
        private const val INITIAL_BACKOFF_MS = 2000L
        private const val MAX_BACKOFF_MS = 15000L
    }

    fun isConnected(): Boolean = isSocketOpen

    fun triggerImmediateReconnect() {
        Log.d(TAG, "Triggering immediate WebSocket reconnect...")
        cancelScheduledReconnect()
        if (currentUrl.isNotEmpty()) {
            retryCount = 0
            connect(currentUrl, force = true)
        }
    }

    fun connect(serverUrl: String, force: Boolean = false) {
        if (serverUrl.isBlank()) {
            Log.e(TAG, "Cannot connect: serverUrl is blank")
            return
        }

        if (!force && isSocketOpen && currentUrl == serverUrl && activeWebSocket != null) {
            Log.d(TAG, "WebSocket is already open and connected to $serverUrl.")
            return
        }

        currentUrl = serverUrl
        isManualDisconnect = false
        cancelScheduledReconnect()

        val thisSeq = ++connectionSeq
        callback.onConnectionStateChanged(ConnectionState.CONNECTING)

        val request = try {
            Request.Builder().url(serverUrl).build()
        } catch (e: Exception) {
            Log.e(TAG, "Invalid server URL: $serverUrl", e)
            callback.onConnectionStateChanged(ConnectionState.ERROR, "URL Server không hợp lệ: $serverUrl")
            return
        }

        try {
            isSocketOpen = false
            // Gracefully close previous socket without allowing its onClosed to trigger a recursive loop
            val oldSocket = activeWebSocket
            activeWebSocket = null
            oldSocket?.close(1000, "Reconnecting")

            Log.d(TAG, "[$thisSeq] Initiating WebSocket connection to: $serverUrl")
            activeWebSocket = client.newWebSocket(request, object : WebSocketListener() {
                override fun onOpen(webSocket: WebSocket, response: Response) {
                    if (thisSeq != connectionSeq) {
                        Log.d(TAG, "[$thisSeq] Ignoring onOpen from obsolete connection.")
                        return
                    }
                    Log.d(TAG, "[$thisSeq] WebSocket connected successfully.")
                    isSocketOpen = true
                    retryCount = 0
                    callback.onConnectionStateChanged(ConnectionState.CONNECTED)
                }

                override fun onMessage(webSocket: WebSocket, text: String) {
                    if (thisSeq != connectionSeq) return
                    handleMessage(text, webSocket)
                }

                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    if (thisSeq != connectionSeq) {
                        Log.d(TAG, "[$thisSeq] Ignoring onFailure from obsolete connection.")
                        return
                    }
                    Log.e(TAG, "[$thisSeq] WebSocket failure: ${t.message}")
                    isSocketOpen = false
                    callback.onConnectionStateChanged(ConnectionState.ERROR, t.message ?: "Mất kết nối tới server")
                    scheduleReconnect()
                }

                override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                    if (thisSeq != connectionSeq) {
                        Log.d(TAG, "[$thisSeq] Ignoring onClosed from obsolete connection.")
                        return
                    }
                    Log.d(TAG, "[$thisSeq] WebSocket closed by peer ($code): $reason")
                    isSocketOpen = false
                    callback.onConnectionStateChanged(ConnectionState.DISCONNECTED)
                    if (!isManualDisconnect) {
                        scheduleReconnect()
                    }
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "[$thisSeq] Error initiating WebSocket", e)
            isSocketOpen = false
            callback.onConnectionStateChanged(ConnectionState.ERROR, e.message ?: "Không thể kết nối WebSocket")
            scheduleReconnect()
        }
    }

    private fun scheduleReconnect() {
        if (isManualDisconnect || currentUrl.isEmpty()) return

        // Exponential backoff capped at 15 seconds + slight random jitter
        val expBackoff = INITIAL_BACKOFF_MS * (1 shl (retryCount.coerceAtMost(3)))
        val jitter = (Math.random() * 500).toLong()
        val backoffMs = Math.min(expBackoff + jitter, MAX_BACKOFF_MS)
        
        retryCount++
        Log.d(TAG, "Scheduling WebSocket reconnect attempt #$retryCount in ${backoffMs}ms...")

        cancelScheduledReconnect()
        reconnectRunnable = Runnable {
            if (!isManualDisconnect) {
                Log.d(TAG, "Executing auto-reconnect attempt #$retryCount...")
                connect(currentUrl, force = true)
            }
        }
        handler.postDelayed(reconnectRunnable!!, backoffMs)
    }

    private fun cancelScheduledReconnect() {
        reconnectRunnable?.let { handler.removeCallbacks(it) }
        reconnectRunnable = null
    }

    fun disconnect() {
        isManualDisconnect = true
        isSocketOpen = false
        connectionSeq++
        cancelScheduledReconnect()
        activeWebSocket?.close(1000, "Client disconnect")
        activeWebSocket = null
        callback.onConnectionStateChanged(ConnectionState.DISCONNECTED)
    }

    fun sendConfig(voiceName: String, systemInstruction: String, modelName: String) {
        val json = JsonObject().apply {
            addProperty("type", "config")
            addProperty("voiceName", voiceName)
            addProperty("systemInstruction", systemInstruction)
            addProperty("modelName", modelName)
        }
        sendJson(json)
    }

    fun sendAudioChunk(base64Pcm: String) {
        val json = JsonObject().apply {
            addProperty("type", "audio")
            addProperty("data", base64Pcm)
            addProperty("mimeType", "audio/pcm;rate=16000")
        }
        sendJson(json)
    }

    fun sendTextMessage(text: String) {
        val json = JsonObject().apply {
            addProperty("type", "text")
            addProperty("text", text)
        }
        sendJson(json)
    }

    fun sendMultimodalMessage(
        text: String,
        attachments: List<FileAttachment>,
        modelName: String,
        systemInstruction: String
    ) {
        val json = JsonObject().apply {
            addProperty("type", "multimodal_message")
            addProperty("text", text)
            addProperty("modelName", modelName)
            addProperty("systemInstruction", systemInstruction)
            add("attachments", gson.toJsonTree(attachments))
        }
        sendJson(json)
    }

    fun sendInterrupt() {
        val json = JsonObject().apply {
            addProperty("type", "interrupt")
        }
        sendJson(json)
    }

    private fun sendJson(jsonObject: JsonObject) {
        val text = jsonObject.toString()
        activeWebSocket?.send(text)
    }

    private fun handleMessage(text: String, socket: WebSocket) {
        try {
            val json = gson.fromJson(text, JsonObject::class.java) ?: return
            val type = json.get("type")?.asString ?: return

            when (type) {
                "ping" -> {
                    // Instantly reply to server heartbeat ping with pong
                    val pong = JsonObject().apply { addProperty("type", "pong") }
                    socket.send(pong.toString())
                }
                "pong" -> {
                    // Pong received
                }
                "status" -> {
                    val status = json.get("status")?.asString
                    when (status) {
                        "connected" -> callback.onConnectionStateChanged(ConnectionState.CONNECTED)
                        "connecting" -> callback.onConnectionStateChanged(ConnectionState.CONNECTING)
                        "disconnected" -> {
                            // Upstream model status notice
                            Log.d(TAG, "Server reported status: disconnected")
                        }
                    }
                }
                "live_status" -> {
                    Log.d(TAG, "Live sub-status: ${json.get("status")?.asString}")
                }
                "audio" -> {
                    val base64Data = json.get("data")?.asString ?: ""
                    if (base64Data.isNotEmpty()) {
                        callback.onAudioReceived(base64Data)
                    }
                }
                "text_delta" -> {
                    val deltaText = json.get("text")?.asString ?: ""
                    val role = json.get("role")?.asString ?: "model"
                    callback.onTextDeltaReceived(deltaText, role)
                }
                "tool_call" -> {
                    val name = json.get("name")?.asString ?: ""
                    val args = if (json.has("args") && !json.get("args").isJsonNull) json.getAsJsonObject("args") else null
                    callback.onToolCall(name, args)
                }
                "turn_complete" -> {
                    callback.onTurnComplete()
                }
                "interrupted" -> {
                    callback.onInterrupted()
                }
                "error" -> {
                    val errorMsg = json.get("error")?.asString ?: "Lỗi từ WebSocket server"
                    callback.onError(errorMsg)
                }
                "live_error" -> {
                    Log.w(TAG, "Live stream notice: ${json.get("error")?.asString}")
                }
                "session_closed" -> {
                    Log.d(TAG, "Upstream Gemini session closed notice received")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling WebSocket message", e)
        }
    }
}
