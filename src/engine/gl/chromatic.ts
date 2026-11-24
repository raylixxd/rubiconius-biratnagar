/**
 * Fullscreen Multi-Sample Chromatic Aberration & Procedural Film Grain Pass
 * Extracted and reverse-engineered from Unseen Studio (06_unseen) and Basement Studio (26_basement).
 *
 * Visual Mechanics:
 * 1. 5-sample spectral RGB offset decomposed along radial barrel distortion vectors (FabriceNeyret / Unseen formula).
 * 2. Procedural 35mm film grain synthesized via Jimenez interleaved gradient / hash12 noise generator.
 * 3. Soft radial vignette softening screen edges.
 * 4. Dynamic intensity coupled to scroll velocity (Basement Studio velocity ripping + snap-back elasticity).
 * 5. Fullscreen WebGL quad rendering pass with complete OGL and standalone fallback safety.
 */

import {
  Mesh,
  Program,
  Triangle,
  Vec2,
  type Renderer,
  type Texture,
  type RenderTarget,
  type OGLRenderingContext,
} from 'ogl';
import { getGLContext, registerGLHook, glSupported } from './index';
import { prefersReducedMotion, getQualityTier, isTouch, isMobile } from '../env';
import { scrollState } from '../scroll';

export interface ChromaticAberrationOptions {
  /** Base radial barrel bend amount (Unseen baseline: -0.15) */
  bendAmount?: number;
  /** Maximum distortion multiplier (Unseen baseline: 0.40) */
  maxDistort?: number;
  /** Soft radial vignette power (Unseen baseline: 0.05, 0 = off) */
  vignetteStrength?: number;
  /** Procedural film grain amplitude (0.0 to 0.15, baseline: 0.045) */
  grainIntensity?: number;
  /** Sensitivity multiplier for scroll velocity chromatic ripping (Basement baseline: 1.0) */
  velocitySensitivity?: number;
  /** Noise-only bypass flag (1.0 = bypass chromatic aberration, apply grain only) */
  noiseOnly?: number;
  /** Master enable toggle */
  enabled?: boolean;
}

export interface ChromaticPassState {
  enabled: boolean;
  velocity: number;
  bendAmount: number;
  maxDistort: number;
  vignetteStrength: number;
  grainIntensity: number;
  noiseOnly: number;
}

export const CHROMATIC_VERT = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const CHROMATIC_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uNoiseOnly;
uniform float uMaxDistort;
uniform float uBendAmount;
uniform float uVignetteStrength;
uniform float uGrainIntensity;
uniform float uScrollVelocity;
uniform vec2 uResolution;

varying vec2 vUv;

const int iterations = 5;

// Radial barrel distortion along screen-centered coordinates (Unseen 06_unseen formula)
vec2 barrelDistortion(vec2 coord, float amt) {
  vec2 cc = coord - 0.5;
  float dist = dot(cc, cc);
  return coord + cc * dist * amt;
}

float sat(float t) {
  return clamp(t, 0.0, 1.0);
}

float linterp(float t) {
  return sat(1.0 - abs(2.0 * t - 1.0));
}

float remap(float t, float a, float b) {
  return sat((t - a) / (b - a));
}

// 5-sample spectral RGB offset distribution curve
vec4 spectrum_offset(float t) {
  float lo = step(t, 0.5);
  float hi = 1.0 - lo;
  float w = linterp(remap(t, 1.0 / 6.0, 5.0 / 6.0));
  vec4 ret = vec4(lo, 1.0, hi, 1.0) * vec4(1.0 - w, w, 1.0 - w, 1.0);
  return pow(ret, vec4(1.0 / 2.2));
}

// Procedural 35mm film grain hash (Jimenez interleaved + hash12 hybrid)
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  // 1. Procedural micro-crystalline film grain
  float grainNoise = hash12(gl_FragCoord.xy + fract(uTime * 1.6180339887));
  vec4 grain = vec4(vec3(grainNoise - 0.5), 0.0) * uGrainIntensity;

  vec4 baseColor = texture2D(tDiffuse, vUv);

  // Fast-path bypass when noiseOnly is active
  if (uNoiseOnly >= 1.0) {
    gl_FragColor = baseColor + grain;
    return;
  }

  // 2. Dynamic scroll velocity modulation (Basement Studio velocity ripping)
  float velFactor = clamp(abs(uScrollVelocity) * 0.042, 0.0, 2.2);
  float dynamicBend = uBendAmount * (1.0 + velFactor * 2.4);
  float dynamicDistort = uMaxDistort * (1.0 + velFactor * 1.85);

  // 3. Multi-sample spectral chromatic aberration pass (5 iterations)
  vec4 sumcol = vec4(0.0);
  vec4 sumw = vec4(0.0);
  const float reci_num_iter_f = 1.0 / float(iterations);

  for (int i = 0; i < iterations; i++) {
    float t = float(i) * reci_num_iter_f;
    vec4 w = spectrum_offset(t);
    sumw += w;
    vec2 distortedUv = barrelDistortion(vUv, dynamicBend * dynamicDistort * t);
    sumcol += w * texture2D(tDiffuse, distortedUv);
  }

  vec4 filtered = sumcol / max(sumw, vec4(0.0001));

  // 4. Soft radial vignette
  vec2 uvVig = vUv * (1.0 - vUv.yx);
  float vig = uvVig.x * uvVig.y * 20.0;
  vig = clamp(pow(max(0.0001, vig), max(0.001, uVignetteStrength)), 0.0, 1.0);

  vec4 screenFx = mix(vec4(0.0, 0.0, 0.0, 1.0), filtered, vig);

  // 5. Output composition: Chromatic screenFx + procedural film grain
  vec4 finalColor = mix(screenFx, baseColor, clamp(uNoiseOnly, 0.0, 1.0)) + grain;
  gl_FragColor = vec4(clamp(finalColor.rgb, 0.0, 1.0), finalColor.a);
}
`;

export class ChromaticAberrationPass {
  public gl: OGLRenderingContext;
  public geometry: Triangle;
  public program: Program;
  public mesh: Mesh;
  public enabled: boolean = true;
  public options: Required<ChromaticAberrationOptions>;

  private currentVelocity: number = 0;
  private targetVelocity: number = 0;
  private width: number = 1;
  private height: number = 1;
  private isDestroyed: boolean = false;

  constructor(
    gl: OGLRenderingContext,
    options: ChromaticAberrationOptions = {}
  ) {
    this.gl = gl;
    this.options = {
      bendAmount: options.bendAmount ?? -0.15,
      maxDistort: options.maxDistort ?? 0.4,
      vignetteStrength: options.vignetteStrength ?? 0.05,
      grainIntensity: options.grainIntensity ?? 0.045,
      velocitySensitivity: options.velocitySensitivity ?? 1.0,
      noiseOnly: options.noiseOnly ?? 0.0,
      enabled: options.enabled ?? true,
    };
    this.enabled = this.options.enabled;

    this.geometry = new Triangle(gl);
    this.program = new Program(gl, {
      vertex: CHROMATIC_VERT,
      fragment: CHROMATIC_FRAG,
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uNoiseOnly: { value: this.options.noiseOnly },
        uMaxDistort: { value: this.options.maxDistort },
        uBendAmount: { value: this.options.bendAmount },
        uVignetteStrength: { value: this.options.vignetteStrength },
        uGrainIntensity: { value: this.options.grainIntensity },
        uScrollVelocity: { value: 0 },
        uResolution: { value: new Vec2(window.innerWidth || 1, window.innerHeight || 1) },
      },
      depthTest: false,
      depthWrite: false,
      transparent: false,
    });

    this.mesh = new Mesh(gl, {
      geometry: this.geometry,
      program: this.program,
    });

    this.resize(window.innerWidth || 1, window.innerHeight || 1);
  }

  public resize(width: number, height: number): void {
    if (this.isDestroyed) return;
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    if (this.program.uniforms.uResolution?.value) {
      (this.program.uniforms.uResolution.value as Vec2).set(this.width, this.height);
    }
  }

  public setScrollVelocity(velocity: number): void {
    this.targetVelocity = velocity * this.options.velocitySensitivity;
  }

  public update(time: number, velocity?: number): void {
    if (this.isDestroyed || !this.enabled) return;

    if (velocity !== undefined) {
      this.targetVelocity = velocity * this.options.velocitySensitivity;
    }

    // Exponential spring damping: snappy expansion, smooth elastic rest
    this.currentVelocity += (this.targetVelocity - this.currentVelocity) * 0.16;
    this.currentVelocity *= 0.90;
    this.targetVelocity *= 0.88;
    if (Math.abs(this.currentVelocity) < 0.0001) this.currentVelocity = 0;

    const u = this.program.uniforms;
    if (u.uTime) u.uTime.value = time;
    if (u.uScrollVelocity) u.uScrollVelocity.value = this.currentVelocity;
  }

  public setConfig(options: Partial<ChromaticAberrationOptions>): void {
    if (this.isDestroyed) return;
    Object.assign(this.options, options);
    if (options.enabled !== undefined) this.enabled = options.enabled;

    const u = this.program.uniforms;
    if (options.bendAmount !== undefined && u.uBendAmount) {
      u.uBendAmount.value = options.bendAmount;
    }
    if (options.maxDistort !== undefined && u.uMaxDistort) {
      u.uMaxDistort.value = options.maxDistort;
    }
    if (options.vignetteStrength !== undefined && u.uVignetteStrength) {
      u.uVignetteStrength.value = options.vignetteStrength;
    }
    if (options.grainIntensity !== undefined && u.uGrainIntensity) {
      u.uGrainIntensity.value = options.grainIntensity;
    }
    if (options.noiseOnly !== undefined && u.uNoiseOnly) {
      u.uNoiseOnly.value = options.noiseOnly;
    }
  }

  public getState(): ChromaticPassState {
    return {
      enabled: this.enabled,
      velocity: this.currentVelocity,
      bendAmount: this.options.bendAmount,
      maxDistort: this.options.maxDistort,
      vignetteStrength: this.options.vignetteStrength,
      grainIntensity: this.options.grainIntensity,
      noiseOnly: this.options.noiseOnly,
    };
  }

  public render(
    renderer: Renderer,
    readTexture: Texture,
    target: RenderTarget | null = null
  ): void {
    if (this.isDestroyed || !this.enabled) return;
    this.program.uniforms.tDiffuse.value = readTexture;
    renderer.render({
      scene: this.mesh,
      target: target ?? undefined,
      clear: false,
    });
  }

  public dispose(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    try {
      this.program?.remove?.();
      this.geometry?.remove?.();
    } catch {}
  }
}

let activePass: ChromaticAberrationPass | null = null;
let unhookGL: (() => void) | null = null;
let resizeHandler: (() => void) | null = null;

export function isChromaticSupported(): boolean {
  if (prefersReducedMotion()) return false;
  if (isTouch() || isMobile()) {
    // Only enabled on capable devices, bypass low-power handsets
    return getQualityTier() === 'high';
  }
  return glSupported();
}

export function createChromaticPass(
  gl: OGLRenderingContext,
  options: ChromaticAberrationOptions = {}
): ChromaticAberrationPass {
  return new ChromaticAberrationPass(gl, options);
}

export function mountChromaticAberration(
  options: ChromaticAberrationOptions = {}
): () => void {
  unmountChromaticAberration();

  if (!isChromaticSupported()) {
    return () => {};
  }

  const ctx = getGLContext(true);
  if (!ctx) return () => {};

  activePass = new ChromaticAberrationPass(ctx.gl, options);

  resizeHandler = () => {
    activePass?.resize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', resizeHandler, { passive: true });

  unhookGL = registerGLHook((t: number, _vw: number, _vh: number) => {
    if (!activePass || !activePass.enabled) return false;
    const scroll = scrollState();
    activePass.update(t, scroll.velocity);
    return false;
  });

  return unmountChromaticAberration;
}

export function unmountChromaticAberration(): void {
  unhookGL?.();
  unhookGL = null;
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  activePass?.dispose();
  activePass = null;
}

export function setChromaticVelocity(vel: number): void {
  activePass?.setScrollVelocity(vel);
}

export function setChromaticConfig(config: Partial<ChromaticAberrationOptions>): void {
  activePass?.setConfig(config);
}

export function getChromaticState(): ChromaticPassState | null {
  return activePass ? activePass.getState() : null;
}
