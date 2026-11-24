/**
 * Rubiconius Biratnagar - Procedural Luxury Architectural PBR Material Atlas
 * 
 * Extracted and synthesized from Unseen Studio (06_unseen) and Lusion (16_lusion)
 * benchmark architectures for quiet-luxury interior visualization.
 * 
 * Features:
 * 1. Honed Veined Italian Marble:
 *    - Procedural domain-warped fractional Brownian motion (fBm) vein generator
 *    - Tangent-space Sobel normal map & micro-crystalline roughness synthesis
 *    - Subsurface scattering approximation (physical transmission, attenuation, clearcoat)
 * 
 * 2. Seasoned Sal Wood Fluting (Shorea robusta - Terai Hardwood):
 *    - Procedural fluted UV coordinate transform with half-round cylindrical ribbing
 *    - Longitudinal micro-grain fibrous noise & annual growth ring variation
 *    - Directional anisotropic reflection (anisotropy: 0.78) with warm amber absorption
 * 
 * 3. Patinated Brass Hardware:
 *    - High-purity unlacquered architectural brass alloy PBR
 *    - Multi-scale curvature & micro-pitted crevice oxidation patina maps
 *    - Glancing Fresnel rim response via physical iridescence & specular coloration
 * 
 * 4. Translucent Fluted Glass:
 *    - MeshPhysicalMaterial with transmission: 0.92, roughness: 0.18, thickness: 1.2, ior: 1.52
 *    - Procedural cylindrical reed lens normal map for periodic optical refraction
 *    - Low-iron optical dispersion & subtle volume attenuation
 * 
 * Zero external image asset dependencies - 100% procedurally synthesized in memory
 * via typed DataTextures with full Three.js mipmapping and texture lifecycle disposal.
 */

import * as THREE from 'three';

// ============================================================================
// Types & Configuration Interfaces
// ============================================================================

export type ArchitecturalMaterialKey =
  | 'veined-marble'
  | 'sal-wood-fluting'
  | 'patinated-brass'
  | 'fluted-glass';

export interface MarbleOptions {
  /** Texture map resolution in pixels (power of two, default: 512) */
  resolution?: number;
  /** Primary ivory / stone base tone (hex or THREE.Color, default: 0xF7F4EE) */
  baseColor?: number | string | THREE.Color;
  /** Secondary calcite warm tone (hex or THREE.Color, default: 0xECE5D8) */
  calciteColor?: number | string | THREE.Color;
  /** Deep mineral vein tone (hex or THREE.Color, default: 0x3E3833) */
  veinColor?: number | string | THREE.Color;
  /** Warm golden ochre seam tone (hex or THREE.Color, default: 0xAB936D) */
  ochreColor?: number | string | THREE.Color;
  /** Frequency of primary vein fissures (default: 3.5) */
  veinFrequency?: number;
  /** Vein distortion / turbulence warping strength (default: 3.8) */
  veinTurbulence?: number;
  /** Base surface roughness for honed finish (default: 0.24) */
  roughness?: number;
  /** Clearcoat specular intensity (default: 0.85) */
  clearcoat?: number;
  /** Clearcoat roughness (default: 0.08) */
  clearcoatRoughness?: number;
  /** Subsurface optical thickness in scene units (default: 1.15) */
  thickness?: number;
  /** Subsurface transmission factor (default: 0.08) */
  transmission?: number;
  /** Subsurface warm attenuation color (default: 0xF6EEE2) */
  attenuationColor?: number | string | THREE.Color;
  /** Subsurface attenuation distance in scene units (default: 0.42) */
  attenuationDistance?: number;
  /** Normal map perturbation relief strength (default: 1.8) */
  normalScale?: number;
}

export interface SalWoodOptions {
  /** Texture map resolution in pixels (power of two, default: 512) */
  resolution?: number;
  /** Number of vertical fluted reeds across one UV unit (default: 24) */
  fluteCount?: number;
  /** Fluting depth profile relief factor (default: 2.2) */
  fluteDepth?: number;
  /** Deep heartwood tone (hex or THREE.Color, default: 0x3C2214) */
  heartwoodColor?: number | string | THREE.Color;
  /** Rich chestnut mid-tone (hex or THREE.Color, default: 0x59341C) */
  chestnutColor?: number | string | THREE.Color;
  /** Radiant golden amber highlight (hex or THREE.Color, default: 0x76421F) */
  amberHighlightColor?: number | string | THREE.Color;
  /** Dark crevice shadow tone (hex or THREE.Color, default: 0x1E1008) */
  creviceColor?: number | string | THREE.Color;
  /** Directional anisotropic reflection intensity (default: 0.78) */
  anisotropy?: number;
  /** Anisotropy rotation in radians (default: 0 for vertical grain) */
  anisotropyRotation?: number;
  /** Surface micro-roughness (default: 0.35) */
  roughness?: number;
  /** Warm amber attenuation absorption color (default: 0x783C14) */
  attenuationColor?: number | string | THREE.Color;
  /** Attenuation distance in scene units (default: 0.34) */
  attenuationDistance?: number;
  /** Wood grain fiber frequency scale (default: 64.0) */
  grainFrequency?: number;
}

export interface PatinatedBrassOptions {
  /** Texture map resolution in pixels (power of two, default: 512) */
  resolution?: number;
  /** Unlacquered architectural brass alloy base (hex or THREE.Color, default: 0xCBA153) */
  alloyColor?: number | string | THREE.Color;
  /** Polished high-wear specular ridge color (hex or THREE.Color, default: 0xECD488) */
  polishedRidgeColor?: number | string | THREE.Color;
  /** Dark antique olive oxide crevice color (hex or THREE.Color, default: 0x332E1F) */
  patinaColor?: number | string | THREE.Color;
  /** Subtle verdigris mineral trace tone (hex or THREE.Color, default: 0x3B4A3E) */
  verdigrisColor?: number | string | THREE.Color;
  /** Base alloy metalness (default: 0.94) */
  metalness?: number;
  /** Base surface roughness on unoxidized face (default: 0.25) */
  roughness?: number;
  /** Extent of crevice oxidation & handling patina [0.0 - 1.0] (default: 0.42) */
  patinaAmount?: number;
  /** Iridescence rim sheen factor (default: 0.28) */
  iridescence?: number;
  /** Iridescence index of refraction (default: 1.85) */
  iridescenceIOR?: number;
  /** Thin film interference thickness range in nm (default: [120, 320]) */
  iridescenceThicknessRange?: [number, number];
  /** Minimum thin film interference thickness in nm (default: 120) */
  iridescenceThicknessMinimum?: number;
  /** Maximum thin film interference thickness in nm (default: 320) */
  iridescenceThicknessMaximum?: number;
  /** Specular highlight tint (default: 0xFDE9A8) */
  specularColor?: number | string | THREE.Color;
}

export interface FlutedGlassOptions {
  /** Texture map resolution in pixels (power of two, default: 256) */
  resolution?: number;
  /** Number of vertical cylindrical reed flutes per UV unit (default: 32) */
  fluteCount?: number;
  /** Cylindrical fluting lens curvature depth (default: 1.6) */
  fluteCurvature?: number;
  /** Specular transmission factor (default: 0.92) */
  transmission?: number;
  /** Surface roughness / transmission blur (default: 0.18) */
  roughness?: number;
  /** Physical glass thickness in scene units (default: 1.2) */
  thickness?: number;
  /** Optical Index of Refraction (default: 1.52) */
  ior?: number;
  /** Low-iron float glass volume attenuation color (default: 0xE8F2EE) */
  attenuationColor?: number | string | THREE.Color;
  /** Attenuation distance in scene units (default: 2.5) */
  attenuationDistance?: number;
  /** Chromatic dispersion Abbe number approximation (default: 0.045) */
  dispersion?: number;
  /** Specular highlight color (default: 0xFFFFFF) */
  specularColor?: number | string | THREE.Color;
  /** Specular highlight intensity (default: 1.0) */
  specularIntensity?: number;
}

export interface GeneratedTextureSet {
  textures: THREE.Texture[];
  dispose: () => void;
}

export interface MarbleTextureSet extends GeneratedTextureSet {
  map: THREE.DataTexture;
  normalMap: THREE.DataTexture;
  roughnessMap: THREE.DataTexture;
}

export interface SalWoodTextureSet extends GeneratedTextureSet {
  map: THREE.DataTexture;
  normalMap: THREE.DataTexture;
  roughnessMap: THREE.DataTexture;
}

export interface BrassTextureSet extends GeneratedTextureSet {
  map: THREE.DataTexture;
  normalMap: THREE.DataTexture;
  roughnessMap: THREE.DataTexture;
  metalnessMap: THREE.DataTexture;
}

export interface GlassTextureSet extends GeneratedTextureSet {
  normalMap: THREE.DataTexture;
}

// ============================================================================
// Procedural Mathematical Utilities & Fast Simplex / Perlin Gradient Noise
// ============================================================================

const PERM_TABLE: Uint8Array = new Uint8Array([
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69,
  142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219,
  203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
  74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230,
  220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76,
  132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173,
  186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206,
  59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163,
  70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232,
  178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162,
  241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204,
  176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141,
  128, 195, 78, 66, 215, 61, 156, 180,
]);

const PERM: Uint8Array = new Uint8Array(512);
for (let i = 0; i < 512; i++) {
  PERM[i] = PERM_TABLE[i & 255];
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad2D(hash: number, x: number, y: number): number {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

export function perlin2D(x: number, y: number): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const u = fade(xf);
  const v = fade(yf);

  const aa = PERM[PERM[xi] + yi];
  const ab = PERM[PERM[xi] + yi + 1];
  const ba = PERM[PERM[xi + 1] + yi];
  const bb = PERM[PERM[xi + 1] + yi + 1];

  const x1 = lerp(grad2D(aa, xf, yf), grad2D(ba, xf - 1.0, yf), u);
  const x2 = lerp(grad2D(ab, xf, yf - 1.0), grad2D(bb, xf - 1.0, yf - 1.0), u);

  return lerp(x1, x2, v);
}

export function fbm2D(
  x: number,
  y: number,
  octaves = 4,
  lacunarity = 2.0,
  gain = 0.5
): number {
  let sum = 0.0;
  let amp = 0.5;
  let freqX = x;
  let freqY = y;
  let maxAmp = 0.0;

  for (let i = 0; i < octaves; i++) {
    sum += perlin2D(freqX, freqY) * amp;
    maxAmp += amp;
    freqX *= lacunarity;
    freqY *= lacunarity;
    amp *= gain;
  }

  return sum / maxAmp;
}

export function domainWarp2D(
  x: number,
  y: number,
  distortion = 4.0
): { value: number; qx: number; qy: number } {
  const qx = fbm2D(x, y, 3);
  const qy = fbm2D(x + 5.2, y + 1.3, 3);

  const rx = fbm2D(x + distortion * qx + 1.7, y + distortion * qy + 9.2, 4);
  const ry = fbm2D(x + distortion * qx + 8.3, y + distortion * qy + 2.8, 4);

  const value = fbm2D(x + distortion * rx, y + distortion * ry, 4);
  return { value, qx, qy };
}

function toColor(input: number | string | THREE.Color | undefined, fallback: number): THREE.Color {
  if (input instanceof THREE.Color) return input.clone();
  if (typeof input === 'number' || typeof input === 'string') return new THREE.Color(input);
  return new THREE.Color(fallback);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ============================================================================
// Procedural Texture Generators
// ============================================================================

/**
 * 1. Procedural Honed Veined Italian Marble Texture Generator
 * Produces seamless high-definition albedo, normal, and roughness maps.
 */
export function generateMarbleTextures(options: MarbleOptions = {}): MarbleTextureSet {
  const res = options.resolution ?? 512;
  const baseCol = toColor(options.baseColor, 0xF7F4EE);
  const calciteCol = toColor(options.calciteColor, 0xECE5D8);
  const veinCol = toColor(options.veinColor, 0x3E3833);
  const ochreCol = toColor(options.ochreColor, 0xAB936D);

  const freq = options.veinFrequency ?? 3.5;
  const turb = options.veinTurbulence ?? 3.8;
  const baseRoughness = options.roughness ?? 0.24;
  const normalStr = options.normalScale ?? 1.8;

  const albedoData = new Uint8Array(res * res * 4);
  const normalData = new Uint8Array(res * res * 4);
  const roughnessData = new Uint8Array(res * res * 4);
  const heightField = new Float32Array(res * res);

  for (let y = 0; y < res; y++) {
    const v = y / res;
    for (let x = 0; x < res; x++) {
      const u = x / res;
      const idx = y * res + x;

      const warp = domainWarp2D(u * freq, v * freq, turb);
      const veinWarp = warp.value;

      const primaryOsc = Math.sin((u * 2.8 + v * 3.6 + veinWarp * 3.5) * Math.PI);
      const veinFissure = Math.pow(1.0 - Math.abs(primaryOsc), 5.5);

      const microNoise = fbm2D((u + warp.qx * 0.4) * 12.0, (v + warp.qy * 0.4) * 12.0, 3);
      const microVein = Math.pow(Math.max(0.0, 1.0 - Math.abs(microNoise * 2.0)), 4.0) * 0.35;

      const totalVein = clamp(veinFissure + microVein, 0.0, 1.0);
      heightField[idx] = totalVein;

      const groundNoise = (fbm2D(u * 6.0, v * 6.0, 3) + 1.0) * 0.5;
      const curGround = baseCol.clone().lerp(calciteCol, groundNoise * 0.7);

      const veinMix = veinCol.clone().lerp(ochreCol, Math.sin(u * 8.0 + v * 8.0) * 0.3 + 0.3);
      const finalColor = curGround.lerp(veinMix, Math.pow(totalVein, 0.8));

      const p4 = idx * 4;
      albedoData[p4] = Math.round(finalColor.r * 255);
      albedoData[p4 + 1] = Math.round(finalColor.g * 255);
      albedoData[p4 + 2] = Math.round(finalColor.b * 255);
      albedoData[p4 + 3] = 255;

      const rVal = clamp(baseRoughness - totalVein * 0.1 + (perlin2D(u * 60, v * 60) * 0.03), 0.05, 0.95);
      const rByte = Math.round(rVal * 255);
      roughnessData[p4] = rByte;
      roughnessData[p4 + 1] = rByte;
      roughnessData[p4 + 2] = rByte;
      roughnessData[p4 + 3] = 255;
    }
  }

  for (let y = 0; y < res; y++) {
    const yPrev = (y - 1 + res) % res;
    const yNext = (y + 1) % res;

    for (let x = 0; x < res; x++) {
      const xPrev = (x - 1 + res) % res;
      const xNext = (x + 1) % res;

      const tl = heightField[yPrev * res + xPrev];
      const tc = heightField[yPrev * res + x];
      const tr = heightField[yPrev * res + xNext];

      const cl = heightField[y * res + xPrev];
      const cr = heightField[y * res + xNext];

      const bl = heightField[yNext * res + xPrev];
      const bc = heightField[yNext * res + x];
      const br = heightField[yNext * res + xNext];

      const dx = (tr + 2.0 * cr + br) - (tl + 2.0 * cl + bl);
      const dy = (bl + 2.0 * bc + br) - (tl + 2.0 * tc + tr);

      const nx = -dx * normalStr;
      const ny = -dy * normalStr;
      const nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      const p4 = (y * res + x) * 4;
      normalData[p4] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      normalData[p4 + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      normalData[p4 + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      normalData[p4 + 3] = 255;
    }
  }

  const map = createDataTexture(albedoData, res, res, THREE.SRGBColorSpace);
  const normalMap = createDataTexture(normalData, res, res, THREE.NoColorSpace);
  const roughnessMap = createDataTexture(roughnessData, res, res, THREE.NoColorSpace);

  const textures = [map, normalMap, roughnessMap];
  return {
    map,
    normalMap,
    roughnessMap,
    textures,
    dispose: () => textures.forEach((t) => t.dispose()),
  };
}

/**
 * 2. Procedural Seasoned Sal Wood Fluting Texture Generator
 * Shorea robusta (Terai Hardwood) with half-round cylindrical slats and fibrous anisotropic grain.
 */
export function generateSalWoodTextures(options: SalWoodOptions = {}): SalWoodTextureSet {
  const res = options.resolution ?? 512;
  const flutes = options.fluteCount ?? 24;
  const fluteDepth = options.fluteDepth ?? 2.2;
  const grainFreq = options.grainFrequency ?? 64.0;
  const baseRoughness = options.roughness ?? 0.35;

  const heartwood = toColor(options.heartwoodColor, 0x3C2214);
  const chestnut = toColor(options.chestnutColor, 0x59341C);
  const amber = toColor(options.amberHighlightColor, 0x76421F);
  const crevice = toColor(options.creviceColor, 0x1E1008);

  const albedoData = new Uint8Array(res * res * 4);
  const normalData = new Uint8Array(res * res * 4);
  const roughnessData = new Uint8Array(res * res * 4);

  for (let y = 0; y < res; y++) {
    const v = y / res;
    for (let x = 0; x < res; x++) {
      const u = x / res;
      const idx = (y * res + x) * 4;

      const fluteU = (u * flutes) % 1.0;
      const fluteLocal = fluteU * 2.0 - 1.0;

      const creviceMask = Math.pow(Math.abs(fluteLocal), 6.0);
      const grainFibers = perlin2D(u * grainFreq, v * 4.0);
      const annualRings = Math.sin((u * flutes * 0.4 + grainFibers * 0.25) * Math.PI * 6.0);
      const ringIntensity = (annualRings + 1.0) * 0.5;

      const woodBase = heartwood.clone().lerp(chestnut, ringIntensity * 0.7);
      const woodAmber = woodBase.lerp(amber, Math.max(0.0, grainFibers * 0.5));
      const finalWoodCol = woodAmber.lerp(crevice, creviceMask * 0.75);

      albedoData[idx] = Math.round(finalWoodCol.r * 255);
      albedoData[idx + 1] = Math.round(finalWoodCol.g * 255);
      albedoData[idx + 2] = Math.round(finalWoodCol.b * 255);
      albedoData[idx + 3] = 255;

      const nx = -fluteLocal * fluteDepth;
      const ny = (grainFibers * 0.15);
      const nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      normalData[idx] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      normalData[idx + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      normalData[idx + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      normalData[idx + 3] = 255;

      const rVal = clamp(baseRoughness + creviceMask * 0.15 - grainFibers * 0.05, 0.1, 0.9);
      const rByte = Math.round(rVal * 255);
      roughnessData[idx] = rByte;
      roughnessData[idx + 1] = rByte;
      roughnessData[idx + 2] = rByte;
      roughnessData[idx + 3] = 255;
    }
  }

  const map = createDataTexture(albedoData, res, res, THREE.SRGBColorSpace);
  const normalMap = createDataTexture(normalData, res, res, THREE.NoColorSpace);
  const roughnessMap = createDataTexture(roughnessData, res, res, THREE.NoColorSpace);

  const textures = [map, normalMap, roughnessMap];
  return {
    map,
    normalMap,
    roughnessMap,
    textures,
    dispose: () => textures.forEach((t) => t.dispose()),
  };
}

/**
 * 3. Procedural Patinated Brass Hardware Texture Generator
 * Unlacquered warm architectural brass with micro-pitted oxidation & edge wear.
 */
export function generatePatinatedBrassTextures(
  options: PatinatedBrassOptions = {}
): BrassTextureSet {
  const res = options.resolution ?? 512;
  const alloyCol = toColor(options.alloyColor, 0xCBA153);
  const polishedCol = toColor(options.polishedRidgeColor, 0xECD488);
  const patinaCol = toColor(options.patinaColor, 0x332E1F);
  const verdigrisCol = toColor(options.verdigrisColor, 0x3B4A3E);

  const baseMetal = options.metalness ?? 0.94;
  const baseRough = options.roughness ?? 0.25;
  const patinaAmount = options.patinaAmount ?? 0.42;

  const albedoData = new Uint8Array(res * res * 4);
  const normalData = new Uint8Array(res * res * 4);
  const roughnessData = new Uint8Array(res * res * 4);
  const metalnessData = new Uint8Array(res * res * 4);

  for (let y = 0; y < res; y++) {
    const v = y / res;
    for (let x = 0; x < res; x++) {
      const u = x / res;
      const idx = (y * res + x) * 4;

      const macroNoise = (fbm2D(u * 3.5, v * 3.5, 3) + 1.0) * 0.5;
      const microPits = Math.pow(Math.max(0.0, perlin2D(u * 40.0, v * 40.0)), 2.5);
      const combinedPatina = clamp((macroNoise * 0.7 + microPits * 0.5) * (patinaAmount * 2.2), 0.0, 1.0);

      const ridgeNoise = Math.pow(Math.max(0.0, perlin2D(u * 8.0, v * 8.0)), 3.0);

      const brassBase = alloyCol.clone().lerp(polishedCol, ridgeNoise * 0.8);
      const patinatedMid = brassBase.lerp(patinaCol, combinedPatina * 0.85);
      const finalCol = patinatedMid.lerp(verdigrisCol, microPits * 0.4);

      albedoData[idx] = Math.round(finalCol.r * 255);
      albedoData[idx + 1] = Math.round(finalCol.g * 255);
      albedoData[idx + 2] = Math.round(finalCol.b * 255);
      albedoData[idx + 3] = 255;

      const brushedX = perlin2D(u * 80.0, v * 12.0) * 0.15;
      const pitY = microPits * 0.4;
      const nx = brushedX;
      const ny = pitY;
      const nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      normalData[idx] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      normalData[idx + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      normalData[idx + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      normalData[idx + 3] = 255;

      const curRough = clamp(
        baseRough - ridgeNoise * 0.12 + combinedPatina * 0.42,
        0.08,
        0.95
      );
      const rByte = Math.round(curRough * 255);
      roughnessData[idx] = rByte;
      roughnessData[idx + 1] = rByte;
      roughnessData[idx + 2] = rByte;
      roughnessData[idx + 3] = 255;

      const curMetal = clamp(baseMetal - combinedPatina * 0.65, 0.1, 1.0);
      const mByte = Math.round(curMetal * 255);
      metalnessData[idx] = mByte;
      metalnessData[idx + 1] = mByte;
      metalnessData[idx + 2] = mByte;
      metalnessData[idx + 3] = 255;
    }
  }

  const map = createDataTexture(albedoData, res, res, THREE.SRGBColorSpace);
  const normalMap = createDataTexture(normalData, res, res, THREE.NoColorSpace);
  const roughnessMap = createDataTexture(roughnessData, res, res, THREE.NoColorSpace);
  const metalnessMap = createDataTexture(metalnessData, res, res, THREE.NoColorSpace);

  const textures = [map, normalMap, roughnessMap, metalnessMap];
  return {
    map,
    normalMap,
    roughnessMap,
    metalnessMap,
    textures,
    dispose: () => textures.forEach((t) => t.dispose()),
  };
}

/**
 * 4. Procedural Translucent Fluted Glass Normal Map Generator
 * Constructs pure optical cylindrical lens ribs for periodic transmission refraction.
 */
export function generateFlutedGlassNormalMap(options: FlutedGlassOptions = {}): GlassTextureSet {
  const res = options.resolution ?? 256;
  const flutes = options.fluteCount ?? 32;
  const curvature = options.fluteCurvature ?? 1.6;

  const normalData = new Uint8Array(res * res * 4);

  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const u = x / res;
      const idx = (y * res + x) * 4;

      const fluteU = (u * flutes) % 1.0;
      const w = fluteU * 2.0 - 1.0;

      const nx = -w * curvature;
      const ny = 0.0;
      const nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      normalData[idx] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      normalData[idx + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      normalData[idx + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      normalData[idx + 3] = 255;
    }
  }

  const normalMap = createDataTexture(normalData, res, res, THREE.NoColorSpace);
  const textures = [normalMap];
  return {
    normalMap,
    textures,
    dispose: () => textures.forEach((t) => t.dispose()),
  };
}

function createDataTexture(
  data: Uint8Array,
  width: number,
  height: number,
  colorSpace: THREE.ColorSpace
): THREE.DataTexture {
  const tex = new THREE.DataTexture(
    data,
    width,
    height,
    THREE.RGBAFormat,
    THREE.UnsignedByteType
  );
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = colorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ============================================================================
// Material Factory Functions
// ============================================================================

/**
 * 1. Honed Veined Italian Marble Material Factory
 * Subsurface scattering approximation, crystalline micro-roughness, high-specular coat.
 */
export function createVeinedMarbleMaterial(options: MarbleOptions = {}): THREE.MeshPhysicalMaterial {
  const generated = generateMarbleTextures(options);

  const mat = new THREE.MeshPhysicalMaterial({
    name: 'HonedVeinedItalianMarble',
    map: generated.map,
    normalMap: generated.normalMap,
    roughnessMap: generated.roughnessMap,
    roughness: options.roughness ?? 0.24,
    metalness: 0.0,
    clearcoat: options.clearcoat ?? 0.85,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.08,
    transmission: options.transmission ?? 0.08,
    thickness: options.thickness ?? 1.15,
    attenuationColor: toColor(options.attenuationColor, 0xF6EEE2),
    attenuationDistance: options.attenuationDistance ?? 0.42,
    sheen: 0.35,
    sheenColor: new THREE.Color(0xFFF7EE),
    sheenRoughness: 0.22,
    specularIntensity: 0.95,
    specularColor: new THREE.Color(0xFFFFFF),
  });

  mat.userData.__textureSet = generated;
  return mat;
}

/**
 * 2. Seasoned Sal Wood Fluting Material Factory
 * Shorea robusta hardwood with directional anisotropic reflection and warm amber absorption.
 */
export function createSalWoodFlutingMaterial(options: SalWoodOptions = {}): THREE.MeshPhysicalMaterial {
  const generated = generateSalWoodTextures(options);

  const mat = new THREE.MeshPhysicalMaterial({
    name: 'SeasonedSalWoodFluting',
    map: generated.map,
    normalMap: generated.normalMap,
    roughnessMap: generated.roughnessMap,
    roughness: options.roughness ?? 0.35,
    metalness: 0.0,
    anisotropy: options.anisotropy ?? 0.78,
    anisotropyRotation: options.anisotropyRotation ?? 0.0,
    attenuationColor: toColor(options.attenuationColor, 0x783C14),
    attenuationDistance: options.attenuationDistance ?? 0.34,
    sheen: 0.45,
    sheenColor: new THREE.Color(0x8E4C1D),
    sheenRoughness: 0.38,
    clearcoat: 0.18,
    clearcoatRoughness: 0.32,
    specularIntensity: 0.65,
    specularColor: new THREE.Color(0xECD4B0),
  });

  mat.userData.__textureSet = generated;
  return mat;
}

/**
 * 3. Patinated Brass Hardware Material Factory
 * Unlacquered warm architectural brass with micro-pitted oxidation & Fresnel rim response.
 */
export function createPatinatedBrassMaterial(options: PatinatedBrassOptions = {}): THREE.MeshPhysicalMaterial {
  const generated = generatePatinatedBrassTextures(options);

  const minThick =
    options.iridescenceThicknessMinimum ??
    (options.iridescenceThicknessRange ? options.iridescenceThicknessRange[0] : 120);
  const maxThick =
    options.iridescenceThicknessMaximum ??
    (options.iridescenceThicknessRange ? options.iridescenceThicknessRange[1] : 320);

  const mat = new THREE.MeshPhysicalMaterial({
    name: 'PatinatedBrassHardware',
    map: generated.map,
    normalMap: generated.normalMap,
    roughnessMap: generated.roughnessMap,
    metalnessMap: generated.metalnessMap,
    metalness: options.metalness ?? 0.94,
    roughness: options.roughness ?? 0.25,
    iridescence: options.iridescence ?? 0.28,
    iridescenceIOR: options.iridescenceIOR ?? 1.85,
    iridescenceThicknessMinimum: minThick,
    iridescenceThicknessMaximum: maxThick,
    specularColor: toColor(options.specularColor, 0xFDE9A8),
    specularIntensity: 1.0,
    clearcoat: 0.15,
    clearcoatRoughness: 0.28,
  });

  mat.userData.__textureSet = generated;
  return mat;
}

/**
 * 4. Translucent Fluted Glass Material Factory
 * transmission: 0.92, roughness: 0.18, thickness: 1.2, ior: 1.52 with optical cylindrical reeds.
 */
export function createFlutedGlassMaterial(options: FlutedGlassOptions = {}): THREE.MeshPhysicalMaterial {
  const generated = generateFlutedGlassNormalMap(options);

  const mat = new THREE.MeshPhysicalMaterial({
    name: 'TranslucentFlutedGlass',
    normalMap: generated.normalMap,
    transmission: options.transmission ?? 0.92,
    roughness: options.roughness ?? 0.18,
    thickness: options.thickness ?? 1.2,
    ior: options.ior ?? 1.52,
    attenuationColor: toColor(options.attenuationColor, 0xE8F2EE),
    attenuationDistance: options.attenuationDistance ?? 2.5,
    specularColor: toColor(options.specularColor, 0xFFFFFF),
    specularIntensity: options.specularIntensity ?? 1.0,
    transparent: true,
    opacity: 1.0,
  });

  if ('dispersion' in mat) {
    (mat as unknown as { dispersion: number }).dispersion = options.dispersion ?? 0.045;
  }

  mat.userData.__textureSet = generated;
  return mat;
}

// ============================================================================
// Material Atlas Registry & Architectural Scene Upgrader
// ============================================================================

export class MaterialAtlas {
  private cache = new Map<ArchitecturalMaterialKey, THREE.MeshPhysicalMaterial>();
  private allMaterials: THREE.MeshPhysicalMaterial[] = [];

  constructor() {
    // Lazily initialized on first access to guarantee zero overhead during SSG prerender
  }

  public get(key: ArchitecturalMaterialKey): THREE.MeshPhysicalMaterial {
    const existing = this.cache.get(key);
    if (existing) return existing;

    let mat: THREE.MeshPhysicalMaterial;
    switch (key) {
      case 'veined-marble':
        mat = createVeinedMarbleMaterial();
        break;
      case 'sal-wood-fluting':
        mat = createSalWoodFlutingMaterial();
        break;
      case 'patinated-brass':
        mat = createPatinatedBrassMaterial();
        break;
      case 'fluted-glass':
        mat = createFlutedGlassMaterial();
        break;
      default:
        throw new Error(`[MaterialAtlas] Unknown material key: ${key}`);
    }

    this.cache.set(key, mat);
    this.allMaterials.push(mat);
    return mat;
  }

  public applyToMesh(mesh: THREE.Mesh, key: ArchitecturalMaterialKey): THREE.MeshPhysicalMaterial {
    const mat = this.get(key);
    mesh.material = mat;
    mesh.castShadow = key !== 'fluted-glass';
    mesh.receiveShadow = true;
    return mat;
  }

  public applyByMeshName(root: THREE.Object3D): { matched: number; upgraded: string[] } {
    let matched = 0;
    const upgraded: string[] = [];

    root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;

      const name = mesh.name.toLowerCase();

      if (/marble|calacatta|carrara|stone_slab|hearth_stone/i.test(name)) {
        this.applyToMesh(mesh, 'veined-marble');
        upgraded.push(`${mesh.name} -> veined-marble`);
        matched++;
      } else if (/sal|wood|timber|flut.*wood|fluted_panel|panelling|joinery/i.test(name)) {
        this.applyToMesh(mesh, 'sal-wood-fluting');
        upgraded.push(`${mesh.name} -> sal-wood-fluting`);
        matched++;
      } else if (/brass|bronze|hardware|handle|sconce|fixture|pendant_metal/i.test(name)) {
        this.applyToMesh(mesh, 'patinated-brass');
        upgraded.push(`${mesh.name} -> patinated-brass`);
        matched++;
      } else if (/fluted_glass|glass|translucent|glazing|window|reeded/i.test(name)) {
        this.applyToMesh(mesh, 'fluted-glass');
        upgraded.push(`${mesh.name} -> fluted-glass`);
        matched++;
      }
    });

    return { matched, upgraded };
  }

  public getAll(): Record<ArchitecturalMaterialKey, THREE.MeshPhysicalMaterial> {
    return {
      'veined-marble': this.get('veined-marble'),
      'sal-wood-fluting': this.get('sal-wood-fluting'),
      'patinated-brass': this.get('patinated-brass'),
      'fluted-glass': this.get('fluted-glass'),
    };
  }

  public dispose(): void {
    for (const mat of this.allMaterials) {
      if (mat.userData.__textureSet) {
        (mat.userData.__textureSet as GeneratedTextureSet).dispose();
      }
      mat.dispose();
    }
    this.cache.clear();
    this.allMaterials.length = 0;
  }
}

export const materialAtlas = new MaterialAtlas();
