/**
 * ARCHITECTURAL SHOWROOM TOPOGRAPHY & CONTOUR ENGINE
 *
 * Reverse-engineered, production-grade landscape architectural topography contour system extracted from:
 * 1. 01_igloo: Dynamic iso-surface contour slicing, CAD datum markers, and hairline vector linework.
 * 2. 20_snohetta: Steep landscape terracing, soil strata cross-sections, and site plot boundary framing.
 *
 * Geographical Elevation Context:
 * Models the dramatic geomorphological transition of eastern Nepal from the flat alluvial
 * Terai plains of Biratnagar (AMSL +80.0m) to the tectonic Chure foothill ridge of Dharan (AMSL +349.0m).
 */

import * as THREE from 'three';

// ============================================================================
// 1. TYPES, INTERFACES & PRESETS
// ============================================================================

export type TopographyStylePreset =
  | 'architectural_cad'
  | 'snohetta_slate'
  | 'golden_terai'
  | 'blueprint_technical'
  | 'hypsometric_elevation';

export interface TopographyConfig {
  /** Minimum elevation in meters AMSL (Biratnagar plains default: 80.0m) */
  minElevationAMSL: number;
  /** Maximum elevation in meters AMSL (Dharan Chure ridge default: 349.0m) */
  maxElevationAMSL: number;
  /** Physical terrain width in 3D scene units (X-axis) */
  worldWidth: number;
  /** Physical terrain depth in 3D scene units (Z-axis) */
  worldDepth: number;
  /** Vertical scale multiplier converting elevation meters to 3D units */
  heightScale: number;
  /** Horizontal grid resolution (samples along X) */
  gridResolutionX: number;
  /** Horizontal grid resolution (samples along Z) */
  gridResolutionZ: number;
  /** Random noise seed */
  seed: number;
  /** Number of Perlin/Simplex noise octaves (typically 6-8) */
  octaves: number;
  /** Frequency multiplier per octave */
  lacunarity: number;
  /** Amplitude decay factor per octave */
  persistence: number;
  /** Base noise frequency for macro topography */
  baseFrequency: number;
  /** Step interval in meters for hillside terracing (default: 8.0m) */
  terraceStepMeters: number;
  /** Smoothness of terrace riser transitions (0.0 = sharp cliff, 1.0 = smooth slope) */
  terraceSmoothness: number;
  /** Foothill ridge noise sharpness (0.0 to 1.0) */
  ridgeStrength: number;
  /** Koshi river gully hydraulic erosion carve depth (0.0 to 1.0) */
  valleyDepth: number;
  /** Terai plain southward flattening factor (0.0 to 1.0) */
  plainFlattening: number;
}

export interface ContourIntervalConfig {
  /** Minor contour elevation interval in meters (default: 5.0m) */
  minorInterval: number;
  /** Intermediate contour elevation interval in meters (default: 10.0m) */
  mediumInterval: number;
  /** Major index contour elevation interval in meters (default: 25.0m) */
  indexInterval: number;
  /** Hairline CAD minor contour color */
  minorColor: THREE.Color;
  /** Medium weight contour color */
  mediumColor: THREE.Color;
  /** Bold index contour color */
  indexColor: THREE.Color;
  /** Minor contour opacity */
  minorOpacity: number;
  /** Medium contour opacity */
  mediumOpacity: number;
  /** Index contour opacity */
  indexOpacity: number;
  /** Whether to render floating CAD elevation numeric callout labels */
  renderCallouts: boolean;
  /** Distance interval between callout markers along an index contour in world units */
  calloutSpacing: number;
  /** Height offset above terrain surface for contour lines to prevent Z-fighting */
  lineYOffset: number;
}

export interface SiteBoundaryConfig {
  /** 2D coordinates (X, Z in world units) defining the plot polygon corners */
  plotCorners: THREE.Vector2[];
  /** Municipal front road setback in meters */
  frontSetback: number;
  /** Rear boundary setback in meters */
  rearSetback: number;
  /** Side boundary setbacks in meters */
  sideSetback: number;
  /** Height of boundary wireframe extrusions */
  wireframeHeight: number;
  /** Primary boundary line color */
  boundaryColor: THREE.Color;
  /** Setback datum dashed line color */
  setbackColor: THREE.Color;
  /** Radius of survey monument beacons */
  beaconRadius: number;
  /** Survey benchmark monument codes */
  benchmarkLabels: string[];
}

export interface SoilStrataConfig {
  /** Layer 1: Topsoil / Humus depth in meters (0 to ~0.4m) */
  topsoilDepth: number;
  /** Layer 2: Alluvial Loam & Silt depth in meters (0.4m to ~2.2m) */
  alluvialLoamDepth: number;
  /** Layer 3: Chure Gravel / Bhabar aggregate depth in meters (2.2m to ~5.5m) */
  gravelBhabarDepth: number;
  /** Layer 4: Siwalik Sandstone Bedrock refusal depth in meters (5.5m+) */
  bedrockDepth: number;
  /** Water table depth below natural ground in meters (Terai aquifer ~6.0m) */
  waterTableDepth: number;
  /** Palette of geological strata colors */
  strataColors: {
    topsoil: THREE.Color;
    alluvialLoam: THREE.Color;
    gravelBhabar: THREE.Color;
    siwalikBedrock: THREE.Color;
    waterTableLine: THREE.Color;
    excavationCut: THREE.Color;
  };
}

export interface ElevationSliceConfig {
  /** Whether section plane clipping is active */
  active: boolean;
  /** Cutting orientation axis */
  axis: 'x' | 'z' | 'custom';
  /** Normalized scrub progress (0.0 to 1.0) along the selected axis */
  progress: number;
  /** Custom plane normal for arbitrary diagonal section cuts */
  customNormal: THREE.Vector3;
  /** Custom plane point */
  customPoint: THREE.Vector3;
  /** Whether to render the textured vertical soil strata cross-section curtain */
  renderSoilStrataCurtain: boolean;
  /** Whether to visualize the building foundation excavation trench */
  renderExcavationFootprint: boolean;
  /** Excavation building pad center (X, Z) */
  buildingPadCenter: THREE.Vector2;
  /** Excavation building pad size (width, depth) */
  buildingPadSize: THREE.Vector2;
  /** Foundation excavation depth below terrain in meters */
  foundationDepth: number;
}

export interface ElevationSample {
  /** Raw elevation above mean sea level in meters (80m to 349m) */
  elevationAMSL: number;
  /** Normalized elevation (0.0 = Biratnagar plains, 1.0 = Dharan ridge peak) */
  normalizedElevation: number;
  /** 3D world space position (X, Y, Z) */
  worldPosition: THREE.Vector3;
  /** Unit surface normal vector */
  surfaceNormal: THREE.Vector3;
  /** Surface slope in degrees (0 = horizontal plain, 90 = vertical cliff) */
  slopeDegrees: number;
  /** Compass aspect azimuth angle in radians (direction the slope faces) */
  aspectRadians: number;
}

export interface TopographySystemOptions {
  topography?: Partial<TopographyConfig>;
  contours?: Partial<ContourIntervalConfig>;
  boundary?: Partial<SiteBoundaryConfig>;
  strata?: Partial<SoilStrataConfig>;
  slicer?: Partial<ElevationSliceConfig>;
  preset?: TopographyStylePreset;
}

// Default Presets
export const DEFAULT_TOPOGRAPHY_CONFIG: TopographyConfig = {
  minElevationAMSL: 80.0,
  maxElevationAMSL: 349.0,
  worldWidth: 140.0,
  worldDepth: 140.0,
  heightScale: 0.14,
  gridResolutionX: 192,
  gridResolutionZ: 192,
  seed: 42.1337,
  octaves: 7,
  lacunarity: 2.06,
  persistence: 0.49,
  baseFrequency: 0.016,
  terraceStepMeters: 8.5,
  terraceSmoothness: 0.22,
  ridgeStrength: 0.72,
  valleyDepth: 0.45,
  plainFlattening: 0.85,
};

export const DEFAULT_CONTOUR_CONFIG: ContourIntervalConfig = {
  minorInterval: 5.0,
  mediumInterval: 10.0,
  indexInterval: 25.0,
  minorColor: new THREE.Color(0x38414e),
  mediumColor: new THREE.Color(0x606f84),
  indexColor: new THREE.Color(0xc9a473), // Architectural spun brass / warm bronze
  minorOpacity: 0.38,
  mediumOpacity: 0.65,
  indexOpacity: 0.95,
  renderCallouts: true,
  calloutSpacing: 35.0,
  lineYOffset: 0.045,
};

export const DEFAULT_SITE_BOUNDARY_CONFIG: SiteBoundaryConfig = {
  plotCorners: [
    new THREE.Vector2(-32.0, -28.0),
    new THREE.Vector2(36.0, -24.0),
    new THREE.Vector2(42.0, 32.0),
    new THREE.Vector2(14.0, 44.0),
    new THREE.Vector2(-28.0, 38.0),
    new THREE.Vector2(-38.0, 8.0),
  ],
  frontSetback: 5.0,
  rearSetback: 3.5,
  sideSetback: 2.5,
  wireframeHeight: 18.0,
  boundaryColor: new THREE.Color(0xe0b57e), // Warm gold datum marker
  setbackColor: new THREE.Color(0x6e88a8),  // Engineering cyan-steel datum
  beaconRadius: 0.65,
  benchmarkLabels: ['BM-DHR-01', 'BM-DHR-02', 'BM-DHR-03', 'BM-DHR-04', 'BM-DHR-05', 'BM-DHR-06'],
};

export const DEFAULT_SOIL_STRATA_CONFIG: SoilStrataConfig = {
  topsoilDepth: 0.45,
  alluvialLoamDepth: 2.1,
  gravelBhabarDepth: 5.6,
  bedrockDepth: 14.0,
  waterTableDepth: 6.8,
  strataColors: {
    topsoil: new THREE.Color(0x28231d),        // Fertile dark organic loam
    alluvialLoam: new THREE.Color(0x7a6852),   // Terai clay / silt
    gravelBhabar: new THREE.Color(0xa3927d),   // Sandstone riverbed pebbles
    siwalikBedrock: new THREE.Color(0x4a453e), // Indurated Siwalik sandstone
    waterTableLine: new THREE.Color(0x4a88b0), // Aquifer capillary fringe
    excavationCut: new THREE.Color(0xbfa683),  // Freshly excavated trench cut
  },
};

export const DEFAULT_SLICER_CONFIG: ElevationSliceConfig = {
  active: false,
  axis: 'x',
  progress: 0.5,
  customNormal: new THREE.Vector3(1, 0, 0),
  customPoint: new THREE.Vector3(0, 0, 0),
  renderSoilStrataCurtain: true,
  renderExcavationFootprint: true,
  buildingPadCenter: new THREE.Vector2(4.0, 6.0),
  buildingPadSize: new THREE.Vector2(24.0, 18.0),
  foundationDepth: 3.2,
};

// ============================================================================
// 2. MATHEMATICAL UTILITIES & PROCEDURAL NOISE ENGINE
// ============================================================================

/**
 * High-performance 2D & 3D Simplex Noise with Analytical Derivatives.
 * Provides exact surface tangents and normals without finite difference blurring.
 */
export class SimplexNoiseField {
  private p: Uint8Array = new Uint8Array(512);
  private perm: Uint8Array = new Uint8Array(512);
  private permMod12: Uint8Array = new Uint8Array(512);

  // Gradient vectors for 2D (12 pairs matching permMod12)
  private readonly grad2: Float32Array = new Float32Array([
    1, 1, -1, 1, 1, -1, -1, -1,
    1, 0, -1, 0, 0, 1, 0, -1,
    0.7071, 0.7071, -0.7071, 0.7071, 0.7071, -0.7071, -0.7071, -0.7071,
  ]);

  // Gradient vectors for 3D
  private readonly grad3: Float32Array = new Float32Array([
    1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
    1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
    0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1,
  ]);

  constructor(seed = 1337.42) {
    this.reseed(seed);
  }

  public reseed(seed: number): void {
    const source = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      source[i] = i;
    }

    // Mulberry32 PRNG
    let s = Math.floor(Math.abs(seed) * 100000) + 1;
    const random = () => {
      let t = (s += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // Fisher-Yates shuffle
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const tmp = source[i];
      source[i] = source[j];
      source[j] = tmp;
    }

    for (let i = 0; i < 512; i++) {
      this.p[i] = source[i & 255];
      this.perm[i] = this.p[i];
      this.permMod12[i] = this.p[i] % 12;
    }
  }

  /**
   * Evaluates 2D Simplex noise value in range [-1.0, 1.0].
   */
  public noise2D(xin: number, yin: number): number {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);

    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    let i1 = 0;
    let j1 = 0;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;

    const gi0 = this.permMod12[ii + this.perm[jj]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];

    let n0 = 0.0;
    let n1 = 0.0;
    let n2 = 0.0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      t0 *= t0;
      n0 = t0 * t0 * (this.grad2[gi0 * 2] * x0 + this.grad2[gi0 * 2 + 1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      t1 *= t1;
      n1 = t1 * t1 * (this.grad2[gi1 * 2] * x1 + this.grad2[gi1 * 2 + 1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      t2 *= t2;
      n2 = t2 * t2 * (this.grad2[gi2 * 2] * x2 + this.grad2[gi2 * 2 + 1] * y2);
    }

    return 70.0 * (n0 + n1 + n2);
  }

  /**
   * Evaluates 2D Simplex noise with exact analytical partial derivatives (df/dx, df/dy).
   */
  public noise2DDerivatives(
    xin: number,
    yin: number,
    outGrad: THREE.Vector2
  ): number {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);

    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;

    const gi0 = this.permMod12[ii + this.perm[jj]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];

    const g0x = this.grad2[gi0 * 2];
    const g0y = this.grad2[gi0 * 2 + 1];
    const g1x = this.grad2[gi1 * 2];
    const g1y = this.grad2[gi1 * 2 + 1];
    const g2x = this.grad2[gi2 * 2];
    const g2y = this.grad2[gi2 * 2 + 1];

    let n0 = 0.0, n1 = 0.0, n2 = 0.0;
    let dnx0 = 0.0, dny0 = 0.0;
    let dnx1 = 0.0, dny1 = 0.0;
    let dnx2 = 0.0, dny2 = 0.0;

    const t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      const t02 = t0 * t0;
      const t04 = t02 * t02;
      const dot0 = g0x * x0 + g0y * y0;
      n0 = t04 * dot0;
      const factor0 = -8.0 * t0 * t02 * dot0;
      dnx0 = factor0 * x0 + t04 * g0x;
      dny0 = factor0 * y0 + t04 * g0y;
    }

    const t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      const t12 = t1 * t1;
      const t14 = t12 * t12;
      const dot1 = g1x * x1 + g1y * y1;
      n1 = t14 * dot1;
      const factor1 = -8.0 * t1 * t12 * dot1;
      dnx1 = factor1 * x1 + t14 * g1x;
      dny1 = factor1 * y1 + t14 * g1y;
    }

    const t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      const t22 = t2 * t2;
      const t24 = t22 * t22;
      const dot2 = g2x * x2 + g2y * y2;
      n2 = t24 * dot2;
      const factor2 = -8.0 * t2 * t22 * dot2;
      dnx2 = factor2 * x2 + t24 * g2x;
      dny2 = factor2 * y2 + t24 * g2y;
    }

    outGrad.x = 70.0 * (dnx0 + dnx1 + dnx2);
    outGrad.y = 70.0 * (dny0 + dny1 + dny2);
    return 70.0 * (n0 + n1 + n2);
  }
}

/**
 * Landscape Terracing Function from 20_snohetta
 * Creates architectural stepped agricultural contours typical of Himalayan hill architecture.
 */
export function calculateTerraceElevation(
  rawElevation: number,
  stepHeight: number,
  smoothness: number
): { steppedElevation: number; terraceT: number } {
  if (stepHeight <= 0.001) {
    return { steppedElevation: rawElevation, terraceT: 0.0 };
  }

  const normalizedStep = rawElevation / stepHeight;
  const stepIndex = Math.floor(normalizedStep);
  const frac = normalizedStep - stepIndex;

  const smooth = Math.max(0.01, Math.min(0.49, smoothness));
  const t = smoothstep(0.5 - smooth, 0.5 + smooth, frac);

  const stepped = (stepIndex + t) * stepHeight;
  return { steppedElevation: stepped, terraceT: t };
}

/** Smoothstep interpolation helper */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0.0, Math.min(1.0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3.0 - 2.0 * t);
}

// ============================================================================
// 3. ELEVATION GRID HEIGHTFIELD BUFFER
// ============================================================================

/**
 * High-precision heightfield grid representing the Terai-to-Dharan landscape elevation.
 */
export class ElevationGrid {
  public readonly width: number;
  public readonly depth: number;
  public readonly resX: number;
  public readonly resZ: number;
  public readonly dx: number;
  public readonly dz: number;

  public readonly elevationsAMSL: Float32Array;
  public readonly normalizedY: Float32Array;
  public readonly normals: Float32Array;
  public readonly slopes: Float32Array;

  private simplex: SimplexNoiseField;
  private config: TopographyConfig;

  constructor(config: TopographyConfig) {
    this.config = { ...config };
    this.width = config.worldWidth;
    this.depth = config.worldDepth;
    this.resX = config.gridResolutionX;
    this.resZ = config.gridResolutionZ;
    this.dx = this.width / (this.resX - 1);
    this.dz = this.depth / (this.resZ - 1);

    const totalVerts = this.resX * this.resZ;
    this.elevationsAMSL = new Float32Array(totalVerts);
    this.normalizedY = new Float32Array(totalVerts);
    this.normals = new Float32Array(totalVerts * 3);
    this.slopes = new Float32Array(totalVerts);

    this.simplex = new SimplexNoiseField(config.seed);
    this.generate();
  }

  /**
   * Synthesizes the procedural elevation field based on Himalayan geography.
   * South (Z < 0) corresponds to Biratnagar alluvial plains (AMSL ~80m).
   * North (Z > 0) ascends toward Dharan Chure foothill ridge (AMSL ~349m).
   */
  public generate(): void {
    const halfW = this.width * 0.5;
    const halfD = this.depth * 0.5;
    const elevSpan = this.config.maxElevationAMSL - this.config.minElevationAMSL;
    const gradTemp = new THREE.Vector2();

    for (let j = 0; j < this.resZ; j++) {
      const z = -halfD + j * this.dz;
      // Geographic north ramp factor [0.0 south to 1.0 north]
      const northRamp = (z + halfD) / this.depth;
      // Sigmoidal tectonic uplift curve representing the Himalayan frontal thrust
      const upliftCurve = Math.pow(northRamp, 1.65);

      for (let i = 0; i < this.resX; i++) {
        const x = -halfW + i * this.dx;
        const index = j * this.resX + i;

        // 1. Regional Macro Geomorphology (Terai plain vs Dharan hill)
        let macroElevation = this.config.minElevationAMSL + upliftCurve * elevSpan * 0.78;

        // 2. Multi-Octave Fractal Brownian Motion (fBm)
        let frequency = this.config.baseFrequency;
        let amplitude = 1.0;
        let totalNoise = 0.0;
        let totalAmp = 0.0;
        let gradAccumX = 0.0;
        let gradAccumZ = 0.0;

        for (let oct = 0; oct < this.config.octaves; oct++) {
          // Domain warping on middle octaves to simulate mountain erosion gullies
          const warpX = oct > 1 ? this.simplex.noise2D(x * 0.02 + 11.2, z * 0.02 + 5.1) * 3.5 : 0.0;
          const warpZ = oct > 1 ? this.simplex.noise2D(x * 0.02 - 7.3, z * 0.02 + 19.8) * 3.5 : 0.0;

          const nVal = this.simplex.noise2DDerivatives(
            (x + warpX) * frequency,
            (z + warpZ) * frequency,
            gradTemp
          );

          // Chure sharp ridgeline formulation
          const ridge = 1.0 - Math.abs(nVal);
          const octVal = THREE.MathUtils.lerp(nVal, ridge * ridge, this.config.ridgeStrength * northRamp);

          totalNoise += octVal * amplitude;
          totalAmp += amplitude;
          gradAccumX += gradTemp.x * frequency * amplitude;
          gradAccumZ += gradTemp.y * frequency * amplitude;

          amplitude *= this.config.persistence;
          frequency *= this.config.lacunarity;
        }

        const normalizedFbm = totalNoise / totalAmp;

        // Terai flattening: damp amplitude in the southern half
        const noiseWeight = THREE.MathUtils.lerp(
          1.0 - this.config.plainFlattening * 0.65,
          1.25,
          northRamp
        );

        let synthesizedElevation = macroElevation + normalizedFbm * (elevSpan * 0.38) * noiseWeight;

        // 3. Koshi River Basin tributary incision (valleys cut deeper towards south)
        const gullyCenter = Math.sin(z * 0.038) * 18.0 + Math.cos(z * 0.015) * 8.0;
        const distToGully = Math.abs(x - gullyCenter);
        const gullyMask = Math.exp(-(distToGully * distToGully) / 280.0);
        const gullyCarve = gullyMask * this.config.valleyDepth * 18.0 * (1.1 - northRamp * 0.4);
        synthesizedElevation -= gullyCarve;

        // 4. Stepped hillside terracing for Dharan foothill slopes
        if (northRamp > 0.28) {
          const terraceWeight = smoothstep(0.28, 0.65, northRamp);
          const { steppedElevation } = calculateTerraceElevation(
            synthesizedElevation,
            this.config.terraceStepMeters,
            this.config.terraceSmoothness
          );
          synthesizedElevation = THREE.MathUtils.lerp(synthesizedElevation, steppedElevation, terraceWeight * 0.72);
        }

        // Clamp to AMSL bounds
        synthesizedElevation = Math.max(
          this.config.minElevationAMSL,
          Math.min(this.config.maxElevationAMSL, synthesizedElevation)
        );

        this.elevationsAMSL[index] = synthesizedElevation;
        const normY = (synthesizedElevation - this.config.minElevationAMSL) * this.config.heightScale;
        this.normalizedY[index] = normY;

        // Slope and surface normal computation from gradients
        const slopeX = gradAccumX * this.config.heightScale;
        const slopeZ = gradAccumZ * this.config.heightScale;
        const normal = new THREE.Vector3(-slopeX, 1.0, -slopeZ).normalize();

        const vIdx = index * 3;
        this.normals[vIdx] = normal.x;
        this.normals[vIdx + 1] = normal.y;
        this.normals[vIdx + 2] = normal.z;

        // Slope in degrees: angle against vertical up vector (0, 1, 0)
        const slopeAngle = Math.acos(Math.max(-1, Math.min(1, normal.y))) * (180.0 / Math.PI);
        this.slopes[index] = slopeAngle;
      }
    }
  }

  /**
   * Bicubic / Bilinear continuous interpolation of terrain elevation at any (x, z) world coordinate.
   */
  public sample(worldX: number, worldZ: number): ElevationSample {
    const halfW = this.width * 0.5;
    const halfD = this.depth * 0.5;

    // Local coordinates in [0, resX-1] and [0, resZ-1]
    const u = ((worldX + halfW) / this.width) * (this.resX - 1);
    const v = ((worldZ + halfD) / this.depth) * (this.resZ - 1);

    const x0 = Math.floor(Math.max(0, Math.min(this.resX - 2, u)));
    const z0 = Math.floor(Math.max(0, Math.min(this.resZ - 2, v)));
    const x1 = x0 + 1;
    const z1 = z0 + 1;

    const fx = u - x0;
    const fz = v - z0;

    // 4 Corner values
    const e00 = this.elevationsAMSL[z0 * this.resX + x0];
    const e10 = this.elevationsAMSL[z0 * this.resX + x1];
    const e01 = this.elevationsAMSL[z1 * this.resX + x0];
    const e11 = this.elevationsAMSL[z1 * this.resX + x1];

    // Bilinear interpolation
    const elevAMSL =
      e00 * (1 - fx) * (1 - fz) +
      e10 * fx * (1 - fz) +
      e01 * (1 - fx) * fz +
      e11 * fx * fz;

    const normElev =
      (elevAMSL - this.config.minElevationAMSL) /
      (this.config.maxElevationAMSL - this.config.minElevationAMSL);

    const yPos = (elevAMSL - this.config.minElevationAMSL) * this.config.heightScale;

    // Normal interpolation
    const n00 = new THREE.Vector3(
      this.normals[(z0 * this.resX + x0) * 3],
      this.normals[(z0 * this.resX + x0) * 3 + 1],
      this.normals[(z0 * this.resX + x0) * 3 + 2]
    );
    const n10 = new THREE.Vector3(
      this.normals[(z0 * this.resX + x1) * 3],
      this.normals[(z0 * this.resX + x1) * 3 + 1],
      this.normals[(z0 * this.resX + x1) * 3 + 2]
    );
    const n01 = new THREE.Vector3(
      this.normals[(z1 * this.resX + x0) * 3],
      this.normals[(z1 * this.resX + x0) * 3 + 1],
      this.normals[(z1 * this.resX + x0) * 3 + 2]
    );
    const n11 = new THREE.Vector3(
      this.normals[(z1 * this.resX + x1) * 3],
      this.normals[(z1 * this.resX + x1) * 3 + 1],
      this.normals[(z1 * this.resX + x1) * 3 + 2]
    );

    const normal = new THREE.Vector3()
      .addScaledVector(n00, (1 - fx) * (1 - fz))
      .addScaledVector(n10, fx * (1 - fz))
      .addScaledVector(n01, (1 - fx) * fz)
      .addScaledVector(n11, fx * fz)
      .normalize();

    const slopeDeg = Math.acos(Math.max(-1, Math.min(1, normal.y))) * (180.0 / Math.PI);
    const aspectRad = Math.atan2(normal.z, normal.x);

    return {
      elevationAMSL: elevAMSL,
      normalizedElevation: normElev,
      worldPosition: new THREE.Vector3(worldX, yPos, worldZ),
      surfaceNormal: normal,
      slopeDegrees: slopeDeg,
      aspectRadians: aspectRad,
    };
  }

  /**
   * Generates a Three.js BufferGeometry representing the terrain surface.
   */
  public createBufferGeometry(): THREE.BufferGeometry {
    const geom = new THREE.BufferGeometry();
    const totalVerts = this.resX * this.resZ;

    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const uvs = new Float32Array(totalVerts * 2);
    const customElevation = new Float32Array(totalVerts);
    const customSlope = new Float32Array(totalVerts);

    const halfW = this.width * 0.5;
    const halfD = this.depth * 0.5;

    let pIdx = 0;
    let uvIdx = 0;

    for (let j = 0; j < this.resZ; j++) {
      const z = -halfD + j * this.dz;
      const v = j / (this.resZ - 1);

      for (let i = 0; i < this.resX; i++) {
        const x = -halfW + i * this.dx;
        const u = i / (this.resX - 1);
        const gridIdx = j * this.resX + i;
        const y = this.normalizedY[gridIdx];

        positions[pIdx] = x;
        positions[pIdx + 1] = y;
        positions[pIdx + 2] = z;

        normals[pIdx] = this.normals[gridIdx * 3];
        normals[pIdx + 1] = this.normals[gridIdx * 3 + 1];
        normals[pIdx + 2] = this.normals[gridIdx * 3 + 2];

        uvs[uvIdx] = u;
        uvs[uvIdx + 1] = v;

        customElevation[gridIdx] = this.elevationsAMSL[gridIdx];
        customSlope[gridIdx] = this.slopes[gridIdx];

        pIdx += 3;
        uvIdx += 2;
      }
    }

    // Triangulated Index Buffer
    const indicesCount = (this.resX - 1) * (this.resZ - 1) * 6;
    const indices = new Uint32Array(indicesCount);
    let indIdx = 0;

    for (let j = 0; j < this.resZ - 1; j++) {
      for (let i = 0; i < this.resX - 1; i++) {
        const a = j * this.resX + i;
        const b = j * this.resX + (i + 1);
        const c = (j + 1) * this.resX + i;
        const d = (j + 1) * this.resX + (i + 1);

        // Quad split into two CCW triangles: (a, c, b) and (b, c, d)
        indices[indIdx++] = a;
        indices[indIdx++] = c;
        indices[indIdx++] = b;

        indices[indIdx++] = b;
        indices[indIdx++] = c;
        indices[indIdx++] = d;
      }
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geom.setAttribute('aElevation', new THREE.BufferAttribute(customElevation, 1));
    geom.setAttribute('aSlope', new THREE.BufferAttribute(customSlope, 1));
    geom.setIndex(new THREE.BufferAttribute(indices, 1));

    geom.computeBoundingBox();
    geom.computeBoundingSphere();
    return geom;
  }
}

// ============================================================================
// 4. VECTOR CONTOUR EXTRACTION (MARCHING SQUARES ALGORITHM)
// ============================================================================

export type ContourTier = 'minor' | 'medium' | 'index';

export interface ContourSegment {
  p1: THREE.Vector3;
  p2: THREE.Vector3;
  elevationAMSL: number;
  tier: ContourTier;
}

export interface ContourPolyline {
  points: THREE.Vector3[];
  elevationAMSL: number;
  tier: ContourTier;
  isClosed: boolean;
  length: number;
}

/**
 * Rigorous Marching Squares 2D Iso-Surface Contour Slicer.
 * Extracts continuous vector linework with sub-grid linear interpolation
 * and saddle-point topological disambiguation.
 */
export class MarchingSquaresContourExtractor {
  private grid: ElevationGrid;
  private config: ContourIntervalConfig;
  private heightScale: number;
  private minElevation: number;

  constructor(grid: ElevationGrid, config: ContourIntervalConfig, heightScale: number, minElevation: number) {
    this.grid = grid;
    this.config = { ...config };
    this.heightScale = heightScale;
    this.minElevation = minElevation;
  }

  /**
   * Generates all contour polylines for the entire terrain heightfield.
   */
  public extractContours(): { segments: ContourSegment[]; polylines: ContourPolyline[] } {
    const rawSegments: ContourSegment[] = [];

    const minElev = this.minElevation;
    const maxElev = this.grid.elevationsAMSL.reduce((max, v) => (v > max ? v : max), minElev);

    // Compute all target elevation slices
    const step = this.config.minorInterval;
    const startElev = Math.ceil(minElev / step) * step;

    for (let targetElev = startElev; targetElev <= maxElev; targetElev += step) {
      let tier: ContourTier = 'minor';
      if (Math.abs(targetElev % this.config.indexInterval) < 0.001) {
        tier = 'index';
      } else if (Math.abs(targetElev % this.config.mediumInterval) < 0.001) {
        tier = 'medium';
      }

      this.sliceSingleElevation(targetElev, tier, rawSegments);
    }

    const polylines = this.chainSegmentsIntoPolylines(rawSegments);
    return { segments: rawSegments, polylines };
  }

  /**
   * Marching Squares pass over the grid cells for a single target elevation.
   */
  private sliceSingleElevation(
    targetElev: number,
    tier: ContourTier,
    outSegments: ContourSegment[]
  ): void {
    const resX = this.grid.resX;
    const resZ = this.grid.resZ;
    const halfW = this.grid.width * 0.5;
    const halfD = this.grid.depth * 0.5;
    const dx = this.grid.dx;
    const dz = this.grid.dz;

    // Linear interpolation helper between two corner vertices
    const interpolateEdge = (
      x0: number, z0: number, v0: number,
      x1: number, z1: number, v1: number
    ): THREE.Vector3 => {
      const denom = v1 - v0;
      const t = Math.abs(denom) < 0.00001 ? 0.5 : (targetElev - v0) / denom;
      const clampedT = Math.max(0.0, Math.min(1.0, t));
      const wx = x0 + (x1 - x0) * clampedT;
      const wz = z0 + (z1 - z0) * clampedT;
      const wy = (targetElev - this.minElevation) * this.heightScale + this.config.lineYOffset;
      return new THREE.Vector3(wx, wy, wz);
    };

    for (let j = 0; j < resZ - 1; j++) {
      const z0 = -halfD + j * dz;
      const z1 = z0 + dz;

      for (let i = 0; i < resX - 1; i++) {
        const x0 = -halfW + i * dx;
        const x1 = x0 + dx;

        // 4 Cell corner values:
        // Corner 0: bottom-left (x0, z0)
        // Corner 1: bottom-right (x1, z0)
        // Corner 2: top-right (x1, z1)
        // Corner 3: top-left (x0, z1)
        const v0 = this.grid.elevationsAMSL[j * resX + i];
        const v1 = this.grid.elevationsAMSL[j * resX + (i + 1)];
        const v2 = this.grid.elevationsAMSL[(j + 1) * resX + (i + 1)];
        const v3 = this.grid.elevationsAMSL[(j + 1) * resX + i];

        // 4-bit binary index
        let caseIndex = 0;
        if (v0 >= targetElev) caseIndex |= 1;
        if (v1 >= targetElev) caseIndex |= 2;
        if (v2 >= targetElev) caseIndex |= 4;
        if (v3 >= targetElev) caseIndex |= 8;

        if (caseIndex === 0 || caseIndex === 15) {
          continue; // Cell completely below or completely above iso-surface
        }

        // Cell edge intersection points:
        // Edge 0: Bottom (v0 -> v1)
        // Edge 1: Right (v1 -> v2)
        // Edge 2: Top (v3 -> v2)
        // Edge 3: Left (v0 -> v3)

        const getEdgePoint = (edge: number): THREE.Vector3 => {
          switch (edge) {
            case 0: return interpolateEdge(x0, z0, v0, x1, z0, v1);
            case 1: return interpolateEdge(x1, z0, v1, x1, z1, v2);
            case 2: return interpolateEdge(x0, z1, v3, x1, z1, v2);
            case 3: return interpolateEdge(x0, z0, v0, x0, z1, v3);
            default: return new THREE.Vector3(x0, 0, z0);
          }
        };

        const addSeg = (eA: number, eB: number) => {
          outSegments.push({
            p1: getEdgePoint(eA),
            p2: getEdgePoint(eB),
            elevationAMSL: targetElev,
            tier,
          });
        };

        switch (caseIndex) {
          case 1:  // 0001
          case 14: // 1110
            addSeg(3, 0);
            break;

          case 2:  // 0010
          case 13: // 1101
            addSeg(0, 1);
            break;

          case 3:  // 0011
          case 12: // 1100
            addSeg(3, 1);
            break;

          case 4:  // 0100
          case 11: // 1011
            addSeg(1, 2);
            break;

          case 5: { // 0101 (Saddle point ambiguity)
            const centerVal = (v0 + v1 + v2 + v3) * 0.25;
            if (centerVal >= targetElev) {
              addSeg(3, 2);
              addSeg(0, 1);
            } else {
              addSeg(3, 0);
              addSeg(1, 2);
            }
            break;
          }

          case 6:  // 0110
          case 9:  // 1001
            addSeg(0, 2);
            break;

          case 7:  // 0111
          case 8:  // 1000
            addSeg(3, 2);
            break;

          case 10: { // 1010 (Saddle point ambiguity)
            const centerVal = (v0 + v1 + v2 + v3) * 0.25;
            if (centerVal >= targetElev) {
              addSeg(0, 3);
              addSeg(2, 1);
            } else {
              addSeg(0, 1);
              addSeg(2, 3);
            }
            break;
          }
        }
      }
    }
  }

  /**
   * Chains disjoint segment soup into sorted continuous polylines.
   */
  private chainSegmentsIntoPolylines(segments: ContourSegment[]): ContourPolyline[] {
    const polylines: ContourPolyline[] = [];
    const groupedByElev = new Map<number, ContourSegment[]>();

    for (const seg of segments) {
      let list = groupedByElev.get(seg.elevationAMSL);
      if (!list) {
        list = [];
        groupedByElev.set(seg.elevationAMSL, list);
      }
      list.push(seg);
    }

    const EPSILON = 0.05;
    const EPS_SQ = EPSILON * EPSILON;

    for (const [elevation, segList] of groupedByElev.entries()) {
      const tier = segList[0].tier;
      const pool = [...segList];

      while (pool.length > 0) {
        const seed = pool.pop()!;
        const currentPoints: THREE.Vector3[] = [seed.p1.clone(), seed.p2.clone()];
        let isClosed = false;
        let extended = true;

        while (extended) {
          extended = false;
          const head = currentPoints[currentPoints.length - 1];
          const tail = currentPoints[0];

          // Check if already closed
          if (head.distanceToSquared(tail) < EPS_SQ && currentPoints.length > 2) {
            isClosed = true;
            break;
          }

          for (let k = 0; k < pool.length; k++) {
            const candidate = pool[k];

            // Connect to head
            if (head.distanceToSquared(candidate.p1) < EPS_SQ) {
              currentPoints.push(candidate.p2.clone());
              pool.splice(k, 1);
              extended = true;
              break;
            } else if (head.distanceToSquared(candidate.p2) < EPS_SQ) {
              currentPoints.push(candidate.p1.clone());
              pool.splice(k, 1);
              extended = true;
              break;
            }
            // Connect to tail
            else if (tail.distanceToSquared(candidate.p2) < EPS_SQ) {
              currentPoints.unshift(candidate.p1.clone());
              pool.splice(k, 1);
              extended = true;
              break;
            } else if (tail.distanceToSquared(candidate.p1) < EPS_SQ) {
              currentPoints.unshift(candidate.p2.clone());
              pool.splice(k, 1);
              extended = true;
              break;
            }
          }
        }

        // Calculate total arc-length
        let length = 0;
        for (let p = 0; p < currentPoints.length - 1; p++) {
          length += currentPoints[p].distanceTo(currentPoints[p + 1]);
        }

        // Ignore microscopic noise loops (< 0.5m)
        if (length > 0.5 && currentPoints.length >= 2) {
          polylines.push({
            points: currentPoints,
            elevationAMSL: elevation,
            tier,
            isClosed,
            length,
          });
        }
      }
    }

    return polylines;
  }
}

// ============================================================================
// 5. CAD ELEVATION CALLOUT SPRITES
// ============================================================================

/**
 * Procedural CAD Callout Sprite Texture Generator
 * Generates high-DPI billboard elevation markers with hairline borders and Swiss typography.
 */
export class CADCalloutGenerator {
  private static canvasCache = new Map<string, THREE.CanvasTexture>();

  public static createElevationTexture(
    elevationAMSL: number,
    colorHex: string,
    isIndex: boolean
  ): THREE.CanvasTexture {
    const key = `${elevationAMSL.toFixed(1)}_${colorHex}_${isIndex}`;
    if (this.canvasCache.has(key)) {
      return this.canvasCache.get(key)!;
    }

    if (typeof document === 'undefined') {
      const data = new Uint8Array(4);
      data[0] = 200;
      data[1] = 160;
      data[2] = 100;
      data[3] = 255;
      const fallback = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
      fallback.needsUpdate = true;
      return fallback as unknown as THREE.CanvasTexture;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 84;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Rounded CAD pill container
      const x = 6;
      const y = 6;
      const w = canvas.width - 12;
      const h = canvas.height - 12;
      const radius = 8;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();

      // Semi-transparent architectural backing
      ctx.fillStyle = isIndex ? 'rgba(16, 20, 26, 0.92)' : 'rgba(22, 27, 34, 0.82)';
      ctx.fill();

      // Hairline CAD border
      ctx.lineWidth = isIndex ? 2.5 : 1.5;
      ctx.strokeStyle = colorHex;
      ctx.stroke();

      // Elevation Text formatting (e.g., "+225.0m AMSL")
      ctx.fillStyle = colorHex;
      ctx.font = isIndex
        ? 'bold 24px "Space Grotesk", "JetBrains Mono", monospace'
        : '20px "Space Grotesk", "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const sign = elevationAMSL >= 0 ? '+' : '';
      const text = `${sign}${elevationAMSL.toFixed(0)}m`;
      ctx.fillText(text, canvas.width * 0.5, canvas.height * 0.44);

      // Micro datum subtitle
      ctx.fillStyle = 'rgba(180, 195, 215, 0.65)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('AMSL DATUM', canvas.width * 0.5, canvas.height * 0.74);

      // Corner datum crosshairs
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 4);
      ctx.lineTo(x + 10, y + 4);
      ctx.moveTo(x + 4, y + 4);
      ctx.lineTo(x + 4, y + 10);
      ctx.stroke();

      ctx.restore();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    this.canvasCache.set(key, texture);
    return texture;
  }
}

// ============================================================================
// 6. ARCHITECTURAL SITE BOUNDARY & PLOT FRAMING
// ============================================================================

/**
 * 3D Architectural Site Boundary, Setback Datum Lines, and Benchmark Monuments.
 */
export class ArchitecturalSiteBoundary {
  public readonly group: THREE.Group = new THREE.Group();
  private config: SiteBoundaryConfig;
  private grid: ElevationGrid;
  private materials: THREE.Material[] = [];
  private geometries: THREE.BufferGeometry[] = [];
  private beacons: THREE.Mesh[] = [];
  private beaconLaserBeams: THREE.Line[] = [];

  constructor(config: SiteBoundaryConfig, grid: ElevationGrid) {
    this.config = { ...config };
    this.grid = grid;
    this.buildBoundary();
  }

  private buildBoundary(): void {
    const corners = this.config.plotCorners;
    const n = corners.length;
    if (n < 3) return;

    // 1. 3D Terrain-Draped Plot Perimeter Wireframe
    const perimeterPoints: THREE.Vector3[] = [];
    const denseStep = 1.0; // Sample every 1m along perimeter edges

    for (let i = 0; i < n; i++) {
      const cA = corners[i];
      const cB = corners[(i + 1) % n];
      const dist = cA.distanceTo(cB);
      const steps = Math.max(1, Math.ceil(dist / denseStep));

      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const wx = THREE.MathUtils.lerp(cA.x, cB.x, t);
        const wz = THREE.MathUtils.lerp(cA.y, cB.y, t);
        const sample = this.grid.sample(wx, wz);
        perimeterPoints.push(new THREE.Vector3(wx, sample.worldPosition.y + 0.08, wz));
      }
    }
    // Close the loop
    perimeterPoints.push(perimeterPoints[0].clone());

    const perimeterGeom = new THREE.BufferGeometry().setFromPoints(perimeterPoints);
    const perimeterMat = new THREE.LineBasicMaterial({
      color: this.config.boundaryColor,
      linewidth: 2,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    this.geometries.push(perimeterGeom);
    this.materials.push(perimeterMat);
    const perimeterLine = new THREE.Line(perimeterGeom, perimeterMat);
    this.group.add(perimeterLine);

    // 2. Extruded Bounding Wireframe Cage (Subterranean to Aerial Datum)
    const aerialHeight = this.config.wireframeHeight;
    const aerialPoints: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      const cA = corners[i];
      const sample = this.grid.sample(cA.x, cA.y);
      const groundPos = new THREE.Vector3(cA.x, sample.worldPosition.y, cA.y);
      const skyPos = new THREE.Vector3(cA.x, sample.worldPosition.y + aerialHeight, cA.y);

      // Vertical corner datum poles
      const poleGeom = new THREE.BufferGeometry().setFromPoints([groundPos, skyPos]);
      const poleMat = new THREE.LineDashedMaterial({
        color: this.config.boundaryColor,
        dashSize: 0.8,
        gapSize: 0.4,
        scale: 1,
      });
      this.geometries.push(poleGeom);
      this.materials.push(poleMat);
      const poleLine = new THREE.Line(poleGeom, poleMat);
      poleLine.computeLineDistances();
      this.group.add(poleLine);

      aerialPoints.push(skyPos);
    }
    aerialPoints.push(aerialPoints[0].clone());

    const aerialGeom = new THREE.BufferGeometry().setFromPoints(aerialPoints);
    const aerialMat = new THREE.LineBasicMaterial({
      color: this.config.boundaryColor,
      opacity: 0.6,
      transparent: true,
    });
    this.geometries.push(aerialGeom);
    this.materials.push(aerialMat);
    const aerialLine = new THREE.Line(aerialGeom, aerialMat);
    this.group.add(aerialLine);

    // 3. Municipal Setback Lines (Offset polygon inwards)
    const setbackCorners = this.computeInwardOffsetPolygon(
      corners,
      this.config.frontSetback,
      this.config.sideSetback,
      this.config.rearSetback
    );

    if (setbackCorners.length >= 3) {
      const setbackPoints: THREE.Vector3[] = [];
      const m = setbackCorners.length;

      for (let i = 0; i < m; i++) {
        const cA = setbackCorners[i];
        const cB = setbackCorners[(i + 1) % m];
        const dist = cA.distanceTo(cB);
        const steps = Math.max(1, Math.ceil(dist / denseStep));

        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          const wx = THREE.MathUtils.lerp(cA.x, cB.x, t);
          const wz = THREE.MathUtils.lerp(cA.y, cB.y, t);
          const sample = this.grid.sample(wx, wz);
          setbackPoints.push(new THREE.Vector3(wx, sample.worldPosition.y + 0.1, wz));
        }
      }
      setbackPoints.push(setbackPoints[0].clone());

      const setbackGeom = new THREE.BufferGeometry().setFromPoints(setbackPoints);
      const setbackMat = new THREE.LineDashedMaterial({
        color: this.config.setbackColor,
        dashSize: 1.2,
        gapSize: 0.6,
        linewidth: 1.5,
      });
      this.geometries.push(setbackGeom);
      this.materials.push(setbackMat);
      const setbackLine = new THREE.Line(setbackGeom, setbackMat);
      setbackLine.computeLineDistances();
      this.group.add(setbackLine);
    }

    // 4. Survey Benchmark Monuments at Plot Vertices
    for (let i = 0; i < n; i++) {
      const c = corners[i];
      const sample = this.grid.sample(c.x, c.y);
      const label = this.config.benchmarkLabels[i] || `BM-${i + 1}`;

      const beaconMesh = this.createBeaconMonument(sample.worldPosition, label);
      this.group.add(beaconMesh);
      this.beacons.push(beaconMesh);
    }
  }

  /**
   * Creates a high-fidelity 3D Survey Monument Pillar with brass pin and vertical optical laser.
   */
  private createBeaconMonument(pos: THREE.Vector3, label: string): THREE.Mesh {
    const beaconGroup = new THREE.Group();

    // 1. Concrete Chamfered Pedestal
    const pillarGeom = new THREE.CylinderGeometry(
      this.config.beaconRadius * 0.7,
      this.config.beaconRadius,
      1.1,
      8
    );
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x8a857e,
      roughness: 0.88,
      metalness: 0.1,
    });
    const pillar = new THREE.Mesh(pillarGeom, pillarMat);
    pillar.position.y = 0.55;
    beaconGroup.add(pillar);

    // 2. Brass Center Pin
    const pinGeom = new THREE.CylinderGeometry(
      this.config.beaconRadius * 0.22,
      this.config.beaconRadius * 0.22,
      0.08,
      16
    );
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Polished brass
      roughness: 0.28,
      metalness: 0.9,
    });
    const pin = new THREE.Mesh(pinGeom, pinMat);
    pin.position.y = 1.14;
    beaconGroup.add(pin);

    // 3. Vertical Optical Laser Beam
    const laserGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 1.15, 0),
      new THREE.Vector3(0, 18.0, 0),
    ]);
    const laserMat = new THREE.LineBasicMaterial({
      color: 0x4df0ff,
      transparent: true,
      opacity: 0.45,
    });
    const laser = new THREE.Line(laserGeom, laserMat);
    beaconGroup.add(laser);
    this.beaconLaserBeams.push(laser);

    // 4. Billboard Benchmark Tag (when in browser DOM)
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 180;
      canvas.height = 56;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(10, 14, 20, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#e0b57e';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

        ctx.fillStyle = '#e0b57e';
        ctx.font = 'bold 16px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, canvas.width * 0.5, canvas.height * 0.42);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`+${pos.y.toFixed(2)}m`, canvas.width * 0.5, canvas.height * 0.78);
      }
      const spriteTex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: spriteTex, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(0, 2.2, 0);
      sprite.scale.set(3.6, 1.1, 1.0);
      beaconGroup.add(sprite);
    }

    beaconGroup.position.copy(pos);
    return beaconGroup as unknown as THREE.Mesh;
  }

  /**
   * Inset polygon computation for architectural setback lines.
   */
  private computeInwardOffsetPolygon(
    poly: THREE.Vector2[],
    frontOffset: number,
    sideOffset: number,
    rearOffset: number
  ): THREE.Vector2[] {
    const n = poly.length;
    const result: THREE.Vector2[] = [];

    // Direction vectors of edges
    for (let i = 0; i < n; i++) {
      const pPrev = poly[(i - 1 + n) % n];
      const pCurr = poly[i];
      const pNext = poly[(i + 1) % n];

      const vIn = new THREE.Vector2().subVectors(pCurr, pPrev).normalize();
      const vOut = new THREE.Vector2().subVectors(pNext, pCurr).normalize();

      // Normal inwards (assuming CCW winding)
      const nIn = new THREE.Vector2(-vIn.y, vIn.x);
      const nOut = new THREE.Vector2(-vOut.y, vOut.x);

      // Determine offset distance (front is index 0-1, rear is opposite, sides in between)
      const offsetDist = i === 0 ? frontOffset : i === Math.floor(n / 2) ? rearOffset : sideOffset;

      // Bisector ray
      const bisector = new THREE.Vector2().addVectors(nIn, nOut).normalize();
      const dot = bisector.dot(nIn);
      const scale = Math.abs(dot) < 0.1 ? offsetDist : offsetDist / dot;

      result.push(new THREE.Vector2().addVectors(pCurr, bisector.multiplyScalar(scale)));
    }

    return result;
  }

  public update(time: number): void {
    // Subtle laser beam pulsing animation
    const pulse = 0.35 + 0.25 * Math.sin(time * 2.8);
    for (const beam of this.beaconLaserBeams) {
      (beam.material as THREE.LineBasicMaterial).opacity = pulse;
    }
  }

  public dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.group.clear();
  }
}

// ============================================================================
// 7. INTERACTIVE ELEVATION SLICER & SOIL STRATA CURTAIN
// ============================================================================

/**
 * Procedural Soil Strata Cross-Section Curtain & Foundation Excavation System.
 * Renders layered geological soil profiles (topsoil, silty loam, Chure gravel, bedrock)
 * and interactive foundation trenching.
 */
export class SoilStrataSectionCurtain {
  public readonly group: THREE.Group = new THREE.Group();
  private grid: ElevationGrid;
  private strataConfig: SoilStrataConfig;
  private heightScale: number;
  private minElevation: number;

  private curtainMesh: THREE.Mesh | null = null;
  private excavationMesh: THREE.Mesh | null = null;
  private curtainTexture: THREE.CanvasTexture | null = null;

  constructor(
    grid: ElevationGrid,
    strataConfig: SoilStrataConfig,
    heightScale: number,
    minElevation: number
  ) {
    this.grid = grid;
    this.strataConfig = { ...strataConfig };
    this.heightScale = heightScale;
    this.minElevation = minElevation;

    this.curtainTexture = this.generateSoilStrataTexture();
  }

  /**
   * Generates a high-resolution geological texture displaying the 4 stratigraphic layers.
   */
  private generateSoilStrataTexture(): THREE.CanvasTexture {
    if (typeof document === 'undefined') {
      const data = new Uint8Array(4 * 4 * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 120;
        data[i + 1] = 100;
        data[i + 2] = 80;
        data[i + 3] = 255;
      }
      const fallback = new THREE.DataTexture(data, 4, 4, THREE.RGBAFormat);
      fallback.needsUpdate = true;
      return fallback as unknown as THREE.CanvasTexture;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Stratigraphic column proportions
      // Y=0 (top) down to Y=1024 (deep bedrock)
      const topsoilH = Math.floor(canvas.height * 0.08);
      const loamH = Math.floor(canvas.height * 0.28);
      const gravelH = Math.floor(canvas.height * 0.34);
      const bedrockH = canvas.height - (topsoilH + loamH + gravelH);

      // Layer 1: Topsoil
      ctx.fillStyle = `#${this.strataConfig.strataColors.topsoil.getHexString()}`;
      ctx.fillRect(0, 0, canvas.width, topsoilH);
      // Organic rootlets stippling
      ctx.fillStyle = 'rgba(20, 15, 10, 0.4)';
      for (let i = 0; i < 400; i++) {
        ctx.fillRect(Math.random() * canvas.width, Math.random() * topsoilH, 2, 2);
      }

      // Layer 2: Silty Loam
      ctx.fillStyle = `#${this.strataConfig.strataColors.alluvialLoam.getHexString()}`;
      ctx.fillRect(0, topsoilH, canvas.width, loamH);
      // Silt striations
      ctx.strokeStyle = 'rgba(80, 65, 50, 0.35)';
      ctx.lineWidth = 1;
      for (let y = topsoilH; y < topsoilH + loamH; y += 8) {
        ctx.beginPath();
        ctx.moveTo(0, y + (Math.random() - 0.5) * 4);
        ctx.lineTo(canvas.width, y + (Math.random() - 0.5) * 4);
        ctx.stroke();
      }

      // Layer 3: Chure Gravel / Bhabar Aggregate
      const gravelStart = topsoilH + loamH;
      ctx.fillStyle = `#${this.strataConfig.strataColors.gravelBhabar.getHexString()}`;
      ctx.fillRect(0, gravelStart, canvas.width, gravelH);
      // Pebbles & Cobbles
      for (let i = 0; i < 500; i++) {
        const px = Math.random() * canvas.width;
        const py = gravelStart + Math.random() * gravelH;
        const pr = 2 + Math.random() * 5;
        ctx.fillStyle = Math.random() > 0.5 ? '#b8a996' : '#73685a';
        ctx.beginPath();
        ctx.ellipse(px, py, pr, pr * 0.65, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }

      // Water Table Line
      const waterY = gravelStart + Math.floor(gravelH * 0.45);
      ctx.strokeStyle = `#${this.strataConfig.strataColors.waterTableLine.getHexString()}`;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(0, waterY);
      ctx.lineTo(canvas.width, waterY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Layer 4: Siwalik Sandstone Bedrock
      const bedrockStart = gravelStart + gravelH;
      ctx.fillStyle = `#${this.strataConfig.strataColors.siwalikBedrock.getHexString()}`;
      ctx.fillRect(0, bedrockStart, canvas.width, bedrockH);
      // Rock joints / bedding planes (dipping at ~22 degrees typical of Chure hills)
      ctx.strokeStyle = 'rgba(30, 26, 22, 0.6)';
      ctx.lineWidth = 2;
      for (let y = bedrockStart - 100; y < canvas.height + 200; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y - 80);
        ctx.stroke();
      }

      // Geological Datum Marks
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText('0.0m TOPSOIL (HUMUS)', 12, topsoilH - 6);
      ctx.fillText('-0.5m ALLUVIAL SILT', 12, topsoilH + 20);
      ctx.fillText('-2.2m BHABAR GRAVEL', 12, gravelStart + 20);
      ctx.fillText('▼ WATER TABLE', 12, waterY - 6);
      ctx.fillText('-5.5m SIWALIK BEDROCK', 12, bedrockStart + 24);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  /**
   * Rebuilds the vertical section wall curtain along the slice plane.
   */
  public rebuildCurtain(sliceConfig: ElevationSliceConfig): void {
    if (this.curtainMesh) {
      this.group.remove(this.curtainMesh);
      this.curtainMesh.geometry.dispose();
      (this.curtainMesh.material as THREE.Material).dispose();
      this.curtainMesh = null;
    }

    if (!sliceConfig.active || !sliceConfig.renderSoilStrataCurtain) {
      return;
    }

    const halfW = this.grid.width * 0.5;
    const halfD = this.grid.depth * 0.5;
    const bedrockDatumY = -12.0; // Depth below minimum elevation

    // Create vertical curtain along the slice line
    const samples = 128;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    if (sliceConfig.axis === 'x') {
      const sliceX = -halfW + sliceConfig.progress * this.grid.width;

      for (let s = 0; s <= samples; s++) {
        const z = -halfD + (s / samples) * this.grid.depth;
        const ground = this.grid.sample(sliceX, z);
        const groundY = ground.worldPosition.y;

        // Top vertex (natural ground surface)
        positions.push(sliceX, groundY, z);
        uvs.push(s / samples, 0.0);

        // Bottom vertex (bedrock subterranean datum)
        positions.push(sliceX, bedrockDatumY, z);
        uvs.push(s / samples, 1.0);
      }
    } else {
      const sliceZ = -halfD + sliceConfig.progress * this.grid.depth;

      for (let s = 0; s <= samples; s++) {
        const x = -halfW + (s / samples) * this.grid.width;
        const ground = this.grid.sample(x, sliceZ);
        const groundY = ground.worldPosition.y;

        // Top vertex
        positions.push(x, groundY, sliceZ);
        uvs.push(s / samples, 0.0);

        // Bottom vertex
        positions.push(x, bedrockDatumY, sliceZ);
        uvs.push(s / samples, 1.0);
      }
    }

    for (let s = 0; s < samples; s++) {
      const topA = s * 2;
      const btmA = s * 2 + 1;
      const topB = (s + 1) * 2;
      const btmB = (s + 1) * 2 + 1;

      // Two triangles per quad (double sided)
      indices.push(topA, btmA, topB);
      indices.push(topB, btmA, btmB);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      map: this.curtainTexture,
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    this.curtainMesh = new THREE.Mesh(geom, mat);
    this.group.add(this.curtainMesh);
  }

  public dispose(): void {
    if (this.curtainMesh) {
      this.curtainMesh.geometry.dispose();
      (this.curtainMesh.material as THREE.Material).dispose();
    }
    if (this.excavationMesh) {
      this.excavationMesh.geometry.dispose();
      (this.excavationMesh.material as THREE.Material).dispose();
    }
    if (this.curtainTexture) {
      this.curtainTexture.dispose();
    }
    this.group.clear();
  }
}

// ============================================================================
// 8. BESPOKE TOPOGRAPHY PBR SHADERS & MATERIALS
// ============================================================================

/**
 * Custom architectural shader material for the terrain.
 * Provides hypsometric tinting, slope-aware rock shading, micro-texture noise,
 * and procedural fallback contour line rendering.
 */
export function createTopographyPBRMaterial(
  preset: TopographyStylePreset,
  minAMSL: number,
  maxAMSL: number,
  clippingPlanes: THREE.Plane[] = []
): THREE.ShaderMaterial {
  // Color palette definitions per preset
  const palettes = {
    architectural_cad: {
      colorLow: new THREE.Color(0xd2d7df),   // Clean off-white chalk
      colorMid: new THREE.Color(0xa0aab8),   // Architectural concrete grey
      colorHigh: new THREE.Color(0x3e4550),  // Deep charcoal slate
      rockCliff: new THREE.Color(0x23272e),  // Dark basalt rock
      contourLine: new THREE.Color(0x181a1f),// Crisp graphite ink
      gridColor: new THREE.Color(0x8c96a5),
    },
    snohetta_slate: {
      colorLow: new THREE.Color(0x8f969d),   // Soft alpine moss slate
      colorMid: new THREE.Color(0x535a63),   // Norwegian schist
      colorHigh: new THREE.Color(0x272c33),  // Glacial granite
      rockCliff: new THREE.Color(0x1a1e24),  // Chiseled cliff face
      contourLine: new THREE.Color(0xd4a76a),// Warm Sal timber bronze
      gridColor: new THREE.Color(0x3e454f),
    },
    golden_terai: {
      colorLow: new THREE.Color(0xd6ad72),   // Terai alluvial golden silt
      colorMid: new THREE.Color(0xa66e44),   // Chure terracotta clay
      colorHigh: new THREE.Color(0x5c3c26),  // Deep mountain timber
      rockCliff: new THREE.Color(0x3b2416),  // Dark ferruginous sandstone
      contourLine: new THREE.Color(0xffe6a3),// Illuminated sunlit ridge
      gridColor: new THREE.Color(0x734c32),
    },
    blueprint_technical: {
      colorLow: new THREE.Color(0x0e2338),   // Deep indigo blueprint
      colorMid: new THREE.Color(0x13385c),   // Engineering cyan-navy
      colorHigh: new THREE.Color(0x1b5285),  // Vivid drafting blue
      rockCliff: new THREE.Color(0x0a1928),  // Dark abyss
      contourLine: new THREE.Color(0x40e0d0),// Glowing cyan vector line
      gridColor: new THREE.Color(0x1e4973),
    },
    hypsometric_elevation: {
      colorLow: new THREE.Color(0x52796f),   // Lowland lush alluvial plain
      colorMid: new THREE.Color(0xbc6c25),   // Mid-altitude terrace ochre
      colorHigh: new THREE.Color(0xdda15e),  // Foothill ridge crest
      rockCliff: new THREE.Color(0x283618),  // Dense cliff forest
      contourLine: new THREE.Color(0xfefae0),// Ivory contour lines
      gridColor: new THREE.Color(0x606c38),
    },
  };

  const selectedPalette = palettes[preset] || palettes.architectural_cad;

  const uniforms = {
    uMinElevation: { value: minAMSL },
    uMaxElevation: { value: maxAMSL },
    uColorLow: { value: selectedPalette.colorLow },
    uColorMid: { value: selectedPalette.colorMid },
    uColorHigh: { value: selectedPalette.colorHigh },
    uRockCliff: { value: selectedPalette.rockCliff },
    uContourColor: { value: selectedPalette.contourLine },
    uGridColor: { value: selectedPalette.gridColor },
    uLightDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
    uContourSpacing: { value: 10.0 }, // meters
    uContourLineWidth: { value: 0.08 },
    uShowContourShader: { value: 1.0 },
    uAmbientIntensity: { value: 0.42 },
  };

  const vertexShader = `
    attribute float aElevation;
    attribute float aSlope;

    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying float vElevation;
    varying float vSlope;

    #include <clipping_planes_pars_vertex>

    void main() {
      vElevation = aElevation;
      vSlope = aSlope;
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);

      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;

      #include <begin_vertex>
      #include <project_vertex>
      #include <clipping_planes_vertex>
    }
  `;

  const fragmentShader = `
    uniform float uMinElevation;
    uniform float uMaxElevation;
    uniform vec3 uColorLow;
    uniform vec3 uColorMid;
    uniform vec3 uColorHigh;
    uniform vec3 uRockCliff;
    uniform vec3 uContourColor;
    uniform vec3 uGridColor;
    uniform vec3 uLightDirection;
    uniform float uContourSpacing;
    uniform float uContourLineWidth;
    uniform float uShowContourShader;
    uniform float uAmbientIntensity;

    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying float vElevation;
    varying float vSlope;

    #include <clipping_planes_pars_fragment>

    void main() {
      #include <clipping_planes_fragment>

      // 1. Normalized hypsometric elevation [0.0 to 1.0]
      float normElev = clamp((vElevation - uMinElevation) / (uMaxElevation - uMinElevation), 0.0, 1.0);

      // 3-stop elevation gradient
      vec3 terrainColor;
      if (normElev < 0.45) {
        float t = normElev / 0.45;
        terrainColor = mix(uColorLow, uColorMid, smoothstep(0.0, 1.0, t));
      } else {
        float t = (normElev - 0.45) / 0.55;
        terrainColor = mix(uColorMid, uColorHigh, smoothstep(0.0, 1.0, t));
      }

      // 2. Slope-aware rock face transition (cliffs > 35 degrees expose bedrock)
      float cliffFactor = smoothstep(28.0, 52.0, vSlope);
      terrainColor = mix(terrainColor, uRockCliff, cliffFactor * 0.85);

      // 3. Directional Lambertian Lighting & Rim Specular
      vec3 lightDir = normalize(uLightDirection);
      vec3 norm = normalize(vNormal);
      float nDotL = max(0.0, dot(norm, lightDir));
      vec3 diffuse = terrainColor * (nDotL * 0.65 + uAmbientIntensity);

      // Subtle architectural ambient occlusion in terrain hollows
      float ao = clamp(norm.y * 0.8 + 0.2, 0.2, 1.0);
      vec3 finalColor = diffuse * ao;

      // 4. Procedural Antialiased Contour Lines via Derivative Screen-Space Anti-Aliasing
      if (uShowContourShader > 0.5) {
        float elevCoord = vElevation / uContourSpacing;
        float elevFract = fract(elevCoord);
        float elevDist = min(elevFract, 1.0 - elevFract);
        float fwidthElev = fwidth(elevCoord);
        float lineIntensity = 1.0 - smoothstep(0.0, fwidthElev * 1.5, elevDist);

        finalColor = mix(finalColor, uContourColor, lineIntensity * 0.45);
      }

      // 5. Modular CAD Hairline Coordinate Grid (10m spacing)
      vec2 gridCoord = vWorldPosition.xz / 10.0;
      vec2 gridFract = abs(fract(gridCoord - 0.5) - 0.5) / fwidth(gridCoord);
      float gridLine = 1.0 - min(min(gridFract.x, gridFract.y), 1.0);
      finalColor = mix(finalColor, uGridColor, gridLine * 0.18);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    clipping: true,
    clippingPlanes,
    side: THREE.DoubleSide,
  });
}

// ============================================================================
// 9. CONTROLLER CLASS: TopographyMeshSystem
// ============================================================================

/**
 * Unified Landscape Architectural Topography System.
 * Coordinates elevation grid synthesis, dynamic vector contour line slicing,
 * architectural site boundary framing, interactive elevation sectioning,
 * and CAD callout billboards.
 */
export class TopographyMeshSystem {
  public readonly container: THREE.Group = new THREE.Group();

  private config: TopographyConfig;
  private contourConfig: ContourIntervalConfig;
  private boundaryConfig: SiteBoundaryConfig;
  private strataConfig: SoilStrataConfig;
  private slicerConfig: ElevationSliceConfig;
  private preset: TopographyStylePreset;

  private grid: ElevationGrid;
  private terrainMesh: THREE.Mesh | null = null;
  private terrainMaterial: THREE.ShaderMaterial | null = null;

  private contourGroup: THREE.Group = new THREE.Group();
  private calloutGroup: THREE.Group = new THREE.Group();
  private boundarySystem: ArchitecturalSiteBoundary | null = null;
  private strataCurtain: SoilStrataSectionCurtain | null = null;

  private clippingPlanes: THREE.Plane[] = [];
  private activeSlicePlane: THREE.Plane = new THREE.Plane();

  constructor(options: TopographySystemOptions = {}) {
    this.config = { ...DEFAULT_TOPOGRAPHY_CONFIG, ...options.topography };
    this.contourConfig = { ...DEFAULT_CONTOUR_CONFIG, ...options.contours };
    this.boundaryConfig = { ...DEFAULT_SITE_BOUNDARY_CONFIG, ...options.boundary };
    this.strataConfig = { ...DEFAULT_SOIL_STRATA_CONFIG, ...options.strata };
    this.slicerConfig = { ...DEFAULT_SLICER_CONFIG, ...options.slicer };
    this.preset = options.preset || 'architectural_cad';

    this.container.name = 'TopographyMeshSystem_Root';
    this.container.add(this.contourGroup);
    this.container.add(this.calloutGroup);

    // 1. Build Elevation Field Grid
    this.grid = new ElevationGrid(this.config);

    // 2. Build Terrain Surface Mesh
    this.buildTerrainMesh();

    // 3. Extract & Assemble Dynamic Vector Contour Linework
    this.buildContourLines();

    // 4. Assemble Architectural Site Boundary & Monoliths
    this.buildSiteBoundary();

    // 5. Initialize Soil Strata Section Slicer
    this.buildStrataSlicer();

    // 6. Apply Initial Slice Configuration
    this.updateSlicingState();
  }

  /**
   * Constructs the main 3D terrain BufferGeometry and ShaderMaterial.
   */
  private buildTerrainMesh(): void {
    if (this.terrainMesh) {
      this.container.remove(this.terrainMesh);
      this.terrainMesh.geometry.dispose();
      if (this.terrainMaterial) this.terrainMaterial.dispose();
    }

    const geometry = this.grid.createBufferGeometry();
    this.terrainMaterial = createTopographyPBRMaterial(
      this.preset,
      this.config.minElevationAMSL,
      this.config.maxElevationAMSL,
      this.clippingPlanes
    );

    this.terrainMesh = new THREE.Mesh(geometry, this.terrainMaterial);
    this.terrainMesh.name = 'Himalayan_Topography_Surface';
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = true;
    this.container.add(this.terrainMesh);
  }

  /**
   * Slices iso-surface contour polylines using Marching Squares
   * and creates Three.js LineSegments with CAD elevation callout labels.
   */
  public buildContourLines(): void {
    // Clear previous contours
    while (this.contourGroup.children.length > 0) {
      const child = this.contourGroup.children[0];
      this.contourGroup.remove(child);
      if (child instanceof THREE.LineSegments || child instanceof THREE.Line) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    while (this.calloutGroup.children.length > 0) {
      const child = this.calloutGroup.children[0];
      this.calloutGroup.remove(child);
      if (child instanceof THREE.Sprite) {
        child.material.dispose();
      }
    }

    const extractor = new MarchingSquaresContourExtractor(
      this.grid,
      this.contourConfig,
      this.config.heightScale,
      this.config.minElevationAMSL
    );

    const { segments, polylines } = extractor.extractContours();

    // Group segments by tier for optimized draw calls
    const minorVerts: number[] = [];
    const mediumVerts: number[] = [];
    const indexVerts: number[] = [];

    for (const seg of segments) {
      const targetArr =
        seg.tier === 'index'
          ? indexVerts
          : seg.tier === 'medium'
          ? mediumVerts
          : minorVerts;

      targetArr.push(seg.p1.x, seg.p1.y, seg.p1.z);
      targetArr.push(seg.p2.x, seg.p2.y, seg.p2.z);
    }

    const createLineSegmentsMesh = (
      verts: number[],
      color: THREE.Color,
      opacity: number,
      linewidth: number,
      name: string
    ) => {
      if (verts.length === 0) return;
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));

      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        linewidth,
        depthTest: true,
        clippingPlanes: this.clippingPlanes,
      });

      const lineMesh = new THREE.LineSegments(geom, mat);
      lineMesh.name = name;
      lineMesh.renderOrder = 2;
      this.contourGroup.add(lineMesh);
    };

    createLineSegmentsMesh(
      minorVerts,
      this.contourConfig.minorColor,
      this.contourConfig.minorOpacity,
      1,
      'ContourLines_Minor'
    );
    createLineSegmentsMesh(
      mediumVerts,
      this.contourConfig.mediumColor,
      this.contourConfig.mediumOpacity,
      1.5,
      'ContourLines_Medium'
    );
    createLineSegmentsMesh(
      indexVerts,
      this.contourConfig.indexColor,
      this.contourConfig.indexOpacity,
      2.5,
      'ContourLines_Index'
    );

    // Generate CAD Elevation Callout Labels along Index Contours
    if (this.contourConfig.renderCallouts) {
      this.generateElevationCalloutSprites(polylines);
    }
  }

  /**
   * Places billboard elevation labels along index contours at regular arc-length intervals.
   */
  private generateElevationCalloutSprites(polylines: ContourPolyline[]): void {
    const hexColor = `#${this.contourConfig.indexColor.getHexString()}`;

    for (const poly of polylines) {
      if (poly.tier !== 'index' || poly.length < 15.0) continue;

      let accumulatedDist = 0;
      let nextTargetDist = this.contourConfig.calloutSpacing * 0.5;

      for (let i = 0; i < poly.points.length - 1; i++) {
        const pA = poly.points[i];
        const pB = poly.points[i + 1];
        const segLen = pA.distanceTo(pB);

        accumulatedDist += segLen;
        if (accumulatedDist >= nextTargetDist) {
          nextTargetDist += this.contourConfig.calloutSpacing;

          const t = 1.0 - (accumulatedDist - nextTargetDist + this.contourConfig.calloutSpacing) / segLen;
          const labelPos = new THREE.Vector3().lerpVectors(pA, pB, Math.max(0, Math.min(1, t)));

          const texture = CADCalloutGenerator.createElevationTexture(
            poly.elevationAMSL,
            hexColor,
            true
          );
          const spriteMat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
          });

          const sprite = new THREE.Sprite(spriteMat);
          sprite.position.copy(labelPos);
          sprite.position.y += 0.85; // Elevate slightly above line
          sprite.scale.set(4.8, 1.6, 1.0);
          sprite.renderOrder = 10;
          this.calloutGroup.add(sprite);
        }
      }
    }
  }

  /**
   * Builds the 3D property boundary lines, setbacks, and survey beacons.
   */
  public buildSiteBoundary(): void {
    if (this.boundarySystem) {
      this.container.remove(this.boundarySystem.group);
      this.boundarySystem.dispose();
    }

    this.boundarySystem = new ArchitecturalSiteBoundary(this.boundaryConfig, this.grid);
    this.boundarySystem.group.name = 'SiteBoundary_System';
    this.container.add(this.boundarySystem.group);
  }

  /**
   * Initializes the geological soil strata vertical curtain.
   */
  private buildStrataSlicer(): void {
    if (this.strataCurtain) {
      this.container.remove(this.strataCurtain.group);
      this.strataCurtain.dispose();
    }

    this.strataCurtain = new SoilStrataSectionCurtain(
      this.grid,
      this.strataConfig,
      this.config.heightScale,
      this.config.minElevationAMSL
    );
    this.strataCurtain.group.name = 'SoilStrata_SectionCurtain';
    this.container.add(this.strataCurtain.group);
  }

  /**
   * Updates Three.js clipping planes and regenerates the cross-section curtain.
   */
  private updateSlicingState(): void {
    if (!this.slicerConfig.active) {
      this.clippingPlanes.length = 0;
      if (this.strataCurtain) {
        this.strataCurtain.rebuildCurtain(this.slicerConfig);
      }
      return;
    }

    const halfW = this.config.worldWidth * 0.5;
    const halfD = this.config.worldDepth * 0.5;

    let normal: THREE.Vector3;
    let planeConstant: number;

    if (this.slicerConfig.axis === 'x') {
      const sliceX = -halfW + this.slicerConfig.progress * this.config.worldWidth;
      normal = new THREE.Vector3(-1, 0, 0); // Clip everything beyond sliceX
      planeConstant = sliceX;
    } else if (this.slicerConfig.axis === 'z') {
      const sliceZ = -halfD + this.slicerConfig.progress * this.config.worldDepth;
      normal = new THREE.Vector3(0, 0, -1);
      planeConstant = sliceZ;
    } else {
      normal = this.slicerConfig.customNormal.clone().normalize();
      planeConstant = -this.slicerConfig.customPoint.dot(normal);
    }

    this.activeSlicePlane.set(normal, planeConstant);
    this.clippingPlanes.length = 0;
    this.clippingPlanes.push(this.activeSlicePlane);

    if (this.strataCurtain) {
      this.strataCurtain.rebuildCurtain(this.slicerConfig);
    }
  }

  // ==========================================================================
  // PUBLIC CONTROLLER API
  // ==========================================================================

  /**
   * Sets the interactive vertical slice plane position.
   * @param axis 'x' or 'z' axis along which to scrub
   * @param progress 0.0 to 1.0 representing position across terrain
   * @param active whether clipping is activated
   */
  public setSlicePlane(axis: 'x' | 'z', progress: number, active = true): void {
    this.slicerConfig.axis = axis;
    this.slicerConfig.progress = Math.max(0.0, Math.min(1.0, progress));
    this.slicerConfig.active = active;
    this.updateSlicingState();
  }

  /**
   * Sets an arbitrary diagonal 3D clipping plane for advanced architectural section analysis.
   */
  public setCustomSlicePlane(point: THREE.Vector3, normal: THREE.Vector3, active = true): void {
    this.slicerConfig.axis = 'custom';
    this.slicerConfig.customPoint.copy(point);
    this.slicerConfig.customNormal.copy(normal);
    this.slicerConfig.active = active;
    this.updateSlicingState();
  }

  /**
   * Deactivates section clipping.
   */
  public clearSlicePlane(): void {
    this.slicerConfig.active = false;
    this.updateSlicingState();
  }

  /**
   * Switches architectural styling presets.
   */
  public setStylePreset(preset: TopographyStylePreset): void {
    this.preset = preset;
    this.buildTerrainMesh();
  }

  /**
   * Updates contour interval spacing and re-extracts contour lines.
   */
  public setContourIntervals(minor: number, medium: number, index: number): void {
    this.contourConfig.minorInterval = minor;
    this.contourConfig.mediumInterval = medium;
    this.contourConfig.indexInterval = index;
    this.buildContourLines();
  }

  /**
   * Continuous analytical elevation query at any world coordinate (x, z).
   */
  public sampleElevationAt(worldX: number, worldZ: number): ElevationSample {
    return this.grid.sample(worldX, worldZ);
  }

  /**
   * Raycasts a mouse pointer against the terrain surface mesh.
   */
  public raycastTerrain(raycaster: THREE.Raycaster): THREE.Intersection | null {
    if (!this.terrainMesh) return null;
    const intersects = raycaster.intersectObject(this.terrainMesh, false);
    return intersects.length > 0 ? intersects[0] : null;
  }

  /**
   * Exports CAD-compatible GeoJSON FeatureCollection of all extracted contour curves.
   */
  public exportGeoJSON(): object {
    const extractor = new MarchingSquaresContourExtractor(
      this.grid,
      this.contourConfig,
      this.config.heightScale,
      this.config.minElevationAMSL
    );
    const { polylines } = extractor.extractContours();

    const features = polylines.map((poly, idx) => ({
      type: 'Feature',
      id: idx,
      properties: {
        elevation_amsl: poly.elevationAMSL,
        tier: poly.tier,
        is_closed: poly.isClosed,
        length_meters: poly.length,
      },
      geometry: {
        type: poly.isClosed ? 'Polygon' : 'LineString',
        coordinates: poly.isClosed
          ? [poly.points.map((p) => [p.x, p.z, p.y])]
          : poly.points.map((p) => [p.x, p.z, p.y]),
      },
    }));

    return {
      type: 'FeatureCollection',
      metadata: {
        project: 'Dharan-Biratnagar Himalayan Foothills Topography',
        datum: 'WGS84_Local_AMSL',
        minElevation: this.config.minElevationAMSL,
        maxElevation: this.config.maxElevationAMSL,
      },
      features,
    };
  }

  /**
   * Per-frame animation tick (animates beacon laser pulses, datum indicators).
   */
  public update(time: number): void {
    if (this.boundarySystem) {
      this.boundarySystem.update(time);
    }
  }

  /**
   * Complete GPU and memory resource disposal.
   */
  public dispose(): void {
    if (this.terrainMesh) {
      this.terrainMesh.geometry.dispose();
      if (this.terrainMaterial) this.terrainMaterial.dispose();
    }
    if (this.boundarySystem) {
      this.boundarySystem.dispose();
    }
    if (this.strataCurtain) {
      this.strataCurtain.dispose();
    }

    while (this.contourGroup.children.length > 0) {
      const child = this.contourGroup.children[0];
      this.contourGroup.remove(child);
      if (child instanceof THREE.LineSegments || child instanceof THREE.Line) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    while (this.calloutGroup.children.length > 0) {
      const child = this.calloutGroup.children[0];
      this.calloutGroup.remove(child);
      if (child instanceof THREE.Sprite) {
        child.material.dispose();
      }
    }

    this.container.clear();
  }
}

// ============================================================================
// 10. FACTORY FUNCTION
// ============================================================================

export interface TopographySystemHandle {
  system: TopographyMeshSystem;
  container: THREE.Group;
  sampleElevation: (x: number, z: number) => ElevationSample;
  setSliceProgress: (axis: 'x' | 'z', progress: number) => void;
  clearSlice: () => void;
  setPreset: (preset: TopographyStylePreset) => void;
  update: (time: number) => void;
  dispose: () => void;
}

/**
 * Creates and initializes a production-grade 3D landscape topography contour system.
 */
export function createTopographySystem(
  options: TopographySystemOptions = {}
): TopographySystemHandle {
  const system = new TopographyMeshSystem(options);

  return {
    system,
    container: system.container,
    sampleElevation: (x: number, z: number) => system.sampleElevationAt(x, z),
    setSliceProgress: (axis: 'x' | 'z', progress: number) => system.setSlicePlane(axis, progress, true),
    clearSlice: () => system.clearSlicePlane(),
    setPreset: (preset: TopographyStylePreset) => system.setStylePreset(preset),
    update: (time: number) => system.update(time),
    dispose: () => system.dispose(),
  };
}
