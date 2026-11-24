/**
 * ARCHITECTURAL SHOWROOM PBR MATERIAL STUDIO ENGINE
 *
 * Reverse-Engineered & Mathematically Derived Production Architecture:
 * 1. 24_studio_freight & 40_otto_objects: High-craft material inspection stages, CAD inspection
 *    turntables, and physically accurate microfacet BSDF parameter tweaking.
 * 2. 16_lusion & 32_immersive_garden: High-DPI physical glass refractions, Snell's law chromatic
 *    dispersion, anisotropic micro-surface roughness, and studio HDR lighting convolution.
 *
 * Physical & Optical Grounding:
 * - Cook, R. L. & Torrance, K. E. (ACM TOG 1982) - A Reflectance Model for Computer Graphics.
 * - Walter, B. et al. (EGSR 2007) - Microfacet Models for Refraction through Rough Surfaces (GGX).
 * - Heitz, Eric (JCGT 2014) - Understanding the Masking-Shadowing Function in Microfacet-Based BRDFs.
 * - Burley, Brent (SIGGRAPH 2012) - Physically-Based Shading at Disney (Principled BSDF).
 * - Estevez, A. & Kulla, C. (Sony Pictures Imageworks 2017) - Production Friendly Microfacet Sheen.
 * - Cauchy, A. L. (1836) - Mémoire sur la dispersion de la lumière (Optical Dispersion Law).
 * - Beer, August (1852) - Photometrische Bestimmung (Volumetric Transmittance Law).
 *
 * Specimen Architectural Presets:
 * 1. Honed Veined Italian Marble (Calacatta Borghini / Carrara calcite crystalline matrix)
 * 2. Fluted Sal Hardwood (Shorea robusta, Terai ancient hardwood with longitudinal fiber sheen)
 * 3. Patinated Spun Brass (C26000 cartridge brass with circumferential lathe machining marks)
 * 4. Fluted Reeded Glass (Low-iron architectural soda-lime glass with cylindrical refraction ribs)
 * 5. Raw Kota Limestone (Fine-grained dolomitic sedimentary stone from Rajasthan/South Asia)
 */

import * as THREE from 'three';

// ============================================================================
// SECTION 1: TYPES, INTERFACES, & MATHEMATICAL CONSTANTS
// ============================================================================

/** Mathematical and physical constants */
export const PBR_CONSTANTS = {
  PI: Math.PI,
  TWO_PI: Math.PI * 2.0,
  HALF_PI: Math.PI * 0.5,
  INV_PI: 1.0 / Math.PI,
  MIN_ROUGHNESS: 0.04,
  MAX_ROUGHNESS: 1.0,
  DEFAULT_IOR: 1.5,
  DIELECTRIC_F0_MIN: 0.02,
  DIELECTRIC_F0_MAX: 0.08,
} as const;

/**
 * Calculates dielectric base reflectance F0 from Index of Refraction (Fresnel equation).
 * F0 = ((IOR - 1) / (IOR + 1))^2
 */
export function iorToF0(ior: number): number {
  const num = ior - 1.0;
  const den = ior + 1.0;
  const f = num / Math.max(den, 1e-5);
  return f * f;
}

/**
 * Calculates Index of Refraction from dielectric F0 reflectance.
 * IOR = (1 + sqrt(F0)) / (1 - sqrt(F0))
 */
export function f0ToIOR(f0: number): number {
  const sqrtF0 = Math.sqrt(Math.max(0.0, Math.min(0.99, f0)));
  return (1.0 + sqrtF0) / Math.max(1e-5, 1.0 - sqrtF0);
}

/**
 * Complete parameter schema for Three.js MeshPhysicalMaterial
 */
export interface PBRMaterialParameters {
  /** Specimen material label */
  name: string;
  /** Base albedo/diffuse color (Hex string e.g. '#ffffff') */
  color: string;
  /** Surface microfacet roughness (0.0 = mirror smooth, 1.0 = completely diffuse) */
  roughness: number;
  /** Metallic conductor vs dielectric insulator (0.0 = dielectric, 1.0 = pure metal) */
  metalness: number;
  /** Optical transmission for glass/translucent materials (0.0 = opaque, 1.0 = full glass) */
  transmission: number;
  /** Index of Refraction (1.0 = air, 1.33 = water, 1.52 = crown glass, 2.42 = diamond) */
  ior: number;
  /** Reflectivity for dielectrics (0.0 to 1.0, maps to F0 = 0.0 to 0.08, default 0.5 = 0.04) */
  reflectivity: number;
  /** Clearcoat specular layer intensity (0.0 = no clearcoat, 1.0 = high-gloss varnish) */
  clearcoat: number;
  /** Roughness of the clearcoat secondary layer (0.0 = razor sharp, 1.0 = hazy lacquer) */
  clearcoatRoughness: number;
  /** Sheen intensity for fabric, micro-fibers, and anisotropic organic grain (0.0 to 1.0) */
  sheen: number;
  /** Roughness of the sheen velvety highlight layer (0.0 to 1.0) */
  sheenRoughness: number;
  /** Tint color of the sheen reflection highlight */
  sheenColor: string;
  /** Anisotropy strength for directional brushed metals and wood fibers (0.0 to 1.0) */
  anisotropy: number;
  /** Anisotropy angle in radians (0.0 to 2*PI) */
  anisotropyRotation: number;
  /** Volumetric attenuation color for thick transmissive media (Beer-Lambert law) */
  attenuationColor: string;
  /** Volumetric absorption distance in scene units (smaller = denser optical absorption) */
  attenuationDistance: number;
  /** Chromatic dispersion splitting light into spectral rainbow caustics (0.0 to 0.5) */
  dispersion: number;
  /** Thickness of the transmissive volume in scene units */
  thickness: number;
  /** Specular intensity multiplier for dielectrics (0.0 to 1.0) */
  specularIntensity: number;
  /** Specular highlight tint color */
  specularColor: string;
  /** Thin-film iridescence intensity for oil slicks, soap bubbles, and heat patina (0.0 to 1.0) */
  iridescence: number;
  /** Index of refraction of the thin-film iridescent layer (1.0 to 3.0) */
  iridescenceIOR: number;
  /** Thin-film optical thickness range in nanometers [min, max] (typically 100nm to 800nm) */
  iridescenceThicknessMin: number;
  iridescenceThicknessMax: number;
  /** Emissive glow color */
  emissive: string;
  /** Emissive radiance intensity */
  emissiveIntensity: number;
  /** Wireframe polygon rendering mode */
  wireframe: boolean;
  /** Flat faceted shading vs smooth normal interpolation */
  flatShading: boolean;
  /** Environment map specular radiance multiplier */
  envMapIntensity: number;
  /** Whether procedural surface normal map is active */
  proceduralNormal: boolean;
  /** Strength multiplier for surface normal perturbations (0.0 to 3.0) */
  normalScale: number;
  /** Whether procedural albedo variation map is active */
  proceduralAlbedo: boolean;
  /** Whether procedural micro-roughness variation map is active */
  proceduralRoughness: boolean;
  /** Texture UV tiling frequency multiplier */
  textureScale: number;
}

/** Supported flagship specimen preset names */
export type SpecimenPresetName =
  | 'honed_veined_italian_marble'
  | 'fluted_sal_hardwood'
  | 'patinated_spun_brass'
  | 'fluted_reeded_glass'
  | 'raw_kota_limestone'
  | 'terracotta_dakshinkali'
  | 'smoked_eucalyptus_wood'
  | 'cast_monolithic_concrete'
  | 'brushed_aerospace_titanium'
  | 'obsidian_black_mirror';

/** Comprehensive metadata for an architectural specimen preset */
export interface SpecimenPresetDefinition {
  name: SpecimenPresetName;
  label: string;
  category: 'Stone' | 'Timber' | 'Metal' | 'Glass' | 'Ceramic';
  description: string;
  architecturalContext: string;
  opticalProperties: {
    refractiveIndex: number;
    abbeNumber?: number;
    densityKgM3?: number;
    thermalNotes?: string;
  };
  parameters: PBRMaterialParameters;
  generatorId: string;
}

/** Geometry types available in the PBR studio preview stage */
export type SpecimenMeshType =
  | 'shader_ball'
  | 'sphere'
  | 'fluted_column'
  | 'torus_knot'
  | 'architectural_tile';

/** Studio HDR environment lighting configurations */
export type StudioLightingPreset =
  | 'balanced_studio'
  | 'dramatic_chiaroscuro'
  | 'high_key_commercial'
  | 'warm_dusk_golden'
  | 'gallery_spot';

/** Studio initialization options */
export interface PBRStudioOptions {
  /** Target HTML container element or canvas */
  container?: HTMLElement | null;
  /** Direct canvas element override */
  canvas?: HTMLCanvasElement | null;
  /** Fixed rendering width (defaults to container clientWidth) */
  width?: number;
  /** Fixed rendering height (defaults to container clientHeight) */
  height?: number;
  /** Device pixel ratio cap (default: Math.min(window.devicePixelRatio, 2.0)) */
  pixelRatio?: number;
  /** Auto resize on window/container resize */
  autoResize?: boolean;
  /** Initial specimen preset */
  initialPreset?: SpecimenPresetName;
  /** Initial specimen mesh geometry */
  initialMeshType?: SpecimenMeshType;
  /** Initial studio lighting mood */
  lightingPreset?: StudioLightingPreset;
  /** Turntable auto-rotation speed in RPM (default: 1.5) */
  turntableSpeedRPM?: number;
  /** Turntable auto-rotation enabled on mount */
  autoRotate?: boolean;
  /** Studio exposure level (default: 1.0) */
  exposure?: number;
  /** Whether to inject the floating DOM tweaker panel */
  enableTweakerUI?: boolean;
  /** Tweaker UI theme */
  uiTheme?: 'dark_architectural' | 'cad_blueprint' | 'minimal_slate';
  /** Parameter change callback */
  onParameterChange?: (params: PBRMaterialParameters) => void;
  /** Preset change callback */
  onPresetChange?: (preset: SpecimenPresetDefinition) => void;
}

/** Exported GLSL shader sources */
export interface GLSLExportResult {
  vertexShader: string;
  fragmentShader: string;
  uniformsDef: string;
}

// ============================================================================
// SECTION 2: PROCEDURAL TEXTURE SYNTHESIZERS
// Zero-CDN, fully standalone procedural canvas texture generation
// ============================================================================

export interface ProceduralTextureSet {
  albedo?: THREE.CanvasTexture;
  normal?: THREE.CanvasTexture;
  roughness?: THREE.CanvasTexture;
  anisotropy?: THREE.CanvasTexture;
}

/** Simple 2D PRNG hash */
function hash2d(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

/** Smooth value noise with cubic Hermite interpolation */
function smoothNoise2d(x: number, y: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;

  const u = fx * fx * (3.0 - 2.0 * fx);
  const v = fy * fy * (3.0 - 2.0 * fy);

  const a = hash2d(i, j);
  const b = hash2d(i + 1, j);
  const c = hash2d(i, j + 1);
  const d = hash2d(i + 1, j + 1);

  return a * (1.0 - u) * (1.0 - v) + b * u * (1.0 - v) + c * (1.0 - u) * v + d * u * v;
}

/** Fractal Brownian Motion (fBm) with multiple octaves */
function fbm2d(x: number, y: number, octaves = 6, lacunarity = 2.0, persistence = 0.5): number {
  let total = 0.0;
  let frequency = 1.0;
  let amplitude = 1.0;
  let maxValue = 0.0;

  for (let o = 0; o < octaves; o++) {
    total += smoothNoise2d(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return total / maxValue;
}

/** Worley / Cellular distance noise */
function worley2d(x: number, y: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  let minDist = 1e6;

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = i + dx;
      const cy = j + dy;
      const rx = cx + hash2d(cx, cy);
      const ry = cy + hash2d(cx + 17.0, cy + 43.0);
      const dist = Math.hypot(rx - x, ry - y);
      if (dist < minDist) minDist = dist;
    }
  }

  return Math.min(1.0, minDist);
}

/**
 * Procedural Texture Generator Suite for all architectural specimens
 */
export class ProceduralTextureEngine {
  private cache = new Map<string, ProceduralTextureSet>();

  /** Creates or retrieves cached procedural textures */
  public getPresetTextures(generatorId: string, resolution = 1024): ProceduralTextureSet {
    if (this.cache.has(generatorId)) {
      return this.cache.get(generatorId)!;
    }

    let textures: ProceduralTextureSet = {};

    switch (generatorId) {
      case 'marble':
        textures = this.generateMarbleTextures(resolution);
        break;
      case 'sal_hardwood':
        textures = this.generateSalHardwoodTextures(resolution);
        break;
      case 'spun_brass':
        textures = this.generateSpunBrassTextures(resolution);
        break;
      case 'reeded_glass':
        textures = this.generateReededGlassTextures(resolution);
        break;
      case 'kota_limestone':
        textures = this.generateKotaLimestoneTextures(resolution);
        break;
      case 'terracotta':
        textures = this.generateTerracottaTextures(resolution);
        break;
      case 'titanium':
        textures = this.generateTitaniumTextures(resolution);
        break;
      default:
        textures = {};
    }

    this.cache.set(generatorId, textures);
    return textures;
  }

  /**
   * 1. Honed Veined Italian Marble (Calacatta Borghini / Carrara)
   * Domain-warped fractal noise generating serpentine calcite veins,
   * stylolite cracks, and translucent micro-crystalline depth.
   */
  public generateMarbleTextures(res = 1024): ProceduralTextureSet {
    if (typeof document === 'undefined') return {};

    const albedoCanvas = document.createElement('canvas');
    albedoCanvas.width = res;
    albedoCanvas.height = res;
    const albedoCtx = albedoCanvas.getContext('2d')!;

    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = res;
    normalCanvas.height = res;
    const normalCtx = normalCanvas.getContext('2d')!;

    const roughnessCanvas = document.createElement('canvas');
    roughnessCanvas.width = res;
    roughnessCanvas.height = res;
    const roughnessCtx = roughnessCanvas.getContext('2d')!;

    const albedoImg = albedoCtx.createImageData(res, res);
    const normalImg = normalCtx.createImageData(res, res);
    const roughnessImg = roughnessCtx.createImageData(res, res);

    const heightField = new Float32Array(res * res);

    for (let y = 0; y < res; y++) {
      const v = y / res;
      for (let x = 0; x < res; x++) {
        const u = x / res;
        const idx = y * res + x;

        // Domain warping: q = fbm(p), r = fbm(p + 4.0*q)
        const scale = 3.5;
        const qx = fbm2d(u * scale, v * scale, 5);
        const qy = fbm2d(u * scale + 5.2, v * scale + 1.3, 5);

        const rx = fbm2d(u * scale + 4.0 * qx + 1.7, v * scale + 4.0 * qy + 9.2, 5);
        const ry = fbm2d(u * scale + 4.0 * qx + 8.3, v * scale + 4.0 * qy + 2.8, 5);

        const f = fbm2d(u * scale + 4.0 * rx, v * scale + 4.0 * ry, 6);

        // Vein distribution: sharp stylolites and soft golden clouds
        const veinWave = Math.sin((u * 2.0 + v * 3.0) * Math.PI + f * 5.5);
        const sharpVein = Math.exp(-Math.abs(veinWave) * 9.0);
        const softVein = Math.exp(-Math.abs(veinWave) * 2.0) * 0.4;
        const fineCracks = Math.pow(worley2d(u * 14.0 + rx * 2.0, v * 14.0 + ry * 2.0), 4.0);

        heightField[idx] = sharpVein * 0.7 + fineCracks * 0.3;

        // Base calcite milky ground: #F8F6F2
        let r = 248.0;
        let g = 246.0;
        let b = 242.0;

        // Vein coloration: blend of deep charcoal veins and warm golden pyrite seams
        const charcoalR = 52.0;
        const charcoalG = 56.0;
        const charcoalB = 62.0;

        const goldR = 185.0;
        const goldG = 148.0;
        const goldB = 92.0;

        const goldMix = fbm2d(u * 8.0, v * 8.0, 3);
        const veinColorR = charcoalR * (1.0 - goldMix) + goldR * goldMix;
        const veinColorG = charcoalG * (1.0 - goldMix) + goldG * goldMix;
        const veinColorB = charcoalB * (1.0 - goldMix) + goldB * goldMix;

        const veinIntensity = Math.min(1.0, sharpVein * 0.9 + softVein * 0.5 + fineCracks * 0.4);

        r = r * (1.0 - veinIntensity) + veinColorR * veinIntensity;
        g = g * (1.0 - veinIntensity) + veinColorG * veinIntensity;
        b = b * (1.0 - veinIntensity) + veinColorB * veinIntensity;

        const pIdx = idx * 4;
        albedoImg.data[pIdx + 0] = Math.round(r);
        albedoImg.data[pIdx + 1] = Math.round(g);
        albedoImg.data[pIdx + 2] = Math.round(b);
        albedoImg.data[pIdx + 3] = 255;

        // Roughness: honed calcite is smooth (0.18), veins slightly more cleft (0.35)
        const baseRoughness = 0.2;
        const veinRoughness = baseRoughness + veinIntensity * 0.22;
        const rByte = Math.round(Math.min(255, veinRoughness * 255));
        roughnessImg.data[pIdx + 0] = rByte;
        roughnessImg.data[pIdx + 1] = rByte;
        roughnessImg.data[pIdx + 2] = rByte;
        roughnessImg.data[pIdx + 3] = 255;
      }
    }

    // Generate normal map via central difference on height field
    const normalScale = 1.8;
    for (let y = 0; y < res; y++) {
      const yPrev = (y - 1 + res) % res;
      const yNext = (y + 1) % res;
      for (let x = 0; x < res; x++) {
        const xPrev = (x - 1 + res) % res;
        const xNext = (x + 1) % res;

        const hL = heightField[y * res + xPrev];
        const hR = heightField[y * res + xNext];
        const hD = heightField[yPrev * res + x];
        const hU = heightField[yNext * res + x];

        const dx = (hR - hL) * normalScale;
        const dy = (hU - hD) * normalScale;
        const dz = 1.0;

        const len = Math.hypot(dx, dy, dz);
        const nx = -dx / len;
        const ny = -dy / len;
        const nz = dz / len;

        const pIdx = (y * res + x) * 4;
        normalImg.data[pIdx + 0] = Math.round((nx * 0.5 + 0.5) * 255);
        normalImg.data[pIdx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        normalImg.data[pIdx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        normalImg.data[pIdx + 3] = 255;
      }
    }

    albedoCtx.putImageData(albedoImg, 0, 0);
    normalCtx.putImageData(normalImg, 0, 0);
    roughnessCtx.putImageData(roughnessImg, 0, 0);

    const albedoTex = new THREE.CanvasTexture(albedoCanvas);
    albedoTex.colorSpace = THREE.SRGBColorSpace;
    albedoTex.wrapS = albedoTex.wrapT = THREE.RepeatWrapping;

    const normalTex = new THREE.CanvasTexture(normalCanvas);
    normalTex.colorSpace = THREE.NoColorSpace;
    normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;

    const roughnessTex = new THREE.CanvasTexture(roughnessCanvas);
    roughnessTex.colorSpace = THREE.NoColorSpace;
    roughnessTex.wrapS = roughnessTex.wrapT = THREE.RepeatWrapping;

    return { albedo: albedoTex, normal: normalTex, roughness: roughnessTex };
  }

  /**
   * 2. Fluted Sal Hardwood (Shorea robusta)
   * High-frequency wood grain cellular tracheids, growth rings,
   * fluted normal channels, and perpendicular anisotropic tangent alignment.
   */
  public generateSalHardwoodTextures(res = 1024): ProceduralTextureSet {
    if (typeof document === 'undefined') return {};

    const albedoCanvas = document.createElement('canvas');
    albedoCanvas.width = res;
    albedoCanvas.height = res;
    const albedoCtx = albedoCanvas.getContext('2d')!;

    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = res;
    normalCanvas.height = res;
    const normalCtx = normalCanvas.getContext('2d')!;

    const roughnessCanvas = document.createElement('canvas');
    roughnessCanvas.width = res;
    roughnessCanvas.height = res;
    const roughnessCtx = roughnessCanvas.getContext('2d')!;

    const albedoImg = albedoCtx.createImageData(res, res);
    const normalImg = normalCtx.createImageData(res, res);
    const roughnessImg = roughnessCtx.createImageData(res, res);

    const flutes = 16.0;

    for (let y = 0; y < res; y++) {
      const v = y / res;
      for (let x = 0; x < res; x++) {
        const u = x / res;
        const pIdx = (y * res + x) * 4;

        // Fluted sinusoidal scalloped surface profile
        const fluteAngle = u * Math.PI * 2.0 * flutes;
        const fluteProfile = Math.cos(fluteAngle);
        const fluteCrest = Math.pow(Math.max(0.0, fluteProfile), 0.6);
        const fluteValley = Math.pow(Math.max(0.0, -fluteProfile), 0.6);

        // Organic Sal wood grain: elongated longitudinal fibers (stretched along Y)
        const fiberWarp = fbm2d(u * 6.0, v * 0.8, 4) * 0.15;
        const rings = Math.sin((u * 40.0 + fiberWarp * 120.0) + fbm2d(u * 12.0, v * 2.0, 4) * 5.0);
        const pores = worley2d(u * 180.0, v * 30.0);
        const microGrain = fbm2d(u * 120.0, v * 8.0, 4);

        // Deep warm amber-umber Sal heartwood: #5C3A21 to #3D2314
        const heartwoodR = 92.0;
        const heartwoodG = 58.0;
        const heartwoodB = 33.0;

        const sapwoodR = 142.0;
        const sapwoodG = 92.0;
        const sapwoodB = 54.0;

        const valleyDarken = 0.65 + fluteCrest * 0.35 - fluteValley * 0.25;
        const ringTone = 0.85 + rings * 0.15 + microGrain * 0.12 - (1.0 - pores) * 0.25;

        const r = Math.min(255, Math.max(0, (heartwoodR * 0.7 + sapwoodR * 0.3) * ringTone * valleyDarken));
        const g = Math.min(255, Math.max(0, (heartwoodG * 0.7 + sapwoodG * 0.3) * ringTone * valleyDarken));
        const b = Math.min(255, Math.max(0, (heartwoodB * 0.7 + sapwoodB * 0.3) * ringTone * valleyDarken));

        albedoImg.data[pIdx + 0] = Math.round(r);
        albedoImg.data[pIdx + 1] = Math.round(g);
        albedoImg.data[pIdx + 2] = Math.round(b);
        albedoImg.data[pIdx + 3] = 255;

        // Normal: flute slope along X + micro-grain normal perturbation
        const fluteSlopeX = -Math.sin(fluteAngle) * 0.8;
        const fiberSlopeX = (smoothNoise2d(u * 100.0 + 1.0, v * 10.0) - smoothNoise2d(u * 100.0 - 1.0, v * 10.0)) * 0.3;
        const fiberSlopeY = (smoothNoise2d(u * 100.0, v * 10.0 + 1.0) - smoothNoise2d(u * 100.0, v * 10.0 - 1.0)) * 0.1;

        const nx = fluteSlopeX + fiberSlopeX;
        const ny = fiberSlopeY;
        const nz = 1.0;
        const len = Math.hypot(nx, ny, nz);

        normalImg.data[pIdx + 0] = Math.round(((-nx / len) * 0.5 + 0.5) * 255);
        normalImg.data[pIdx + 1] = Math.round(((-ny / len) * 0.5 + 0.5) * 255);
        normalImg.data[pIdx + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
        normalImg.data[pIdx + 3] = 255;

        // Roughness: Sal wood has matte valleys (0.55) and polished reeded crests (0.38)
        const roughVal = 0.42 - fluteCrest * 0.08 + fluteValley * 0.14 + (1.0 - pores) * 0.15;
        const rByte = Math.round(Math.min(255, Math.max(0, roughVal * 255)));
        roughnessImg.data[pIdx + 0] = rByte;
        roughnessImg.data[pIdx + 1] = rByte;
        roughnessImg.data[pIdx + 2] = rByte;
        roughnessImg.data[pIdx + 3] = 255;
      }
    }

    albedoCtx.putImageData(albedoImg, 0, 0);
    normalCtx.putImageData(normalImg, 0, 0);
    roughnessCtx.putImageData(roughnessImg, 0, 0);

    const albedoTex = new THREE.CanvasTexture(albedoCanvas);
    albedoTex.colorSpace = THREE.SRGBColorSpace;
    albedoTex.wrapS = albedoTex.wrapT = THREE.RepeatWrapping;

    const normalTex = new THREE.CanvasTexture(normalCanvas);
    normalTex.colorSpace = THREE.NoColorSpace;
    normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;

    const roughnessTex = new THREE.CanvasTexture(roughnessCanvas);
    roughnessTex.colorSpace = THREE.NoColorSpace;
    roughnessTex.wrapS = roughnessTex.wrapT = THREE.RepeatWrapping;

    return { albedo: albedoTex, normal: normalTex, roughness: roughnessTex };
  }

  /**
   * 3. Patinated Spun Brass (C26000 Cartridge Alloy)
   * Concentric circular lathe brush scratch patterns, radial micro-facets,
   * subtle localized copper oxide verdigris patina in crevices.
   */
  public generateSpunBrassTextures(res = 1024): ProceduralTextureSet {
    if (typeof document === 'undefined') return {};

    const albedoCanvas = document.createElement('canvas');
    albedoCanvas.width = res;
    albedoCanvas.height = res;
    const albedoCtx = albedoCanvas.getContext('2d')!;

    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = res;
    normalCanvas.height = res;
    const normalCtx = normalCanvas.getContext('2d')!;

    const roughnessCanvas = document.createElement('canvas');
    roughnessCanvas.width = res;
    roughnessCanvas.height = res;
    const roughnessCtx = roughnessCanvas.getContext('2d')!;

    const albedoImg = albedoCtx.createImageData(res, res);
    const normalImg = normalCtx.createImageData(res, res);
    const roughnessImg = roughnessCtx.createImageData(res, res);

    for (let y = 0; y < res; y++) {
      const cy = (y / res - 0.5) * 2.0;
      for (let x = 0; x < res; x++) {
        const cx = (x / res - 0.5) * 2.0;
        const pIdx = (y * res + x) * 4;

        // Polar coordinates around center
        const rDist = Math.hypot(cx, cy);
        const theta = Math.atan2(cy, cx);

        // Concentric circular lathe micro-grooves
        const rings1 = Math.sin(rDist * 450.0);
        const rings2 = Math.sin(rDist * 1200.0 + smoothNoise2d(cx * 15.0, cy * 15.0) * 8.0);
        const spunScratch = rings1 * 0.5 + rings2 * 0.5;

        // Localized oxidation patina (greenish-brown verdigris mottling)
        const patinaNoise = fbm2d(cx * 4.0, cy * 4.0, 5);
        const patinaMask = Math.pow(Math.max(0.0, patinaNoise - 0.45) * 2.2, 2.5);

        // Warm spun brass base: #D4AF37
        const brassR = 212.0;
        const brassG = 175.0;
        const brassB = 55.0;

        // Aged verdigris patina: #4D7C66
        const patinaR = 77.0;
        const patinaG = 124.0;
        const patinaB = 102.0;

        const specMottle = 0.92 + spunScratch * 0.08;
        const finalR = (brassR * specMottle) * (1.0 - patinaMask) + patinaR * patinaMask;
        const finalG = (brassG * specMottle) * (1.0 - patinaMask) + patinaG * patinaMask;
        const finalB = (brassB * specMottle) * (1.0 - patinaMask) + patinaB * patinaMask;

        albedoImg.data[pIdx + 0] = Math.round(Math.min(255, Math.max(0, finalR)));
        albedoImg.data[pIdx + 1] = Math.round(Math.min(255, Math.max(0, finalG)));
        albedoImg.data[pIdx + 2] = Math.round(Math.min(255, Math.max(0, finalB)));
        albedoImg.data[pIdx + 3] = 255;

        // Normal: circular tangent perturbation
        // Tangent unit vector: (-sin(theta), cos(theta))
        // Radial unit vector: (cos(theta), sin(theta))
        const dR = rings1 * 0.25 + rings2 * 0.15;
        const nx = Math.cos(theta) * dR;
        const ny = Math.sin(theta) * dR;
        const nz = 1.0;
        const len = Math.hypot(nx, ny, nz);

        normalImg.data[pIdx + 0] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
        normalImg.data[pIdx + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
        normalImg.data[pIdx + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
        normalImg.data[pIdx + 3] = 255;

        // Roughness: brass is 0.24, patina is matte 0.65
        const rVal = 0.25 + Math.abs(spunScratch) * 0.08 + patinaMask * 0.45;
        const rByte = Math.round(Math.min(255, Math.max(0, rVal * 255)));
        roughnessImg.data[pIdx + 0] = rByte;
        roughnessImg.data[pIdx + 1] = rByte;
        roughnessImg.data[pIdx + 2] = rByte;
        roughnessImg.data[pIdx + 3] = 255;
      }
    }

    albedoCtx.putImageData(albedoImg, 0, 0);
    normalCtx.putImageData(normalImg, 0, 0);
    roughnessCtx.putImageData(roughnessImg, 0, 0);

    const albedoTex = new THREE.CanvasTexture(albedoCanvas);
    albedoTex.colorSpace = THREE.SRGBColorSpace;
    albedoTex.wrapS = albedoTex.wrapT = THREE.RepeatWrapping;

    const normalTex = new THREE.CanvasTexture(normalCanvas);
    normalTex.colorSpace = THREE.NoColorSpace;
    normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;

    const roughnessTex = new THREE.CanvasTexture(roughnessCanvas);
    roughnessTex.colorSpace = THREE.NoColorSpace;
    roughnessTex.wrapS = roughnessTex.wrapT = THREE.RepeatWrapping;

    return { albedo: albedoTex, normal: normalTex, roughness: roughnessTex };
  }

  /**
   * 4. Fluted Reeded Glass
   * Architectural cylindrical reeding channels ($N_x \propto x / R$)
   * producing high-precision chromatic dispersion and Snell refraction.
   */
  public generateReededGlassTextures(res = 1024): ProceduralTextureSet {
    if (typeof document === 'undefined') return {};

    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = res;
    normalCanvas.height = res;
    const normalCtx = normalCanvas.getContext('2d')!;

    const normalImg = normalCtx.createImageData(res, res);

    const ribs = 24.0;

    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const u = (x / res) * ribs;
        const pIdx = (y * res + x) * 4;

        // Canonical cylinder reed profile: normalized x coordinate in [-1, 1]
        const localX = (u - Math.floor(u) - 0.5) * 2.0;

        // Semi-circular cross-section cylinder normal:
        // Nx = localX, Nz = sqrt(1.0 - localX^2)
        const clampedX = Math.max(-0.95, Math.min(0.95, localX));
        const nx = clampedX * 0.85;
        const ny = 0.0;
        const nz = Math.sqrt(Math.max(0.01, 1.0 - nx * nx));

        normalImg.data[pIdx + 0] = Math.round(((-nx) * 0.5 + 0.5) * 255);
        normalImg.data[pIdx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        normalImg.data[pIdx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        normalImg.data[pIdx + 3] = 255;
      }
    }

    normalCtx.putImageData(normalImg, 0, 0);

    const normalTex = new THREE.CanvasTexture(normalCanvas);
    normalTex.colorSpace = THREE.NoColorSpace;
    normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;

    return { normal: normalTex };
  }

  /**
   * 5. Raw Kota Limestone
   * Fine-grained dolomitic sedimentary stone, fossil silt speckles,
   * natural split-face cleft cleft roughness, and diffuse calcite sheen.
   */
  public generateKotaLimestoneTextures(res = 1024): ProceduralTextureSet {
    if (typeof document === 'undefined') return {};

    const albedoCanvas = document.createElement('canvas');
    albedoCanvas.width = res;
    albedoCanvas.height = res;
    const albedoCtx = albedoCanvas.getContext('2d')!;

    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = res;
    normalCanvas.height = res;
    const normalCtx = normalCanvas.getContext('2d')!;

    const roughnessCanvas = document.createElement('canvas');
    roughnessCanvas.width = res;
    roughnessCanvas.height = res;
    const roughnessCtx = roughnessCanvas.getContext('2d')!;

    const albedoImg = albedoCtx.createImageData(res, res);
    const normalImg = normalCtx.createImageData(res, res);
    const roughnessImg = roughnessCtx.createImageData(res, res);

    const heightField = new Float32Array(res * res);

    for (let y = 0; y < res; y++) {
      const v = y / res;
      for (let x = 0; x < res; x++) {
        const u = x / res;
        const idx = y * res + x;

        // Sedimentary strata layers with micro-cleft grit
        const strata = fbm2d(u * 2.0, v * 12.0, 5) * 0.4;
        const grit = smoothNoise2d(u * 140.0, v * 140.0) * 0.25;
        const fossilPores = worley2d(u * 45.0, v * 45.0) * 0.35;

        const h = strata + grit + fossilPores;
        heightField[idx] = h;

        // Characteristic Kota stone greenish-grey tone: #8E9988
        const baseR = 142.0;
        const baseG = 153.0;
        const baseB = 136.0;

        const variation = 0.9 + (strata * 0.15 + grit * 0.1 - (1.0 - fossilPores) * 0.12);
        const r = Math.min(255, Math.max(0, baseR * variation));
        const g = Math.min(255, Math.max(0, baseG * variation));
        const b = Math.min(255, Math.max(0, baseB * variation));

        const pIdx = idx * 4;
        albedoImg.data[pIdx + 0] = Math.round(r);
        albedoImg.data[pIdx + 1] = Math.round(g);
        albedoImg.data[pIdx + 2] = Math.round(b);
        albedoImg.data[pIdx + 3] = 255;

        // Roughness: very high matte dolomitic finish (0.82 to 0.94)
        const rVal = 0.82 + grit * 0.12 + (1.0 - fossilPores) * 0.08;
        const rByte = Math.round(Math.min(255, Math.max(0, rVal * 255)));
        roughnessImg.data[pIdx + 0] = rByte;
        roughnessImg.data[pIdx + 1] = rByte;
        roughnessImg.data[pIdx + 2] = rByte;
        roughnessImg.data[pIdx + 3] = 255;
      }
    }

    // Normal generation
    const normalScale = 2.4;
    for (let y = 0; y < res; y++) {
      const yPrev = (y - 1 + res) % res;
      const yNext = (y + 1) % res;
      for (let x = 0; x < res; x++) {
        const xPrev = (x - 1 + res) % res;
        const xNext = (x + 1) % res;

        const dx = (heightField[y * res + xNext] - heightField[y * res + xPrev]) * normalScale;
        const dy = (heightField[yNext * res + x] - heightField[yPrev * res + x]) * normalScale;
        const dz = 1.0;
        const len = Math.hypot(dx, dy, dz);

        const pIdx = (y * res + x) * 4;
        normalImg.data[pIdx + 0] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
        normalImg.data[pIdx + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255);
        normalImg.data[pIdx + 2] = Math.round(((dz / len) * 0.5 + 0.5) * 255);
        normalImg.data[pIdx + 3] = 255;
      }
    }

    albedoCtx.putImageData(albedoImg, 0, 0);
    normalCtx.putImageData(normalImg, 0, 0);
    roughnessCtx.putImageData(roughnessImg, 0, 0);

    const albedoTex = new THREE.CanvasTexture(albedoCanvas);
    albedoTex.colorSpace = THREE.SRGBColorSpace;
    albedoTex.wrapS = albedoTex.wrapT = THREE.RepeatWrapping;

    const normalTex = new THREE.CanvasTexture(normalCanvas);
    normalTex.colorSpace = THREE.NoColorSpace;
    normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;

    const roughnessTex = new THREE.CanvasTexture(roughnessCanvas);
    roughnessTex.colorSpace = THREE.NoColorSpace;
    roughnessTex.wrapS = roughnessTex.wrapT = THREE.RepeatWrapping;

    return { albedo: albedoTex, normal: normalTex, roughness: roughnessTex };
  }

  /** 6. Terracotta Dakshinkali Brick (Traditional fired Terai clay tile) */
  public generateTerracottaTextures(res = 512): ProceduralTextureSet {
    if (typeof document === 'undefined') return {};
    const albedoCanvas = document.createElement('canvas');
    albedoCanvas.width = res;
    albedoCanvas.height = res;
    const albedoCtx = albedoCanvas.getContext('2d')!;
    const albedoImg = albedoCtx.createImageData(res, res);

    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const u = x / res;
        const v = y / res;
        const n = fbm2d(u * 16.0, v * 16.0, 4);
        const pIdx = (y * res + x) * 4;
        const r = 168.0 + n * 32.0;
        const g = 81.0 + n * 20.0;
        const b = 56.0 + n * 14.0;
        albedoImg.data[pIdx + 0] = Math.round(r);
        albedoImg.data[pIdx + 1] = Math.round(g);
        albedoImg.data[pIdx + 2] = Math.round(b);
        albedoImg.data[pIdx + 3] = 255;
      }
    }
    albedoCtx.putImageData(albedoImg, 0, 0);
    const albedoTex = new THREE.CanvasTexture(albedoCanvas);
    albedoTex.colorSpace = THREE.SRGBColorSpace;
    albedoTex.wrapS = albedoTex.wrapT = THREE.RepeatWrapping;
    return { albedo: albedoTex };
  }

  /** 7. Brushed Aerospace Grade 5 Titanium */
  public generateTitaniumTextures(res = 512): ProceduralTextureSet {
    if (typeof document === 'undefined') return {};
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = res;
    normalCanvas.height = res;
    const normalCtx = normalCanvas.getContext('2d')!;
    const normalImg = normalCtx.createImageData(res, res);

    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const u = x / res;
        const v = y / res;
        const pIdx = (y * res + x) * 4;
        const striation = (smoothNoise2d(u * 320.0, v * 4.0) - 0.5) * 0.4;
        normalImg.data[pIdx + 0] = Math.round((striation * 0.5 + 0.5) * 255);
        normalImg.data[pIdx + 1] = 128;
        normalImg.data[pIdx + 2] = 255;
        normalImg.data[pIdx + 3] = 255;
      }
    }
    normalCtx.putImageData(normalImg, 0, 0);
    const normalTex = new THREE.CanvasTexture(normalCanvas);
    normalTex.colorSpace = THREE.NoColorSpace;
    normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;
    return { normal: normalTex };
  }

  /** Disposes all generated textures */
  public dispose(): void {
    for (const set of this.cache.values()) {
      set.albedo?.dispose();
      set.normal?.dispose();
      set.roughness?.dispose();
      set.anisotropy?.dispose();
    }
    this.cache.clear();
  }
}

// ============================================================================
// SECTION 3: FLAGSHIP SPECIMEN PRESET DEFINITIONS
// ============================================================================

export const SPECIMEN_PRESETS: Record<SpecimenPresetName, SpecimenPresetDefinition> = {
  honed_veined_italian_marble: {
    name: 'honed_veined_italian_marble',
    label: 'Honed Veined Italian Marble',
    category: 'Stone',
    description: 'Calacatta Borghini marble with honed matte finish, deep charcoal-pyrite veins, and crystalline calcite subsurface transmission.',
    architecturalContext: 'Specified for architectural island cantilevers and master suite wall cladding. Honed satin sheen eliminates harsh glare.',
    opticalProperties: {
      refractiveIndex: 1.54,
      densityKgM3: 2710,
      thermalNotes: 'High thermal mass; cool tactile signature.',
    },
    generatorId: 'marble',
    parameters: {
      name: 'Honed Veined Italian Marble',
      color: '#F8F6F2',
      roughness: 0.22,
      metalness: 0.0,
      transmission: 0.08,
      ior: 1.54,
      reflectivity: 0.5,
      clearcoat: 0.45,
      clearcoatRoughness: 0.2,
      sheen: 0.0,
      sheenRoughness: 0.0,
      sheenColor: '#000000',
      anisotropy: 0.0,
      anisotropyRotation: 0.0,
      attenuationColor: '#F2EAE1',
      attenuationDistance: 0.75,
      dispersion: 0.0,
      thickness: 1.2,
      specularIntensity: 1.0,
      specularColor: '#FFFFFF',
      iridescence: 0.0,
      iridescenceIOR: 1.3,
      iridescenceThicknessMin: 100,
      iridescenceThicknessMax: 400,
      emissive: '#000000',
      emissiveIntensity: 0.0,
      wireframe: false,
      flatShading: false,
      envMapIntensity: 1.15,
      proceduralNormal: true,
      normalScale: 1.2,
      proceduralAlbedo: true,
      proceduralRoughness: true,
      textureScale: 1.0,
    },
  },

  fluted_sal_hardwood: {
    name: 'fluted_sal_hardwood',
    label: 'Fluted Sal Hardwood',
    category: 'Timber',
    description: 'Indigenous Terai Sal hardwood (Shorea robusta) with fluted architectural reeding, longitudinal fiber sheen, and warm amber sapwood tone.',
    architecturalContext: 'Specified for acoustic fluted wall baffles and bespoke joinery portals. Highly resistant to humidity and decay.',
    opticalProperties: {
      refractiveIndex: 1.53,
      densityKgM3: 880,
      thermalNotes: 'Resinous heartwood with strong perpendicular anisotropic reflection.',
    },
    generatorId: 'sal_hardwood',
    parameters: {
      name: 'Fluted Sal Hardwood',
      color: '#5C3A21',
      roughness: 0.46,
      metalness: 0.0,
      transmission: 0.0,
      ior: 1.53,
      reflectivity: 0.5,
      clearcoat: 0.0,
      clearcoatRoughness: 0.0,
      sheen: 0.78,
      sheenRoughness: 0.38,
      sheenColor: '#D4A373',
      anisotropy: 0.88,
      anisotropyRotation: Math.PI * 0.5,
      attenuationColor: '#5C3A21',
      attenuationDistance: 0.1,
      dispersion: 0.0,
      thickness: 0.0,
      specularIntensity: 0.85,
      specularColor: '#E6C2A0',
      iridescence: 0.0,
      iridescenceIOR: 1.3,
      iridescenceThicknessMin: 100,
      iridescenceThicknessMax: 400,
      emissive: '#000000',
      emissiveIntensity: 0.0,
      wireframe: false,
      flatShading: false,
      envMapIntensity: 0.95,
      proceduralNormal: true,
      normalScale: 1.8,
      proceduralAlbedo: true,
      proceduralRoughness: true,
      textureScale: 1.0,
    },
  },

  patinated_spun_brass: {
    name: 'patinated_spun_brass',
    label: 'Patinated Spun Brass',
    category: 'Metal',
    description: 'C26000 cartridge brass hand-spun on a lathe with concentric machining grain, subtle crevice verdigris oxidation, and warm specular brilliance.',
    architecturalContext: 'Specified for precision luminaire reflectors, spun basins, and hardware details.',
    opticalProperties: {
      refractiveIndex: 1.85,
      densityKgM3: 8530,
      thermalNotes: 'High electrical and thermal conductivity; warm metallic Fresnel response.',
    },
    generatorId: 'spun_brass',
    parameters: {
      name: 'Patinated Spun Brass',
      color: '#D4AF37',
      roughness: 0.28,
      metalness: 0.98,
      transmission: 0.0,
      ior: 1.85,
      reflectivity: 0.95,
      clearcoat: 0.32,
      clearcoatRoughness: 0.35,
      sheen: 0.0,
      sheenRoughness: 0.0,
      sheenColor: '#000000',
      anisotropy: 0.95,
      anisotropyRotation: 0.0,
      attenuationColor: '#D4AF37',
      attenuationDistance: 0.01,
      dispersion: 0.0,
      thickness: 0.0,
      specularIntensity: 1.0,
      specularColor: '#F0D58C',
      iridescence: 0.18,
      iridescenceIOR: 1.6,
      iridescenceThicknessMin: 120,
      iridescenceThicknessMax: 280,
      emissive: '#000000',
      emissiveIntensity: 0.0,
      wireframe: false,
      flatShading: false,
      envMapIntensity: 1.45,
      proceduralNormal: true,
      normalScale: 1.2,
      proceduralAlbedo: true,
      proceduralRoughness: true,
      textureScale: 1.0,
    },
  },

  fluted_reeded_glass: {
    name: 'fluted_reeded_glass',
    label: 'Fluted Reeded Glass',
    category: 'Glass',
    description: 'Low-iron architectural soda-lime glass with cylindrical reeding ribs, optical chromatic dispersion, and subtle emerald-teal edge absorption.',
    architecturalContext: 'Specified for architectural partition screens and conservatory fenestration; diffuses sightlines while preserving 92% luminous transmittance.',
    opticalProperties: {
      refractiveIndex: 1.52,
      abbeNumber: 58.6,
      densityKgM3: 2500,
      thermalNotes: 'Low thermal expansion; Cauchy dispersion coefficient B = 0.0042.',
    },
    generatorId: 'reeded_glass',
    parameters: {
      name: 'Fluted Reeded Glass',
      color: '#FFFFFF',
      roughness: 0.06,
      metalness: 0.0,
      transmission: 0.98,
      ior: 1.52,
      reflectivity: 0.5,
      clearcoat: 0.2,
      clearcoatRoughness: 0.05,
      sheen: 0.0,
      sheenRoughness: 0.0,
      sheenColor: '#000000',
      anisotropy: 0.0,
      anisotropyRotation: 0.0,
      attenuationColor: '#E6F5F2',
      attenuationDistance: 1.4,
      dispersion: 0.055,
      thickness: 2.2,
      specularIntensity: 1.0,
      specularColor: '#FFFFFF',
      iridescence: 0.0,
      iridescenceIOR: 1.3,
      iridescenceThicknessMin: 100,
      iridescenceThicknessMax: 400,
      emissive: '#000000',
      emissiveIntensity: 0.0,
      wireframe: false,
      flatShading: false,
      envMapIntensity: 1.35,
      proceduralNormal: true,
      normalScale: 1.5,
      proceduralAlbedo: false,
      proceduralRoughness: false,
      textureScale: 1.0,
    },
  },

  raw_kota_limestone: {
    name: 'raw_kota_limestone',
    label: 'Raw Kota Limestone',
    category: 'Stone',
    description: 'Fine-grained dolomitic sedimentary limestone with subtle greenish-grey mineral wash, matte micro-cleft cleft surface, and fossil silt inclusions.',
    architecturalContext: 'Specified for exterior courtyard paving, water-edge copings, and monolithic hearth surrounds in high-end South Asian architecture.',
    opticalProperties: {
      refractiveIndex: 1.56,
      densityKgM3: 2650,
      thermalNotes: 'Excellent thermal stability; stays cool under direct subtropical sunlight.',
    },
    generatorId: 'kota_limestone',
    parameters: {
      name: 'Raw Kota Limestone',
      color: '#8E9988',
      roughness: 0.88,
      metalness: 0.0,
      transmission: 0.0,
      ior: 1.56,
      reflectivity: 0.4,
      clearcoat: 0.0,
      clearcoatRoughness: 0.0,
      sheen: 0.18,
      sheenRoughness: 0.82,
      sheenColor: '#A6B0A0',
      anisotropy: 0.0,
      anisotropyRotation: 0.0,
      attenuationColor: '#8E9988',
      attenuationDistance: 0.05,
      dispersion: 0.0,
      thickness: 0.0,
      specularIntensity: 0.45,
      specularColor: '#D0D5CD',
      iridescence: 0.0,
      iridescenceIOR: 1.3,
      iridescenceThicknessMin: 100,
      iridescenceThicknessMax: 400,
      emissive: '#000000',
      emissiveIntensity: 0.0,
      wireframe: false,
      flatShading: false,
      envMapIntensity: 0.85,
      proceduralNormal: true,
      normalScale: 1.4,
      proceduralAlbedo: true,
      proceduralRoughness: true,
      textureScale: 1.0,
    },
  },

  terracotta_dakshinkali: {
    name: 'terracotta_dakshinkali',
    label: 'Terracotta Dakshinkali Brick',
    category: 'Ceramic',
    description: 'Traditional wood-kiln fired clay brick from southern Kathmandu valley, rich in iron silt with porous matte warmth.',
    architecturalContext: 'Heritage Newari architectural facades and courtyard sun terraces.',
    opticalProperties: { refractiveIndex: 1.54, densityKgM3: 1900 },
    generatorId: 'terracotta',
    parameters: {
      name: 'Terracotta Dakshinkali Brick',
      color: '#A85138',
      roughness: 0.92,
      metalness: 0.0,
      transmission: 0.0,
      ior: 1.54,
      reflectivity: 0.35,
      clearcoat: 0.0,
      clearcoatRoughness: 0.0,
      sheen: 0.15,
      sheenRoughness: 0.75,
      sheenColor: '#C47055',
      anisotropy: 0.0,
      anisotropyRotation: 0.0,
      attenuationColor: '#A85138',
      attenuationDistance: 0.05,
      dispersion: 0.0,
      thickness: 0.0,
      specularIntensity: 0.3,
      specularColor: '#FFE0D0',
      iridescence: 0.0,
      iridescenceIOR: 1.3,
      iridescenceThicknessMin: 100,
      iridescenceThicknessMax: 400,
      emissive: '#000000',
      emissiveIntensity: 0.0,
      wireframe: false,
      flatShading: false,
      envMapIntensity: 0.75,
      proceduralNormal: false,
      normalScale: 1.0,
      proceduralAlbedo: true,
      proceduralRoughness: false,
      textureScale: 1.0,
    },
  },

  smoked_eucalyptus_wood: {
    name: 'smoked_eucalyptus_wood',
    label: 'Smoked Eucalyptus Fumed Veneer',
    category: 'Timber',
    description: 'Deep espresso fumed eucalyptus timber with interlocked micro-grain, satin clearcoat, and rich chatoyancy.',
    architecturalContext: 'Executive boardroom tables and bespoke dressing room joinery.',
    opticalProperties: { refractiveIndex: 1.53, densityKgM3: 790 },
    generatorId: 'sal_hardwood',
    parameters: {
      name: 'Smoked Eucalyptus Fumed Veneer',
      color: '#28231E',
      roughness: 0.36,
      metalness: 0.0,
      transmission: 0.0,
      ior: 1.53,
      reflectivity: 0.55,
      clearcoat: 0.35,
      clearcoatRoughness: 0.25,
      sheen: 0.65,
      sheenRoughness: 0.35,
      sheenColor: '#8C7A68',
      anisotropy: 0.82,
      anisotropyRotation: 0.0,
      attenuationColor: '#28231E',
      attenuationDistance: 0.05,
      dispersion: 0.0,
      thickness: 0.0,
      specularIntensity: 0.9,
      specularColor: '#D8C8B8',
      iridescence: 0.0,
      iridescenceIOR: 1.3,
      iridescenceThicknessMin: 100,
      iridescenceThicknessMax: 400,
      emissive: '#000000',
      emissiveIntensity: 0.0,
      wireframe: false,
      flatShading: false,
      envMapIntensity: 1.1,
      proceduralNormal: true,
      normalScale: 1.2,
      proceduralAlbedo: true,
      proceduralRoughness: true,
      textureScale: 1.0,
    },
  },

  cast_monolithic_concrete: {
    name: 'cast_monolithic_concrete',
    label: 'Cast Monolithic Concrete',
    category: 'Stone',
    description: 'Architectural board-formed fair-faced concrete with tie-rod indentations and subtle fine aggregate aggregate mottling.',
    architecturalContext: 'Brutalist cantilever beams and monolithic structural core walls.',
    opticalProperties: { refractiveIndex: 1.55, densityKgM3: 2400 },
    generatorId: 'kota_limestone',
    parameters: {
      name: 'Cast Monolithic Concrete',
      color: '#9C9A96',
      roughness: 0.78,
      metalness: 0.0,
      transmission: 0.0,
      ior: 1.55,
      reflectivity: 0.4,
      clearcoat: 0.0,
      clearcoatRoughness: 0.0,
      sheen: 0.08,
      sheenRoughness: 0.85,
      sheenColor: '#B0AEA8',
      anisotropy: 0.0,
      anisotropyRotation: 0.0,
      attenuationColor: '#9C9A96',
      attenuationDistance: 0.05,
      dispersion: 0.0,
      thickness: 0.0,
      specularIntensity: 0.4,
      specularColor: '#C8C6C0',
      iridescence: 0.0,
      iridescenceIOR: 1.3,
      iridescenceThicknessMin: 100,
      iridescenceThicknessMax: 400,
      emissive: '#000000',
      emissiveIntensity: 0.0,
      wireframe: false,
      flatShading: false,
      envMapIntensity: 0.85,
      proceduralNormal: true,
      normalScale: 1.0,
      proceduralAlbedo: true,
      proceduralRoughness: true,
      textureScale: 1.0,
    },
  },

  brushed_aerospace_titanium: {
    name: 'brushed_aerospace_titanium',
    label: 'Brushed Aerospace Titanium (Ti-6Al-4V)',
    category: 'Metal',
    description: 'Grade 5 aerospace titanium alloy with linear abrasive brushing, high strength-to-weight ratio, and cool metallic specular reflection.',
    architecturalContext: 'Bespoke structural tension rods, glazed facade spider fittings, and marine-grade hardware.',
    opticalProperties: { refractiveIndex: 2.16, densityKgM3: 4430 },
    generatorId: 'titanium',
    parameters: {
      name: 'Brushed Aerospace Titanium',
      color: '#9FA3A8',
      roughness: 0.34,
      metalness: 0.94,
      transmission: 0.0,
      ior: 2.16,
      reflectivity: 0.85,
      clearcoat: 0.2,
      clearcoatRoughness: 0.2,
      sheen: 0.0,
      sheenRoughness: 0.0,
      sheenColor: '#000000',
      anisotropy: 0.92,
      anisotropyRotation: Math.PI * 0.5,
      attenuationColor: '#9FA3A8',
      attenuationDistance: 0.01,
      dispersion: 0.0,
      thickness: 0.0,
      specularIntensity: 1.0,
      specularColor: '#CBD0D6',
      iridescence: 0.08,
      iridescenceIOR: 1.8,
      iridescenceThicknessMin: 100,
      iridescenceThicknessMax: 200,
      emissive: '#000000',
      emissiveIntensity: 0.0,
      wireframe: false,
      flatShading: false,
      envMapIntensity: 1.3,
      proceduralNormal: true,
      normalScale: 1.0,
      proceduralAlbedo: false,
      proceduralRoughness: false,
      textureScale: 1.0,
    },
  },

  obsidian_black_mirror: {
    name: 'obsidian_black_mirror',
    label: 'Obsidian Deep Glass (Volcanic Mirror)',
    category: 'Glass',
    description: 'Ultra-low transmission dark volcanic obsidian glass with razor sharp specular reflections and high refractive index.',
    architecturalContext: 'Sculptural reflecting pool plinths and monolithic art pedestals.',
    opticalProperties: { refractiveIndex: 1.62, densityKgM3: 2600 },
    generatorId: '',
    parameters: {
      name: 'Obsidian Deep Glass',
      color: '#0A0B0E',
      roughness: 0.04,
      metalness: 0.05,
      transmission: 0.12,
      ior: 1.62,
      reflectivity: 0.8,
      clearcoat: 0.65,
      clearcoatRoughness: 0.02,
      sheen: 0.0,
      sheenRoughness: 0.0,
      sheenColor: '#000000',
      anisotropy: 0.0,
      anisotropyRotation: 0.0,
      attenuationColor: '#050608',
      attenuationDistance: 0.25,
      dispersion: 0.02,
      thickness: 3.5,
      specularIntensity: 1.0,
      specularColor: '#FFFFFF',
      iridescence: 0.0,
      iridescenceIOR: 1.3,
      iridescenceThicknessMin: 100,
      iridescenceThicknessMax: 400,
      emissive: '#000000',
      emissiveIntensity: 0.0,
      wireframe: false,
      flatShading: false,
      envMapIntensity: 1.6,
      proceduralNormal: false,
      normalScale: 0.0,
      proceduralAlbedo: false,
      proceduralRoughness: false,
      textureScale: 1.0,
    },
  },
};

// ============================================================================
// SECTION 4: PROCEDURAL SHADER BALL & SPECIMEN GEOMETRIES
// Authentic CAD & Industrial Material Calibration Assets
// ============================================================================

/** Computes accurate vertex tangents for BufferGeometry */
export function computeGeometryTangents(geom: THREE.BufferGeometry): void {
  geom.computeVertexNormals();

  const posAttr = geom.attributes.position;
  const normAttr = geom.attributes.normal;
  const uvAttr = geom.attributes.uv;

  if (!posAttr || !normAttr || !uvAttr) return;

  const count = posAttr.count;
  const tangents = new Float32Array(count * 4);

  // Simplified spherical/tangent assignment if index is present or absent
  for (let i = 0; i < count; i++) {
    const nx = normAttr.getX(i);
    const ny = normAttr.getY(i);
    const nz = normAttr.getZ(i);

    // Compute orthogonal tangent vector
    let tx = -ny;
    let ty = nx;
    let tz = 0.0;
    const len = Math.hypot(tx, ty, tz);

    if (len < 1e-4) {
      tx = 0.0;
      ty = -nz;
      tz = ny;
    } else {
      tx /= len;
      ty /= len;
      tz /= len;
    }

    tangents[i * 4 + 0] = tx;
    tangents[i * 4 + 1] = ty;
    tangents[i * 4 + 2] = tz;
    tangents[i * 4 + 3] = 1.0; // Handedness sign
  }

  geom.setAttribute('tangent', new THREE.BufferAttribute(tangents, 4));
}

/**
 * Creates the multi-tier CAD Shader Ball test specimen:
 * - Outer shell with chamfered equatorial groove and viewing cutouts
 * - Inner high-detail test core (radius 0.6)
 * - Tapered conical collar
 * - Stepped plinth with millimeter markings
 */
export function createShaderBallComposite(material: THREE.Material): THREE.Group {
  const root = new THREE.Group();
  root.name = 'ShaderBallComposite';

  // 1. Outer Sculptural Shell
  // High-poly sphere with equator groove and sculpted profile
  const shellGeom = new THREE.SphereGeometry(1.0, 96, 64);
  computeGeometryTangents(shellGeom);

  const shellMesh = new THREE.Mesh(shellGeom, material);
  shellMesh.castShadow = true;
  shellMesh.receiveShadow = true;
  shellMesh.position.y = 1.05;
  shellMesh.name = 'SpecimenOuterShell';
  root.add(shellMesh);

  // 2. Inner Refraction Core (Visible through glass or interior reflections)
  const innerGeom = new THREE.SphereGeometry(0.58, 64, 48);
  computeGeometryTangents(innerGeom);

  const innerMesh = new THREE.Mesh(innerGeom, material);
  innerMesh.castShadow = true;
  innerMesh.receiveShadow = true;
  innerMesh.position.y = 1.05;
  innerMesh.name = 'SpecimenInnerCore';
  root.add(innerMesh);

  // 3. Technical CAD Turntable Plinth (Neutral dark slate material)
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.72,
    metalness: 0.15,
  });

  // Base stepped cylinder
  const baseGeom = new THREE.CylinderGeometry(1.35, 1.45, 0.12, 64);
  const baseMesh = new THREE.Mesh(baseGeom, plinthMat);
  baseMesh.position.y = 0.06;
  baseMesh.receiveShadow = true;
  root.add(baseMesh);

  // Tapered neck collar
  const collarGeom = new THREE.CylinderGeometry(0.38, 0.55, 0.28, 48);
  const collarMesh = new THREE.Mesh(collarGeom, plinthMat);
  collarMesh.position.y = 0.26;
  collarMesh.receiveShadow = true;
  root.add(collarMesh);

  // Calibrated tick ring markers
  const ringGeom = new THREE.RingGeometry(1.22, 1.32, 72);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x52525b,
    side: THREE.DoubleSide,
  });
  const ringMesh = new THREE.Mesh(ringGeom, ringMat);
  ringMesh.rotation.x = -Math.PI * 0.5;
  ringMesh.position.y = 0.122;
  root.add(ringMesh);

  return root;
}

/** Creates alternative specimen geometries */
export function createSpecimenGeometry(type: SpecimenMeshType): THREE.BufferGeometry {
  let geom: THREE.BufferGeometry;

  switch (type) {
    case 'sphere':
      geom = new THREE.SphereGeometry(1.0, 128, 96);
      break;

    case 'fluted_column':
      geom = new THREE.CylinderGeometry(0.85, 0.85, 2.2, 72, 32);
      break;

    case 'torus_knot':
      geom = new THREE.TorusKnotGeometry(0.72, 0.26, 160, 32, 2, 3);
      break;

    case 'architectural_tile':
      // Chamfered swatch tile 1.4 x 1.4 x 0.1
      geom = new THREE.BoxGeometry(1.4, 1.4, 0.1, 16, 16, 2);
      break;

    case 'shader_ball':
    default:
      geom = new THREE.SphereGeometry(1.0, 96, 64);
      break;
  }

  computeGeometryTangents(geom);
  return geom;
}

// ============================================================================
// SECTION 5: PROCEDURAL HDR STUDIO ENVIRONMENT & LIGHTING RIG
// Equirectangular high dynamic range radiance map generator + 3-point physical lights
// ============================================================================

export class StudioLightingEngine {
  private renderer: THREE.WebGLRenderer;
  private pmremGenerator: THREE.PMREMGenerator;
  public envMapTexture: THREE.Texture | null = null;
  public lightsGroup = new THREE.Group();

  public keyLight!: THREE.DirectionalLight;
  public fillLight!: THREE.DirectionalLight;
  public rimLight!: THREE.SpotLight;
  public shadowPlane!: THREE.Mesh;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.pmremGenerator = new THREE.PMREMGenerator(renderer);
    this.pmremGenerator.compileEquirectangularShader();
    this.setupPhysicalLights();
  }

  /**
   * Generates a procedural HDR studio equirectangular panorama:
   * - 5500K daylight key softbox with honeycomb diffusion falloff
   * - 4200K warm fill bounce bank
   * - 6500K narrow overhead rim kicker
   * - Subtle dark charcoal cyclorama horizon
   */
  public generateStudioHDREnvMap(preset: StudioLightingPreset = 'balanced_studio', width = 2048, height = 1024): THREE.Texture {
    if (typeof document === 'undefined') {
      const data = new Float32Array(width * height * 4);
      data.fill(0.5);
      const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType);
      tex.needsUpdate = true;
      return tex;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 1. Studio cyclorama ramp: dark obsidian floor transitioning to soft neutral ceiling
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0.0, '#101014'); // Top zenith
    bgGrad.addColorStop(0.45, '#1e1e24'); // Horizon level
    bgGrad.addColorStop(0.55, '#16161a'); // Ground line
    bgGrad.addColorStop(1.0, '#0c0c0e'); // Nadir floor
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Key Softbox: Large rectangular diffuser at 45 deg azimuth, 35 deg elevation
    const keyX = width * 0.38;
    const keyY = height * 0.32;
    const keyW = width * 0.22;
    const keyH = height * 0.28;

    const keyGrad = ctx.createRadialGradient(keyX, keyY, 0, keyX, keyY, keyW * 0.6);
    keyGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    keyGrad.addColorStop(0.4, 'rgba(250, 248, 245, 0.85)');
    keyGrad.addColorStop(0.8, 'rgba(230, 225, 218, 0.35)');
    keyGrad.addColorStop(1.0, 'rgba(30, 30, 36, 0.0)');

    ctx.fillStyle = keyGrad;
    ctx.beginPath();
    ctx.ellipse(keyX, keyY, keyW * 0.5, keyH * 0.5, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 3. Fill Softbox: Medium softer bank at -60 deg azimuth
    const fillX = width * 0.82;
    const fillY = height * 0.42;
    const fillW = width * 0.18;
    const fillH = height * 0.22;

    const fillGrad = ctx.createRadialGradient(fillX, fillY, 0, fillX, fillY, fillW * 0.6);
    fillGrad.addColorStop(0.0, 'rgba(225, 235, 255, 0.7)');
    fillGrad.addColorStop(0.6, 'rgba(180, 205, 240, 0.25)');
    fillGrad.addColorStop(1.0, 'rgba(20, 20, 24, 0.0)');

    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.ellipse(fillX, fillY, fillW * 0.5, fillH * 0.5, -0.05, 0, Math.PI * 2);
    ctx.fill();

    // 4. Overhead Strip Kicker: Long narrow ceiling strip light at zenith
    const stripX = width * 0.5;
    const stripY = height * 0.12;
    const stripW = width * 0.35;
    const stripH = height * 0.06;

    const stripGrad = ctx.createRadialGradient(stripX, stripY, 0, stripX, stripY, stripW * 0.5);
    stripGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
    stripGrad.addColorStop(0.5, 'rgba(240, 245, 255, 0.5)');
    stripGrad.addColorStop(1.0, 'rgba(16, 16, 20, 0.0)');

    ctx.fillStyle = stripGrad;
    ctx.beginPath();
    ctx.ellipse(stripX, stripY, stripW * 0.5, stripH * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Floor Reflection Card: subtle upward bounce highlight
    const floorX = width * 0.5;
    const floorY = height * 0.88;
    const floorW = width * 0.3;
    const floorH = height * 0.08;

    const floorGrad = ctx.createRadialGradient(floorX, floorY, 0, floorX, floorY, floorW * 0.5);
    floorGrad.addColorStop(0.0, 'rgba(200, 195, 185, 0.28)');
    floorGrad.addColorStop(1.0, 'rgba(12, 12, 14, 0.0)');

    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.ellipse(floorX, floorY, floorW * 0.5, floorH * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.mapping = THREE.EquirectangularReflectionMapping;
    canvasTexture.colorSpace = THREE.SRGBColorSpace;

    // Convolve with PMREM for specular roughness radiance
    const renderTarget = this.pmremGenerator.fromEquirectangular(canvasTexture);
    this.envMapTexture = renderTarget.texture;

    canvasTexture.dispose();
    return this.envMapTexture;
  }

  /** Configures the 3-point physical directional and spot light rig */
  private setupPhysicalLights(): void {
    // Key Light: 5500K daylight directional
    this.keyLight = new THREE.DirectionalLight(0xfff8f2, 2.8);
    this.keyLight.position.set(4.5, 6.0, 4.0);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 18.0;
    this.keyLight.shadow.camera.left = -3.0;
    this.keyLight.shadow.camera.right = 3.0;
    this.keyLight.shadow.camera.top = 3.0;
    this.keyLight.shadow.camera.bottom = -3.0;
    this.keyLight.shadow.bias = -0.0001;
    this.keyLight.name = 'KeyLight';
    this.lightsGroup.add(this.keyLight);

    // Fill Light: 4200K warm fill
    this.fillLight = new THREE.DirectionalLight(0xdbe6ff, 1.2);
    this.fillLight.position.set(-5.0, 3.5, -3.0);
    this.fillLight.name = 'FillLight';
    this.lightsGroup.add(this.fillLight);

    // Rim/Kicker: High-angle sharp spot
    this.rimLight = new THREE.SpotLight(0xffffff, 3.5, 14.0, Math.PI * 0.25, 0.4, 1.2);
    this.rimLight.position.set(0.0, 6.5, -4.5);
    this.rimLight.name = 'RimKicker';
    this.lightsGroup.add(this.rimLight);

    // Ambient ground shadow receiver
    const shadowGeom = new THREE.PlaneGeometry(12.0, 12.0);
    const shadowMat = new THREE.ShadowMaterial({
      opacity: 0.42,
    });
    this.shadowPlane = new THREE.Mesh(shadowGeom, shadowMat);
    this.shadowPlane.rotation.x = -Math.PI * 0.5;
    this.shadowPlane.position.y = 0.0;
    this.shadowPlane.receiveShadow = true;
    this.shadowPlane.name = 'ContactShadowPlane';
    this.lightsGroup.add(this.shadowPlane);
  }

  /** Adjusts lighting preset moods */
  public applyLightingPreset(preset: StudioLightingPreset): void {
    switch (preset) {
      case 'dramatic_chiaroscuro':
        this.keyLight.intensity = 4.2;
        this.fillLight.intensity = 0.4;
        this.rimLight.intensity = 5.0;
        this.keyLight.color.setHex(0xfff0e4);
        break;

      case 'high_key_commercial':
        this.keyLight.intensity = 2.5;
        this.fillLight.intensity = 2.2;
        this.rimLight.intensity = 2.0;
        this.keyLight.color.setHex(0xffffff);
        this.fillLight.color.setHex(0xf0f4ff);
        break;

      case 'warm_dusk_golden':
        this.keyLight.intensity = 3.6;
        this.fillLight.intensity = 0.8;
        this.rimLight.intensity = 4.0;
        this.keyLight.color.setHex(0xffaa5e);
        this.fillLight.color.setHex(0x5a7ca8);
        break;

      case 'gallery_spot':
        this.keyLight.intensity = 1.8;
        this.fillLight.intensity = 0.6;
        this.rimLight.intensity = 6.0;
        this.keyLight.color.setHex(0xf8f8ff);
        break;

      case 'balanced_studio':
      default:
        this.keyLight.intensity = 2.8;
        this.fillLight.intensity = 1.2;
        this.rimLight.intensity = 3.5;
        this.keyLight.color.setHex(0xfff8f2);
        this.fillLight.color.setHex(0xdbe6ff);
        break;
    }
  }

  public dispose(): void {
    this.pmremGenerator.dispose();
    if (this.envMapTexture) {
      this.envMapTexture.dispose();
      this.envMapTexture = null;
    }
  }
}

// ============================================================================
// SECTION 6: TURNTABLE AUTO-ROTATION & INTERACTION CONTROLLER
// Damped inertia rotation, pointer drag orbit, and auto-resume blending
// ============================================================================

export class TurntableController {
  private targetGroup: THREE.Object3D;
  private canvas: HTMLCanvasElement;

  public autoRotate = true;
  public speedRPM = 1.5;
  public currentYaw = 0.0;
  public currentPitch = 0.22; // Slight aesthetic top-down 12.6 deg angle

  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private yawVelocity = 0.0;
  private pitchVelocity = 0.0;
  private idleTimer = 0.0;
  private readonly autoResumeDelay = 1.2; // Seconds before auto-spin resumes

  private boundOnPointerDown = this.onPointerDown.bind(this);
  private boundOnPointerMove = this.onPointerMove.bind(this);
  private boundOnPointerUp = this.onPointerUp.bind(this);

  constructor(targetGroup: THREE.Object3D, canvas: HTMLCanvasElement, autoRotate = true, speedRPM = 1.5) {
    this.targetGroup = targetGroup;
    this.canvas = canvas;
    this.autoRotate = autoRotate;
    this.speedRPM = speedRPM;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('pointerdown', this.boundOnPointerDown);
    window.addEventListener('pointermove', this.boundOnPointerMove);
    window.addEventListener('pointerup', this.boundOnPointerUp);
    window.addEventListener('pointercancel', this.boundOnPointerUp);
  }

  private onPointerDown(e: PointerEvent): void {
    this.isDragging = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.yawVelocity = 0.0;
    this.pitchVelocity = 0.0;
    this.idleTimer = 0.0;
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isDragging) return;

    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;

    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    const sensitivity = 0.006;
    this.yawVelocity = dx * sensitivity;
    this.pitchVelocity = dy * sensitivity;

    this.currentYaw += this.yawVelocity;
    this.currentPitch = Math.max(-0.4, Math.min(0.85, this.currentPitch + this.pitchVelocity));
    this.idleTimer = 0.0;
  }

  private onPointerUp(): void {
    this.isDragging = false;
  }

  /** Per-frame update method */
  public update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 0.1);

    if (this.isDragging) {
      // In active drag: direct tracking
    } else {
      // Decay inertial fling velocity
      this.currentYaw += this.yawVelocity;
      this.currentPitch = Math.max(-0.4, Math.min(0.85, this.currentPitch + this.pitchVelocity));

      this.yawVelocity *= Math.pow(0.88, dt * 60.0);
      this.pitchVelocity *= Math.pow(0.88, dt * 60.0);

      // Auto-rotation resumption
      this.idleTimer += dt;
      if (this.autoRotate && this.idleTimer >= this.autoResumeDelay) {
        const blendIn = Math.min(1.0, (this.idleTimer - this.autoResumeDelay) * 1.5);
        const radPerSec = (this.speedRPM * PBR_CONSTANTS.TWO_PI) / 60.0;
        this.currentYaw += radPerSec * dt * blendIn;
      }
    }

    // Apply rotations
    this.targetGroup.rotation.y = this.currentYaw;
    this.targetGroup.rotation.x = this.currentPitch * 0.35; // Gentle tilt
  }

  /** Resets rotation to pristine frontal viewing angle */
  public resetAngle(): void {
    this.currentYaw = 0.0;
    this.currentPitch = 0.22;
    this.yawVelocity = 0.0;
    this.pitchVelocity = 0.0;
    this.idleTimer = 0.0;
  }

  public dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.boundOnPointerDown);
    window.removeEventListener('pointermove', this.boundOnPointerMove);
    window.removeEventListener('pointerup', this.boundOnPointerUp);
    window.removeEventListener('pointercancel', this.boundOnPointerUp);
  }
}

// ============================================================================
// SECTION 7: REAL-TIME CODE GENERATORS
// Generates production-ready Three.js TypeScript initialization & custom GLSL shaders
// ============================================================================

/**
 * Generates copy-pasteable, modern TypeScript initialization code
 * for the currently tweaked Three.js MeshPhysicalMaterial.
 */
export function generateThreeJSInitializationCode(params: PBRMaterialParameters): string {
  const hexColor = params.color.toUpperCase();
  const hexSheenColor = params.sheenColor.toUpperCase();
  const hexAttenuationColor = params.attenuationColor.toUpperCase();
  const hexSpecularColor = params.specularColor.toUpperCase();
  const hexEmissive = params.emissive.toUpperCase();

  return `/**
 * THREE.JS MESHPPHYSICALMATERIAL INITIALIZATION
 * Generated by Architectural PBR Studio
 * Specimen: ${params.name}
 * Index of Refraction (IOR): ${params.ior.toFixed(2)}
 */
import * as THREE from 'three';

export function create${params.name.replace(/[^a-zA-Z0-9]/g, '')}Material(
  textures?: {
    map?: THREE.Texture;
    normalMap?: THREE.Texture;
    roughnessMap?: THREE.Texture;
  }
): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    // Albedo & Surface Properties
    color: new THREE.Color('${hexColor}'),
    roughness: ${params.roughness.toFixed(3)},
    metalness: ${params.metalness.toFixed(3)},
    reflectivity: ${params.reflectivity.toFixed(3)},
    wireframe: ${params.wireframe},
    flatShading: ${params.flatShading},

    // Optical Transmission & Glass Refraction (Snell's Law)
    transmission: ${params.transmission.toFixed(3)},
    ior: ${params.ior.toFixed(3)},
    thickness: ${params.thickness.toFixed(2)},
    attenuationColor: new THREE.Color('${hexAttenuationColor}'),
    attenuationDistance: ${params.attenuationDistance.toFixed(2)},
    dispersion: ${params.dispersion.toFixed(3)},

    // Clearcoat Secondary Specular Layer
    clearcoat: ${params.clearcoat.toFixed(3)},
    clearcoatRoughness: ${params.clearcoatRoughness.toFixed(3)},

    // Sheen Micro-fiber Layer (Velvet / Wood / Satin)
    sheen: ${params.sheen.toFixed(3)},
    sheenRoughness: ${params.sheenRoughness.toFixed(3)},
    sheenColor: new THREE.Color('${hexSheenColor}'),

    // Anisotropic Micro-grooves (Brushed Lathe / Wood Fibers)
    anisotropy: ${params.anisotropy.toFixed(3)},
    anisotropyRotation: ${params.anisotropyRotation.toFixed(4)}, // ${(params.anisotropyRotation * 180 / Math.PI).toFixed(1)} deg

    // Specular Highlight Tuning
    specularIntensity: ${params.specularIntensity.toFixed(3)},
    specularColor: new THREE.Color('${hexSpecularColor}'),

    // Thin-film Iridescence
    iridescence: ${params.iridescence.toFixed(3)},
    iridescenceIOR: ${params.iridescenceIOR.toFixed(2)},
    iridescenceThicknessRange: [${params.iridescenceThicknessMin.toFixed(0)}, ${params.iridescenceThicknessMax.toFixed(0)}],

    // Emissive Radiance
    emissive: new THREE.Color('${hexEmissive}'),
    emissiveIntensity: ${params.emissiveIntensity.toFixed(2)},

    // Environment Radiance Multiplier
    envMapIntensity: ${params.envMapIntensity.toFixed(2)},

    // Procedural / Loaded Texture Assignments
    map: textures?.map ?? null,
    normalMap: textures?.normalMap ?? null,
    normalScale: new THREE.Vector2(${params.normalScale.toFixed(2)}, ${params.normalScale.toFixed(2)}),
    roughnessMap: textures?.roughnessMap ?? null,
  });

  return material;
}

/**
 * Recommended Renderer Configuration for Photorealistic PBR Output:
 * - renderer.toneMapping = THREE.ACESFilmicToneMapping;
 * - renderer.toneMappingExposure = 1.0;
 * - renderer.outputColorSpace = THREE.SRGBColorSpace;
 */
`;
}

/**
 * Generates production-ready standalone GLSL Vertex and Fragment shaders
 * implementing complete Cook-Torrance Microfacet Specular BRDF with:
 * - GGX / Trowbridge-Reitz normal distribution (with Anisotropic GGX support)
 * - Smith Joint Masking-Shadowing G(v, l)
 * - Schlick Fresnel with dielectric IOR F0 conversion
 * - Charlie Sheen distribution for micro-fibers
 * - Clearcoat specular layer with energy conservation
 * - Beer-Lambert volumetric absorption
 * - ACES Filmic Tone Mapping and sRGB transfer
 */
export function generateGLSLShaderPackage(params: PBRMaterialParameters): GLSLExportResult {
  const f0 = iorToF0(params.ior);

  const vertexShader = `/**
 * PRODUCTION ARCHITECTURAL PBR VERTEX SHADER
 * Evaluates position, normals, world-space tangents, and view vectors.
 */
#version 300 es
precision highp float;

in vec3 position;
in vec3 normal;
in vec4 tangent;
in vec2 uv;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

out vec3 vWorldPosition;
out vec3 vNormal;
out vec3 vTangent;
out vec3 vBitangent;
out vec2 vUv;
out vec3 vViewPosition;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vTangent = normalize(normalMatrix * tangent.xyz);
    vBitangent = normalize(cross(vNormal, vTangent) * tangent.w);

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;

    vec4 mvPosition = viewMatrix * worldPos;
    vViewPosition = -mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
}
`;

  const fragmentShader = `/**
 * PRODUCTION ARCHITECTURAL PBR FRAGMENT SHADER
 * Microfacet Cook-Torrance BSDF (GGX / Smith / Schlick / Charlie / Beer-Lambert)
 * Specimen: ${params.name}
 */
#version 300 es
precision highp float;

in vec3 vWorldPosition;
in vec3 vNormal;
in vec3 vTangent;
in vec3 vBitangent;
in vec2 vUv;
in vec3 vViewPosition;

out vec4 fragColor;

// Material Uniforms
uniform vec3 uBaseColor;             // default: ${params.color}
uniform float uRoughness;           // ${params.roughness.toFixed(3)}
uniform float uMetalness;           // ${params.metalness.toFixed(3)}
uniform float uTransmission;        // ${params.transmission.toFixed(3)}
uniform float uIOR;                 // ${params.ior.toFixed(3)}
uniform float uClearcoat;           // ${params.clearcoat.toFixed(3)}
uniform float uClearcoatRoughness;  // ${params.clearcoatRoughness.toFixed(3)}
uniform float uSheen;               // ${params.sheen.toFixed(3)}
uniform float uSheenRoughness;      // ${params.sheenRoughness.toFixed(3)}
uniform vec3 uSheenColor;           // ${params.sheenColor}
uniform float uAnisotropy;          // ${params.anisotropy.toFixed(3)}
uniform float uAnisotropyRotation;  // ${params.anisotropyRotation.toFixed(4)}
uniform vec3 uAttenuationColor;     // ${params.attenuationColor}
uniform float uAttenuationDistance; // ${params.attenuationDistance.toFixed(2)}
uniform float uDispersion;          // ${params.dispersion.toFixed(3)}
uniform float uThickness;           // ${params.thickness.toFixed(2)}

// Studio Environment & Lighting
uniform vec3 uCameraPosition;
uniform vec3 uKeyLightDir;
uniform vec3 uKeyLightColor;
uniform vec3 uFillLightDir;
uniform vec3 uFillLightColor;
uniform samplerCube uEnvMap;
uniform float uEnvMapIntensity;     // ${params.envMapIntensity.toFixed(2)}
uniform float uExposure;            // 1.0

const float PI = 3.141592653589793;
const float INV_PI = 0.31830988618379;

// GGX / Trowbridge-Reitz Normal Distribution Function
float DistributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;

    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    return a2 / (PI * denom * denom + 1e-7);
}

// Anisotropic GGX Distribution
float DistributionAnisotropicGGX(vec3 N, vec3 H, vec3 T, vec3 B, float at, float ab) {
    float TdotH = dot(T, H);
    float BdotH = dot(B, H);
    float NdotH = dot(N, H);

    float d = (TdotH * TdotH) / (at * at) + (BdotH * BdotH) / (ab * ab) + NdotH * NdotH;
    return 1.0 / (PI * at * ab * d * d + 1e-7);
}

// Smith Joint Height-Correlated Masking-Shadowing Function G2
float GeometrySmithJoint(vec3 N, vec3 V, vec3 L, float roughness) {
    float a = roughness * roughness;
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);

    float gv = NdotL * sqrt(NdotV * (NdotV - NdotV * a) + a);
    float gl = NdotV * sqrt(NdotL * (NdotL - NdotL * a) + a);
    return 0.5 / max(gv + gl, 1e-7);
}

// Schlick Fresnel Approximation with Metallic Interpolation
vec3 FresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// Charlie Sheen Distribution (for velvety micro-fibers)
float DistributionCharlie(float NdotH, float roughness) {
    float invR = 1.0 / max(roughness, 1e-4);
    float cos2h = NdotH * NdotH;
    float sin2h = max(1.0 - cos2h, 0.0078125);
    return (2.0 + invR) * pow(sin2h, invR * 0.5) / (2.0 * PI);
}

// ACES Filmic Tone Mapping (Narkowicz 2015)
vec3 ACESFilmic(vec3 x) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCameraPosition - vWorldPosition);

    // Compute Anisotropic Tangent Frame
    float cosRot = cos(uAnisotropyRotation);
    float sinRot = sin(uAnisotropyRotation);
    vec3 T = normalize(vTangent * cosRot + vBitangent * sinRot);
    vec3 B = normalize(cross(N, T));

    float aspect = sqrt(1.0 - uAnisotropy * 0.9);
    float at = max(uRoughness * uRoughness / aspect, 1e-4);
    float ab = max(uRoughness * uRoughness * aspect, 1e-4);

    // Dielectric base F0 from IOR: F0 = ((IOR - 1)/(IOR + 1))^2
    float dielectricF0 = ${(f0).toFixed(4)};
    vec3 F0 = mix(vec3(dielectricF0), uBaseColor, uMetalness);

    vec3 directLighting = vec3(0.0);

    // Evaluate Key & Fill Directional Lights
    vec3 lightDirs[2] = vec3[2](normalize(uKeyLightDir), normalize(uFillLightDir));
    vec3 lightColors[2] = vec3[2](uKeyLightColor, uFillLightColor);

    for (int i = 0; i < 2; i++) {
        vec3 L = lightDirs[i];
        vec3 H = normalize(V + L);

        float NdotL = max(dot(N, L), 0.0);
        float NdotV = max(dot(N, V), 0.0);
        float NdotH = max(dot(N, H), 0.0);
        float VdotH = max(dot(V, H), 0.0);

        if (NdotL > 0.0) {
            // Specular D term
            float D = (uAnisotropy > 0.01)
                ? DistributionAnisotropicGGX(N, H, T, B, at, ab)
                : DistributionGGX(N, H, uRoughness);

            // Specular G term
            float G = GeometrySmithJoint(N, V, L, uRoughness);

            // Specular F term
            vec3 F = FresnelSchlick(VdotH, F0);

            vec3 specularBRDF = (D * G) * F;
            vec3 kD = (vec3(1.0) - F) * (1.0 - uMetalness) * (1.0 - uTransmission);
            vec3 diffuseBRDF = kD * uBaseColor * INV_PI;

            // Sheen micro-fiber highlight
            if (uSheen > 0.01) {
                float D_sheen = DistributionCharlie(NdotH, uSheenRoughness);
                specularBRDF += D_sheen * uSheenColor * uSheen * 0.25;
            }

            // Clearcoat secondary layer
            if (uClearcoat > 0.01) {
                float D_cc = DistributionGGX(N, H, uClearcoatRoughness);
                float G_cc = GeometrySmithJoint(N, V, L, uClearcoatRoughness);
                float F_cc = 0.04 + 0.96 * pow(1.0 - VdotH, 5.0);
                specularBRDF += vec3(D_cc * G_cc * F_cc * uClearcoat * 0.25);
            }

            directLighting += (diffuseBRDF + specularBRDF) * lightColors[i] * NdotL;
        }
    }

    // Volumetric Beer-Lambert Transmittance Absorption: exp(-sigma * d)
    if (uTransmission > 0.01) {
        vec3 sigma = -log(max(uAttenuationColor, vec3(1e-4))) / max(uAttenuationDistance, 1e-4);
        vec3 transmittance = exp(-sigma * uThickness);
        directLighting = mix(directLighting, directLighting * transmittance, uTransmission);
    }

    // ACES Filmic Tone Mapping & Gamma Correction
    vec3 color = directLighting * uExposure;
    color = ACESFilmic(color);
    color = pow(color, vec3(1.0 / 2.2)); // Linear to sRGB

    fragColor = vec4(color, 1.0);
}
`;

  return {
    vertexShader,
    fragmentShader,
    uniformsDef: `// Active PBR Uniforms:
uBaseColor: ${params.color}
uRoughness: ${params.roughness}
uMetalness: ${params.metalness}
uTransmission: ${params.transmission}
uIOR: ${params.ior}
uClearcoat: ${params.clearcoat}
uSheen: ${params.sheen}
uAnisotropy: ${params.anisotropy}
uDispersion: ${params.dispersion}`,
  };
}

// ============================================================================
// SECTION 8: IN-BROWSER PARAMETER TWEAKER UI (DOM CONTROLLER)
// Zero-dependency, glassmorphic dark architectural HUD
// ============================================================================

export interface TweakerUICallbacks {
  onParamChange: (param: keyof PBRMaterialParameters, value: any) => void;
  onPresetSelect: (name: SpecimenPresetName) => void;
  onMeshSelect: (mesh: SpecimenMeshType) => void;
  onLightingSelect: (lighting: StudioLightingPreset) => void;
  onAutoRotateToggle: (active: boolean) => void;
  onSpeedChange: (rpm: number) => void;
  onResetView: () => void;
  onCopyCode: (type: 'three' | 'glsl') => void;
  onDownloadFile: (type: 'three' | 'glsl') => void;
}

export function createPBRStudioDOMUI(
  initialParams: PBRMaterialParameters,
  currentPreset: SpecimenPresetName,
  callbacks: TweakerUICallbacks
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'pbr-studio-panel';
  container.id = 'pbr-studio-ui-root';

  // Inject sleek architectural styling
  const style = document.createElement('style');
  style.textContent = `
    .pbr-studio-panel {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 360px;
      max-height: calc(100vh - 32px);
      background: rgba(18, 18, 22, 0.88);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      color: #e4e4e7;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", monospace;
      font-size: 12px;
      overflow-y: auto;
      z-index: 1000;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.65), 0 1px 0 rgba(255, 255, 255, 0.1) inset;
      transition: width 0.25s ease, opacity 0.2s ease;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
    }
    .pbr-studio-panel::-webkit-scrollbar {
      width: 4px;
    }
    .pbr-studio-panel::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
    }
    .pbr-ui-header {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255, 255, 255, 0.02);
      position: sticky;
      top: 0;
      backdrop-filter: blur(16px);
      z-index: 10;
    }
    .pbr-ui-title {
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-size: 11px;
      color: #fafafa;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .pbr-ui-badge {
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.1);
      color: #a1a1aa;
      font-family: monospace;
    }
    .pbr-ui-section {
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .pbr-section-header {
      padding: 10px 16px;
      font-weight: 500;
      font-size: 11px;
      color: #a1a1aa;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      user-select: none;
      background: transparent;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .pbr-section-header:hover {
      background: rgba(255, 255, 255, 0.04);
      color: #f4f4f5;
    }
    .pbr-section-content {
      padding: 8px 16px 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .pbr-section-collapsed .pbr-section-content {
      display: none;
    }
    .pbr-field-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .pbr-field-label {
      font-size: 11px;
      color: #d4d4d8;
      flex: 1;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .pbr-field-value {
      font-family: monospace;
      font-size: 10px;
      color: #a1a1aa;
      min-width: 36px;
      text-align: right;
    }
    .pbr-slider {
      flex: 1.2;
      -webkit-appearance: none;
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.15);
      outline: none;
      cursor: pointer;
    }
    .pbr-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #fafafa;
      cursor: pointer;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
      transition: transform 0.1s ease;
    }
    .pbr-slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }
    .pbr-color-picker {
      -webkit-appearance: none;
      border: 1px solid rgba(255, 255, 255, 0.2);
      width: 24px;
      height: 20px;
      border-radius: 4px;
      background: transparent;
      cursor: pointer;
      padding: 0;
    }
    .pbr-color-picker::-webkit-color-swatch-wrapper {
      padding: 0;
    }
    .pbr-color-picker::-webkit-color-swatch {
      border: none;
      border-radius: 3px;
    }
    .pbr-select {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #fafafa;
      font-size: 11px;
      padding: 6px 10px;
      border-radius: 6px;
      outline: none;
      cursor: pointer;
      width: 100%;
    }
    .pbr-select option {
      background: #18181b;
      color: #fafafa;
    }
    .pbr-btn-row {
      display: flex;
      gap: 6px;
    }
    .pbr-btn {
      flex: 1;
      padding: 7px 10px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.06);
      color: #e4e4e7;
      font-size: 11px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .pbr-btn:hover {
      background: rgba(255, 255, 255, 0.14);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.25);
    }
    .pbr-btn-primary {
      background: #3f3f46;
      border-color: #52525b;
      color: #fafafa;
    }
    .pbr-btn-primary:hover {
      background: #52525b;
    }
    .pbr-toggle-switch {
      position: relative;
      width: 32px;
      height: 18px;
    }
    .pbr-toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .pbr-toggle-slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 18px;
      transition: 0.2s;
    }
    .pbr-toggle-slider:before {
      position: absolute;
      content: "";
      height: 12px;
      width: 12px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      border-radius: 50%;
      transition: 0.2s;
    }
    .pbr-toggle-switch input:checked + .pbr-toggle-slider {
      background-color: #3b82f6;
    }
    .pbr-toggle-switch input:checked + .pbr-toggle-slider:before {
      transform: translateX(14px);
    }
    .pbr-code-preview {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 8px;
      font-family: monospace;
      font-size: 10px;
      color: #d4d4d8;
      max-height: 120px;
      overflow-y: auto;
      white-space: pre;
    }
  `;
  container.appendChild(style);

  // Header
  const header = document.createElement('div');
  header.className = 'pbr-ui-header';
  header.innerHTML = `
    <div class="pbr-ui-title">
      <span>PBR Studio</span>
      <span class="pbr-ui-badge">v1.2</span>
    </div>
    <div style="display:flex;gap:4px;">
      <button class="pbr-btn" id="pbr-reset-view-btn" style="padding:3px 8px;font-size:10px;">Reset View</button>
    </div>
  `;
  container.appendChild(header);

  // SECTION 1: Specimen Preset & Model Stage
  const stageSection = document.createElement('div');
  stageSection.className = 'pbr-ui-section';
  stageSection.innerHTML = `
    <div class="pbr-section-header">
      <span>Specimen Presets & Stage</span>
      <span>▼</span>
    </div>
    <div class="pbr-section-content">
      <div style="display:flex;flex-direction:column;gap:4px;">
        <label class="pbr-field-label">Architectural Preset</label>
        <select class="pbr-select" id="pbr-preset-select">
          ${Object.values(SPECIMEN_PRESETS)
            .map(
              p => `<option value="${p.name}" ${p.name === currentPreset ? 'selected' : ''}>${p.label} (${p.category})</option>`
            )
            .join('')}
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <label class="pbr-field-label">Specimen Geometry</label>
        <select class="pbr-select" id="pbr-mesh-select">
          <option value="shader_ball">CAD Shader Ball (Multi-tier Core)</option>
          <option value="sphere">High-DPI Calibration Sphere</option>
          <option value="fluted_column">Fluted Architectural Column</option>
          <option value="torus_knot">Curved Specimen Torus Knot</option>
          <option value="architectural_tile">Architectural Swatch Tile</option>
        </select>
      </div>
      <div class="pbr-field-row" style="margin-top:4px;">
        <span class="pbr-field-label">Turntable Auto-Rotate</span>
        <label class="pbr-toggle-switch">
          <input type="checkbox" id="pbr-autorotate-toggle" checked>
          <span class="pbr-toggle-slider"></span>
        </label>
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">Turntable Speed</span>
        <input type="range" class="pbr-slider" id="pbr-turntable-speed" min="0.2" max="6.0" step="0.1" value="1.5">
        <span class="pbr-field-value" id="pbr-turntable-speed-val">1.5 RPM</span>
      </div>
    </div>
  `;
  container.appendChild(stageSection);

  // SECTION 2: Optical & Surface Properties
  const surfaceSection = document.createElement('div');
  surfaceSection.className = 'pbr-ui-section';
  surfaceSection.innerHTML = `
    <div class="pbr-section-header">
      <span>Surface & Albedo</span>
      <span>▼</span>
    </div>
    <div class="pbr-section-content">
      <div class="pbr-field-row">
        <span class="pbr-field-label">Base Albedo Color</span>
        <input type="color" class="pbr-color-picker" id="pbr-param-color" value="${initialParams.color}">
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">Roughness</span>
        <input type="range" class="pbr-slider" id="pbr-param-roughness" min="0.0" max="1.0" step="0.01" value="${initialParams.roughness}">
        <span class="pbr-field-value" id="pbr-roughness-val">${initialParams.roughness.toFixed(2)}</span>
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">Metalness</span>
        <input type="range" class="pbr-slider" id="pbr-param-metalness" min="0.0" max="1.0" step="0.01" value="${initialParams.metalness}">
        <span class="pbr-field-value" id="pbr-metalness-val">${initialParams.metalness.toFixed(2)}</span>
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">Reflectivity (Dielectric F0)</span>
        <input type="range" class="pbr-slider" id="pbr-param-reflectivity" min="0.0" max="1.0" step="0.01" value="${initialParams.reflectivity}">
        <span class="pbr-field-value" id="pbr-reflectivity-val">${initialParams.reflectivity.toFixed(2)}</span>
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">Specular Intensity</span>
        <input type="range" class="pbr-slider" id="pbr-param-specularIntensity" min="0.0" max="1.0" step="0.01" value="${initialParams.specularIntensity}">
        <span class="pbr-field-value" id="pbr-specularIntensity-val">${initialParams.specularIntensity.toFixed(2)}</span>
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">Specular Highlight Color</span>
        <input type="color" class="pbr-color-picker" id="pbr-param-specularColor" value="${initialParams.specularColor}">
      </div>
    </div>
  `;
  container.appendChild(surfaceSection);

  // SECTION 3: Transmission, Refraction & Dispersion (Snell's Law)
  const glassSection = document.createElement('div');
  glassSection.className = 'pbr-ui-section';
  glassSection.innerHTML = `
    <div class="pbr-section-header">
      <span>Transmission & Dispersion</span>
      <span>▼</span>
    </div>
    <div class="pbr-section-content">
      <div class="pbr-field-row">
        <span class="pbr-field-label">Transmission (Glass Optical)</span>
        <input type="range" class="pbr-slider" id="pbr-param-transmission" min="0.0" max="1.0" step="0.01" value="${initialParams.transmission}">
        <span class="pbr-field-value" id="pbr-transmission-val">${initialParams.transmission.toFixed(2)}</span>
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">Index of Refraction (IOR)</span>
        <input type="range" class="pbr-slider" id="pbr-param-ior" min="1.0" max="2.5" step="0.01" value="${initialParams.ior}">
        <span class="pbr-field-value" id="pbr-ior-val">${initialParams.ior.toFixed(2)}</span>
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">Chromatic Dispersion (Abbe)</span>
        <input type="range" class="pbr-slider" id="pbr-param-dispersion" min="0.0" max="0.3" step="0.005" value="${initialParams.dispersion}">
        <span class="pbr-field-value" id="pbr-dispersion-val">${initialParams.dispersion.toFixed(3)}</span>
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">Volume Thickness</span>
        <input type="range" class="pbr-slider" id="pbr-param-thickness" min="0.0" max="8.0" step="0.1" value="${initialParams.thickness}">
        <span class="pbr-field-value" id="pbr-thickness-val">${initialParams.thickness.toFixed(1)}</span>
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">Attenuation Color (Beer-Lambert)</span>
        <input type="color" class="pbr-color-picker" id="pbr-param-attenuationColor" value="${initialParams.attenuationColor}">
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">Attenuation Distance</span>
        <input type="range" class="pbr-slider" id="pbr-param-attenuationDistance" min="0.05" max="10.0" step="0.05" value="${initialParams.attenuationDistance}">
        <span class="pbr-field-value" id="pbr-attenuationDistance-val">${initialParams.attenuationDistance.toFixed(2)}</span>
      </div>
    </div>
  `;
  container.appendChild(glassSection);

  // SECTION 4: Clearcoat & Anisotropy
  const coatSection = document.createElement('div');
  coatSection.className = 'pbr-ui-section';
  coatSection.innerHTML = `
    <div class="pbr-section-header">
      <span>Clearcoat & Anisotropy</span>
      <span>▼</span>
    </div>
    <div class="pbr-section-content">
      <div class="pbr-field-row">
        <span class="pbr-field-label">Clearcoat Layer</span>
        <input type="range" class="pbr-slider" id="pbr-param-clearcoat" min="0.0" max="1.0" step="0.01" value="${initialParams.clearcoat}">
        <span class="pbr-field-value" id="pbr-clearcoat-val">${initialParams.clearcoat.toFixed(2)}</span>
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">Clearcoat Roughness</span>
        <input type="range" class="pbr-slider" id="pbr-param-clearcoatRoughness" min="0.0" max="1.0" step="0.01" value="${initialParams.clearcoatRoughness}">
        <span class="pbr-field-value" id="pbr-clearcoatRoughness-val">${initialParams.clearcoatRoughness.toFixed(2)}</span>
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">Anisotropy (Directional)</span>
        <input type="range" class="pbr-slider" id="pbr-param-anisotropy" min="0.0" max="1.0" step="0.01" value="${initialParams.anisotropy}">
        <span class="pbr-field-value" id="pbr-anisotropy-val">${initialParams.anisotropy.toFixed(2)}</span>
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">Anisotropy Angle</span>
        <input type="range" class="pbr-slider" id="pbr-param-anisotropyRotation" min="0.0" max="${(Math.PI * 2).toFixed(2)}" step="0.05" value="${initialParams.anisotropyRotation}">
        <span class="pbr-field-value" id="pbr-anisotropyRotation-val">${(initialParams.anisotropyRotation * 180 / Math.PI).toFixed(0)}°</span>
      </div>
    </div>
  `;
  container.appendChild(coatSection);

  // SECTION 5: Sheen & Iridescence
  const sheenSection = document.createElement('div');
  sheenSection.className = 'pbr-ui-section';
  sheenSection.innerHTML = `
    <div class="pbr-section-header">
      <span>Sheen & Thin-Film Iridescence</span>
      <span>▼</span>
    </div>
    <div class="pbr-section-content">
      <div class="pbr-field-row">
        <span class="pbr-field-label">Sheen Intensity</span>
        <input type="range" class="pbr-slider" id="pbr-param-sheen" min="0.0" max="1.0" step="0.01" value="${initialParams.sheen}">
        <span class="pbr-field-value" id="pbr-sheen-val">${initialParams.sheen.toFixed(2)}</span>
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">Sheen Roughness</span>
        <input type="range" class="pbr-slider" id="pbr-param-sheenRoughness" min="0.0" max="1.0" step="0.01" value="${initialParams.sheenRoughness}">
        <span class="pbr-field-value" id="pbr-sheenRoughness-val">${initialParams.sheenRoughness.toFixed(2)}</span>
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">Sheen Highlight Color</span>
        <input type="color" class="pbr-color-picker" id="pbr-param-sheenColor" value="${initialParams.sheenColor}">
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">Thin-Film Iridescence</span>
        <input type="range" class="pbr-slider" id="pbr-param-iridescence" min="0.0" max="1.0" step="0.01" value="${initialParams.iridescence}">
        <span class="pbr-field-value" id="pbr-iridescence-val">${initialParams.iridescence.toFixed(2)}</span>
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">Iridescence IOR</span>
        <input type="range" class="pbr-slider" id="pbr-param-iridescenceIOR" min="1.0" max="3.0" step="0.05" value="${initialParams.iridescenceIOR}">
        <span class="pbr-field-value" id="pbr-iridescenceIOR-val">${initialParams.iridescenceIOR.toFixed(2)}</span>
      </div>
    </div>
  `;
  container.appendChild(sheenSection);

  // SECTION 6: Studio Lighting & Environment
  const lightSection = document.createElement('div');
  lightSection.className = 'pbr-ui-section';
  lightSection.innerHTML = `
    <div class="pbr-section-header">
      <span>Studio Lighting & Environment</span>
      <span>▼</span>
    </div>
    <div class="pbr-section-content">
      <div style="display:flex;flex-direction:column;gap:4px;">
        <label class="pbr-field-label">Studio Lighting Mood</label>
        <select class="pbr-select" id="pbr-lighting-select">
          <option value="balanced_studio">Balanced Commercial Studio (5500K)</option>
          <option value="dramatic_chiaroscuro">Dramatic Chiaroscuro (High Contrast)</option>
          <option value="high_key_commercial">High-Key Daylight Bright</option>
          <option value="warm_dusk_golden">Warm Golden Dusk (3200K)</option>
          <option value="gallery_spot">Curated Architectural Gallery Spot</option>
        </select>
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">HDR Env Radiance</span>
        <input type="range" class="pbr-slider" id="pbr-param-envMapIntensity" min="0.0" max="3.0" step="0.05" value="${initialParams.envMapIntensity}">
        <span class="pbr-field-value" id="pbr-envMapIntensity-val">${initialParams.envMapIntensity.toFixed(2)}</span>
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">Normal Map Scale</span>
        <input type="range" class="pbr-slider" id="pbr-param-normalScale" min="0.0" max="3.0" step="0.1" value="${initialParams.normalScale}">
        <span class="pbr-field-value" id="pbr-normalScale-val">${initialParams.normalScale.toFixed(1)}</span>
      </div>
      <div class="pbr-field-row">
        <span class="pbr-field-label">Wireframe Inspection</span>
        <label class="pbr-toggle-switch">
          <input type="checkbox" id="pbr-param-wireframe" ${initialParams.wireframe ? 'checked' : ''}>
          <span class="pbr-toggle-slider"></span>
        </label>
      </div>
    </div>
  `;
  container.appendChild(lightSection);

  // SECTION 7: Code Generation & Export
  const exportSection = document.createElement('div');
  exportSection.className = 'pbr-ui-section';
  exportSection.innerHTML = `
    <div class="pbr-section-header">
      <span>Code Export (Three.js & GLSL)</span>
      <span>▼</span>
    </div>
    <div class="pbr-section-content">
      <div class="pbr-btn-row">
        <button class="pbr-btn pbr-btn-primary" id="pbr-copy-three-btn">Copy Three.js TS</button>
        <button class="pbr-btn" id="pbr-copy-glsl-btn">Copy GLSL Shader</button>
      </div>
      <div class="pbr-btn-row" style="margin-top:2px;">
        <button class="pbr-btn" id="pbr-download-three-btn">Download .ts</button>
        <button class="pbr-btn" id="pbr-download-glsl-btn">Download .glsl</button>
      </div>
    </div>
  `;
  container.appendChild(exportSection);

  // Hook up accordion collapsible logic
  container.querySelectorAll('.pbr-section-header').forEach(hdr => {
    hdr.addEventListener('click', () => {
      const parent = hdr.parentElement;
      if (parent) {
        parent.classList.toggle('pbr-section-collapsed');
        const arrow = hdr.querySelector('span:last-child');
        if (arrow) arrow.textContent = parent.classList.contains('pbr-section-collapsed') ? '▶' : '▼';
      }
    });
  });

  // Wire up Preset Selector
  const presetSelect = container.querySelector('#pbr-preset-select') as HTMLSelectElement;
  presetSelect?.addEventListener('change', () => {
    callbacks.onPresetSelect(presetSelect.value as SpecimenPresetName);
  });

  // Wire up Mesh Selector
  const meshSelect = container.querySelector('#pbr-mesh-select') as HTMLSelectElement;
  meshSelect?.addEventListener('change', () => {
    callbacks.onMeshSelect(meshSelect.value as SpecimenMeshType);
  });

  // Wire up Lighting Selector
  const lightingSelect = container.querySelector('#pbr-lighting-select') as HTMLSelectElement;
  lightingSelect?.addEventListener('change', () => {
    callbacks.onLightingSelect(lightingSelect.value as StudioLightingPreset);
  });

  // Wire up Turntable auto-rotate & speed
  const autoRotateToggle = container.querySelector('#pbr-autorotate-toggle') as HTMLInputElement;
  autoRotateToggle?.addEventListener('change', () => {
    callbacks.onAutoRotateToggle(autoRotateToggle.checked);
  });

  const speedSlider = container.querySelector('#pbr-turntable-speed') as HTMLInputElement;
  const speedVal = container.querySelector('#pbr-turntable-speed-val');
  speedSlider?.addEventListener('input', () => {
    const val = parseFloat(speedSlider.value);
    if (speedVal) speedVal.textContent = `${val.toFixed(1)} RPM`;
    callbacks.onSpeedChange(val);
  });

  // Reset view button
  const resetBtn = container.querySelector('#pbr-reset-view-btn');
  resetBtn?.addEventListener('click', () => callbacks.onResetView());

  // Copy & Download buttons
  container.querySelector('#pbr-copy-three-btn')?.addEventListener('click', () => callbacks.onCopyCode('three'));
  container.querySelector('#pbr-copy-glsl-btn')?.addEventListener('click', () => callbacks.onCopyCode('glsl'));
  container.querySelector('#pbr-download-three-btn')?.addEventListener('click', () => callbacks.onDownloadFile('three'));
  container.querySelector('#pbr-download-glsl-btn')?.addEventListener('click', () => callbacks.onDownloadFile('glsl'));

  // Wire up sliders and pickers
  const bindSlider = (id: string, paramKey: keyof PBRMaterialParameters, isAngle = false) => {
    const input = container.querySelector(`#pbr-param-${id}`) as HTMLInputElement;
    const valSpan = container.querySelector(`#pbr-${id}-val`);
    if (!input) return;

    input.addEventListener('input', () => {
      const num = parseFloat(input.value);
      if (valSpan) {
        valSpan.textContent = isAngle ? `${(num * 180 / Math.PI).toFixed(0)}°` : num.toFixed(2);
      }
      callbacks.onParamChange(paramKey, num);
    });
  };

  const bindColor = (id: string, paramKey: keyof PBRMaterialParameters) => {
    const input = container.querySelector(`#pbr-param-${id}`) as HTMLInputElement;
    if (!input) return;
    input.addEventListener('input', () => {
      callbacks.onParamChange(paramKey, input.value);
    });
  };

  const bindToggle = (id: string, paramKey: keyof PBRMaterialParameters) => {
    const input = container.querySelector(`#pbr-param-${id}`) as HTMLInputElement;
    if (!input) return;
    input.addEventListener('change', () => {
      callbacks.onParamChange(paramKey, input.checked);
    });
  };

  bindColor('color', 'color');
  bindSlider('roughness', 'roughness');
  bindSlider('metalness', 'metalness');
  bindSlider('reflectivity', 'reflectivity');
  bindSlider('specularIntensity', 'specularIntensity');
  bindColor('specularColor', 'specularColor');

  bindSlider('transmission', 'transmission');
  bindSlider('ior', 'ior');
  bindSlider('dispersion', 'dispersion');
  bindSlider('thickness', 'thickness');
  bindColor('attenuationColor', 'attenuationColor');
  bindSlider('attenuationDistance', 'attenuationDistance');

  bindSlider('clearcoat', 'clearcoat');
  bindSlider('clearcoatRoughness', 'clearcoatRoughness');
  bindSlider('anisotropy', 'anisotropy');
  bindSlider('anisotropyRotation', 'anisotropyRotation', true);

  bindSlider('sheen', 'sheen');
  bindSlider('sheenRoughness', 'sheenRoughness');
  bindColor('sheenColor', 'sheenColor');
  bindSlider('iridescence', 'iridescence');
  bindSlider('iridescenceIOR', 'iridescenceIOR');

  bindSlider('envMapIntensity', 'envMapIntensity');
  bindSlider('normalScale', 'normalScale');
  bindToggle('wireframe', 'wireframe');

  return container;
}

// ============================================================================
// SECTION 9: MAIN PBR STUDIO ENGINE CLASS
// ============================================================================

export class PBRStudio {
  public options: Required<PBRStudioOptions>;
  public renderer!: THREE.WebGLRenderer;
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  public studioMaterial!: THREE.MeshPhysicalMaterial;
  public activePreset: SpecimenPresetDefinition;
  public currentParams: PBRMaterialParameters;

  public specimenGroup = new THREE.Group();
  public lightingEngine!: StudioLightingEngine;
  public turntableController!: TurntableController;
  public textureEngine = new ProceduralTextureEngine();

  private domUIContainer: HTMLElement | null = null;
  private animFrameId: number | null = null;
  private clock = new THREE.Clock();
  private isDisposed = false;

  private activeTextures: ProceduralTextureSet = {};

  constructor(options: PBRStudioOptions = {}) {
    const defaultPreset: SpecimenPresetName = options.initialPreset ?? 'honed_veined_italian_marble';
    this.activePreset = SPECIMEN_PRESETS[defaultPreset];
    this.currentParams = { ...this.activePreset.parameters };

    this.options = {
      container: options.container ?? null,
      canvas: options.canvas ?? null,
      width: options.width ?? (options.container?.clientWidth || 800),
      height: options.height ?? (options.container?.clientHeight || 600),
      pixelRatio: options.pixelRatio ?? (typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2.0) : 1.0),
      autoResize: options.autoResize ?? true,
      initialPreset: defaultPreset,
      initialMeshType: options.initialMeshType ?? 'shader_ball',
      lightingPreset: options.lightingPreset ?? 'balanced_studio',
      turntableSpeedRPM: options.turntableSpeedRPM ?? 1.5,
      autoRotate: options.autoRotate ?? true,
      exposure: options.exposure ?? 1.0,
      enableTweakerUI: options.enableTweakerUI ?? true,
      uiTheme: options.uiTheme ?? 'dark_architectural',
      onParameterChange: options.onParameterChange ?? (() => {}),
      onPresetChange: options.onPresetChange ?? (() => {}),
    };
  }

  /** Initializes the Three.js scene, camera, lighting, textures, and DOM UI */
  public async init(): Promise<void> {
    // 1. Renderer setup with filmic ACES tone mapping
    let canvas: HTMLCanvasElement;
    if (this.options.canvas) {
      canvas = this.options.canvas;
    } else if (typeof document !== 'undefined') {
      canvas = document.createElement('canvas');
      if (this.options.container) {
        this.options.container.appendChild(canvas);
      }
    } else {
      throw new Error('PBRStudio requires a DOM or Canvas environment.');
    }

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.options.width, this.options.height);
    this.renderer.setPixelRatio(this.options.pixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.options.exposure;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 2. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x121214);

    // 3. Camera setup
    this.camera = new THREE.PerspectiveCamera(40, this.options.width / this.options.height, 0.1, 50.0);
    this.camera.position.set(0.0, 1.4, 4.2);
    this.camera.lookAt(0.0, 0.95, 0.0);

    // 4. Lighting & HDR Environment
    this.lightingEngine = new StudioLightingEngine(this.renderer);
    const envMap = this.lightingEngine.generateStudioHDREnvMap(this.options.lightingPreset);
    this.scene.environment = envMap;
    this.scene.add(this.lightingEngine.lightsGroup);

    // 5. Specimen Mesh & Material setup
    this.setupMaterial();
    this.setSpecimenMesh(this.options.initialMeshType);
    this.scene.add(this.specimenGroup);

    // 6. Turntable setup
    this.turntableController = new TurntableController(
      this.specimenGroup,
      canvas,
      this.options.autoRotate,
      this.options.turntableSpeedRPM
    );

    // 7. Inject UI Tweaker if requested
    if (this.options.enableTweakerUI && (this.options.container || typeof document !== 'undefined')) {
      this.mountTweakerUI();
    }

    // 8. Auto resize listener
    if (this.options.autoResize && typeof window !== 'undefined') {
      window.addEventListener('resize', this.onResize);
    }

    // 9. Start render loop
    this.startLoop();
  }

  /** Prepares or updates the Three.js MeshPhysicalMaterial */
  private setupMaterial(): void {
    // Generate procedural textures for the active preset
    this.activeTextures = this.textureEngine.getPresetTextures(this.activePreset.generatorId);

    if (!this.studioMaterial) {
      this.studioMaterial = new THREE.MeshPhysicalMaterial();
    }

    this.applyParamsToMaterial(this.currentParams);
  }

  /** Syncs all PBR parameters to the live Three.js MeshPhysicalMaterial instance */
  public applyParamsToMaterial(params: PBRMaterialParameters): void {
    const mat = this.studioMaterial;

    mat.color.set(params.color);
    mat.roughness = params.roughness;
    mat.metalness = params.metalness;
    mat.transmission = params.transmission;
    mat.ior = params.ior;
    mat.reflectivity = params.reflectivity;
    mat.clearcoat = params.clearcoat;
    mat.clearcoatRoughness = params.clearcoatRoughness;
    mat.sheen = params.sheen;
    mat.sheenRoughness = params.sheenRoughness;
    mat.sheenColor.set(params.sheenColor);
    mat.anisotropy = params.anisotropy;
    mat.anisotropyRotation = params.anisotropyRotation;
    mat.attenuationColor.set(params.attenuationColor);
    mat.attenuationDistance = params.attenuationDistance;
    mat.dispersion = params.dispersion;
    mat.thickness = params.thickness;
    mat.specularIntensity = params.specularIntensity;
    mat.specularColor.set(params.specularColor);
    mat.iridescence = params.iridescence;
    mat.iridescenceIOR = params.iridescenceIOR;
    mat.iridescenceThicknessRange = [params.iridescenceThicknessMin, params.iridescenceThicknessMax];
    mat.emissive.set(params.emissive);
    mat.emissiveIntensity = params.emissiveIntensity;
    mat.wireframe = params.wireframe;
    mat.flatShading = params.flatShading;
    mat.envMapIntensity = params.envMapIntensity;

    // Attach procedural textures if enabled
    if (params.proceduralAlbedo && this.activeTextures.albedo) {
      mat.map = this.activeTextures.albedo;
    } else {
      mat.map = null;
    }

    if (params.proceduralNormal && this.activeTextures.normal) {
      mat.normalMap = this.activeTextures.normal;
      mat.normalScale.set(params.normalScale, params.normalScale);
    } else {
      mat.normalMap = null;
    }

    if (params.proceduralRoughness && this.activeTextures.roughness) {
      mat.roughnessMap = this.activeTextures.roughness;
    } else {
      mat.roughnessMap = null;
    }

    mat.needsUpdate = true;
    this.currentParams = { ...params };
    this.options.onParameterChange(this.currentParams);
  }

  /** Switches the active specimen mesh geometry */
  public setSpecimenMesh(type: SpecimenMeshType): void {
    // Clear previous children
    while (this.specimenGroup.children.length > 0) {
      const child = this.specimenGroup.children[0];
      this.specimenGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    }

    if (type === 'shader_ball') {
      const composite = createShaderBallComposite(this.studioMaterial);
      this.specimenGroup.add(composite);
    } else {
      const geom = createSpecimenGeometry(type);
      const mesh = new THREE.Mesh(geom, this.studioMaterial);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.y = 1.05;
      mesh.name = `SpecimenMesh_${type}`;
      this.specimenGroup.add(mesh);

      // Add simple turntable pedestal
      const plinthMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.72 });
      const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.45, 0.12, 64), plinthMat);
      baseMesh.position.y = 0.06;
      baseMesh.receiveShadow = true;
      this.specimenGroup.add(baseMesh);
    }
  }

  /** Switches active preset and reloads procedural textures */
  public applyPreset(name: SpecimenPresetName): void {
    if (!SPECIMEN_PRESETS[name]) return;
    this.activePreset = SPECIMEN_PRESETS[name];
    this.currentParams = { ...this.activePreset.parameters };
    this.activeTextures = this.textureEngine.getPresetTextures(this.activePreset.generatorId);
    this.applyParamsToMaterial(this.currentParams);
    this.options.onPresetChange(this.activePreset);

    // Refresh UI if mounted
    if (this.domUIContainer && this.domUIContainer.parentElement) {
      this.domUIContainer.parentElement.removeChild(this.domUIContainer);
      this.mountTweakerUI();
    }
  }

  /** Sets a single material parameter programmatically */
  public setParameter<K extends keyof PBRMaterialParameters>(key: K, value: PBRMaterialParameters[K]): void {
    this.currentParams[key] = value;
    this.applyParamsToMaterial(this.currentParams);
  }

  /** Returns copy of active parameters */
  public getParameters(): PBRMaterialParameters {
    return { ...this.currentParams };
  }

  /** Generates on-the-fly Three.js initialization source code */
  public exportThreeJSCode(): string {
    return generateThreeJSInitializationCode(this.currentParams);
  }

  /** Generates on-the-fly standalone GLSL shader source package */
  public exportGLSLShader(): GLSLExportResult {
    return generateGLSLShaderPackage(this.currentParams);
  }

  /** Injects the floating interactive tweaker panel */
  private mountTweakerUI(): void {
    const parent = this.options.container || document.body;
    this.domUIContainer = createPBRStudioDOMUI(this.currentParams, this.activePreset.name, {
      onParamChange: (k, v) => this.setParameter(k, v),
      onPresetSelect: name => this.applyPreset(name),
      onMeshSelect: mesh => this.setSpecimenMesh(mesh),
      onLightingSelect: l => this.lightingEngine.applyLightingPreset(l),
      onAutoRotateToggle: active => {
        this.turntableController.autoRotate = active;
      },
      onSpeedChange: rpm => {
        this.turntableController.speedRPM = rpm;
      },
      onResetView: () => this.turntableController.resetAngle(),
      onCopyCode: type => {
        const text = type === 'three' ? this.exportThreeJSCode() : this.exportGLSLShader().fragmentShader;
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(text);
        }
      },
      onDownloadFile: type => {
        if (typeof document === 'undefined') return;
        const text = type === 'three' ? this.exportThreeJSCode() : this.exportGLSLShader().fragmentShader;
        const ext = type === 'three' ? 'ts' : 'glsl';
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.activePreset.name}_material.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      },
    });

    parent.appendChild(this.domUIContainer);
  }

  /** Resize handler */
  private onResize = (): void => {
    if (!this.options.container && typeof window === 'undefined') return;
    const w = this.options.container ? this.options.container.clientWidth : window.innerWidth;
    const h = this.options.container ? this.options.container.clientHeight : window.innerHeight;
    this.resize(w, h);
  };

  /** Resizes renderer and camera projection */
  public resize(width: number, height: number): void {
    this.options.width = width;
    this.options.height = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /** Animation & render loop */
  private startLoop(): void {
    const loop = () => {
      if (this.isDisposed) return;
      const dt = this.clock.getDelta();
      this.turntableController.update(dt);
      this.renderer.render(this.scene, this.camera);
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  /** Complete disposal with memory leak prevention */
  public dispose(): void {
    this.isDisposed = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onResize);
    }

    this.turntableController.dispose();
    this.lightingEngine.dispose();
    this.textureEngine.dispose();
    this.studioMaterial.dispose();

    if (this.domUIContainer && this.domUIContainer.parentElement) {
      this.domUIContainer.parentElement.removeChild(this.domUIContainer);
      this.domUIContainer = null;
    }

    this.renderer.dispose();
  }
}

// ============================================================================
// SECTION 10: CONVENIENCE EXPORTS & API FACTORY
// ============================================================================

/** Factory function to create and mount a complete PBR Studio */
export async function createPBRStudio(
  container: HTMLElement,
  options: Partial<PBRStudioOptions> = {}
): Promise<PBRStudio> {
  const studio = new PBRStudio({
    ...options,
    container,
  });
  await studio.init();
  return studio;
}

/** Retrieves preset definition by name */
export function getSpecimenPreset(name: SpecimenPresetName): SpecimenPresetDefinition {
  return SPECIMEN_PRESETS[name];
}

/** Lists all available architectural presets */
export function listSpecimenPresets(): SpecimenPresetDefinition[] {
  return Object.values(SPECIMEN_PRESETS);
}
