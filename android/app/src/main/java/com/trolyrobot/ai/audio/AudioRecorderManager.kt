package com.trolyrobot.ai.audio

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.NoiseSuppressor
import android.util.Base64
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.sqrt

/**
 * Android AudioRecorderManager
 * Captures 16kHz 16-bit PCM Mono audio using VOICE_COMMUNICATION with safe AEC & NS
 * for Gemini Live API real-time audio streaming.
 */
class AudioRecorderManager(
    private val onAudioChunk: (String) -> Unit,
    private val onVolume: (Float) -> Unit
) {
    private var audioRecord: AudioRecord? = null
    private var recordingJob: Job? = null
    private var isRecording = false
    private var aecEffect: AcousticEchoCanceler? = null
    private var nsEffect: NoiseSuppressor? = null

    companion object {
        private const val TAG = "AudioRecorderManager"
        private const val SAMPLE_RATE = 16000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    }

    @SuppressLint("MissingPermission")
    fun startRecording(scope: CoroutineScope): Boolean {
        if (isRecording) return true

        try {
            val minBufferSize = AudioRecord.getMinBufferSize(
                SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT
            )
            val bufferSize = Math.max(minBufferSize * 2, 4096 * 2)

            // AudioSource.VOICE_COMMUNICATION enables Hardware DSP AEC & NS on Android HAL
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.VOICE_COMMUNICATION,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize
            )

            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                Log.e(TAG, "AudioRecord initialization failed.")
                stopRecording()
                return false
            }

            val sessionId = audioRecord!!.audioSessionId
            attachAecSafely(sessionId)
            attachNsSafely(sessionId)

            audioRecord?.startRecording()
            if (audioRecord?.recordingState != AudioRecord.RECORDSTATE_RECORDING) {
                Log.e(TAG, "AudioRecord failed to start recording.")
                stopRecording()
                return false
            }

            isRecording = true

            recordingJob = scope.launch(Dispatchers.IO) {
                val buffer = ShortArray(2048) // ~128ms chunks at 16kHz
                val byteBuffer = ByteArray(4096)

                while (isActive && isRecording) {
                    val readSize = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                    if (readSize > 0) {
                        // Calculate RMS Volume
                        var sum = 0.0
                        for (i in 0 until readSize) {
                            val sample = buffer[i] / 32768.0
                            sum += sample * sample
                        }
                        val rms = sqrt(sum / readSize)
                        val normalizedVol = (rms * 5.0).coerceIn(0.0, 1.0).toFloat()
                        onVolume(normalizedVol)

                        // Convert short array to 16-bit PCM byte array (Little Endian)
                        for (i in 0 until readSize) {
                            val v = buffer[i].toInt()
                            byteBuffer[i * 2] = (v and 0xFF).toByte()
                            byteBuffer[i * 2 + 1] = ((v shr 8) and 0xFF).toByte()
                        }

                        val pcmBytes = byteBuffer.copyOf(readSize * 2)
                        val base64Chunk = Base64.encodeToString(pcmBytes, Base64.NO_WRAP)
                        onAudioChunk(base64Chunk)
                    }
                }
            }
            Log.d(TAG, "Recording started successfully with Session ID $sessionId")
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Error starting recording", e)
            stopRecording()
            return false
        }
    }

    private fun attachAecSafely(sessionId: Int) {
        try {
            if (AcousticEchoCanceler.isAvailable()) {
                aecEffect = AcousticEchoCanceler.create(sessionId)?.apply {
                    enabled = true
                    Log.d(TAG, "AcousticEchoCanceler enabled successfully.")
                }
            }
        } catch (e: Throwable) {
            Log.e(TAG, "Failed to attach AcousticEchoCanceler: ${e.message}")
            aecEffect = null
        }
    }

    private fun attachNsSafely(sessionId: Int) {
        try {
            if (NoiseSuppressor.isAvailable()) {
                nsEffect = NoiseSuppressor.create(sessionId)?.apply {
                    enabled = true
                    Log.d(TAG, "NoiseSuppressor enabled successfully.")
                }
            }
        } catch (e: Throwable) {
            Log.e(TAG, "Failed to attach NoiseSuppressor: ${e.message}")
            nsEffect = null
        }
    }

    fun stopRecording() {
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
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing AudioRecord", e)
        } finally {
            audioRecord = null
            onVolume(0f)
        }
        Log.d(TAG, "Recording stopped.")
    }

    fun isRecording(): Boolean = isRecording
}
