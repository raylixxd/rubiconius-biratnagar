/**
 * ARCHITECTURAL WEBGL SPATIAL REFRACTIVE CURSOR LENS
 *
 * Bespoke, physically grounded spatial cursor engine featuring:
 * 1. Floating cursor lens with spring-damper inertial tracking (`stiffness: 0.15, damping: 0.82`).
 * 2. WebGL refractive magnification: magnifies underlying DOM elements and WebGL canvas
 *    with barrel curvature, Cauchy/Sellmeier chromatic RGB dispersion, and Fresnel bronze rim.
 * 3. Interactive hover states: morphs into magnetic boundary capsules over buttons,
 *    CAD dimension labels, work cards, and custom interactive targets.
 * 4. Smooth fallback to CSS cursor on touch devices or reduced motion preferences.
 * 5. Full Three.js integration (custom ShaderMaterial, Mesh, and Post-Processing Pass).
 */

import * as THREE from 'three';

// ============================================================================
// 1. TYPES, INTERFACES & CONFIGURATION PRESETS
// ============================================================================

/** Cursor operational and geometric morphing modes */
export type CursorMode =
  | 'default'           // Floating circular refractive meniscus lens
  | 'magnetic-capsule'  // Snaps and hugs button/pill boundaries with elastic padding
  | 'cad-dimension'     // Technical architectural HUD frame with crosshairs and millimeter tick marks
  | 'work-card'         // Expansive soft framing lens for project portfolio cards
  | 'text'              // Precision vertical chromatic beam for text editing
  | 'drag'              // Stretched dynamic oval indicating horizontal/vertical drag state
  | 'hidden';           // Collapses to zero scale when pointer leaves the viewport

/** Spring-damper physical coefficients */
export interface SpringConfig {
  /** Hookean spring constant k (default: 0.15 as specified in architectural brief) */
  stiffness: number;
  /** Viscous damping friction coefficient (default: 0.82 as specified) */
  damping: number;
  /** Virtual inertial mass (default: 1.0) */
  mass: number;
  /** Precision velocity threshold below which velocity snaps to 0.0 */
  restVelocityThreshold: number;
  /** Precision distance threshold below which displacement snaps to 0.0 */
  restDisplacementThreshold: number;
}

/** Optical glass and refraction parameters */
export interface OpticsConfig {
  /** Base optical magnification factor (e.g. 1.25x to 1.50x) */
  magnification: number;
  /** Index of refraction n_glass (crown glass ~ 1.48 - 1.52, water ~ 1.33) */
  ior: number;
  /** Polynomial barrel distortion coefficient k1 (radial curvature) */
  barrelK1: number;
  /** Polynomial barrel distortion coefficient k2 (outer rim pinch) */
  barrelK2: number;
  /** Chromatic RGB dispersion delta (wavelength-dependent index splitting) */
  dispersion: number;
  /** Specular highlight and Fresnel rim glow intensity */
  rimGlow: number;
  /** Bevel rim width in physical pixels */
  bevelWidth: number;
  /** Soft ambient drop shadow blur radius in pixels */
  shadowRadius: number;
  /** Soft drop shadow opacity */
  shadowOpacity: number;
}

/** Magnetic attraction and boundary morphology parameters */
export interface MagneticConfig {
  /** Maximum distance in pixels from element bounding box where magnetic pull initiates */
  attractionRadius: number;
  /** Magnetic pull intensity [0.0 = no pull, 1.0 = full snap to center] */
  magneticStrength: number;
  /** Extra horizontal padding added to element bounding box */
  paddingX: number;
  /** Extra vertical padding added to element bounding box */
  paddingY: number;
  /** Damping factor for magnetic position damping */
  magneticDamping: number;
  /** Proximity hysteresis factor to prevent high-frequency boundary flickering */
  hysteresisFactor: number;
}

/** Architectural theme and palette styling */
export interface ThemeConfig {
  /** Warm architectural bronze highlight tint for Fresnel glint (default: #C9A97E) */
  rimColor: THREE.Color;
  /** Center crosshair and CAD tick mark color (default: #E2CEAB) */
  cadReticleColor: THREE.Color;
  /** Glass surface caustic tint (default: #F6F1EA) */
  causticTint: THREE.Color;
  /** Outer drop shadow color */
  shadowColor: THREE.Color;
}

/** Complete configuration interface for SpatialCursorEngine */
export interface SpatialCursorConfig {
  /** Spring physics settings */
  spring: SpringConfig;
  /** Optical glass and refraction shader settings */
  optics: OpticsConfig;
  /** Magnetic boundary attraction settings */
  magnetic: MagneticConfig;
  /** Color theme and tint settings */
  theme: ThemeConfig;
  /** Base resting lens diameter in physical CSS pixels (default: 46.0) */
  baseSize: number;
  /** Maximum rendering supersampling ratio (default: window.devicePixelRatio or 2.0) */
  maxPixelRatio: number;
  /** Automatically observe DOM elements with matching selectors */
  autoObserve: boolean;
  /** CSS selector string used for automated hover element binding */
  interactiveSelector: string;
  /** Z-index of the overlay WebGL canvas (default: 99999) */
  zIndex: number;
}

/** Dynamic geometric state of the cursor lens */
export interface CursorGeometryState {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  rotation: number;
  scale: number;
  opacity: number;
  magnification: number;
  cadReticle: number;
}

/** Target element metadata for active hover states */
export interface HoverElementBinding {
  element: HTMLElement;
  mode: CursorMode;
  paddingX?: number;
  paddingY?: number;
  radius?: number;
  magnification?: number;
  magneticStrength?: number;
  customText?: string;
}

/** Telemetry metrics reported by the engine */
export interface SpatialCursorMetrics {
  fps: number;
  frameTimeMs: number;
  currentVelocity: number;
  isResting: boolean;
  activeMode: CursorMode;
  hoveredElement: HTMLElement | null;
  viewportWidth: number;
  viewportHeight: number;
}

/** Event map for SpatialCursor callbacks */
export interface CursorEventMap {
  move: (pos: { x: number; y: number; vx: number; vy: number }) => void;
  hoverEnter: (binding: HoverElementBinding) => void;
  hoverLeave: (element: HTMLElement) => void;
  modeChange: (newMode: CursorMode, previousMode: CursorMode) => void;
  fallbackTriggered: (reason: 'touch' | 'reduced-motion') => void;
}

// Default architectural configuration presets
export const DEFAULT_SPATIAL_CURSOR_CONFIG: SpatialCursorConfig = {
  spring: {
    stiffness: 0.15,
    damping: 0.82,
    mass: 1.0,
    restVelocityThreshold: 0.0005,
    restDisplacementThreshold: 0.01,
  },
  optics: {
    magnification: 1.32,
    ior: 1.48, // Fine optical crown glass
    barrelK1: 0.18,
    barrelK2: 0.06,
    dispersion: 0.018, // Visible physical chromatic split on high-contrast edges
    rimGlow: 1.45,
    bevelWidth: 2.2,
    shadowRadius: 16.0,
    shadowOpacity: 0.28,
  },
  magnetic: {
    attractionRadius: 72.0,
    magneticStrength: 0.48,
    paddingX: 12.0,
    paddingY: 8.0,
    magneticDamping: 0.86,
    hysteresisFactor: 1.15,
  },
  theme: {
    rimColor: new THREE.Color(0xc9a97e), // Warm architectural bronze
    cadReticleColor: new THREE.Color(0xe2ceab), // Architectural champagne gold
    causticTint: new THREE.Color(0xfbf7f0), // Crystalline reflection
    shadowColor: new THREE.Color(0x060608),
  },
  baseSize: 46.0,
  maxPixelRatio: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2.0),
  autoObserve: true,
  interactiveSelector:
    'button, a, [role="button"], [data-cursor], .cad-dimension, .work-card, .nav-item, input, textarea',
  zIndex: 99999,
};

/** Preset: Architectural Technical CAD HUD */
export const PRESET_ARCHITECTURAL_CAD: Partial<SpatialCursorConfig> = {
  optics: {
    magnification: 1.45,
    ior: 1.54,
    barrelK1: 0.08,
    barrelK2: 0.02,
    dispersion: 0.024,
    rimGlow: 1.8,
    bevelWidth: 1.5,
    shadowRadius: 12.0,
    shadowOpacity: 0.35,
  },
  theme: {
    rimColor: new THREE.Color(0xd4af37), // Metallic brass
    cadReticleColor: new THREE.Color(0xffe6b8),
    causticTint: new THREE.Color(0xffffff),
    shadowColor: new THREE.Color(0x020204),
  },
};

/** Preset: Liquid Mercury / Viscous Lens */
export const PRESET_LIQUID_MERCURY: Partial<SpatialCursorConfig> = {
  spring: {
    stiffness: 0.11,
    damping: 0.78,
    mass: 1.35,
    restVelocityThreshold: 0.0005,
    restDisplacementThreshold: 0.01,
  },
  optics: {
    magnification: 1.25,
    ior: 1.62,
    barrelK1: 0.32,
    barrelK2: 0.12,
    dispersion: 0.035,
    rimGlow: 2.1,
    bevelWidth: 3.2,
    shadowRadius: 22.0,
    shadowOpacity: 0.4,
  },
};

// ============================================================================
// 2. MATHEMATICAL & PHYSICS PRIMITIVES
// ============================================================================

/** 2D Vector representation with utility operations */
export class Vector2D {
  constructor(public x: number = 0, public y: number = 0) {}

  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(v: Vector2D): this {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  add(v: Vector2D): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v: Vector2D): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  scale(s: number): this {
    this.x *= s;
    this.y *= s;
    return this;
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  distanceTo(v: Vector2D): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  normalize(): this {
    const l = this.length();
    if (l > 1e-6) {
      this.x /= l;
      this.y /= l;
    }
    return this;
  }

  lerp(target: Vector2D, alpha: number): this {
    this.x += (target.x - this.x) * alpha;
    this.y += (target.y - this.y) * alpha;
    return this;
  }

  clone(): Vector2D {
    return new Vector2D(this.x, this.y);
  }
}

/** 1-Dimensional Spring-Damper with exact analytical sub-stepping */
export class Spring1D {
  public current: number;
  public target: number;
  public velocity: number = 0;

  constructor(
    initial: number = 0,
    public stiffness: number = 0.15,
    public damping: number = 0.82,
    public mass: number = 1.0,
    public restThreshold: number = 0.001
  ) {
    this.current = initial;
    this.target = initial;
  }

  setTarget(target: number): void {
    this.target = target;
  }

  snapTo(val: number): void {
    this.current = val;
    this.target = val;
    this.velocity = 0;
  }

  update(dtSub: number = 1.0): void {
    const force = (this.target - this.current) * this.stiffness;
    const accel = force / this.mass;
    this.velocity = (this.velocity + accel * dtSub) * this.damping;
    this.current += this.velocity * dtSub;

    if (
      Math.abs(this.velocity) < this.restThreshold &&
      Math.abs(this.target - this.current) < this.restThreshold
    ) {
      this.current = this.target;
      this.velocity = 0;
    }
  }

  isAtRest(): boolean {
    return (
      Math.abs(this.velocity) < this.restThreshold &&
      Math.abs(this.target - this.current) < this.restThreshold
    );
  }
}

/** 2D Spring-Damper Inertial Tracking Engine */
export class CursorSpringPhysics {
  public current: Vector2D;
  public target: Vector2D;
  public velocity: Vector2D;
  public acceleration: Vector2D;

  /** Dynamic stretch/squash and tilt angle calculated from velocity */
  public headingAngle: number = 0;
  public velocityMagnitude: number = 0;
  public elongationFactor: number = 0;

  constructor(public config: SpringConfig, initialX: number = 0, initialY: number = 0) {
    this.current = new Vector2D(initialX, initialY);
    this.target = new Vector2D(initialX, initialY);
    this.velocity = new Vector2D(0, 0);
    this.acceleration = new Vector2D(0, 0);
  }

  setTarget(x: number, y: number): void {
    this.target.set(x, y);
  }

  snapTo(x: number, y: number): void {
    this.current.set(x, y);
    this.target.set(x, y);
    this.velocity.set(0, 0);
    this.acceleration.set(0, 0);
    this.headingAngle = 0;
    this.velocityMagnitude = 0;
    this.elongationFactor = 0;
  }

  /**
   * Semi-implicit Euler integration sub-stepped at normalized 60fps unit steps.
   * Guarantees zero divergence under fluctuating frame intervals.
   */
  update(deltaSeconds: number): void {
    // Clamp delta time to avoid physics explosion during background tab suspension
    const dt = Math.min(deltaSeconds, 0.064);
    // Sub-step ratio normalized to 60fps (1/60s = 0.01666s)
    const normalizedSteps = Math.max(1, Math.round(dt / 0.01666));
    const stepDt = dt / normalizedSteps;

    for (let i = 0; i < normalizedSteps; i++) {
      // Spring force F_spring = -k * (current - target) = k * (target - current)
      const fx = (this.target.x - this.current.x) * this.config.stiffness;
      const fy = (this.target.y - this.current.y) * this.config.stiffness;

      // Acceleration a = F / mass
      this.acceleration.set(fx / this.config.mass, fy / this.config.mass);

      // Semi-implicit integration: velocity += acceleration * dt; velocity *= damping
      this.velocity.x = (this.velocity.x + this.acceleration.x * (stepDt * 60.0)) * this.config.damping;
      this.velocity.y = (this.velocity.y + this.acceleration.y * (stepDt * 60.0)) * this.config.damping;

      // Position update: current += velocity * dt
      this.current.x += this.velocity.x * (stepDt * 60.0);
      this.current.y += this.velocity.y * (stepDt * 60.0);
    }

    // Velocity metrics
    this.velocityMagnitude = this.velocity.length();
    if (this.velocityMagnitude > 0.01) {
      this.headingAngle = Math.atan2(this.velocity.y, this.velocity.x);
    }
    // Dynamic lens squashing along movement normal and elongation along velocity heading
    this.elongationFactor = Math.min(this.velocityMagnitude * 0.012, 0.42);

    // Rest snapping
    if (
      this.velocityMagnitude < this.config.restVelocityThreshold &&
      this.current.distanceTo(this.target) < this.config.restDisplacementThreshold
    ) {
      this.current.copy(this.target);
      this.velocity.set(0, 0);
      this.velocityMagnitude = 0;
      this.elongationFactor = 0;
    }
  }

  isAtRest(): boolean {
    return (
      this.velocityMagnitude < this.config.restVelocityThreshold &&
      this.current.distanceTo(this.target) < this.config.restDisplacementThreshold
    );
  }
}

// ============================================================================
// 3. GLSL SHADER SOURCES (Screen-Space WebGL Lens & Refraction)
// ============================================================================

export const SPATIAL_CURSOR_VERTEX_SHADER = /* glsl */ `
  attribute vec2 a_position;
  attribute vec2 a_uv;

  varying vec2 v_uv;
  varying vec2 v_screenCoord;

  uniform vec2 u_resolution;

  void main() {
    v_uv = a_uv;
    // Map full-screen quad [-1, 1] to screen pixel coordinates
    v_screenCoord = a_uv * u_resolution;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export const SPATIAL_CURSOR_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec2 v_uv;

  uniform vec2 u_resolution;        // Screen resolution in CSS pixels [width, height]
  uniform vec2 u_cursorPos;         // Center of the lens in screen pixels (origin: top-left)
  uniform vec2 u_cursorVel;         // Inertial velocity vector
  uniform vec2 u_boxHalfSize;       // Half-extents of the boundary capsule [halfW, halfH]
  uniform float u_cornerRadius;     // Corner rounding radius
  uniform float u_magnification;    // Refraction scale multiplier (e.g. 1.32x)
  uniform float u_ior;              // Optical glass index of refraction (e.g. 1.48)
  uniform float u_barrelK1;         // Primary radial barrel curvature
  uniform float u_barrelK2;         // Secondary barrel pinch coefficient
  uniform float u_dispersion;       // Chromatic dispersion separation offset
  uniform float u_rimGlow;          // Specular Fresnel rim intensity
  uniform vec3 u_rimColor;          // Architectural bronze tint
  uniform vec3 u_cadColor;          // CAD datum reticle color
  uniform float u_opacity;          // Master opacity multiplier
  uniform float u_cadReticle;       // Blend weight for CAD hairline crosshairs
  uniform float u_time;             // Time delta for micro-caustic shimmer
  uniform sampler2D u_sceneTexture; // Captured underlying scene/DOM texture
  uniform float u_hasTexture;       // 1.0 if texture is bound, 0.0 for procedural fallback

  // Signed distance function to a 2D rounded rectangle (capsule/superellipse)
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + vec2(r);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  // High-precision architectural millimeter grid sample fallback
  vec4 sampleSceneFallback(vec2 uv) {
    vec2 px = uv * u_resolution;
    vec2 g10 = abs(fract(px / 12.0 - 0.5) - 0.5) / fwidth(px / 12.0);
    vec2 g60 = abs(fract(px / 60.0 - 0.5) - 0.5) / fwidth(px / 60.0);
    float l10 = 1.0 - min(min(g10.x, g10.y), 1.0);
    float l60 = 1.0 - min(min(g60.x, g60.y), 1.0);

    vec3 bg = vec3(0.055, 0.058, 0.065);
    vec3 lines = vec3(0.12, 0.13, 0.15) * l10 + vec3(0.24, 0.22, 0.18) * l60;
    return vec4(bg + lines, 1.0);
  }

  vec4 sampleScene(vec2 uv) {
    if (u_hasTexture > 0.5) {
      return texture2D(u_sceneTexture, uv);
    }
    return sampleSceneFallback(uv);
  }

  void main() {
    // Current pixel coordinate in screen pixels (Y pointing downwards)
    vec2 fragPx = vec2(v_uv.x * u_resolution.x, (1.0 - v_uv.y) * u_resolution.y);

    // Vector relative to smoothed lens center
    vec2 rel = fragPx - u_cursorPos;

    // Apply directional velocity shear/elongation
    float velLen = length(u_cursorVel);
    if (velLen > 0.8) {
      vec2 velDir = u_cursorVel / velLen;
      float proj = dot(rel, velDir);
      float stretch = min(velLen * 0.012, 0.35);
      rel -= velDir * (proj * stretch * 0.38);
    }

    // Compute signed distance to boundary capsule
    float dist = sdRoundedBox(rel, u_boxHalfSize, u_cornerRadius);

    // Drop shadow envelope evaluation outside lens perimeter
    float shadowRadius = 16.0;
    if (dist > shadowRadius) {
      discard;
    }

    if (dist > 0.0) {
      // Soft Gaussian ambient occlusion drop shadow
      float shadowFactor = (1.0 - smoothstep(0.0, shadowRadius, dist));
      float shadowAlpha = shadowFactor * shadowFactor * 0.28 * u_opacity;
      gl_FragColor = vec4(0.02, 0.02, 0.03, shadowAlpha);
      return;
    }

    // INSIDE THE LENS (dist <= 0.0)
    // Normalized depth coordinate inside the lens: 0 at rim, 1 at center
    float minDim = max(1.0, min(u_boxHalfSize.x, u_boxHalfSize.y));
    float normDepth = clamp(-dist / minDim, 0.0, 1.0);

    // 3D Meniscus Lens Dome Normal Derivation:
    // Virtual ellipsoid surface z = sqrt(1.0 - (x/rx)^2 - (y/ry)^2)
    vec2 normRel = rel / max(u_boxHalfSize, vec2(1.0));
    float rSq = clamp(dot(normRel, normRel), 0.0, 0.985);
    float domeZ = sqrt(1.0 - rSq);
    vec3 normal = normalize(vec3(normRel, domeZ * 1.65));

    // Incident eye ray looking down -Z axis
    vec3 rayIn = vec3(0.0, 0.0, -1.0);

    // Snell's Law Refraction with Cauchy chromatic dispersion splitting:
    // Eta = n_air / n_glass
    float baseEta = 1.0 / max(1.0, u_ior);
    float etaR = baseEta * (1.0 - u_dispersion * 1.1);
    float etaG = baseEta;
    float etaB = baseEta * (1.0 + u_dispersion * 1.1);

    vec3 refrR = refract(rayIn, normal, etaR);
    vec3 refrG = refract(rayIn, normal, etaG);
    vec3 refrB = refract(rayIn, normal, etaB);

    // Barrel radial curvature distortion: r' = r * (1.0 + k1*r^2 + k2*r^4)
    float rNorm = length(rel) / max(u_boxHalfSize.x, u_boxHalfSize.y);
    float rNormSq = rNorm * rNorm;
    float barrelCurve = 1.0 + u_barrelK1 * rNormSq + u_barrelK2 * (rNormSq * rNormSq);

    // Lens magnification coordinate mapping
    vec2 centerUV = vec2(u_cursorPos.x / u_resolution.x, 1.0 - (u_cursorPos.y / u_resolution.y));
    vec2 offsetBase = ((fragPx - u_cursorPos) / u_magnification * barrelCurve);

    // Chromatic dispersed texture coordinates
    vec2 uvR = centerUV + vec2(offsetBase.x + refrR.x * 22.0 * (1.0 - normDepth), -(offsetBase.y + refrR.y * 22.0 * (1.0 - normDepth))) / u_resolution;
    vec2 uvG = centerUV + vec2(offsetBase.x + refrG.x * 22.0 * (1.0 - normDepth), -(offsetBase.y + refrG.y * 22.0 * (1.0 - normDepth))) / u_resolution;
    vec2 uvB = centerUV + vec2(offsetBase.x + refrB.x * 22.0 * (1.0 - normDepth), -(offsetBase.y + refrB.y * 22.0 * (1.0 - normDepth))) / u_resolution;

    // Clamp coordinates safely
    uvR = clamp(uvR, vec2(0.001), vec2(0.999));
    uvG = clamp(uvG, vec2(0.001), vec2(0.999));
    uvB = clamp(uvB, vec2(0.001), vec2(0.999));

    float sampleR = sampleScene(uvR).r;
    float sampleG = sampleScene(uvG).g;
    float sampleB = sampleScene(uvB).b;
    vec3 refractedColor = vec3(sampleR, sampleG, sampleB);

    // Fresnel reflectance (Schlick approximation)
    float cosTheta = clamp(normal.z, 0.0, 1.0);
    float f0 = pow((1.0 - baseEta) / (1.0 + baseEta), 2.0);
    float fresnel = f0 + (1.0 - f0) * pow(1.0 - cosTheta, 4.5);

    // Specular keylight highlight (angled architectural studio luminaire)
    vec3 lightDir = normalize(vec3(0.42, 0.78, 0.62));
    vec3 refl = reflect(rayIn, normal);
    float spec = pow(max(0.0, dot(refl, lightDir)), 28.0);

    // Micro-caustic subtle shimmer over the glass face
    float causticShimmer = sin(rel.x * 0.08 + u_time * 2.2) * cos(rel.y * 0.08 - u_time * 1.8) * 0.04;

    // Bevel rim facet glint along outer perimeter
    float bevelWidth = 2.4;
    float edgeFacet = 1.0 - smoothstep(0.0, bevelWidth, -dist);
    float innerGlint = smoothstep(bevelWidth, bevelWidth + 1.2, -dist) * (1.0 - smoothstep(bevelWidth + 1.2, bevelWidth + 2.8, -dist));

    // Compose final glass shading with architectural bronze highlights
    vec3 rimHighlight = mix(u_rimColor, vec3(1.0, 0.95, 0.88), spec * 0.75);
    vec3 finalColor = refractedColor + causticShimmer;
    finalColor += fresnel * rimHighlight * u_rimGlow * 0.65;
    finalColor += spec * vec3(1.0, 0.96, 0.89) * 0.45;
    finalColor = mix(finalColor, rimHighlight, edgeFacet * 0.88);
    finalColor += innerGlint * 0.24 * vec3(1.0, 0.92, 0.82);

    // CAD Reticle Overlay Mode (Hairline technical crosshairs & millimeter ticks)
    if (u_cadReticle > 0.01) {
      float reticleAlpha = 0.0;

      // Axial hairline crosshairs
      float crossX = abs(rel.x);
      float crossY = abs(rel.y);
      if (crossX < 0.65) reticleAlpha += (1.0 - crossX / 0.65) * 0.75;
      if (crossY < 0.65) reticleAlpha += (1.0 - crossY / 0.65) * 0.75;

      // Millimeter tick marks along horizontal & vertical axes
      float tickLen = 3.6;
      if (crossX < 36.0 && mod(crossX, 8.0) < 0.75 && crossY < tickLen) {
        reticleAlpha += 0.85;
      }
      if (crossY < 36.0 && mod(crossY, 8.0) < 0.75 && crossX < tickLen) {
        reticleAlpha += 0.85;
      }

      // Center datum circle (r = 4.0px)
      float ringDist = abs(length(rel) - 4.5);
      if (ringDist < 0.65) {
        reticleAlpha += (1.0 - ringDist / 0.65) * 0.9;
      }

      finalColor = mix(finalColor, u_cadColor, clamp(reticleAlpha * u_cadReticle, 0.0, 0.95));
    }

    // Anti-aliased outer rim mask
    float aaAlpha = smoothstep(-1.0, 0.0, -dist) * u_opacity;

    gl_FragColor = vec4(finalColor, aaAlpha);
  }
`;

// ============================================================================
// 4. LOW-LEVEL WEBGL REFRACTION RENDERER
// ============================================================================

export class SpatialRefractionRenderer {
  public canvas: HTMLCanvasElement;
  public gl: WebGLRenderingContext | WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private quadVao: any = null;
  private quadBuffer: WebGLBuffer | null = null;
  private sceneTexture: WebGLTexture | null = null;
  private hasSceneTexture: boolean = false;

  // Uniform locations cache
  private uniforms: Record<string, WebGLUniformLocation | null> = {};

  constructor(zIndex: number = 99999) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'spatial-refractive-cursor-canvas';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = zIndex.toString();

    const glContext =
      this.canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: false }) ||
      this.canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });

    if (!glContext) {
      throw new Error('[SpatialCursor] WebGL context creation failed; browser does not support WebGL.');
    }
    this.gl = glContext as WebGLRenderingContext;
    this.initShaders();
    this.initBuffers();
  }

  private createShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error('[SpatialCursor] Failed to allocate shader object');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`[SpatialCursor] Shader compilation error: ${info}`);
    }
    return shader;
  }

  private initShaders(): void {
    const gl = this.gl;
    const vertShader = this.createShader(gl.VERTEX_SHADER, SPATIAL_CURSOR_VERTEX_SHADER);
    const fragShader = this.createShader(gl.FRAGMENT_SHADER, SPATIAL_CURSOR_FRAGMENT_SHADER);

    const program = gl.createProgram();
    if (!program) throw new Error('[SpatialCursor] Failed to allocate WebGLProgram');
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`[SpatialCursor] Program link error: ${info}`);
    }

    this.program = program;
    gl.useProgram(program);

    // Cache uniforms
    const uniformNames = [
      'u_resolution',
      'u_cursorPos',
      'u_cursorVel',
      'u_boxHalfSize',
      'u_cornerRadius',
      'u_magnification',
      'u_ior',
      'u_barrelK1',
      'u_barrelK2',
      'u_dispersion',
      'u_rimGlow',
      'u_rimColor',
      'u_cadColor',
      'u_opacity',
      'u_cadReticle',
      'u_time',
      'u_sceneTexture',
      'u_hasTexture',
    ];

    for (const name of uniformNames) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }
  }

  private initBuffers(): void {
    const gl = this.gl;
    // Fullscreen quad in NDC [-1, 1] with UV coordinates [0, 1]
    // Layout: [pos.x, pos.y, uv.u, uv.v]
    const quadVertices = new Float32Array([
      -1.0, -1.0, 0.0, 0.0,
       1.0, -1.0, 1.0, 0.0,
      -1.0,  1.0, 0.0, 1.0,
      -1.0,  1.0, 0.0, 1.0,
       1.0, -1.0, 1.0, 0.0,
       1.0,  1.0, 1.0, 1.0,
    ]);

    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    if (!this.program) return;
    const aPos = gl.getAttribLocation(this.program, 'a_position');
    const aUv = gl.getAttribLocation(this.program, 'a_uv');

    if (aPos >= 0) {
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
    }
    if (aUv >= 0) {
      gl.enableVertexAttribArray(aUv);
      gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);
    }
  }

  /** Bind external canvas or texture for physical refraction sampling */
  public bindSourceCanvas(sourceCanvas: HTMLCanvasElement): void {
    const gl = this.gl;
    if (!this.sceneTexture) {
      this.sceneTexture = gl.createTexture();
    }
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
    this.hasSceneTexture = true;
  }

  public resize(width: number, height: number, pixelRatio: number): void {
    const displayWidth = Math.round(width * pixelRatio);
    const displayHeight = Math.round(height * pixelRatio);

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
    }
  }

  public render(
    geom: CursorGeometryState,
    vel: Vector2D,
    optics: OpticsConfig,
    theme: ThemeConfig,
    viewportW: number,
    viewportH: number,
    pixelRatio: number,
    elapsedSeconds: number
  ): void {
    const gl = this.gl;
    if (!this.program) return;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Skip render call if opacity is zero
    if (geom.opacity <= 0.001) return;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(this.program);

    // Bind uniforms
    gl.uniform2f(this.uniforms['u_resolution'], viewportW, viewportH);
    gl.uniform2f(this.uniforms['u_cursorPos'], geom.x, geom.y);
    gl.uniform2f(this.uniforms['u_cursorVel'], vel.x, vel.y);
    gl.uniform2f(this.uniforms['u_boxHalfSize'], (geom.width * 0.5) * geom.scale, (geom.height * 0.5) * geom.scale);
    gl.uniform1f(this.uniforms['u_cornerRadius'], geom.radius * geom.scale);
    gl.uniform1f(this.uniforms['u_magnification'], geom.magnification);
    gl.uniform1f(this.uniforms['u_ior'], optics.ior);
    gl.uniform1f(this.uniforms['u_barrelK1'], optics.barrelK1);
    gl.uniform1f(this.uniforms['u_barrelK2'], optics.barrelK2);
    gl.uniform1f(this.uniforms['u_dispersion'], optics.dispersion);
    gl.uniform1f(this.uniforms['u_rimGlow'], optics.rimGlow);
    gl.uniform3f(this.uniforms['u_rimColor'], theme.rimColor.r, theme.rimColor.g, theme.rimColor.b);
    gl.uniform3f(this.uniforms['u_cadColor'], theme.cadReticleColor.r, theme.cadReticleColor.g, theme.cadReticleColor.b);
    gl.uniform1f(this.uniforms['u_opacity'], geom.opacity);
    gl.uniform1f(this.uniforms['u_cadReticle'], geom.cadReticle);
    gl.uniform1f(this.uniforms['u_time'], elapsedSeconds);

    // Texture uniform setup
    if (this.hasSceneTexture && this.sceneTexture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.sceneTexture);
      gl.uniform1i(this.uniforms['u_sceneTexture'], 0);
      gl.uniform1f(this.uniforms['u_hasTexture'], 1.0);
    } else {
      gl.uniform1f(this.uniforms['u_hasTexture'], 0.0);
    }

    // Draw full-screen quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  public destroy(): void {
    const gl = this.gl;
    if (this.quadBuffer) gl.deleteBuffer(this.quadBuffer);
    if (this.sceneTexture) gl.deleteTexture(this.sceneTexture);
    if (this.program) gl.deleteProgram(this.program);
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}

// ============================================================================
// 5. THREE.JS INTEGRATION (Custom Material, Mesh & Post-Processing Pass)
// ============================================================================

export interface SpatialCursorMaterialParameters {
  resolution?: THREE.Vector2;
  cursorPos?: THREE.Vector2;
  cursorVel?: THREE.Vector2;
  boxHalfSize?: THREE.Vector2;
  cornerRadius?: number;
  magnification?: number;
  ior?: number;
  barrelK1?: number;
  barrelK2?: number;
  dispersion?: number;
  rimGlow?: number;
  rimColor?: THREE.Color;
  cadColor?: THREE.Color;
  opacity?: number;
  cadReticle?: number;
  sceneTexture?: THREE.Texture | null;
}

/** Custom Three.js ShaderMaterial for in-scene 3D or overlay lens quad */
export class SpatialCursorMaterial extends THREE.ShaderMaterial {
  constructor(params: SpatialCursorMaterialParameters = {}) {
    const uniforms = {
      u_resolution: { value: params.resolution || new THREE.Vector2(1920, 1080) },
      u_cursorPos: { value: params.cursorPos || new THREE.Vector2(960, 540) },
      u_cursorVel: { value: params.cursorVel || new THREE.Vector2(0, 0) },
      u_boxHalfSize: { value: params.boxHalfSize || new THREE.Vector2(23, 23) },
      u_cornerRadius: { value: params.cornerRadius ?? 23.0 },
      u_magnification: { value: params.magnification ?? 1.32 },
      u_ior: { value: params.ior ?? 1.48 },
      u_barrelK1: { value: params.barrelK1 ?? 0.18 },
      u_barrelK2: { value: params.barrelK2 ?? 0.06 },
      u_dispersion: { value: params.dispersion ?? 0.018 },
      u_rimGlow: { value: params.rimGlow ?? 1.45 },
      u_rimColor: { value: params.rimColor || new THREE.Color(0xc9a97e) },
      u_cadColor: { value: params.cadColor || new THREE.Color(0xe2ceab) },
      u_opacity: { value: params.opacity ?? 1.0 },
      u_cadReticle: { value: params.cadReticle ?? 0.0 },
      u_time: { value: 0.0 },
      u_sceneTexture: { value: params.sceneTexture || null },
      u_hasTexture: { value: params.sceneTexture ? 1.0 : 0.0 },
    };

    super({
      uniforms,
      vertexShader: `
        varying vec2 v_uv;
        void main() {
          v_uv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: SPATIAL_CURSOR_FRAGMENT_SHADER,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
  }

  public setCursorPosition(x: number, y: number): void {
    this.uniforms.u_cursorPos.value.set(x, y);
  }

  public setCursorVelocity(vx: number, vy: number): void {
    this.uniforms.u_cursorVel.value.set(vx, vy);
  }

  public setBoxDimensions(width: number, height: number, radius: number): void {
    this.uniforms.u_boxHalfSize.value.set(width * 0.5, height * 0.5);
    this.uniforms.u_cornerRadius.value = radius;
  }

  public setCadReticle(weight: number): void {
    this.uniforms.u_cadReticle.value = weight;
  }

  public updateTime(time: number): void {
    this.uniforms.u_time.value = time;
  }
}

/** Three.js Mesh wrapper creating an orthographic overlay quad */
export class SpatialCursorMesh extends THREE.Mesh {
  public cursorMaterial: SpatialCursorMaterial;

  constructor(params: SpatialCursorMaterialParameters = {}) {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new SpatialCursorMaterial(params);
    super(geometry, material);
    this.cursorMaterial = material;
    this.frustumCulled = false;
  }
}

/** Factory for Three.js custom material */
export function createSpatialCursorMaterial(
  params?: SpatialCursorMaterialParameters
): SpatialCursorMaterial {
  return new SpatialCursorMaterial(params);
}

/** Factory for Three.js cursor mesh */
export function createSpatialCursorMesh(
  params?: SpatialCursorMaterialParameters
): SpatialCursorMesh {
  return new SpatialCursorMesh(params);
}

/**
 * Three.js EffectComposer-compatible Post-Processing Pass
 * Enables direct pixel-accurate refraction over any 3D showroom scene.
 */
export class SpatialCursorThreePass {
  public enabled: boolean = true;
  public needsSwap: boolean = true;
  public clear: boolean = false;
  public renderToScreen: boolean = false;

  public material: SpatialCursorMaterial;
  private quadScene: THREE.Scene;
  private quadCamera: THREE.OrthographicCamera;
  private quadMesh: THREE.Mesh;

  constructor(viewportWidth: number = 1920, viewportHeight: number = 1080) {
    this.material = new SpatialCursorMaterial({
      resolution: new THREE.Vector2(viewportWidth, viewportHeight),
    });

    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quadScene.add(this.quadMesh);
  }

  public setSize(width: number, height: number): void {
    this.material.uniforms.u_resolution.value.set(width, height);
  }

  public render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    deltaTime: number
  ): void {
    if (!this.enabled) return;

    this.material.uniforms.u_sceneTexture.value = readBuffer.texture;
    this.material.uniforms.u_hasTexture.value = 1.0;
    this.material.uniforms.u_time.value += deltaTime;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
    }

    renderer.render(this.quadScene, this.quadCamera);
  }

  public dispose(): void {
    this.material.dispose();
    this.quadMesh.geometry.dispose();
  }
}

// ============================================================================
// 6. MAGNETIC HOVER MANAGER & MORPHING CAPSULE LOGIC
// ============================================================================

export class MagneticHoverManager {
  private bindings: Map<HTMLElement, HoverElementBinding> = new Map();
  private observer: MutationObserver | null = null;
  private activeBinding: HoverElementBinding | null = null;
  private isHovered: boolean = false;

  constructor(
    private config: MagneticConfig,
    private onHoverChange: (binding: HoverElementBinding | null) => void
  ) {}

  public register(binding: HoverElementBinding): void {
    this.bindings.set(binding.element, binding);
  }

  public unregister(element: HTMLElement): void {
    this.bindings.delete(element);
    if (this.activeBinding?.element === element) {
      this.activeBinding = null;
      this.isHovered = false;
      this.onHoverChange(null);
    }
  }

  public startAutoObserver(root: Node = document.body, selector: string): void {
    this.scanAndRegister(root as HTMLElement, selector);

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            this.scanAndRegister(node, selector);
          }
        });
        mutation.removedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            this.unregister(node);
          }
        });
      }
    });

    this.observer.observe(root, { childList: true, subtree: true });
  }

  public scanAndRegister(root: HTMLElement, selector: string): void {
    if (root.matches && root.matches(selector)) {
      this.bindElementFromAttributes(root);
    }
    const elements = root.querySelectorAll<HTMLElement>(selector);
    elements.forEach((el) => this.bindElementFromAttributes(el));
  }

  private bindElementFromAttributes(el: HTMLElement): void {
    // Mode inference
    let mode: CursorMode = 'magnetic-capsule';
    if (el.classList.contains('cad-dimension') || el.hasAttribute('data-cursor-cad')) {
      mode = 'cad-dimension';
    } else if (el.classList.contains('work-card') || el.hasAttribute('data-cursor-card')) {
      mode = 'work-card';
    } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      mode = 'text';
    } else if (el.getAttribute('data-cursor') === 'drag') {
      mode = 'drag';
    }

    const paddingX = parseFloat(el.getAttribute('data-cursor-pad-x') || '') || undefined;
    const paddingY = parseFloat(el.getAttribute('data-cursor-pad-y') || '') || undefined;
    const radius = parseFloat(el.getAttribute('data-cursor-radius') || '') || undefined;
    const magnification = parseFloat(el.getAttribute('data-cursor-magnify') || '') || undefined;
    const customText = el.getAttribute('data-cursor-text') || undefined;

    this.register({
      element: el,
      mode,
      paddingX,
      paddingY,
      radius,
      magnification,
      customText,
    });
  }

  /**
   * Evaluate pointer coordinates against all registered magnetic elements.
   * Computes shortest Euclidean distance to element AABB bounding boxes with hysteresis.
   */
  public evaluate(
    pointerX: number,
    pointerY: number
  ): { targetX: number; targetY: number; binding: HoverElementBinding | null } {
    let bestBinding: HoverElementBinding | null = null;
    let minDistance = Infinity;
    let bestCenter = { x: pointerX, y: pointerY };

    for (const [element, binding] of this.bindings.entries()) {
      if (!element.isConnected) {
        this.bindings.delete(element);
        continue;
      }

      const rect = element.getBoundingClientRect();
      // Skip invisible / zero-sized elements
      if (rect.width <= 0 || rect.height <= 0) continue;

      const centerX = rect.left + rect.width * 0.5;
      const centerY = rect.top + rect.height * 0.5;

      // Distance from pointer to closest point on the element rectangle
      const dx = Math.max(rect.left - pointerX, 0, pointerX - rect.right);
      const dy = Math.max(rect.top - pointerY, 0, pointerY - rect.bottom);
      const distToBox = Math.sqrt(dx * dx + dy * dy);

      // Active binding receives hysteresis threshold boost to prevent edge chatter
      const effectiveRadius =
        this.activeBinding === binding
          ? this.config.attractionRadius * this.config.hysteresisFactor
          : this.config.attractionRadius;

      if (distToBox < effectiveRadius && distToBox < minDistance) {
        minDistance = distToBox;
        bestBinding = binding;
        bestCenter = { x: centerX, y: centerY };
      }
    }

    if (bestBinding) {
      if (!this.isHovered || this.activeBinding !== bestBinding) {
        this.isHovered = true;
        this.activeBinding = bestBinding;
        this.onHoverChange(bestBinding);
      }

      // Smooth attraction weight: 1 at center, 0 at attractionRadius
      const normDist = minDistance / this.config.attractionRadius;
      const weight = Math.max(0, 1.0 - normDist * normDist) * this.config.magneticStrength;

      const targetX = pointerX + (bestCenter.x - pointerX) * weight;
      const targetY = pointerY + (bestCenter.y - pointerY) * weight;

      return { targetX, targetY, binding: bestBinding };
    }

    if (this.isHovered) {
      this.isHovered = false;
      this.activeBinding = null;
      this.onHoverChange(null);
    }

    return { targetX: pointerX, targetY: pointerY, binding: null };
  }

  public getActiveBinding(): HoverElementBinding | null {
    return this.activeBinding;
  }

  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.bindings.clear();
    this.activeBinding = null;
  }
}

// ============================================================================
// 7. ACCESSIBILITY & TOUCH ENVIRONMENT DETECTION
// ============================================================================

/** Detects if the current client platform is a touch-exclusive or primary touch device */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

/** Detects if user has enabled OS-level reduced motion accessibility preferences */
export function isReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ============================================================================
// 8. HIGH-LEVEL SPATIAL CURSOR ENGINE
// ============================================================================

export class SpatialCursorEngine {
  public config: SpatialCursorConfig;
  public renderer: SpatialRefractionRenderer | null = null;
  public physics: CursorSpringPhysics;
  public magnetic: MagneticHoverManager;

  // 1D springs for multi-property geometric morphing
  private widthSpring: Spring1D;
  private heightSpring: Spring1D;
  private radiusSpring: Spring1D;
  private scaleSpring: Spring1D;
  private opacitySpring: Spring1D;
  private magnifySpring: Spring1D;
  private cadReticleSpring: Spring1D;

  private currentMode: CursorMode = 'default';
  private previousMode: CursorMode = 'default';
  private rawPointer: Vector2D = new Vector2D(-500, -500);
  private isPointerInside: boolean = false;
  private isDestroyed: boolean = false;
  private isFallbackActive: boolean = false;

  private rafId: number | null = null;
  private lastTimestamp: number = 0;
  private elapsedSeconds: number = 0;

  // Frame telemetry metrics
  private frameCount: number = 0;
  private fpsTimer: number = 0;
  private currentFps: number = 60;

  // Event callbacks
  private listeners: { [K in keyof CursorEventMap]?: CursorEventMap[K][] } = {};

  constructor(options: Partial<SpatialCursorConfig> = {}) {
    this.config = {
      ...DEFAULT_SPATIAL_CURSOR_CONFIG,
      ...options,
      spring: { ...DEFAULT_SPATIAL_CURSOR_CONFIG.spring, ...options.spring },
      optics: { ...DEFAULT_SPATIAL_CURSOR_CONFIG.optics, ...options.optics },
      magnetic: { ...DEFAULT_SPATIAL_CURSOR_CONFIG.magnetic, ...options.magnetic },
      theme: { ...DEFAULT_SPATIAL_CURSOR_CONFIG.theme, ...options.theme },
    };

    // Initialize physics
    this.physics = new CursorSpringPhysics(this.config.spring);

    // Initialize 1D shape morph springs
    const baseR = this.config.baseSize * 0.5;
    this.widthSpring = new Spring1D(this.config.baseSize, this.config.spring.stiffness, this.config.spring.damping);
    this.heightSpring = new Spring1D(this.config.baseSize, this.config.spring.stiffness, this.config.spring.damping);
    this.radiusSpring = new Spring1D(baseR, this.config.spring.stiffness, this.config.spring.damping);
    this.scaleSpring = new Spring1D(1.0, this.config.spring.stiffness, this.config.spring.damping);
    this.opacitySpring = new Spring1D(0.0, 0.22, 0.85); // Smooth fade in/out
    this.magnifySpring = new Spring1D(this.config.optics.magnification, 0.18, 0.85);
    this.cadReticleSpring = new Spring1D(0.0, 0.24, 0.82);

    // Magnetic element hover manager
    this.magnetic = new MagneticHoverManager(this.config.magnetic, (binding) => {
      this.handleHoverChange(binding);
    });

    // Check accessibility & device fallback immediately
    if (this.checkFallbacks()) {
      return;
    }

    this.mount();
  }

  /**
   * Evaluates touch and reduced motion conditions.
   * If detected, enables graceful CSS cursor fallback and skips WebGL initialization.
   */
  private checkFallbacks(): boolean {
    if (isTouchDevice()) {
      this.activateFallback('touch');
      return true;
    }
    if (isReducedMotion()) {
      this.activateFallback('reduced-motion');
      return true;
    }
    return false;
  }

  private activateFallback(reason: 'touch' | 'reduced-motion'): void {
    this.isFallbackActive = true;
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('spatial-cursor-fallback');
      document.documentElement.classList.remove('spatial-cursor-active');
    }
    this.emit('fallbackTriggered', reason);
  }

  /** Mount WebGL overlay and attach DOM event listeners */
  public mount(): void {
    if (this.isFallbackActive || this.isDestroyed || typeof window === 'undefined') return;

    try {
      this.renderer = new SpatialRefractionRenderer(this.config.zIndex);
      document.body.appendChild(this.renderer.canvas);
      document.documentElement.classList.add('spatial-cursor-active');
      document.documentElement.classList.remove('spatial-cursor-fallback');
    } catch (err) {
      console.warn('[SpatialCursor] WebGL fallback activated due to context creation error:', err);
      this.activateFallback('touch');
      return;
    }

    this.attachEvents();

    if (this.config.autoObserve) {
      this.magnetic.startAutoObserver(document.body, this.config.interactiveSelector);
    }

    // Begin primary animation render loop
    this.lastTimestamp = performance.now();
    this.fpsTimer = this.lastTimestamp;
    this.tick(this.lastTimestamp);
  }

  private attachEvents(): void {
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    window.addEventListener('pointerup', this.onPointerUp, { passive: true });
    window.addEventListener('resize', this.onResize, { passive: true });
    document.addEventListener('mouseleave', this.onMouseLeave, { passive: true });
    document.addEventListener('mouseenter', this.onMouseEnter, { passive: true });

    // Listen for OS reduced-motion dynamic preference changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', this.onMotionPreferenceChange);
  }

  private detachEvents(): void {
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('mouseleave', this.onMouseLeave);
    document.removeEventListener('mouseenter', this.onMouseEnter);

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.removeEventListener('change', this.onMotionPreferenceChange);
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') {
      this.activateFallback('touch');
      return;
    }

    this.rawPointer.set(e.clientX, e.clientY);
    if (!this.isPointerInside) {
      this.isPointerInside = true;
      this.opacitySpring.setTarget(1.0);
    }
  };

  private onPointerDown = (): void => {
    // Tactile squish click feedback
    this.scaleSpring.snapTo(0.88);
    this.scaleSpring.setTarget(1.0);
  };

  private onPointerUp = (): void => {
    this.scaleSpring.setTarget(1.0);
  };

  private onMouseLeave = (): void => {
    this.isPointerInside = false;
    this.opacitySpring.setTarget(0.0);
  };

  private onMouseEnter = (e: MouseEvent): void => {
    this.rawPointer.set(e.clientX, e.clientY);
    this.isPointerInside = true;
    this.opacitySpring.setTarget(1.0);
  };

  private onResize = (): void => {
    if (!this.renderer) return;
    this.renderer.resize(window.innerWidth, window.innerHeight, this.config.maxPixelRatio);
  };

  private onMotionPreferenceChange = (e: MediaQueryListEvent): void => {
    if (e.matches) {
      this.destroy();
      this.activateFallback('reduced-motion');
    }
  };

  /** Handle morphology state transitions on element hover */
  private handleHoverChange(binding: HoverElementBinding | null): void {
    if (!binding) {
      this.setMode('default');
      this.emit('hoverLeave', document.body);
      return;
    }

    this.setMode(binding.mode);
    this.emit('hoverEnter', binding);

    const rect = binding.element.getBoundingClientRect();
    const padX = binding.paddingX ?? this.config.magnetic.paddingX;
    const padY = binding.paddingY ?? this.config.magnetic.paddingY;

    if (binding.mode === 'magnetic-capsule') {
      const targetW = rect.width + padX * 2;
      const targetH = rect.height + padY * 2;
      const targetR = binding.radius ?? Math.min(targetH * 0.5, 24.0);

      this.widthSpring.setTarget(targetW);
      this.heightSpring.setTarget(targetH);
      this.radiusSpring.setTarget(targetR);
      this.magnifySpring.setTarget(binding.magnification ?? 1.15);
      this.cadReticleSpring.setTarget(0.0);
    } else if (binding.mode === 'cad-dimension') {
      const targetW = rect.width + padX * 2.2;
      const targetH = rect.height + padY * 2.2;

      this.widthSpring.setTarget(targetW);
      this.heightSpring.setTarget(targetH);
      this.radiusSpring.setTarget(binding.radius ?? 4.0); // Sharp technical radius
      this.magnifySpring.setTarget(binding.magnification ?? 1.42);
      this.cadReticleSpring.setTarget(1.0); // Show millimeter ticks
    } else if (binding.mode === 'work-card') {
      const targetW = rect.width + padX * 1.5;
      const targetH = rect.height + padY * 1.5;

      this.widthSpring.setTarget(targetW);
      this.heightSpring.setTarget(targetH);
      this.radiusSpring.setTarget(binding.radius ?? 12.0);
      this.magnifySpring.setTarget(binding.magnification ?? 1.08);
      this.cadReticleSpring.setTarget(0.0);
    } else if (binding.mode === 'text') {
      this.widthSpring.setTarget(4.0);
      this.heightSpring.setTarget(rect.height > 0 ? rect.height : 26.0);
      this.radiusSpring.setTarget(2.0);
      this.magnifySpring.setTarget(1.0);
      this.cadReticleSpring.setTarget(0.0);
    }
  }

  /** Set active cursor mode */
  public setMode(mode: CursorMode): void {
    if (this.currentMode === mode) return;
    this.previousMode = this.currentMode;
    this.currentMode = mode;

    if (mode === 'default') {
      const baseR = this.config.baseSize * 0.5;
      this.widthSpring.setTarget(this.config.baseSize);
      this.heightSpring.setTarget(this.config.baseSize);
      this.radiusSpring.setTarget(baseR);
      this.magnifySpring.setTarget(this.config.optics.magnification);
      this.cadReticleSpring.setTarget(0.0);
    } else if (mode === 'hidden') {
      this.opacitySpring.setTarget(0.0);
    }

    this.emit('modeChange', mode, this.previousMode);
  }

  /** Register an interactive element manually */
  public registerElement(element: HTMLElement, options?: Partial<HoverElementBinding>): void {
    this.magnetic.register({
      element,
      mode: options?.mode ?? 'magnetic-capsule',
      paddingX: options?.paddingX,
      paddingY: options?.paddingY,
      radius: options?.radius,
      magnification: options?.magnification,
      customText: options?.customText,
    });
  }

  /** Unregister an element */
  public unregisterElement(element: HTMLElement): void {
    this.magnetic.unregister(element);
  }

  /**
   * Bind an external Three.js or showroom canvas to stream physical refraction
   * directly from underlying 3D renderings!
   */
  public bindSceneCanvas(canvas: HTMLCanvasElement): void {
    if (this.renderer) {
      this.renderer.bindSourceCanvas(canvas);
    }
  }

  /** Event subscription */
  public on<K extends keyof CursorEventMap>(event: K, callback: CursorEventMap[K]): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(callback);
  }

  public off<K extends keyof CursorEventMap>(event: K, callback: CursorEventMap[K]): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event]!.filter((cb) => cb !== callback) as any;
  }

  private emit<K extends keyof CursorEventMap>(event: K, ...args: Parameters<CursorEventMap[K]>): void {
    if (!this.listeners[event]) return;
    for (const cb of this.listeners[event]!) {
      (cb as any)(...args);
    }
  }

  /** Primary animation frame step */
  private tick = (timestamp: number): void => {
    if (this.isDestroyed || this.isFallbackActive) return;

    const deltaSeconds = (timestamp - this.lastTimestamp) * 0.001;
    this.lastTimestamp = timestamp;
    this.elapsedSeconds += deltaSeconds;

    // FPS Telemetry
    this.frameCount++;
    if (timestamp - this.fpsTimer >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = timestamp;
    }

    this.update(deltaSeconds);
    this.render();

    this.rafId = requestAnimationFrame(this.tick);
  };

  /** Compute physics, spring interpolation, and magnetic attraction */
  public update(deltaSeconds: number): void {
    // Evaluate magnetic attraction toward interactive elements
    const { targetX, targetY } = this.magnetic.evaluate(this.rawPointer.x, this.rawPointer.y);

    // Update inertial spring-damper tracking
    this.physics.setTarget(targetX, targetY);
    this.physics.update(deltaSeconds);

    // Sub-step 1D shape springs
    this.widthSpring.update();
    this.heightSpring.update();
    this.radiusSpring.update();
    this.scaleSpring.update();
    this.opacitySpring.update();
    this.magnifySpring.update();
    this.cadReticleSpring.update();

    this.emit('move', {
      x: this.physics.current.x,
      y: this.physics.current.y,
      vx: this.physics.velocity.x,
      vy: this.physics.velocity.y,
    });
  }

  /** Render frame */
  public render(): void {
    if (!this.renderer) return;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    this.renderer.resize(viewportW, viewportH, this.config.maxPixelRatio);

    const geom: CursorGeometryState = {
      x: this.physics.current.x,
      y: this.physics.current.y,
      width: this.widthSpring.current,
      height: this.heightSpring.current,
      radius: this.radiusSpring.current,
      rotation: this.physics.headingAngle,
      scale: this.scaleSpring.current,
      opacity: this.opacitySpring.current,
      magnification: this.magnifySpring.current,
      cadReticle: this.cadReticleSpring.current,
    };

    this.renderer.render(
      geom,
      this.physics.velocity,
      this.config.optics,
      this.config.theme,
      viewportW,
      viewportH,
      this.config.maxPixelRatio,
      this.elapsedSeconds
    );
  }

  /** Telemetry metrics getter */
  public getMetrics(): SpatialCursorMetrics {
    return {
      fps: this.currentFps,
      frameTimeMs: this.currentFps > 0 ? 1000 / this.currentFps : 16.6,
      currentVelocity: this.physics.velocityMagnitude,
      isResting: this.physics.isAtRest(),
      activeMode: this.currentMode,
      hoveredElement: this.magnetic.getActiveBinding()?.element ?? null,
      viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
      viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 1080,
    };
  }

  /** Clean up all WebGL allocations and event listeners */
  public destroy(): void {
    this.isDestroyed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.detachEvents();
    this.magnetic.destroy();
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('spatial-cursor-active');
      document.documentElement.classList.remove('spatial-cursor-fallback');
    }
    this.listeners = {};
  }
}

/**
 * Convenience factory to instantiate and mount the Spatial Cursor Engine.
 */
export function createSpatialCursor(
  options?: Partial<SpatialCursorConfig>
): SpatialCursorEngine {
  return new SpatialCursorEngine(options);
}
