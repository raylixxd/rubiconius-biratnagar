/**
 * Architectural Fluid Ground & Navier-Stokes Floor Reflection System
 *
 * Reverse-engineered and extracted from 06_unseen:
 * 1. Full 2D GPU Navier-Stokes fluid simulation (Semi-Lagrangian advection,
 *    divergence calculation, Jacobi pressure Poisson relaxation (10-20 iterations),
 *    and pressure gradient subtraction).
 * 2. Visual dye / density advection with dissipation and interactive splat injection.
 * 3. Architectural floor reflection plane:
 *    - Planar virtual reflection camera with oblique near-plane clipping
 *    - Fluid-distorted reflection coordinate sampling
 *    - Ambient occlusion modulation
 *    - Fluid-perturbed normal calculation & specular highlights
 *    - Luminance glow overlay (architectural bronze)
 *    - Perimeter & glancing-angle bronze edge dissolve (#A77C4D)
 *
 * Designed for Rubiconius Biratnagar Showroom.
 */

import * as THREE from 'three';

// ----------------------------------------------------------------------------
// Types & Options
// ----------------------------------------------------------------------------

export interface FluidSimulationOptions {
  /** Simulation grid resolution (width = height, e.g. 128, 256, 512). Default: 256 */
  resolution: number;
  /** Jacobi pressure relaxation solver iteration count. Default: 16 */
  iterations: number;
  /** Viscosity multiplier for fluid resistance. Default: 0.98 */
  viscosity: number;
  /** Pointer impulse force multiplier. Default: 50.0 */
  force: number;
  /** Radius of pointer influence in UV coordinates [0..1]. Default: 0.016 */
  mouseRadius: number;
  /** Velocity dissipation / decay per step (0.9..1.0). Default: 0.992 */
  velocityDissipation: number;
  /** Density / dye dissipation per step (0.9..1.0). Default: 0.970 */
  densityDissipation: number;
  /** Splat dye intensity. Default: 1.4 */
  splatIntensity: number;
  /** Bronze dye color injected into fluid on interaction. Default: #A77C4D */
  splatColor: THREE.ColorRepresentation;
}

export interface FluidGroundOptions {
  /** Fluid solver configuration overrides */
  fluid?: Partial<FluidSimulationOptions>;
  /** Floor plane dimensions [width, length] in world units. Default: [26, 26] */
  size?: [number, number];
  /** World position of the floor plane. Default: [0, 0, 0] */
  position?: [number, number, number];
  /** Base floor color (dark obsidian / charcoal plaster). Default: #080808 */
  baseColor?: THREE.ColorRepresentation;
  /** Architectural bronze accent color for edge dissolve & fluid glow. Default: #A77C4D */
  bronzeColor?: THREE.ColorRepresentation;
  /** Custom AO texture map. If omitted, procedural corner/perimeter AO is used */
  aoMap?: THREE.Texture | null;
  /** Reflection mix strength (0.0 - 1.0). Default: 0.45 */
  reflectionIntensity?: number;
  /** Fluid distortion displacement scale on reflection coordinates. Default: 0.035 */
  distortionAmount?: number;
  /** Whether to render real-time planar reflection. Default: true */
  enablePlanarReflection?: boolean;
  /** Planar reflection render target resolution. Default: 1024 */
  reflectionResolution?: number;
}

export interface FluidGroundHandle {
  /** The floor mesh containing the custom reflection and fluid shader */
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  /** The underlying GPU Navier-Stokes solver */
  fluid: NavierStokesFluidSolver;
  /** Update loop step: simulates fluid physics and renders planar reflection */
  update: (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, timeSec: number, deltaSec: number) => void;
  /** Injects pointer coordinates directly in normalized [0, 1] floor UV space */
  onPointerMove: (uvX: number, uvY: number) => void;
  /** Raycasts pointer against floor mesh using normalized device coordinates (-1 to 1) */
  raycastPointer: (ndcX: number, ndcY: number, camera: THREE.Camera) => boolean;
  /** Sets dusk / evening transition multiplier [0.0 = day, 1.0 = dusk] */
  setDusk: (v: number) => void;
  /** Toggles planar reflection rendering (useful for lower tier devices or power saving) */
  setPlanarReflection: (enabled: boolean) => void;
  /** Disposes all WebGL render targets, textures, geometries, and materials */
  dispose: () => void;
}

// ----------------------------------------------------------------------------
// GLSL Shaders
// ----------------------------------------------------------------------------

const SIM_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** Velocity Advection & Interactive Splat Pass */
const VELOCITY_ADVECTION_FRAG = /* glsl */ `
precision highp float;
precision highp sampler2D;

varying vec2 vUv;

uniform sampler2D uTexture;
uniform vec2 uCellSize;
uniform vec2 uForce;
uniform vec2 uMouse;
uniform vec2 uPrevMouse;
uniform vec2 uMouseVelocity;
uniform float uMouseRadius;
uniform float uDissipation;

float sdLine(vec2 p, vec2 a, vec2 b) {
  float vel = clamp(length(uMouseVelocity), 0.5, 2.5);
  vec2 pa = p - a;
  vec2 ba = b - a;
  float d = dot(ba, ba);
  float h = d > 0.000001 ? clamp(dot(pa, ba) / d, 0.0, 1.0) : 0.0;
  return length(pa - ba * h) / vel;
}

void main() {
  // Semi-Lagrangian Backtrace
  vec2 vel = texture2D(uTexture, vUv).xy;
  vec2 coord = vUv - vel * uCellSize;
  vec4 color = texture2D(uTexture, coord);

  // Pointer impulse injection
  if (uMouse.x >= 0.0 && uPrevMouse.x >= 0.0) {
    float dist = sdLine(vUv, uPrevMouse, uMouse);
    float splat = smoothstep(1.0 - uMouseRadius, 1.0, 1.0 - min(dist, 1.0));
    color.xy += uForce * splat;
  }

  // Decay and safety clamp
  color.xy *= uDissipation;
  color.xy = clamp(color.xy, vec2(-5.0), vec2(5.0));
  gl_FragColor = vec4(color.xy, 0.0, 1.0);
}
`;

/** Visual Density / Dye Advection & Splat Pass */
const DENSITY_ADVECTION_FRAG = /* glsl */ `
precision highp float;
precision highp sampler2D;

varying vec2 vUv;

uniform sampler2D uDensity;
uniform sampler2D uVelocity;
uniform vec2 uCellSize;
uniform vec3 uColor;
uniform vec2 uMouse;
uniform vec2 uPrevMouse;
uniform vec2 uMouseVelocity;
uniform float uMouseRadius;
uniform float uDissipation;
uniform float uSplatIntensity;

float sdLine(vec2 p, vec2 a, vec2 b) {
  float vel = clamp(length(uMouseVelocity), 0.5, 2.5);
  vec2 pa = p - a;
  vec2 ba = b - a;
  float d = dot(ba, ba);
  float h = d > 0.000001 ? clamp(dot(pa, ba) / d, 0.0, 1.0) : 0.0;
  return length(pa - ba * h) / vel;
}

void main() {
  // Advect density along velocity field
  vec2 vel = texture2D(uVelocity, vUv).xy;
  vec4 density = texture2D(uDensity, vUv - vel * uCellSize) * uDissipation;

  // Add dye at mouse location
  if (uMouse.x >= 0.0 && uPrevMouse.x >= 0.0) {
    float dist = sdLine(vUv, uPrevMouse, uMouse);
    float splat = smoothstep(1.0 - uMouseRadius, 1.0, 1.0 - min(dist, 1.0));
    density.rgb += uColor * (splat * uSplatIntensity);
  }

  gl_FragColor = clamp(density, 0.0, 4.0);
}
`;

/** Divergence Pass: Computes nabla . u */
const DIVERGENCE_FRAG = /* glsl */ `
precision highp float;
precision highp sampler2D;

varying vec2 vUv;

uniform sampler2D uVelocity;
uniform vec2 uCellSize;
uniform float uViscosity;

void main() {
  float x0 = texture2D(uVelocity, vUv - vec2(uCellSize.x, 0.0)).x;
  float x1 = texture2D(uVelocity, vUv + vec2(uCellSize.x, 0.0)).x;
  float y0 = texture2D(uVelocity, vUv - vec2(0.0, uCellSize.y)).y;
  float y1 = texture2D(uVelocity, vUv + vec2(0.0, uCellSize.y)).y;

  float divergence = (x1 - x0 + y1 - y0) * 0.5 * uViscosity;
  gl_FragColor = vec4(divergence, 0.0, 0.0, 1.0);
}
`;

/** Jacobi Pressure Relaxation: Solves nabla^2 p = divergence */
const JACOBI_PRESSURE_FRAG = /* glsl */ `
precision highp float;
precision highp sampler2D;

varying vec2 vUv;

uniform sampler2D uTexture;
uniform sampler2D uDivergence;
uniform vec2 uCellSize;
uniform float uAlpha;
uniform float uBeta;

void main() {
  float x0 = texture2D(uTexture, vUv - vec2(uCellSize.x, 0.0)).r;
  float x1 = texture2D(uTexture, vUv + vec2(uCellSize.x, 0.0)).r;
  float y0 = texture2D(uTexture, vUv - vec2(0.0, uCellSize.y)).r;
  float y1 = texture2D(uTexture, vUv + vec2(0.0, uCellSize.y)).r;
  float b = texture2D(uDivergence, vUv).r;

  float relaxed = (x0 + x1 + y0 + y1 + uAlpha * b) * uBeta;
  gl_FragColor = vec4(relaxed, 0.0, 0.0, 1.0);
}
`;

/** Subtract Pressure Gradient: u = u - nabla p */
const SUBTRACT_GRADIENT_FRAG = /* glsl */ `
precision highp float;
precision highp sampler2D;

varying vec2 vUv;

uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uCellSize;

void main() {
  float x0 = texture2D(uPressure, vUv - vec2(uCellSize.x, 0.0)).r;
  float x1 = texture2D(uPressure, vUv + vec2(uCellSize.x, 0.0)).r;
  float y0 = texture2D(uPressure, vUv - vec2(0.0, uCellSize.y)).r;
  float y1 = texture2D(uPressure, vUv + vec2(0.0, uCellSize.y)).r;

  vec2 v = texture2D(uVelocity, vUv).xy;
  vec2 grad = vec2(x1 - x0, y1 - y0) * 0.5;
  gl_FragColor = vec4(v - grad, 0.0, 1.0);
}
`;

/** Architectural Floor Reflection Vertex Shader */
const FLOOR_VERTEX_SHADER = /* glsl */ `
precision highp float;

varying vec4 vMirrorCoord;
varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;

uniform mat4 uTextureMatrix;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vMirrorCoord = uTextureMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

/** Architectural Floor Reflection Fragment Shader */
const FLOOR_FRAGMENT_SHADER = /* glsl */ `
precision highp float;
precision highp sampler2D;

varying vec4 vMirrorCoord;
varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;

uniform sampler2D uReflectionTexture;
uniform sampler2D uFluidTexture;
uniform sampler2D uFluidDensity;
uniform sampler2D uAOTexture;
uniform bool uHasAO;
uniform vec2 uResolution;
uniform vec3 uColor;
uniform vec3 uBronzeColor;
uniform float uReflectionIntensity;
uniform float uDistortionAmount;
uniform float uTime;
uniform float uDusk;

const vec3 LUM_WEIGHTS = vec3(0.2126, 0.7152, 0.0722);
float luminance(in vec3 color) {
  return dot(color, LUM_WEIGHTS);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float microNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  vec3 baseColor = uColor;

  // 1. Ambient Occlusion
  float ao = 1.0;
  if (uHasAO) {
    ao = texture2D(uAOTexture, vUv).r;
  } else {
    // Procedural soft architectural perimeter & corner AO
    vec2 pAo = abs(vUv - 0.5) * 2.0;
    float corner = smoothstep(0.98, 0.25, length(pAo));
    ao = mix(0.70, 1.0, corner);
  }

  // 2. Fluid Simulation Inputs
  vec4 fluidVel = texture2D(uFluidTexture, vUv);
  vec4 fluidDen = texture2D(uFluidDensity, vUv);
  vec2 fluidPos = fluidVel.xy;
  float fluidSpeed = length(fluidPos);

  // 3. Procedural Micro Surface Grain
  float noiseTime = uTime * 0.035;
  vec2 nCoord = vUv * 48.0 + vec2(0.0, noiseTime);
  float nVal = microNoise(nCoord) - 0.5;

  // 4. Viewport Screen Edge Dampening (avoids harsh reflection border clipping)
  float edgeReduce = smoothstep(0.0, uResolution.x * 0.08, gl_FragCoord.x) *
                     smoothstep(uResolution.x, uResolution.x * 0.92, gl_FragCoord.x) *
                     smoothstep(0.0, uResolution.y * 0.08, gl_FragCoord.y) *
                     smoothstep(uResolution.y, uResolution.y * 0.92, gl_FragCoord.y);

  // 5. Perspective Reflection UV Coordinates with Fluid Distortion
  vec2 reflectionUv = vMirrorCoord.w > 0.0 ? (vMirrorCoord.xy / vMirrorCoord.w) : vUv;
  reflectionUv.x += (nVal * 0.012 + fluidPos.x * uDistortionAmount) * edgeReduce * ao;
  reflectionUv.y += (fluidPos.y * uDistortionAmount) * edgeReduce * ao;
  reflectionUv = clamp(reflectionUv, vec2(0.002), vec2(0.998));

  // 6. Reflection Sampling
  vec3 reflSample = texture2D(uReflectionTexture, reflectionUv).rgb;

  // 7. Specular Highlights from Fluid Wavelets
  vec2 fluidSpec = vec2(nVal * 0.4) + fluidPos * 5.0;
  vec3 worldNormal = normalize(vec3(fluidSpec.x, 1.0, fluidSpec.y));
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 lightDir = normalize(vec3(-0.35, 0.85, 0.45));
  vec3 specRay = reflect(-viewDir, worldNormal);
  float spec = pow(max(0.0, dot(specRay, lightDir)), 32.0) * ao;

  // 8. Base Obsidian Floor Composition
  vec3 col = mix(baseColor, reflSample, clamp(uReflectionIntensity * ao, 0.0, 0.88));
  col += vec3(0.96, 0.91, 0.83) * (spec * 0.40);

  // 9. Architectural Bronze Fluid Luminance Glow
  float lum = luminance(abs(fluidDen.rgb)) + fluidSpeed * 0.35;
  vec3 glow = uBronzeColor * (lum * 0.80 * ao);
  col += glow;

  // 10. Bronze Edge Dissolve (perimeter radial falloff + physical glancing Fresnel)
  float ndotv = clamp(dot(vNormal, viewDir), 0.0, 1.0);
  float fresnel = pow(1.0 - ndotv, 3.6);
  vec2 distFromCenter = (vUv - 0.5) * 2.0;
  float radialDist = length(distFromCenter);
  float edgeDissolve = smoothstep(0.70, 0.98, radialDist);

  vec3 bronzeTone = mix(uBronzeColor, vec3(0.80, 0.60, 0.40), uDusk);
  col = mix(col, bronzeTone, clamp(edgeDissolve * 0.45 + fresnel * 0.24, 0.0, 0.78));

  // Dusk ambience mood tint
  col = mix(col, col * vec3(0.62, 0.66, 0.74), uDusk * 0.40);

  gl_FragColor = vec4(col, 1.0);
}
`;

// ----------------------------------------------------------------------------
// GPU Ping-Pong Simulation Pass
// ----------------------------------------------------------------------------

interface GpuPassUniforms {
  [uniform: string]: THREE.IUniform;
}

class GpuSimPass {
  public width: number;
  public height: number;
  public readTarget: THREE.WebGLRenderTarget;
  public writeTarget: THREE.WebGLRenderTarget;
  public material: THREE.ShaderMaterial;
  public quadMesh: THREE.Mesh;
  public simScene: THREE.Scene;
  public simCamera: THREE.Camera;
  private readonly isPingPong: boolean;

  constructor(
    width: number,
    height: number,
    fragmentShader: string,
    uniforms: GpuPassUniforms,
    isPingPong = true
  ) {
    this.width = width;
    this.height = height;
    this.isPingPong = isPingPong;

    const rtParams: THREE.RenderTargetOptions = {
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    };

    this.readTarget = new THREE.WebGLRenderTarget(width, height, rtParams);
    this.writeTarget = isPingPong
      ? new THREE.WebGLRenderTarget(width, height, rtParams)
      : this.readTarget;

    this.simScene = new THREE.Scene();
    this.simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const quadGeo = new THREE.PlaneGeometry(2, 2);
    this.material = new THREE.ShaderMaterial({
      vertexShader: SIM_VERTEX_SHADER,
      fragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });

    this.quadMesh = new THREE.Mesh(quadGeo, this.material);
    this.simScene.add(this.quadMesh);
  }

  public render(renderer: THREE.WebGLRenderer): void {
    const prevRt = renderer.getRenderTarget();
    renderer.setRenderTarget(this.writeTarget);
    renderer.render(this.simScene, this.simCamera);
    renderer.setRenderTarget(prevRt);

    if (this.isPingPong) {
      this.swap();
    }
  }

  public swap(): void {
    const temp = this.readTarget;
    this.readTarget = this.writeTarget;
    this.writeTarget = temp;
  }

  public get texture(): THREE.Texture {
    return this.readTarget.texture;
  }

  public setSize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.readTarget.setSize(w, h);
    if (this.isPingPong) {
      this.writeTarget.setSize(w, h);
    }
  }

  public dispose(): void {
    this.readTarget.dispose();
    if (this.isPingPong) {
      this.writeTarget.dispose();
    }
    this.quadMesh.geometry.dispose();
    this.material.dispose();
  }
}

// ----------------------------------------------------------------------------
// Navier-Stokes 2D GPU Fluid Solver
// ----------------------------------------------------------------------------

export class NavierStokesFluidSolver {
  public options: FluidSimulationOptions;

  private velocityPass: GpuSimPass;
  private densityPass: GpuSimPass;
  private divergencePass: GpuSimPass;
  private pressurePass: GpuSimPass;
  private subtractGradientPass: GpuSimPass;

  private mousePos = new THREE.Vector2(-1, -1);
  private prevMousePos = new THREE.Vector2(-1, -1);
  private mouseVelocity = new THREE.Vector2(0, 0);
  private forceVector = new THREE.Vector2(0, 0);
  private pointerMoved = false;

  constructor(options?: Partial<FluidSimulationOptions>) {
    this.options = {
      resolution: 256,
      iterations: 16,
      viscosity: 0.98,
      force: 50.0,
      mouseRadius: 0.016,
      velocityDissipation: 0.992,
      densityDissipation: 0.970,
      splatIntensity: 1.4,
      splatColor: '#A77C4D',
      ...options,
    };

    const res = this.options.resolution;
    const cellSize = new THREE.Vector2(1 / res, 1 / res);
    const splatCol = new THREE.Color(this.options.splatColor);

    // 1. Velocity Advection Pass (Ping-Pong)
    this.velocityPass = new GpuSimPass(
      res,
      res,
      VELOCITY_ADVECTION_FRAG,
      {
        uTexture: { value: null },
        uCellSize: { value: cellSize },
        uForce: { value: this.forceVector },
        uMouse: { value: this.mousePos },
        uPrevMouse: { value: this.prevMousePos },
        uMouseVelocity: { value: this.mouseVelocity },
        uMouseRadius: { value: this.options.mouseRadius },
        uDissipation: { value: this.options.velocityDissipation },
      },
      true
    );

    // 2. Density / Dye Advection Pass (Ping-Pong)
    this.densityPass = new GpuSimPass(
      res,
      res,
      DENSITY_ADVECTION_FRAG,
      {
        uDensity: { value: null },
        uVelocity: { value: null },
        uCellSize: { value: cellSize },
        uColor: { value: new THREE.Vector3(splatCol.r, splatCol.g, splatCol.b) },
        uMouse: { value: this.mousePos },
        uPrevMouse: { value: this.prevMousePos },
        uMouseVelocity: { value: this.mouseVelocity },
        uMouseRadius: { value: this.options.mouseRadius },
        uDissipation: { value: this.options.densityDissipation },
        uSplatIntensity: { value: this.options.splatIntensity },
      },
      true
    );

    // 3. Divergence Pass (Single-Buffered)
    this.divergencePass = new GpuSimPass(
      res,
      res,
      DIVERGENCE_FRAG,
      {
        uVelocity: { value: null },
        uCellSize: { value: cellSize },
        uViscosity: { value: this.options.viscosity },
      },
      false
    );

    // 4. Jacobi Pressure Poisson Pass (Ping-Pong)
    this.pressurePass = new GpuSimPass(
      res,
      res,
      JACOBI_PRESSURE_FRAG,
      {
        uTexture: { value: null },
        uDivergence: { value: null },
        uCellSize: { value: cellSize },
        uAlpha: { value: -1.0 },
        uBeta: { value: 0.25 },
      },
      true
    );

    // 5. Subtract Pressure Gradient Pass (Single-Buffered)
    this.subtractGradientPass = new GpuSimPass(
      res,
      res,
      SUBTRACT_GRADIENT_FRAG,
      {
        uPressure: { value: null },
        uVelocity: { value: null },
        uCellSize: { value: cellSize },
      },
      false
    );
  }

  /**
   * Registers pointer coordinates in normalized UV space [0..1]
   */
  public addPointerForce(uvX: number, uvY: number, forceMultiplier = 1.0): void {
    if (this.prevMousePos.x < 0) {
      this.prevMousePos.set(uvX, uvY);
    }

    const dx = uvX - this.prevMousePos.x;
    const dy = uvY - this.prevMousePos.y;

    this.mousePos.set(uvX, uvY);
    this.mouseVelocity.set(dx, dy);

    this.forceVector.set(
      dx * this.options.force * forceMultiplier,
      dy * this.options.force * forceMultiplier
    );

    this.prevMousePos.set(uvX, uvY);
    this.pointerMoved = true;
  }

  /**
   * Advances the 2D Navier-Stokes solver by one physics step
   */
  public step(renderer: THREE.WebGLRenderer): void {
    if (!this.pointerMoved) {
      this.mousePos.set(-1, -1);
      this.prevMousePos.set(-1, -1);
      this.forceVector.set(0, 0);
      this.mouseVelocity.set(0, 0);
    }
    this.pointerMoved = false;

    // --- Step 1: Advect & Splat Velocity ---
    this.velocityPass.material.uniforms.uTexture.value = this.velocityPass.texture;
    this.velocityPass.render(renderer);

    // --- Step 2: Advect & Splat Density Dye ---
    this.densityPass.material.uniforms.uDensity.value = this.densityPass.texture;
    this.densityPass.material.uniforms.uVelocity.value = this.velocityPass.texture;
    this.densityPass.render(renderer);

    // --- Step 3: Compute Divergence nabla . u ---
    this.divergencePass.material.uniforms.uVelocity.value = this.velocityPass.texture;
    this.divergencePass.render(renderer);

    // --- Step 4: Jacobi Pressure Relaxation (10-20 iterations) ---
    this.pressurePass.material.uniforms.uDivergence.value = this.divergencePass.texture;
    for (let i = 0; i < this.options.iterations; i++) {
      this.pressurePass.material.uniforms.uTexture.value = this.pressurePass.texture;
      this.pressurePass.render(renderer);
    }

    // --- Step 5: Subtract Pressure Gradient: u = u - nabla p ---
    this.subtractGradientPass.material.uniforms.uPressure.value = this.pressurePass.texture;
    this.subtractGradientPass.material.uniforms.uVelocity.value = this.velocityPass.texture;
    this.subtractGradientPass.render(renderer);

    // Feed mass-conserved velocity back into velocity buffer
    this.velocityPass.readTarget = this.subtractGradientPass.readTarget;
  }

  public get velocityTexture(): THREE.Texture {
    return this.subtractGradientPass.texture;
  }

  public get densityTexture(): THREE.Texture {
    return this.densityPass.texture;
  }

  public reset(): void {
    this.mousePos.set(-1, -1);
    this.prevMousePos.set(-1, -1);
    this.forceVector.set(0, 0);
    this.mouseVelocity.set(0, 0);
    this.pointerMoved = false;
  }

  public dispose(): void {
    this.velocityPass.dispose();
    this.densityPass.dispose();
    this.divergencePass.dispose();
    this.pressurePass.dispose();
    this.subtractGradientPass.dispose();
  }
}

// ----------------------------------------------------------------------------
// Architectural Floor Reflection Mesh & Camera
// ----------------------------------------------------------------------------

export class ArchitecturalFloorReflector {
  public mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  public renderTarget: THREE.WebGLRenderTarget;
  public virtualCamera: THREE.PerspectiveCamera;
  public textureMatrix = new THREE.Matrix4();
  public ignoreObjects: THREE.Object3D[] = [];
  public enabled = true;

  private reflectorPlane = new THREE.Plane();
  private normal = new THREE.Vector3();
  private reflectorWorldPosition = new THREE.Vector3();
  private cameraWorldPosition = new THREE.Vector3();
  private rotationMatrix = new THREE.Matrix4();
  private lookAtPosition = new THREE.Vector3();
  private clipPlane = new THREE.Vector4();
  private view = new THREE.Vector3();
  private target = new THREE.Vector3();
  private upVector = new THREE.Vector3();
  private clipVector = new THREE.Vector4();

  constructor(
    geometry: THREE.PlaneGeometry,
    material: THREE.ShaderMaterial,
    resolution = 1024
  ) {
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2;

    this.virtualCamera = new THREE.PerspectiveCamera();

    this.renderTarget = new THREE.WebGLRenderTarget(resolution, resolution, {
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: true,
      stencilBuffer: false,
      generateMipmaps: false,
    });

    this.mesh.material.uniforms.uReflectionTexture.value = this.renderTarget.texture;
    this.mesh.material.uniforms.uTextureMatrix.value = this.textureMatrix;
  }

  public renderReflection(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ): void {
    if (!this.enabled) return;

    // 1. Calculate World Positions & Normals
    this.reflectorWorldPosition.setFromMatrixPosition(this.mesh.matrixWorld);
    this.cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);

    this.rotationMatrix.extractRotation(this.mesh.matrixWorld);
    this.normal.set(0, 0, 1).applyMatrix4(this.rotationMatrix).normalize();

    // 2. View Vector Reflection
    this.view.subVectors(this.reflectorWorldPosition, this.cameraWorldPosition);
    if (this.view.dot(this.normal) > 0) {
      // Camera is behind the reflector plane
      return;
    }

    this.view.reflect(this.normal).negate().add(this.reflectorWorldPosition);
    this.virtualCamera.position.copy(this.view);

    // 3. LookAt Target Reflection
    this.lookAtPosition.set(0, 0, -1).applyMatrix4(camera.matrixWorld);
    this.target.subVectors(this.reflectorWorldPosition, this.lookAtPosition);
    this.target.reflect(this.normal).negate().add(this.reflectorWorldPosition);

    // 4. Up Vector Reflection
    this.upVector.set(0, 1, 0).applyMatrix4(camera.matrixWorld).sub(this.cameraWorldPosition);
    this.upVector.reflect(this.normal);
    this.virtualCamera.up.copy(this.upVector);

    this.virtualCamera.lookAt(this.target);
    const persCam = camera as THREE.PerspectiveCamera;
    this.virtualCamera.near = persCam.near || 0.1;
    this.virtualCamera.far = persCam.far || 1000;
    this.virtualCamera.updateMatrixWorld();
    this.virtualCamera.projectionMatrix.copy(persCam.projectionMatrix);

    // 5. Oblique Near-Plane Clipping
    this.reflectorPlane.setFromNormalAndCoplanarPoint(this.normal, this.reflectorWorldPosition);
    this.reflectorPlane.applyMatrix4(this.virtualCamera.matrixWorldInverse);
    this.clipPlane.set(
      this.reflectorPlane.normal.x,
      this.reflectorPlane.normal.y,
      this.reflectorPlane.normal.z,
      this.reflectorPlane.constant
    );

    const proj = this.virtualCamera.projectionMatrix.elements;
    this.clipVector.x = (Math.sign(this.clipPlane.x) + proj[8]) / proj[0];
    this.clipVector.y = (Math.sign(this.clipPlane.y) + proj[9]) / proj[5];
    this.clipVector.z = -1.0;
    this.clipVector.w = (1.0 + proj[10]) / proj[14];

    this.clipPlane.multiplyScalar(2.0 / this.clipPlane.dot(this.clipVector));
    proj[2] = this.clipPlane.x;
    proj[6] = this.clipPlane.y;
    proj[10] = this.clipPlane.z + 1.0 - 0.001;
    proj[14] = this.clipPlane.w;

    // 6. Projective Texture Matrix
    this.textureMatrix.set(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0
    );
    this.textureMatrix.multiply(this.virtualCamera.projectionMatrix);
    this.textureMatrix.multiply(this.virtualCamera.matrixWorldInverse);
    this.textureMatrix.multiply(this.mesh.matrixWorld);

    // 7. Render Pass
    const prevRt = renderer.getRenderTarget();
    const prevAutoClear = renderer.autoClear;

    this.mesh.visible = false;
    for (const obj of this.ignoreObjects) {
      obj.visible = false;
    }

    renderer.setRenderTarget(this.renderTarget);
    renderer.autoClear = true;
    renderer.clear();
    renderer.render(scene, this.virtualCamera);

    this.mesh.visible = true;
    for (const obj of this.ignoreObjects) {
      obj.visible = true;
    }

    renderer.setRenderTarget(prevRt);
    renderer.autoClear = prevAutoClear;
  }

  public setSize(width: number, height: number): void {
    this.renderTarget.setSize(width, height);
  }

  public dispose(): void {
    this.renderTarget.dispose();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.ignoreObjects.length = 0;
  }
}

// ----------------------------------------------------------------------------
// Main Factory: createFluidGround
// ----------------------------------------------------------------------------

export function createFluidGround(options: FluidGroundOptions = {}): FluidGroundHandle {
  const [sizeX, sizeY] = options.size ?? [28, 28];
  const [posX, posY, posZ] = options.position ?? [0, 0, 0];
  const baseColor = new THREE.Color(options.baseColor ?? '#080808');
  const bronzeColor = new THREE.Color(options.bronzeColor ?? '#A77C4D');
  const enablePlanar = options.enablePlanarReflection ?? true;
  const resolution = options.reflectionResolution ?? 1024;

  // Initialize Navier-Stokes Fluid Solver
  const fluid = new NavierStokesFluidSolver(options.fluid);

  // Initialize Floor Reflection Plane Geometry & Material
  const geometry = new THREE.PlaneGeometry(sizeX, sizeY, 1, 1);
  const uniforms = {
    uReflectionTexture: { value: null as THREE.Texture | null },
    uTextureMatrix: { value: new THREE.Matrix4() },
    uFluidTexture: { value: fluid.velocityTexture },
    uFluidDensity: { value: fluid.densityTexture },
    uAOTexture: { value: options.aoMap ?? null },
    uHasAO: { value: Boolean(options.aoMap) },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uColor: { value: baseColor },
    uBronzeColor: { value: bronzeColor },
    uReflectionIntensity: { value: options.reflectionIntensity ?? 0.45 },
    uDistortionAmount: { value: options.distortionAmount ?? 0.035 },
    uTime: { value: 0 },
    uDusk: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: FLOOR_VERTEX_SHADER,
    fragmentShader: FLOOR_FRAGMENT_SHADER,
    uniforms,
    transparent: false,
    depthWrite: true,
  });

  const reflector = new ArchitecturalFloorReflector(geometry, material, resolution);
  reflector.enabled = enablePlanar;
  reflector.mesh.position.set(posX, posY, posZ);

  // Setup Raycaster for Interactive Pointer Picking
  const raycaster = new THREE.Raycaster();
  const ndcPointer = new THREE.Vector2(-999, -999);

  const raycastPointer = (ndcX: number, ndcY: number, camera: THREE.Camera): boolean => {
    ndcPointer.set(ndcX, ndcY);
    raycaster.setFromCamera(ndcPointer, camera);
    const intersects = raycaster.intersectObject(reflector.mesh);
    if (intersects.length > 0 && intersects[0].uv) {
      const uv = intersects[0].uv;
      fluid.addPointerForce(uv.x, uv.y);
      return true;
    }
    return false;
  };

  const onPointerMove = (uvX: number, uvY: number): void => {
    fluid.addPointerForce(uvX, uvY);
  };

  const update = (
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    timeSec: number,
    _deltaSec: number
  ): void => {
    // 1. Advance Navier-Stokes fluid physics simulation on GPU
    fluid.step(renderer);

    // 2. Synchronize fluid textures and uniforms
    uniforms.uFluidTexture.value = fluid.velocityTexture;
    uniforms.uFluidDensity.value = fluid.densityTexture;
    uniforms.uTime.value = timeSec;

    const canvas = renderer.domElement;
    if (canvas) {
      uniforms.uResolution.value.set(canvas.width, canvas.height);
    }

    // 3. Render real-time planar floor reflection pass
    reflector.renderReflection(renderer, scene, camera);
  };

  const setDusk = (v: number): void => {
    uniforms.uDusk.value = Math.max(0, Math.min(1, v));
  };

  const setPlanarReflection = (enabled: boolean): void => {
    reflector.enabled = enabled;
  };

  const dispose = (): void => {
    reflector.dispose();
    fluid.dispose();
  };

  return {
    mesh: reflector.mesh,
    fluid,
    update,
    onPointerMove,
    raycastPointer,
    setDusk,
    setPlanarReflection,
    dispose,
  };
}
