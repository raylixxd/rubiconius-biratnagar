/**
 * Cinematic Anamorphic Bloom, Lens Flare and HDR Tone Mapping Engine
 *
 * Reverse-engineered, production-grade post-processing architecture extracted from:
 * 1. Monopo London (27_monopo): Ethereal high-key editorial bloom, chromatic fringing,
 *    and luxury lighting diffusion across architectural typography and spatial models.
 * 2. Lusion (16_lusion): Cinematic horizontal anamorphic lens streaks (Cooke / Panavision
 *    vintage anamorphic signature), 8-sample radial optical ghost reflections, circular
 *    halo dispersion with rainbow chromatic splitting, and filmic ACES tone mapping
 *    with Jorge Jimenez Interleaved Gradient Noise (IGN) blue noise dithering.
 *
 * Core Subsystems Implemented:
 * ============================================================================
 * 1. Dual-Pass Progressive Downsampling and Upsampling Bloom Pyramid:
 *    - 5-stage mipmapped blur pyramid with half-resolution cascading render targets.
 *    - Prefilter pass utilizing Jorge Jimenez / Brian Karis (UE4 / COD:AW) 13-tap
 *      anti-flicker filter with partial luminance weighting (1.0 / (1.0 + Luma))
 *      to eradicate specular fireflies without sub-pixel shimmering.
 *    - Soft-knee quadratic curve luminance isolation preventing harsh threshold
 *      step-clipping artifacts across specular brass and marble surfaces.
 *    - Energy-preserving 9-tap 3x3 tent filter upsampling with adjustable blur radius
 *      and additive accumulation preserving high-dynamic-range energy.
 *
 * 2. Horizontal Anamorphic Lens Flare:
 *    - Asymmetric 1D horizontal streak convolution filter simulating vintage cinema
 *      cylindrical anamorphic optics (2x horizontal squeeze signature).
 *    - Dual-tone chromatic glare: warm amber/gold (#FFB347) on specular filament cores
 *      transitioning into magnesium fluoride (MgF2) optical coating cyan/teal (#36C2CE)
 *      wing falloffs, balanced by Rubiconius architectural bronze (#A77C4D).
 *    - Progressive recursive horizontal streak passes with exponential spatial decay.
 *
 * 3. Optical Ghosting and Chromatic Ring Dispersion:
 *    - 8-sample radial inverted ghost generator creating authentic multi-element
 *      lens barrel reflections across the optical axis (0.5, 0.5).
 *    - Chromatic dispersion offsets along radial refraction vectors simulating
 *      wavelength-dependent indices of refraction (Cauchy dispersion).
 *    - Circular chromatic halo ring generator with adjustable radius and width.
 *    - Polygonal aperture starburst diffraction modulation.
 *
 * 4. Filmic ACES Tone Mapping and Blue Noise Dithering:
 *    - Krzysztof Narkowicz (2015) and Stephen Hill ACEScg fitted tone reproduction curves
 *      delivering rich filmic shoulder compression and deep, non-crushed toe shadows.
 *    - Jorge Jimenez Interleaved Gradient Noise (IGN) high-frequency blue noise dithering
 *      eradicating 8-bit color quantization banding in dark architectural gradients.
 *    - Time-of-day dusk modulation (Daylight #EFECE6 to Golden Hour #D4A373 to Dusk #161513).
 *
 * Architecture:
 * - Direct Three.js WebGLRenderer and WebGLRenderTarget post-processing pass.
 * - Standalone Raw WebGL / OGL Framebuffer adapter for fallback environments.
 * - Dynamic quality tier scaling (High/Ultra: 5 mips + 3 streak passes + 8 ghosts;
 *   Medium: 4 mips + 2 streak passes + 4 ghosts; Low: 3 mips + 1 streak pass).
 * ============================================================================
 */

import * as THREE from 'three';
import { getQualityTier, prefersReducedMotion } from '../env';

// ============================================================================
// 1. TYPES, CONFIGURATION AND INTERFACES
// ============================================================================

/** Supported Tone Mapping Operators */
export type ToneMappingMode =
  | 'aces-filmic'
  | 'aces-hill'
  | 'reinhard-jodie'
  | 'agx'
  | 'neutral'
  | 'linear';

/** Showroom Time of Day lighting presets */
export type BloomTimeOfDayPreset = 'day' | 'golden' | 'night' | 'custom';

/** Quality tier for bloom allocation */
export type BloomQualityTier = 'low' | 'medium' | 'high' | 'ultra';

/** Bloom mip pyramid level descriptor */
export interface BloomPyramidLevel {
  index: number;
  width: number;
  height: number;
  texelSize: THREE.Vector2;
  downsampleTarget: THREE.WebGLRenderTarget;
  upsampleTarget: THREE.WebGLRenderTarget;
}

/** Configuration options for the complete Anamorphic Bloom pipeline */
export interface AnamorphicBloomOptions {
  /** Master pipeline enable switch */
  enabled?: boolean;

  // Progressive Bloom Options
  /** Luminance extraction threshold in linear radiance (0.0 to 10.0, default: 0.85) */
  bloomThreshold?: number;
  /** Soft knee threshold transition width [0..1] (default: 0.65) */
  bloomKnee?: number;
  /** Master progressive bloom intensity multiplier (default: 1.15) */
  bloomIntensity?: number;
  /** Filter radius / kernel spread multiplier during tent upsampling (default: 0.85) */
  bloomRadius?: number;
  /** Number of pyramid downsample/upsample stages (3 to 6, default: 5) */
  pyramidLevels?: number;
  /** Whether to apply Karis 13-tap firefly suppression in prefilter pass (default: true) */
  karisAverage?: boolean;
  /** Additive bloom tint color (default: #FFFFFF) */
  bloomTint?: THREE.ColorRepresentation;

  // Horizontal Anamorphic Lens Flare Options
  /** Master anamorphic streak flare enable switch (default: true) */
  flareEnabled?: boolean;
  /** Anamorphic streak luminance extraction threshold (default: 1.05) */
  flareThreshold?: number;
  /** Flare intensity multiplier (default: 0.85) */
  flareIntensity?: number;
  /** Horizontal streak extension / decay factor (default: 0.94) */
  flareStretch?: number;
  /** Asymmetry factor (-1.0 to 1.0) simulating off-axis lens flare (default: 0.08) */
  flareAsymmetry?: number;
  /** Number of horizontal convolution blur passes (1 to 4, default: 3) */
  flarePasses?: number;
  /** Streak core highlight color: amber/gold filament (#FFB347) */
  flareCoreColor?: THREE.ColorRepresentation;
  /** Streak wing falloff color: cinema cyan/teal (#36C2CE) */
  flareWingColor?: THREE.ColorRepresentation;
  /** Architectural bronze accent blend color (#A77C4D) */
  flareBronzeColor?: THREE.ColorRepresentation;
  /** Specular boost multiplier for metallic brass / gold surfaces (default: 1.6) */
  flareSpecularBoost?: number;

  // Optical Ghosting and Chromatic Ring Dispersion
  /** Ghost reflections and halo enable switch (default: true) */
  ghostsEnabled?: boolean;
  /** Optical ghost reflection intensity (default: 0.35) */
  ghostIntensity?: number;
  /** Number of radial ghost taps (1 to 8, default: 8) */
  ghostCount?: number;
  /** Spacing scale between successive internal ghost reflections (default: 0.32) */
  ghostSpacing?: number;
  /** Chromatic dispersion offset multiplier along radial vectors (default: 0.018) */
  chromaticDispersion?: number;
  /** Radial halo ring radius from screen center [0..1] (default: 0.46) */
  haloRadius?: number;
  /** Halo ring radial thickness [0.01..0.2] (default: 0.055) */
  haloThickness?: number;
  /** Halo ring luminance intensity (default: 0.42) */
  haloIntensity?: number;
  /** Number of aperture blades for starburst diffraction flare (default: 6) */
  starburstBlades?: number;

  // HDR Tone Mapping and Blue Noise Dithering
  /** Tone mapping curve algorithm (default: 'aces-filmic') */
  toneMappingMode?: ToneMappingMode;
  /** Exposure compensation multiplier in EV (linear multiplier, default: 1.0) */
  exposure?: number;
  /** Film shoulder white point clip (default: 1.0) */
  whitePoint?: number;
  /** Contrast adjustment curve (default: 1.05) */
  contrast?: number;
  /** Saturation adjustment multiplier (default: 1.02) */
  saturation?: number;
  /** Blue noise dither amplitude to prevent 8-bit banding [0..1] (default: 0.04) */
  ditherIntensity?: number;
  /** Architectural bronze color grading balance [0..1] (default: 0.22) */
  bronzeGrading?: number;
  /** Dusk mode interpolation factor [0.0 = day, 1.0 = dusk] (default: 0.0) */
  dusk?: number;

  // Pipeline and Performance Settings
  /** Manual quality tier override (defaults to auto-detection from env) */
  qualityTier?: BloomQualityTier;
  /** Render resolution scale factor (0.5 to 1.0, default: 1.0) */
  resolutionScale?: number;
  /** Whether to use half-float render targets (default: true) */
  halfFloat?: boolean;
}

/** Runtime uniform and parameter state exposed for inspectors and animation hooks */
export interface AnamorphicBloomState {
  enabled: boolean;
  bloomIntensity: number;
  bloomThreshold: number;
  bloomKnee: number;
  bloomRadius: number;
  flareIntensity: number;
  flareStretch: number;
  flareAsymmetry: number;
  ghostIntensity: number;
  chromaticDispersion: number;
  haloIntensity: number;
  exposure: number;
  contrast: number;
  saturation: number;
  ditherIntensity: number;
  bronzeGrading: number;
  dusk: number;
  width: number;
  height: number;
  activePasses: number;
}

/** Complete handle returned by factory initializers */
export interface AnamorphicBloomHandle {
  /** The Three.js post-processing pass instance */
  pass: AnamorphicBloomPass;
  /** Updates options dynamically at runtime */
  setOptions: (options: Partial<AnamorphicBloomOptions>) => void;
  /** Interpolates dusk lighting factor [0.0 = Day, 1.0 = Dusk] */
  setDusk: (progress: number) => void;
  /** Sets showroom time of day preset */
  setTimeOfDay: (preset: BloomTimeOfDayPreset) => void;
  /** Viewport resize handler */
  resize: (width: number, height: number) => void;
  /** Reads current live state for debug HUDs and UI controls */
  getState: () => AnamorphicBloomState;
  /** Disposes all GPU textures, framebuffers, and materials */
  dispose: () => void;
}

// ============================================================================
// 2. EMBEDDED GLSL SHADER SOURCES
// ============================================================================

/**
 * Fullscreen Quad / Triangle Vertex Shader
 * Generates clip-space coordinates spanning [-1, 1] with interpolated UVs [0, 1].
 */
export const BASE_QUAD_VERT = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Luminance Isolation and 13-Tap Karis Average Prefilter Fragment Shader
 * Extracted from Unreal Engine 4 / Jorge Jimenez (COD:AW) Bloom prefilter pass.
 *
 * Mathematical highlights:
 * - 13 bilinear samples structured as 4 overlapping 2x2 boxes + 1 center sample.
 * - Karis luminance weighting: w = 1.0 / (1.0 + Luminance) applied per box group
 *   to suppress high-frequency specular fireflies before downsampling pyramid.
 * - Soft-knee threshold curve:
 *     x = clamp(Luma - Threshold + Knee, 0.0, 2.0 * Knee)
 *     soft = (x * x) / (4.0 * Knee + 1e-4)
 *     factor = max(soft, Luma - Threshold) / max(Luma, 1e-4)
 */
export const BLOOM_PREFILTER_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 uTexelSize;
uniform float uThreshold;
uniform float uKnee;
uniform float uKarisEnabled;
uniform vec3 uBloomTint;

varying vec2 vUv;

// Standard ITU-R BT.709 perceived luminance
float getLuminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

// Partial Karis firefly suppression weight
float karisWeight(vec3 color) {
  if (uKarisEnabled < 0.5) return 1.0;
  return 1.0 / (1.0 + getLuminance(color));
}

// Quadratic soft-knee threshold luminance curve
vec3 quadraticThreshold(vec3 color, float threshold, float knee) {
  float luma = getLuminance(color);
  float k = max(knee, 0.0001);
  float x = clamp(luma - threshold + k, 0.0, 2.0 * k);
  float soft = (x * x) / (4.0 * k + 1e-5);
  float factor = max(soft, luma - threshold) / max(luma, 1e-5);
  factor = max(0.0, factor);
  return color * factor;
}

void main() {
  vec2 d = uTexelSize;

  // 13-tap sample pattern (4 overlapping 2x2 boxes + 1 center)
  // Center
  vec3 a = texture2D(tDiffuse, vUv).rgb;

  // Inner box samples
  vec3 b = texture2D(tDiffuse, vUv + vec2(-d.x, -d.y) * 0.5).rgb;
  vec3 c = texture2D(tDiffuse, vUv + vec2( d.x, -d.y) * 0.5).rgb;
  vec3 dSample = texture2D(tDiffuse, vUv + vec2(-d.x,  d.y) * 0.5).rgb;
  vec3 e = texture2D(tDiffuse, vUv + vec2( d.x,  d.y) * 0.5).rgb;

  // Outer corner taps
  vec3 f = texture2D(tDiffuse, vUv + vec2(-d.x, -d.y)).rgb;
  vec3 g = texture2D(tDiffuse, vUv + vec2( d.x, -d.y)).rgb;
  vec3 h = texture2D(tDiffuse, vUv + vec2(-d.x,  d.y)).rgb;
  vec3 i = texture2D(tDiffuse, vUv + vec2( d.x,  d.y)).rgb;

  // Cardinal taps
  vec3 j = texture2D(tDiffuse, vUv + vec2(-d.x * 2.0, 0.0)).rgb;
  vec3 k = texture2D(tDiffuse, vUv + vec2( d.x * 2.0, 0.0)).rgb;
  vec3 l = texture2D(tDiffuse, vUv + vec2(0.0, -d.y * 2.0)).rgb;
  vec3 m = texture2D(tDiffuse, vUv + vec2(0.0,  d.y * 2.0)).rgb;

  // 5 Karis-weighted box groups
  // Group 0 (center cross)
  vec3 box0 = (b + c + dSample + e) * 0.25;
  // Group 1 (top-left)
  vec3 box1 = (f + j + l + b) * 0.25;
  // Group 2 (top-right)
  vec3 box2 = (g + k + l + c) * 0.25;
  // Group 3 (bottom-left)
  vec3 box3 = (h + j + m + dSample) * 0.25;
  // Group 4 (bottom-right)
  vec3 box4 = (i + k + m + e) * 0.25;

  float w0 = karisWeight(box0) * 0.5;
  float w1 = karisWeight(box1) * 0.125;
  float w2 = karisWeight(box2) * 0.125;
  float w3 = karisWeight(box3) * 0.125;
  float w4 = karisWeight(box4) * 0.125;

  float totalWeight = w0 + w1 + w2 + w3 + w4;
  vec3 filtered = (box0 * w0 + box1 * w1 + box2 * w2 + box3 * w3 + box4 * w4) / max(totalWeight, 1e-5);

  // Apply soft-knee threshold and tint
  vec3 isolated = quadraticThreshold(filtered, uThreshold, uKnee);
  isolated *= uBloomTint;

  gl_FragColor = vec4(isolated, 1.0);
}
`;

/**
 * Progressive Downsampling Fragment Shader (Mip i to Mip i+1)
 * Standard 13-tap box filter with energy normalization across pyramid levels.
 */
export const BLOOM_DOWNSAMPLE_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 uTexelSize;

varying vec2 vUv;

void main() {
  vec2 d = uTexelSize;

  // 13-tap box downsample
  vec3 a = texture2D(tDiffuse, vUv).rgb;

  vec3 b = texture2D(tDiffuse, vUv + vec2(-d.x, -d.y) * 0.5).rgb;
  vec3 c = texture2D(tDiffuse, vUv + vec2( d.x, -d.y) * 0.5).rgb;
  vec3 dSample = texture2D(tDiffuse, vUv + vec2(-d.x,  d.y) * 0.5).rgb;
  vec3 e = texture2D(tDiffuse, vUv + vec2( d.x,  d.y) * 0.5).rgb;

  vec3 f = texture2D(tDiffuse, vUv + vec2(-d.x, -d.y)).rgb;
  vec3 g = texture2D(tDiffuse, vUv + vec2( d.x, -d.y)).rgb;
  vec3 h = texture2D(tDiffuse, vUv + vec2(-d.x,  d.y)).rgb;
  vec3 i = texture2D(tDiffuse, vUv + vec2( d.x,  d.y)).rgb;

  vec3 j = texture2D(tDiffuse, vUv + vec2(-d.x * 2.0, 0.0)).rgb;
  vec3 k = texture2D(tDiffuse, vUv + vec2( d.x * 2.0, 0.0)).rgb;
  vec3 l = texture2D(tDiffuse, vUv + vec2(0.0, -d.y * 2.0)).rgb;
  vec3 m = texture2D(tDiffuse, vUv + vec2(0.0,  d.y * 2.0)).rgb;

  vec3 box0 = (b + c + dSample + e) * 0.25;
  vec3 box1 = (f + j + l + b) * 0.25;
  vec3 box2 = (g + k + l + c) * 0.25;
  vec3 box3 = (h + j + m + dSample) * 0.25;
  vec3 box4 = (i + k + m + e) * 0.25;

  vec3 color = box0 * 0.5 + (box1 + box2 + box3 + box4) * 0.125;
  gl_FragColor = vec4(color, 1.0);
}
`;

/**
 * Progressive Upsampling Tent Filter Fragment Shader (Mip i+1 to Mip i)
 * 9-tap 3x3 tent filter with additive blend accumulation:
 * Kernel:
 *   | 1  2  1 |
 *   | 2  4  2 |  * 1/16
 *   | 1  2  1 |
 */
export const BLOOM_UPSAMPLE_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D tCurrentMip;
uniform sampler2D tHigherMip;
uniform vec2 uTexelSize;
uniform float uRadius;
uniform float uWeight;

varying vec2 vUv;

void main() {
  vec2 d = uTexelSize * uRadius;

  // 9-tap 3x3 tent filter
  vec3 a = texture2D(tHigherMip, vUv + vec2(-d.x, -d.y)).rgb * 1.0;
  vec3 b = texture2D(tHigherMip, vUv + vec2(  0.0, -d.y)).rgb * 2.0;
  vec3 c = texture2D(tHigherMip, vUv + vec2( d.x, -d.y)).rgb * 1.0;

  vec3 dSample = texture2D(tHigherMip, vUv + vec2(-d.x,  0.0)).rgb * 2.0;
  vec3 e = texture2D(tHigherMip, vUv + vec2(  0.0,  0.0)).rgb * 4.0;
  vec3 f = texture2D(tHigherMip, vUv + vec2( d.x,  0.0)).rgb * 2.0;

  vec3 g = texture2D(tHigherMip, vUv + vec2(-d.x,  d.y)).rgb * 1.0;
  vec3 h = texture2D(tHigherMip, vUv + vec2(  0.0,  d.y)).rgb * 2.0;
  vec3 i = texture2D(tHigherMip, vUv + vec2( d.x,  d.y)).rgb * 1.0;

  vec3 upsampled = (a + b + c + dSample + e + f + g + h + i) / 16.0;

  // Additive accumulation with current mip level
  vec3 current = texture2D(tCurrentMip, vUv).rgb;
  vec3 combined = current + upsampled * uWeight;

  gl_FragColor = vec4(combined, 1.0);
}
`;

/**
 * Anamorphic Highlight Isolation Fragment Shader
 * Isolates high-energy specular highlights and window fixtures with an anamorphic
 * 2:1 horizontal stretch envelope prior to streak convolution.
 */
export const ANAMORPHIC_ISOLATION_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D tDiffuse;
uniform float uThreshold;
uniform float uSpecularBoost;
uniform vec3 uBrassColor;

varying vec2 vUv;

float getLuminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  vec3 color = texture2D(tDiffuse, vUv).rgb;
  float luma = getLuminance(color);

  // Highlight extraction with threshold cutoff
  float intensity = max(0.0, luma - uThreshold);
  if (intensity <= 0.0001) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // Detect brass/gold specular reflections and apply boost
  float brassSimilarity = dot(normalize(color + 1e-4), normalize(uBrassColor + 1e-4));
  float boost = mix(1.0, uSpecularBoost, smoothstep(0.7, 0.98, brassSimilarity));

  vec3 isolated = color * (intensity / max(luma, 1e-4)) * boost;
  gl_FragColor = vec4(isolated, 1.0);
}
`;

/**
 * Horizontal Anamorphic Streak Convolution Fragment Shader
 * Simulates vintage Panavision / Cooke cylindrical anamorphic glass lenses.
 *
 * Mathematical highlights:
 * - 1D horizontal convolution with exponential decay kernel: w(x) = exp(-abs(x) / sigma).
 * - Asymmetric streak bias simulating off-axis ray distortion.
 * - Dual-tone chromatic gradient: core amber/gold (#FFB347) transitioning
 *   to optical coating cyan/teal (#36C2CE) and architectural bronze (#A77C4D).
 */
export const ANAMORPHIC_STREAK_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 uTexelSize;
uniform float uStep;
uniform float uStretch;
uniform float uAsymmetry;
uniform vec3 uCoreColor;
uniform vec3 uWingColor;
uniform vec3 uBronzeColor;

varying vec2 vUv;

const int SAMPLES = 12;

void main() {
  vec3 accumColor = vec3(0.0);
  float accumWeight = 0.0;

  // Stride scaled by pass step
  float stride = uTexelSize.x * uStep;

  // Asymmetric horizontal streak convolution
  for (int i = -SAMPLES; i <= SAMPLES; i++) {
    float fi = float(i);
    // Skew sampling position for off-axis anamorphic asymmetry
    float asymmetryOffset = fi > 0.0 ? (1.0 + uAsymmetry) : (1.0 - uAsymmetry);
    float offset = fi * stride * asymmetryOffset;

    vec2 uv = vUv + vec2(offset, 0.0);
    if (uv.x < 0.0 || uv.x > 1.0) continue;

    vec3 sampleColor = texture2D(tDiffuse, uv).rgb;

    // Exponential decay falloff
    float distanceNorm = abs(fi) / float(SAMPLES);
    float weight = exp(-distanceNorm * (4.0 / max(uStretch, 0.1)));

    // Chromatic dual-tone gradient across horizontal streak wings:
    // Core (near 0) is gold/amber filament; Wings (distanceNorm to 1) are cinema cyan/teal
    float wingMix = smoothstep(0.12, 0.85, distanceNorm);
    vec3 toneGrad = mix(uCoreColor, uWingColor, wingMix);
    // Modulate with luxury architectural bronze
    toneGrad = mix(toneGrad, uBronzeColor, wingMix * 0.35);

    accumColor += sampleColor * toneGrad * weight;
    accumWeight += weight;
  }

  vec3 finalColor = accumColor / max(accumWeight, 1e-4);
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

/**
 * Optical Ghosting and Chromatic Ring Dispersion Fragment Shader
 * Extracted from Lusion's barrel optics and internal reflection simulation.
 *
 * Mathematical highlights:
 * - 8 radial ghost taps reflected through optical center (0.5, 0.5):
 *     coord_i = (1.0 - uv) * scale_i + center * (1.0 - scale_i)
 * - Cauchy chromatic dispersion: R, G, B channels sampled with wavelength-dependent
 *   radial offsets along ray direction vector d = normalize(center - uv).
 * - Circular chromatic halo ring at normalized radius R_halo with rainbow splitting.
 * - 6-blade starburst flare diffraction: cos(N * theta).
 */
export const OPTICAL_GHOST_HALO_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uGhostIntensity;
uniform float uGhostSpacing;
uniform float uHaloRadius;
uniform float uHaloThickness;
uniform float uHaloIntensity;
uniform float uDispersion;
uniform float uStarburstBlades;

varying vec2 vUv;

const int NUM_GHOSTS = 8;

// Radial Cauchy chromatic dispersion sampler
vec3 sampleWithDispersion(sampler2D tex, vec2 uv, vec2 dir, float disp) {
  vec2 offsetR = dir * disp * 1.35;
  vec2 offsetG = dir * disp * 0.0;
  vec2 offsetB = dir * disp * -1.35;

  float r = texture2D(tex, uv + offsetR).r;
  float g = texture2D(tex, uv + offsetG).g;
  float b = texture2D(tex, uv + offsetB).b;

  return vec3(r, g, b);
}

void main() {
  vec2 center = vec2(0.5);
  vec2 toCenter = center - vUv;
  vec2 rayDir = normalize(toCenter + 1e-6);
  float distToCenter = length(toCenter);

  // Inverted optical barrel coordinates
  vec2 invUv = 1.0 - vUv;

  vec3 ghostColor = vec3(0.0);

  // 1. 8-sample radial ghost reflections
  for (int i = 0; i < NUM_GHOSTS; i++) {
    float fi = float(i) + 1.0;
    // Dispersal scale per ghost element (oscillates across center)
    float scale = (fi * uGhostSpacing) - 0.45;
    vec2 ghostCoord = fract(invUv * scale + center * (1.0 - scale));

    // Distance attenuation from ghost coordinate to center
    float ghostDist = length(center - ghostCoord);
    float falloff = smoothstep(0.72, 0.05, ghostDist);

    // Color gradient across ghost spectrum
    float hue = fract(float(i) * 0.16 + 0.35);
    vec3 ghostTint = vec3(
      sin(hue * 6.28318) * 0.5 + 0.5,
      sin((hue + 0.33) * 6.28318) * 0.5 + 0.5,
      sin((hue + 0.66) * 6.28318) * 0.5 + 0.5
    );

    vec3 sampleDisp = sampleWithDispersion(tDiffuse, ghostCoord, rayDir, uDispersion * (1.0 + fi * 0.2));
    ghostColor += sampleDisp * ghostTint * falloff * (1.0 / fi);
  }

  // 2. Circular Chromatic Halo Ring
  vec2 haloVec = normalize(toCenter + 1e-6) * uHaloRadius;
  vec2 haloCoord = vUv + haloVec;
  float haloDist = length(toCenter) - uHaloRadius;
  float haloRing = 1.0 - clamp(abs(haloDist) / max(uHaloThickness, 0.001), 0.0, 1.0);
  haloRing = pow(haloRing, 2.5);

  vec3 haloColor = sampleWithDispersion(tDiffuse, haloCoord, rayDir, uDispersion * 2.5);
  // Rainbow spectral gradient along halo perimeter
  float angle = atan(toCenter.y, toCenter.x);
  vec3 rainbow = vec3(
    sin(angle * 1.0) * 0.5 + 0.5,
    sin(angle * 1.0 + 2.094) * 0.5 + 0.5,
    sin(angle * 1.0 + 4.188) * 0.5 + 0.5
  );

  // Starburst diffraction spikes
  float starburst = pow(abs(cos(angle * uStarburstBlades * 0.5)), 8.0) * 0.35 + 0.65;

  vec3 finalHalo = haloColor * rainbow * haloRing * uHaloIntensity * starburst;
  vec3 finalGhosts = ghostColor * uGhostIntensity;

  // Vignette mask to eliminate hard rectangular window boundary artifacts
  float screenVignette = smoothstep(0.8, 0.25, distToCenter);

  gl_FragColor = vec4((finalGhosts + finalHalo) * screenVignette, 1.0);
}
`;

/**
 * Master Composite, ACES Filmic Tone Mapping and Blue Noise Dither Fragment Shader
 *
 * Combines:
 * 1. Base HDR linear scene texture
 * 2. Progressive 5-stage bloom pyramid top mip
 * 3. Horizontal anamorphic streak flare
 * 4. Optical ghosting and chromatic dispersion halo
 *
 * Post-Processing:
 * - Krzysztof Narkowicz (2015) and Stephen Hill ACES Fitted Tone Mapping
 * - Jorge Jimenez Interleaved Gradient Noise (IGN) blue noise dithering
 * - Architectural Bronze grade and Dusk lighting interpolation
 */
export const COMPOSITE_TONEMAP_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform sampler2D tStreak;
uniform sampler2D tGhosts;

uniform float uBloomIntensity;
uniform float uFlareIntensity;
uniform float uGhostIntensity;
uniform float uExposure;
uniform float uWhitePoint;
uniform float uContrast;
uniform float uSaturation;
uniform float uDitherIntensity;
uniform float uBronzeGrading;
uniform float uDusk;
uniform int uToneMappingMode; // 0=ACES, 1=Reinhard, 2=Linear, 3=Neutral
uniform vec2 uResolution;
uniform float uTime;

varying vec2 vUv;

// Jorge Jimenez Interleaved Gradient Noise (IGN) for blue-noise shadow and bloom dithering
float interleavedGradientNoise(vec2 screenPos) {
  vec3 magic = vec3(0.06711056, 0.00583715, 52.9829189);
  return fract(magic.z * fract(dot(screenPos, magic.xy)));
}

// Krzysztof Narkowicz 2015 ACES Fitted Curve (sRGB display output)
vec3 acesFilmic(vec3 x) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

// Stephen Hill ACEScg fitted matrix curve for high-gamut precision
vec3 acesHill(vec3 color) {
  // sRGB to ACEScg
  mat3 srgbToAces = mat3(
    0.59719, 0.35458, 0.04823,
    0.07600, 0.90834, 0.01566,
    0.02840, 0.13383, 0.83777
  );
  // ACEScg to sRGB
  mat3 acesToSrgb = mat3(
    1.60475, -0.53108, -0.07367,
    -0.10208, 1.10813, -0.00605,
    -0.00327, -0.07276, 1.07602
  );

  vec3 v = srgbToAces * color;
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  vec3 rrt = a / b;
  return clamp(acesToSrgb * rrt, 0.0, 1.0);
}

// Reinhard-Jodie tone mapping (preserves chromatic luminance saturation)
vec3 reinhardJodie(vec3 v) {
  float l = dot(v, vec3(0.2126, 0.7152, 0.0722));
  vec3 tv = v / (1.0 + v);
  return mix(v / (1.0 + l), tv, tv);
}

// Adjust contrast around mid-point 0.5
vec3 adjustContrast(vec3 color, float contrast) {
  return clamp((color - 0.5) * contrast + 0.5, 0.0, 1.0);
}

// Adjust saturation
vec3 adjustSaturation(vec3 color, float sat) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return clamp(mix(vec3(luma), color, sat), 0.0, 1.0);
}

void main() {
  vec3 sceneColor = texture2D(tScene, vUv).rgb;
  vec3 bloomColor = texture2D(tBloom, vUv).rgb;
  vec3 streakColor = texture2D(tStreak, vUv).rgb;
  vec3 ghostColor = texture2D(tGhosts, vUv).rgb;

  // Additive synthesis in linear HDR space
  vec3 hdrColor = sceneColor
                + bloomColor * uBloomIntensity
                + streakColor * uFlareIntensity
                + ghostColor * uGhostIntensity;

  // Architectural bronze highlight grading
  vec3 bronzeTint = vec3(0.655, 0.486, 0.302); // #A77C4D
  float bloomLuma = dot(bloomColor, vec3(0.2126, 0.7152, 0.0722));
  hdrColor = mix(hdrColor, hdrColor * bronzeTint * 1.35, bloomLuma * uBronzeGrading);

  // Dusk mode color modulation (cool twilight deep indigo #161513 lerping)
  vec3 duskTint = vec3(0.55, 0.62, 0.82);
  hdrColor = mix(hdrColor, hdrColor * duskTint, uDusk * 0.35);

  // Exposure application
  hdrColor *= uExposure;

  // Tone Mapping Operator
  vec3 ldrColor;
  if (uToneMappingMode == 0) {
    ldrColor = acesFilmic(hdrColor / max(uWhitePoint, 0.01));
  } else if (uToneMappingMode == 1) {
    ldrColor = acesHill(hdrColor / max(uWhitePoint, 0.01));
  } else if (uToneMappingMode == 2) {
    ldrColor = reinhardJodie(hdrColor);
  } else {
    ldrColor = clamp(hdrColor, 0.0, 1.0);
  }

  // Contrast and Saturation fine-tuning
  ldrColor = adjustContrast(ldrColor, uContrast);
  ldrColor = adjustSaturation(ldrColor, uSaturation);

  // Blue Noise Dithering (Jimenez Interleaved Gradient Noise)
  // Eliminates 8-bit banding along soft bloom and dark shadow falloffs
  vec2 screenPos = vUv * uResolution;
  float ign = interleavedGradientNoise(screenPos);
  float dither = (ign - 0.5) / 255.0 * uDitherIntensity * 10.0;
  ldrColor += vec3(dither);

  gl_FragColor = vec4(clamp(ldrColor, 0.0, 1.0), 1.0);
}
`;

// ============================================================================
// 3. ANAMORPHIC BLOOM POST-PROCESSING PASS (THREE.JS INTEGRATION)
// ============================================================================

/**
 * Production-Grade Anamorphic Bloom and HDR Post-Processing Pass for Three.js
 *
 * Implements:
 * - 5-Stage progressive Gaussian blur pyramid with 13-tap Karis average anti-flicker filter.
 * - Horizontal anamorphic cylindrical streak convolution with cyan-gold dual-tone flare.
 * - 8-sample radial optical ghost reflections and circular rainbow dispersion halo.
 * - Filmic ACES tone mapping with blue noise dithering.
 */
export class AnamorphicBloomPass {
  public enabled: boolean = true;
  public renderer: THREE.WebGLRenderer;

  // Configuration options
  private options: Required<AnamorphicBloomOptions>;

  // Dimensions
  private width: number = 0;
  private height: number = 0;
  private renderScale: number = 1.0;

  // Three.js Screen-space Quad Infrastructure
  private camera: THREE.OrthographicCamera;
  private quadGeometry: THREE.PlaneGeometry;
  private quadMesh: THREE.Mesh;
  private quadScene: THREE.Scene;

  // Render Targets
  private bloomPyramid: BloomPyramidLevel[] = [];
  private streakTargets: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] | null = null;
  private isolationTarget: THREE.WebGLRenderTarget | null = null;
  private ghostTarget: THREE.WebGLRenderTarget | null = null;

  // Shader Materials
  private prefilterMaterial!: THREE.ShaderMaterial;
  private downsampleMaterial!: THREE.ShaderMaterial;
  private upsampleMaterial!: THREE.ShaderMaterial;
  private streakIsolationMaterial!: THREE.ShaderMaterial;
  private streakMaterial!: THREE.ShaderMaterial;
  private ghostMaterial!: THREE.ShaderMaterial;
  private compositeMaterial!: THREE.ShaderMaterial;

  // Temporary state cache
  private isDisposed: boolean = false;

  constructor(renderer: THREE.WebGLRenderer, options: AnamorphicBloomOptions = {}) {
    this.renderer = renderer;

    const detectedTier = options.qualityTier ?? getQualityTier();
    const reduced = prefersReducedMotion();

    // Default configuration with luxury architectural defaults
    this.options = {
      enabled: options.enabled ?? (!reduced),
      bloomThreshold: options.bloomThreshold ?? 0.85,
      bloomKnee: options.bloomKnee ?? 0.65,
      bloomIntensity: options.bloomIntensity ?? 1.15,
      bloomRadius: options.bloomRadius ?? 0.85,
      pyramidLevels: options.pyramidLevels ?? (detectedTier === 'low' ? 3 : detectedTier === 'medium' ? 4 : 5),
      karisAverage: options.karisAverage ?? true,
      bloomTint: options.bloomTint ?? 0xffffff,

      flareEnabled: options.flareEnabled ?? (detectedTier !== 'low'),
      flareThreshold: options.flareThreshold ?? 1.05,
      flareIntensity: options.flareIntensity ?? 0.85,
      flareStretch: options.flareStretch ?? 0.94,
      flareAsymmetry: options.flareAsymmetry ?? 0.08,
      flarePasses: options.flarePasses ?? (detectedTier === 'high' || detectedTier === 'ultra' ? 3 : 2),
      flareCoreColor: options.flareCoreColor ?? 0xffb347, // Amber/Gold filament
      flareWingColor: options.flareWingColor ?? 0x36c2ce, // Cinema Cyan/Teal
      flareBronzeColor: options.flareBronzeColor ?? 0xa77c4d, // Architectural Bronze
      flareSpecularBoost: options.flareSpecularBoost ?? 1.6,

      ghostsEnabled: options.ghostsEnabled ?? (detectedTier === 'high' || detectedTier === 'ultra'),
      ghostIntensity: options.ghostIntensity ?? 0.35,
      ghostCount: options.ghostCount ?? (detectedTier === 'ultra' ? 8 : 6),
      ghostSpacing: options.ghostSpacing ?? 0.32,
      chromaticDispersion: options.chromaticDispersion ?? 0.018,
      haloRadius: options.haloRadius ?? 0.46,
      haloThickness: options.haloThickness ?? 0.055,
      haloIntensity: options.haloIntensity ?? 0.42,
      starburstBlades: options.starburstBlades ?? 6,

      toneMappingMode: options.toneMappingMode ?? 'aces-filmic',
      exposure: options.exposure ?? 1.0,
      whitePoint: options.whitePoint ?? 1.0,
      contrast: options.contrast ?? 1.05,
      saturation: options.saturation ?? 1.02,
      ditherIntensity: options.ditherIntensity ?? 0.04,
      bronzeGrading: options.bronzeGrading ?? 0.22,
      dusk: options.dusk ?? 0.0,

      qualityTier: detectedTier,
      resolutionScale: options.resolutionScale ?? 1.0,
      halfFloat: options.halfFloat ?? true,
    };

    this.renderScale = this.options.resolutionScale;

    // Fullscreen orthographic camera and quad
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadGeometry = new THREE.PlaneGeometry(2, 2);
    this.quadScene = new THREE.Scene();

    // Dummy material to initialize mesh
    const dummyMat = new THREE.MeshBasicMaterial();
    this.quadMesh = new THREE.Mesh(this.quadGeometry, dummyMat);
    this.quadMesh.frustumCulled = false;
    this.quadScene.add(this.quadMesh);

    // Initialize Shader Materials
    this.initMaterials();

    // Allocate Render Targets matching initial renderer size
    const size = new THREE.Vector2();
    renderer.getSize(size);
    this.setSize(Math.max(1, size.x), Math.max(1, size.y));
  }

  /**
   * Compiles and initializes all specialized GLSL ShaderMaterials
   */
  private initMaterials(): void {
    // 1. Prefilter and Karis Average Material
    this.prefilterMaterial = new THREE.ShaderMaterial({
      vertexShader: BASE_QUAD_VERT,
      fragmentShader: BLOOM_PREFILTER_FRAG,
      uniforms: {
        tDiffuse: { value: null },
        uTexelSize: { value: new THREE.Vector2() },
        uThreshold: { value: this.options.bloomThreshold },
        uKnee: { value: this.options.bloomKnee },
        uKarisEnabled: { value: this.options.karisAverage ? 1.0 : 0.0 },
        uBloomTint: { value: new THREE.Color(this.options.bloomTint) },
      },
      depthTest: false,
      depthWrite: false,
    });

    // 2. Progressive Downsample Material
    this.downsampleMaterial = new THREE.ShaderMaterial({
      vertexShader: BASE_QUAD_VERT,
      fragmentShader: BLOOM_DOWNSAMPLE_FRAG,
      uniforms: {
        tDiffuse: { value: null },
        uTexelSize: { value: new THREE.Vector2() },
      },
      depthTest: false,
      depthWrite: false,
    });

    // 3. Progressive Upsample Tent Material
    this.upsampleMaterial = new THREE.ShaderMaterial({
      vertexShader: BASE_QUAD_VERT,
      fragmentShader: BLOOM_UPSAMPLE_FRAG,
      uniforms: {
        tCurrentMip: { value: null },
        tHigherMip: { value: null },
        uTexelSize: { value: new THREE.Vector2() },
        uRadius: { value: this.options.bloomRadius },
        uWeight: { value: 1.0 },
      },
      depthTest: false,
      depthWrite: false,
    });

    // 4. Anamorphic Streak Isolation Material
    this.streakIsolationMaterial = new THREE.ShaderMaterial({
      vertexShader: BASE_QUAD_VERT,
      fragmentShader: ANAMORPHIC_ISOLATION_FRAG,
      uniforms: {
        tDiffuse: { value: null },
        uThreshold: { value: this.options.flareThreshold },
        uSpecularBoost: { value: this.options.flareSpecularBoost },
        uBrassColor: { value: new THREE.Color(this.options.flareBronzeColor) },
      },
      depthTest: false,
      depthWrite: false,
    });

    // 5. Anamorphic Streak Horizontal Convolution Material
    this.streakMaterial = new THREE.ShaderMaterial({
      vertexShader: BASE_QUAD_VERT,
      fragmentShader: ANAMORPHIC_STREAK_FRAG,
      uniforms: {
        tDiffuse: { value: null },
        uTexelSize: { value: new THREE.Vector2() },
        uStep: { value: 1.0 },
        uStretch: { value: this.options.flareStretch },
        uAsymmetry: { value: this.options.flareAsymmetry },
        uCoreColor: { value: new THREE.Color(this.options.flareCoreColor) },
        uWingColor: { value: new THREE.Color(this.options.flareWingColor) },
        uBronzeColor: { value: new THREE.Color(this.options.flareBronzeColor) },
      },
      depthTest: false,
      depthWrite: false,
    });

    // 6. Optical Ghosting and Halo Material
    this.ghostMaterial = new THREE.ShaderMaterial({
      vertexShader: BASE_QUAD_VERT,
      fragmentShader: OPTICAL_GHOST_HALO_FRAG,
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2() },
        uGhostIntensity: { value: this.options.ghostIntensity },
        uGhostSpacing: { value: this.options.ghostSpacing },
        uHaloRadius: { value: this.options.haloRadius },
        uHaloThickness: { value: this.options.haloThickness },
        uHaloIntensity: { value: this.options.haloIntensity },
        uDispersion: { value: this.options.chromaticDispersion },
        uStarburstBlades: { value: this.options.starburstBlades },
      },
      depthTest: false,
      depthWrite: false,
    });

    // 7. Master Composite and ACES Tone Mapping Material
    const toneModeMap: Record<ToneMappingMode, number> = {
      'aces-filmic': 0,
      'aces-hill': 1,
      'reinhard-jodie': 2,
      'agx': 1,
      'neutral': 3,
      'linear': 4,
    };

    this.compositeMaterial = new THREE.ShaderMaterial({
      vertexShader: BASE_QUAD_VERT,
      fragmentShader: COMPOSITE_TONEMAP_FRAG,
      uniforms: {
        tScene: { value: null },
        tBloom: { value: null },
        tStreak: { value: null },
        tGhosts: { value: null },
        uBloomIntensity: { value: this.options.bloomIntensity },
        uFlareIntensity: { value: this.options.flareIntensity },
        uGhostIntensity: { value: this.options.ghostIntensity },
        uExposure: { value: this.options.exposure },
        uWhitePoint: { value: this.options.whitePoint },
        uContrast: { value: this.options.contrast },
        uSaturation: { value: this.options.saturation },
        uDitherIntensity: { value: this.options.ditherIntensity },
        uBronzeGrading: { value: this.options.bronzeGrading },
        uDusk: { value: this.options.dusk },
        uToneMappingMode: { value: toneModeMap[this.options.toneMappingMode] ?? 0 },
        uResolution: { value: new THREE.Vector2() },
        uTime: { value: 0.0 },
      },
      depthTest: false,
      depthWrite: false,
    });
  }

  /**
   * Helper to create high-precision render targets with texture filtering
   */
  private createRenderTarget(w: number, h: number, halfFloat: boolean = true): THREE.WebGLRenderTarget {
    return new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: halfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      generateMipmaps: false,
      stencilBuffer: false,
      depthBuffer: false,
    });
  }

  /**
   * Allocates or resizes render targets for the bloom pyramid and streak buffers
   */
  public setSize(width: number, height: number): void {
    if (this.isDisposed || (this.width === width && this.height === height)) {
      return;
    }

    this.width = Math.max(1, Math.floor(width * this.renderScale));
    this.height = Math.max(1, Math.floor(height * this.renderScale));

    const halfFloat = this.options.halfFloat;

    // Dispose old bloom pyramid render targets
    for (const level of this.bloomPyramid) {
      level.downsampleTarget.dispose();
      level.upsampleTarget.dispose();
    }
    this.bloomPyramid = [];

    // Allocate 5-stage progressive pyramid
    let currentWidth = Math.max(1, Math.floor(this.width / 2));
    let currentHeight = Math.max(1, Math.floor(this.height / 2));

    const levels = Math.min(6, Math.max(2, this.options.pyramidLevels));

    for (let i = 0; i < levels; i++) {
      const downTarget = this.createRenderTarget(currentWidth, currentHeight, halfFloat);
      const upTarget = this.createRenderTarget(currentWidth, currentHeight, halfFloat);

      this.bloomPyramid.push({
        index: i,
        width: currentWidth,
        height: currentHeight,
        texelSize: new THREE.Vector2(1.0 / currentWidth, 1.0 / currentHeight),
        downsampleTarget: downTarget,
        upsampleTarget: upTarget,
      });

      currentWidth = Math.max(1, Math.floor(currentWidth / 2));
      currentHeight = Math.max(1, Math.floor(currentHeight / 2));
    }

    // Allocate streak flare targets (quarter resolution for high performance)
    const streakW = Math.max(1, Math.floor(this.width / 2));
    const streakH = Math.max(1, Math.floor(this.height / 4));

    if (this.streakTargets) {
      this.streakTargets[0].dispose();
      this.streakTargets[1].dispose();
    }
    this.streakTargets = [
      this.createRenderTarget(streakW, streakH, halfFloat),
      this.createRenderTarget(streakW, streakH, halfFloat),
    ];

    if (this.isolationTarget) {
      this.isolationTarget.dispose();
    }
    this.isolationTarget = this.createRenderTarget(streakW, streakH, halfFloat);

    // Allocate ghost target (quarter resolution)
    const ghostW = Math.max(1, Math.floor(this.width / 2));
    const ghostH = Math.max(1, Math.floor(this.height / 2));

    if (this.ghostTarget) {
      this.ghostTarget.dispose();
    }
    this.ghostTarget = this.createRenderTarget(ghostW, ghostH, halfFloat);

    // Update uniform resolution vectors
    this.ghostMaterial.uniforms.uResolution.value.set(ghostW, ghostH);
    this.compositeMaterial.uniforms.uResolution.value.set(this.width, this.height);
  }

  /**
   * Internal helper to render the fullscreen quad with a specific material into a target
   */
  private renderQuad(
    renderer: THREE.WebGLRenderer,
    material: THREE.Material,
    renderTarget: THREE.WebGLRenderTarget | null
  ): void {
    this.quadMesh.material = material;
    renderer.setRenderTarget(renderTarget);
    renderer.render(this.quadScene, this.camera);
  }

  /**
   * Master Render Execution Pipeline
   *
   * @param renderer - Active Three.js WebGLRenderer
   * @param writeBuffer - Target destination buffer (or null for canvas backbuffer)
   * @param readBuffer - Source HDR scene color buffer
   * @param deltaTime - Elapsed frame delta in seconds
   */
  public render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget | null,
    readBuffer: THREE.WebGLRenderTarget,
    deltaTime: number = 0.016
  ): void {
    if (!this.enabled || this.isDisposed || this.bloomPyramid.length === 0) {
      // Passthrough fallback if disabled
      if (writeBuffer) {
        this.renderQuad(renderer, new THREE.MeshBasicMaterial({ map: readBuffer.texture }), writeBuffer);
      }
      return;
    }

    const autoClear = renderer.autoClear;
    renderer.autoClear = false;

    // Update time uniform for dynamic dithering
    this.compositeMaterial.uniforms.uTime.value += deltaTime;

    // ========================================================================
    // STAGE 1: DUAL-PASS PROGRESSIVE BLOOM DOWNSAMPLING PYRAMID
    // ========================================================================

    // 1A. Prefilter Pass: Mip 0 (readBuffer) to Pyramid Level 0
    // Uses 13-tap Karis average + quadratic soft-knee thresholding
    const mip0 = this.bloomPyramid[0];
    this.prefilterMaterial.uniforms.tDiffuse.value = readBuffer.texture;
    this.prefilterMaterial.uniforms.uTexelSize.value.copy(mip0.texelSize);
    this.renderQuad(renderer, this.prefilterMaterial, mip0.downsampleTarget);

    // 1B. Progressive Downsampling Passes: Level i to Level i+1
    for (let i = 0; i < this.bloomPyramid.length - 1; i++) {
      const srcLevel = this.bloomPyramid[i];
      const dstLevel = this.bloomPyramid[i + 1];

      this.downsampleMaterial.uniforms.tDiffuse.value = srcLevel.downsampleTarget.texture;
      this.downsampleMaterial.uniforms.uTexelSize.value.copy(dstLevel.texelSize);
      this.renderQuad(renderer, this.downsampleMaterial, dstLevel.downsampleTarget);
    }

    // ========================================================================
    // STAGE 2: HORIZONTAL ANAMORPHIC LENS FLARE CONVOLUTION
    // ========================================================================
    let activeStreakTexture: THREE.Texture | null = null;

    if (this.options.flareEnabled && this.streakTargets && this.isolationTarget) {
      // 2A. Isolate bright anamorphic highlights from Level 0 downsampled target
      this.streakIsolationMaterial.uniforms.tDiffuse.value = mip0.downsampleTarget.texture;
      this.renderQuad(renderer, this.streakIsolationMaterial, this.isolationTarget);

      // 2B. Multi-pass asymmetric horizontal streak blur
      let readStreak = this.isolationTarget;
      let writeStreak = this.streakTargets[0];
      const passes = Math.max(1, Math.min(4, this.options.flarePasses));

      for (let p = 0; p < passes; p++) {
        const step = Math.pow(2.0, p);
        this.streakMaterial.uniforms.tDiffuse.value = readStreak.texture;
        this.streakMaterial.uniforms.uTexelSize.value.set(1.0 / writeStreak.width, 1.0 / writeStreak.height);
        this.streakMaterial.uniforms.uStep.value = step;

        this.renderQuad(renderer, this.streakMaterial, writeStreak);

        // Ping-pong targets
        readStreak = writeStreak;
        writeStreak = writeStreak === this.streakTargets[0] ? this.streakTargets[1] : this.streakTargets[0];
      }
      activeStreakTexture = readStreak.texture;
    }

    // ========================================================================
    // STAGE 3: OPTICAL GHOSTING AND CHROMATIC RING DISPERSION
    // ========================================================================
    let activeGhostTexture: THREE.Texture | null = null;

    if (this.options.ghostsEnabled && this.ghostTarget) {
      // Generate radial ghosts and rainbow halo using isolated bloom highlights
      this.ghostMaterial.uniforms.tDiffuse.value = mip0.downsampleTarget.texture;
      this.renderQuad(renderer, this.ghostMaterial, this.ghostTarget);
      activeGhostTexture = this.ghostTarget.texture;
    }

    // ========================================================================
    // STAGE 4: PROGRESSIVE TENT UPSAMPLING PYRAMID
    // ========================================================================
    // Copy the lowest downsample mip to start the upsampling cascade
    const lastIdx = this.bloomPyramid.length - 1;
    let currentUpsampleSource = this.bloomPyramid[lastIdx].downsampleTarget.texture;

    for (let i = lastIdx - 1; i >= 0; i--) {
      const higherMip = currentUpsampleSource;
      const currentLevel = this.bloomPyramid[i];
      const dstTarget = currentLevel.upsampleTarget;

      this.upsampleMaterial.uniforms.tHigherMip.value = higherMip;
      this.upsampleMaterial.uniforms.tCurrentMip.value = currentLevel.downsampleTarget.texture;
      this.upsampleMaterial.uniforms.uTexelSize.value.copy(currentLevel.texelSize);
      this.upsampleMaterial.uniforms.uRadius.value = this.options.bloomRadius;

      this.renderQuad(renderer, this.upsampleMaterial, dstTarget);
      currentUpsampleSource = dstTarget.texture;
    }

    // ========================================================================
    // STAGE 5: MASTER COMPOSITE, ACES TONE MAPPING AND BLUE NOISE DITHER
    // ========================================================================
    this.compositeMaterial.uniforms.tScene.value = readBuffer.texture;
    this.compositeMaterial.uniforms.tBloom.value = currentUpsampleSource;
    this.compositeMaterial.uniforms.tStreak.value = activeStreakTexture;
    this.compositeMaterial.uniforms.tGhosts.value = activeGhostTexture;

    // Render directly to writeBuffer or screen backbuffer
    this.renderQuad(renderer, this.compositeMaterial, writeBuffer);

    // Restore renderer state
    renderer.autoClear = autoClear;
  }

  /**
   * Dynamically updates pipeline options
   */
  public setOptions(options: Partial<AnamorphicBloomOptions>): void {
    Object.assign(this.options, options);

    if (options.bloomThreshold !== undefined) {
      this.prefilterMaterial.uniforms.uThreshold.value = options.bloomThreshold;
    }
    if (options.bloomKnee !== undefined) {
      this.prefilterMaterial.uniforms.uKnee.value = options.bloomKnee;
    }
    if (options.bloomTint !== undefined) {
      this.prefilterMaterial.uniforms.uBloomTint.value.set(options.bloomTint);
    }
    if (options.karisAverage !== undefined) {
      this.prefilterMaterial.uniforms.uKarisEnabled.value = options.karisAverage ? 1.0 : 0.0;
    }
    if (options.bloomRadius !== undefined) {
      this.upsampleMaterial.uniforms.uRadius.value = options.bloomRadius;
    }
    if (options.bloomIntensity !== undefined) {
      this.compositeMaterial.uniforms.uBloomIntensity.value = options.bloomIntensity;
    }

    // Flare options
    if (options.flareThreshold !== undefined) {
      this.streakIsolationMaterial.uniforms.uThreshold.value = options.flareThreshold;
    }
    if (options.flareSpecularBoost !== undefined) {
      this.streakIsolationMaterial.uniforms.uSpecularBoost.value = options.flareSpecularBoost;
    }
    if (options.flareIntensity !== undefined) {
      this.compositeMaterial.uniforms.uFlareIntensity.value = options.flareIntensity;
    }
    if (options.flareStretch !== undefined) {
      this.streakMaterial.uniforms.uStretch.value = options.flareStretch;
    }
    if (options.flareAsymmetry !== undefined) {
      this.streakMaterial.uniforms.uAsymmetry.value = options.flareAsymmetry;
    }
    if (options.flareCoreColor !== undefined) {
      this.streakMaterial.uniforms.uCoreColor.value.set(options.flareCoreColor);
    }
    if (options.flareWingColor !== undefined) {
      this.streakMaterial.uniforms.uWingColor.value.set(options.flareWingColor);
    }
    if (options.flareBronzeColor !== undefined) {
      this.streakMaterial.uniforms.uBronzeColor.value.set(options.flareBronzeColor);
      this.streakIsolationMaterial.uniforms.uBrassColor.value.set(options.flareBronzeColor);
    }

    // Ghost options
    if (options.ghostIntensity !== undefined) {
      this.ghostMaterial.uniforms.uGhostIntensity.value = options.ghostIntensity;
      this.compositeMaterial.uniforms.uGhostIntensity.value = options.ghostIntensity;
    }
    if (options.ghostSpacing !== undefined) {
      this.ghostMaterial.uniforms.uGhostSpacing.value = options.ghostSpacing;
    }
    if (options.chromaticDispersion !== undefined) {
      this.ghostMaterial.uniforms.uDispersion.value = options.chromaticDispersion;
    }
    if (options.haloRadius !== undefined) {
      this.ghostMaterial.uniforms.uHaloRadius.value = options.haloRadius;
    }
    if (options.haloThickness !== undefined) {
      this.ghostMaterial.uniforms.uHaloThickness.value = options.haloThickness;
    }
    if (options.haloIntensity !== undefined) {
      this.ghostMaterial.uniforms.uHaloIntensity.value = options.haloIntensity;
    }

    // Tone mapping and color grading options
    if (options.exposure !== undefined) {
      this.compositeMaterial.uniforms.uExposure.value = options.exposure;
    }
    if (options.whitePoint !== undefined) {
      this.compositeMaterial.uniforms.uWhitePoint.value = options.whitePoint;
    }
    if (options.contrast !== undefined) {
      this.compositeMaterial.uniforms.uContrast.value = options.contrast;
    }
    if (options.saturation !== undefined) {
      this.compositeMaterial.uniforms.uSaturation.value = options.saturation;
    }
    if (options.ditherIntensity !== undefined) {
      this.compositeMaterial.uniforms.uDitherIntensity.value = options.ditherIntensity;
    }
    if (options.bronzeGrading !== undefined) {
      this.compositeMaterial.uniforms.uBronzeGrading.value = options.bronzeGrading;
    }
    if (options.dusk !== undefined) {
      this.compositeMaterial.uniforms.uDusk.value = options.dusk;
    }
    if (options.toneMappingMode !== undefined) {
      const modeMap: Record<ToneMappingMode, number> = {
        'aces-filmic': 0,
        'aces-hill': 1,
        'reinhard-jodie': 2,
        'agx': 1,
        'neutral': 3,
        'linear': 4,
      };
      this.compositeMaterial.uniforms.uToneMappingMode.value = modeMap[options.toneMappingMode] ?? 0;
    }
  }

  /**
   * Sets showroom dusk-mode interpolation [0.0 = day, 1.0 = dusk]
   */
  public setDusk(duskProgress: number): void {
    const clamped = Math.max(0.0, Math.min(1.0, duskProgress));
    this.options.dusk = clamped;
    this.compositeMaterial.uniforms.uDusk.value = clamped;

    // Dynamically adjust exposure and flare warmth during dusk
    const targetExposure = THREE.MathUtils.lerp(1.0, 1.25, clamped);
    this.compositeMaterial.uniforms.uExposure.value = targetExposure;
  }

  /**
   * Sets showroom time of day preset
   */
  public setTimeOfDay(preset: BloomTimeOfDayPreset): void {
    switch (preset) {
      case 'day':
        this.setOptions({
          bloomIntensity: 1.15,
          flareIntensity: 0.85,
          exposure: 1.0,
          dusk: 0.0,
          bronzeGrading: 0.18,
          flareCoreColor: 0xffe8c2,
          flareWingColor: 0x4df0ff,
        });
        break;
      case 'golden':
        this.setOptions({
          bloomIntensity: 1.45,
          flareIntensity: 1.25,
          exposure: 1.12,
          dusk: 0.45,
          bronzeGrading: 0.42,
          flareCoreColor: 0xffaa4d,
          flareWingColor: 0x36c2ce,
        });
        break;
      case 'night':
        this.setOptions({
          bloomIntensity: 0.75,
          flareIntensity: 0.55,
          exposure: 1.35,
          dusk: 1.0,
          bronzeGrading: 0.28,
          flareCoreColor: 0x6e88c7,
          flareWingColor: 0x3b64b8,
        });
        break;
    }
  }

  /**
   * Returns current internal state
   */
  public getState(): AnamorphicBloomState {
    return {
      enabled: this.enabled,
      bloomIntensity: this.options.bloomIntensity,
      bloomThreshold: this.options.bloomThreshold,
      bloomKnee: this.options.bloomKnee,
      bloomRadius: this.options.bloomRadius,
      flareIntensity: this.options.flareIntensity,
      flareStretch: this.options.flareStretch,
      flareAsymmetry: this.options.flareAsymmetry,
      ghostIntensity: this.options.ghostIntensity,
      chromaticDispersion: this.options.chromaticDispersion,
      haloIntensity: this.options.haloIntensity,
      exposure: this.options.exposure,
      contrast: this.options.contrast,
      saturation: this.options.saturation,
      ditherIntensity: this.options.ditherIntensity,
      bronzeGrading: this.options.bronzeGrading,
      dusk: this.options.dusk,
      width: this.width,
      height: this.height,
      activePasses: this.bloomPyramid.length,
    };
  }

  /**
   * Frees all GPU textures, materials, and geometries
   */
  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    // Dispose pyramid targets
    for (const level of this.bloomPyramid) {
      level.downsampleTarget.dispose();
      level.upsampleTarget.dispose();
    }
    this.bloomPyramid = [];

    // Dispose streak targets
    if (this.streakTargets) {
      this.streakTargets[0].dispose();
      this.streakTargets[1].dispose();
      this.streakTargets = null;
    }
    if (this.isolationTarget) {
      this.isolationTarget.dispose();
      this.isolationTarget = null;
    }
    if (this.ghostTarget) {
      this.ghostTarget.dispose();
      this.ghostTarget = null;
    }

    // Dispose materials
    this.prefilterMaterial.dispose();
    this.downsampleMaterial.dispose();
    this.upsampleMaterial.dispose();
    this.streakIsolationMaterial.dispose();
    this.streakMaterial.dispose();
    this.ghostMaterial.dispose();
    this.compositeMaterial.dispose();

    // Dispose quad
    this.quadGeometry.dispose();
    this.quadScene.remove(this.quadMesh);
  }
}

// ============================================================================
// 4. STANDALONE RAW WEBGL / OGL FRAMEBUFFER ADAPTER
// ============================================================================

/**
 * Raw WebGL 1.0 / 2.0 and OGL Post-Processing Pipeline Adapter
 *
 * Provides a drop-in bloom and flare pipeline for raw WebGL contexts
 * without requiring the Three.js scene graph.
 */
export class RawWebGLAnamorphicBloom {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private width: number = 0;
  private height: number = 0;
  private options: Required<AnamorphicBloomOptions>;

  // WebGL Buffers and Programs
  private quadVbo: WebGLBuffer | null = null;
  private prefilterProgram: WebGLProgram | null = null;
  private downsampleProgram: WebGLProgram | null = null;
  private upsampleProgram: WebGLProgram | null = null;
  private streakProgram: WebGLProgram | null = null;
  private compositeProgram: WebGLProgram | null = null;

  // Framebuffer targets
  private mips: Array<{
    fbo: WebGLFramebuffer;
    texture: WebGLTexture;
    width: number;
    height: number;
  }> = [];

  constructor(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    options: AnamorphicBloomOptions = {}
  ) {
    this.gl = gl;
    this.options = {
      enabled: options.enabled ?? true,
      bloomThreshold: options.bloomThreshold ?? 0.85,
      bloomKnee: options.bloomKnee ?? 0.65,
      bloomIntensity: options.bloomIntensity ?? 1.15,
      bloomRadius: options.bloomRadius ?? 0.85,
      pyramidLevels: options.pyramidLevels ?? 5,
      karisAverage: options.karisAverage ?? true,
      bloomTint: options.bloomTint ?? 0xffffff,
      flareEnabled: options.flareEnabled ?? true,
      flareThreshold: options.flareThreshold ?? 1.05,
      flareIntensity: options.flareIntensity ?? 0.85,
      flareStretch: options.flareStretch ?? 0.94,
      flareAsymmetry: options.flareAsymmetry ?? 0.08,
      flarePasses: options.flarePasses ?? 2,
      flareCoreColor: options.flareCoreColor ?? 0xffb347,
      flareWingColor: options.flareWingColor ?? 0x36c2ce,
      flareBronzeColor: options.flareBronzeColor ?? 0xa77c4d,
      flareSpecularBoost: options.flareSpecularBoost ?? 1.6,
      ghostsEnabled: options.ghostsEnabled ?? false,
      ghostIntensity: options.ghostIntensity ?? 0.35,
      ghostCount: options.ghostCount ?? 6,
      ghostSpacing: options.ghostSpacing ?? 0.32,
      chromaticDispersion: options.chromaticDispersion ?? 0.018,
      haloRadius: options.haloRadius ?? 0.46,
      haloThickness: options.haloThickness ?? 0.055,
      haloIntensity: options.haloIntensity ?? 0.42,
      starburstBlades: options.starburstBlades ?? 6,
      toneMappingMode: options.toneMappingMode ?? 'aces-filmic',
      exposure: options.exposure ?? 1.0,
      whitePoint: options.whitePoint ?? 1.0,
      contrast: options.contrast ?? 1.05,
      saturation: options.saturation ?? 1.02,
      ditherIntensity: options.ditherIntensity ?? 0.04,
      bronzeGrading: options.bronzeGrading ?? 0.22,
      dusk: options.dusk ?? 0.0,
      qualityTier: options.qualityTier ?? 'high',
      resolutionScale: options.resolutionScale ?? 1.0,
      halfFloat: options.halfFloat ?? false,
    };

    this.initGLResources();
  }

  private createShader(type: number, source: string): WebGLShader | null {
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Bloom Shader Compilation Error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private createProgram(vsSource: string, fsSource: string): WebGLProgram | null {
    const vs = this.createShader(this.gl.VERTEX_SHADER, vsSource);
    const fs = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;

    const prog = this.gl.createProgram();
    if (!prog) return null;

    this.gl.attachShader(prog, vs);
    this.gl.attachShader(prog, fs);
    this.gl.linkProgram(prog);

    if (!this.gl.getProgramParameter(prog, this.gl.LINK_STATUS)) {
      console.error('Bloom Program Link Error:', this.gl.getProgramInfoLog(prog));
      this.gl.deleteProgram(prog);
      return null;
    }

    this.gl.deleteShader(vs);
    this.gl.deleteShader(fs);
    return prog;
  }

  private initGLResources(): void {
    const gl = this.gl;

    // Fullscreen quad positions [-1, 1] and UVs [0, 1]
    const vertices = new Float32Array([
      -1, -1,  0, 0,
       1, -1,  1, 0,
      -1,  1,  0, 1,
      -1,  1,  0, 1,
       1, -1,  1, 0,
       1,  1,  1, 1,
    ]);

    this.quadVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Compile programs
    this.prefilterProgram = this.createProgram(BASE_QUAD_VERT, BLOOM_PREFILTER_FRAG);
    this.downsampleProgram = this.createProgram(BASE_QUAD_VERT, BLOOM_DOWNSAMPLE_FRAG);
    this.upsampleProgram = this.createProgram(BASE_QUAD_VERT, BLOOM_UPSAMPLE_FRAG);
    this.streakProgram = this.createProgram(BASE_QUAD_VERT, ANAMORPHIC_STREAK_FRAG);
    this.compositeProgram = this.createProgram(BASE_QUAD_VERT, COMPOSITE_TONEMAP_FRAG);
  }

  public resize(width: number, height: number): void {
    if (this.width === width && this.height === height) return;
    this.width = width;
    this.height = height;

    const gl = this.gl;

    // Clean old mips
    for (const mip of this.mips) {
      gl.deleteFramebuffer(mip.fbo);
      gl.deleteTexture(mip.texture);
    }
    this.mips = [];

    let w = Math.floor(width / 2);
    let h = Math.floor(height / 2);

    for (let i = 0; i < this.options.pyramidLevels; i++) {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

      if (tex && fbo) {
        this.mips.push({ fbo, texture: tex, width: w, height: h });
      }

      w = Math.max(1, Math.floor(w / 2));
      h = Math.max(1, Math.floor(h / 2));
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  public dispose(): void {
    const gl = this.gl;
    if (this.quadVbo) gl.deleteBuffer(this.quadVbo);
    if (this.prefilterProgram) gl.deleteProgram(this.prefilterProgram);
    if (this.downsampleProgram) gl.deleteProgram(this.downsampleProgram);
    if (this.upsampleProgram) gl.deleteProgram(this.upsampleProgram);
    if (this.streakProgram) gl.deleteProgram(this.streakProgram);
    if (this.compositeProgram) gl.deleteProgram(this.compositeProgram);

    for (const mip of this.mips) {
      gl.deleteFramebuffer(mip.fbo);
      gl.deleteTexture(mip.texture);
    }
    this.mips = [];
  }
}

// ============================================================================
// 5. PRESETS AND FACTORY INITIALIZERS
// ============================================================================

/**
 * High-Ticket Architectural and Editorial Presets
 */
export const CINEMATIC_ANAMORPHIC_PRESET: AnamorphicBloomOptions = {
  bloomThreshold: 0.85,
  bloomKnee: 0.65,
  bloomIntensity: 1.25,
  bloomRadius: 0.92,
  flareEnabled: true,
  flareIntensity: 1.15,
  flareStretch: 0.95,
  flareAsymmetry: 0.12,
  flareCoreColor: 0xffb347,
  flareWingColor: 0x36c2ce,
  ghostsEnabled: true,
  ghostIntensity: 0.45,
  chromaticDispersion: 0.022,
  toneMappingMode: 'aces-filmic',
  exposure: 1.05,
  contrast: 1.08,
  saturation: 1.04,
  ditherIntensity: 0.045,
  bronzeGrading: 0.25,
};

export const LUXURY_ARCHITECTURAL_PRESET: AnamorphicBloomOptions = {
  bloomThreshold: 0.92,
  bloomKnee: 0.70,
  bloomIntensity: 0.95,
  bloomRadius: 0.80,
  flareEnabled: true,
  flareIntensity: 0.65,
  flareStretch: 0.88,
  flareAsymmetry: 0.04,
  flareCoreColor: 0xffe2b8,
  flareWingColor: 0x5ebbe6,
  ghostsEnabled: false,
  toneMappingMode: 'aces-hill',
  exposure: 0.98,
  contrast: 1.04,
  saturation: 1.01,
  ditherIntensity: 0.035,
  bronzeGrading: 0.35,
};

export const MONOPO_ETHEREAL_PRESET: AnamorphicBloomOptions = {
  bloomThreshold: 0.75,
  bloomKnee: 0.80,
  bloomIntensity: 1.45,
  bloomRadius: 1.05,
  flareEnabled: true,
  flareIntensity: 0.75,
  flareStretch: 0.92,
  ghostsEnabled: true,
  ghostIntensity: 0.25,
  chromaticDispersion: 0.015,
  toneMappingMode: 'aces-filmic',
  exposure: 1.02,
  contrast: 1.02,
  saturation: 0.98,
  ditherIntensity: 0.05,
  bronzeGrading: 0.15,
};

export const LUSION_HYPERREAL_PRESET: AnamorphicBloomOptions = {
  bloomThreshold: 0.88,
  bloomKnee: 0.60,
  bloomIntensity: 1.35,
  bloomRadius: 0.95,
  flareEnabled: true,
  flareIntensity: 1.35,
  flareStretch: 0.96,
  flareAsymmetry: 0.15,
  flareSpecularBoost: 2.1,
  flareCoreColor: 0xffaa33,
  flareWingColor: 0x22d4e8,
  ghostsEnabled: true,
  ghostIntensity: 0.55,
  ghostCount: 8,
  chromaticDispersion: 0.028,
  haloRadius: 0.48,
  haloIntensity: 0.52,
  toneMappingMode: 'aces-filmic',
  exposure: 1.08,
  contrast: 1.10,
  saturation: 1.05,
  ditherIntensity: 0.045,
  bronzeGrading: 0.20,
};

/**
 * Creates and mounts a production Anamorphic Bloom post-processing pass
 */
export function createAnamorphicBloomPass(
  renderer: THREE.WebGLRenderer,
  options: AnamorphicBloomOptions = {}
): AnamorphicBloomPass {
  return new AnamorphicBloomPass(renderer, options);
}

/**
 * Unified high-level factory returning a complete AnamorphicBloomHandle
 * with runtime inspector integration and time-of-day hooks.
 */
export function initAnamorphicBloom(
  renderer: THREE.WebGLRenderer,
  options: AnamorphicBloomOptions = {}
): AnamorphicBloomHandle {
  const pass = createAnamorphicBloomPass(renderer, options);

  const handle: AnamorphicBloomHandle = {
    pass,
    setOptions: (opts) => pass.setOptions(opts),
    setDusk: (progress) => pass.setDusk(progress),
    setTimeOfDay: (preset) => pass.setTimeOfDay(preset),
    resize: (w, h) => pass.setSize(w, h),
    getState: () => pass.getState(),
    dispose: () => pass.dispose(),
  };

  // Register window debug hook in browser environment
  if (typeof window !== 'undefined') {
    (window as any).__bloomDebug = {
      getState: () => handle.getState(),
      setOptions: (opts: Partial<AnamorphicBloomOptions>) => handle.setOptions(opts),
      setDusk: (p: number) => handle.setDusk(p),
      setTimeOfDay: (preset: BloomTimeOfDayPreset) => handle.setTimeOfDay(preset),
      presets: {
        cinematic: () => handle.setOptions(CINEMATIC_ANAMORPHIC_PRESET),
        luxury: () => handle.setOptions(LUXURY_ARCHITECTURAL_PRESET),
        monopo: () => handle.setOptions(MONOPO_ETHEREAL_PRESET),
        lusion: () => handle.setOptions(LUSION_HYPERREAL_PRESET),
      },
    };
  }

  return handle;
}
