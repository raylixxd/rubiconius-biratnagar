/**
 * ARCHITECTURAL SHOWROOM VOLUMETRICS ENGINE
 *
 * Reverse-engineered, production-grade volumetric systems extracted from:
 * 1. 16_lusion: Instanced Dust Motes (384 particles on InstancedBufferGeometry
 *    with 4D simplex noise analytical derivatives, depth-extinction exponential decay,
 *    and random attributes `a_instancePos`, `a_instanceRands`, `a_instanceId`).
 * 2. 32_immersive_garden: Volumetric Window Light Beams (Multi-angle quad light shafts
 *    with 4-term harmonic oscillation `(sin(o) + sin(2.2*o + 5.52) + sin(2.9*o + 0.93) + sin(4.6*o + 8.94)) / 4.0;`
 *    and Day/Golden/Night time-of-day lerping with GLSL FadeAnimation structs).
 */

import * as THREE from 'three';

// ============================================================================
// 1. TIME OF DAY SYSTEM & INTERFACES (from 32_immersive_garden)
// ============================================================================

export type TimeOfDayPreset = 'day' | 'golden' | 'night';

export interface TimeOfDayConfig {
  intensity: number;
  lightDirection: THREE.Vector3;
  colorTint: THREE.Color;
  beamOpacity: number;
  dustGlow: number;
  dustColor: THREE.Color;
  oscillationSpeed: number;
  smokeSpeed: number;
}

export const TIME_OF_DAY_PRESETS: Record<TimeOfDayPreset, TimeOfDayConfig> = {
  day: {
    intensity: 1.0,
    lightDirection: new THREE.Vector3(-0.38, -0.88, 0.28).normalize(),
    colorTint: new THREE.Color(0xf2f6ff), // Crisp clean architectural daylight
    beamOpacity: 0.58,
    dustGlow: 0.65,
    dustColor: new THREE.Color(0xf8f3ea), // Warm lime/cream dust
    oscillationSpeed: 0.85,
    smokeSpeed: 0.16,
  },
  golden: {
    intensity: 1.45,
    lightDirection: new THREE.Vector3(-0.76, -0.42, 0.49).normalize(),
    colorTint: new THREE.Color(0xffaa4d), // Warm terracotta bronze / amber rake
    beamOpacity: 0.85,
    dustGlow: 1.15,
    dustColor: new THREE.Color(0xffdfb3), // Golden illuminated particles
    oscillationSpeed: 1.1,
    smokeSpeed: 0.22,
  },
  night: {
    intensity: 0.34,
    lightDirection: new THREE.Vector3(-0.22, -0.92, -0.32).normalize(),
    colorTint: new THREE.Color(0x6e88c7), // Atmospheric twilight indigo/silver
    beamOpacity: 0.32,
    dustGlow: 0.35,
    dustColor: new THREE.Color(0x9db2de), // Cool lunar dust
    oscillationSpeed: 0.55,
    smokeSpeed: 0.09,
  },
};

/**
 * 4-term harmonic oscillation utility from 32_immersive_garden
 * Exact formula: (sin(o) + sin(2.2*o + 5.52) + sin(2.9*o + 0.93) + sin(4.6*o + 8.94)) / 4.0;
 */
export function pseudoNoiseHarmonic(o: number): number {
  return (
    Math.sin(o) +
    Math.sin(2.2 * o + 5.52) +
    Math.sin(2.9 * o + 0.93) +
    Math.sin(4.6 * o + 8.94)
  ) / 4.0;
}

// ============================================================================
// 2. PROCEDURAL TEXTURE GENERATORS (Autonomous Fallback Assets)
// ============================================================================

/**
 * Creates a procedural 2D Perlin-like noise texture for volumetric smoke turbulence
 * so the system runs with zero external texture dependencies.
 */
function createProceduralNoiseTexture(size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const p = new Uint8Array(512);
  for (let i = 0; i < 256; i++) p[i] = p[256 + i] = Math.floor(Math.random() * 256);

  function fade(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  function lerp(t: number, a: number, b: number) {
    return a + t * (b - a);
  }
  function grad(hash: number, x: number, y: number) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
  function perlin(x: number, y: number) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const a = p[X] + Y;
    const aa = p[a];
    const ab = p[a + 1];
    const b = p[X + 1] + Y;
    const ba = p[b];
    const bb = p[b + 1];
    return lerp(
      v,
      lerp(u, grad(p[aa], xf, yf), grad(p[ba], xf - 1, yf)),
      lerp(u, grad(p[ab], xf, yf - 1), grad(p[bb], xf - 1, yf - 1))
    );
  }

  let idx = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;
      let n = 0;
      let amp = 0.5;
      let freq = 4.0;
      for (let o = 0; o < 3; o++) {
        n += amp * (perlin(nx * freq, ny * freq) * 0.5 + 0.5);
        amp *= 0.5;
        freq *= 2.0;
      }
      const val = Math.min(255, Math.max(0, Math.floor(n * 255)));
      data[idx] = val; // R: noise
      data[idx + 1] = Math.floor((Math.sin(nx * 12.0) * 0.5 + 0.5) * 255); // G: secondary wave
      data[idx + 2] = val; // B
      data[idx + 3] = 255; // A
      idx += 4;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates a procedural fog map texture matching 16_lusion's fog texture format:
 * R channel: Extinction & depth mask
 * G channel: Ambient volumetric density scale
 */
function createProceduralFogMap(size = 128): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  let idx = 0;
  for (let y = 0; y < size; y++) {
    const ny = y / size;
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      // Exponential falloff towards perimeter
      const dx = (nx - 0.5) * 2.0;
      const dy = (ny - 0.5) * 2.0;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const r = Math.floor(Math.max(0, 1.0 - dist) * 255);
      const g = Math.floor(Math.exp(-dist * 1.5) * 255);
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = 128;
      data[idx + 3] = 255;
      idx += 4;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// ============================================================================
// 3. GLSL SHADER SOURCES (Lusion 16_lusion & Immersive Garden 32)
// ============================================================================

/**
 * 16_lusion 4D Simplex noise analytical derivatives GLSL definition
 * Scale factor: 49.0
 */
const GLSL_SIMPLEX_NOISE_DERIVATIVES = /* glsl */ `
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
float mod289(float x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
float permute(float x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float taylorInvSqrt(float r) { return 1.79284291400159 - 0.85373472095314 * r; }

vec4 grad4(float j, vec4 ip) {
  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
  vec4 p, s;
  p.xyz = floor(fract(vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz * 2.0 - 1.0) * s.www;
  return p;
}

#define F4 0.309016994374947451
vec4 simplexNoiseDerivatives(vec4 v_0) {
  const vec4 C = vec4(0.138196601125011, 0.276393202250021, 0.414589803375032, -0.447213595499958);
  vec4 i = floor(v_0 + dot(v_0, vec4(F4)));
  vec4 x0 = v_0 - i + dot(i, C.xxxx);
  vec4 i0;
  vec3 isX = step(x0.yzw, x0.xxx);
  vec3 isYZ = step(x0.zww, x0.yyz);
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;
  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;
  vec4 i3 = clamp(i0, 0.0, 1.0);
  vec4 i2 = clamp(i0 - 1.0, 0.0, 1.0);
  vec4 i1 = clamp(i0 - 2.0, 0.0, 1.0);
  vec4 x1 = x0 - i1 + C.xxxx;
  vec4 x2 = x0 - i2 + C.yyyy;
  vec4 x3 = x0 - i3 + C.zzzz;
  vec4 x4 = x0 + C.wwww;
  i = mod289(i);
  float j0 = permute(permute(permute(permute(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute(permute(permute(permute(i.w + vec4(i1.w, i2.w, i3.w, 1.0)) + i.z + vec4(i1.z, i2.z, i3.z, 1.0)) + i.y + vec4(i1.y, i2.y, i3.y, 1.0)) + i.x + vec4(i1.x, i2.x, i3.x, 1.0));
  vec4 ip = vec4(1.0 / 294.0, 1.0 / 49.0, 1.0 / 7.0, 0.0);
  vec4 p0 = grad4(j0, ip);
  vec4 p1 = grad4(j1.x, ip);
  vec4 p2 = grad4(j1.y, ip);
  vec4 p3 = grad4(j1.z, ip);
  vec4 p4 = grad4(j1.w, ip);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  p4 *= taylorInvSqrt(dot(p4, p4));
  vec3 values0 = vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2));
  vec2 values1 = vec2(dot(p3, x3), dot(p4, x4));
  vec3 m0 = max(0.5 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2)), 0.0);
  vec2 m1 = max(0.5 - vec2(dot(x3, x3), dot(x4, x4)), 0.0);
  vec3 temp0 = -6.0 * m0 * m0 * values0;
  vec2 temp1 = -6.0 * m1 * m1 * values1;
  vec3 mmm0 = m0 * m0 * m0;
  vec2 mmm1 = m1 * m1 * m1;
  float dx = temp0[0]*x0.x + temp0[1]*x1.x + temp0[2]*x2.x + temp1[0]*x3.x + temp1[1]*x4.x + mmm0[0]*p0.x + mmm0[1]*p1.x + mmm0[2]*p2.x + mmm1[0]*p3.x + mmm1[1]*p4.x;
  float dy = temp0[0]*x0.y + temp0[1]*x1.y + temp0[2]*x2.y + temp1[0]*x3.y + temp1[1]*x4.y + mmm0[0]*p0.y + mmm0[1]*p1.y + mmm0[2]*p2.y + mmm1[0]*p3.y + mmm1[1]*p4.y;
  float dz = temp0[0]*x0.z + temp0[1]*x1.z + temp0[2]*x2.z + temp1[0]*x3.z + temp1[1]*x4.z + mmm0[0]*p0.z + mmm0[1]*p1.z + mmm0[2]*p2.z + mmm1[0]*p3.z + mmm1[1]*p4.z;
  float dw = temp0[0]*x0.w + temp0[1]*x1.w + temp0[2]*x2.w + temp1[0]*x3.w + temp1[1]*x4.w + mmm0[0]*p0.w + mmm0[1]*p1.w + mmm0[2]*p2.w + mmm1[0]*p3.w + mmm1[1]*p4.w;
  return vec4(dx, dy, dz, dw) * 49.0;
}
`;

/**
 * 16_lusion Dust Motes Vertex Shader
 */
const DUST_MOTES_VERTEX_SHADER = /* glsl */ `
#define GLSLIFY 1

attribute vec3 a_instancePos;
attribute vec4 a_instanceRands;
attribute float a_instanceId;

uniform float u_time;
uniform vec3 u_bounds;
uniform float u_particleBaseSize;
uniform float u_timeOfDay;

varying vec3 v_worldPosition;
varying vec2 v_uv;
varying float v_instanceId;
varying float v_opacity;
varying vec4 v_rands;

${GLSL_SIMPLEX_NOISE_DERIVATIVES}

vec2 rotate2D(vec2 v, float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c) * v;
}

float linearStep(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

void main() {
  vec3 localPos = position;

  // Local billboard quad rotation modulated by individual seed and continuous time
  float rotAngle = a_instanceRands.y * 6.28318 + sign(-a_instancePos.x) * u_time * mix(0.04, 0.16, a_instanceRands.z);
  localPos.xy = rotate2D(localPos.xy, rotAngle);

  // Particle size variance per instance
  float scale = u_particleBaseSize * (0.65 + 0.7 * abs(a_instanceRands.x));
  vec3 pos = localPos * scale;

  // 4D Simplex noise turbulent velocity driven by analytical derivatives
  vec3 noise = simplexNoiseDerivatives(vec4((a_instancePos + pos) * 0.35, u_time * 0.065)).yzw;

  // Vertical drift and continuous wraparound cycle
  float speed = mix(0.06, 0.14, abs(a_instanceRands.w));
  float cycle = fract(speed * u_time + a_instanceRands.z);

  vec3 instancePos = a_instancePos + noise * vec3(0.55, 0.35, 0.25);
  instancePos.y += cycle * u_bounds.y;

  // Modulo boundary wrapping within showroom dimensions
  instancePos.x = mod(instancePos.x + u_bounds.x * 0.5, u_bounds.x) - u_bounds.x * 0.5;
  instancePos.y = mod(instancePos.y + u_bounds.y * 0.5, u_bounds.y) - u_bounds.y * 0.5;
  instancePos.z = mod(instancePos.z + u_bounds.z * 0.5, u_bounds.z) - u_bounds.z * 0.5;

  // Spherical camera-facing billboard offset
  vec4 mvPosition = modelViewMatrix * vec4(instancePos, 1.0);
  mvPosition.xyz += pos;

  gl_Position = projectionMatrix * mvPosition;

  v_worldPosition = (modelMatrix * vec4(instancePos + pos, 1.0)).xyz;
  v_uv = uv;
  v_instanceId = a_instanceId;
  v_rands = a_instanceRands;

  // Depth fade and cycle envelope pulse
  float depthDistance = -mvPosition.z;
  float depthFade = smoothstep(0.4, 2.2, depthDistance);
  float cycleEnvelope = linearStep(0.0, 0.12, cycle) * linearStep(1.0, 0.88, cycle);
  v_opacity = depthFade * cycleEnvelope * mix(0.5, 1.0, abs(a_instanceRands.x));
}
`;

/**
 * 16_lusion Dust Motes Fragment Shader
 * Incorporates exact depth-extinction exponential decay formula:
 * exp(-length(v_worldPosition + vec3(0., 0., -max(0., fogMap.y - 0.25)*10. + 5.)) * (0.22 - fogMap.x*0.2)) * fogMap.y
 */
const DUST_MOTES_FRAGMENT_SHADER = /* glsl */ `
#define GLSLIFY 1

uniform sampler2D u_fogTexture;
uniform vec3 u_particleColor;
uniform vec3 u_lightColor;
uniform vec3 u_lightDirection;
uniform float u_globalOpacity;
uniform float u_time;
uniform vec3 u_fogCenter;

varying vec3 v_worldPosition;
varying vec2 v_uv;
varying float v_instanceId;
varying float v_opacity;
varying vec4 v_rands;

float linearStep(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

void main() {
  // Circular soft particle disk
  float dist = length(v_uv - vec2(0.5));
  float circle = smoothstep(0.5, 0.08, dist);
  if (circle < 0.002) discard;

  // Sample procedural or texture fog map
  vec2 fogMap = texture2D(u_fogTexture, v_uv).rg;

  // Depth-extinction exponential decay formula extracted from 16_lusion line 1004267
  vec3 extinctionOffset = vec3(0.0, 0.0, -max(0.0, fogMap.y - 0.25) * 10.0 + 5.0);
  vec3 extinctionVec = v_worldPosition + extinctionOffset - u_fogCenter;
  float extinctionRate = 0.22 - fogMap.x * 0.2;
  float depthExtinction = exp(-length(extinctionVec) * extinctionRate) * fogMap.y;

  // Forward Mie scattering simulation along sunlight direction
  vec3 toLight = normalize(-u_lightDirection);
  vec3 viewDir = normalize(cameraPosition - v_worldPosition);
  float cosTheta = dot(viewDir, toLight);
  float g = 0.65;
  float miePhase = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * cosTheta, 1.5) * 0.12;

  // Scintillation / particle shimmer via time and random seed
  float shimmer = 0.8 + 0.35 * sin(u_time * (2.5 + 3.0 * v_rands.y) + v_rands.z * 12.0);

  // Composite final color and alpha
  float alpha = circle * v_opacity * depthExtinction * (0.65 + miePhase) * shimmer * u_globalOpacity * 0.85;
  vec3 particleTint = mix(u_particleColor, u_lightColor, 0.45 + 0.35 * miePhase);

  gl_FragColor = vec4(particleTint, clamp(alpha, 0.0, 1.0));
}
`;

/**
 * 32_immersive_garden Volumetric Window Light Beams Vertex Shader
 */
const LIGHT_BEAMS_VERTEX_SHADER = /* glsl */ `
#define GLSLIFY 1

attribute float a_beamSeed;
attribute vec3 a_beamDirection;

uniform float u_time;
uniform float u_oscillationSpeed;

varying vec2 v_uv;
varying vec3 v_worldPosition;
varying float v_beamSeed;

void main() {
  v_uv = uv;
  v_beamSeed = a_beamSeed;

  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  v_worldPosition = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

/**
 * 32_immersive_garden Volumetric Window Light Beams Fragment Shader
 * Incorporates 4-term harmonic oscillation:
 * (sin(o) + sin(2.2*o + 5.52) + sin(2.9*o + 0.93) + sin(4.6*o + 8.94)) / 4.0;
 * and FadeAnimation GLSL struct with cremap_0 and sine easing.
 */
const LIGHT_BEAMS_FRAGMENT_SHADER = /* glsl */ `
#define GLSLIFY 1

#ifndef PI
#define PI 3.141592653589793
#endif

#ifndef HALF_PI
#define HALF_PI 1.5707963267948966
#endif

struct FadeAnimation {
  float intensity;
  float normalMix;
  vec3 lightDirection;
  vec2 dotRange;
  vec2 timeRange;
};

uniform float u_time;
uniform float u_intensity;
uniform float u_beamOpacity;
uniform vec3 u_tintColor;
uniform sampler2D u_noiseTexture;
uniform float u_smokeSpeed;
uniform float u_oscillationSpeed;
uniform float u_oscillationAmplitude;
uniform float u_timeOfDayRatio;

varying vec2 v_uv;
varying vec3 v_worldPosition;
varying float v_beamSeed;

// 4-term harmonic oscillation from 32_immersive_garden
float harmonicOscillation(float o) {
  return (sin(o) + sin(2.2 * o + 5.52) + sin(2.9 * o + 0.93) + sin(4.6 * o + 8.94)) / 4.0;
}

float sineInOut(float t) {
  return -0.5 * (cos(PI * t) - 1.0);
}

float sineOut(float t) {
  return sin(t * HALF_PI);
}

float cremap_0(float value, float start1, float stop1, float start2, float stop2) {
  float r = start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
  return clamp(r, min(start2, stop2), max(start2, stop2));
}

// Blue noise / hash dithering to eliminate 8-bit color banding
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 uv = v_uv;

  // Longitudinal falloff: soft window entrance at top (uv.y = 1.0), gentle fade at ground (uv.y = 0.0)
  float enterAperture = smoothstep(1.0, 0.88, uv.y);
  float groundDissolve = smoothstep(0.0, 0.25, uv.y);
  float longitudinal = enterAperture * groundDissolve;

  // Transverse parabolic soft feathering across beam width (uv.x = 0..1)
  float transverse = pow(sin(uv.x * PI), 1.7);

  // Dynamic atmospheric smoke and dust turbulence sampling
  float time = u_time * u_smokeSpeed;
  vec2 smokeUv1 = uv * vec2(1.2, 0.25) + vec2(time * 0.04, -time * 0.12);
  vec2 smokeUv2 = uv * vec2(2.4, 0.6) - vec2(time * 0.07, time * 0.18);
  float smoke1 = texture2D(u_noiseTexture, smokeUv1).r;
  float smoke2 = texture2D(u_noiseTexture, smokeUv2).g;
  float atmosphericTurbulence = mix(smoke1, smoke2, 0.45);

  // 4-term harmonic oscillation intensity modulation
  float osc = harmonicOscillation(u_time * u_oscillationSpeed + v_beamSeed);
  float pulse = 1.0 + osc * u_oscillationAmplitude;

  // Micro-dithering
  float dithering = (hash12(gl_FragCoord.xy) - 0.5) * 0.022;

  // Multi-stage alpha synthesis
  float beamAlpha = longitudinal * transverse * (0.35 + 0.65 * atmosphericTurbulence) * pulse * u_beamOpacity * u_intensity;
  beamAlpha = clamp(beamAlpha + dithering, 0.0, 1.0);

  if (beamAlpha < 0.001) discard;

  // Specular / core glow boost along beam center
  vec3 coreColor = mix(u_tintColor, vec3(1.0), pow(transverse, 3.5) * 0.4);

  gl_FragColor = vec4(coreColor, beamAlpha);
}
`;

// ============================================================================
// 4. INSTANCED DUST MOTES CLASS (16_lusion)
// ============================================================================

export interface VolumetricDustMotesOptions {
  particleCount?: number;
  bounds?: THREE.Vector3;
  particleBaseSize?: number;
  color?: THREE.ColorRepresentation;
  fogCenter?: THREE.Vector3;
  fogTexture?: THREE.Texture;
}

export class VolumetricDustMotes {
  public group: THREE.Group;
  public mesh: THREE.Mesh;
  public geometry: THREE.InstancedBufferGeometry;
  public material: THREE.ShaderMaterial;

  private particleCount: number;
  private bounds: THREE.Vector3;
  private proceduralFogTexture: THREE.DataTexture | null = null;

  constructor(options: VolumetricDustMotesOptions = {}) {
    this.particleCount = Math.max(300, options.particleCount ?? 384);
    this.bounds = options.bounds ?? new THREE.Vector3(26, 7.5, 26);
    this.group = new THREE.Group();
    this.group.name = 'VolumetricDustMotes';

    // 1. Base Geometry: Billboard quad with center anchor
    const basePlane = new THREE.PlaneGeometry(1, 1, 1, 1);
    this.geometry = new THREE.InstancedBufferGeometry();
    for (const attr in basePlane.attributes) {
      this.geometry.setAttribute(attr, basePlane.attributes[attr]);
    }
    this.geometry.setIndex(basePlane.index);
    basePlane.dispose();

    // 2. Instanced Attributes Setup
    const instanceIds = new Float32Array(this.particleCount);
    const instancePositions = new Float32Array(this.particleCount * 3);
    const instanceRands = new Float32Array(this.particleCount * 4);

    for (let i = 0; i < this.particleCount; i++) {
      instanceIds[i] = i;

      // a_instancePos: Distributed within showroom bounds
      const idx3 = i * 3;
      instancePositions[idx3 + 0] = (Math.random() - 0.5) * this.bounds.x;
      instancePositions[idx3 + 1] = (Math.random() - 0.5) * this.bounds.y;
      instancePositions[idx3 + 2] = (Math.random() - 0.5) * this.bounds.z;

      // a_instanceRands: 4 pseudo-random seed components in [-1.0, 1.0]
      const idx4 = i * 4;
      instanceRands[idx4 + 0] = Math.random() * 2.0 - 1.0;
      instanceRands[idx4 + 1] = Math.random() * 2.0 - 1.0;
      instanceRands[idx4 + 2] = Math.random() * 2.0 - 1.0;
      instanceRands[idx4 + 3] = Math.random() * 2.0 - 1.0;
    }

    this.geometry.setAttribute(
      'a_instanceId',
      new THREE.InstancedBufferAttribute(instanceIds, 1)
    );
    this.geometry.setAttribute(
      'a_instancePos',
      new THREE.InstancedBufferAttribute(instancePositions, 3)
    );
    this.geometry.setAttribute(
      'a_instanceRands',
      new THREE.InstancedBufferAttribute(instanceRands, 4)
    );

    // 3. Fallback procedural fog texture if none provided
    if (!options.fogTexture) {
      this.proceduralFogTexture = createProceduralFogMap(128);
    }
    const fogTexture = options.fogTexture ?? this.proceduralFogTexture!;

    // 4. Shader Material
    const initialColor = new THREE.Color(options.color ?? 0xf5eedc);
    const initialFogCenter = options.fogCenter ?? new THREE.Vector3(0, 1.5, 0);

    this.material = new THREE.ShaderMaterial({
      vertexShader: DUST_MOTES_VERTEX_SHADER,
      fragmentShader: DUST_MOTES_FRAGMENT_SHADER,
      uniforms: {
        u_time: { value: 0 },
        u_bounds: { value: this.bounds },
        u_particleBaseSize: { value: options.particleBaseSize ?? 0.085 },
        u_particleColor: { value: initialColor },
        u_lightColor: { value: new THREE.Color(0xfff3d6) },
        u_lightDirection: { value: new THREE.Vector3(-0.4, -0.85, 0.35).normalize() },
        u_globalOpacity: { value: 0.8 },
        u_fogCenter: { value: initialFogCenter },
        u_fogTexture: { value: fogTexture },
        u_timeOfDay: { value: 0.0 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 40;
    this.group.add(this.mesh);
  }

  public update(time: number): void {
    this.material.uniforms.u_time.value = time;
  }

  public setLightState(
    direction: THREE.Vector3,
    lightColor: THREE.Color,
    dustColor: THREE.Color,
    intensity: number
  ): void {
    this.material.uniforms.u_lightDirection.value.copy(direction);
    this.material.uniforms.u_lightColor.value.copy(lightColor);
    this.material.uniforms.u_particleColor.value.copy(dustColor);
    this.material.uniforms.u_globalOpacity.value = Math.min(1.0, 0.55 * intensity);
  }

  public setBounds(newBounds: THREE.Vector3): void {
    this.bounds.copy(newBounds);
    this.material.uniforms.u_bounds.value.copy(newBounds);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    if (this.proceduralFogTexture) {
      this.proceduralFogTexture.dispose();
    }
  }
}

// ============================================================================
// 5. VOLUMETRIC WINDOW LIGHT BEAMS CLASS (32_immersive_garden)
// ============================================================================

export interface WindowApertureSpec {
  origin: THREE.Vector3; // Emitter center (clerestory window top)
  target: THREE.Vector3; // Center point on floor
  topWidth: number; // Width of window frame
  bottomWidth: number; // Fan width at floor
  planeCount?: number; // Number of cross-intersecting planes (default 3)
}

export interface VolumetricWindowLightBeamsOptions {
  apertures?: WindowApertureSpec[];
  preset?: TimeOfDayPreset;
  noiseTexture?: THREE.Texture;
}

export class VolumetricWindowLightBeams {
  public group: THREE.Group;
  public material: THREE.ShaderMaterial;

  private beamGeometries: THREE.BufferGeometry[] = [];
  private proceduralNoiseTexture: THREE.DataTexture | null = null;
  private currentConfig: TimeOfDayConfig;
  private targetConfig: TimeOfDayConfig;
  private transitionAlpha = 1.0;
  private transitionDuration = 1.5;

  constructor(options: VolumetricWindowLightBeamsOptions = {}) {
    this.group = new THREE.Group();
    this.group.name = 'VolumetricWindowLightBeams';

    const defaultPreset = options.preset ?? 'day';
    this.currentConfig = { ...TIME_OF_DAY_PRESETS[defaultPreset] };
    this.targetConfig = { ...this.currentConfig };

    // 1. Autonomous Procedural Noise Texture
    if (!options.noiseTexture) {
      this.proceduralNoiseTexture = createProceduralNoiseTexture(256);
    }
    const noiseTexture = options.noiseTexture ?? this.proceduralNoiseTexture!;

    // 2. Master Shader Material
    this.material = new THREE.ShaderMaterial({
      vertexShader: LIGHT_BEAMS_VERTEX_SHADER,
      fragmentShader: LIGHT_BEAMS_FRAGMENT_SHADER,
      uniforms: {
        u_time: { value: 0 },
        u_intensity: { value: this.currentConfig.intensity },
        u_beamOpacity: { value: this.currentConfig.beamOpacity },
        u_tintColor: { value: this.currentConfig.colorTint.clone() },
        u_noiseTexture: { value: noiseTexture },
        u_smokeSpeed: { value: this.currentConfig.smokeSpeed },
        u_oscillationSpeed: { value: this.currentConfig.oscillationSpeed },
        u_oscillationAmplitude: { value: 0.35 },
        u_timeOfDayRatio: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    // 3. Construct Window Beams
    const apertures = options.apertures ?? this.getDefaultShowroomApertures();
    this.buildBeams(apertures);
  }

  /**
   * Default high-ticket architectural showroom window bays:
   * 4 clerestory window shafts streaming light down across the joinery axes
   */
  private getDefaultShowroomApertures(): WindowApertureSpec[] {
    return [
      {
        origin: new THREE.Vector3(-6.5, 4.8, -4.0),
        target: new THREE.Vector3(1.2, 0.0, -1.5),
        topWidth: 2.2,
        bottomWidth: 5.4,
        planeCount: 3,
      },
      {
        origin: new THREE.Vector3(-6.5, 4.8, 0.0),
        target: new THREE.Vector3(1.2, 0.0, 2.5),
        topWidth: 2.2,
        bottomWidth: 5.4,
        planeCount: 3,
      },
      {
        origin: new THREE.Vector3(-6.5, 4.8, 4.0),
        target: new THREE.Vector3(1.2, 0.0, 6.5),
        topWidth: 2.2,
        bottomWidth: 5.4,
        planeCount: 3,
      },
      {
        origin: new THREE.Vector3(0.0, 5.2, -6.0),
        target: new THREE.Vector3(3.5, 0.0, 0.0),
        topWidth: 1.8,
        bottomWidth: 4.6,
        planeCount: 3,
      },
    ];
  }

  /**
   * Builds multi-quad light shafts along the emitter-to-target beam axis
   */
  private buildBeams(apertures: WindowApertureSpec[]): void {
    apertures.forEach((spec, apertureIdx) => {
      const beamDir = new THREE.Vector3().subVectors(spec.target, spec.origin);
      const beamLength = beamDir.length();
      const normDir = beamDir.clone().normalize();

      // Compute orthogonal coordinate frame along beam direction
      const up = new THREE.Vector3(0, 1, 0);
      let right = new THREE.Vector3().crossVectors(normDir, up);
      if (right.lengthSq() < 0.001) {
        right = new THREE.Vector3(1, 0, 0);
      } else {
        right.normalize();
      }
      const crossUp = new THREE.Vector3().crossVectors(right, normDir).normalize();

      const planeCount = spec.planeCount ?? 3;
      const angleStep = Math.PI / planeCount;

      for (let p = 0; p < planeCount; p++) {
        const rotAngle = p * angleStep;
        const cosA = Math.cos(rotAngle);
        const sinA = Math.sin(rotAngle);
        const planeNorm = new THREE.Vector3()
          .copy(right)
          .multiplyScalar(cosA)
          .addScaledVector(crossUp, sinA)
          .normalize();

        const halfTop = spec.topWidth * 0.5;
        const halfBottom = spec.bottomWidth * 0.5;

        // Quad corners
        const v0 = new THREE.Vector3().copy(spec.origin).addScaledVector(planeNorm, -halfTop);
        const v1 = new THREE.Vector3().copy(spec.origin).addScaledVector(planeNorm, halfTop);
        const v2 = new THREE.Vector3().copy(spec.target).addScaledVector(planeNorm, halfBottom);
        const v3 = new THREE.Vector3().copy(spec.target).addScaledVector(planeNorm, -halfBottom);

        const positions = new Float32Array([
          v0.x, v0.y, v0.z,
          v1.x, v1.y, v1.z,
          v2.x, v2.y, v2.z,

          v0.x, v0.y, v0.z,
          v2.x, v2.y, v2.z,
          v3.x, v3.y, v3.z,
        ]);

        const uvs = new Float32Array([
          0.0, 1.0,
          1.0, 1.0,
          1.0, 0.0,

          0.0, 1.0,
          1.0, 0.0,
          0.0, 0.0,
        ]);

        // Beam seed for distinct harmonic oscillation phase per window shaft
        const seedValue = apertureIdx * 1.73 + p * 0.81;
        const beamSeeds = new Float32Array(6).fill(seedValue);

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geo.setAttribute('a_beamSeed', new THREE.BufferAttribute(beamSeeds, 1));

        this.beamGeometries.push(geo);

        const mesh = new THREE.Mesh(geo, this.material);
        mesh.frustumCulled = false;
        mesh.renderOrder = 30;
        this.group.add(mesh);
      }
    });
  }

  /**
   * Sets Time-of-Day preset with smooth transition interpolation
   */
  public setTimeOfDay(preset: TimeOfDayPreset, duration = 1.2): void {
    this.targetConfig = { ...TIME_OF_DAY_PRESETS[preset] };
    this.transitionDuration = Math.max(0.1, duration);
    this.transitionAlpha = 0.0;
  }

  public update(time: number, delta: number): void {
    // 1. Time-of-Day Smooth Lerp
    if (this.transitionAlpha < 1.0) {
      this.transitionAlpha = Math.min(1.0, this.transitionAlpha + delta / this.transitionDuration);
      // Sine-in-out easing
      const t = this.transitionAlpha;
      const ease = -0.5 * (Math.cos(Math.PI * t) - 1.0);

      this.currentConfig.intensity = THREE.MathUtils.lerp(
        this.currentConfig.intensity,
        this.targetConfig.intensity,
        ease
      );
      this.currentConfig.beamOpacity = THREE.MathUtils.lerp(
        this.currentConfig.beamOpacity,
        this.targetConfig.beamOpacity,
        ease
      );
      this.currentConfig.smokeSpeed = THREE.MathUtils.lerp(
        this.currentConfig.smokeSpeed,
        this.targetConfig.smokeSpeed,
        ease
      );
      this.currentConfig.oscillationSpeed = THREE.MathUtils.lerp(
        this.currentConfig.oscillationSpeed,
        this.targetConfig.oscillationSpeed,
        ease
      );
      this.currentConfig.colorTint.lerp(this.targetConfig.colorTint, ease);
      this.currentConfig.dustColor.lerp(this.targetConfig.dustColor, ease);
      this.currentConfig.lightDirection.lerp(this.targetConfig.lightDirection, ease).normalize();

      this.material.uniforms.u_intensity.value = this.currentConfig.intensity;
      this.material.uniforms.u_beamOpacity.value = this.currentConfig.beamOpacity;
      this.material.uniforms.u_tintColor.value.copy(this.currentConfig.colorTint);
      this.material.uniforms.u_smokeSpeed.value = this.currentConfig.smokeSpeed;
      this.material.uniforms.u_oscillationSpeed.value = this.currentConfig.oscillationSpeed;
    }

    this.material.uniforms.u_time.value = time;
  }

  public getCurrentConfig(): TimeOfDayConfig {
    return this.currentConfig;
  }

  public dispose(): void {
    this.beamGeometries.forEach((g) => g.dispose());
    this.material.dispose();
    if (this.proceduralNoiseTexture) {
      this.proceduralNoiseTexture.dispose();
    }
  }
}

// ============================================================================
// 6. UNIFIED VOLUMETRIC SHOWROOM SYSTEM (Composite Coordinator)
// ============================================================================

export interface VolumetricShowroomSystemOptions {
  dustParticleCount?: number;
  dustBounds?: THREE.Vector3;
  apertures?: WindowApertureSpec[];
  initialPreset?: TimeOfDayPreset;
}

export class VolumetricShowroomSystem {
  public group: THREE.Group;
  public dustMotes: VolumetricDustMotes;
  public lightBeams: VolumetricWindowLightBeams;

  private currentPreset: TimeOfDayPreset = 'day';

  constructor(options: VolumetricShowroomSystemOptions = {}) {
    this.group = new THREE.Group();
    this.group.name = 'VolumetricShowroomSystem';

    this.currentPreset = options.initialPreset ?? 'day';

    // 1. Initialize Volumetric Light Beams (32_immersive_garden)
    this.lightBeams = new VolumetricWindowLightBeams({
      apertures: options.apertures,
      preset: this.currentPreset,
    });
    this.group.add(this.lightBeams.group);

    // 2. Initialize Instanced Dust Motes (16_lusion)
    const initialConfig = this.lightBeams.getCurrentConfig();
    this.dustMotes = new VolumetricDustMotes({
      particleCount: options.dustParticleCount ?? 384,
      bounds: options.dustBounds ?? new THREE.Vector3(26, 7.5, 26),
      color: initialConfig.dustColor,
    });
    this.group.add(this.dustMotes.group);

    // Initial sync
    this.syncDustWithLighting();
  }

  /**
   * Synchronizes dust extinction, tint, and forward Mie scattering with current light beam state
   */
  private syncDustWithLighting(): void {
    const config = this.lightBeams.getCurrentConfig();
    this.dustMotes.setLightState(
      config.lightDirection,
      config.colorTint,
      config.dustColor,
      config.intensity * config.dustGlow
    );
  }

  /**
   * Transitions Time-of-Day across both light shafts and dust motes
   */
  public setTimeOfDay(preset: TimeOfDayPreset, duration = 1.2): void {
    this.currentPreset = preset;
    this.lightBeams.setTimeOfDay(preset, duration);
  }

  public update(time: number, delta: number): void {
    this.lightBeams.update(time, delta);
    this.syncDustWithLighting();
    this.dustMotes.update(time);
  }

  public attachToScene(scene: THREE.Scene): void {
    scene.add(this.group);
  }

  public dispose(): void {
    this.lightBeams.dispose();
    this.dustMotes.dispose();
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
