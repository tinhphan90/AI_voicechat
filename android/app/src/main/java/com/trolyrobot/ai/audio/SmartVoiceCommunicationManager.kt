package com.trolyrobot.ai.audio

import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.NoiseSuppressor
import android.os.Build
import android.util.Base64
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.sqrt

/**
 * Trình quản lý âm thanh 2 chiều thời gian thực (Full-Duplex + Soft Half-Duplex Gate)
 * Chuẩn hoá cho Gemini Live / VoIP / Trợ lý ô tô.
 * Tích hợp Hardware AEC, AudioFocus VoIP, Routing API 31+, và Smart Barge-in chống vọng loa ngoài.
 */
class SmartVoiceCommunicationManager(
    private val context: Context,
    private val recordSampleRate: Int = 16000,
    private val playbackSampleRate: Int = 24000,
    private val onAudioChunkReady: (String) -> Unit, // Base64 PCM 16-bit Mono @ 16kHz
    private val onUserVolume: (Float) -> Unit,
    private val onAiVolume: (Float) -> Unit,
    private val onUserBargeInDetected: () -> Unit
) {

    companion object {
        private const val TAG = "SmartVoiceCommManager"

        // Cấu hình ngưỡng âm lượng RMS
        private const val RMS_IDLE_THRESHOLD = 900.0        // Ngưỡng khi AI im lặng (nhạy)
        private const val RMS_BARGE_IN_THRESHOLD = 4200.0    // Ngưỡng khi AI đang nói (chống vọng loa)

        // Thời gian debounce yêu cầu vượt ngưỡng liên tục (ms)
        private const val BARGE_IN_HOLD_FRAMES = 4          // ~240ms (mỗi frame 60ms)
        private const val SILENCE_RELEASE_FRAMES = 6        // ~360ms duy trì sau khi ngắt lời
    }

    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var audioFocusRequest: AudioFocusRequest? = null

    // AudioRecord (Thu âm)
    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private var recordingJob: Job? = null
    private var aecEffect: AcousticEchoCanceler? = null
    private var nsEffect: NoiseSuppressor? = null

    // AudioTrack (Phát âm thanh AI)
    private var audioTrack: AudioTrack? = null
    private val audioChannel = Channel<ByteArray>(Channel.UNLIMITED)
    private var playbackJob: Job? = null
    @Volatile private var isAiSpeaking = false
    private var isMuted = false

    // Trạng thái của bộ lọc Soft Half-Duplex Gate
    private var consecutiveLoudFrames = 0
    private var consecutiveSilenceFrames = 0
    private var isBargeInActive = false

    // ==========================================
    // 1. KHỞI TẠO HỆ THỐNG ÂM THANH CHUẨN VOIP
    // ==========================================
    fun startSession(scope: CoroutineScope) {
        Log.d(TAG, "Đang khởi động phiên giao tiếp âm thanh VoIP...")
        requestVoipAudioFocus()
        setupAudioRouting(enableSpeaker = true)
        initAudioTrack(scope)
    }

    fun stopSession() {
        Log.d(TAG, "Đang dừng phiên giao tiếp âm thanh...")
        stopMicrophone()
        stopAudioTrack()
        restoreAudioRouting()
        abandonVoipAudioFocus()
    }

    // ==========================================
    // 2. CẤU HÌNH AUDIO ROUTING & AUDIO FOCUS
    // ==========================================
    private fun requestVoipAudioFocus() {
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
                .setAudioAttributes(audioAttributes)
                .setAcceptsDelayedFocusGain(false)
                .setOnAudioFocusChangeListener { focusChange ->
                    Log.d(TAG, "AudioFocus change: $focusChange")
                }
                .build()
            audioManager.requestAudioFocus(audioFocusRequest!!)
        } else {
            @Suppress("DEPRECATION")
            audioManager.requestAudioFocus(
                { focusChange -> Log.d(TAG, "AudioFocus change: $focusChange") },
                AudioManager.STREAM_VOICE_CALL,
                AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE
            )
        }
    }

    private fun abandonVoipAudioFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
            audioManager.abandonAudioFocusRequest(audioFocusRequest!!)
        } else {
            @Suppress("DEPRECATION")
            audioManager.abandonAudioFocus(null)
        }
    }

    private fun setupAudioRouting(enableSpeaker: Boolean) {
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Android 12+ (API 31+): Chuẩn mới thay cho setSpeakerphoneOn
            val devices = audioManager.availableCommunicationDevices
            val speakerDevice = devices.firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
            if (enableSpeaker && speakerDevice != null) {
                audioManager.setCommunicationDevice(speakerDevice)
                Log.d(TAG, "Đã định tuyến sang thiết bị: TYPE_BUILTIN_SPEAKER")
            } else {
                audioManager.clearCommunicationDevice()
            }
        } else {
            // Fallback an toàn cho Android 11 trở xuống
            @Suppress("DEPRECATION")
            audioManager.isSpeakerphoneOn = enableSpeaker
        }
    }

    private fun restoreAudioRouting() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            audioManager.clearCommunicationDevice()
        } else {
            @Suppress("DEPRECATION")
            audioManager.isSpeakerphoneOn = false
        }
        audioManager.mode = AudioManager.MODE_NORMAL
    }

    // ==========================================
    // 3. AUDIOTRACK PHÁT TIẾNG AI (CỰC KỲ QUAN TRỌNG)
    // ==========================================
    private fun initAudioTrack(scope: CoroutineScope) {
        if (playbackJob != null) return

        try {
            val minBufSize = AudioTrack.getMinBufferSize(
                playbackSampleRate,
                android.media.AudioFormat.CHANNEL_OUT_MONO,
                android.media.AudioFormat.ENCODING_PCM_16BIT
            )
            val bufferSize = Math.max(minBufSize * 4, 16384)

            // BẮT BUỘC dùng USAGE_VOICE_COMMUNICATION để Hardware AEC nhận diện được tín hiệu tham chiếu (Far-End)
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build()

            val audioFormat = android.media.AudioFormat.Builder()
                .setSampleRate(playbackSampleRate)
                .setChannelMask(android.media.AudioFormat.CHANNEL_OUT_MONO)
                .setEncoding(android.media.AudioFormat.ENCODING_PCM_16BIT)
                .build()

            audioTrack = AudioTrack(
                audioAttributes,
                audioFormat,
                bufferSize,
                AudioTrack.MODE_STREAM,
                audioManager.generateAudioSessionId()
            )

            audioTrack?.play()

            playbackJob = scope.launch(Dispatchers.IO) {
                while (isActive) {
                    val pcmData = audioChannel.receive()
                    if (isMuted || pcmData.isEmpty()) continue

                    isAiSpeaking = true

                    // Tính RMS âm lượng AI cho Visualizer
                    var sum = 0.0
                    val sampleCount = pcmData.size / 2
                    for (i in 0 until sampleCount) {
                        val low = pcmData[i * 2].toInt() and 0xFF
                        val high = pcmData[i * 2 + 1].toInt()
                        val sample = ((high shl 8) or low).toShort() / 32768.0
                        sum += sample * sample
                    }
                    if (sampleCount > 0) {
                        val rms = sqrt(sum / sampleCount)
                        val normalizedVol = (rms * 4.0).coerceIn(0.0, 1.0).toFloat()
                        onAiVolume(normalizedVol)
                    }

                    audioTrack?.write(pcmData, 0, pcmData.size)
                }
            }

            Log.d(TAG, "AudioTrack (VoIP Output) đã sẵn sàng.")
        } catch (e: Exception) {
            Log.e(TAG, "Lỗi khởi tạo AudioTrack: ${e.message}", e)
        }
    }

    /**
     * Nhận chunk âm thanh Base64 từ server Gemini và đưa vào queue phát ra loa
     */
    fun playAiAudioChunk(base64Pcm: String) {
        if (isMuted || base64Pcm.isEmpty()) return
        try {
            val bytes = Base64.decode(base64Pcm, Base64.NO_WRAP)
            if (bytes.isNotEmpty()) {
                audioChannel.trySend(bytes)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Base64 decoding failed for audio chunk", e)
        }
    }

    fun onAiTurnFinished() {
        isAiSpeaking = false
        isBargeInActive = false
        consecutiveLoudFrames = 0
        onAiVolume(0f)
    }

    fun interruptAiPlayback() {
        while (audioChannel.tryReceive().isSuccess) {
            // Drain queue
        }
        try {
            isAiSpeaking = false
            audioTrack?.pause()
            audioTrack?.flush()
            audioTrack?.play()
            Log.d(TAG, "Đã ngắt (flush) âm thanh phát của AI thành công.")
        } catch (e: Exception) {
            Log.e(TAG, "Lỗi khi ngắt AudioTrack: ${e.message}")
        }
        onAiVolume(0f)
    }

    private fun stopAudioTrack() {
        playbackJob?.cancel()
        playbackJob = null
        interruptAiPlayback()
        try {
            audioTrack?.stop()
            audioTrack?.release()
            audioTrack = null
        } catch (e: Exception) {
            Log.e(TAG, "Lỗi giải phóng AudioTrack: ${e.message}")
        }
    }

    // ==========================================
    // 4. AUDIORECORD + HARDWARE AEC AN TOÀN
    // ==========================================
    @SuppressLint("MissingPermission")
    fun startMicrophone(scope: CoroutineScope): Boolean {
        if (isRecording) return true

        val minBufferSize = AudioRecord.getMinBufferSize(
            recordSampleRate,
            android.media.AudioFormat.CHANNEL_IN_MONO,
            android.media.AudioFormat.ENCODING_PCM_16BIT
        )

        // Bộ đệm an toàn gấp 2 lần Min Buffer để tránh giật lag khi CPU bận
        val bufferSize = (minBufferSize * 2).coerceAtLeast(4096)

        try {
            val audioSources = intArrayOf(
                MediaRecorder.AudioSource.VOICE_COMMUNICATION,
                MediaRecorder.AudioSource.MIC,
                MediaRecorder.AudioSource.DEFAULT
            )

            var record: AudioRecord? = null
            for (source in audioSources) {
                try {
                    val candidate = AudioRecord(
                        source,
                        recordSampleRate,
                        android.media.AudioFormat.CHANNEL_IN_MONO,
                        android.media.AudioFormat.ENCODING_PCM_16BIT,
                        bufferSize
                    )
                    if (candidate.state == AudioRecord.STATE_INITIALIZED) {
                        record = candidate
                        Log.d(TAG, "Khởi tạo AudioRecord thành công với AudioSource: $source")
                        break
                    } else {
                        candidate.release()
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "AudioSource $source không khả dụng trên thiết bị này, thử nguồn tiếp theo...")
                }
            }

            if (record == null) {
                Log.e(TAG, "Không thể khởi tạo AudioRecord với bất kỳ nguồn âm thanh nào!")
                stopMicrophone()
                return false
            }

            audioRecord = record

            val sessionId = audioRecord!!.audioSessionId
            attachAcousticEchoCancelerSafely(sessionId)
            attachNoiseSuppressorSafely(sessionId)

            audioRecord?.startRecording()
            if (audioRecord?.recordingState != AudioRecord.RECORDSTATE_RECORDING) {
                Log.e(TAG, "AudioRecord failed to start recording state.")
                stopMicrophone()
                return false
            }

            isRecording = true

            // Khởi chạy luồng thu và xử lý Soft Half-Duplex Gate
            recordingJob = scope.launch(Dispatchers.IO) {
                processRecordLoop()
            }

            Log.d(TAG, "AudioRecord đã bắt đầu thu với Session ID: $sessionId")
            return true
        } catch (e: SecurityException) {
            Log.e(TAG, "Chưa cấp quyền RECORD_AUDIO: ${e.message}")
            stopMicrophone()
            return false
        } catch (e: Exception) {
            Log.e(TAG, "Lỗi khởi động AudioRecord: ${e.message}", e)
            stopMicrophone()
            return false
        }
    }

    /**
     * Kiểm tra và gắn AEC an toàn (có bọc try-catch phòng ngừa firmware tùy biến)
     */
    private fun attachAcousticEchoCancelerSafely(sessionId: Int) {
        try {
            if (AcousticEchoCanceler.isAvailable()) {
                aecEffect = AcousticEchoCanceler.create(sessionId)?.apply {
                    enabled = true
                    Log.d(TAG, "AcousticEchoCanceler (AEC) đã được kích hoạt thành công.")
                }
                if (aecEffect == null) {
                    Log.w(TAG, "AEC khả dụng nhưng create() trả về null (Đã được SoC quản lý ngầm).")
                }
            } else {
                Log.w(TAG, "Phần cứng thiết bị không công bố AcousticEchoCanceler.")
            }
        } catch (e: Throwable) {
            Log.e(TAG, "Lỗi gắn AcousticEchoCanceler: ${e.message}")
            aecEffect = null
        }
    }

    private fun attachNoiseSuppressorSafely(sessionId: Int) {
        try {
            if (NoiseSuppressor.isAvailable()) {
                nsEffect = NoiseSuppressor.create(sessionId)?.apply {
                    enabled = true
                    Log.d(TAG, "NoiseSuppressor (NS) đã được kích hoạt thành công.")
                }
            }
        } catch (e: Throwable) {
            Log.e(TAG, "Lỗi gắn NoiseSuppressor: ${e.message}")
            nsEffect = null
        }
    }

    // ==========================================================
    // 5. THUẬT TOÁN SOFT HALF-DUPLEX GATE VỚI HYSTERESIS DEBOUNCE
    // ==========================================================
    private fun processRecordLoop() {
        // Đọc từng khung ~60ms (960 samples @ 16kHz PCM 16-bit = 1920 bytes)
        val frameBytes = (recordSampleRate * 2 * 0.06).toInt()
        val audioBuffer = ByteArray(frameBytes)

        while (isRecording) {
            val bytesRead = audioRecord?.read(audioBuffer, 0, audioBuffer.size) ?: -1
            if (bytesRead <= 0) continue

            val pcmData = audioBuffer.copyOf(bytesRead)
            val currentRms = calculatePcm16Rms(pcmData)

            // Cập nhật âm lượng cho Visualizer
            val normalizedVol = (currentRms / 8000.0).coerceIn(0.0, 1.0).toFloat()
            onUserVolume(normalizedVol)

            // ÁP DỤNG CƠ CHẾ SOFT HALF-DUPLEX GATE
            if (isAiSpeaking) {
                // TRƯỜNG HỢP 1: AI ĐANG PHÁT ÂM THANH RA LOA
                if (currentRms >= RMS_BARGE_IN_THRESHOLD) {
                    consecutiveLoudFrames++
                    consecutiveSilenceFrames = 0

                    // Vượt ngưỡng liên tục đủ thời gian -> Xác nhận NGƯỜI DÙNG CỐ TÌNH NGẮT LỜI (Barge-In)
                    if (consecutiveLoudFrames >= BARGE_IN_HOLD_FRAMES) {
                        if (!isBargeInActive) {
                            isBargeInActive = true
                            Log.d(TAG, "⚡ BARGE-IN XÁC NHẬN! Âm lượng RMS = ${currentRms.toInt()}. Ngắt tiếng AI!")
                            interruptAiPlayback()
                            onUserBargeInDetected()
                        }
                        // Cho phép gửi audio lên server
                        val base64Chunk = Base64.encodeToString(pcmData, Base64.NO_WRAP)
                        onAudioChunkReady(base64Chunk)
                    } else {
                        // Chưa đủ frame để xác nhận -> Chặn để tránh gửi tiếng vang của loa lên server
                        Log.v(TAG, "Nghi ngờ vọng loa (RMS=${currentRms.toInt()}), đang debounce ($consecutiveLoudFrames/$BARGE_IN_HOLD_FRAMES)")
                    }
                } else {
                    // Âm thanh nhỏ hơn ngưỡng Barge-in -> Chắc chắn là tiếng loa AI hoặc tiếng ồn xe hơi -> CHẶN
                    consecutiveLoudFrames = 0
                    if (isBargeInActive) {
                        consecutiveSilenceFrames++
                        if (consecutiveSilenceFrames >= SILENCE_RELEASE_FRAMES) {
                            isBargeInActive = false
                        }
                        // Trong lúc xả silence sau ngắt lời, vẫn gửi âm thanh
                        val base64Chunk = Base64.encodeToString(pcmData, Base64.NO_WRAP)
                        onAudioChunkReady(base64Chunk)
                    }
                }
            } else {
                // TRƯỜNG HỢP 2: AI KHÔNG NÓI (IDLE / USER ĐANG NÓI)
                consecutiveLoudFrames = 0
                consecutiveSilenceFrames = 0
                isBargeInActive = false

                val base64Chunk = Base64.encodeToString(pcmData, Base64.NO_WRAP)
                onAudioChunkReady(base64Chunk)
            }
        }
    }

    /**
     * Tính toán Root-Mean-Square (RMS) cho mảng byte PCM 16-bit Mono (Little-Endian)
     */
    private fun calculatePcm16Rms(pcmBytes: ByteArray): Double {
        if (pcmBytes.size < 2) return 0.0
        val shortBuffer = ByteBuffer.wrap(pcmBytes).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
        var sumSquares = 0.0
        val sampleCount = shortBuffer.remaining()

        while (shortBuffer.hasRemaining()) {
            val sample = shortBuffer.get().toDouble()
            sumSquares += sample * sample
        }

        return if (sampleCount > 0) sqrt(sumSquares / sampleCount) else 0.0
    }

    fun stopMicrophone() {
        isRecording = false
        recordingJob?.cancel()
        recordingJob = null

        try {
            aecEffect?.release()
            aecEffect = null

            nsEffect?.release()
            nsEffect = null

            audioRecord?.stop()
            audioRecord?.release()
            audioRecord = null
        } catch (e: Exception) {
            Log.e(TAG, "Lỗi giải phóng AudioRecord: ${e.message}")
        } finally {
            onUserVolume(0f)
        }
        Log.d(TAG, "Microphone stopped.")
    }

    fun isMicrophoneActive(): Boolean = isRecording
    fun isAiSpeaking(): Boolean = isAiSpeaking
}
