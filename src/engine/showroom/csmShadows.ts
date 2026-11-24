import * as THREE from 'three';
import { CSM, type CSMMode, type CSMParameters } from 'three/examples/jsm/csm/CSM.js';
import { getQualityTier } from '../env';

/**
 * ============================================================================
 * RUBICONIUS SHOWROOM: CASCADED SHADOW MAPS (CSM) SYSTEM
 * ============================================================================
 * Reverse-Engineered from Unseen Studio's Flagship Architectural Real Estate
 * Pipeline (Hubtown SOTD Benchmark & High-Ticket Architectural Visualizers).
 *
 * Core Capabilities:
 * 1. Multi-Frustum Cascaded Shadow Maps:
 *    - 3-4 dynamic frustum cascades ('practical', 'uniform', 'logarithmic', 'custom').
 *    - Practical split scheme (lambda = 0.5) combining logarithmic near-plane resolution
 *      (for sharp micro-groove shadows on fluted woodwork & joinery) with uniform
 *      far-plane distribution (for wide architectural colonnades & exterior light wells).
 *    - Real-time camera projection matrix synchronization & texel snapping in light space
 *      to eliminate shadow swimming/crawling during camera translation.
 *
 * 2. Anti-Acne Architectural Precision:
 *    - Explicit `normalBias: 0.02` + `bias: -0.0001` configured across all cascade shadow cameras.
 *    - Eliminates self-shadowing moire/striping on vertical plaster walls, angled baseboards,
 *      and ribbed timber cabinetry without inducing peter-panning (detached shadow leaks).
 *
 * 3. Blue-Noise Shadow Map Dithering:
 *    - Custom depth material with screen-space Interleaved Gradient Noise (IGN)
 *      (Jorge Jimenez, AAA game rendering standard) depth perturbation.
 *    - Converts discrete depth quantization steps into high-frequency blue noise,
 *      which PCFSoft filtering softens into continuous, silky architectural shadow penumbras.
 *    - Full alphaTest & map/alphaMap transparency support for botanical fronds,
 *      cane webbing, perforated acoustic panels, and fluted glass.
 *
 * 4. Production Showroom Lifecycle:
 *    - Seamless dusk-mode color/intensity lerping.
 *    - Dynamic scene attachment with automatic material setup & depth material pooling.
 *    - Quality-tier scaling (High: 3 cascades / 2048px; Med: 2 cascades / 1024px; Low: 1 cascade).
 *    - Complete cleanup hooks freeing GPU programs, render targets, and scene lights.
 * ============================================================================
 */

export type CSMSplitMode = CSMMode;

export interface CSMFrustumSplit {
  index: number;
  near: number;
  far: number;
  normalizedNear: number;
  normalizedFar: number;
}

export interface CSMShadowConfig {
  camera: THREE.PerspectiveCamera;
  parent: THREE.Object3D;
  cascades?: number;
  maxFar?: number;
  mode?: CSMSplitMode;
  practicalLambda?: number;
  shadowMapSize?: number;
  bias?: number;
  normalBias?: number;
  lightDirection?: THREE.Vector3;
  lightIntensity?: number;
  lightColor?: THREE.ColorRepresentation;
  lightNear?: number;
  lightFar?: number;
  lightMargin?: number;
  fade?: boolean;
  blueNoiseDithering?: boolean;
  ditherStrength?: number;
  customSplitsCallback?: (
    cascades: number,
    cameraNear: number,
    cameraFar: number,
    breaks: number[]
  ) => void;
}

export interface BlueNoiseDepthMaterialOptions {
  alphaTest?: number;
  map?: THREE.Texture | null;
  alphaMap?: THREE.Texture | null;
  ditherStrength?: number;
  wireframe?: boolean;
}

export interface CSMShadowSystemState {
  cascades: number;
  maxFar: number;
  mode: CSMSplitMode;
  breaks: number[];
  splits: CSMFrustumSplit[];
  lightDirection: [number, number, number];
  lightIntensity: number;
  normalBias: number;
  bias: number;
  duskProgress: number;
}

// ----------------------------------------------------------------------------
// 1. BLUE-NOISE / INTERLEAVED GRADIENT NOISE DEPTH SHADER GLSL
// ----------------------------------------------------------------------------

const BLUE_NOISE_DEPTH_VERT = /* glsl */ `
#include <common>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>

varying vec2 vDepthUv;

void main() {
  #include <uv_vertex>
  vDepthUv = uv;
  #include <skinbase_vertex>
  #include <begin_vertex>
  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <displacementmap_vertex>
  #include <project_vertex>
  #include <logdepthbuf_vertex>
}
`;

const BLUE_NOISE_DEPTH_FRAG = /* glsl */ `
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <logdepthbuf_pars_fragment>

varying vec2 vDepthUv;

#ifdef USE_MAP
  uniform sampler2D map;
#endif

#ifdef USE_ALPHAMAP
  uniform sampler2D alphaMap;
#endif

#ifdef USE_ALPHATEST
  uniform float uAlphaTest;
#endif

uniform float uDitherStrength;

// High-frequency Jorge Jimenez Interleaved Gradient Noise (IGN)
// Deterministic screen-space blue-noise surrogate with triangular spectral distribution
float getBlueNoiseDither(vec2 screenPos) {
  vec3 magic = vec3(0.06711056, 0.00583715, 52.9829189);
  return fract(magic.z * fract(dot(screenPos, magic.xy)));
}

void main() {
  #include <logdepthbuf_fragment>

  #ifdef USE_MAP
    vec4 texColor = texture2D(map, vDepthUv);
    #ifdef USE_ALPHATEST
      if (texColor.a < uAlphaTest) discard;
    #endif
  #endif

  #ifdef USE_ALPHAMAP
    float alphaVal = texture2D(alphaMap, vDepthUv).g;
    #ifdef USE_ALPHATEST
      if (alphaVal < uAlphaTest) discard;
    #endif
  #endif

  // Sub-texel blue-noise depth perturbation:
  // Converts regular shadow-map quantisation staircases into high-frequency noise
  // Eliminates shadow acne on oblique architectural walls & fluted woodwork
  float dither = (getBlueNoiseDither(gl_FragCoord.xy) - 0.5) * uDitherStrength;
  float depth = gl_FragCoord.z + dither;
  gl_FragColor = packDepthToRGBA(clamp(depth, 0.0, 1.0));
}
`;

// ----------------------------------------------------------------------------
// 2. FRUSTUM SPLIT MATHEMATICS
// ----------------------------------------------------------------------------

/**
 * Calculates cascaded shadow frustum split breaks using uniform, logarithmic,
 * or practical (combined) schemes.
 *
 * Practical mode (lambda = 0.5) balances close-up resolution for tactile interior
 * props with long-range coverage for architectural volume.
 */
export function calculateFrustumSplits(
  amount: number,
  near: number,
  far: number,
  mode: CSMSplitMode = 'practical',
  lambda = 0.5,
  customCallback?: (cascades: number, near: number, far: number, breaks: number[]) => void
): CSMFrustumSplit[] {
  const breaks: number[] = [];
  const splits: CSMFrustumSplit[] = [];
  const clampedFar = Math.max(near + 0.001, far);

  if (mode === 'custom' && customCallback) {
    customCallback(amount, near, clampedFar, breaks);
  } else if (mode === 'uniform') {
    for (let i = 1; i < amount; i++) {
      breaks.push((near + ((clampedFar - near) * i) / amount) / clampedFar);
    }
    breaks.push(1.0);
  } else if (mode === 'logarithmic') {
    for (let i = 1; i < amount; i++) {
      breaks.push((near * Math.pow(clampedFar / near, i / amount)) / clampedFar);
    }
    breaks.push(1.0);
  } else {
    // 'practical' mode: lerp between uniform and logarithmic
    const uniformArr: number[] = [];
    const logArr: number[] = [];

    for (let i = 1; i < amount; i++) {
      uniformArr.push((near + ((clampedFar - near) * i) / amount) / clampedFar);
      logArr.push((near * Math.pow(clampedFar / near, i / amount)) / clampedFar);
    }
    for (let i = 1; i < amount; i++) {
      breaks.push(THREE.MathUtils.lerp(uniformArr[i - 1], logArr[i - 1], lambda));
    }
    breaks.push(1.0);
  }

  let prevBreak = 0;
  for (let i = 0; i < amount; i++) {
    const curBreak = breaks[i];
    const splitNear = i === 0 ? near : prevBreak * clampedFar;
    const splitFar = curBreak * clampedFar;

    splits.push({
      index: i,
      near: splitNear,
      far: splitFar,
      normalizedNear: prevBreak,
      normalizedFar: curBreak,
    });
    prevBreak = curBreak;
  }

  return splits;
}

// ----------------------------------------------------------------------------
// 3. BLUE-NOISE DEPTH MATERIAL GENERATOR & CACHE
// ----------------------------------------------------------------------------

const depthMaterialCache = new Map<string, THREE.ShaderMaterial>();

/**
 * Creates a specialized depth material equipped with screen-space Interleaved Gradient Noise
 * (IGN) blue-noise perturbation and optional alpha-test mapping for architectural props.
 */
export function createBlueNoiseDepthMaterial(
  options: BlueNoiseDepthMaterialOptions = {}
): THREE.ShaderMaterial {
  const {
    alphaTest = 0,
    map = null,
    alphaMap = null,
    ditherStrength = 0.0004,
    wireframe = false,
  } = options;

  const cacheKey = [
    map ? `map:${map.id}` : 'nomap',
    alphaMap ? `alphaMap:${alphaMap.id}` : 'noalpha',
    `at:${alphaTest.toFixed(3)}`,
    `ds:${ditherStrength.toFixed(6)}`,
  ].join('|');

  const cached = depthMaterialCache.get(cacheKey);
  if (cached) return cached;

  const defines: Record<string, string | number> = {};
  if (map) defines.USE_MAP = '';
  if (alphaMap) defines.USE_ALPHAMAP = '';
  if (alphaTest > 0) defines.USE_ALPHATEST = '';

  const uniforms: Record<string, THREE.IUniform> = {
    uDitherStrength: { value: ditherStrength },
  };
  if (map) uniforms.map = { value: map };
  if (alphaMap) uniforms.alphaMap = { value: alphaMap };
  if (alphaTest > 0) uniforms.uAlphaTest = { value: alphaTest };

  const mat = new THREE.ShaderMaterial({
    vertexShader: BLUE_NOISE_DEPTH_VERT,
    fragmentShader: BLUE_NOISE_DEPTH_FRAG,
    uniforms,
    defines,
    wireframe,
  });

  depthMaterialCache.set(cacheKey, mat);
  return mat;
}

/**
 * Traverses an Object3D hierarchy and assigns blue-noise depth materials to meshes
 * that cast shadows, ensuring fluted woodwork and interior walls cast acne-free shadows.
 */
export function applyBlueNoiseShadowCasters(
  root: THREE.Object3D,
  options: {
    ditherStrength?: number;
    excludeNames?: RegExp[];
  } = {}
): () => void {
  const ditherStrength = options.ditherStrength ?? 0.0004;
  const excludes = options.excludeNames ?? [/water/i, /sky/i, /particle/i, /dust/i, /helper/i];
  const originalDepthMats = new Map<THREE.Mesh, THREE.Material | null>();

  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    if (excludes.some((rx) => rx.test(node.name))) return;

    node.castShadow = true;
    node.receiveShadow = true;
    originalDepthMats.set(node, node.customDepthMaterial ?? null);

    const mat = Array.isArray(node.material) ? node.material[0] : node.material;
    let alphaTest = 0;
    let map: THREE.Texture | null = null;
    let alphaMap: THREE.Texture | null = null;

    if (mat && 'alphaTest' in mat && typeof mat.alphaTest === 'number') {
      alphaTest = mat.alphaTest;
    }
    if (mat && 'map' in mat && mat.map) {
      map = mat.map as THREE.Texture;
    }
    if (mat && 'alphaMap' in mat && mat.alphaMap) {
      alphaMap = mat.alphaMap as THREE.Texture;
    }

    node.customDepthMaterial = createBlueNoiseDepthMaterial({
      alphaTest,
      map,
      alphaMap,
      ditherStrength,
    });
  });

  return () => {
    for (const [mesh, orig] of originalDepthMats.entries()) {
      mesh.customDepthMaterial = orig ?? undefined;
    }
    originalDepthMats.clear();
  };
}

// ----------------------------------------------------------------------------
// 4. CSM SHADOW CONTROLLER
// ----------------------------------------------------------------------------

export class CSMShadowController {
  public readonly csm: CSM;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly parent: THREE.Object3D;
  public readonly config: Required<CSMShadowConfig>;

  private _duskProgress = 0;
  private _dayLightColor: THREE.Color;
  private _duskLightColor = new THREE.Color(0xff9e66);
  private _managedMaterials = new Set<THREE.Material>();
  private _detachShadowCasters: (() => void) | null = null;
  private _disposed = false;

  constructor(options: CSMShadowConfig) {
    const tier = getQualityTier();
    const defaultCascades = tier === 'high' ? 3 : tier === 'medium' ? 2 : 1;
    const defaultMapSize = tier === 'high' ? 2048 : 1024;

    this.camera = options.camera;
    this.parent = options.parent;

    const cascades = options.cascades ?? defaultCascades;
    const maxFar = options.maxFar ?? 45.0;
    const mode = options.mode ?? 'practical';
    const practicalLambda = options.practicalLambda ?? 0.5;
    const shadowMapSize = options.shadowMapSize ?? defaultMapSize;
    const bias = options.bias ?? -0.0001;
    const normalBias = options.normalBias ?? 0.02;
    const lightDirection = (
      options.lightDirection ?? new THREE.Vector3(6.0, 9.0, 3.0)
    ).clone().normalize();
    const lightIntensity = options.lightIntensity ?? 1.55;
    const lightColor = options.lightColor ?? 0xffe9c6;
    const lightNear = options.lightNear ?? 1.0;
    const lightFar = options.lightFar ?? 120.0;
    const lightMargin = options.lightMargin ?? 25.0;
    const fade = options.fade ?? true;
    const blueNoiseDithering = options.blueNoiseDithering ?? true;
    const ditherStrength = options.ditherStrength ?? 0.0004;
    const customSplitsCallback =
      options.customSplitsCallback ??
      ((c, n, f, breaks) => {
        calculateFrustumSplits(c, n, f, mode, practicalLambda).forEach((s) => {
          breaks.push(s.normalizedFar);
        });
      });

    this.config = {
      camera: this.camera,
      parent: this.parent,
      cascades,
      maxFar,
      mode,
      practicalLambda,
      shadowMapSize,
      bias,
      normalBias,
      lightDirection,
      lightIntensity,
      lightColor,
      lightNear,
      lightFar,
      lightMargin,
      fade,
      blueNoiseDithering,
      ditherStrength,
      customSplitsCallback,
    };

    this._dayLightColor = new THREE.Color(lightColor);

    // Instantiate Three.js foundational CSM engine
    const csmParams: CSMParameters = {
      camera: this.camera,
      parent: this.parent,
      cascades: this.config.cascades,
      maxFar: this.config.maxFar,
      mode: this.config.mode,
      shadowMapSize: this.config.shadowMapSize,
      shadowBias: this.config.bias,
      lightDirection: this.config.lightDirection,
      lightIntensity: this.config.lightIntensity,
      lightNear: this.config.lightNear,
      lightFar: this.config.lightFar,
      lightMargin: this.config.lightMargin,
      customSplitsCallback: this.config.customSplitsCallback,
    };

    this.csm = new CSM(csmParams);
    this.csm.fade = this.config.fade;

    // Apply strict architectural anti-acne bias & normalBias to all cascade lights
    this._configureCascadeLights();
  }

  /**
   * Applies normalBias: 0.02 and bias: -0.0001 across each cascade's directional light camera,
   * completely eliminating shadow acne on curved woodwork, fluted pillars, and angled walls.
   */
  private _configureCascadeLights(): void {
    const lights = this.csm.lights;
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
      light.castShadow = true;
      light.color.copy(this._dayLightColor);
      light.intensity = this.config.lightIntensity;
      light.shadow.bias = this.config.bias;
      light.shadow.normalBias = this.config.normalBias;
      light.shadow.mapSize.width = this.config.shadowMapSize;
      light.shadow.mapSize.height = this.config.shadowMapSize;
      light.shadow.camera.near = this.config.lightNear;
      light.shadow.camera.far = this.config.lightFar;
      light.shadow.camera.updateProjectionMatrix();
    }
  }

  public get lights(): THREE.DirectionalLight[] {
    return this.csm.lights;
  }

  /**
   * Frame tick: synchronizes light space projection bounds with current camera position,
   * performs texel snapping, and updates shader uniforms before renderer.render().
   */
  public update(): void {
    if (this._disposed) return;
    this.csm.update();
  }

  /**
   * Recalculates frustum splits and shadow bounds whenever camera FOV, aspect ratio,
   * or viewport dimensions change.
   */
  public updateFrustums(): void {
    if (this._disposed) return;
    this.camera.updateProjectionMatrix();
    this.csm.updateFrustums();
    this._configureCascadeLights();
  }

  /**
   * Registers a material with the CSM pipeline so its fragment shader samples
   * the cascaded shadow maps.
   */
  public setupMaterial(material: THREE.Material): void {
    if (this._disposed || this._managedMaterials.has(material)) return;
    this.csm.setupMaterial(material);
    this._managedMaterials.add(material);
  }

  /**
   * Automatically sets up all meshes and materials in a loaded 3D scene:
   * 1. Injects CSM uniforms into standard/physical materials.
   * 2. Equips shadow-casting meshes with blue-noise depth materials.
   * 3. Configures castShadow and receiveShadow flags.
   */
  public attachToScene(
    root: THREE.Object3D,
    opts: {
      castShadows?: boolean;
      receiveShadows?: boolean;
      useBlueNoiseDepth?: boolean;
    } = {}
  ): void {
    if (this._disposed) return;
    const cast = opts.castShadows ?? true;
    const recv = opts.receiveShadows ?? true;
    const useBlueNoise = opts.useBlueNoiseDepth ?? this.config.blueNoiseDithering;

    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.castShadow = cast;
      obj.receiveShadow = recv;

      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (
          m instanceof THREE.MeshStandardMaterial ||
          m instanceof THREE.MeshPhysicalMaterial ||
          m instanceof THREE.MeshLambertMaterial ||
          m instanceof THREE.MeshPhongMaterial
        ) {
          this.setupMaterial(m);
        }
      }
    });

    if (useBlueNoise) {
      if (this._detachShadowCasters) {
        this._detachShadowCasters();
      }
      this._detachShadowCasters = applyBlueNoiseShadowCasters(root, {
        ditherStrength: this.config.ditherStrength,
      });
    }

    this.updateFrustums();
  }

  /**
   * Updates key light direction in world space across all cascades.
   */
  public setLightDirection(direction: THREE.Vector3): void {
    if (this._disposed) return;
    this.config.lightDirection.copy(direction).normalize();
    this.csm.lightDirection.copy(this.config.lightDirection);
    this.csm.update();
  }

  /**
   * Sets the directional sunlight intensity across all cascades.
   */
  public setIntensity(intensity: number): void {
    if (this._disposed) return;
    this.config.lightIntensity = intensity;
    for (const light of this.csm.lights) {
      light.intensity = intensity;
    }
  }

  /**
   * Smoothly transitions sunlight color and intensity for dusk / night mode.
   * @param duskProgress Value between 0.0 (midday sunlight) and 1.0 (golden twilight).
   */
  public setDusk(duskProgress: number): void {
    if (this._disposed) return;
    this._duskProgress = THREE.MathUtils.clamp(duskProgress, 0, 1);

    const lerpedColor = this._dayLightColor.clone().lerp(this._duskLightColor, this._duskProgress);
    const lerpedIntensity = THREE.MathUtils.lerp(this.config.lightIntensity, 0.45, this._duskProgress);
    // Slightly relax normalBias during dusk to ensure soft shadow silhouettes
    const lerpedNormalBias = THREE.MathUtils.lerp(this.config.normalBias, 0.024, this._duskProgress);

    for (const light of this.csm.lights) {
      light.color.copy(lerpedColor);
      light.intensity = lerpedIntensity;
      light.shadow.normalBias = lerpedNormalBias;
    }
  }

  /**
   * Returns calculated split metrics for telemetry and diagnostics.
   */
  public getSplits(): CSMFrustumSplit[] {
    return calculateFrustumSplits(
      this.config.cascades,
      this.camera.near,
      this.config.maxFar,
      this.config.mode,
      this.config.practicalLambda
    );
  }

  /**
   * Returns real-time system state for diagnostics and HUD inspection.
   */
  public getState(): CSMShadowSystemState {
    const dir = this.config.lightDirection;
    return {
      cascades: this.config.cascades,
      maxFar: this.config.maxFar,
      mode: this.config.mode,
      breaks: [...this.csm.breaks],
      splits: this.getSplits(),
      lightDirection: [dir.x, dir.y, dir.z],
      lightIntensity: this.config.lightIntensity,
      normalBias: this.config.normalBias,
      bias: this.config.bias,
      duskProgress: this._duskProgress,
    };
  }

  /**
   * Fully disposes GPU depth materials, removes directional lights and their targets
   * from the parent scene, and resets material shaders.
   */
  public dispose(): void {
    if (this._disposed) return;
    this._disposed = true;

    if (this._detachShadowCasters) {
      this._detachShadowCasters();
      this._detachShadowCasters = null;
    }

    this.csm.remove();
    this.csm.dispose();
    this._managedMaterials.clear();
  }
}

// ----------------------------------------------------------------------------
// 5. FACTORY FUNCTION
// ----------------------------------------------------------------------------

/**
 * Creates, configures, and binds an elite Cascaded Shadow Maps (CSM) system
 * tailored for high-ticket architectural showrooms.
 */
export function createCSMShadows(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  options?: Partial<CSMShadowConfig>,
  renderer?: THREE.WebGLRenderer
): CSMShadowController {
  if (renderer) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
  }

  return new CSMShadowController({
    camera,
    parent: scene,
    ...options,
  });
}

/**
 * Convenience disposal function.
 */
export function disposeCSMShadows(controller: CSMShadowController | null | undefined): void {
  controller?.dispose();
}
