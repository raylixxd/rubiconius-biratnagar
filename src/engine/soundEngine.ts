// Architectural Sound Engine adapter & acoustic transient synthesizer
import { studioAudio } from './audio';
import { prefersReducedMotion } from './env';

class SoundEngine {
  public ctx: AudioContext | null = null;
  public masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!this.ctx) {
      try {
        this.ctx = new Ctx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 128;
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  getAnalyser(): AnalyserNode | null {
    this.ensureContext();
    return this.analyser;
  }

  pin(): void {
    if (prefersReducedMotion() || !studioAudio.isEnabled()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(840, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  click(): void {
    if (prefersReducedMotion() || !studioAudio.isEnabled()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }

  setSpatialCoordinates(_x: number, _y: number): void {
    // Spatial positioning hook
  }
}

export const soundEngine = new SoundEngine();
