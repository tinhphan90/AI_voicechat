/**
 * Audio Player for Gemini Live API
 * Receives Base64 24kHz PCM 16-bit Mono audio from Gemini model,
 * decodes and schedules seamless playback using Web Audio API.
 */

export class AudioPlayer {
  private audioCtx: AudioContext | null = null;
  private nextStartTime = 0;
  private isMuted = false;
  private isPlaying = false;
  private activeSources: AudioBufferSourceNode[] = [];
  private onVolumeCallback: ((volume: number) => void) | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;

  constructor(onVolume?: (volume: number) => void) {
    this.onVolumeCallback = onVolume;
  }

  private initAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: 24000 });
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.connect(this.audioCtx.destination);
      this.startVolumeMonitoring();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public playChunk(base64Pcm: string): void {
    if (this.isMuted || !base64Pcm) return;

    try {
      const pcm16 = this.base64ToInt16Array(base64Pcm);
      if (pcm16.length === 0) return;

      const float32 = this.int16ToFloat32Array(pcm16);
      if (float32.length === 0) return;

      const ctx = this.initAudioContext();
      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      if (this.analyser) {
        source.connect(this.analyser);
      } else {
        source.connect(ctx.destination);
      }

      const currentTime = ctx.currentTime;
      if (this.nextStartTime < currentTime) {
        // Add a 60ms jitter buffer cushion when starting a new chunk sequence
        // This prevents buffer underrun stutters on mobile WiFi/Cellular connections
        this.nextStartTime = currentTime + 0.06;
      }

      source.start(this.nextStartTime);
      this.nextStartTime += buffer.duration;

      this.activeSources.push(source);
      this.isPlaying = true;

      source.onended = () => {
        const index = this.activeSources.indexOf(source);
        if (index > -1) {
          this.activeSources.splice(index, 1);
        }
        if (this.activeSources.length === 0) {
          this.isPlaying = false;
        }
      };
    } catch (err) {
      console.error("[AudioPlayer] Error playing audio chunk:", err);
    }
  }

  public stop(): void {
    // Stop all playing and scheduled sources
    this.activeSources.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // ignore
      }
    });
    this.activeSources = [];
    this.isPlaying = false;
    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    }
    if (this.onVolumeCallback) {
      this.onVolumeCallback(0);
    }
  }

  public setMute(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private startVolumeMonitoring(): void {
    if (!this.analyser || !this.onVolumeCallback) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const update = () => {
      if (this.analyser && this.isPlaying) {
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 128);
        this.onVolumeCallback?.(normalized);
      } else {
        this.onVolumeCallback?.(0);
      }
      this.animFrameId = requestAnimationFrame(update);
    };

    update();
  }

  public destroy(): void {
    this.stop();
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  private base64ToInt16Array(base64: string): Int16Array {
    if (!base64) return new Int16Array(0);
    try {
      const binary = atob(base64);
      const len = binary.length - (binary.length % 2);
      if (len <= 0) return new Int16Array(0);
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Int16Array(bytes.buffer, 0, len / 2);
    } catch (e) {
      console.warn("[AudioPlayer] Base64 decoding failed:", e);
      return new Int16Array(0);
    }
  }

  private int16ToFloat32Array(pcm16: Int16Array): Float32Array {
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / (pcm16[i] < 0 ? 32768 : 32767);
    }
    return float32;
  }
}
