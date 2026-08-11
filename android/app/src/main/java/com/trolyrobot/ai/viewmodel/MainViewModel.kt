package com.trolyrobot.ai.viewmodel

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.trolyrobot.ai.BuildConfig
import com.trolyrobot.ai.audio.AudioRecorderManager
import com.trolyrobot.ai.audio.RealtimeAudioPlayer
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
import java.util.UUID

class MainViewModel(application: Application) : AndroidViewModel(application), WebSocketListenerCallback {

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

    // Audio & Remote Managers
    private val webSocketManager = WebSocketManager(this)
    private val audioRecorderManager = AudioRecorderManager(
        onAudioChunk = { base64 ->
            if (_connectionState.value == ConnectionState.CONNECTED) {
                webSocketManager.sendAudioChunk(base64)
                _latencyStats.update { it.copy(audioChunksSent = it.audioChunksSent + 1) }
            }
        },
        onVolume = { vol ->
            _userVolume.value = vol
        }
    )

    private val audioPlayer = RealtimeAudioPlayer(
        onVolume = { vol ->
            _aiVolume.value = vol
            _isAiSpeaking.value = vol > 0.05f
        }
    )

    init {
        audioPlayer.start(viewModelScope)
        connectServer()
    }

    fun connectServer() {
        webSocketManager.connect(_serverUrl.value)
    }

    fun reconnect() {
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
        if (_connectionState.value == ConnectionState.CONNECTED) {
            webSocketManager.sendConfig(
                voiceName = _selectedVoice.value.voiceName,
                systemInstruction = _systemInstruction.value,
                modelName = _selectedModel.value.geminiModel
            )
        }
    }

    fun toggleMicrophone() {
        if (audioRecorderManager.isRecording()) {
            stopMicrophone()
        } else {
            startMicrophone()
        }
    }

    fun startMicrophone() {
        val success = audioRecorderManager.startRecording(viewModelScope)
        _isRecording.value = success
    }

    fun stopMicrophone() {
        audioRecorderManager.stopRecording()
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
        if (state == ConnectionState.CONNECTED) {
            sendConfig()
        }
    }

    override fun onAudioReceived(base64Pcm: String) {
        audioPlayer.playChunk(base64Pcm)
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
        audioPlayer.stop()
        _isAiSpeaking.value = false
        _aiVolume.value = 0f
    }

    override fun onError(error: String) {
        _errorMessage.value = error
    }

    override fun onCleared() {
        super.onCleared()
        audioRecorderManager.stopRecording()
        audioPlayer.release()
        webSocketManager.disconnect()
    }
}
