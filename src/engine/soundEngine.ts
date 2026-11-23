/**
 * src/engine/soundEngine.ts
 *
 * Procedural & Spatial Web Audio Engine
 * Reverse-engineered & extracted from 06_unseen, 28_cuberto, and 40_otto_objects.
 *
 * Capabilities:
 * 1. Procedural Ambient Room Resonance:
 *    - 2-channel decorrelated binaural pink noise oscillator (Kellet 7-pole 1/f filter)
 *    - Dual-stage architectural biquad lowpass filtering (cutoff: 180Hz, Q: 0.85)
 *    - 65Hz architectural warm room body resonance peaking filter
 *    - Organic sine LFO breathing gain envelope (0.065Hz, ~15.4s cycle)
 *    - Zero external audio file assets (100% synthesized Web Audio API)
 *
 * 2. Micro-Acoustic Interaction Clicks:
 *    - Synthesized resonant sine bursts with fast exponential decay (880Hz -> 440Hz, 0.04s)
 *    - Dual-transient tactile architectural pin clicks (warm sine ping + 2ms highpass impulse)
 *    - Granular micro-hover, navigation impulse, and showroom material acoustics
 *
 * 3. Master Mute/Unmute State Machine:
 *    - Session persistence synced with sessionStorage ('rubiconius_sound_enabled')
 *    - DOM synchronization with .sound-btn, [data-sound-toggle], .showroom-sound
 *    - Dynamic 4-bar equalizer (.sound-bars i) animation state
 *    - Astro ClientRouter / View Transitions lifecycle hooks (astro:page-load, astro:after-swap)
 *    - Visibility-aware background suspension for battery and CPU efficiency
 */

import { prefersReducedMotion } from './env';

export interface SoundClickOptions {
  freqStart?: number;
  freqEnd?: number;
  duration?: number;
  gainPeak?: number;
  type?: OscillatorType;
}

export interface SoundEngineState {
  enabled: boolean;
  contextState: AudioContextState | 'uninitialized';
  ambientActive: boolean;
  ambientWanted: boolean;
  masterVolume: number;
}

export type SoundChangeListener = (enabled: boolean, state: SoundEngineState) => void;

interface AmbientNodeGraph {
  source: AudioBufferSourceNode;
  lowpass: BiquadFilterNode;
  bodyResonance: BiquadFilterNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  gain: GainNode;
  panner?: StereoPannerNode;
}

const STORAGE_KEY = 'rubiconius_sound_enabled';

/**
 * Procedural Binaural Pink Noise Generator (Paul Kellet 7-pole 1/f filter)
 * Synthesizes stereo noise with independent filter instances per channel for authentic
 * spatial room decorrelation and wide binaural diffusion.
 */
function createBinauralPinkNoiseBuffer(ctx: AudioContext, durationSeconds = 4.0): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const numFrames = Math.floor(sampleRate * durationSeconds);
  const buffer = ctx.createBuffer(2, numFrames, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < numFrames; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.76160 * b5 - white * 0.0168980;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      data[i] = pink * 0.11; // calibrated headroom
    }

    // Seamless loop crossfade (2048 frames window)
    const crossfadeFrames = Math.min(2048, Math.floor(numFrames * 0.05));
    for (let i = 0; i < crossfadeFrames; i++) {
      const alpha = i / crossfadeFrames;
      data[i] = data[i] * alpha + data[numFrames - crossfadeFrames + i] * (1 - alpha);
    }
  }

  return buffer;
}

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambient: AmbientNodeGraph | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;

  private enabled = false;
  private ambientWanted = false;
  private masterVolume = 0.7;
  private listeners = new Set<SoundChangeListener>();
  private boundButtons = new WeakSet<HTMLElement>();

  private lastHoverTime = 0;
  private hoverThrottleMs = 60;
  private isDocumentBound = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initPersistence();
      this.initLifecycle();
    }
  }

  // ==========================================
  // Context Management & Autoplay Safe Boot
  // ==========================================

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtxClass) return null;

      try {
        this.ctx = new AudioCtxClass();
      } catch (err) {
        console.warn('[SoundEngine] AudioContext creation failed:', err);
        return null;
      }

      // Master Output Stage
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Ambient Bus Stage
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  private ensureNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.pinkNoiseBuffer && this.pinkNoiseBuffer.sampleRate === ctx.sampleRate) {
      return this.pinkNoiseBuffer;
    }
    this.pinkNoiseBuffer = createBinauralPinkNoiseBuffer(ctx, 4.0);
    return this.pinkNoiseBuffer;
  }

  // ==========================================
  // State Machine & Persistence
  // ==========================================

  private initPersistence() {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved === 'true' && !prefersReducedMotion()) {
        // Flag as enabled; actual AudioContext unlocks on the first user interaction
        this.enabled = true;
      } else {
        this.enabled = false;
      }
    } catch {
      this.enabled = false;
    }
  }

  isEnabled(): boolean {
    return this.enabled && !prefersReducedMotion();
  }

  async enable(): Promise<boolean> {
    if (prefersReducedMotion()) {
      this.disable();
      return false;
    }

    const ctx = this.ensureContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {}
    }

    this.enabled = true;
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch {}

    // Subtle affirmative activation chirp (dual-tone upward sweep 440Hz -> 880Hz)
    this.playActivationChime();

    if (this.ambientWanted) {
      this.bootAmbient();
    }

    this.syncUI();
    this.emit();
    return true;
  }

  disable(): void {
    this.enabled = false;
    try {
      sessionStorage.setItem(STORAGE_KEY, 'false');
    } catch {}

    this.teardownAmbient(false);
    this.syncUI();
    this.emit();
  }

  toggle(): boolean {
    if (this.isEnabled()) {
      this.disable();
      return false;
    } else {
      this.enable();
      return this.isEnabled();
    }
  }

  // ==========================================
  // Procedural Ambient Room Resonance
  // ==========================================

  /**
   * Starts low-frequency binaural pink noise oscillator with biquad lowpass filtering (cutoff: 180Hz)
   * and slow organic gain breathing (0.065Hz LFO).
   */
  startAmbient(): void {
    this.ambientWanted = true;
    if (!this.isEnabled()) return;
    this.bootAmbient();
  }

  stopAmbient(): void {
    this.ambientWanted = false;
    this.teardownAmbient(false);
  }

  private bootAmbient(): void {
    if (this.ambient || !this.isEnabled()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.ambientGain) return;

    const now = ctx.currentTime;
    const noiseBuffer = this.ensureNoiseBuffer(ctx);

    // 1. Stereo Looping Source
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    // 2. Dual-Stage Architectural Filter:
    // Lowpass cutoff at 180Hz (as required by specification)
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(180, now);
    lowpass.Q.setValueAtTime(0.85, now);

    // Warm stone / plaster room body resonance at 65Hz (+3.2dB boost)
    const bodyResonance = ctx.createBiquadFilter();
    bodyResonance.type = 'peaking';
    bodyResonance.frequency.setValueAtTime(65, now);
    bodyResonance.Q.setValueAtTime(1.3, now);
    bodyResonance.gain.setValueAtTime(3.2, now);

    // 3. Ambient Master Gain Node (fades in smoothly over 1.4s)
    const gain = ctx.createGain();
    const baseTargetGain = 0.015;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(baseTargetGain, now + 1.4);

    // 4. Slow Gain Breathing LFO:
    // 0.065Hz sine wave creates a gentle ~15.4 second respiratory swell (+/- 0.0045)
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.065, now);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.0045, now);
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    // 5. Optional Stereo Panner Node for subtle spatial width
    let panner: StereoPannerNode | undefined;
    if (typeof ctx.createStereoPanner === 'function') {
      try {
        panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(0.0, now);
      } catch {}
    }

    // Connect node chain
    source.connect(lowpass);
    lowpass.connect(bodyResonance);
    if (panner) {
      bodyResonance.connect(panner);
      panner.connect(gain);
    } else {
      bodyResonance.connect(gain);
    }
    gain.connect(this.ambientGain);

    source.start(now);
    lfo.start(now);

    this.ambient = {
      source,
      lowpass,
      bodyResonance,
      lfo,
      lfoGain,
      gain,
      panner,
    };
  }

  private teardownAmbient(immediate: boolean): void {
    const amb = this.ambient;
    if (!amb) return;
    this.ambient = null;

    const ctx = this.ctx;
    if (!ctx || immediate) {
      try { amb.source.stop(); } catch {}
      try { amb.lfo.stop(); } catch {}
      try { amb.gain.disconnect(); } catch {}
      return;
    }

    const now = ctx.currentTime;
    try {
      amb.gain.gain.cancelScheduledValues(now);
      const currentVal = Math.max(0.0001, amb.gain.gain.value);
      amb.gain.gain.setValueAtTime(currentVal, now);
      amb.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      setTimeout(() => {
        try { amb.source.stop(); } catch {}
        try { amb.lfo.stop(); } catch {}
        try { amb.gain.disconnect(); } catch {}
      }, 650);
    } catch {
      try { amb.source.stop(); } catch {}
      try { amb.lfo.stop(); } catch {}
    }
  }

  /**
   * Dynamically modulates spatial panner or ambient filter resonance based on 3D coordinates.
   */
  setSpatialCoordinates(x: number, y: number, _z = 0): void {
    if (!this.ambient || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.ambient.panner) {
      // Clamp x between -1.0 (far left) and 1.0 (far right)
      const clampedX = Math.max(-0.85, Math.min(0.85, x));
      this.ambient.panner.pan.setTargetAtTime(clampedX, now, 0.08);
    }
    // Modulate lowpass slightly by vertical height y
    const cutoff = Math.max(120, Math.min(260, 180 + y * 40));
    this.ambient.lowpass.frequency.setTargetAtTime(cutoff, now, 0.08);
  }

  // ==========================================
  // Micro-Acoustic Interaction Clicks
  // ==========================================

  /**
   * Primary micro-acoustic interaction click:
   * Synthesized resonant sine burst with fast exponential decay (880Hz -> 440Hz, duration: 0.04s).
   */
  click(options?: Partial<SoundClickOptions>): void {
    if (!this.isEnabled() || prefersReducedMotion()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const {
      freqStart = 880,
      freqEnd = 440,
      duration = 0.04,
      gainPeak = 0.035,
      type = 'sine',
    } = options || {};

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

    // Fast exponential decay envelope
    gain.gain.setValueAtTime(0.0001, now);
    const attack = Math.min(0.003, duration * 0.1);
    gain.gain.linearRampToValueAtTime(gainPeak, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.005);
  }

  /**
   * Gentle high-register micro-tick on navigation hover.
   * Throttled to prevent acoustic clutter on rapid cursor movement.
   */
  hover(options?: Partial<SoundClickOptions>): void {
    const now = Date.now();
    if (now - this.lastHoverTime < this.hoverThrottleMs) return;
    this.lastHoverTime = now;

    this.click({
      freqStart: 940,
      freqEnd: 520,
      duration: 0.03,
      gainPeak: 0.018,
      ...options,
    });
  }

  /**
   * Affirmative navigation click for page/route transitions.
   */
  navigate(): void {
    this.click({
      freqStart: 760,
      freqEnd: 380,
      duration: 0.048,
      gainPeak: 0.04,
    });
  }

  /**
   * Soft tactile architectural pin click:
   * Warm resonant sine ping + 2ms highpass noise micro-impulse.
   */
  pin(): void {
    if (!this.isEnabled() || prefersReducedMotion()) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    // 1. Resonant Sine Ping (880Hz -> 540Hz)
    this.click({ freqStart: 880, freqEnd: 540, duration: 0.038, gainPeak: 0.03 });

    // 2. Crisp 2ms highpass impulse
    const now = ctx.currentTime;
    const frameCount = Math.max(1, Math.floor(ctx.sampleRate * 0.0025));
    const buf = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    const channelData = buf.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = (Math.random() * 2 - 1) * (1 - i / frameCount);
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(1900, now);

    const impulseGain = ctx.createGain();
    impulseGain.gain.setValueAtTime(0.026, now);
    impulseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

    src.connect(hp);
    hp.connect(impulseGain);
    impulseGain.connect(this.masterGain);

    src.start(now);
    src.stop(now + 0.015);
  }

  /**
   * Tactile material inspector ping for 3D showroom swatches.
   */
  materialPing(frequencyOffset = 0): void {
    this.click({
      freqStart: 640 + frequencyOffset,
      freqEnd: 420 + frequencyOffset * 0.5,
      duration: 0.035,
      gainPeak: 0.025,
    });
  }

  /**
   * Compatibility alias for existing tick() calls throughout the codebase.
   */
  tick(freq = 520, gainPeak = 0.035, duration = 0.045): void {
    if (!this.isEnabled() || prefersReducedMotion()) return;
    this.click({
      freqStart: freq,
      freqEnd: freq * 0.68,
      duration,
      gainPeak,
    });
  }

  /**
   * Dual-tone ascending chord played when sound is explicitly unmuted.
   */
  private playActivationChime(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const chord = [440, 660, 880];
    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + idx * 0.045;
      const stopTime = startTime + 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, stopTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.02, startTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(stopTime);
    });
  }

  // ==========================================
  // UI Synchronization & Page Transitions
  // ==========================================

  /**
   * Synchronizes all .sound-btn and .showroom-sound buttons in the DOM with the state machine.
   */
  syncUI(): void {
    if (typeof document === 'undefined') return;

    const enabled = this.isEnabled();
    const soundButtons = document.querySelectorAll<HTMLElement>(
      '.sound-btn, [data-sound-toggle], .showroom-sound, [data-showroom-sound]'
    );

    soundButtons.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(enabled));
      btn.setAttribute(
        'aria-label',
        enabled ? 'Mute architectural studio sound' : 'Unmute architectural studio sound'
      );
      btn.classList.toggle('is-active', enabled);
      btn.classList.toggle('is-playing', enabled);

      const label = btn.querySelector<HTMLElement>('[data-sound-label]');
      if (label) {
        label.textContent = enabled ? 'Sound on' : 'Sound';
      }
    });
  }

  /**
   * Binds click handlers to sound buttons and attaches delegated hover haptics.
   */
  bindUI(root: ParentNode = document): () => void {
    if (typeof document === 'undefined') return () => {};

    const buttons = root.querySelectorAll<HTMLElement>(
      '.sound-btn, [data-sound-toggle], .showroom-sound, [data-showroom-sound]'
    );

    const clickHandlers: Array<{ element: HTMLElement; handler: (e: Event) => void }> = [];

    buttons.forEach((btn) => {
      if (this.boundButtons.has(btn)) return;
      this.boundButtons.add(btn);

      const handler = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      };

      btn.addEventListener('click', handler);
      clickHandlers.push({ element: btn, handler });
    });

    this.syncUI();

    return () => {
      clickHandlers.forEach(({ element, handler }) => {
        element.removeEventListener('click', handler);
        this.boundButtons.delete(element);
      });
    };
  }

  /**
   * Sets up global document-level delegated micro-sound listeners and Astro lifecycle hooks.
   */
  private initLifecycle(): void {
    if (this.isDocumentBound || typeof document === 'undefined') return;
    this.isDocumentBound = true;

    // Delegated click for newly swapped buttons
    document.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement)?.closest?.(
        '.sound-btn, [data-sound-toggle], .showroom-sound, [data-showroom-sound]'
      );
      if (target) {
        e.preventDefault();
        this.toggle();
      }
    });

    // Delegated micro-hover for links and interactive buttons
    document.addEventListener(
      'pointerenter',
      (e) => {
        const target = (e.target as HTMLElement)?.closest?.(
          'a[href], button:not(.sound-btn), [data-sound-hover], .arch-link, .otto-header__link'
        );
        if (target && this.isEnabled()) {
          this.hover();
        }
      },
      { passive: true, capture: true }
    );

    // Astro ClientRouter View Transitions lifecycle
    const onPageSwap = () => {
      this.syncUI();
      if (this.isEnabled() && this.ambientWanted && !this.ambient) {
        this.bootAmbient();
      }
    };

    document.addEventListener('astro:page-load', onPageSwap);
    document.addEventListener('astro:after-swap', onPageSwap);
    document.addEventListener('DOMContentLoaded', onPageSwap);

    // Tab visibility handling: pause/dim ambient when backgrounded
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.ambient && this.ctx && this.ambientGain) {
          const now = this.ctx.currentTime;
          this.ambientGain.gain.setTargetAtTime(0.0001, now, 0.1);
        }
      } else {
        if (this.ambient && this.ctx && this.ambientGain && this.isEnabled()) {
          const now = this.ctx.currentTime;
          this.ambientGain.gain.setTargetAtTime(1.0, now, 0.2);
        }
      }
    });
  }

  // ==========================================
  // Event Subscription & Debug API
  // ==========================================

  onChange(listener: SoundChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const state = this.getDebugState();
    const enabled = this.isEnabled();
    this.listeners.forEach((listener) => {
      try {
        listener(enabled, state);
      } catch (err) {
        console.error('[SoundEngine] Listener callback error:', err);
      }
    });
  }

  getDebugState(): SoundEngineState {
    return {
      enabled: this.isEnabled(),
      contextState: this.ctx?.state ?? 'uninitialized',
      ambientActive: this.ambient !== null,
      ambientWanted: this.ambientWanted,
      masterVolume: this.masterVolume,
    };
  }
}

// Global Singleton Export
export const soundEngine = new SoundEngine();

// Drop-in compatibility alias for existing modules
export const studioAudio = soundEngine;
