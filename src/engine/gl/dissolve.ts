/**
 * Bronze Seam Edge Dissolve Shader Pass
 * Extracted and reverse-engineered from Unseen Studio (06_unseen) and Basement Studio (26_basement).
 *
 * Visual Mechanics:
 * 1. Simplex noise-ragged frontier simulating torn handmade fibrous plaster / molten metal edges.
 * 2. Exponential rim glow along the tear boundary with architectural bronze (#A77C4D) and brass highlight.
 * 3. Strict sin(progress * PI) envelope guaranteeing 0-alpha / zero-distortion at boundaries (progress = 0 or 1).
 * 4. Dusk-mode color mixing between Obsidian hero (#050505) and Travertine/Plaster (#EFECE6 / #161513).
 * 5. Complete WebGL quad rendering pass for route transitions with graceful reduced-motion fallbacks.
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
import { gsap } from 'gsap';
import { getGLContext, getGLDusk, registerGLHook, glSupported } from './index';
import { prefersReducedMotion, getQualityTier, isTouch, isMobile } from '../env';

export type DissolveDirection = 'top-to-bottom' | 'bottom-to-top' | 'left-to-right' | 'diagonal';

export interface DissolvePassOptions {
  /** Spatial frequency of the ragged noise tearing edge (default: 4.5) */
  noiseFrequency?: number;
  /** Amplitude of the ragged frontier edge distortion (default: 0.18) */
  raggedness?: number;
  /** Width of the glowing exponential boundary rim (default: 0.045) */
  rimWidth?: number;
  /** Multiplier for the luminous bronze rim glow intensity (default: 1.45) */
  rimIntensity?: number;
  /** Anti-aliased transition edge softness (default: 0.02) */
  edgeSmooth?: number;
  /** Direction angle of the tearing plane (0 = horizontal, 1 = diagonal) */
  directionAngle?: number;
  /** Direction mode preset */
  direction?: DissolveDirection;
  /** Initial dusk mode factor (0 = day #EFECE6, 1 = dusk #161513) */
  dusk?: number;
  /** Base bronze tint vector (default: [0.655, 0.486, 0.302] for #A77C4D) */
  bronzeTint?: [number, number, number];
}

export interface RouteDissolveConfig {
  /** Source route identifier / label */
  fromRoute?: string;
  /** Target route identifier / label */
  toRoute?: string;
  /** Duration of the dissolve transition in seconds (default: 1.25) */
  duration?: number;
  /** GSAP easing formula (default: 'power2.inOut') */
  ease?: string;
  /** Direction mode for this transition */
  direction?: DissolveDirection;
  /** Optional callback fired per frame with normalized progress [0, 1] */
  onUpdate?: (progress: number) => void;
  /** Optional completion callback */
  onComplete?: () => void;
}

export interface DissolvePassState {
  progress: number;
  active: boolean;
  dusk: number;
  noiseFrequency: number;
  raggedness: number;
  rimWidth: number;
  rimIntensity: number;
}

export const DISSOLVE_VERT = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const DISSOLVE_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D tSource;
uniform sampler2D tTarget;
uniform float uHasSource;
uniform float uHasTarget;

uniform float uProgress;
uniform float uTime;
uniform float uDusk;
uniform float uNoiseFrequency;
uniform float uRaggedness;
uniform float uRimWidth;
uniform float uRimIntensity;
uniform float uEdgeSmooth;
uniform float uDirectionAngle;
uniform float uInvertDirection;
uniform vec3 uBronzeTint;
uniform vec2 uResolution;

varying vec2 vUv;

// Compact Ashima / Stefan Gustavson Simplex 2D Noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187,  // (3.0 - sqrt(3.0)) / 6.0
    0.366025403784439,  // 0.5 * (sqrt(3.0) - 1.0)
   -0.577350269189626,  // -1.0 + 2.0 * C.x
    0.024390243902439   // 1.0 / 41.0
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  // Boundary safety fast-path
  if (uProgress <= 0.001) {
    if (uHasSource > 0.5) {
      gl_FragColor = texture2D(tSource, vUv);
    } else {
      gl_FragColor = vec4(0.02, 0.02, 0.02, 0.0);
    }
    return;
  }
  if (uProgress >= 0.999) {
    if (uHasTarget > 0.5) {
      gl_FragColor = texture2D(tTarget, vUv);
    } else {
      vec3 plaster = mix(vec3(0.937, 0.925, 0.902), vec3(0.086, 0.082, 0.075), clamp(uDusk, 0.0, 1.0));
      gl_FragColor = vec4(plaster, 1.0);
    }
    return;
  }

  // 1. Directional sweep coordinate
  float aspect = uResolution.x / max(1.0, uResolution.y);
  vec2 scaledUv = vec2(vUv.x * aspect, vUv.y);

  float coord = mix(vUv.y, mix(vUv.x, (vUv.x * 0.42 + vUv.y * 0.58), uDirectionAngle), step(0.5, uDirectionAngle));
  if (uInvertDirection > 0.5) coord = 1.0 - coord;

  // 2. Multi-octave Simplex noise for ragged stone/molten frontier
  vec2 noiseCoord = scaledUv * uNoiseFrequency;
  float n1 = snoise(noiseCoord + vec2(uTime * 0.04, uProgress * 0.2));
  float n2 = snoise(noiseCoord * 2.24 - vec2(0.0, uTime * 0.07));
  float raggedNoise = n1 * 0.72 + n2 * 0.28;

  // 3. Mathematical envelope: sin(progress * PI)
  float envelope = sin(clamp(uProgress, 0.0, 1.0) * 3.14159265);

  // 4. Ragged frontier boundary calculation
  float frontier = 1.0 - uProgress;
  float raggedFrontier = frontier + (raggedNoise * uRaggedness) * envelope;
  float edgeDist = coord - raggedFrontier;

  // 5. Exponential rim glow: exp(-abs(edge) / rimWidth) * sin(progress * PI)
  float rimWidth = max(0.001, uRimWidth);
  float rim = exp(-abs(edgeDist) / rimWidth) * envelope;
  float coreGlow = exp(-abs(edgeDist) / (rimWidth * 0.30)) * envelope;

  // Bronze & Molten Brass incandescent tones
  vec3 brassHighlight = vec3(0.96, 0.84, 0.56); // Molten atelier brass
  vec3 rimColor = mix(uBronzeTint, brassHighlight, clamp(coreGlow, 0.0, 1.0)) * (1.0 + coreGlow * 1.6);

  // 6. Dusk-mode color mixing: Obsidian #050505 vs Plaster #EFECE6 / #161513
  vec3 topObsidian = vec3(0.02, 0.02, 0.02);
  vec3 warmPlaster = vec3(0.937, 0.925, 0.902); // #EFECE6
  vec3 darkPlaster = vec3(0.086, 0.082, 0.075); // #161513
  vec3 plasterBase = mix(warmPlaster, darkPlaster, clamp(uDusk, 0.0, 1.0));

  vec4 colSource = uHasSource > 0.5 ? texture2D(tSource, vUv) : vec4(topObsidian, 1.0);
  vec4 colTarget = uHasTarget > 0.5 ? texture2D(tTarget, vUv) : vec4(plasterBase, 1.0);

  // 7. Edge blend step & composite
  float blend = smoothstep(-uEdgeSmooth, uEdgeSmooth, edgeDist);
  vec3 baseColor = mix(colTarget.rgb, colSource.rgb, blend);

  // Apply bronze incandescent rim glow
  vec3 finalColor = mix(baseColor, rimColor, clamp(rim * uRimIntensity, 0.0, 1.0));
  float finalAlpha = mix(colTarget.a, colSource.a, blend);

  // When overlaying, ensure alpha envelope hugs transition
  float overlayAlpha = clamp(finalAlpha + rim * envelope, 0.0, 1.0);

  gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), overlayAlpha);
}
`;

export class BronzeDissolvePass {
  public gl: OGLRenderingContext;
  public geometry: Triangle;
  public program: Program;
  public mesh: Mesh;
  public options: Required<DissolvePassOptions>;

  private progress: number = 0;
  private dusk: number = 0;
  private width: number = 1;
  private height: number = 1;
  private isDestroyed: boolean = false;
  private activeTween: gsap.core.Tween | null = null;

  constructor(
    gl: OGLRenderingContext,
    options: DissolvePassOptions = {}
  ) {
    this.gl = gl;
    this.options = {
      noiseFrequency: options.noiseFrequency ?? 4.5,
      raggedness: options.raggedness ?? 0.18,
      rimWidth: options.rimWidth ?? 0.045,
      rimIntensity: options.rimIntensity ?? 1.45,
      edgeSmooth: options.edgeSmooth ?? 0.02,
      directionAngle: options.directionAngle ?? 0.0,
      direction: options.direction ?? 'top-to-bottom',
      dusk: options.dusk ?? getGLDusk(),
      bronzeTint: options.bronzeTint ?? [0.655, 0.486, 0.302],
    };
    this.dusk = this.options.dusk;

    this.geometry = new Triangle(gl);
    this.program = new Program(gl, {
      vertex: DISSOLVE_VERT,
      fragment: DISSOLVE_FRAG,
      uniforms: {
        tSource: { value: null },
        tTarget: { value: null },
        uHasSource: { value: 0 },
        uHasTarget: { value: 0 },
        uProgress: { value: 0 },
        uTime: { value: 0 },
        uDusk: { value: this.dusk },
        uNoiseFrequency: { value: this.options.noiseFrequency },
        uRaggedness: { value: this.options.raggedness },
        uRimWidth: { value: this.options.rimWidth },
        uRimIntensity: { value: this.options.rimIntensity },
        uEdgeSmooth: { value: this.options.edgeSmooth },
        uDirectionAngle: { value: this.getAngleForDirection(this.options.direction) },
        uInvertDirection: { value: this.getInvertForDirection(this.options.direction) },
        uBronzeTint: { value: this.options.bronzeTint },
        uResolution: { value: new Vec2(window.innerWidth || 1, window.innerHeight || 1) },
      },
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });

    this.mesh = new Mesh(gl, {
      geometry: this.geometry,
      program: this.program,
    });

    this.resize(window.innerWidth || 1, window.innerHeight || 1);
  }

  private getAngleForDirection(dir: DissolveDirection): number {
    switch (dir) {
      case 'left-to-right':
        return 0.5;
      case 'diagonal':
        return 1.0;
      case 'bottom-to-top':
      case 'top-to-bottom':
      default:
        return 0.0;
    }
  }

  private getInvertForDirection(dir: DissolveDirection): number {
    return dir === 'bottom-to-top' ? 1.0 : 0.0;
  }

  public resize(width: number, height: number): void {
    if (this.isDestroyed) return;
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    if (this.program.uniforms.uResolution?.value) {
      (this.program.uniforms.uResolution.value as Vec2).set(this.width, this.height);
    }
  }

  public setProgress(progress: number): void {
    if (this.isDestroyed) return;
    this.progress = Math.min(1, Math.max(0, progress));
    if (this.program.uniforms.uProgress) {
      this.program.uniforms.uProgress.value = this.progress;
    }
  }

  public setDusk(dusk: number): void {
    if (this.isDestroyed) return;
    this.dusk = Math.min(1, Math.max(0, dusk));
    if (this.program.uniforms.uDusk) {
      this.program.uniforms.uDusk.value = this.dusk;
    }
  }

  public setDirection(direction: DissolveDirection): void {
    if (this.isDestroyed) return;
    const u = this.program.uniforms;
    if (u.uDirectionAngle) u.uDirectionAngle.value = this.getAngleForDirection(direction);
    if (u.uInvertDirection) u.uInvertDirection.value = this.getInvertForDirection(direction);
  }

  public setSourceTexture(texture: Texture | null): void {
    if (this.isDestroyed) return;
    this.program.uniforms.tSource.value = texture;
    this.program.uniforms.uHasSource.value = texture ? 1.0 : 0.0;
  }

  public setTargetTexture(texture: Texture | null): void {
    if (this.isDestroyed) return;
    this.program.uniforms.tTarget.value = texture;
    this.program.uniforms.uHasTarget.value = texture ? 1.0 : 0.0;
  }

  public updateTime(time: number): void {
    if (this.isDestroyed) return;
    if (this.program.uniforms.uTime) {
      this.program.uniforms.uTime.value = time;
    }
  }

  public transition(config: RouteDissolveConfig = {}): Promise<void> {
    if (this.isDestroyed) return Promise.resolve();

    const duration = config.duration ?? 1.25;
    const ease = config.ease ?? 'power2.inOut';

    if (config.direction) {
      this.setDirection(config.direction);
    }

    if (prefersReducedMotion()) {
      this.setProgress(1);
      config.onUpdate?.(1);
      config.onComplete?.();
      return Promise.resolve();
    }

    this.activeTween?.kill();

    return new Promise((resolve) => {
      this.setProgress(0);
      this.activeTween = gsap.to(this.program.uniforms.uProgress, {
        value: 1,
        duration,
        ease,
        onUpdate: () => {
          this.progress = this.program.uniforms.uProgress.value as number;
          config.onUpdate?.(this.progress);
        },
        onComplete: () => {
          this.activeTween = null;
          this.setProgress(1);
          config.onComplete?.();
          resolve();
        },
      });
    });
  }

  public cancel(): void {
    this.activeTween?.kill();
    this.activeTween = null;
    this.setProgress(0);
  }

  public getState(): DissolvePassState {
    return {
      progress: this.progress,
      active: this.progress > 0.001 && this.progress < 0.999,
      dusk: this.dusk,
      noiseFrequency: this.options.noiseFrequency,
      raggedness: this.options.raggedness,
      rimWidth: this.options.rimWidth,
      rimIntensity: this.options.rimIntensity,
    };
  }

  public render(
    renderer: Renderer,
    target: RenderTarget | null = null
  ): boolean {
    if (this.isDestroyed) return false;
    if (this.progress <= 0.001 || this.progress >= 0.999) return false;

    renderer.render({
      scene: this.mesh,
      target: target ?? undefined,
      clear: false,
    });
    return true;
  }

  public dispose(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.activeTween?.kill();
    this.activeTween = null;
    try {
      this.program?.remove?.();
      this.geometry?.remove?.();
    } catch {}
  }
}

let activeDissolvePass: BronzeDissolvePass | null = null;
let unhookDissolveGL: (() => void) | null = null;
let dissolveResizeHandler: (() => void) | null = null;

export function isDissolveSupported(): boolean {
  if (prefersReducedMotion()) return false;
  if (isTouch() || isMobile()) {
    return getQualityTier() !== 'low';
  }
  return glSupported();
}

export function createDissolvePass(
  gl: OGLRenderingContext,
  options: DissolvePassOptions = {}
): BronzeDissolvePass {
  return new BronzeDissolvePass(gl, options);
}

export function mountDissolvePass(
  options: DissolvePassOptions = {}
): () => void {
  unmountDissolvePass();

  if (!isDissolveSupported()) {
    return () => {};
  }

  const ctx = getGLContext(true);
  if (!ctx) return () => {};

  activeDissolvePass = new BronzeDissolvePass(ctx.gl, options);

  dissolveResizeHandler = () => {
    activeDissolvePass?.resize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', dissolveResizeHandler, { passive: true });

  unhookDissolveGL = registerGLHook((t: number, _vw: number, _vh: number) => {
    if (!activeDissolvePass) return false;
    activeDissolvePass.updateTime(t);
    activeDissolvePass.setDusk(getGLDusk());
    const state = activeDissolvePass.getState();
    return state.active;
  });

  return unmountDissolvePass;
}

export function unmountDissolvePass(): void {
  unhookDissolveGL?.();
  unhookDissolveGL = null;
  if (dissolveResizeHandler) {
    window.removeEventListener('resize', dissolveResizeHandler);
    dissolveResizeHandler = null;
  }
  activeDissolvePass?.dispose();
  activeDissolvePass = null;
}

export function triggerRouteDissolve(
  config: RouteDissolveConfig = {}
): Promise<void> {
  if (!activeDissolvePass) {
    mountDissolvePass();
  }
  if (!activeDissolvePass) {
    return Promise.resolve();
  }
  return activeDissolvePass.transition(config);
}

export function setDissolveProgress(progress: number): void {
  activeDissolvePass?.setProgress(progress);
}

export function getDissolveState(): DissolvePassState | null {
  return activeDissolvePass ? activeDissolvePass.getState() : null;
}
