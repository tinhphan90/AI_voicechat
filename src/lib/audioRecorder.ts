/**
 * Microphone Audio Recorder for Gemini Live API
 * Captures 16kHz 16-bit PCM Mono audio from microphone and encodes to Base64 chunks
 */

export class AudioRecorder {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isRecording = false;

  private onAudioChunkCallback: ((base64Pcm: string) => void) | null = null;
  private onVolumeCallback: ((volume: number) => void) | null = null;

  constructor(
    onAudioChunk: (base64Pcm: string) => void,
    onVolume?: (volume: number) => void
  ) {
    this.onAudioChunkCallback = onAudioChunk;
    this.onVolumeCallback = onVolume;
  }

  public async start(): Promise<void> {
    if (this.isRecording) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Target 16kHz for Gemini Live API
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: 16000 });

      this.source = this.audioCtx.createMediaStreamSource(this.mediaStream);

      // Buffer size of 4096 gives ~250ms chunks at 16kHz
      this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording || !e.inputBuffer || e.inputBuffer.numberOfChannels === 0) return;

        const inputData = e.inputBuffer.getChannelData(0);
        if (!inputData || inputData.length === 0) return;

        // Calculate volume for visualizer (RMS)
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const normalizedVolume = Math.min(1, rms * 5); // scale for visibility
        if (this.onVolumeCallback) {
          this.onVolumeCallback(normalizedVolume);
        }

        // Convert Float32Array to Int16 PCM ArrayBuffer
        const pcm16 = this.floatTo16BitPCM(inputData);
        if (pcm16.length === 0) return;

        const base64 = this.arrayBufferToBase64(pcm16.buffer);

        if (this.onAudioChunkCallback) {
          this.onAudioChunkCallback(base64);
        }
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioCtx.destination);
      this.isRecording = true;
    } catch (err) {
      console.error("[AudioRecorder] Could not access microphone:", err);
      this.stop();
      throw err;
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
      this.audioCtx.close();
      this.audioCtx = null;
    }

    if (this.onVolumeCallback) {
      this.onVolumeCallback(0);
    }
  }

  public getIsRecording(): boolean {
    return this.isRecording;
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
