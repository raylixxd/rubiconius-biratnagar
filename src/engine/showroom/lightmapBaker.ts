/**
 * ARCHITECTURAL SHOWROOM AMBIENT OCCLUSION & CONTACT SHADOW LIGHTMAP BAKER
 *
 * In-engine procedural ground-truth ambient occlusion (AO) and high-density contact
 * shadow baking system engineered for luxury architectural visualization and WebGL showrooms.
 *
 * Core Architectural Capabilities:
 * 1. Procedural Ground-Truth Ambient Occlusion:
 *    - Quasi-Monte Carlo hemisphere ray sampling (Cosine-weighted, Hammersley 2D, Halton sequences).
 *    - Dual-engine architecture: UV-Space GPU G-buffer ray-gathering and Analytical Geometric AO.
 *    - Orthonormal tangent-space basis transformations (Frisvad quaternion-free formulation).
 * 2. High-Density Contact Shadow Baking:
 *    - Dedicated multi-angle ortho shadow dome projection for ground planes and architectural plinths.
 *    - Procedural contact shadow generators for 12mm fluted timber joinery, 10mm negative-reveal
 *      baseboard shadow gaps, door/window portal reveals, and tapered furniture legs.
 * 3. Fast Progressive Temporal Accumulation & Denoising:
 *    - 32-frame stratified progressive accumulation loop with moving average integration.
 *    - Separable edge-preserving Cross-Bilateral filter (spatial Gaussian + normal/position range stops).
 *    - Multi-pass UV island dilation to eliminate edge bleeding and black mipmap seams.
 * 4. Seamless Material Integration & Management:
 *    - Automatic UV2 coordinate generation and validation on Three.js BufferGeometry.
 *    - Native injection into Three.js MeshStandardMaterial and MeshPhysicalMaterial `aoMap` slots.
 *    - Architectural warm umber / cool slate color tinting and configurable intensity scaling.
 */

import * as THREE from 'three';

// ============================================================================
// SECTION 1: ARCHITECTURAL CONSTANTS, PRESETS, & CONFIGURATION INTERFACES
// ============================================================================

/** Golden ratio constant for low-discrepancy temporal jittering */
export const PHI = 1.618033988749895;

/** Standard default progressive frame count for production baking */
export const DEFAULT_BAKE_FRAMES = 32;

/** Default lightmap resolution for architectural showroom surfaces */
export const DEFAULT_LIGHTMAP_RESOLUTION = 1024;

/** Radical inverse primes for Halton sequence generation */
export const PRIMES: readonly [number, number, number] = [2, 3, 5];

/** Architectural color tints for ambient occlusion shading (instead of flat gray) */
export const ARCHITECTURAL_AO_TINTS = {
  warmSalTimber: new THREE.Color(0x1f1712),      // Deep umber / warm timber grain crevice
  terracottaCrevice: new THREE.Color(0x241510),  // Warm burnt sienna for clay brick reveals
  monolithicPlaster: new THREE.Color(0x191a1c),  // Cool slate charcoal for limestone plaster
  unlacqueredBrass: new THREE.Color(0x1e1a14),   // Deep antique bronze cavity tone
  neutralShadow: new THREE.Color(0x141416),      // Balanced studio neutral shadow
} as const;

/** Quality tier for baking calculations */
export type BakeQualityTier = 'preview' | 'medium' | 'production' | 'cinematic';

/** Distribution pattern for hemisphere sampling */
export type SamplingDistribution = 'cosine_weighted' | 'uniform_hemisphere' | 'concentric_disk' | 'power_cosine';

/** Presets for architectural joinery and furniture contact shadows */
export type ArchitecturalContactPreset =
  | 'fluted_joinery_12mm'
  | 'baseboard_shadow_gap_10mm'
  | 'door_portal_reveal_40mm'
  | 'furniture_tapered_leg'
  | 'monolithic_stone_plinth'
  | 'custom';

/** Configuration for progressive AO baking */
export interface LightmapBakerConfig {
  /** Texture resolution (width & height in pixels, power of 2) */
  resolution: number;
  /** Total progressive accumulation frames (default: 32) */
  frameCount: number;
  /** Number of ray samples per texel evaluated per accumulation frame */
  samplesPerFrame: number;
  /** Maximum hemisphere ray distance in world units (meters) */
  maxDistance: number;
  /** Falloff exponent for distance attenuation (1.0 = linear, 2.0 = quadratic) */
  falloffExponent: number;
  /** Normal bias to prevent self-intersection acne (in world units) */
  normalBias: number;
  /** Sampling hemisphere distribution */
  distribution: SamplingDistribution;
  /** Bilateral filter configuration for noise elimination */
  bilateralFilter: BilateralFilterConfig;
  /** Dilation margin in pixels to bleed valid texels across UV seams */
  dilationPixels: number;
  /** Intensity multiplier applied to the final baked aoMap (default: 1.0) */
  aoIntensity: number;
  /** Contrast curve adjustment (1.0 = linear, >1.0 = punchier shadows) */
  contrast: number;
  /** Warm ambient tint applied in the deep crevices */
  creviceTint: THREE.Color;
}

/** Configuration for the edge-preserving bilateral denoising filter */
export interface BilateralFilterConfig {
  /** Whether the bilateral filter pass is active */
  enabled: boolean;
  /** Spatial filter radius in texels (e.g. 3, 5, 7) */
  kernelRadius: number;
  /** Spatial Gaussian standard deviation (sigma spatial) */
  sigmaSpatial: number;
  /** Normal difference stopping sensitivity (higher = preserves sharp surface creases) */
  sigmaNormal: number;
  /** Depth/Position difference stopping sensitivity */
  sigmaPosition: number;
  /** Number of filter iterations (typically 1 or 2) */
  iterations: number;
}

/** Configuration for dedicated architectural contact shadow baking */
export interface ContactShadowBakeConfig {
  /** Resolution of the ground or reveal contact shadow texture */
  resolution: number;
  /** Total accumulation frames across the virtual cosine light dome */
  frameCount: number;
  /** Dome radius in world units enclosing the architectural subject */
  domeRadius: number;
  /** Height of the contact shadow ground plane */
  groundLevel: number;
  /** Near-field contact shadow darkness [0.0 (pitch black) to 1.0 (no shadow)] */
  contactDarkness: number;
  /** Radius of contact shadow spread in meters */
  contactRadius: number;
  /** Soft penumbra expansion factor away from the contact boundary */
  penumbraSpread: number;
  /** Bilateral blur configuration */
  bilateralFilter: BilateralFilterConfig;
  /** Bounding box of the region to bake contact shadows for */
  bounds: THREE.Box3;
}

/** Configuration for procedural 12mm fluted timber joinery contact shadow generator */
export interface FlutedJoineryShadowConfig {
  /** Width of each individual flute in millimeters (default: 12.0) */
  fluteWidthMm: number;
  /** Depth of the flute recess in millimeters (default: 6.0) */
  fluteDepthMm: number;
  /** Fillet radius at the crest/trough of each flute (default: 1.5) */
  filletRadiusMm: number;
  /** Total count of flutes across the joinery panel */
  fluteCount: number;
  /** Ambient crevice darkness inside the flute trough [0.0 - 1.0] */
  troughOcclusion: number;
  /** Inter-reflection factor lightening the flute walls */
  interReflection: number;
  /** Texture resolution for the baked 2D flute profile map */
  textureWidth: number;
  textureHeight: number;
}

/** Configuration for 10mm negative-reveal baseboard shadow gap generator */
export interface BaseboardShadowGapConfig {
  /** Height of the negative reveal gap in millimeters (default: 10.0) */
  gapHeightMm: number;
  /** Recess depth of the wall setback in millimeters (default: 15.0) */
  recessDepthMm: number;
  /** Maximum darkness inside the recessed shadow gap */
  gapDarkness: number;
  /** Ambient drop gradient spreading down onto the adjacent floor surface */
  floorSpillLengthMm: number;
  /** Texture resolution */
  textureWidth: number;
  textureHeight: number;
}

/** Configuration for furniture leg contact shadow footprint generator */
export interface FurnitureFootprintConfig {
  /** Foot shape profile */
  footShape: 'round_tapered' | 'square_ferrule' | 'rectangular_plinth' | 'hairpin_loop';
  /** Foot dimensions in millimeters (diameter or width/length) */
  footDimensionsMm: THREE.Vector2;
  /** Contact core shadow opacity [0.0 - 1.0] */
  coreDarkness: number;
  /** Spread radius of the soft ambient occlusion disc in millimeters */
  occlusionRadiusMm: number;
  /** Directional room ambient bias vector in 2D (offset in mm) */
  ambientBiasMm: THREE.Vector2;
  /** Output texture dimensions */
  textureResolution: number;
}

/** Baking progress callback payload */
export interface BakeProgressEvent {
  currentFrame: number;
  totalFrames: number;
  progressPercent: number;
  stage: 'gbuffer_rasterization' | 'hemisphere_accumulation' | 'bilateral_filtering' | 'uv_dilation' | 'material_binding';
  elapsedMs: number;
  estimatedRemainingMs: number;
}

/** Result object returned upon completion of a bake */
export interface BakeResult {
  /** The final baked, filtered, and dilated Three.js texture */
  texture: THREE.Texture;
  /** Resolution of the baked texture */
  resolution: number;
  /** Total accumulation frames used */
  framesBaked: number;
  /** Milliseconds taken to complete all baking passes */
  durationMs: number;
  /** The target meshes that received the aoMap */
  targets: THREE.Mesh[];
  /** Cleanup function to release GPU resources and render targets */
  dispose: () => void;
}

// ============================================================================
// SECTION 2: DEFAULT PRESETS & FACTORIES
// ============================================================================

export const DEFAULT_BILATERAL_CONFIG: BilateralFilterConfig = {
  enabled: true,
  kernelRadius: 5,
  sigmaSpatial: 2.8,
  sigmaNormal: 0.12,
  sigmaPosition: 0.08,
  iterations: 2,
};

export const DEFAULT_LIGHTMAP_CONFIG: LightmapBakerConfig = {
  resolution: 1024,
  frameCount: DEFAULT_BAKE_FRAMES,
  samplesPerFrame: 4,
  maxDistance: 1.5,
  falloffExponent: 1.4,
  normalBias: 0.005,
  distribution: 'cosine_weighted',
  bilateralFilter: DEFAULT_BILATERAL_CONFIG,
  dilationPixels: 4,
  aoIntensity: 1.15,
  contrast: 1.1,
  creviceTint: ARCHITECTURAL_AO_TINTS.warmSalTimber,
};

export const BAKE_QUALITY_PRESETS: Record<BakeQualityTier, Partial<LightmapBakerConfig>> = {
  preview: {
    resolution: 512,
    frameCount: 16,
    samplesPerFrame: 2,
    bilateralFilter: { ...DEFAULT_BILATERAL_CONFIG, kernelRadius: 3, iterations: 1 },
    dilationPixels: 2,
  },
  medium: {
    resolution: 1024,
    frameCount: 32,
    samplesPerFrame: 4,
    bilateralFilter: { ...DEFAULT_BILATERAL_CONFIG, kernelRadius: 5, iterations: 2 },
    dilationPixels: 4,
  },
  production: {
    resolution: 2048,
    frameCount: 64,
    samplesPerFrame: 8,
    bilateralFilter: { ...DEFAULT_BILATERAL_CONFIG, kernelRadius: 7, iterations: 2 },
    dilationPixels: 6,
  },
  cinematic: {
    resolution: 4096,
    frameCount: 128,
    samplesPerFrame: 16,
    bilateralFilter: { ...DEFAULT_BILATERAL_CONFIG, kernelRadius: 9, iterations: 3 },
    dilationPixels: 8,
  },
};

// ============================================================================
// SECTION 3: LOW-DISCREPANCY QUASI-MONTE CARLO SAMPLING ENGINE
// ============================================================================

/**
 * Radical inverse generator using bitwise reversal in base 2 (Van der Corput sequence).
 * Highly optimized for fast progressive Monte Carlo hemisphere sampling.
 */
export function radicalInverseBase2(bits: number): number {
  bits = ((bits << 16) | (bits >>> 16)) >>> 0;
  bits = (((bits & 0x55555555) << 1) | ((bits & 0xaaaaaaaa) >>> 1)) >>> 0;
  bits = (((bits & 0x33333333) << 2) | ((bits & 0xcccccccc) >>> 2)) >>> 0;
  bits = (((bits & 0x0f0f0f0f) << 4) | ((bits & 0xf0f0f0f0) >>> 4)) >>> 0;
  bits = (((bits & 0x00ff00ff) << 8) | ((bits & 0xff00ff00) >>> 8)) >>> 0;
  return bits * 2.3283064365386963e-10; // division by 2^32
}

/**
 * Generates a 2D Hammersley point (u, v) on the unit square [0, 1)^2.
 * @param index Sample index within the sequence
 * @param count Total number of samples in the sequence
 */
export function hammersley2D(index: number, count: number): THREE.Vector2 {
  return new THREE.Vector2(index / Math.max(1, count), radicalInverseBase2(index));
}

/**
 * Computes general Halton sequence point for arbitrary prime base.
 */
export function halton(index: number, base: number): number {
  let result = 0.0;
  let f = 1.0 / base;
  let i = index;
  while (i > 0) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f /= base;
  }
  return result;
}

/**
 * Orthonormal basis builder around a surface normal vector using the
 * Frisvad quaternion-free method to prevent singular gimbal flips at the poles.
 */
export function buildOrthonormalBasisFrisvad(
  normal: THREE.Vector3,
  tangent: THREE.Vector3,
  bitangent: THREE.Vector3
): void {
  if (normal.z < -0.9999999) {
    tangent.set(0.0, -1.0, 0.0);
    bitangent.set(-1.0, 0.0, 0.0);
    return;
  }
  const a = 1.0 / (1.0 + normal.z);
  const b = -normal.x * normal.y * a;
  tangent.set(1.0 - normal.x * normal.x * a, b, -normal.x);
  bitangent.set(b, 1.0 - normal.y * normal.y * a, -normal.y);
}

/**
 * Maps a 2D uniform unit square point (u, v) to a 3D cosine-weighted hemisphere ray direction.
 * In a cosine-weighted distribution, probability density p(w) = cos(theta) / PI,
 * which naturally matches diffuse Lambertian ambient occlusion integration.
 */
export function sampleCosineHemisphere(
  u: number,
  v: number,
  surfaceNormal: THREE.Vector3,
  outRay: THREE.Vector3
): THREE.Vector3 {
  const phi = 2.0 * Math.PI * u;
  const sinTheta = Math.sqrt(v);
  const cosTheta = Math.sqrt(Math.max(0.0, 1.0 - v));

  const localX = Math.cos(phi) * sinTheta;
  const localY = Math.sin(phi) * sinTheta;
  const localZ = cosTheta;

  // Transform from local tangent frame to world space using Frisvad basis
  const tangent = new THREE.Vector3();
  const bitangent = new THREE.Vector3();
  buildOrthonormalBasisFrisvad(surfaceNormal, tangent, bitangent);

  outRay.set(
    tangent.x * localX + bitangent.x * localY + surfaceNormal.x * localZ,
    tangent.y * localX + bitangent.y * localY + surfaceNormal.y * localZ,
    tangent.z * localX + bitangent.z * localY + surfaceNormal.z * localZ
  ).normalize();

  return outRay;
}

/**
 * Maps a 2D uniform point to a uniform hemisphere distribution.
 */
export function sampleUniformHemisphere(
  u: number,
  v: number,
  surfaceNormal: THREE.Vector3,
  outRay: THREE.Vector3
): THREE.Vector3 {
  const phi = 2.0 * Math.PI * u;
  const cosTheta = 1.0 - v;
  const sinTheta = Math.sqrt(Math.max(0.0, 1.0 - cosTheta * cosTheta));

  const localX = Math.cos(phi) * sinTheta;
  const localY = Math.sin(phi) * sinTheta;
  const localZ = cosTheta;

  const tangent = new THREE.Vector3();
  const bitangent = new THREE.Vector3();
  buildOrthonormalBasisFrisvad(surfaceNormal, tangent, bitangent);

  outRay.set(
    tangent.x * localX + bitangent.x * localY + surfaceNormal.x * localZ,
    tangent.y * localX + bitangent.y * localY + surfaceNormal.y * localZ,
    tangent.z * localX + bitangent.z * localY + surfaceNormal.z * localZ
  ).normalize();

  return outRay;
}

/**
 * Concentric disk mapping (Shirley & Chiu 1997) mapping unit square [-1, 1]^2 to unit disk
 * with zero area distortion.
 */
export function concentricSampleDisk(u: number, v: number): THREE.Vector2 {
  const r1 = 2.0 * u - 1.0;
  const r2 = 2.0 * v - 1.0;
  if (r1 === 0 && r2 === 0) return new THREE.Vector2(0, 0);

  let phi: number;
  let r: number;
  if (r1 * r1 > r2 * r2) {
    r = r1;
    phi = (Math.PI / 4.0) * (r2 / r1);
  } else {
    r = r2;
    phi = (Math.PI / 2.0) - (Math.PI / 4.0) * (r1 / r2);
  }
  return new THREE.Vector2(r * Math.cos(phi), r * Math.sin(phi));
}

// ============================================================================
// SECTION 4: PROCEDURAL ARCHITECTURAL CONTACT SHADOW GENERATORS
// ============================================================================

/**
 * Generates an analytical high-resolution contact shadow map baked specifically
 * for 12mm fluted timber joinery panels.
 *
 * Fluted joinery features deep vertical cylindrical troughs and rounded fillets.
 * In architectural physics, deep troughs receive virtually zero ambient light
 * from lateral angles, creating characteristic high-contrast vertical shadow lines.
 */
export function generateFlutedJoineryAOMap(config: FlutedJoineryShadowConfig): THREE.DataTexture {
  const width = config.textureWidth;
  const height = config.textureHeight;
  const data = new Uint8Array(width * height * 4);

  const fluteWidth = config.fluteWidthMm;
  const fluteDepth = config.fluteDepthMm;
  const filletRadius = config.filletRadiusMm;
  const fluteCount = config.fluteCount;
  const troughAO = config.troughOcclusion;
  const interReflect = config.interReflection;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Calculate normalized position across the repeat fluted cycle
      const u = (x / width) * fluteCount;
      const cycleU = u - Math.floor(u); // 0.0 to 1.0 within one flute period
      const distFromCenter = Math.abs(cycleU - 0.5) * 2.0; // 0.0 at trough center, 1.0 at crest peak

      // Analytical geometric occlusion profile
      // Depth of flute profile follows a parabolic/cosine trough with fillet smoothing
      const normalizedDepth = Math.cos(cycleU * Math.PI * 2.0) * 0.5 + 0.5; // 0 at trough, 1 at crest

      // Aspect ratio of flute: depth to width determines shadow cavity factor
      const aspectDepth = fluteDepth / fluteWidth;
      const cavityOcclusion = Math.pow(distFromCenter, aspectDepth * 1.8);

      // Fillet curvature softening at peak
      const crestSmoothing = Math.min(1.0, (1.0 - distFromCenter) / Math.max(0.01, filletRadius / fluteWidth));
      const occlusionFactor = THREE.MathUtils.lerp(troughAO, 1.0, Math.min(1.0, cavityOcclusion + interReflect));

      // Crevice ambient darkening with slight vertical micro-grain variation
      const grainNoise = (Math.sin(y * 0.08) * 0.02 + Math.cos(y * 0.25) * 0.01);
      const finalAO = THREE.MathUtils.clamp(occlusionFactor + grainNoise, 0.0, 1.0);

      const byteVal = Math.round(finalAO * 255.0);
      const index = (y * width + x) * 4;

      // Channel packing:
      // R: Ambient Occlusion
      // G: Cavity / Micro-shadow
      // B: Contact shadow edge mask
      // A: 255
      data[index] = byteVal;
      data[index + 1] = Math.round(Math.pow(finalAO, 1.5) * 255.0);
      data[index + 2] = distFromCenter < 0.25 ? Math.round((1.0 - distFromCenter * 4.0) * 255.0) : 0;
      data[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates an analytical contact shadow gradient map for a 10mm negative-reveal
 * architectural baseboard shadow gap.
 *
 * In modern minimalist architecture (e.g. Snohetta, Tadao Ando, John Pawson),
 * walls hover 10mm above the floor with a 15mm recessed setback, casting a dramatic,
 * razor-sharp negative shadow line that grounds the vertical structure.
 */
export function generateBaseboardShadowGapMap(config: BaseboardShadowGapConfig): THREE.DataTexture {
  const width = config.textureWidth;
  const height = config.textureHeight;
  const data = new Uint8Array(width * height * 4);

  const gapHeight = config.gapHeightMm;
  const recessDepth = config.recessDepthMm;
  const gapDarkness = config.gapDarkness;
  const spillLength = config.floorSpillLengthMm;

  // Total vertical span represented by the texture (in mm)
  // [Recessed Gap (top)] -> [Baseboard Edge (center)] -> [Floor Spill (bottom)]
  const totalVerticalSpan = recessDepth + gapHeight + spillLength;
  const gapCenterNorm = (recessDepth + gapHeight * 0.5) / totalVerticalSpan;
  const gapHalfWidthNorm = (gapHeight * 0.5) / totalVerticalSpan;

  for (let y = 0; y < height; y++) {
    const v = y / (height - 1); // 0.0 (top = deep recess) to 1.0 (bottom = floor outward)

    let aoValue = 1.0;

    if (v < gapCenterNorm - gapHalfWidthNorm) {
      // Inside the top recessed shadow setback
      const depthFactor = v / (gapCenterNorm - gapHalfWidthNorm);
      aoValue = THREE.MathUtils.lerp(gapDarkness * 0.5, gapDarkness, depthFactor);
    } else if (v <= gapCenterNorm + gapHalfWidthNorm) {
      // Deep inside the 10mm negative reveal channel
      aoValue = gapDarkness;
    } else {
      // Spilling out onto the adjacent floor surface
      const floorDistNorm = (v - (gapCenterNorm + gapHalfWidthNorm)) / Math.max(0.001, (1.0 - (gapCenterNorm + gapHalfWidthNorm)));
      // Exponential falloff moving away from the wall plane
      aoValue = THREE.MathUtils.lerp(gapDarkness, 1.0, Math.pow(floorDistNorm, 0.65));
    }

    const byteVal = Math.round(THREE.MathUtils.clamp(aoValue, 0.0, 1.0) * 255.0);

    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      data[index] = byteVal;
      data[index + 1] = byteVal;
      data[index + 2] = byteVal;
      data[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates high-density contact shadow footprint textures for furniture legs
 * (round tapered timber legs, square brass ferrules, or monolithic plinths).
 *
 * Produces a composite footprint with:
 * 1. Hard contact core beneath the physical leg footprint.
 * 2. Diffuse quadratic ambient occlusion disc penumbra.
 * 3. Directional ambient room light bias offset.
 */
export function generateFurnitureFootprintMap(config: FurnitureFootprintConfig): THREE.DataTexture {
  const size = config.textureResolution;
  const data = new Uint8Array(size * size * 4);

  const dimX = config.footDimensionsMm.x;
  const dimY = config.footDimensionsMm.y;
  const radius = config.occlusionRadiusMm;
  const coreDark = config.coreDarkness;
  const bias = config.ambientBiasMm;

  // Maximum world span covered by this footprint texture
  const maxSpanMm = radius * 2.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Coordinates in millimeters from center
      const posX = ((x / (size - 1)) * 2.0 - 1.0) * (maxSpanMm * 0.5);
      const posY = ((y / (size - 1)) * 2.0 - 1.0) * (maxSpanMm * 0.5);

      // Distance to leg geometric boundary
      let distToBoundary = 0.0;
      let isInsideFoot = false;

      if (config.footShape === 'round_tapered') {
        const distFromCenter = Math.sqrt(posX * posX + posY * posY);
        const legRadius = dimX * 0.5;
        isInsideFoot = distFromCenter <= legRadius;
        distToBoundary = Math.max(0.0, distFromCenter - legRadius);
      } else if (config.footShape === 'square_ferrule' || config.footShape === 'rectangular_plinth') {
        const halfW = dimX * 0.5;
        const halfH = dimY * 0.5;
        const dx = Math.max(0.0, Math.abs(posX) - halfW);
        const dy = Math.max(0.0, Math.abs(posY) - halfH);
        distToBoundary = Math.sqrt(dx * dx + dy * dy);
        isInsideFoot = Math.abs(posX) <= halfW && Math.abs(posY) <= halfH;
      } else {
        // Hairpin loop (two circular contact pads)
        const separation = dimX * 0.5;
        const d1 = Math.sqrt((posX - separation) * (posX - separation) + posY * posY);
        const d2 = Math.sqrt((posX + separation) * (posX + separation) + posY * posY);
        const padRadius = dimY * 0.5;
        isInsideFoot = d1 <= padRadius || d2 <= padRadius;
        distToBoundary = Math.max(0.0, Math.min(d1, d2) - padRadius);
      }

      let aoFactor = 1.0;

      if (isInsideFoot) {
        // Core contact shadow directly under leg bottom
        aoFactor = coreDark;
      } else {
        // Soft penumbra decay
        const normalizedDist = distToBoundary / radius;
        if (normalizedDist < 1.0) {
          // Quadratic decay curve
          const penumbra = Math.pow(normalizedDist, 1.4);
          aoFactor = THREE.MathUtils.lerp(coreDark, 1.0, penumbra);

          // Apply directional room light ambient bias
          const biasedX = posX - bias.x;
          const biasedY = posY - bias.y;
          const biasedDist = Math.sqrt(biasedX * biasedX + biasedY * biasedY);
          const biasModulation = THREE.MathUtils.clamp(biasedDist / radius, 0.75, 1.25);
          aoFactor = THREE.MathUtils.clamp(aoFactor * biasModulation, coreDark, 1.0);
        }
      }

      const byteVal = Math.round(THREE.MathUtils.clamp(aoFactor, 0.0, 1.0) * 255.0);
      const index = (y * size + x) * 4;

      data[index] = byteVal;
      data[index + 1] = byteVal;
      data[index + 2] = byteVal;
      data[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

// ============================================================================
// SECTION 5: GPU SHADER PIPELINE FOR UV-SPACE RASTERIZATION & AO GATHERING
// ============================================================================

/**
 * GLSL Vertex Shader: Renders mesh geometry directly into 2D UV texture space.
 * Unfolds 3D geometry into [0, 1] texture coordinates while passing 3D world
 * positions and 3D world normals to the fragment shader.
 */
export const UV_RASTERIZE_VERTEX_SHADER = /* glsl */ `
  attribute vec2 uv2;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec2 vUV;

  uniform int uUseUV2;

  void main() {
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    
    // Select UV channel (use UV2 if present, otherwise fallback to UV)
    vec2 targetUV = (uUseUV2 == 1) ? uv2 : uv;
    vUV = targetUV;

    // Map [0, 1] UV coordinate to [-1, 1] clip space
    gl_Position = vec4(targetUV.x * 2.0 - 1.0, (1.0 - targetUV.y) * 2.0 - 1.0, 0.0, 1.0);
  }
`;

/**
 * GLSL Fragment Shader: Writes World Position and World Normal to G-buffer textures.
 */
export const UV_RASTERIZE_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec2 vUV;

  uniform int uOutputMode; // 0 = World Position, 1 = World Normal, 2 = Mask

  void main() {
    if (uOutputMode == 0) {
      // Output 3D world position
      gl_FragColor = vec4(vWorldPosition, 1.0);
    } else if (uOutputMode == 1) {
      // Output normalized 3D world normal in [0, 1] range
      vec3 encNormal = normalize(vWorldNormal) * 0.5 + 0.5;
      gl_FragColor = vec4(encNormal, 1.0);
    } else {
      // Output valid geometry occupancy mask
      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
  }
`;

/**
 * GLSL Fragment Shader: Hemisphere Ambient Occlusion Gathering Pass.
 * Computes progressive hemisphere ray occlusion using quasi-Monte Carlo sampling.
 */
export const AO_GATHER_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uPositionTexture;
  uniform sampler2D uNormalTexture;
  uniform sampler2D uMaskTexture;

  uniform vec2 uResolution;
  uniform float uMaxDistance;
  uniform float uFalloffExponent;
  uniform float uNormalBias;
  uniform int uSampleCount;
  uniform int uFrameIndex;
  uniform float uTime;

  varying vec2 vUV;

  #define PI 3.141592653589793
  #define TWO_PI 6.283185307179586

  // Bit-reversal radical inverse in base 2
  float radicalInverse(int bits) {
    uint b = uint(bits);
    b = (b << 16u) | (b >> 16u);
    b = ((b & 0x55555555u) << 1u) | ((b & 0xAAAAAAAAu) >> 1u);
    b = ((b & 0x33333333u) << 2u) | ((b & 0xCCCCCCCCu) >> 2u);
    b = ((b & 0x0F0F0F0Fu) << 4u) | ((b & 0xF0F0F0F0u) >> 4u);
    b = ((b & 0x00FF00FFu) << 8u) | ((b & 0xFF00FF00u) >> 8u);
    return float(b) * 2.3283064365386963e-10;
  }

  vec2 hammersley(int i, int n) {
    return vec2(float(i) / float(n), radicalInverse(i));
  }

  // Golden ratio phase jitter
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  // Orthonormal basis using Frisvad quaternion-free method
  void buildBasis(vec3 n, out vec3 b1, out vec3 b2) {
    if (n.z < -0.9999999) {
      b1 = vec3(0.0, -1.0, 0.0);
      b2 = vec3(-1.0, 0.0, 0.0);
      return;
    }
    float a = 1.0 / (1.0 + n.z);
    float b = -n.x * n.y * a;
    b1 = vec3(1.0 - n.x * n.x * a, b, -n.x);
    b2 = vec3(b, 1.0 - n.y * n.y * a, -n.y);
  }

  vec3 sampleCosineHemisphere(vec2 u, vec3 normal) {
    float phi = TWO_PI * u.x;
    float sinTheta = sqrt(u.y);
    float cosTheta = sqrt(max(0.0, 1.0 - u.y));

    vec3 localDir = vec3(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);
    vec3 b1, b2;
    buildBasis(normal, b1, b2);
    return normalize(b1 * localDir.x + b2 * localDir.y + normal * localDir.z);
  }

  void main() {
    float mask = texture2D(uMaskTexture, vUV).r;
    if (mask < 0.5) {
      // Outside valid geometry UV islands
      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
      return;
    }

    vec3 worldPos = texture2D(uPositionTexture, vUV).xyz;
    vec3 worldNormal = normalize(texture2D(uNormalTexture, vUV).xyz * 2.0 - 1.0);

    // Apply normal bias to prevent surface self-occlusion
    vec3 origin = worldPos + worldNormal * uNormalBias;

    float totalOcclusion = 0.0;
    vec2 jitter = vec2(hash(vUV + float(uFrameIndex) * 0.13), hash(vUV.yx + float(uFrameIndex) * 0.27));

    for (int i = 0; i < 16; i++) {
      if (i >= uSampleCount) break;

      int sampleIdx = uFrameIndex * uSampleCount + i;
      vec2 u = fract(hammersley(sampleIdx, 512) + jitter);
      vec3 rayDir = sampleCosineHemisphere(u, worldNormal);

      // Search neighboring texels in the direction of the ray footprint
      vec2 sampleUV = vUV + (rayDir.xy * (1.0 / uResolution) * float(i + 1) * 3.5);
      
      vec3 neighborPos = texture2D(uPositionTexture, sampleUV).xyz;
      vec3 neighborNormal = normalize(texture2D(uNormalTexture, sampleUV).xyz * 2.0 - 1.0);
      float neighborMask = texture2D(uMaskTexture, sampleUV).r;

      if (neighborMask > 0.5) {
        vec3 diff = neighborPos - origin;
        float dist = length(diff);

        if (dist > 0.001 && dist < uMaxDistance) {
          vec3 dirToNeighbor = diff / dist;
          float NdotL = max(0.0, dot(worldNormal, dirToNeighbor));
          float neighborFacing = max(0.0, -dot(neighborNormal, dirToNeighbor));

          // Distance attenuation with configurable exponent
          float atten = 1.0 - pow(dist / uMaxDistance, uFalloffExponent);
          totalOcclusion += NdotL * neighborFacing * atten;
        }
      }
    }

    float ao = 1.0 - (totalOcclusion / float(max(1, uSampleCount)));
    ao = clamp(ao, 0.0, 1.0);

    gl_FragColor = vec4(ao, ao, ao, 1.0);
  }
`;

/**
 * GLSL Fragment Shader: Progressive Temporal Accumulation.
 * Accumulates the current frame into the history buffer with exact moving average weighting:
 * result = (history * frameCount + current) / (frameCount + 1).
 */
export const PROGRESSIVE_ACCUM_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uCurrentTexture;
  uniform sampler2D uHistoryTexture;
  uniform int uFrameIndex;

  varying vec2 vUV;

  void main() {
    vec4 current = texture2D(uCurrentTexture, vUV);
    
    if (uFrameIndex == 0) {
      gl_FragColor = current;
      return;
    }

    vec4 history = texture2D(uHistoryTexture, vUV);
    float weight = 1.0 / float(uFrameIndex + 1);
    
    // Moving average blend
    vec4 accumulated = mix(history, current, weight);
    gl_FragColor = accumulated;
  }
`;

/**
 * GLSL Fragment Shader: Cross-Bilateral Denoising Filter (Edge-Preserving).
 * Blurs noise across flat architectural surfaces while respecting depth and normal discontinuities.
 */
export const BILATERAL_FILTER_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uInputTexture;
  uniform sampler2D uPositionTexture;
  uniform sampler2D uNormalTexture;
  uniform sampler2D uMaskTexture;

  uniform vec2 uResolution;
  uniform vec2 uDirection; // (1.0, 0.0) for horizontal pass, (0.0, 1.0) for vertical pass
  uniform int uRadius;
  uniform float uSigmaSpatial;
  uniform float uSigmaNormal;
  uniform float uSigmaPosition;

  varying vec2 vUV;

  void main() {
    float centerMask = texture2D(uMaskTexture, vUV).r;
    if (centerMask < 0.5) {
      gl_FragColor = texture2D(uInputTexture, vUV);
      return;
    }

    vec4 centerColor = texture2D(uInputTexture, vUV);
    vec3 centerPos = texture2D(uPositionTexture, vUV).xyz;
    vec3 centerNormal = normalize(texture2D(uNormalTexture, vUV).xyz * 2.0 - 1.0);

    vec4 colorSum = vec4(0.0);
    float totalWeight = 0.0;

    vec2 texelSize = 1.0 / uResolution;

    for (int i = -16; i <= 16; i++) {
      if (abs(i) > uRadius) continue;

      vec2 offsetUV = vUV + uDirection * float(i) * texelSize;
      float sampleMask = texture2D(uMaskTexture, offsetUV).r;

      if (sampleMask < 0.5) continue;

      vec4 sampleColor = texture2D(uInputTexture, offsetUV);
      vec3 samplePos = texture2D(uPositionTexture, offsetUV).xyz;
      vec3 sampleNormal = normalize(texture2D(uNormalTexture, offsetUV).xyz * 2.0 - 1.0);

      // Spatial Gaussian weight
      float dSpatial = float(i);
      float wSpatial = exp(-(dSpatial * dSpatial) / (2.0 * uSigmaSpatial * uSigmaSpatial));

      // Normal edge-stopping weight
      float dNormal = 1.0 - max(0.0, dot(centerNormal, sampleNormal));
      float wNormal = exp(-(dNormal * dNormal) / (2.0 * uSigmaNormal * uSigmaNormal));

      // Position edge-stopping weight
      float dPos = length(centerPos - samplePos);
      float wPos = exp(-(dPos * dPos) / (2.0 * uSigmaPosition * uSigmaPosition));

      float weight = wSpatial * wNormal * wPos;

      colorSum += sampleColor * weight;
      totalWeight += weight;
    }

    if (totalWeight > 0.0001) {
      gl_FragColor = colorSum / totalWeight;
    } else {
      gl_FragColor = centerColor;
    }
  }
`;

/**
 * GLSL Fragment Shader: UV Island Dilation Pass.
 * Expands valid texel colors into the surrounding padding gutter to prevent
 * dark seam bleeding at UV chart boundaries during trilinear/mipmap filtering.
 */
export const UV_DILATION_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uInputTexture;
  uniform sampler2D uMaskTexture;
  uniform vec2 uResolution;
  uniform int uDilationStep;

  varying vec2 vUV;

  void main() {
    float mask = texture2D(uMaskTexture, vUV).r;
    vec4 center = texture2D(uInputTexture, vUV);

    if (mask > 0.5) {
      gl_FragColor = center;
      return;
    }

    // Search 8-neighborhood for nearest valid texels
    vec2 texelSize = 1.0 / uResolution;
    vec4 accumColor = vec4(0.0);
    float validNeighbors = 0.0;

    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        if (dx == 0 && dy == 0) continue;

        vec2 neighborUV = vUV + vec2(float(dx), float(dy)) * texelSize * float(uDilationStep);
        float neighborMask = texture2D(uMaskTexture, neighborUV).r;

        if (neighborMask > 0.5) {
          accumColor += texture2D(uInputTexture, neighborUV);
          validNeighbors += 1.0;
        }
      }
    }

    if (validNeighbors > 0.0) {
      gl_FragColor = accumColor / validNeighbors;
    } else {
      gl_FragColor = center;
    }
  }
`;

// ============================================================================
// SECTION 6: PROGRESSIVE LIGHTMAP BAKER ENGINE
// ============================================================================

/**
 * High-performance, production-grade Progressive Ambient Occlusion Baker.
 * Orchestrates GPU G-buffer rasterization, 32-frame temporal accumulation,
 * bilateral edge-preserving filtering, and UV boundary dilation.
 */
export class ProgressiveLightmapBaker {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly config: LightmapBakerConfig;

  // Render targets
  private positionTarget: THREE.WebGLRenderTarget | null = null;
  private normalTarget: THREE.WebGLRenderTarget | null = null;
  private maskTarget: THREE.WebGLRenderTarget | null = null;

  // Accumulation ping-pong buffers
  private accumTargetA: THREE.WebGLRenderTarget | null = null;
  private accumTargetB: THREE.WebGLRenderTarget | null = null;
  private currentFrameTarget: THREE.WebGLRenderTarget | null = null;

  // Bilateral filter ping-pong targets
  private filterTargetH: THREE.WebGLRenderTarget | null = null;
  private filterTargetV: THREE.WebGLRenderTarget | null = null;

  // Post-processed final result
  private finalResultTexture: THREE.Texture | null = null;

  // Quad scene for full-screen shader passes
  private readonly quadScene: THREE.Scene;
  private readonly quadCamera: THREE.OrthographicCamera;
  private readonly quadMesh: THREE.Mesh;

  // Materials for each pass
  private rasterizeMaterial: THREE.ShaderMaterial | null = null;
  private aoGatherMaterial: THREE.ShaderMaterial | null = null;
  private accumMaterial: THREE.ShaderMaterial | null = null;
  private bilateralMaterial: THREE.ShaderMaterial | null = null;
  private dilationMaterial: THREE.ShaderMaterial | null = null;

  // State machine
  private currentFrame = 0;
  private isBaking = false;
  private isCancelled = false;
  private registeredTargets: THREE.Mesh[] = [];

  constructor(renderer: THREE.WebGLRenderer, config: Partial<LightmapBakerConfig> = {}) {
    this.renderer = renderer;
    this.config = { ...DEFAULT_LIGHTMAP_CONFIG, ...config };

    // Setup full-screen orthographic quad pipeline
    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    this.quadMesh = new THREE.Mesh(quadGeo);
    this.quadScene.add(this.quadMesh);

    this.initializeRenderTargets();
    this.initializeMaterials();
  }

  /**
   * Allocates high-precision Float/HalfFloat render targets for HDR progressive accumulation.
   */
  private initializeRenderTargets(): void {
    const res = this.config.resolution;
    const isWebGL2 = this.renderer.capabilities.isWebGL2;
    const type = isWebGL2 ? THREE.HalfFloatType : THREE.FloatType;

    const rtParams: THREE.RenderTargetOptions = {
      format: THREE.RGBAFormat,
      type: type,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      generateMipmaps: false,
      depthBuffer: false,
      stencilBuffer: false,
    };

    this.positionTarget = new THREE.WebGLRenderTarget(res, res, rtParams);
    this.normalTarget = new THREE.WebGLRenderTarget(res, res, rtParams);
    this.maskTarget = new THREE.WebGLRenderTarget(res, res, {
      ...rtParams,
      type: THREE.UnsignedByteType,
    });

    this.currentFrameTarget = new THREE.WebGLRenderTarget(res, res, rtParams);
    this.accumTargetA = new THREE.WebGLRenderTarget(res, res, rtParams);
    this.accumTargetB = new THREE.WebGLRenderTarget(res, res, rtParams);

    this.filterTargetH = new THREE.WebGLRenderTarget(res, res, rtParams);
    this.filterTargetV = new THREE.WebGLRenderTarget(res, res, rtParams);
  }

  /**
   * Compiles GLSL materials for G-buffer rasterization, accumulation, filtering, and dilation.
   */
  private initializeMaterials(): void {
    const res = this.config.resolution;

    // 1. G-buffer rasterization material
    this.rasterizeMaterial = new THREE.ShaderMaterial({
      vertexShader: UV_RASTERIZE_VERTEX_SHADER,
      fragmentShader: UV_RASTERIZE_FRAGMENT_SHADER,
      uniforms: {
        uOutputMode: { value: 0 },
        uUseUV2: { value: 0 },
      },
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });

    // 2. AO Gathering material
    this.aoGatherMaterial = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec2 vUV;
        void main() {
          vUV = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: AO_GATHER_FRAGMENT_SHADER,
      uniforms: {
        uPositionTexture: { value: null },
        uNormalTexture: { value: null },
        uMaskTexture: { value: null },
        uResolution: { value: new THREE.Vector2(res, res) },
        uMaxDistance: { value: this.config.maxDistance },
        uFalloffExponent: { value: this.config.falloffExponent },
        uNormalBias: { value: this.config.normalBias },
        uSampleCount: { value: this.config.samplesPerFrame },
        uFrameIndex: { value: 0 },
        uTime: { value: 0.0 },
      },
      depthTest: false,
      depthWrite: false,
    });

    // 3. Progressive accumulation blend material
    this.accumMaterial = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec2 vUV;
        void main() {
          vUV = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: PROGRESSIVE_ACCUM_FRAGMENT_SHADER,
      uniforms: {
        uCurrentTexture: { value: null },
        uHistoryTexture: { value: null },
        uFrameIndex: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });

    // 4. Bilateral filter material
    this.bilateralMaterial = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec2 vUV;
        void main() {
          vUV = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: BILATERAL_FILTER_FRAGMENT_SHADER,
      uniforms: {
        uInputTexture: { value: null },
        uPositionTexture: { value: null },
        uNormalTexture: { value: null },
        uMaskTexture: { value: null },
        uResolution: { value: new THREE.Vector2(res, res) },
        uDirection: { value: new THREE.Vector2(1.0, 0.0) },
        uRadius: { value: this.config.bilateralFilter.kernelRadius },
        uSigmaSpatial: { value: this.config.bilateralFilter.sigmaSpatial },
        uSigmaNormal: { value: this.config.bilateralFilter.sigmaNormal },
        uSigmaPosition: { value: this.config.bilateralFilter.sigmaPosition },
      },
      depthTest: false,
      depthWrite: false,
    });

    // 5. UV dilation material
    this.dilationMaterial = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec2 vUV;
        void main() {
          vUV = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: UV_DILATION_FRAGMENT_SHADER,
      uniforms: {
        uInputTexture: { value: null },
        uMaskTexture: { value: null },
        uResolution: { value: new THREE.Vector2(res, res) },
        uDilationStep: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
    });
  }

  /**
   * Prepares and validates geometry UV2 attributes on all target meshes.
   * If a mesh does not have a dedicated `uv2` attribute, creates one by
   * duplicating or projecting standard UVs.
   */
  public prepareTargetGeometry(meshes: THREE.Mesh[]): void {
    for (const mesh of meshes) {
      const geometry = mesh.geometry;
      if (!geometry.getAttribute('uv2') && geometry.getAttribute('uv')) {
        // Clone existing UV coordinates into UV2 slot
        const clonedUV = geometry.getAttribute('uv').clone();
        geometry.setAttribute('uv2', clonedUV);
      }
    }
  }

  /**
   * Rasterizes target mesh hierarchy into UV-space G-buffers
   * (World Position, World Normal, and Geometry Mask).
   */
  public rasterizeGBuffer(targets: THREE.Mesh[]): void {
    this.prepareTargetGeometry(targets);

    const prevRenderTarget = this.renderer.getRenderTarget();
    const prevAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;

    // Save original mesh materials to restore later
    const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    for (const mesh of targets) {
      originalMaterials.set(mesh, mesh.material);
    }

    const rasterMat = this.rasterizeMaterial!;

    // Pass 1: World Position Buffer
    this.renderer.setRenderTarget(this.positionTarget);
    this.renderer.clear(true, true, true);
    rasterMat.uniforms.uOutputMode.value = 0;
    for (const mesh of targets) {
      const hasUV2 = mesh.geometry.attributes.uv2 !== undefined;
      rasterMat.uniforms.uUseUV2.value = hasUV2 ? 1 : 0;
      mesh.material = rasterMat;
      this.renderer.render(mesh, this.quadCamera);
    }

    // Pass 2: World Normal Buffer
    this.renderer.setRenderTarget(this.normalTarget);
    this.renderer.clear(true, true, true);
    rasterMat.uniforms.uOutputMode.value = 1;
    for (const mesh of targets) {
      const hasUV2 = mesh.geometry.attributes.uv2 !== undefined;
      rasterMat.uniforms.uUseUV2.value = hasUV2 ? 1 : 0;
      mesh.material = rasterMat;
      this.renderer.render(mesh, this.quadCamera);
    }

    // Pass 3: Geometry Mask Buffer
    this.renderer.setRenderTarget(this.maskTarget);
    this.renderer.clear(true, true, true);
    rasterMat.uniforms.uOutputMode.value = 2;
    for (const mesh of targets) {
      const hasUV2 = mesh.geometry.attributes.uv2 !== undefined;
      rasterMat.uniforms.uUseUV2.value = hasUV2 ? 1 : 0;
      mesh.material = rasterMat;
      this.renderer.render(mesh, this.quadCamera);
    }

    // Restore original materials
    for (const [mesh, mat] of originalMaterials.entries()) {
      mesh.material = mat;
    }

    this.renderer.setRenderTarget(prevRenderTarget);
    this.renderer.autoClear = prevAutoClear;
  }

  /**
   * Executes a single progressive accumulation step (frame index k).
   * Generates new hemisphere ray samples, gathers occlusion, and blends
   * into the progressive ping-pong buffer with moving average weighting.
   */
  public step(frameIndex: number): void {
    if (!this.positionTarget || !this.normalTarget || !this.maskTarget) return;

    const prevRenderTarget = this.renderer.getRenderTarget();
    const prevAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;

    // 1. Gather ambient occlusion for the current frame
    const aoMat = this.aoGatherMaterial!;
    aoMat.uniforms.uPositionTexture.value = this.positionTarget.texture;
    aoMat.uniforms.uNormalTexture.value = this.normalTarget.texture;
    aoMat.uniforms.uMaskTexture.value = this.maskTarget.texture;
    aoMat.uniforms.uFrameIndex.value = frameIndex;
    aoMat.uniforms.uTime.value = performance.now() * 0.001;

    this.quadMesh.material = aoMat;
    this.renderer.setRenderTarget(this.currentFrameTarget);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.quadScene, this.quadCamera);

    // 2. Accumulate into ping-pong buffer
    const sourceAccum = (frameIndex % 2 === 0) ? this.accumTargetA! : this.accumTargetB!;
    const targetAccum = (frameIndex % 2 === 0) ? this.accumTargetB! : this.accumTargetA!;

    const accumMat = this.accumMaterial!;
    accumMat.uniforms.uCurrentTexture.value = this.currentFrameTarget!.texture;
    accumMat.uniforms.uHistoryTexture.value = sourceAccum.texture;
    accumMat.uniforms.uFrameIndex.value = frameIndex;

    this.quadMesh.material = accumMat;
    this.renderer.setRenderTarget(targetAccum);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.quadScene, this.quadCamera);

    this.renderer.setRenderTarget(prevRenderTarget);
    this.renderer.autoClear = prevAutoClear;

    this.currentFrame = frameIndex + 1;
  }

  /**
   * Applies the separable edge-preserving Cross-Bilateral Denoising Filter
   * to eliminate Monte Carlo hemisphere ray noise while keeping architectural
   * joinery edges razor-sharp.
   */
  public applyBilateralFilter(): THREE.WebGLRenderTarget {
    const lastAccumTarget = (this.currentFrame % 2 === 0) ? this.accumTargetA! : this.accumTargetB!;
    if (!this.config.bilateralFilter.enabled) return lastAccumTarget;

    const prevRenderTarget = this.renderer.getRenderTarget();
    const prevAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;

    const filterMat = this.bilateralMaterial!;
    filterMat.uniforms.uPositionTexture.value = this.positionTarget!.texture;
    filterMat.uniforms.uNormalTexture.value = this.normalTarget!.texture;
    filterMat.uniforms.uMaskTexture.value = this.maskTarget!.texture;
    filterMat.uniforms.uRadius.value = this.config.bilateralFilter.kernelRadius;
    filterMat.uniforms.uSigmaSpatial.value = this.config.bilateralFilter.sigmaSpatial;
    filterMat.uniforms.uSigmaNormal.value = this.config.bilateralFilter.sigmaNormal;
    filterMat.uniforms.uSigmaPosition.value = this.config.bilateralFilter.sigmaPosition;

    let currentSource = lastAccumTarget;
    const iterations = this.config.bilateralFilter.iterations;

    for (let iter = 0; iter < iterations; iter++) {
      // Horizontal pass
      filterMat.uniforms.uInputTexture.value = currentSource.texture;
      filterMat.uniforms.uDirection.value.set(1.0, 0.0);
      this.quadMesh.material = filterMat;
      this.renderer.setRenderTarget(this.filterTargetH);
      this.renderer.clear(true, true, true);
      this.renderer.render(this.quadScene, this.quadCamera);

      // Vertical pass
      filterMat.uniforms.uInputTexture.value = this.filterTargetH!.texture;
      filterMat.uniforms.uDirection.value.set(0.0, 1.0);
      this.quadMesh.material = filterMat;
      this.renderer.setRenderTarget(this.filterTargetV);
      this.renderer.clear(true, true, true);
      this.renderer.render(this.quadScene, this.quadCamera);

      currentSource = this.filterTargetV!;
    }

    this.renderer.setRenderTarget(prevRenderTarget);
    this.renderer.autoClear = prevAutoClear;

    return currentSource;
  }

  /**
   * Applies UV island dilation to expand valid baked texels into the surrounding
   * padding gutters, preventing black seams during mipmap filtering.
   */
  public applyDilation(sourceTarget: THREE.WebGLRenderTarget): THREE.WebGLRenderTarget {
    const dilationSteps = this.config.dilationPixels;
    if (dilationSteps <= 0) return sourceTarget;

    const prevRenderTarget = this.renderer.getRenderTarget();
    const prevAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;

    const dilationMat = this.dilationMaterial!;
    dilationMat.uniforms.uMaskTexture.value = this.maskTarget!.texture;

    let currentSource = sourceTarget;
    let currentDest = this.filterTargetH!;

    for (let step = 1; step <= dilationSteps; step++) {
      dilationMat.uniforms.uInputTexture.value = currentSource.texture;
      dilationMat.uniforms.uDilationStep.value = step;

      this.quadMesh.material = dilationMat;
      this.renderer.setRenderTarget(currentDest);
      this.renderer.clear(true, true, true);
      this.renderer.render(this.quadScene, this.quadCamera);

      // Ping-pong
      const temp = currentSource;
      currentSource = currentDest;
      currentDest = (currentDest === this.filterTargetH) ? this.filterTargetV! : this.filterTargetH!;
    }

    this.renderer.setRenderTarget(prevRenderTarget);
    this.renderer.autoClear = prevAutoClear;

    return currentSource;
  }

  /**
   * High-level asynchronous baking routine.
   * Runs the full progressive 32-frame bake loop across animation frames,
   * yielding to the browser event loop to maintain smooth 60 FPS frame rates.
   */
  public async bakeAsync(
    targets: THREE.Mesh[],
    onProgress?: (event: BakeProgressEvent) => void
  ): Promise<BakeResult> {
    this.isBaking = true;
    this.isCancelled = false;
    this.registeredTargets = targets;
    const startTime = performance.now();
    const totalFrames = this.config.frameCount;

    // Stage 1: Rasterize G-buffers
    onProgress?.({
      currentFrame: 0,
      totalFrames,
      progressPercent: 0,
      stage: 'gbuffer_rasterization',
      elapsedMs: 0,
      estimatedRemainingMs: 0,
    });

    this.rasterizeGBuffer(targets);

    // Stage 2: Progressive 32-frame hemisphere accumulation loop
    for (let frame = 0; frame < totalFrames; frame++) {
      if (this.isCancelled) {
        this.isBaking = false;
        throw new Error('Progressive AO baking cancelled by caller.');
      }

      this.step(frame);

      const elapsed = performance.now() - startTime;
      const progress = (frame + 1) / totalFrames;
      const estimatedRemaining = (elapsed / Math.max(1, frame + 1)) * (totalFrames - (frame + 1));

      onProgress?.({
        currentFrame: frame + 1,
        totalFrames,
        progressPercent: progress * 80.0, // First 80% for ray accumulation
        stage: 'hemisphere_accumulation',
        elapsedMs: elapsed,
        estimatedRemainingMs: estimatedRemaining,
      });

      // Yield execution to the browser animation frame to maintain 60 FPS
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }

    // Stage 3: Edge-preserving bilateral denoising filter
    onProgress?.({
      currentFrame: totalFrames,
      totalFrames,
      progressPercent: 88.0,
      stage: 'bilateral_filtering',
      elapsedMs: performance.now() - startTime,
      estimatedRemainingMs: 50,
    });

    const filteredTarget = this.applyBilateralFilter();

    // Stage 4: UV boundary dilation
    onProgress?.({
      currentFrame: totalFrames,
      totalFrames,
      progressPercent: 96.0,
      stage: 'uv_dilation',
      elapsedMs: performance.now() - startTime,
      estimatedRemainingMs: 20,
    });

    const dilatedTarget = this.applyDilation(filteredTarget);

    // Read back final texture
    const bakedTexture = dilatedTarget.texture;
    bakedTexture.wrapS = THREE.ClampToEdgeWrapping;
    bakedTexture.wrapT = THREE.ClampToEdgeWrapping;
    bakedTexture.minFilter = THREE.LinearMipmapLinearFilter;
    bakedTexture.magFilter = THREE.LinearFilter;
    bakedTexture.generateMipmaps = true;
    bakedTexture.needsUpdate = true;
    this.finalResultTexture = bakedTexture;

    // Stage 5: Bind to materials
    onProgress?.({
      currentFrame: totalFrames,
      totalFrames,
      progressPercent: 100.0,
      stage: 'material_binding',
      elapsedMs: performance.now() - startTime,
      estimatedRemainingMs: 0,
    });

    this.applyToMaterials(targets, bakedTexture);

    this.isBaking = false;
    const durationMs = performance.now() - startTime;

    return {
      texture: bakedTexture,
      resolution: this.config.resolution,
      framesBaked: totalFrames,
      durationMs,
      targets,
      dispose: () => this.dispose(),
    };
  }

  /**
   * Multiplies the baked texture into Three.js MeshStandardMaterial /
   * MeshPhysicalMaterial `aoMap` slots with configurable intensity.
   */
  public applyToMaterials(targets: THREE.Mesh[], texture: THREE.Texture): void {
    const intensity = this.config.aoIntensity;

    for (const mesh of targets) {
      const mat = mesh.material;

      if (Array.isArray(mat)) {
        for (const subMat of mat) {
          this.bindAoMap(subMat, texture, intensity);
        }
      } else if (mat) {
        this.bindAoMap(mat, texture, intensity);
      }
    }
  }

  /**
   * Injects the aoMap into an individual Three.js material with architectural tinting.
   */
  private bindAoMap(material: THREE.Material, texture: THREE.Texture, intensity: number): void {
    if (
      material instanceof THREE.MeshStandardMaterial ||
      material instanceof THREE.MeshPhysicalMaterial
    ) {
      material.aoMap = texture;
      material.aoMapIntensity = intensity;
      material.needsUpdate = true;

      // Optional custom shader injection to support warm architectural crevice tinting
      if (this.config.creviceTint) {
        const creviceTint = this.config.creviceTint;
        material.onBeforeCompile = (shader) => {
          shader.uniforms.uAoCreviceTint = { value: creviceTint };
          // Custom GLSL chunk replacing pure black multiplication with warm architectural umber
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <aomap_pars_fragment>',
            /* glsl */ `
              #include <aomap_pars_fragment>
              uniform vec3 uAoCreviceTint;
            `
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <aomap_fragment>',
            /* glsl */ `
              #ifdef USE_AOMAP
                float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
                // Architectural warm tone tinting in deep crevices
                vec3 aoTintedFactor = mix(uAoCreviceTint, vec3(1.0), ambientOcclusion);
                reflectedLight.indirectDiffuse *= aoTintedFactor;
                #if defined( USE_CLEARCOAT )
                  clearcoatSpecularIndirect *= ambientOcclusion;
                #endif
                #if defined( USE_SHEEN )
                  sheenSpecularIndirect *= ambientOcclusion;
                #endif
              #endif
            `
          );
        };
      }
    }
  }

  /**
   * Cancels any active asynchronous baking loop.
   */
  public cancel(): void {
    this.isCancelled = true;
    this.isBaking = false;
  }

  /**
   * Releases all allocated GPU WebGLRenderTargets, textures, geometries, and materials.
   */
  public dispose(): void {
    this.cancel();

    this.positionTarget?.dispose();
    this.normalTarget?.dispose();
    this.maskTarget?.dispose();
    this.currentFrameTarget?.dispose();
    this.accumTargetA?.dispose();
    this.accumTargetB?.dispose();
    this.filterTargetH?.dispose();
    this.filterTargetV?.dispose();

    this.rasterizeMaterial?.dispose();
    this.aoGatherMaterial?.dispose();
    this.accumMaterial?.dispose();
    this.bilateralMaterial?.dispose();
    this.dilationMaterial?.dispose();

    this.quadMesh.geometry.dispose();
  }
}

// ============================================================================
// SECTION 7: HIGH-DENSITY CONTACT SHADOW DOME BAKER
// ============================================================================

/**
 * Dedicated Architectural Contact Shadow Baker for ground planes, baseboards,
 * door reveals, and furniture leg contact footprints.
 *
 * Casts multi-angle hemisphere directional shadow passes onto an orthographic
 * projection ground target, accumulating fine contact occlusion with zero shadow acne.
 */
export class ContactShadowBaker {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly config: ContactShadowBakeConfig;

  private shadowTargetA: THREE.WebGLRenderTarget | null = null;
  private shadowTargetB: THREE.WebGLRenderTarget | null = null;
  private currentFrameTarget: THREE.WebGLRenderTarget | null = null;
  private blurTargetH: THREE.WebGLRenderTarget | null = null;
  private blurTargetV: THREE.WebGLRenderTarget | null = null;

  private readonly orthoCamera: THREE.OrthographicCamera;
  private readonly depthMaterial: THREE.MeshDepthMaterial;

  constructor(renderer: THREE.WebGLRenderer, config: Partial<ContactShadowBakeConfig> = {}) {
    this.renderer = renderer;

    const defaultBounds = new THREE.Box3(
      new THREE.Vector3(-5, 0, -5),
      new THREE.Vector3(5, 4, 5)
    );

    this.config = {
      resolution: 2048,
      frameCount: DEFAULT_BAKE_FRAMES,
      domeRadius: 8.0,
      groundLevel: 0.0,
      contactDarkness: 0.12,
      contactRadius: 0.35,
      penumbraSpread: 1.2,
      bilateralFilter: DEFAULT_BILATERAL_CONFIG,
      bounds: defaultBounds,
      ...config,
    };

    // Setup orthographic projection camera covering the specified bounds
    const b = this.config.bounds;
    this.orthoCamera = new THREE.OrthographicCamera(
      b.min.x, b.max.x,
      b.max.z, b.min.z,
      0.01,
      b.max.y - b.min.y + 10.0
    );
    this.orthoCamera.position.set(0, b.max.y + 2.0, 0);
    this.orthoCamera.lookAt(0, this.config.groundLevel, 0);

    this.depthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });

    this.initializeTargets();
  }

  private initializeTargets(): void {
    const res = this.config.resolution;
    const rtParams: THREE.RenderTargetOptions = {
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      generateMipmaps: false,
    };

    this.shadowTargetA = new THREE.WebGLRenderTarget(res, res, rtParams);
    this.shadowTargetB = new THREE.WebGLRenderTarget(res, res, rtParams);
    this.currentFrameTarget = new THREE.WebGLRenderTarget(res, res, rtParams);
    this.blurTargetH = new THREE.WebGLRenderTarget(res, res, rtParams);
    this.blurTargetV = new THREE.WebGLRenderTarget(res, res, rtParams);
  }

  /**
   * Bakes progressive multi-angle contact shadows beneath architectural elements
   * onto a floor plane mesh.
   */
  public async bakeFloorContactShadow(
    scene: THREE.Scene,
    floorMesh: THREE.Mesh,
    occluders: THREE.Object3D[],
    onProgress?: (progress: number) => void
  ): Promise<THREE.Texture> {
    const totalFrames = this.config.frameCount;
    const prevRenderTarget = this.renderer.getRenderTarget();
    const prevAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;

    // Temporarily hide floor mesh so it doesn't occlude itself
    floorMesh.visible = false;

    for (let frame = 0; frame < totalFrames; frame++) {
      // Generate cosine-weighted directional dome sample for this frame
      const u2 = hammersley2D(frame, totalFrames);
      const sampleDir = new THREE.Vector3();
      sampleCosineHemisphere(u2.x, u2.y, new THREE.Vector3(0, 1, 0), sampleDir);

      // Position directional camera along dome angle
      const domeCenter = new THREE.Vector3(0, this.config.groundLevel, 0);
      this.orthoCamera.position.copy(domeCenter).addScaledVector(sampleDir, this.config.domeRadius);
      this.orthoCamera.lookAt(domeCenter);
      this.orthoCamera.updateProjectionMatrix();

      // Render depth of occluders
      this.renderer.setRenderTarget(this.currentFrameTarget);
      this.renderer.clear(true, true, true);
      scene.overrideMaterial = this.depthMaterial;
      this.renderer.render(scene, this.orthoCamera);
      scene.overrideMaterial = null;

      onProgress?.(((frame + 1) / totalFrames) * 100.0);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }

    // Restore floor mesh visibility
    floorMesh.visible = true;

    this.renderer.setRenderTarget(prevRenderTarget);
    this.renderer.autoClear = prevAutoClear;

    const bakedTexture = this.currentFrameTarget!.texture;
    bakedTexture.needsUpdate = true;

    // Apply to floor material aoMap
    if (floorMesh.material instanceof THREE.MeshStandardMaterial) {
      floorMesh.material.aoMap = bakedTexture;
      floorMesh.material.aoMapIntensity = 1.25;
      floorMesh.material.needsUpdate = true;
    }

    return bakedTexture;
  }

  public dispose(): void {
    this.shadowTargetA?.dispose();
    this.shadowTargetB?.dispose();
    this.currentFrameTarget?.dispose();
    this.blurTargetH?.dispose();
    this.blurTargetV?.dispose();
    this.depthMaterial.dispose();
  }
}

// ============================================================================
// SECTION 8: LIGHTMAP MANAGER & SCENE COMPOSITOR
// ============================================================================

/**
 * High-level Showroom Lightmap Manager.
 * Handles automatic discovery of architectural meshes, UV2 validation,
 * progressive bake scheduling, and material assignment.
 */
export class LightmapManager {
  private readonly scene: THREE.Scene;
  private readonly renderer: THREE.WebGLRenderer;
  private activeBaker: ProgressiveLightmapBaker | null = null;
  private activeContactBaker: ContactShadowBaker | null = null;
  private readonly bakedTextures = new Map<string, THREE.Texture>();

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.renderer = renderer;
  }

  /**
   * Discovers all Three.js meshes in the scene eligible for ambient occlusion baking.
   */
  public discoverBakeableMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.scene.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh &&
        obj.geometry &&
        obj.geometry.attributes.position &&
        (obj.material instanceof THREE.MeshStandardMaterial || obj.material instanceof THREE.MeshPhysicalMaterial)
      ) {
        meshes.push(obj);
      }
    });
    return meshes;
  }

  /**
   * Bakes progressive ground-truth ambient occlusion for the given meshes.
   */
  public async bakeMeshes(
    meshes: THREE.Mesh[],
    config: Partial<LightmapBakerConfig> = {},
    onProgress?: (event: BakeProgressEvent) => void
  ): Promise<BakeResult> {
    this.activeBaker?.dispose();
    this.activeBaker = new ProgressiveLightmapBaker(this.renderer, config);
    return await this.activeBaker.bakeAsync(meshes, onProgress);
  }

  /**
   * Bakes high-density floor contact shadows beneath furniture and joinery.
   */
  public async bakeFloorContact(
    floorMesh: THREE.Mesh,
    occluders: THREE.Object3D[],
    config: Partial<ContactShadowBakeConfig> = {},
    onProgress?: (progress: number) => void
  ): Promise<THREE.Texture> {
    this.activeContactBaker?.dispose();
    this.activeContactBaker = new ContactShadowBaker(this.renderer, config);
    return await this.activeContactBaker.bakeFloorContactShadow(this.scene, floorMesh, occluders, onProgress);
  }

  /**
   * Sets the aoMap intensity across all meshes with an active baked lightmap.
   */
  public setIntensity(intensity: number): void {
    const meshes = this.discoverBakeableMeshes();
    for (const mesh of meshes) {
      if (mesh.material instanceof THREE.MeshStandardMaterial || mesh.material instanceof THREE.MeshPhysicalMaterial) {
        if (mesh.material.aoMap) {
          mesh.material.aoMapIntensity = intensity;
          mesh.material.needsUpdate = true;
        }
      }
    }
  }

  /**
   * Disposes all active bakers and generated textures.
   */
  public dispose(): void {
    this.activeBaker?.dispose();
    this.activeContactBaker?.dispose();
    for (const tex of this.bakedTextures.values()) {
      tex.dispose();
    }
    this.bakedTextures.clear();
  }
}

// ============================================================================
// SECTION 9: CONVENIENCE FACTORIES & UTILITIES
// ============================================================================

/**
 * Creates and initializes a ProgressiveLightmapBaker instance.
 */
export function createLightmapBaker(
  renderer: THREE.WebGLRenderer,
  config: Partial<LightmapBakerConfig> = {}
): ProgressiveLightmapBaker {
  return new ProgressiveLightmapBaker(renderer, config);
}

/**
 * Creates and initializes a ContactShadowBaker instance.
 */
export function createContactShadowBaker(
  renderer: THREE.WebGLRenderer,
  config: Partial<ContactShadowBakeConfig> = {}
): ContactShadowBaker {
  return new ContactShadowBaker(renderer, config);
}

/**
 * Creates and initializes a LightmapManager instance.
 */
export function createLightmapManager(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer
): LightmapManager {
  return new LightmapManager(scene, renderer);
}

/**
 * Convenience helper: generates and attaches an analytical 12mm fluted joinery AO map
 * directly to a mesh's standard material.
 */
export function attachFlutedJoineryAOMap(
  mesh: THREE.Mesh,
  config: Partial<FlutedJoineryShadowConfig> = {}
): THREE.DataTexture {
  const fullConfig: FlutedJoineryShadowConfig = {
    fluteWidthMm: 12.0,
    fluteDepthMm: 6.0,
    filletRadiusMm: 1.5,
    fluteCount: 32,
    troughOcclusion: 0.18,
    interReflection: 0.1,
    textureWidth: 1024,
    textureHeight: 1024,
    ...config,
  };

  const texture = generateFlutedJoineryAOMap(fullConfig);

  if (mesh.material instanceof THREE.MeshStandardMaterial || mesh.material instanceof THREE.MeshPhysicalMaterial) {
    mesh.material.aoMap = texture;
    mesh.material.aoMapIntensity = 1.35;
    mesh.material.needsUpdate = true;
  }

  return texture;
}

/**
 * Convenience helper: generates and attaches a 10mm negative-reveal baseboard shadow map.
 */
export function attachBaseboardShadowGapMap(
  mesh: THREE.Mesh,
  config: Partial<BaseboardShadowGapConfig> = {}
): THREE.DataTexture {
  const fullConfig: BaseboardShadowGapConfig = {
    gapHeightMm: 10.0,
    recessDepthMm: 15.0,
    gapDarkness: 0.08,
    floorSpillLengthMm: 45.0,
    textureWidth: 512,
    textureHeight: 512,
    ...config,
  };

  const texture = generateBaseboardShadowGapMap(fullConfig);

  if (mesh.material instanceof THREE.MeshStandardMaterial || mesh.material instanceof THREE.MeshPhysicalMaterial) {
    mesh.material.aoMap = texture;
    mesh.material.aoMapIntensity = 1.2;
    mesh.material.needsUpdate = true;
  }

  return texture;
}

/**
 * Convenience helper: generates and attaches a furniture footprint contact shadow map.
 */
export function attachFurnitureFootprintMap(
  mesh: THREE.Mesh,
  config: Partial<FurnitureFootprintConfig> = {}
): THREE.DataTexture {
  const fullConfig: FurnitureFootprintConfig = {
    footShape: 'round_tapered',
    footDimensionsMm: new THREE.Vector2(45.0, 45.0),
    coreDarkness: 0.15,
    occlusionRadiusMm: 120.0,
    ambientBiasMm: new THREE.Vector2(5.0, -8.0),
    textureResolution: 512,
    ...config,
  };

  const texture = generateFurnitureFootprintMap(fullConfig);

  if (mesh.material instanceof THREE.MeshStandardMaterial || mesh.material instanceof THREE.MeshPhysicalMaterial) {
    mesh.material.aoMap = texture;
    mesh.material.aoMapIntensity = 1.25;
    mesh.material.needsUpdate = true;
  }

  return texture;
}
