/**
 * Microphone Audio Recorder for Gemini Live API
 * Cross-platform support for iOS (Safari, Chrome iOS) & Android (Chrome, WebViews, Edge)
 * Captures 16kHz 16-bit PCM Mono audio from microphone with automatic resampling and error diagnostics.
 */

export class AudioRecorder {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isRecording = false;

  private onAudioChunkCallback: ((base64Pcm: string, volume: number) => void) | null = null;
  private onVolumeCallback: ((volume: number) => void) | null = null;

  constructor(
    onAudioChunk: (base64Pcm: string, volume: number) => void,
    onVolume?: (volume: number) => void
  ) {
    this.onAudioChunkCallback = onAudioChunk;
    this.onVolumeCallback = onVolume;
  }

  public async start(): Promise<void> {
    if (this.isRecording) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        "TRINHDRUYET_KHONG_HO_TRO: Trình duyệt của bạn không hỗ trợ truy cập Micro. Vui lòng mở bằng Safari hoặc Chrome phiên bản mới nhất."
      );
    }

    try {
      // 1. Request microphone stream with echo cancellation and noise suppression (with iOS fallback)
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (firstErr: any) {
        console.warn("[AudioRecorder] Detailed audio constraints failed on iOS, retrying with basic { audio: true }:", firstErr);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      this.mediaStream = stream;

      // 2. Initialize Audio Context with iOS / WebKit fallback
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) {
        throw new Error("AudioContext không được hỗ trợ trên thiết bị này.");
      }

      // Try 16kHz context first for zero-overhead streaming to Gemini
      try {
        this.audioCtx = new AudioCtxClass({ sampleRate: 16000 });
      } catch (e) {
        console.warn("[AudioRecorder] Could not create 16kHz AudioContext directly, falling back to default sampleRate:", e);
        this.audioCtx = new AudioCtxClass();
      }

      // Ensure AudioContext is resumed on iOS Safari
      if (this.audioCtx.state === "suspended") {
        await this.audioCtx.resume();
      }

      this.source = this.audioCtx.createMediaStreamSource(this.mediaStream);

      // Buffer size of 4096 gives smooth audio frames
      const bufferSize = 4096;
      this.processor = this.audioCtx.createScriptProcessor(bufferSize, 1, 1);

      const nativeSampleRate = this.audioCtx.sampleRate;
      const targetSampleRate = 16000;

      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording || !e.inputBuffer || e.inputBuffer.numberOfChannels === 0) return;

        const inputData = e.inputBuffer.getChannelData(0);
        if (!inputData || inputData.length === 0) return;

        // Calculate volume RMS for visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const normalizedVolume = Math.min(1, rms * 5); // Scale for UI visualizer
        if (this.onVolumeCallback) {
          this.onVolumeCallback(normalizedVolume);
        }

        // Resample audio if native sample rate is not 16000 (common on iOS hardware running at 44.1kHz or 48kHz)
        let resampledData: Float32Array;
        if (nativeSampleRate !== targetSampleRate) {
          resampledData = this.downsampleBuffer(inputData, nativeSampleRate, targetSampleRate);
        } else {
          resampledData = inputData;
        }

        // Convert Float32Array to Int16 PCM ArrayBuffer
        const pcm16 = this.floatTo16BitPCM(resampledData);
        if (pcm16.length === 0) return;

        const base64 = this.arrayBufferToBase64(pcm16.buffer);

        if (this.onAudioChunkCallback) {
          this.onAudioChunkCallback(base64, normalizedVolume);
        }
      };

      this.source.connect(this.processor);
      
      // On iOS Safari, route processor through a silent gain node to prevent mic loopback into device speaker
      const muteGain = this.audioCtx.createGain();
      muteGain.gain.value = 0;
      this.processor.connect(muteGain);
      muteGain.connect(this.audioCtx.destination);

      this.isRecording = true;
    } catch (err: any) {
      console.error("[AudioRecorder] Micro access error:", err);
      this.stop();

      // Format clean error for iOS / Android permissions guide
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        throw new Error("PERMISSION_DENIED: Bạn đã từ chối quyền Micro.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        throw new Error("NO_MIC_FOUND: Không tìm thấy thiết bị Microphone trên máy.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        throw new Error("MIC_IN_USE: Microphone đang được sử dụng bởi ứng dụng khác.");
      } else if (err.name === "SecurityError") {
        throw new Error("SECURITY_ERROR: Truy cập Micro yêu cầu kết nối bảo mật HTTPS.");
      } else {
        throw err;
      }
    }
  }

  public stop(): void {
    this.isRecording = false;

    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (e) {
        console.warn("[AudioRecorder] Error closing AudioContext:", e);
      }
      this.audioCtx = null;
    }

    if (this.onVolumeCallback) {
      this.onVolumeCallback(0);
    }
  }

  public getIsRecording(): Boolean {
    return this.isRecording;
  }

  /**
   * Resamples PCM float buffer from native sample rate (e.g. 44.1kHz / 48kHz on iOS) down to target 16kHz
   */
  private downsampleBuffer(
    buffer: Float32Array,
    sampleRate: number,
    outSampleRate: number
  ): Float32Array {
    if (outSampleRate === sampleRate) return buffer;
    if (outSampleRate > sampleRate) return buffer;

    const sampleRateRatio = sampleRate / outSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }

    return result;
  }

  private floatTo16BitPCM(output: Float32Array): Int16Array {
    const result = new Int16Array(output.length);
    for (let i = 0; i < output.length; i++) {
      const s = Math.max(-1, Math.min(1, output[i]));
      result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return result;
  }

  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

