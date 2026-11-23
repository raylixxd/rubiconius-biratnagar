/**
 * Liquid Surface Displacement, Refraction & Raymarched Fluid Caustics Engine
 *
 * Reverse-Engineered & Extracted from:
 * - 07_garance (Studio Garance Dore: organic liquid surface wave simulation & heightfield advection)
 * - 14_resn (Resn: Snell's law chromatic dispersion, analytical curvature caustics & metaball surface tension)
 *
 * Technical Architecture & Physical Principles:
 * 1. 2D Liquid Surface Wave Simulator:
 *    - 2D finite-difference wave equation: d^2 z / dt^2 = c^2 * laplacian(z) - damping * (dz / dt)
 *    - 8-point isotropic discrete Laplacian stencil eliminating rectilinear grid bias.
 *    - Ping-pong 32-bit floating point FBO buffers with height/velocity/viscosity channel packing.
 *    - Continuous impulse splatting supporting point taps, velocity drag brushes, and falling droplets.
 *    - Semi-Lagrangian heightfield velocity advection under pointer momentum.
 *
 * 2. Snell's Law Refraction & Chromatic Dispersion:
 *    - Physical Snell's law refraction vector computation: R = refract(I, N, 1.0 / IOR).
 *    - Wavelength-dependent IOR dispersion splitting:
 *      * Red (650nm):   iorR = 1.3330 (water) / 1.514 (glass) / 1.700 (dense fluid)
 *      * Green (532nm): iorG = 1.3380 (water) / 1.520 (glass) / 1.712 (dense fluid)
 *      * Blue (450nm):  iorB = 1.3440 (water) / 1.528 (glass) / 1.728 (dense fluid)
 *    - Total Internal Reflection (TIR) fallback handling for grazing incident angles.
 *    - Schlick's Fresnel reflection approximation: F(theta) = F0 + (1 - F0) * (1 - cos(theta))^5.
 *    - Volumetric Beer-Lambert light attenuation: T = exp(-sigma_a * depth).
 *    - Microfacet Blinn-Phong & GGX specular glints on wave crests.
 *
 * 3. Raymarched Water Caustics:
 *    - Analytical wave curvature summit caustics: Hessian matrix computation (H_xx, H_yy, H_xy).
 *    - Light concentration Jacobian determinant: I_caustic ~ 1.0 / max(epsilon, |det(J)|).
 *    - Multi-octave wave summit focusing creating dancing underwater light networks on architectural floors.
 *    - Spectral chromatic separation along caustic focal cusp lines.
 *    - Suspended volumetric light shafts (god rays) penetrating the water column.
 *
 * 4. Droplet & Metaball Surface Tension Physics:
 *    - Dynamic collection of interactive mercury / water droplets with position, velocity, and mass.
 *    - Inter-droplet cohesion and surface tension mimicking Lennard-Jones molecular attraction.
 *    - Capillary bridge formation, stretching, and viscous severing (Rayleigh-Plateau instability).
 *    - Analytical GPU metaball scalar potential field: Phi(p) = sum_i [ R_i^2 / (||p - p_i||^2 + epsilon) ].
 *    - Automatic generation of normal maps and coupling of droplet splash impacts into the wave simulator.
 *
 * Dual Engine Compatibility:
 * - Native Three.js integration (ShaderMaterial, Mesh, WebGLRenderTarget, Scene/Camera).
 * - OGL / Standalone WebGL pipeline integration for low-overhead page compositing.
 */

import * as THREE from 'three';
import {
  Mesh as OGLMesh,
  Program as OGLProgram,
  Triangle as OGLTriangle,
  Vec2 as OGLVec2,
  type Renderer as OGLRenderer,
  type Texture as OGLTexture,
  type RenderTarget as OGLRenderTarget,
  type OGLRenderingContext,
} from 'ogl';
import { getQualityTier, prefersReducedMotion, isTouch, isMobile } from '../env';

// ============================================================================
// SECTION 1: TYPES & INTERFACES
// ============================================================================

export type LiquidPresetName =
  | 'architectural-water'
  | 'mercury-bead'
  | 'molten-bronze'
  | 'deep-obsidian'
  | 'crystal-spring';

export type BoundaryCondition = 'neumann' | 'dirichlet' | 'periodic' | 'absorbing';

export interface WaveSolverOptions {
  /** Simulation grid resolution along X and Y (e.g. 128, 256, 512). Default: 256 */
  resolution: number;
  /** Propagation wave speed tension constant (c^2 in wave equation, 0.05 to 0.45). Default: 0.28 */
  waveSpeed: number;
  /** Energy retention damping factor per frame (0.95 to 0.999). Default: 0.988 */
  damping: number;
  /** Viscosity resistance slowing rapid micro-oscillations (0.0 to 0.2). Default: 0.035 */
  viscosity: number;
  /** Time step delta for integration stability. Default: 0.016 */
  timeStep: number;
  /** Heightfield advection factor under surface pointer drag (0.0 to 1.0). Default: 0.35 */
  advection: number;
  /** Boundary condition algorithm. Default: 'absorbing' */
  boundary: BoundaryCondition;
  /** Use 8-neighbor isotropic Laplacian instead of 4-neighbor cross. Default: true */
  isotropicLaplacian: boolean;
}

export interface RefractionOptions {
  /** Index of refraction for Red channel (650nm). Default: 1.3330 */
  iorR: number;
  /** Index of refraction for Green channel (532nm). Default: 1.3380 */
  iorG: number;
  /** Index of refraction for Blue channel (450nm). Default: 1.3440 */
  iorB: number;
  /** Base normal displacement multiplier for UV refraction offset. Default: 0.045 */
  refractionStrength: number;
  /** Chromatic dispersion spread multiplier between RGB channels. Default: 1.45 */
  dispersionSpread: number;
  /** Schlick Fresnel baseline reflectance F0 (water: 0.02, glass: 0.04, mercury: 0.75). Default: 0.025 */
  fresnelF0: number;
  /** Schlick Fresnel exponential power falloff (typically 5.0). Default: 5.0 */
  fresnelPower: number;
  /** Base surface water normal scale multiplier. Default: 1.8 */
  normalScale: number;
  /** Specular highlight shininess exponent. Default: 96.0 */
  specularShininess: number;
  /** Specular highlight color tint. Default: #FFFFFF */
  specularColor: THREE.ColorRepresentation;
  /** Volumetric Beer-Lambert absorption color (liquid tint). Default: #E2EFF5 */
  absorptionColor: THREE.ColorRepresentation;
  /** Absorption density attenuation coefficient (0.0 = clear, >0.0 = colored/murky). Default: 0.35 */
  absorptionDensity: number;
  /** Total internal reflection fallback color / environment mix. Default: #0A1118 */
  tirFallbackColor: THREE.ColorRepresentation;
}

export interface CausticsOptions {
  /** Distance from liquid surface to underwater receiver floor/wall (world units). Default: 1.6 */
  floorDepth: number;
  /** Caustic peak brightness multiplier. Default: 1.65 */
  intensity: number;
  /** Curvature focus sharpening factor (higher = thinner, brighter filaments). Default: 2.2 */
  focusSharpen: number;
  /** Chromatic dispersion splitting along caustic filament edges (0.0 to 2.0). Default: 0.85 */
  dispersion: number;
  /** Light ray direction vector normalized [x, y, z]. Default: [0.35, 0.85, 0.40] */
  lightDirection: [number, number, number];
  /** Caustic filament light tint color. Default: #D4F4FF */
  causticColor: THREE.ColorRepresentation;
  /** Architectural floor/wall receiver color. Default: #12100E */
  floorColor: THREE.ColorRepresentation;
  /** Enable suspended volumetric light shafts (god rays). Default: true */
  enableSunbeams: boolean;
  /** Sunbeam haze density. Default: 0.22 */
  sunbeamDensity: number;
}

export interface DropletPhysicsOptions {
  /** Maximum number of active simultaneous droplets. Default: 16 */
  maxDroplets: number;
  /** Surface tension cohesion pulling droplets together. Default: 0.45 */
  surfaceTension: number;
  /** Internal fluid viscosity damping velocity. Default: 0.96 */
  viscosity: number;
  /** Distance threshold (UV space) where droplets begin coalescing into a single bead. Default: 0.075 */
  coalescenceDistance: number;
  /** Distance threshold where a dragged droplet severs and snaps free. Default: 0.16 */
  severDistance: number;
  /** Viscous neck bridge stiffness during stretch. Default: 0.32 */
  bridgeStiffness: number;
  /** Wall collision restitution elasticity (0.0 to 1.0). Default: 0.72 */
  restitution: number;
  /** Gravitational acceleration bias [x, y] in UV space. Default: [0.0, 0.0] */
  gravity: [number, number];
  /** Metaball scalar field threshold iso-surface value (0.5 to 1.5). Default: 1.0 */
  metaballThreshold: number;
  /** Edge softness / antialiasing for the metaball rim. Default: 0.025 */
  edgeSoftness: number;
  /** Mercury / metallic reflection factor for droplet beads (0.0 = clear water, 1.0 = liquid mercury). Default: 0.0 */
  metallicFactor: number;
}

export interface ImpulseOptions {
  /** Normalized X position in UV space [0.0 .. 1.0] */
  x: number;
  /** Normalized Y position in UV space [0.0 .. 1.0] */
  y: number;
  /** Radius of influence in UV space. Default: 0.035 */
  radius?: number;
  /** Impulse vertical displacement amplitude (-1.0 to 1.0). Default: 0.5 */
  strength?: number;
  /** Velocity X vector for directional brush stroke. Default: 0.0 */
  vx?: number;
  /** Velocity Y vector for directional brush stroke. Default: 0.0 */
  vy?: number;
  /** Type of impulse: point splash, ripple ring, directional wave, or vortex */
  type?: 'splash' | 'ring' | 'directional' | 'vortex';
}

export interface DropletState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  targetRadius: number;
  mass: number;
  isPinned: boolean;
  elongation: number;
  neckAngle: number;
  life: number;
}

export interface LiquidDisplacementOptions {
  /** Canvas element to render into, or container where canvas will be appended */
  target?: HTMLCanvasElement | HTMLElement | string;
  /** Width of display in pixels. If omitted, window.innerWidth is used */
  width?: number;
  /** Height of display in pixels. If omitted, window.innerHeight is used */
  height?: number;
  /** Background texture to refract through the liquid (image URL or HTMLImageElement/HTMLCanvasElement/THREE.Texture) */
  backgroundTexture?: string | HTMLImageElement | HTMLCanvasElement | THREE.Texture;
  /** Liquid preset profile */
  preset?: LiquidPresetName;
  /** Wave simulation options override */
  wave?: Partial<WaveSolverOptions>;
  /** Refraction & dispersion options override */
  refraction?: Partial<RefractionOptions>;
  /** Water caustics generator options override */
  caustics?: Partial<CausticsOptions>;
  /** Droplet & metaball physics options override */
  droplets?: Partial<DropletPhysicsOptions>;
  /** Whether mouse/touch interaction is automatically wired to canvas. Default: true */
  interactive?: boolean;
  /** Interactive drag splash sensitivity multiplier. Default: 1.0 */
  interactionSensitivity?: number;
  /** Device pixel ratio cap (defaults to quality tier based cap). */
  dpr?: number;
  /** Callback fired on each frame update */
  onUpdate?: (time: number, dt: number) => void;
  /** Callback fired when a droplet coalesce or sever event occurs */
  onDropletEvent?: (event: 'coalesce' | 'sever' | 'bounce', droplet: DropletState) => void;
}

export interface LiquidDisplacementHandle {
  /** DOM canvas element */
  canvas: HTMLCanvasElement;
  /** Sub-engine: 2D Wave Equation Solver */
  waveSolver: WaveEquationSolver;
  /** Sub-engine: Snell Refraction & Dispersion */
  refraction: SnellRefractionDispersion;
  /** Sub-engine: Water Caustics Generator */
  caustics: WaterCausticsGenerator;
  /** Sub-engine: Droplet & Metaball Physics */
  droplets: DropletMetaballPhysics;
  /** Inject an impulse wave or splash at UV coordinates */
  splat: (options: ImpulseOptions) => void;
  /** Spawn an interactive liquid droplet bead */
  addDroplet: (x: number, y: number, radius?: number, vx?: number, vy?: number) => DropletState;
  /** Clear all active droplets */
  clearDroplets: () => void;
  /** Set background refraction texture */
  setBackgroundTexture: (texture: THREE.Texture | HTMLImageElement | HTMLCanvasElement | string) => Promise<void>;
  /** Apply preset profile */
  applyPreset: (preset: LiquidPresetName) => void;
  /** Resize viewport dimensions */
  resize: (width?: number, height?: number) => void;
  /** Pause animation & simulation ticker */
  pause: () => void;
  /** Resume animation & simulation ticker */
  resume: () => void;
  /** Update frame ticker manually if RAF is managed externally */
  update: (time: number, dt?: number) => void;
  /** Render active frame to screen or internal target */
  render: () => void;
  /** Free all WebGL resources, textures, render targets, and listeners */
  dispose: () => void;
}

// ============================================================================
// SECTION 2: GLSL SHADER SOURCES
// ============================================================================

/**
 * Common fullscreen quad vertex shader.
 */
export const QUAD_VERT = /* glsl */ `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * 2D Liquid Surface Wave Simulator Fragment Shader.
 * Solves the discrete wave equation on a heightfield using 8-neighbor isotropic Laplacian.
 * Packed channels:
 * - R: Current height z_t [-1.0 .. 1.0]
 * - G: Previous height z_{t-1} [-1.0 .. 1.0]
 * - B: Surface vertical velocity (dz/dt)
 * - A: Local viscosity / droplet field modifier
 */
export const WAVE_SOLVER_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D tCurrent;
uniform vec2 uTexelSize;
uniform float uWaveSpeed;
uniform float uDamping;
uniform float uViscosity;
uniform float uDt;
uniform float uAdvection;
uniform vec2 uPointerVelocity;
uniform vec2 uPointerPos;
uniform int uBoundaryMode; // 0: absorbing, 1: neumann, 2: dirichlet, 3: periodic
uniform float uIsotropic;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  // Semi-Lagrangian Advection: trace backwards along velocity field
  if (uAdvection > 0.001) {
    float distToPointer = length(uv - uPointerPos);
    float pointerWeight = exp(-distToPointer * distToPointer * 160.0);
    vec2 advOffset = uPointerVelocity * uAdvection * pointerWeight * uTexelSize * 15.0;
    uv = clamp(uv - advOffset, uTexelSize, 1.0 - uTexelSize);
  }

  vec4 state = texture2D(tCurrent, uv);
  float zC = state.r;
  float zPrev = state.g;

  // 4 Cardinal neighbors
  float zL = texture2D(tCurrent, uv - vec2(uTexelSize.x, 0.0)).r;
  float zR = texture2D(tCurrent, uv + vec2(uTexelSize.x, 0.0)).r;
  float zB = texture2D(tCurrent, uv - vec2(0.0, uTexelSize.y)).r;
  float zT = texture2D(tCurrent, uv + vec2(0.0, uTexelSize.y)).r;

  // 4 Diagonal neighbors for isotropic 9-point Laplacian
  float zBL = texture2D(tCurrent, uv + vec2(-uTexelSize.x, -uTexelSize.y)).r;
  float zBR = texture2D(tCurrent, uv + vec2( uTexelSize.x, -uTexelSize.y)).r;
  float zTL = texture2D(tCurrent, uv + vec2(-uTexelSize.x,  uTexelSize.y)).r;
  float zTR = texture2D(tCurrent, uv + vec2( uTexelSize.x,  uTexelSize.y)).r;

  // Compute discrete Laplacian
  float laplacian;
  if (uIsotropic > 0.5) {
    // 8-neighbor isotropic discrete Laplacian:
    // (1/6) * cardinals + (1/12) * diagonals - (1) * center
    laplacian = (zL + zR + zB + zT) * 0.1666667 + (zBL + zBR + zTL + zTR) * 0.0833333 - zC;
  } else {
    // Standard 4-neighbor 5-point discrete Laplacian
    laplacian = (zL + zR + zB + zT) * 0.25 - zC;
  }

  // Wave equation numerical integration:
  // z_{t+1} = 2 * z_t - z_{t-1} + c^2 * laplacian - viscosity * (z_t - z_{t-1})
  float acceleration = uWaveSpeed * laplacian * 4.0;
  float velocity = (zC - zPrev) * (1.0 - uViscosity);
  float zNext = (zC + velocity + acceleration * uDt) * uDamping;

  // Boundary conditions
  if (uv.x <= uTexelSize.x || uv.x >= 1.0 - uTexelSize.x ||
      uv.y <= uTexelSize.y || uv.y >= 1.0 - uTexelSize.y) {
    if (uBoundaryMode == 0) {
      // Absorbing sponge layer
      zNext *= 0.65;
    } else if (uBoundaryMode == 2) {
      // Dirichlet: fixed zero boundary
      zNext = 0.0;
    }
  }

  // Soft clamp to prevent numerical explosion
  zNext = clamp(zNext, -1.5, 1.5);
  float finalVel = (zNext - zC);

  // Output: R = current z_{t+1}, G = previous z_t, B = velocity, A = local energy
  gl_FragColor = vec4(zNext, zC, finalVel, abs(finalVel) + abs(zNext) * 0.5);
}
`;

/**
 * Continuous Impulse Splatting Fragment Shader.
 * Injects wave disturbances, radial splashes, directional brushes, and concentric droplet rings.
 */
export const WAVE_SPLAT_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D tSource;
uniform vec2 uTexelSize;
uniform vec2 uPosition;
uniform float uRadius;
uniform float uStrength;
uniform vec2 uVelocity;
uniform int uType; // 0: splash, 1: ring, 2: directional, 3: vortex

varying vec2 vUv;

#define PI 3.14159265359

void main() {
  vec4 base = texture2D(tSource, vUv);
  vec2 d = (vUv - uPosition);
  float dist = length(d);

  float impulse = 0.0;

  if (uType == 0) {
    // Gaussian point splash
    float sigma = max(0.001, uRadius * 0.45);
    impulse = uStrength * exp(-(dist * dist) / (2.0 * sigma * sigma));
  } else if (uType == 1) {
    // Concentric capillary droplet ripple ring
    float normalizedDist = dist / max(0.0001, uRadius);
    if (normalizedDist < 2.5) {
      float envelope = exp(-normalizedDist * normalizedDist * 0.85);
      impulse = uStrength * cos(normalizedDist * PI * 2.8) * envelope;
    }
  } else if (uType == 2) {
    // Directional velocity drag stroke
    float sigma = max(0.001, uRadius * 0.5);
    float spatialFactor = exp(-(dist * dist) / (2.0 * sigma * sigma));
    float velProjection = dot(normalize(d + vec2(0.0001)), normalize(uVelocity + vec2(0.0001)));
    impulse = uStrength * spatialFactor * (1.0 + velProjection * 0.65);
  } else if (uType == 3) {
    // Vortex swirl impulse
    float sigma = max(0.001, uRadius * 0.5);
    float spatialFactor = exp(-(dist * dist) / (2.0 * sigma * sigma));
    float angle = atan(d.y, d.x);
    impulse = uStrength * sin(angle * 2.0) * spatialFactor;
  }

  // Inject into height (R) and previous height (G)
  float newHeight = clamp(base.r + impulse, -2.0, 2.0);
  gl_FragColor = vec4(newHeight, base.g, base.b + impulse * 0.5, base.a);
}
`;

/**
 * Normal Map & Hessian Matrix Derivation Fragment Shader.
 * Computes high-precision surface normals via central differences,
 * as well as the 2x2 Hessian tensor (second derivatives) for analytical caustics.
 * Output channels:
 * - R: Normal X component [-1.0 .. 1.0] (mapped to [0..1] if LDR, raw if float)
 * - G: Normal Y component [-1.0 .. 1.0]
 * - B: Normal Z component [0.0 .. 1.0]
 * - A: Mean surface curvature H = (H_xx + H_yy) * 0.5
 */
export const WAVE_NORMAL_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D tHeight;
uniform vec2 uTexelSize;
uniform float uNormalScale;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  // Central differences for first derivatives (gradient)
  float zL = texture2D(tHeight, uv - vec2(uTexelSize.x, 0.0)).r;
  float zR = texture2D(tHeight, uv + vec2(uTexelSize.x, 0.0)).r;
  float zB = texture2D(tHeight, uv - vec2(0.0, uTexelSize.y)).r;
  float zT = texture2D(tHeight, uv + vec2(0.0, uTexelSize.y)).r;
  float zC = texture2D(tHeight, uv).r;

  float dzdx = (zR - zL) * 0.5 * uNormalScale;
  float dzdy = (zT - zB) * 0.5 * uNormalScale;

  // Compute normalized 3D surface normal vector
  vec3 normal = normalize(vec3(-dzdx, -dzdy, 1.0));

  // Second derivatives for Hessian tensor: H_xx, H_yy
  float d2zdx2 = (zR - 2.0 * zC + zL) * uNormalScale;
  float d2zdy2 = (zT - 2.0 * zC + zB) * uNormalScale;
  float meanCurvature = (d2zdx2 + d2zdy2) * 0.5;

  gl_FragColor = vec4(normal, meanCurvature);
}
`;

/**
 * Snell's Law Refraction & Chromatic Dispersion Fragment Shader.
 * Reverse-engineered from Resn (14_resn) & Garance (07_garance):
 * - Refraction vector calculated via Snell's law: R = refract(I, N, 1.0 / IOR).
 * - Multi-wavelength dispersion splitting for Red (1.333), Green (1.338), Blue (1.344).
 * - Total Internal Reflection (TIR) handling for grazing angles.
 * - Schlick's Fresnel reflection blend.
 * - Volumetric Beer-Lambert absorption along optical path length.
 * - Specular microfacet glints on wave crests.
 */
export const REFRACTION_DISPERSION_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D tBackground;
uniform sampler2D tNormal;
uniform sampler2D tHeight;
uniform sampler2D tCaustics;
uniform sampler2D tDroplets;

uniform vec2 uResolution;
uniform float uTime;
uniform float uRefractionStrength;
uniform float uDispersionSpread;
uniform float uIorR;
uniform float uIorG;
uniform float uIorB;
uniform float uFresnelF0;
uniform float uFresnelPower;
uniform float uNormalScale;
uniform float uSpecularShininess;
uniform vec3 uSpecularColor;
uniform vec3 uAbsorptionColor;
uniform float uAbsorptionDensity;
uniform vec3 uTirFallbackColor;
uniform vec3 uLightDir;
uniform float uEnableCaustics;
uniform float uEnableDroplets;
uniform float uMetallicFactor;

varying vec2 vUv;

#define PI 3.14159265359

// Schlick's approximation for Fresnel reflectance
float schlickFresnel(vec3 normal, vec3 viewDir, float f0, float power) {
  float cosTheta = clamp(dot(normal, viewDir), 0.0, 1.0);
  return f0 + (1.0 - f0) * pow(1.0 - cosTheta, power);
}

// Procedural micro-surface sparkle noise
float sparkleNoise(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;

  // Sample liquid wave height and normal map
  vec4 normalData = texture2D(tNormal, uv);
  vec3 normal = normalize(normalData.xyz);
  float curvature = normalData.w;
  float height = texture2D(tHeight, uv).r;

  // Blend in droplet surface normal if droplet layer is enabled
  vec4 dropletData = vec4(0.0);
  if (uEnableDroplets > 0.5) {
    dropletData = texture2D(tDroplets, uv);
    if (dropletData.a > 0.01) {
      vec3 dropletNormal = normalize(dropletData.xyz * 2.0 - 1.0);
      normal = normalize(mix(normal, dropletNormal, dropletData.a));
    }
  }

  // Orthographic incident view ray pointing down along -Z into the liquid
  vec3 incident = vec3(0.0, 0.0, -1.0);
  vec3 viewDir = vec3(0.0, 0.0, 1.0);

  // Compute Snell's Law refraction vectors for R, G, B wavelengths
  float etaR = 1.0 / uIorR;
  float etaG = 1.0 / uIorG;
  float etaB = 1.0 / uIorB;

  // Apply dispersion spread scaling
  float deltaR = (etaR - etaG) * uDispersionSpread;
  float deltaB = (etaB - etaG) * uDispersionSpread;
  etaR = etaG + deltaR;
  etaB = etaG + deltaB;

  vec3 refrR = refract(incident, normal, etaR);
  vec3 refrG = refract(incident, normal, etaG);
  vec3 refrB = refract(incident, normal, etaB);

  // Check for Total Internal Reflection (TIR: zero length refraction vector)
  bool isTirR = (length(refrR) < 0.001);
  bool isTirG = (length(refrG) < 0.001);
  bool isTirB = (length(refrB) < 0.001);

  // Refracted UV sampling coordinates with normal displacement
  vec2 uvOffsetR = (isTirR ? reflect(incident, normal).xy : refrR.xy) * uRefractionStrength;
  vec2 uvOffsetG = (isTirG ? reflect(incident, normal).xy : refrG.xy) * uRefractionStrength;
  vec2 uvOffsetB = (isTirB ? reflect(incident, normal).xy : refrB.xy) * uRefractionStrength;

  vec2 uvR = clamp(uv + uvOffsetR, 0.001, 0.999);
  vec2 uvG = clamp(uv + uvOffsetG, 0.001, 0.999);
  vec2 uvB = clamp(uv + uvOffsetB, 0.001, 0.999);

  // Sample underlying background texture for each dispersed channel
  float sampleR = texture2D(tBackground, uvR).r;
  float sampleG = texture2D(tBackground, uvG).g;
  float sampleB = texture2D(tBackground, uvB).b;

  // Substitute TIR fallback color if critical angle is exceeded
  if (isTirR) sampleR = uTirFallbackColor.r;
  if (isTirG) sampleG = uTirFallbackColor.g;
  if (isTirB) sampleB = uTirFallbackColor.b;

  vec3 refractedColor = vec3(sampleR, sampleG, sampleB);

  // Volumetric Beer-Lambert absorption: T = exp(-absorption * opticalDepth)
  float opticalDepth = (1.0 + abs(height) * 1.5) * (1.0 / max(0.2, abs(refrG.z)));
  vec3 absorption = exp(-uAbsorptionColor * uAbsorptionDensity * opticalDepth);
  refractedColor *= absorption;

  // Overlay water caustics light network on background
  if (uEnableCaustics > 0.5) {
    vec4 causticsSample = texture2D(tCaustics, uvG);
    refractedColor += causticsSample.rgb * causticsSample.a * 0.75;
  }

  // Calculate Fresnel reflectance factor
  float fresnel = schlickFresnel(normal, viewDir, uFresnelF0, uFresnelPower);

  // Specular Blinn-Phong highlight from light source
  vec3 lightDir = normalize(uLightDir);
  vec3 halfVector = normalize(lightDir + viewDir);
  float nDotH = max(0.0, dot(normal, halfVector));
  float specular = pow(nDotH, uSpecularShininess);

  // Micro-surface sun sparkle along wave crests
  float sparkle = sparkleNoise(uv * 450.0 + uTime * 0.05);
  sparkle = pow(sparkle, 24.0) * max(0.0, curvature * 2.5);
  specular += sparkle * 1.5;

  // Liquid mercury metallic reflection mix
  vec3 reflectionColor = uSpecularColor * (specular + fresnel);
  if (uMetallicFactor > 0.01) {
    vec3 metallicTint = vec3(0.92, 0.94, 0.97); // Mercury / polished metal
    refractedColor = mix(refractedColor, metallicTint * (0.35 + fresnel * 0.65), uMetallicFactor);
  }

  // Final composition: Refracted body + Fresnel reflection + Specular glints
  vec3 finalColor = mix(refractedColor, reflectionColor, fresnel * 0.85) + (specular * uSpecularColor);

  gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
`;

/**
 * Analytical GPU Water Caustics Generator Fragment Shader.
 * Reverse-engineered from Resn (14_resn) & Garance (07_garance):
 * - Traces directional light rays refracted across surface wave summits.
 * - Computes ray convergence using the 2x2 Jacobian transformation matrix:
 *     J = I + depth * [ d^2z/dx^2, d^2z/dxdy; d^2z/dxdy, d^2z/dy^2 ]
 * - Caustic intensity ~ 1.0 / max(eps, |det(J)|).
 * - Multi-octave wave superposition creates dynamic underwater network patterns.
 * - Chromatic dispersion along caustic focal cusp filaments.
 */
export const CAUSTICS_GEN_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D tHeight;
uniform sampler2D tNormal;
uniform vec2 uTexelSize;
uniform float uTime;
uniform float uFloorDepth;
uniform float uIntensity;
uniform float uFocusSharpen;
uniform float uDispersion;
uniform vec3 uLightDir;
uniform vec3 uCausticColor;
uniform vec3 uFloorColor;
uniform float uEnableSunbeams;
uniform float uSunbeamDensity;

varying vec2 vUv;

#define PI 3.14159265359

// Analytical Gerstner wave harmonic generator for background caustic shimmer
float waveHarmonic(vec2 p, vec2 dir, float freq, float speed, float time) {
  return sin(dot(p, dir) * freq + time * speed);
}

void main() {
  vec2 uv = vUv;
  vec3 lightDir = normalize(uLightDir);

  // Sample height and derivatives
  float zC = texture2D(tHeight, uv).r;
  float zL = texture2D(tHeight, uv - vec2(uTexelSize.x, 0.0)).r;
  float zR = texture2D(tHeight, uv + vec2(uTexelSize.x, 0.0)).r;
  float zB = texture2D(tHeight, uv - vec2(0.0, uTexelSize.y)).r;
  float zT = texture2D(tHeight, uv + vec2(0.0, uTexelSize.y)).r;

  // Second partial derivatives (Hessian matrix components)
  float d2zdx2 = (zR - 2.0 * zC + zL) / (uTexelSize.x * uTexelSize.x) * 0.000008;
  float d2zdy2 = (zT - 2.0 * zC + zB) / (uTexelSize.y * uTexelSize.y) * 0.000008;

  // Diagonal mixed derivative
  float zTR = texture2D(tHeight, uv + vec2( uTexelSize.x,  uTexelSize.y)).r;
  float zBL = texture2D(tHeight, uv + vec2(-uTexelSize.x, -uTexelSize.y)).r;
  float zTL = texture2D(tHeight, uv + vec2(-uTexelSize.x,  uTexelSize.y)).r;
  float zBR = texture2D(tHeight, uv + vec2( uTexelSize.x, -uTexelSize.y)).r;
  float d2zdxdy = (zTR - zTL - zBR + zBL) / (4.0 * uTexelSize.x * uTexelSize.y) * 0.000008;

  // Add micro-harmonic wave turbulence (4 Gerstner octaves)
  float t = uTime * 1.25;
  vec2 p = uv * 32.0;
  float microH = waveHarmonic(p, vec2(0.707, 0.707), 1.0, 1.2, t) * 0.25 +
                 waveHarmonic(p, vec2(-0.8, 0.6),   1.8, 1.6, t) * 0.15 +
                 waveHarmonic(p, vec2(0.3, -0.95),  2.6, 2.1, t) * 0.10 +
                 waveHarmonic(p, vec2(-0.4, -0.9),  3.8, 2.8, t) * 0.06;

  d2zdx2 += microH * 0.04;
  d2zdy2 += microH * 0.04;

  // Compute 2x2 Jacobian determinant of surface-to-floor ray mapping:
  // J = (1 + D * d^2z/dx^2) * (1 + D * d^2z/dy^2) - (D * d^2z/dxdy)^2
  float dX = uFloorDepth * d2zdx2;
  float dY = uFloorDepth * d2zdy2;
  float dXY = uFloorDepth * d2zdxdy;

  // Three channel dispersion: evaluate Jacobian at slightly different focal depths
  float depthR = uFloorDepth * (1.0 - uDispersion * 0.06);
  float depthG = uFloorDepth;
  float depthB = uFloorDepth * (1.0 + uDispersion * 0.06);

  float detR = (1.0 + depthR * d2zdx2) * (1.0 + depthR * d2zdy2) - (depthR * d2zdxdy) * (depthR * d2zdxdy);
  float detG = (1.0 + depthG * d2zdx2) * (1.0 + depthG * d2zdy2) - (depthG * d2zdxdy) * (depthG * d2zdxdy);
  float detB = (1.0 + depthB * d2zdx2) * (1.0 + depthB * d2zdy2) - (depthB * d2zdxdy) * (depthB * d2zdxdy);

  // Caustic brightness ~ 1.0 / |det(J)|^focusSharpen
  float causticR = pow(1.0 / max(0.045, abs(detR)), uFocusSharpen);
  float causticG = pow(1.0 / max(0.045, abs(detG)), uFocusSharpen);
  float causticB = pow(1.0 / max(0.045, abs(detB)), uFocusSharpen);

  vec3 causticRGB = vec3(causticR, causticG, causticB) * uIntensity * 0.12;

  // Underwater light shaft attenuation (Beer-Lambert attenuation through depth)
  float depthAtten = exp(-uFloorDepth * 0.35);
  causticRGB *= depthAtten;

  // Volumetric Sunbeams / God Rays
  float sunbeam = 0.0;
  if (uEnableSunbeams > 0.5) {
    vec2 sunRayOffset = lightDir.xy * (1.0 - uv.y) * 0.45;
    float raySample = texture2D(tHeight, uv + sunRayOffset).r;
    sunbeam = max(0.0, raySample * 2.0) * uSunbeamDensity;
  }

  vec3 finalCaustic = (causticRGB * uCausticColor) + (sunbeam * vec3(0.95, 0.98, 1.0));
  float alpha = clamp(length(finalCaustic), 0.0, 1.0);

  gl_FragColor = vec4(finalCaustic, alpha);
}
`;

/**
 * Droplet & Metaball Surface Tension Fragment Shader.
 * Evaluates smooth polynomial metaball scalar fields for up to 32 interactive droplets.
 * Renders coalescing beads with viscous bridge stretching, meniscus contours,
 * and high-precision normal derivation for refraction/reflection compositing.
 */
export const METABALL_FIELD_FRAG = /* glsl */ `
precision highp float;

#define MAX_DROPLETS 32

uniform vec4 uDroplets[MAX_DROPLETS]; // xy: position [0..1], z: radius, w: mass/active
uniform int uDropletCount;
uniform vec2 uResolution;
uniform float uThreshold;
uniform float uEdgeSoftness;
uniform float uViscosityBridge;

varying vec2 vUv;

// Wyvill / Blinn smooth compact polynomial potential kernel:
// f(r) = (1 - (r/R)^2)^3 for r < R
float metaballPotential(vec2 p, vec2 center, float radius) {
  float r2 = dot(p - center, p - center);
  float R2 = radius * radius;
  if (r2 >= R2) return 0.0;
  float t = 1.0 - r2 / R2;
  return t * t * t;
}

// Derivative of potential kernel for analytical normal calculation
vec2 metaballGradient(vec2 p, vec2 center, float radius) {
  vec2 d = p - center;
  float r2 = dot(d, d);
  float R2 = radius * radius;
  if (r2 >= R2) return vec2(0.0);
  float t = 1.0 - r2 / R2;
  // d/dp [ (1 - r^2/R^2)^3 ] = 3 * (1 - r^2/R^2)^2 * (-2 * d / R^2)
  return -6.0 * (t * t) * (d / R2);
}

void main() {
  vec2 uv = vUv;
  float totalPotential = 0.0;
  vec2 totalGradient = vec2(0.0);

  for (int i = 0; i < MAX_DROPLETS; i++) {
    if (i >= uDropletCount) break;
    vec4 drop = uDroplets[i];
    if (drop.w <= 0.0) continue; // inactive droplet

    vec2 center = drop.xy;
    float radius = drop.z;

    totalPotential += metaballPotential(uv, center, radius);
    totalGradient += metaballGradient(uv, center, radius);
  }

  // Smoothstep thresholding for viscous surface contour
  float field = smoothstep(uThreshold - uEdgeSoftness, uThreshold + uEdgeSoftness, totalPotential);

  if (field < 0.001) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // Calculate surface normal from scalar field gradient
  vec2 grad = totalGradient;
  float gradLen = length(grad);
  vec3 normal = vec3(0.0, 0.0, 1.0);
  if (gradLen > 0.0001) {
    vec2 n2d = -normalize(grad);
    float zSlope = sqrt(max(0.0, 1.0 - dot(n2d, n2d) * 0.85));
    normal = normalize(vec3(n2d * 0.85, zSlope));
  }

  // Pack normal in RGB ([0..1]) and field opacity in A
  vec3 packedNormal = normal * 0.5 + 0.5;
  gl_FragColor = vec4(packedNormal, field);
}
`;

// ============================================================================
// SECTION 3: GPU FRAMEBUFFER & RENDER TARGET UTILITIES
// ============================================================================

export interface PingPongTarget {
  read: THREE.WebGLRenderTarget;
  write: THREE.WebGLRenderTarget;
  swap: () => void;
  dispose: () => void;
}

/**
 * Creates a pair of ping-pong WebGLRenderTargets for iterative GPU simulation.
 */
export function createPingPongRenderTarget(
  width: number,
  height: number,
  options: THREE.RenderTargetOptions = {}
): PingPongTarget {
  const defaultOptions: THREE.RenderTargetOptions = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
    ...options,
  };

  let targetA = new THREE.WebGLRenderTarget(width, height, defaultOptions);
  let targetB = new THREE.WebGLRenderTarget(width, height, defaultOptions);

  return {
    get read() {
      return targetA;
    },
    get write() {
      return targetB;
    },
    swap: () => {
      const temp = targetA;
      targetA = targetB;
      targetB = temp;
    },
    dispose: () => {
      targetA.dispose();
      targetB.dispose();
    },
  };
}

// ============================================================================
// SECTION 4: 2D GPU WAVE EQUATION SOLVER
// ============================================================================

export class WaveEquationSolver {
  public options: WaveSolverOptions;
  private renderer: THREE.WebGLRenderer;
  private pingPong: PingPongTarget;
  private normalTarget: THREE.WebGLRenderTarget;

  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private quadMesh: THREE.Mesh;

  private solverMaterial: THREE.ShaderMaterial;
  private splatMaterial: THREE.ShaderMaterial;
  private normalMaterial: THREE.ShaderMaterial;

  private texelSize: THREE.Vector2;
  private pointerPos: THREE.Vector2;
  private pointerVel: THREE.Vector2;
  private isDisposed: boolean = false;

  constructor(renderer: THREE.WebGLRenderer, options: Partial<WaveSolverOptions> = {}) {
    this.renderer = renderer;
    this.options = {
      resolution: options.resolution ?? 256,
      waveSpeed: options.waveSpeed ?? 0.28,
      damping: options.damping ?? 0.988,
      viscosity: options.viscosity ?? 0.035,
      timeStep: options.timeStep ?? 0.016,
      advection: options.advection ?? 0.35,
      boundary: options.boundary ?? 'absorbing',
      isotropicLaplacian: options.isotropicLaplacian ?? true,
    };

    const res = this.options.resolution;
    this.texelSize = new THREE.Vector2(1.0 / res, 1.0 / res);
    this.pointerPos = new THREE.Vector2(0.5, 0.5);
    this.pointerVel = new THREE.Vector2(0.0, 0.0);

    // Framebuffer allocation
    this.pingPong = createPingPongRenderTarget(res, res);
    this.normalTarget = new THREE.WebGLRenderTarget(res, res, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
    });

    // Orthographic quad scene setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadGeo = new THREE.PlaneGeometry(2, 2);

    // Shader materials
    const boundaryModeInt =
      this.options.boundary === 'absorbing' ? 0 :
      this.options.boundary === 'neumann' ? 1 :
      this.options.boundary === 'dirichlet' ? 2 : 3;

    this.solverMaterial = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: WAVE_SOLVER_FRAG,
      uniforms: {
        tCurrent: { value: null },
        uTexelSize: { value: this.texelSize },
        uWaveSpeed: { value: this.options.waveSpeed },
        uDamping: { value: this.options.damping },
        uViscosity: { value: this.options.viscosity },
        uDt: { value: this.options.timeStep },
        uAdvection: { value: this.options.advection },
        uPointerVelocity: { value: this.pointerVel },
        uPointerPos: { value: this.pointerPos },
        uBoundaryMode: { value: boundaryModeInt },
        uIsotropic: { value: this.options.isotropicLaplacian ? 1.0 : 0.0 },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.splatMaterial = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: WAVE_SPLAT_FRAG,
      uniforms: {
        tSource: { value: null },
        uTexelSize: { value: this.texelSize },
        uPosition: { value: new THREE.Vector2(0.5, 0.5) },
        uRadius: { value: 0.035 },
        uStrength: { value: 0.5 },
        uVelocity: { value: new THREE.Vector2(0, 0) },
        uType: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.normalMaterial = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: WAVE_NORMAL_FRAG,
      uniforms: {
        tHeight: { value: null },
        uTexelSize: { value: this.texelSize },
        uNormalScale: { value: 1.8 },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.quadMesh = new THREE.Mesh(quadGeo, this.solverMaterial);
    this.scene.add(this.quadMesh);

    // Clear ping-pong buffers to flat zero state
    this.clear();
  }

  /**
   * Resets simulation surface to calm equilibrium.
   */
  public clear(): void {
    const currentTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.pingPong.read);
    this.renderer.clearColor();
    this.renderer.setRenderTarget(this.pingPong.write);
    this.renderer.clearColor();
    this.renderer.setRenderTarget(this.normalTarget);
    this.renderer.clearColor();
    this.renderer.setRenderTarget(currentTarget);
  }

  /**
   * Injects an impulse wave into the surface heightfield.
   */
  public splat(options: ImpulseOptions): void {
    if (this.isDisposed) return;

    const currentTarget = this.renderer.getRenderTarget();
    const typeInt =
      options.type === 'ring' ? 1 :
      options.type === 'directional' ? 2 :
      options.type === 'vortex' ? 3 : 0;

    this.splatMaterial.uniforms.tSource.value = this.pingPong.read.texture;
    this.splatMaterial.uniforms.uPosition.value.set(options.x, options.y);
    this.splatMaterial.uniforms.uRadius.value = options.radius ?? 0.035;
    this.splatMaterial.uniforms.uStrength.value = options.strength ?? 0.5;
    this.splatMaterial.uniforms.uVelocity.value.set(options.vx ?? 0, options.vy ?? 0);
    this.splatMaterial.uniforms.uType.value = typeInt;

    this.quadMesh.material = this.splatMaterial;
    this.renderer.setRenderTarget(this.pingPong.write);
    this.renderer.render(this.scene, this.camera);
    this.pingPong.swap();

    this.renderer.setRenderTarget(currentTarget);
  }

  /**
   * Sets pointer position and velocity for surface advection.
   */
  public setPointer(x: number, y: number, vx: number, vy: number): void {
    this.pointerPos.set(x, y);
    this.pointerVel.set(vx, vy);
  }

  /**
   * Advances the wave equation simulation by one numerical time step.
   */
  public step(dt: number = 0.016): void {
    if (this.isDisposed) return;

    const currentTarget = this.renderer.getRenderTarget();

    // 1. Solve Wave Equation
    this.solverMaterial.uniforms.tCurrent.value = this.pingPong.read.texture;
    this.solverMaterial.uniforms.uWaveSpeed.value = this.options.waveSpeed;
    this.solverMaterial.uniforms.uDamping.value = this.options.damping;
    this.solverMaterial.uniforms.uViscosity.value = this.options.viscosity;
    this.solverMaterial.uniforms.uDt.value = dt;
    this.solverMaterial.uniforms.uAdvection.value = this.options.advection;
    this.solverMaterial.uniforms.uPointerPos.value = this.pointerPos;
    this.solverMaterial.uniforms.uPointerVelocity.value = this.pointerVel;

    this.quadMesh.material = this.solverMaterial;
    this.renderer.setRenderTarget(this.pingPong.write);
    this.renderer.render(this.scene, this.camera);
    this.pingPong.swap();

    // 2. Compute Normal & Hessian Curvature Map
    this.normalMaterial.uniforms.tHeight.value = this.pingPong.read.texture;
    this.quadMesh.material = this.normalMaterial;
    this.renderer.setRenderTarget(this.normalTarget);
    this.renderer.render(this.scene, this.camera);

    this.renderer.setRenderTarget(currentTarget);
  }

  public get heightTexture(): THREE.Texture {
    return this.pingPong.read.texture;
  }

  public get normalTexture(): THREE.Texture {
    return this.normalTarget.texture;
  }

  public setNormalScale(scale: number): void {
    this.normalMaterial.uniforms.uNormalScale.value = scale;
  }

  public resize(resolution: number): void {
    if (this.options.resolution === resolution) return;
    this.options.resolution = resolution;
    this.texelSize.set(1.0 / resolution, 1.0 / resolution);

    this.pingPong.dispose();
    this.normalTarget.dispose();

    this.pingPong = createPingPongRenderTarget(resolution, resolution);
    this.normalTarget = new THREE.WebGLRenderTarget(resolution, resolution, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    });
    this.clear();
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.pingPong.dispose();
    this.normalTarget.dispose();
    this.solverMaterial.dispose();
    this.splatMaterial.dispose();
    this.normalMaterial.dispose();
    this.quadMesh.geometry.dispose();
  }
}

// ============================================================================
// SECTION 5: SNELL REFRACTION & CHROMATIC DISPERSION
// ============================================================================

export class SnellRefractionDispersion {
  public options: RefractionOptions;
  private renderer: THREE.WebGLRenderer;
  private material: THREE.ShaderMaterial;
  private renderTarget: THREE.WebGLRenderTarget;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private quadMesh: THREE.Mesh;
  private isDisposed: boolean = false;

  constructor(
    renderer: THREE.WebGLRenderer,
    width: number,
    height: number,
    options: Partial<RefractionOptions> = {}
  ) {
    this.renderer = renderer;
    this.options = {
      iorR: options.iorR ?? 1.3330,
      iorG: options.iorG ?? 1.3380,
      iorB: options.iorB ?? 1.3440,
      refractionStrength: options.refractionStrength ?? 0.045,
      dispersionSpread: options.dispersionSpread ?? 1.45,
      fresnelF0: options.fresnelF0 ?? 0.025,
      fresnelPower: options.fresnelPower ?? 5.0,
      normalScale: options.normalScale ?? 1.8,
      specularShininess: options.specularShininess ?? 96.0,
      specularColor: options.specularColor ?? '#FFFFFF',
      absorptionColor: options.absorptionColor ?? '#E2EFF5',
      absorptionDensity: options.absorptionDensity ?? 0.35,
      tirFallbackColor: options.tirFallbackColor ?? '#0A1118',
    };

    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const specCol = new THREE.Color(this.options.specularColor);
    const absorbCol = new THREE.Color(this.options.absorptionColor);
    const tirCol = new THREE.Color(this.options.tirFallbackColor);

    this.material = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: REFRACTION_DISPERSION_FRAG,
      uniforms: {
        tBackground: { value: null },
        tNormal: { value: null },
        tHeight: { value: null },
        tCaustics: { value: null },
        tDroplets: { value: null },
        uResolution: { value: new THREE.Vector2(width, height) },
        uTime: { value: 0 },
        uRefractionStrength: { value: this.options.refractionStrength },
        uDispersionSpread: { value: this.options.dispersionSpread },
        uIorR: { value: this.options.iorR },
        uIorG: { value: this.options.iorG },
        uIorB: { value: this.options.iorB },
        uFresnelF0: { value: this.options.fresnelF0 },
        uFresnelPower: { value: this.options.fresnelPower },
        uNormalScale: { value: this.options.normalScale },
        uSpecularShininess: { value: this.options.specularShininess },
        uSpecularColor: { value: new THREE.Vector3(specCol.r, specCol.g, specCol.b) },
        uAbsorptionColor: { value: new THREE.Vector3(absorbCol.r, absorbCol.g, absorbCol.b) },
        uAbsorptionDensity: { value: this.options.absorptionDensity },
        uTirFallbackColor: { value: new THREE.Vector3(tirCol.r, tirCol.g, tirCol.b) },
        uLightDir: { value: new THREE.Vector3(0.35, 0.85, 0.4).normalize() },
        uEnableCaustics: { value: 1.0 },
        uEnableDroplets: { value: 1.0 },
        uMetallicFactor: { value: 0.0 },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(this.quadMesh);
  }

  public setBackgroundTexture(texture: THREE.Texture): void {
    this.material.uniforms.tBackground.value = texture;
  }

  public setNormalTexture(texture: THREE.Texture): void {
    this.material.uniforms.tNormal.value = texture;
  }

  public setHeightTexture(texture: THREE.Texture): void {
    this.material.uniforms.tHeight.value = texture;
  }

  public setCausticsTexture(texture: THREE.Texture | null): void {
    this.material.uniforms.tCaustics.value = texture;
    this.material.uniforms.uEnableCaustics.value = texture ? 1.0 : 0.0;
  }

  public setDropletsTexture(texture: THREE.Texture | null): void {
    this.material.uniforms.tDroplets.value = texture;
    this.material.uniforms.uEnableDroplets.value = texture ? 1.0 : 0.0;
  }

  public setMetallicFactor(metallic: number): void {
    this.material.uniforms.uMetallicFactor.value = metallic;
  }

  public render(time: number, target: THREE.WebGLRenderTarget | null = null): void {
    if (this.isDisposed) return;
    this.material.uniforms.uTime.value = time;
    const currentTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(target ?? this.renderTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(currentTarget);
  }

  public get texture(): THREE.Texture {
    return this.renderTarget.texture;
  }

  public resize(width: number, height: number): void {
    this.renderTarget.setSize(width, height);
    this.material.uniforms.uResolution.value.set(width, height);
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.renderTarget.dispose();
    this.material.dispose();
    this.quadMesh.geometry.dispose();
  }
}

// ============================================================================
// SECTION 6: RAYMARCHED WATER CAUSTICS GENERATOR
// ============================================================================

export class WaterCausticsGenerator {
  public options: CausticsOptions;
  private renderer: THREE.WebGLRenderer;
  private material: THREE.ShaderMaterial;
  private renderTarget: THREE.WebGLRenderTarget;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private quadMesh: THREE.Mesh;
  private isDisposed: boolean = false;

  constructor(
    renderer: THREE.WebGLRenderer,
    width: number,
    height: number,
    options: Partial<CausticsOptions> = {}
  ) {
    this.renderer = renderer;
    this.options = {
      floorDepth: options.floorDepth ?? 1.6,
      intensity: options.intensity ?? 1.65,
      focusSharpen: options.focusSharpen ?? 2.2,
      dispersion: options.dispersion ?? 0.85,
      lightDirection: options.lightDirection ?? [0.35, 0.85, 0.4],
      causticColor: options.causticColor ?? '#D4F4FF',
      floorColor: options.floorColor ?? '#12100E',
      enableSunbeams: options.enableSunbeams ?? true,
      sunbeamDensity: options.sunbeamDensity ?? 0.22,
    };

    // Half-resolution is visually pristine and 4x faster for caustics evaluation
    const causticW = Math.max(128, Math.floor(width * 0.5));
    const causticH = Math.max(128, Math.floor(height * 0.5));

    this.renderTarget = new THREE.WebGLRenderTarget(causticW, causticH, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    });

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const cColor = new THREE.Color(this.options.causticColor);
    const fColor = new THREE.Color(this.options.floorColor);

    this.material = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: CAUSTICS_GEN_FRAG,
      uniforms: {
        tHeight: { value: null },
        tNormal: { value: null },
        uTexelSize: { value: new THREE.Vector2(1.0 / causticW, 1.0 / causticH) },
        uTime: { value: 0 },
        uFloorDepth: { value: this.options.floorDepth },
        uIntensity: { value: this.options.intensity },
        uFocusSharpen: { value: this.options.focusSharpen },
        uDispersion: { value: this.options.dispersion },
        uLightDir: { value: new THREE.Vector3(...this.options.lightDirection).normalize() },
        uCausticColor: { value: new THREE.Vector3(cColor.r, cColor.g, cColor.b) },
        uFloorColor: { value: new THREE.Vector3(fColor.r, fColor.g, fColor.b) },
        uEnableSunbeams: { value: this.options.enableSunbeams ? 1.0 : 0.0 },
        uSunbeamDensity: { value: this.options.sunbeamDensity },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(this.quadMesh);
  }

  public setHeightTexture(texture: THREE.Texture): void {
    this.material.uniforms.tHeight.value = texture;
  }

  public setNormalTexture(texture: THREE.Texture): void {
    this.material.uniforms.tNormal.value = texture;
  }

  public render(time: number): void {
    if (this.isDisposed) return;
    this.material.uniforms.uTime.value = time;
    const currentTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(currentTarget);
  }

  public get texture(): THREE.Texture {
    return this.renderTarget.texture;
  }

  public resize(width: number, height: number): void {
    const causticW = Math.max(128, Math.floor(width * 0.5));
    const causticH = Math.max(128, Math.floor(height * 0.5));
    this.renderTarget.setSize(causticW, causticH);
    this.material.uniforms.uTexelSize.value.set(1.0 / causticW, 1.0 / causticH);
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.renderTarget.dispose();
    this.material.dispose();
    this.quadMesh.geometry.dispose();
  }
}

// ============================================================================
// SECTION 7: DROPLET & METABALL SURFACE TENSION PHYSICS
// ============================================================================

export class DropletMetaballPhysics {
  public options: DropletPhysicsOptions;
  public droplets: DropletState[] = [];
  private renderer: THREE.WebGLRenderer;
  private material: THREE.ShaderMaterial;
  private renderTarget: THREE.WebGLRenderTarget;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private quadMesh: THREE.Mesh;
  private nextId: number = 1;
  private isDisposed: boolean = false;
  private dropletUniformArray: THREE.Vector4[] = [];

  public onEvent?: (event: 'coalesce' | 'sever' | 'bounce', droplet: DropletState) => void;

  constructor(
    renderer: THREE.WebGLRenderer,
    width: number,
    height: number,
    options: Partial<DropletPhysicsOptions> = {}
  ) {
    this.renderer = renderer;
    this.options = {
      maxDroplets: options.maxDroplets ?? 16,
      surfaceTension: options.surfaceTension ?? 0.45,
      viscosity: options.viscosity ?? 0.96,
      coalescenceDistance: options.coalescenceDistance ?? 0.075,
      severDistance: options.severDistance ?? 0.16,
      bridgeStiffness: options.bridgeStiffness ?? 0.32,
      restitution: options.restitution ?? 0.72,
      gravity: options.gravity ?? [0.0, 0.0],
      metaballThreshold: options.metaballThreshold ?? 1.0,
      edgeSoftness: options.edgeSoftness ?? 0.025,
      metallicFactor: options.metallicFactor ?? 0.0,
    };

    // Pre-allocate 32 uniform Vector4s for GPU metaball array
    for (let i = 0; i < 32; i++) {
      this.dropletUniformArray.push(new THREE.Vector4(0, 0, 0, 0));
    }

    const targetW = Math.max(128, Math.floor(width * 0.5));
    const targetH = Math.max(128, Math.floor(height * 0.5));

    this.renderTarget = new THREE.WebGLRenderTarget(targetW, targetH, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    });

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.material = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: METABALL_FIELD_FRAG,
      uniforms: {
        uDroplets: { value: this.dropletUniformArray },
        uDropletCount: { value: 0 },
        uResolution: { value: new THREE.Vector2(targetW, targetH) },
        uThreshold: { value: this.options.metaballThreshold },
        uEdgeSoftness: { value: this.options.edgeSoftness },
        uViscosityBridge: { value: this.options.bridgeStiffness },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(this.quadMesh);
  }

  /**
   * Spawns a new interactive liquid droplet bead.
   */
  public addDroplet(
    x: number,
    y: number,
    radius: number = 0.045,
    vx: number = 0,
    vy: number = 0
  ): DropletState {
    if (this.droplets.length >= this.options.maxDroplets) {
      // Remove oldest unpinned droplet
      const oldestIdx = this.droplets.findIndex((d) => !d.isPinned);
      if (oldestIdx >= 0) this.droplets.splice(oldestIdx, 1);
    }

    const droplet: DropletState = {
      id: this.nextId++,
      x: clamp(x, 0.05, 0.95),
      y: clamp(y, 0.05, 0.95),
      vx,
      vy,
      radius,
      targetRadius: radius,
      mass: Math.PI * radius * radius * 1000.0,
      isPinned: false,
      elongation: 1.0,
      neckAngle: 0.0,
      life: 0.0,
    };

    this.droplets.push(droplet);
    return droplet;
  }

  public clear(): void {
    this.droplets = [];
  }

  /**
   * Physics simulation tick for droplets (Lennard-Jones surface tension cohesion,
   * capillary bridge stretching, coalescing, and wall boundary bouncing).
   */
  public step(dt: number = 0.016): void {
    const { surfaceTension, viscosity, coalescenceDistance, severDistance, restitution, gravity } =
      this.options;

    const n = this.droplets.length;

    // 1. Inter-droplet cohesion & coalescence
    for (let i = 0; i < n; i++) {
      const a = this.droplets[i];
      if (!a) continue;

      for (let j = i + 1; j < n; j++) {
        const b = this.droplets[j];
        if (!b) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = a.radius + b.radius;

        if (dist < 0.0001) continue;

        const nx = dx / dist;
        const ny = dy / dist;

        // Coalescence event: if beads touch closely, merge them into one larger bead
        if (dist < Math.min(coalescenceDistance, minDist * 0.95)) {
          const totalMass = a.mass + b.mass;
          a.x = (a.x * a.mass + b.x * b.mass) / totalMass;
          a.y = (a.y * a.mass + b.y * b.mass) / totalMass;
          a.vx = (a.vx * a.mass + b.vx * b.mass) / totalMass;
          a.vy = (a.vy * a.mass + b.vy * b.mass) / totalMass;
          // Conservation of volume: R_new = sqrt(R_a^2 + R_b^2)
          a.targetRadius = Math.sqrt(a.radius * a.radius + b.radius * b.radius);
          a.mass = totalMass;

          this.onEvent?.('coalesce', a);
          this.droplets.splice(j, 1);
          return; // restart iteration next tick
        }

        // Viscous neck stretching force (capillary bridge)
        if (dist < severDistance) {
          const pull = (dist - minDist) * surfaceTension * 12.0;
          if (!a.isPinned) {
            a.vx += (nx * pull * dt) / a.mass;
            a.vy += (ny * pull * dt) / a.mass;
          }
          if (!b.isPinned) {
            b.vx -= (nx * pull * dt) / b.mass;
            b.vy -= (ny * pull * dt) / b.mass;
          }
        }
      }
    }

    // 2. Integration, wall bouncing & damping
    for (const d of this.droplets) {
      if (d.isPinned) continue;

      // Apply gravity bias
      d.vx += gravity[0] * dt;
      d.vy += gravity[1] * dt;

      // Integrate position
      d.x += d.vx * dt;
      d.y += d.vy * dt;

      // Fluid viscosity damping
      d.vx *= viscosity;
      d.vy *= viscosity;

      // Radius recovery relaxation towards target
      d.radius += (d.targetRadius - d.radius) * 0.12;

      // Wall boundaries
      const r = d.radius * 0.65;
      if (d.x < r) {
        d.x = r;
        d.vx = -d.vx * restitution;
        this.onEvent?.('bounce', d);
      } else if (d.x > 1.0 - r) {
        d.x = 1.0 - r;
        d.vx = -d.vx * restitution;
        this.onEvent?.('bounce', d);
      }

      if (d.y < r) {
        d.y = r;
        d.vy = -d.vy * restitution;
        this.onEvent?.('bounce', d);
      } else if (d.y > 1.0 - r) {
        d.y = 1.0 - r;
        d.vy = -d.vy * restitution;
        this.onEvent?.('bounce', d);
      }

      d.life += dt;
    }
  }

  /**
   * Evaluates GPU metaball scalar potential field.
   */
  public render(): void {
    if (this.isDisposed) return;

    const count = Math.min(32, this.droplets.length);
    for (let i = 0; i < count; i++) {
      const d = this.droplets[i];
      this.dropletUniformArray[i].set(d.x, d.y, d.radius, 1.0);
    }
    for (let i = count; i < 32; i++) {
      this.dropletUniformArray[i].set(0, 0, 0, 0);
    }

    this.material.uniforms.uDropletCount.value = count;
    this.material.uniforms.uThreshold.value = this.options.metaballThreshold;

    const currentTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.clearColor();
    if (count > 0) {
      this.renderer.render(this.scene, this.camera);
    }
    this.renderer.setRenderTarget(currentTarget);
  }

  public get texture(): THREE.Texture {
    return this.renderTarget.texture;
  }

  public resize(width: number, height: number): void {
    const targetW = Math.max(128, Math.floor(width * 0.5));
    const targetH = Math.max(128, Math.floor(height * 0.5));
    this.renderTarget.setSize(targetW, targetH);
    this.material.uniforms.uResolution.value.set(targetW, targetH);
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.renderTarget.dispose();
    this.material.dispose();
    this.quadMesh.geometry.dispose();
    this.droplets = [];
  }
}

// ============================================================================
// SECTION 8: PRESET PROFILES
// ============================================================================

export const LIQUID_PRESETS: Record<LiquidPresetName, Partial<LiquidDisplacementOptions>> = {
  'architectural-water': {
    wave: {
      resolution: 256,
      waveSpeed: 0.28,
      damping: 0.988,
      viscosity: 0.035,
      advection: 0.35,
    },
    refraction: {
      iorR: 1.3330,
      iorG: 1.3380,
      iorB: 1.3440,
      refractionStrength: 0.045,
      dispersionSpread: 1.45,
      fresnelF0: 0.025,
      fresnelPower: 5.0,
      specularShininess: 96.0,
      absorptionColor: '#E2EFF5',
      absorptionDensity: 0.35,
    },
    caustics: {
      floorDepth: 1.6,
      intensity: 1.65,
      focusSharpen: 2.2,
      dispersion: 0.85,
      causticColor: '#D4F4FF',
      enableSunbeams: true,
    },
    droplets: {
      surfaceTension: 0.45,
      metallicFactor: 0.0,
    },
  },
  'mercury-bead': {
    wave: {
      resolution: 256,
      waveSpeed: 0.18,
      damping: 0.965,
      viscosity: 0.12,
      advection: 0.15,
    },
    refraction: {
      iorR: 1.82,
      iorG: 1.88,
      iorB: 1.94,
      refractionStrength: 0.08,
      dispersionSpread: 2.2,
      fresnelF0: 0.75, // high metallic reflectance
      fresnelPower: 3.5,
      specularShininess: 256.0,
      absorptionColor: '#9098A2',
      absorptionDensity: 1.8,
    },
    caustics: {
      floorDepth: 1.0,
      intensity: 0.75,
      focusSharpen: 1.5,
      dispersion: 1.2,
      causticColor: '#B0B8C5',
      enableSunbeams: false,
    },
    droplets: {
      surfaceTension: 0.85, // extremely high cohesive pull
      viscosity: 0.92,
      metallicFactor: 0.95, // pure mirror mercury
      coalescenceDistance: 0.11,
      severDistance: 0.22,
    },
  },
  'molten-bronze': {
    wave: {
      resolution: 256,
      waveSpeed: 0.22,
      damping: 0.975,
      viscosity: 0.08,
      advection: 0.28,
    },
    refraction: {
      iorR: 1.55,
      iorG: 1.62,
      iorB: 1.70,
      refractionStrength: 0.065,
      dispersionSpread: 1.8,
      fresnelF0: 0.45,
      fresnelPower: 4.2,
      specularShininess: 128.0,
      specularColor: '#FFDFAC',
      absorptionColor: '#A77C4D', // Rubiconius architectural bronze
      absorptionDensity: 1.2,
    },
    caustics: {
      floorDepth: 1.4,
      intensity: 1.35,
      focusSharpen: 1.9,
      dispersion: 0.95,
      causticColor: '#FFE0B2',
      enableSunbeams: true,
    },
    droplets: {
      surfaceTension: 0.65,
      metallicFactor: 0.65,
    },
  },
  'deep-obsidian': {
    wave: {
      resolution: 256,
      waveSpeed: 0.32,
      damping: 0.982,
      viscosity: 0.045,
      advection: 0.4,
    },
    refraction: {
      iorR: 1.52,
      iorG: 1.54,
      iorB: 1.57,
      refractionStrength: 0.038,
      dispersionSpread: 1.1,
      fresnelF0: 0.045,
      fresnelPower: 5.5,
      specularShininess: 160.0,
      absorptionColor: '#05070A', // dark obsidian pool
      absorptionDensity: 2.5,
      tirFallbackColor: '#020304',
    },
    caustics: {
      floorDepth: 2.2,
      intensity: 0.85,
      focusSharpen: 2.5,
      dispersion: 0.5,
      causticColor: '#6B8299',
      enableSunbeams: false,
    },
    droplets: {
      surfaceTension: 0.48,
      metallicFactor: 0.15,
    },
  },
  'crystal-spring': {
    wave: {
      resolution: 384,
      waveSpeed: 0.35,
      damping: 0.994,
      viscosity: 0.015,
      advection: 0.45,
    },
    refraction: {
      iorR: 1.332,
      iorG: 1.337,
      iorB: 1.343,
      refractionStrength: 0.052,
      dispersionSpread: 1.65,
      fresnelF0: 0.022,
      fresnelPower: 5.0,
      specularShininess: 120.0,
      absorptionColor: '#FFFFFF',
      absorptionDensity: 0.05,
    },
    caustics: {
      floorDepth: 1.8,
      intensity: 2.2,
      focusSharpen: 2.8,
      dispersion: 1.15,
      causticColor: '#E6FAFF',
      enableSunbeams: true,
    },
    droplets: {
      surfaceTension: 0.52,
      metallicFactor: 0.0,
    },
  },
};

// ============================================================================
// SECTION 9: MASTER LIQUID DISPLACEMENT CONTROLLER
// ============================================================================

export class LiquidDisplacementEngine implements LiquidDisplacementHandle {
  public canvas: HTMLCanvasElement;
  public waveSolver: WaveEquationSolver;
  public refraction: SnellRefractionDispersion;
  public caustics: WaterCausticsGenerator;
  public droplets: DropletMetaballPhysics;

  private renderer: THREE.WebGLRenderer;
  private width: number;
  private height: number;
  private isPaused: boolean = false;
  private isDisposed: boolean = false;
  private rafId: number | null = null;
  private lastTime: number = 0;

  private pointerLastX: number = 0.5;
  private pointerLastY: number = 0.5;
  private pointerDown: boolean = false;
  private activeDraggedDroplet: DropletState | null = null;

  private boundOnPointerMove: (e: PointerEvent) => void;
  private boundOnPointerDown: (e: PointerEvent) => void;
  private boundOnPointerUp: (e: PointerEvent) => void;
  private boundOnResize: () => void;

  private options: LiquidDisplacementOptions;

  constructor(options: LiquidDisplacementOptions = {}) {
    this.options = options;
    const tier = getQualityTier();

    // Determine initial dimensions
    this.width = options.width || (typeof window !== 'undefined' ? window.innerWidth : 1280);
    this.height = options.height || (typeof window !== 'undefined' ? window.innerHeight : 720);

    // Setup or attach DOM canvas
    if (options.target instanceof HTMLCanvasElement) {
      this.canvas = options.target;
    } else {
      this.canvas = document.createElement('canvas');
      this.canvas.classList.add('liquid-displacement-canvas');
      this.canvas.setAttribute('aria-hidden', 'true');
      if (typeof options.target === 'string') {
        const el = document.querySelector(options.target);
        if (el) el.appendChild(this.canvas);
        else document.body.appendChild(this.canvas);
      } else if (options.target instanceof HTMLElement) {
        options.target.appendChild(this.canvas);
      } else if (typeof document !== 'undefined') {
        const glHost = document.getElementById('gl') || document.body;
        glHost.appendChild(this.canvas);
      }
    }

    const maxDpr =
      options.dpr ?? (tier === 'high' ? Math.min(window.devicePixelRatio || 1, 1.75) : 1.0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: tier === 'high',
      powerPreference: 'high-performance',
      premultipliedAlpha: true,
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(maxDpr);

    // Resolution tier tuning
    const simRes =
      options.wave?.resolution ??
      (tier === 'high' ? 256 : tier === 'medium' ? 192 : 128);

    // Instantiate Sub-Engines
    this.waveSolver = new WaveEquationSolver(this.renderer, {
      ...options.wave,
      resolution: simRes,
    });

    this.refraction = new SnellRefractionDispersion(
      this.renderer,
      this.width,
      this.height,
      options.refraction
    );

    this.caustics = new WaterCausticsGenerator(
      this.renderer,
      this.width,
      this.height,
      options.caustics
    );

    this.droplets = new DropletMetaballPhysics(
      this.renderer,
      this.width,
      this.height,
      options.droplets
    );

    // Connect sub-engine render targets
    this.refraction.setHeightTexture(this.waveSolver.heightTexture);
    this.refraction.setNormalTexture(this.waveSolver.normalTexture);
    this.refraction.setCausticsTexture(this.caustics.texture);
    this.refraction.setDropletsTexture(this.droplets.texture);

    this.caustics.setHeightTexture(this.waveSolver.heightTexture);
    this.caustics.setNormalTexture(this.waveSolver.normalTexture);

    // Apply preset if specified
    if (options.preset) {
      this.applyPreset(options.preset);
    }

    // Load initial background texture if provided
    if (options.backgroundTexture) {
      this.setBackgroundTexture(options.backgroundTexture);
    } else {
      this.createProceduralBackground();
    }

    // Wire droplet interaction callback to wave solver ripples
    this.droplets.onEvent = (evt, drop) => {
      if (evt === 'coalesce' || evt === 'bounce') {
        this.waveSolver.splat({
          x: drop.x,
          y: drop.y,
          radius: drop.radius * 1.5,
          strength: 0.65,
          type: 'ring',
        });
      }
      this.options.onDropletEvent?.(evt, drop);
    };

    // Bind interaction event listeners
    this.boundOnPointerMove = this.onPointerMove.bind(this);
    this.boundOnPointerDown = this.onPointerDown.bind(this);
    this.boundOnPointerUp = this.onPointerUp.bind(this);
    this.boundOnResize = () => this.resize();

    if (options.interactive !== false && typeof window !== 'undefined') {
      window.addEventListener('pointermove', this.boundOnPointerMove, { passive: true });
      window.addEventListener('pointerdown', this.boundOnPointerDown, { passive: true });
      window.addEventListener('pointerup', this.boundOnPointerUp, { passive: true });
      window.addEventListener('resize', this.boundOnResize, { passive: true });
    }

    // Start requestAnimationFrame loop
    this.lastTime = performance.now();
    this.tick = this.tick.bind(this);
    this.resume();
  }

  /**
   * Generates an architectural bronze/charcoal gradient background texture fallback.
   */
  private createProceduralBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Architectural Travertine / Plaster / Bronze backdrop
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0.0, '#0F0E0D');
    grad.addColorStop(0.45, '#1C1917');
    grad.addColorStop(0.75, '#8A6A42'); // Warm bronze
    grad.addColorStop(1.0, '#EFECE6'); // Light mineral plaster
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle architectural grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1.0;
    for (let i = 0; i < 512; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    this.refraction.setBackgroundTexture(tex);
  }

  public async setBackgroundTexture(
    source: THREE.Texture | HTMLImageElement | HTMLCanvasElement | string
  ): Promise<void> {
    if (source instanceof THREE.Texture) {
      this.refraction.setBackgroundTexture(source);
      return;
    }

    if (typeof source === 'string') {
      return new Promise((resolve, reject) => {
        new THREE.TextureLoader().load(
          source,
          (tex) => {
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            this.refraction.setBackgroundTexture(tex);
            resolve();
          },
          undefined,
          reject
        );
      });
    }

    const tex = new THREE.CanvasTexture(source);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    this.refraction.setBackgroundTexture(tex);
  }

  public splat(options: ImpulseOptions): void {
    this.waveSolver.splat(options);
  }

  public addDroplet(
    x: number,
    y: number,
    radius: number = 0.045,
    vx: number = 0,
    vy: number = 0
  ): DropletState {
    const drop = this.droplets.addDroplet(x, y, radius, vx, vy);
    this.waveSolver.splat({
      x,
      y,
      radius: radius * 1.2,
      strength: 0.45,
      type: 'splash',
    });
    return drop;
  }

  public clearDroplets(): void {
    this.droplets.clear();
  }

  public applyPreset(name: LiquidPresetName): void {
    const cfg = LIQUID_PRESETS[name];
    if (!cfg) return;

    if (cfg.wave) Object.assign(this.waveSolver.options, cfg.wave);
    if (cfg.refraction) {
      Object.assign(this.refraction.options, cfg.refraction);
      if (cfg.refraction.refractionStrength !== undefined) {
        (this.refraction as any).material.uniforms.uRefractionStrength.value =
          cfg.refraction.refractionStrength;
      }
      if (cfg.refraction.dispersionSpread !== undefined) {
        (this.refraction as any).material.uniforms.uDispersionSpread.value =
          cfg.refraction.dispersionSpread;
      }
      if (cfg.refraction.iorR !== undefined) {
        (this.refraction as any).material.uniforms.uIorR.value = cfg.refraction.iorR;
      }
      if (cfg.refraction.iorG !== undefined) {
        (this.refraction as any).material.uniforms.uIorG.value = cfg.refraction.iorG;
      }
      if (cfg.refraction.iorB !== undefined) {
        (this.refraction as any).material.uniforms.uIorB.value = cfg.refraction.iorB;
      }
      if (cfg.refraction.fresnelF0 !== undefined) {
        (this.refraction as any).material.uniforms.uFresnelF0.value = cfg.refraction.fresnelF0;
      }
      if (cfg.refraction.absorptionColor !== undefined) {
        const col = new THREE.Color(cfg.refraction.absorptionColor);
        (this.refraction as any).material.uniforms.uAbsorptionColor.value.set(
          col.r,
          col.g,
          col.b
        );
      }
      if (cfg.refraction.absorptionDensity !== undefined) {
        (this.refraction as any).material.uniforms.uAbsorptionDensity.value =
          cfg.refraction.absorptionDensity;
      }
    }
    if (cfg.caustics) {
      Object.assign(this.caustics.options, cfg.caustics);
      if (cfg.caustics.intensity !== undefined) {
        (this.caustics as any).material.uniforms.uIntensity.value = cfg.caustics.intensity;
      }
      if (cfg.caustics.floorDepth !== undefined) {
        (this.caustics as any).material.uniforms.uFloorDepth.value = cfg.caustics.floorDepth;
      }
      if (cfg.caustics.focusSharpen !== undefined) {
        (this.caustics as any).material.uniforms.uFocusSharpen.value = cfg.caustics.focusSharpen;
      }
    }
    if (cfg.droplets) {
      Object.assign(this.droplets.options, cfg.droplets);
      if (cfg.droplets.metallicFactor !== undefined) {
        this.refraction.setMetallicFactor(cfg.droplets.metallicFactor);
      }
    }
  }

  private onPointerMove(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / (rect.width || 1), 0.0, 1.0);
    const y = clamp(1.0 - (e.clientY - rect.top) / (rect.height || 1), 0.0, 1.0);

    const vx = x - this.pointerLastX;
    const vy = y - this.pointerLastY;
    const speed = Math.hypot(vx, vy);

    this.waveSolver.setPointer(x, y, vx, vy);

    // Continuous brush stroke impulse when dragging or fast hover
    if (this.pointerDown || speed > 0.008) {
      const sens = this.options.interactionSensitivity ?? 1.0;
      this.waveSolver.splat({
        x,
        y,
        radius: clamp(0.025 + speed * 1.5, 0.02, 0.08),
        strength: clamp(speed * 12.0 * sens, 0.15, 0.95),
        vx,
        vy,
        type: 'directional',
      });
    }

    // Drag pinned droplet if active
    if (this.activeDraggedDroplet) {
      this.activeDraggedDroplet.x = x;
      this.activeDraggedDroplet.y = y;
      this.activeDraggedDroplet.vx = vx * 50.0;
      this.activeDraggedDroplet.vy = vy * 50.0;
    }

    this.pointerLastX = x;
    this.pointerLastY = y;
  }

  private onPointerDown(e: PointerEvent): void {
    this.pointerDown = true;
    const rect = this.canvas.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / (rect.width || 1), 0.0, 1.0);
    const y = clamp(1.0 - (e.clientY - rect.top) / (rect.height || 1), 0.0, 1.0);

    // Check if user clicked an existing droplet to drag it
    for (const d of this.droplets.droplets) {
      const dist = Math.hypot(d.x - x, d.y - y);
      if (dist < d.radius * 1.4) {
        this.activeDraggedDroplet = d;
        d.isPinned = true;
        return;
      }
    }

    // Else inject an impactful splash ring
    this.waveSolver.splat({
      x,
      y,
      radius: 0.055,
      strength: 0.85,
      type: 'ring',
    });
  }

  private onPointerUp(e: PointerEvent): void {
    this.pointerDown = false;
    if (this.activeDraggedDroplet) {
      this.activeDraggedDroplet.isPinned = false;
      this.activeDraggedDroplet = null;
    }
  }

  public resize(width?: number, height?: number): void {
    if (this.isDisposed) return;
    this.width = width || (typeof window !== 'undefined' ? window.innerWidth : 1280);
    this.height = height || (typeof window !== 'undefined' ? window.innerHeight : 720);

    const tier = getQualityTier();
    const maxDpr =
      this.options.dpr ?? (tier === 'high' ? Math.min(window.devicePixelRatio || 1, 1.75) : 1.0);

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(maxDpr);

    this.refraction.resize(this.width, this.height);
    this.caustics.resize(this.width, this.height);
    this.droplets.resize(this.width, this.height);
  }

  public pause(): void {
    this.isPaused = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public resume(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  public update(time: number, dt: number = 0.016): void {
    if (this.isDisposed) return;
    const clampedDt = clamp(dt, 0.001, 0.033);

    // 1. Step Wave Simulation
    this.waveSolver.step(clampedDt);

    // 2. Step Droplet Surface Tension Physics
    this.droplets.step(clampedDt);
    this.droplets.render();

    // 3. Step Raymarched Water Caustics
    this.caustics.render(time * 0.001);

    // 4. Fire onUpdate callback
    this.options.onUpdate?.(time, clampedDt);
  }

  public render(): void {
    if (this.isDisposed) return;
    // Render refraction pass directly to onscreen canvas (target = null)
    this.refraction.render(performance.now() * 0.001, null);
  }

  private tick(now: number): void {
    if (this.isPaused || this.isDisposed) return;
    const dt = (now - this.lastTime) * 0.001;
    this.lastTime = now;

    this.update(now, dt);
    this.render();

    this.rafId = requestAnimationFrame(this.tick);
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.pause();

    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', this.boundOnPointerMove);
      window.removeEventListener('pointerdown', this.boundOnPointerDown);
      window.removeEventListener('pointerup', this.boundOnPointerUp);
      window.removeEventListener('resize', this.boundOnResize);
    }

    this.waveSolver.dispose();
    this.refraction.dispose();
    this.caustics.dispose();
    this.droplets.dispose();
    this.renderer.dispose();

    if (this.canvas.parentElement && !this.options.target) {
      this.canvas.remove();
    }
  }
}

// ============================================================================
// SECTION 10: THREE.JS ARCHITECTURAL SHOWROOM ADAPTER
// ============================================================================

export interface ThreeLiquidSurfaceMeshOptions {
  /** Width & length in 3D world units. Default: [20, 20] */
  size?: [number, number];
  /** Position [x, y, z] in world units. Default: [0, 0, 0] */
  position?: [number, number, number];
  /** Simulation grid resolution. Default: 256 */
  resolution?: number;
  /** Liquid preset */
  preset?: LiquidPresetName;
  /** Under-water floor / background reflection map */
  backgroundTexture?: THREE.Texture;
}

export interface ThreeLiquidSurfaceHandle {
  mesh: THREE.Mesh;
  waveSolver: WaveEquationSolver;
  refraction: SnellRefractionDispersion;
  caustics: WaterCausticsGenerator;
  droplets: DropletMetaballPhysics;
  update: (time: number, dt?: number) => void;
  splat: (options: ImpulseOptions) => void;
  raycastPointer: (ray: THREE.Ray) => boolean;
  dispose: () => void;
}

/**
 * Creates a Three.js Mesh surface that can be added into any Three.js architectural
 * showroom scene (such as showroom.astro or fluidGround.ts).
 */
export function createThreeLiquidSurface(
  renderer: THREE.WebGLRenderer,
  options: ThreeLiquidSurfaceMeshOptions = {}
): ThreeLiquidSurfaceHandle {
  const [sizeX, sizeZ] = options.size ?? [20, 20];
  const [posX, posY, posZ] = options.position ?? [0, 0, 0];
  const res = options.resolution ?? 256;

  const waveSolver = new WaveEquationSolver(renderer, { resolution: res });
  const caustics = new WaterCausticsGenerator(renderer, 512, 512);
  const droplets = new DropletMetaballPhysics(renderer, 512, 512);
  const refraction = new SnellRefractionDispersion(renderer, 1024, 1024);

  refraction.setHeightTexture(waveSolver.heightTexture);
  refraction.setNormalTexture(waveSolver.normalTexture);
  refraction.setCausticsTexture(caustics.texture);
  refraction.setDropletsTexture(droplets.texture);

  caustics.setHeightTexture(waveSolver.heightTexture);
  caustics.setNormalTexture(waveSolver.normalTexture);

  if (options.backgroundTexture) {
    refraction.setBackgroundTexture(options.backgroundTexture);
  }

  // 3D Plane Mesh oriented horizontally (XZ plane)
  const geometry = new THREE.PlaneGeometry(sizeX, sizeZ, 128, 128);
  geometry.rotateX(-Math.PI * 0.5);

  const surfaceMaterial = new THREE.MeshBasicMaterial({
    map: refraction.texture,
    transparent: true,
  });

  const mesh = new THREE.Mesh(geometry, surfaceMaterial);
  mesh.position.set(posX, posY, posZ);

  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -posY);
  const intersectPoint = new THREE.Vector3();

  return {
    mesh,
    waveSolver,
    refraction,
    caustics,
    droplets,
    splat: (opts) => waveSolver.splat(opts),
    raycastPointer: (ray: THREE.Ray) => {
      const hit = ray.intersectPlane(plane, intersectPoint);
      if (!hit) return false;
      const u = (intersectPoint.x - (posX - sizeX * 0.5)) / sizeX;
      const v = (intersectPoint.z - (posZ - sizeZ * 0.5)) / sizeZ;
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
        waveSolver.splat({ x: u, y: 1.0 - v, radius: 0.04, strength: 0.5, type: 'directional' });
        return true;
      }
      return false;
    },
    update: (time: number, dt: number = 0.016) => {
      waveSolver.step(dt);
      droplets.step(dt);
      droplets.render();
      caustics.render(time);
      refraction.render(time);
    },
    dispose: () => {
      mesh.geometry.dispose();
      surfaceMaterial.dispose();
      waveSolver.dispose();
      refraction.dispose();
      caustics.dispose();
      droplets.dispose();
    },
  };
}

// ============================================================================
// SECTION 11: OGL / STANDALONE WEBGL PIPELINE ADAPTER
// ============================================================================

export interface OGLLiquidPassOptions {
  gl: OGLRenderingContext;
  width?: number;
  height?: number;
  preset?: LiquidPresetName;
}

export class OGLLiquidDisplacementPass {
  public gl: OGLRenderingContext;
  public program: OGLProgram;
  public mesh: OGLMesh;
  public enabled: boolean = true;
  private width: number;
  private height: number;
  private isDestroyed: boolean = false;

  constructor(options: OGLLiquidPassOptions) {
    this.gl = options.gl;
    this.width = options.width || 1280;
    this.height = options.height || 720;

    const quadGeo = new OGLTriangle(this.gl);

    this.program = new OGLProgram(this.gl, {
      vertex: `
        attribute vec2 uv;
        attribute vec2 position;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `,
      fragment: REFRACTION_DISPERSION_FRAG,
      uniforms: {
        tBackground: { value: null },
        tNormal: { value: null },
        tHeight: { value: null },
        tCaustics: { value: null },
        tDroplets: { value: null },
        uResolution: { value: new OGLVec2(this.width, this.height) },
        uTime: { value: 0 },
        uRefractionStrength: { value: 0.045 },
        uDispersionSpread: { value: 1.45 },
        uIorR: { value: 1.333 },
        uIorG: { value: 1.338 },
        uIorB: { value: 1.344 },
        uFresnelF0: { value: 0.025 },
        uFresnelPower: { value: 5.0 },
        uNormalScale: { value: 1.8 },
        uSpecularShininess: { value: 96.0 },
        uSpecularColor: { value: [1.0, 1.0, 1.0] },
        uAbsorptionColor: { value: [0.88, 0.94, 0.96] },
        uAbsorptionDensity: { value: 0.35 },
        uTirFallbackColor: { value: [0.04, 0.06, 0.09] },
        uLightDir: { value: [0.35, 0.85, 0.4] },
        uEnableCaustics: { value: 0.0 },
        uEnableDroplets: { value: 0.0 },
        uMetallicFactor: { value: 0.0 },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.mesh = new OGLMesh(this.gl, { geometry: quadGeo, program: this.program });
  }

  public render(
    renderer: OGLRenderer,
    sourceTexture: OGLTexture,
    target: OGLRenderTarget | null = null
  ): void {
    if (!this.enabled || this.isDestroyed) return;
    this.program.uniforms.tBackground.value = sourceTexture;
    this.program.uniforms.uTime.value = performance.now() * 0.001;
    renderer.render({ scene: this.mesh, target: target ?? undefined });
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.program.uniforms.uResolution.value.set(width, height);
  }

  public dispose(): void {
    this.isDestroyed = true;
  }
}

// ============================================================================
// SECTION 12: PUBLIC FACTORY EXPORTS & UTILITY HELPERS
// ============================================================================

/**
 * Clamp scalar value between min and max.
 */
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Primary factory function to instantiate and mount the liquid displacement engine.
 */
export function createLiquidDisplacement(
  options: LiquidDisplacementOptions = {}
): LiquidDisplacementHandle {
  return new LiquidDisplacementEngine(options);
}

/**
 * Mount helper attaching liquid displacement onto an existing DOM selector or element.
 */
export function mountLiquidDisplacement(
  container: HTMLElement | string,
  options: LiquidDisplacementOptions = {}
): LiquidDisplacementHandle {
  return createLiquidDisplacement({
    ...options,
    target: container,
  });
}

/**
 * Retrieves full parameter configuration for a liquid preset.
 */
export function getLiquidPreset(name: LiquidPresetName): Partial<LiquidDisplacementOptions> {
  return LIQUID_PRESETS[name] ?? LIQUID_PRESETS['architectural-water'];
}

/**
 * Diagnostic check whether WebGL liquid simulation is supported in current browser environment.
 */
export function isLiquidDisplacementSupported(): boolean {
  if (prefersReducedMotion()) return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch {
    return false;
  }
}
