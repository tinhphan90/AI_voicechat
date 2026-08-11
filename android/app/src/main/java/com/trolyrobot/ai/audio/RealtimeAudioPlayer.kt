package com.trolyrobot.ai.audio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.util.Base64
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.sqrt

/**
 * Android RealtimeAudioPlayer
 * Receives Base64 24kHz PCM 16-bit Mono audio chunks from Gemini model,
 * decodes and streams seamless low-latency playback using Android AudioTrack.
 */
class RealtimeAudioPlayer(
    private val onVolume: (Float) -> Unit
) {
    private var audioTrack: AudioTrack? = null
    private val audioChannel = Channel<ByteArray>(Channel.UNLIMITED) // Unlimited channel buffer so zero PCM chunks are dropped
    private var playbackJob: Job? = null
    private var isPlaying = false
    private var isMuted = false

    companion object {
        private const val TAG = "RealtimeAudioPlayer"
        private const val SAMPLE_RATE = 24000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_OUT_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    }

    fun start(scope: CoroutineScope) {
        if (playbackJob != null) return

        val minBufferSize = AudioTrack.getMinBufferSize(
            SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT
        )
        // Use a larger buffer (4x minBufferSize or 16384 bytes) to prevent AudioTrack underrun stutters on Android hardware
        val bufferSize = Math.max(minBufferSize * 4, 16384)

        audioTrack = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AUDIO_FORMAT)
                    .setSampleRate(SAMPLE_RATE)
                    .setChannelMask(CHANNEL_CONFIG)
                    .build()
            )
            .setBufferSizeInBytes(bufferSize)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()

        audioTrack?.play()

        playbackJob = scope.launch(Dispatchers.IO) {
            while (isActive) {
                val pcmData = audioChannel.receive()
                if (isMuted || pcmData.isEmpty()) continue

                isPlaying = true

                // Calculate Volume for visualizer
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
                    onVolume(normalizedVol)
                }

                // Write full PCM audio chunk into AudioTrack
                audioTrack?.write(pcmData, 0, pcmData.size)
            }
        }
    }

    fun playChunk(base64Pcm: String) {
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

    fun stop() {
        // Clear pending queue and flush AudioTrack for immediate interruption
        while (audioChannel.tryReceive().isSuccess) {
            // Drain channel
        }
        try {
            audioTrack?.pause()
            audioTrack?.flush()
            audioTrack?.play()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping audio track", e)
        }
        isPlaying = false
        onVolume(0f)
    }

    fun setMute(muted: Boolean) {
        isMuted = muted
        if (muted) {
            stop()
        }
    }

    fun getIsPlaying(): Boolean = isPlaying
    fun getIsMuted(): Boolean = isMuted

    fun release() {
        playbackJob?.cancel()
        playbackJob = null
        try {
            audioTrack?.stop()
            audioTrack?.release()
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing AudioTrack", e)
        } finally {
            audioTrack = null
        }
    }
}
