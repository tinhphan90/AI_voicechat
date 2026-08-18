package com.trolyrobot.ai.viewmodel

import android.app.Application
import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.trolyrobot.ai.BuildConfig
import com.trolyrobot.ai.audio.SmartVoiceCommunicationManager
import com.trolyrobot.ai.data.AiModelProfile
import com.trolyrobot.ai.data.ChatMessage
import com.trolyrobot.ai.data.ConnectionState
import com.trolyrobot.ai.data.DEFAULT_AI_MODELS
import com.trolyrobot.ai.data.FileAttachment
import com.trolyrobot.ai.data.LatencyStats
import com.trolyrobot.ai.data.Role
import com.trolyrobot.ai.data.VoiceOption
import com.trolyrobot.ai.remote.WebSocketListenerCallback
import com.trolyrobot.ai.remote.WebSocketManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import com.google.gson.JsonObject
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import java.util.UUID

data class CarActionEvent(
    val type: String,
    val destination: String = "",
    val query: String = "",
    val songName: String = ""
)

class MainViewModel(application: Application) : AndroidViewModel(application), WebSocketListenerCallback {

    private val _carActionEvent = MutableSharedFlow<CarActionEvent>(extraBufferCapacity = 1)
    val carActionEvent: SharedFlow<CarActionEvent> = _carActionEvent.asSharedFlow()

    // Connection State
    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    // Server Endpoint URL
    private val _serverUrl = MutableStateFlow(BuildConfig.SERVER_URL)
    val serverUrl: StateFlow<String> = _serverUrl.asStateFlow()

    // Model & Voice Config
    private val _selectedModel = MutableStateFlow(DEFAULT_AI_MODELS[1]) // Companion
    val selectedModel: StateFlow<AiModelProfile> = _selectedModel.asStateFlow()

    private val _selectedVoice = MutableStateFlow(VoiceOption.ZEPHYR)
    val selectedVoice: StateFlow<VoiceOption> = _selectedVoice.asStateFlow()

    private val _systemInstruction = MutableStateFlow(DEFAULT_AI_MODELS[1].defaultPrompt)
    val systemInstruction: StateFlow<String> = _systemInstruction.asStateFlow()

    // Chat History Messages
    private val _messages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val messages: StateFlow<List<ChatMessage>> = _messages.asStateFlow()

    // Pending File Attachments
    private val _pendingAttachments = MutableStateFlow<List<FileAttachment>>(emptyList())
    val pendingAttachments: StateFlow<List<FileAttachment>> = _pendingAttachments.asStateFlow()

    // Audio Visualizer Volumes
    private val _userVolume = MutableStateFlow(0f)
    val userVolume: StateFlow<Float> = _userVolume.asStateFlow()

    private val _aiVolume = MutableStateFlow(0f)
    val aiVolume: StateFlow<Float> = _aiVolume.asStateFlow()

    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording.asStateFlow()

    private val _isAiSpeaking = MutableStateFlow(false)
    val isAiSpeaking: StateFlow<Boolean> = _isAiSpeaking.asStateFlow()

    // UI Modals
    private val _isSettingsOpen = MutableStateFlow(false)
    val isSettingsOpen: StateFlow<Boolean> = _isSettingsOpen.asStateFlow()

    private val _isVersionModalOpen = MutableStateFlow(false)
    val isVersionModalOpen: StateFlow<Boolean> = _isVersionModalOpen.asStateFlow()

    // Latency
    private val _latencyStats = MutableStateFlow(LatencyStats())
    val latencyStats: StateFlow<LatencyStats> = _latencyStats.asStateFlow()

    private var hasSentInitialConfig = false
    private val connectivityManager = application.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    // Remote Manager
    private val webSocketManager = WebSocketManager(this)

    // Unified Smart Duplex Voice Communication Manager
    private val voiceManager = SmartVoiceCommunicationManager(
        context = application.applicationContext,
        recordSampleRate = 16000,
        playbackSampleRate = 24000,
        onAudioChunkReady = { base64 ->
            if (_connectionState.value == ConnectionState.CONNECTED) {
                webSocketManager.sendAudioChunk(base64)
                _latencyStats.update { it.copy(audioChunksSent = it.audioChunksSent + 1) }
            }
        },
        onUserVolume = { vol ->
            _userVolume.value = vol
        },
        onAiVolume = { vol ->
            _aiVolume.value = vol
            _isAiSpeaking.value = vol > 0.05f
        },
        onUserBargeInDetected = {
            Log.d("MainViewModel", "User barge-in event received. Resetting model speech status.")
            _isAiSpeaking.value = false
        }
    )

    init {
        voiceManager.startSession(viewModelScope)
        registerNetworkCallback()
        connectServer()
    }

    private fun registerNetworkCallback() {
        try {
            val networkRequest = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build()

            networkCallback = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    Log.d("MainViewModel", "🌐 Mạng Internet đã hoạt động trở lại! Kích hoạt kết nối tức thì...")
                    if (_connectionState.value != ConnectionState.CONNECTED) {
                        webSocketManager.triggerImmediateReconnect()
                    }
                }

                override fun onLost(network: Network) {
                    Log.w("MainViewModel", "⚠️ Mất kết nối mạng Internet.")
                }
            }

            connectivityManager?.registerNetworkCallback(networkRequest, networkCallback!!)
        } catch (e: Exception) {
            Log.e("MainViewModel", "Error registering network callback", e)
        }
    }

    fun connectServer() {
        hasSentInitialConfig = false
        webSocketManager.connect(_serverUrl.value)
    }

    fun reconnect() {
        hasSentInitialConfig = false
        webSocketManager.connect(_serverUrl.value)
    }

    fun setServerUrl(url: String) {
        _serverUrl.value = url
        reconnect()
    }

    fun selectModel(model: AiModelProfile) {
        _selectedModel.value = model
        _selectedVoice.value = model.recommendedVoice
        _systemInstruction.value = model.defaultPrompt
        sendConfig()
    }

    fun setVoice(voice: VoiceOption) {
        _selectedVoice.value = voice
        sendConfig()
    }

    fun setSystemInstruction(instruction: String) {
        _systemInstruction.value = instruction
        sendConfig()
    }

    private fun sendConfig() {
        if (webSocketManager.isConnected()) {
            webSocketManager.sendConfig(
                voiceName = _selectedVoice.value.voiceName,
                systemInstruction = _systemInstruction.value,
                modelName = _selectedModel.value.geminiModel
            )
        }
    }

    fun toggleMicrophone() {
        if (voiceManager.isMicrophoneActive()) {
            stopMicrophone()
        } else {
            startMicrophone()
        }
    }

    fun startMicrophone() {
        val success = voiceManager.startMicrophone(viewModelScope)
        _isRecording.value = success
    }

    fun stopMicrophone() {
        voiceManager.stopMicrophone()
        _isRecording.value = false
        _userVolume.value = 0f
    }

    fun sendTextMessage(text: String) {
        val trimmed = text.trim()
        val attachments = _pendingAttachments.value

        if (trimmed.isEmpty() && attachments.isEmpty()) return

        val userMessage = ChatMessage(
            role = Role.USER,
            text = trimmed,
            attachments = attachments
        )
        _messages.update { it + userMessage }
        _pendingAttachments.value = emptyList()

        if (attachments.isNotEmpty()) {
            webSocketManager.sendMultimodalMessage(
                text = trimmed,
                attachments = attachments,
                modelName = _selectedModel.value.geminiModel,
                systemInstruction = _systemInstruction.value
            )
        } else {
            webSocketManager.sendTextMessage(trimmed)
        }
    }

    fun addAttachment(attachment: FileAttachment) {
        _pendingAttachments.update { it + attachment }
    }

    fun removeAttachment(id: String) {
        _pendingAttachments.update { list -> list.filter { it.id != id } }
    }

    fun clearHistory() {
        _messages.value = emptyList()
    }

    fun setSettingsOpen(open: Boolean) {
        _isSettingsOpen.value = open
    }

    fun setVersionModalOpen(open: Boolean) {
        _isVersionModalOpen.value = open
    }

    // WebSocket Listener Callbacks
    override fun onConnectionStateChanged(state: ConnectionState, errorMsg: String?) {
        _connectionState.value = state
        _errorMessage.value = errorMsg
        if (state == ConnectionState.CONNECTED && !hasSentInitialConfig) {
            hasSentInitialConfig = true
            sendConfig()
        } else if (state == ConnectionState.DISCONNECTED || state == ConnectionState.ERROR) {
            hasSentInitialConfig = false
        }
    }

    override fun onAudioReceived(base64Pcm: String) {
        voiceManager.playAiAudioChunk(base64Pcm)
        _latencyStats.update {
            it.copy(
                audioChunksReceived = it.audioChunksReceived + 1,
                lastChunkTimeMs = System.currentTimeMillis()
            )
        }
    }

    override fun onTextDeltaReceived(text: String, role: String) {
        _messages.update { currentList ->
            val lastMsg = currentList.lastOrNull()
            if (lastMsg != null && lastMsg.role == Role.MODEL && lastMsg.isStreaming) {
                currentList.dropLast(1) + lastMsg.copy(
                    text = lastMsg.text + text
                )
            } else {
                currentList + ChatMessage(
                    role = Role.MODEL,
                    text = text,
                    isStreaming = true
                )
            }
        }
    }

    override fun onTurnComplete() {
        voiceManager.onAiTurnFinished()
        _messages.update { currentList ->
            val lastMsg = currentList.lastOrNull()
            if (lastMsg != null && lastMsg.role == Role.MODEL && lastMsg.isStreaming) {
                currentList.dropLast(1) + lastMsg.copy(isStreaming = false)
            } else {
                currentList
            }
        }
    }

    override fun onInterrupted() {
        voiceManager.interruptAiPlayback()
        _isAiSpeaking.value = false
        _aiVolume.value = 0f
    }

    override fun onError(error: String) {
        _errorMessage.value = error
    }

    override fun onToolCall(name: String, args: JsonObject?) {
        val dest = args?.get("destination")?.asString ?: ""
        val q = args?.get("query")?.asString ?: ""
        val song = args?.get("song_name")?.asString ?: ""

        val actionText = when (name) {
            "navigate_to" -> "🚗 Đang chỉ đường đến: $dest"
            "open_youtube" -> "▶️ Đang mở YouTube: $q"
            "play_music" -> "🎵 Đang phát nhạc: $song"
            else -> "⚡ Lệnh xe: $name"
        }

        _messages.update { current ->
            current + ChatMessage(
                role = Role.MODEL,
                text = actionText,
                isStreaming = false
            )
        }

        _carActionEvent.tryEmit(
            CarActionEvent(
                type = name,
                destination = dest,
                query = q,
                songName = song
            )
        )
    }

    override fun onCleared() {
        super.onCleared()
        try {
            networkCallback?.let { connectivityManager?.unregisterNetworkCallback(it) }
        } catch (e: Exception) {
            Log.e("MainViewModel", "Error unregistering network callback", e)
        }
        voiceManager.stopSession()
        webSocketManager.disconnect()
    }
}
