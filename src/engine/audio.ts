// Zero-byte Web Audio API studio acoustics & micro-haptics synthesizer. Opt-in only, unlocked on user gesture.
import { prefersReducedMotion } from './env';

type AmbientNodes = {
  src: AudioBufferSourceNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  master: GainNode;
};

class StudioAudio {
  private ctx: AudioContext | null = null;
  private enabled = false;
  private ambientWanted = false;
  private ambient: AmbientNodes | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private listeners = new Set<(enabled: boolean) => void>();

  isEnabled() {
    return this.enabled && !prefersReducedMotion();
  }

  onChange(fn: (enabled: boolean) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    const state = this.isEnabled();
    this.listeners.forEach((fn) => fn(state));
  }

  private ensureContext(): AudioContext | null {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!this.ctx) this.ctx = new Ctx();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private ensureBrownNoise(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const len = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  toggle(): boolean {
    if (prefersReducedMotion()) {
      this.enabled = false;
      this.teardownAmbient(true);
      this.emit();
      return false;
    }
    if (!this.enabled) {
      this.ensureContext();
      this.enabled = true;
      this.tick(640, 0.045);
      if (this.ambientWanted) this.bootAmbient();
    } else {
      this.enabled = false;
      this.teardownAmbient(false);
    }
    this.emit();
    return this.enabled;
  }

  tick(freq = 520, gainPeak = 0.035) {
    if (!this.enabled || !this.ctx || prefersReducedMotion()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.68, now + 0.045);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Soft tactile architectural pin click: warm sine ping + 2ms crisp highpass impulse
  pin() {
    if (!this.enabled || !this.ctx || prefersReducedMotion()) return;
    this.tick(880, 0.03);
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * 0.0025));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.028, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);
    src.connect(hp);
    hp.connect(g);
    g.connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.015);
  }

  // Subtle architectural room tone: brown noise -> lowpass 220Hz -> peaking 120Hz + 0.07Hz LFO
  startAmbient() {
    this.ambientWanted = true;
    if (!this.enabled || prefersReducedMotion()) return;
    this.bootAmbient();
  }

  stopAmbient() {
    this.ambientWanted = false;
    this.teardownAmbient(false);
  }

  private bootAmbient() {
    if (this.ambient || prefersReducedMotion()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.ensureBrownNoise(ctx);
    src.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 220;
    lowpass.Q.value = 0.7;

    const body = ctx.createBiquadFilter();
    body.type = 'peaking';
    body.frequency.value = 120;
    body.Q.value = 1.4;
    body.gain.value = 4.5;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(0.012, now + 1.2);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.003;
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);

    src.connect(lowpass);
    lowpass.connect(body);
    body.connect(master);
    master.connect(ctx.destination);

    src.start(now);
    lfo.start(now);
    this.ambient = { src, lfo, lfoGain, master };
  }

  private teardownAmbient(immediate: boolean) {
    const amb = this.ambient;
    if (!amb) return;
    this.ambient = null;
    const ctx = this.ctx;
    if (!ctx || immediate) {
      try { amb.src.stop(); } catch {}
      try { amb.lfo.stop(); } catch {}
      try { amb.master.disconnect(); } catch {}
      return;
    }
    const now = ctx.currentTime;
    try {
      amb.master.gain.cancelScheduledValues(now);
      amb.master.gain.setValueAtTime(Math.max(0.0001, amb.master.gain.value), now);
      amb.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      setTimeout(() => {
        try { amb.src.stop(); } catch {}
        try { amb.lfo.stop(); } catch {}
        try { amb.master.disconnect(); } catch {}
      }, 650);
    } catch {}
  }

  // Diagnostic state for automated QA checks
  getDebugState() {
    return {
      enabled: this.enabled,
      contextState: this.ctx?.state ?? 'uninitialized',
      ambientActive: this.ambient !== null,
      ambientWanted: this.ambientWanted,
    };
  }
}

export const studioAudio = new StudioAudio();
