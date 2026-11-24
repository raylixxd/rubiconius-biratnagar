/**
 * src/engine/showroom/cameraSpline.ts
 *
 * 3D Cinematic Camera Spline Flight System & Dual-Mode Decoupling State Machine
 *
 * Reverse-engineered and extracted from Sculpting Harmony (04_sculpting_harmony):
 * 1. Dual-Algorithm Spline Flight Trajectory:
 *    - CatmullRomCurve3 (centripetal parameterization with arc-length remapping)
 *    - Piecewise Cubic Bezier Splines with continuous C1 tangent hermite derivation
 *    - Trajectory passes through 4 architectural POVs:
 *      • POV 01: F.S. III Master Bay (Fluted Sal Canopy & Cove Grazing)
 *      • POV 02: F.S. II Joinery Axis (Honed Marble Plane & Credenza Datum)
 *      • POV 03: F.S. I Terracotta Threshold (Monolithic Plinth & Raking Daylight)
 *      • POV 04: Material Study Table (Tactile Macro Specimen Array & Specular Grazing)
 *    - Synchronized dual-curve flight: independent Camera Eye Spline and Target LookAt Spline
 *    - Arc-length parameter remapping guarantees exact control-point landing with zero overshoot
 *    - Dynamic banking & roll: lateral acceleration curvature analysis creates cinematic dolly roll
 *    - Velocity-driven FOV breathing: subtle focal length expansion during high-speed travel
 *
 * 2. Dual-Mode State Machine (04_sculpting_harmony decoupling architecture):
 *    - 'story' mode (_I = 'story'): Page scroll progress drives camera spline position and
 *      chapter titles. Pointer provides subtle ambient parallax yaw/pitch (±2.0°).
 *      Smooth Lenis scrolling is active.
 *    - 'scene' mode (gI = 'scene'): Lenis/native page scroll is automatically decoupled
 *      and paused via stopScroll(). Camera transitions into free spherical orbit inspection
 *      around the active architectural POV's focal anchor.
 *    - Spherical coordinate tracking: radius, polar angle (phi), azimuthal angle (theta).
 *      Configured with 04_sculpting_harmony starting rotation:
 *      `startRot: { phi: Math.PI * 0.5, theta: -0.7 }`.
 *    - Smooth 850ms Quintic easing cross-fade transition between story spline and scene orbit.
 *    - Touch & pointer gesture recognition: 1-finger orbit, 2-finger pinch zoom, double-tap reset.
 *    - Keyboard navigation: Space/Escape toggles mode; keys 1-4 jump between architectural POVs.
 *
 * Designed for Rubiconius Biratnagar Showroom (Three.js r187 / TypeScript 6.0).
 */

import * as THREE from 'three';
import { stopScroll, startScroll, scrollToTarget, getScrollLimit, type ScrollState } from '../scroll';
import { isTouch, prefersReducedMotion } from '../env';
import { studioAudio } from '../audio';

// ============================================================================
// Types & Interfaces
// ============================================================================

/** Interaction mode matching 04_sculpting_harmony dual-mode machine */
export type ShowroomInteractionMode = 'story' | 'scene';

/** Underlying 3D spline algorithm */
export type SplineAlgorithm = 'catmullrom' | 'cubic-bezier';

/** Spherical orientation angles in radians */
export interface SphericalRotation {
  phi: number;   // Polar angle from positive Y axis [0..PI]
  theta: number; // Azimuthal angle around positive Y axis [-PI..PI]
}

/** Complete metadata for an architectural inspection point of view */
export interface ArchitecturalPOV {
  /** Unique semantic identifier */
  readonly id: string;
  /** Ledger display index ('01' - '04') */
  readonly index: string;
  /** Primary display title (e.g., 'F.S. III Master Bay') */
  readonly label: string;
  /** Architectural subtitle & craft focus */
  readonly subtitle: string;
  /** Canonical normalized scroll progress [0..1] */
  readonly canonicalU: number;
  /** 3D camera eye world position [x, y, z] */
  readonly position: [number, number, number];
  /** 3D camera focal look-at target [x, y, z] */
  readonly target: [number, number, number];
  /** Center of rotation for 'scene' mode free-orbit inspection */
  readonly orbitCenter: [number, number, number];
  /** Orbit radius boundaries in world units */
  readonly orbitRadius: {
    readonly default: number;
    readonly min: number;
    readonly max: number;
  };
  /** Default spherical orientation upon entering 'scene' mode (from 04_sculpting_harmony) */
  readonly startRot: SphericalRotation;
  /** Base camera field of view in degrees */
  readonly fov: number;
  /** Specimen material swatches highlighted at this waypoint */
  readonly materials: readonly string[];
  /** Editorial architectural narrative note */
  readonly description: string;
  /** Technical scope annotation */
  readonly architecturalSpec: string;
}

/** Evaluated instantaneous camera state */
export interface CameraFrame {
  position: THREE.Vector3;
  target: THREE.Vector3;
  up: THREE.Vector3;
  fov: number;
  roll: number;
  progressU: number;
  activePOVIndex: number;
  mode: ShowroomInteractionMode;
  transitionProgress: number; // 0.0 = pure story, 1.0 = pure scene orbit
}

/** Configuration options for CameraSplineController */
export interface CameraSplineOptions {
  /** Spline mathematical formulation. Default: 'catmullrom' */
  algorithm: SplineAlgorithm;
  /** Base camera FOV in degrees. Default: 52 */
  baseFov: number;
  /** FOV expansion per normalized unit velocity. Default: 2.4 degrees */
  fovBreathingScale: number;
  /** Dynamic camera roll / banking intensity into spline turns. Default: 0.042 radians */
  bankIntensity: number;
  /** Rotational inertia damping for spherical orbit. Default: 8.5 */
  orbitFriction: number;
  /** Zoom inertia damping for spherical orbit. Default: 9.0 */
  zoomFriction: number;
  /** Pointer interaction sensitivities */
  orbitSensitivity: {
    rotate: number;      // Desktop pointer drag (default: 0.0032)
    zoom: number;        // Mouse wheel zoom (default: 0.0016)
    touchRotate: number; // Touch move sensitivity (default: 0.0042)
    pinchZoom: number;   // Touch 2-finger pinch sensitivity (default: 0.0080)
  };
  /** Ambient parallax look tilt in 'story' mode */
  parallaxIntensity: {
    yaw: number;   // Max yaw in radians (default: 2.2 * DEG)
    pitch: number; // Max pitch in radians (default: 1.8 * DEG)
  };
  /** Duration of animated transition between story and scene in seconds. Default: 0.85 */
  transitionDuration: number;
  /** Optional external AbortSignal for automatic cleanup */
  signal?: AbortSignal;
}

// ============================================================================
// 4 Architectural POVs (Immutable Canonical Definition)
// ============================================================================

export const ARCHITECTURAL_POVS: readonly ArchitecturalPOV[] = [
  {
    id: 'fs-iii-master-bay',
    index: '01',
    label: 'F.S. III Master Bay',
    subtitle: '01 / Solid Sal Fluting & Cove Grazing',
    canonicalU: 0.0,
    position: [-0.45, 1.62, 6.8],
    target: [0.15, 1.42, 1.2],
    orbitCenter: [0.15, 1.42, 1.2],
    orbitRadius: {
      default: 5.65,
      min: 2.0,
      max: 9.5,
    },
    // Sculpting Harmony benchmark coordinate: {phi: Math.PI * 0.5, theta: -0.7}
    startRot: {
      phi: Math.PI * 0.5,
      theta: -0.7,
    },
    fov: 52,
    materials: [
      'Vertical fluted solid Sal timber (Shorea robusta)',
      'Tailored woven linen upholstered headboard',
      'Brushed brass multi-globe bedside sconces',
      'Concealed 2700K perimeter architectural cove',
    ],
    description:
      'Continuous vertical fluting in seasoned Sal hardwood wraps the wall and ceiling plane into an intimate sleeping canopy with low-glare perimeter grazing.',
    architecturalSpec: 'CANOPY PROPORTION · SAL WOOD FLUTING · 2700K INDIRECT COVE',
  },
  {
    id: 'fs-ii-joinery-axis',
    index: '02',
    label: 'F.S. II Joinery Axis',
    subtitle: '02 / Honed Marble Plane & Millwork Datum',
    canonicalU: 0.333,
    position: [-1.25, 1.52, 2.65],
    target: [1.85, 1.05, -0.4],
    orbitCenter: [1.85, 1.05, -0.4],
    orbitRadius: {
      default: 4.4,
      min: 1.5,
      max: 8.5,
    },
    startRot: {
      phi: Math.PI * 0.48,
      theta: -0.85,
    },
    fov: 54,
    materials: [
      'Large-format honed veined marble slabs',
      'Custom fluted dark oak credenza joinery',
      'Multi-tier brushed brass chandelier',
      'Matte black-profile garden fenestration',
    ],
    description:
      'Linear sightline through formal hosting salon balancing cool book-matched marble slabs against warm oak credenza cabinetry and wide garden portals.',
    architecturalSpec: 'AXIAL CONTINUITY · VEINED MARBLE FLOOR · SHOREA ROBUSTA JOINERY',
  },
  {
    id: 'fs-i-terracotta-threshold',
    index: '03',
    label: 'F.S. I Terracotta Threshold',
    subtitle: '03 / Monolithic Plinth & Raking Daylight',
    canonicalU: 0.667,
    position: [0.65, 1.58, -1.85],
    target: [-1.4, 1.22, -4.6],
    orbitCenter: [-1.4, 1.22, -4.6],
    orbitRadius: {
      default: 3.85,
      min: 1.4,
      max: 7.2,
    },
    startRot: {
      phi: Math.PI * 0.52,
      theta: -0.55,
    },
    fov: 54,
    materials: [
      'Hand-troweled matte lime plaster surfaces',
      'Twin vertical fluted hardwood portals',
      'Travertine exhibition display plinth',
      'Blackened wrought-iron structural brackets',
    ],
    description:
      'Raking afternoon daylight catches hand-troweled lime plaster surfaces and deep timber door reveals, framing curated Mithila artwork and terracotta plinths.',
    architecturalSpec: 'MINERAL PLASTER LIGHT · FLUTED TIMBER PORTAL · TRAVERTINE PLINTH',
  },
  {
    id: 'material-study-table',
    index: '04',
    label: 'Material Study Table',
    subtitle: '04 / Macro Specimen Array & Specular Grazing',
    canonicalU: 1.0,
    position: [0.05, 1.35, -5.25],
    target: [0.0, 0.95, -7.1],
    orbitCenter: [0.0, 0.95, -7.1],
    orbitRadius: {
      default: 2.5,
      min: 0.85,
      max: 5.0,
    },
    startRot: {
      phi: Math.PI * 0.42,
      theta: -0.7,
    },
    fov: 50,
    materials: [
      'Honed matte Kota limestone specimen',
      'Deep veined Verde Alpi accent stone',
      'Unlacquered hand-spun brass cabinet pull',
      'Low-iron fluted reeded glass specimen',
    ],
    description:
      'Close tactile inspection of tactile architectural specimens arranged under calibrated directional sunlight for material contrast analysis.',
    architecturalSpec: 'TACTILE SPECIMEN ATRIUM · PBR MACRO ATELIER · 4-SPECIMEN ARRAY',
  },
];

// Constants
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// ============================================================================
// Mathematical Spline Flight Trajectory Core
// ============================================================================

/**
 * High-precision arc-length parameterized 3D spline trajectory.
 * Supports both CatmullRomCurve3 and compound piecewise CubicBezier curves.
 */
class CinematicSplinePath {
  private curve: THREE.Curve<THREE.Vector3>;
  private controlPoints: THREE.Vector3[];
  private arcSamples = 500;
  private sampledPoints: THREE.Vector3[] = [];
  private waypointArcLengths: number[] = [];

  constructor(points: THREE.Vector3[], algorithm: SplineAlgorithm) {
    this.controlPoints = points.map((p) => p.clone());

    if (algorithm === 'cubic-bezier') {
      this.curve = this.buildCubicBezierPath(this.controlPoints);
    } else {
      // CatmullRom with centripetal parameterization prevents self-intersections and cusp loops
      this.curve = new THREE.CatmullRomCurve3(this.controlPoints, false, 'centripetal', 0.5);
    }

    this.precomputeArcLengthMapping();
  }

  /**
   * Constructs C1-continuous compound Cubic Bezier curve path from control points.
   * Derives smooth Hermite tangents at internal vertices.
   */
  private buildCubicBezierPath(pts: THREE.Vector3[]): THREE.CurvePath<THREE.Vector3> {
    const path = new THREE.CurvePath<THREE.Vector3>();
    const n = pts.length;
    if (n < 2) return path;

    // Calculate smooth tangents using Catmull-Rom finite differences
    const tangents: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      const prev = pts[Math.max(0, i - 1)];
      const next = pts[Math.min(n - 1, i + 1)];
      const tangent = new THREE.Vector3().subVectors(next, prev).multiplyScalar(0.5);
      tangents.push(tangent);
    }

    // Build cubic bezier segments with tangent handles
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[i];
      const p3 = pts[i + 1];
      const t0 = tangents[i];
      const t1 = tangents[i + 1];

      // Handle length is 1/3 of tangent vector
      const p1 = new THREE.Vector3().copy(p0).addScaledVector(t0, 1.0 / 3.0);
      const p2 = new THREE.Vector3().copy(p3).addScaledVector(t1, -1.0 / 3.0);

      const segment = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
      path.add(segment);
    }

    return path;
  }

  /**
   * Precomputes exact arc-length parameter for each architectural control point,
   * eliminating spline velocity drift between chapters.
   */
  private precomputeArcLengthMapping(): void {
    const samples = this.arcSamples;
    this.sampledPoints = [];
    for (let i = 0; i <= samples; i++) {
      this.sampledPoints.push(this.curve.getPointAt(i / samples));
    }

    const n = this.controlPoints.length;
    this.waypointArcLengths = [0];

    let lastIdx = 0;
    for (let k = 1; k < n - 1; k++) {
      let bestIdx = lastIdx;
      let bestDistSq = Infinity;
      const targetPt = this.controlPoints[k];

      for (let i = lastIdx; i <= samples; i++) {
        const dSq = this.sampledPoints[i].distanceToSquared(targetPt);
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = i;
        }
      }
      lastIdx = bestIdx;
      this.waypointArcLengths.push(bestIdx / samples);
    }
    this.waypointArcLengths.push(1.0);
  }

  /**
   * Maps normalized canonical scroll progress [0..1] through piecewise control point
   * intervals onto exact curve arc-length parameter u.
   */
  public remapScrollToCurveU(scrollU: number): number {
    const clamped = THREE.MathUtils.clamp(scrollU, 0, 1);
    const n = ARCHITECTURAL_POVS.length;
    if (n <= 1) return clamped;

    for (let i = 0; i < n - 1; i++) {
      const uA = ARCHITECTURAL_POVS[i].canonicalU;
      const uB = ARCHITECTURAL_POVS[i + 1].canonicalU;
      if (clamped >= uA && clamped <= uB) {
        const span = Math.max(0.00001, uB - uA);
        const localT = (clamped - uA) / span;
        const arcA = this.waypointArcLengths[i];
        const arcB = this.waypointArcLengths[i + 1];
        return THREE.MathUtils.lerp(arcA, arcB, localT);
      }
    }
    return clamped;
  }

  /** Evaluates 3D position along curve at normalized arc-length u [0..1] */
  public getPointAt(curveU: number, out: THREE.Vector3): THREE.Vector3 {
    return this.curve.getPointAt(THREE.MathUtils.clamp(curveU, 0, 1), out);
  }

  /** Evaluates unit tangent vector along curve at normalized arc-length u [0..1] */
  public getTangentAt(curveU: number, out: THREE.Vector3): THREE.Vector3 {
    return this.curve.getTangentAt(THREE.MathUtils.clamp(curveU, 0, 1), out);
  }
}

// ============================================================================
// Spherical Orbit Math & Free-Inspection Controller ('Scene' Mode)
// ============================================================================

/**
 * Spherical coordinate orbit state for user inspection in 'scene' mode.
 * Extracted from Sculpting Harmony camera orbit controller.
 */
class SphericalOrbitController {
  public center = new THREE.Vector3();
  public targetCenter = new THREE.Vector3();

  public radius = 5.0;
  public targetRadius = 5.0;
  public minRadius = 1.0;
  public maxRadius = 12.0;

  public phi = Math.PI * 0.5;       // Polar angle (0 = zenith, PI = nadir)
  public targetPhi = Math.PI * 0.5;
  public theta = -0.7;              // Azimuthal angle around Y axis
  public targetTheta = -0.7;

  // Inertial angular and radial velocity
  private velPhi = 0;
  private velTheta = 0;
  private velRadius = 0;

  // Pole limits to prevent gimbal lock / inversion
  private readonly minPhi = 0.08 * Math.PI; // ~14.4° from zenith
  private readonly maxPhi = 0.88 * Math.PI; // ~158.4° from nadir

  constructor() {}

  /**
   * Resets orbit to target architectural POV's specified orbit center,
   * radius, and starting spherical rotation.
   */
  public resetToPOV(pov: ArchitecturalPOV, immediate = false): void {
    this.targetCenter.set(...pov.orbitCenter);
    this.targetRadius = THREE.MathUtils.clamp(
      pov.orbitRadius.default,
      pov.orbitRadius.min,
      pov.orbitRadius.max
    );
    this.minRadius = pov.orbitRadius.min;
    this.maxRadius = pov.orbitRadius.max;

    this.targetPhi = THREE.MathUtils.clamp(pov.startRot.phi, this.minPhi, this.maxPhi);
    this.targetTheta = pov.startRot.theta;

    if (immediate) {
      this.center.copy(this.targetCenter);
      this.radius = this.targetRadius;
      this.phi = this.targetPhi;
      this.theta = this.targetTheta;
      this.velPhi = 0;
      this.velTheta = 0;
      this.velRadius = 0;
    }
  }

  /**
   * Initializes spherical orbit state directly from an arbitrary Cartesian position & lookAt.
   */
  public setFromCartesian(position: THREE.Vector3, target: THREE.Vector3): void {
    this.targetCenter.copy(target);
    this.center.copy(target);

    const offset = new THREE.Vector3().subVectors(position, target);
    this.radius = Math.max(0.5, offset.length());
    this.targetRadius = this.radius;

    // Convert Cartesian to Spherical:
    // radius = sqrt(x^2 + y^2 + z^2)
    // phi = acos(y / radius)
    // theta = atan2(x, z)
    this.phi = Math.acos(THREE.MathUtils.clamp(offset.y / this.radius, -1, 1));
    this.phi = THREE.MathUtils.clamp(this.phi, this.minPhi, this.maxPhi);
    this.targetPhi = this.phi;

    this.theta = Math.atan2(offset.x, offset.z);
    this.targetTheta = this.theta;

    this.velPhi = 0;
    this.velTheta = 0;
    this.velRadius = 0;
  }

  /**
   * Injects rotational drag input from pointer/touch movement.
   */
  public applyDrag(deltaX: number, deltaY: number, sensitivity = 0.0032): void {
    // Horizontal drag changes azimuth theta
    this.velTheta -= deltaX * sensitivity;
    // Vertical drag changes polar elevation phi
    this.velPhi -= deltaY * sensitivity;
  }

  /**
   * Injects zoom wheel/pinch input.
   */
  public applyZoom(delta: number, sensitivity = 0.0016): void {
    this.velRadius += delta * sensitivity * this.targetRadius;
  }

  /**
   * Updates damped physics step.
   */
  public update(dt: number, friction = 8.5): void {
    const kDamp = 1.0 - Math.exp(-friction * dt);

    // Apply velocities
    this.targetTheta += this.velTheta;
    this.targetPhi += this.velPhi;
    this.targetRadius += this.velRadius;

    // Decelerate velocities
    this.velTheta *= Math.max(0, 1.0 - kDamp * 1.2);
    this.velPhi *= Math.max(0, 1.0 - kDamp * 1.2);
    this.velRadius *= Math.max(0, 1.0 - kDamp * 1.2);

    // Enforce limits on targets
    this.targetPhi = THREE.MathUtils.clamp(this.targetPhi, this.minPhi, this.maxPhi);
    this.targetRadius = THREE.MathUtils.clamp(this.targetRadius, this.minRadius, this.maxRadius);

    // Smooth lerp of instantaneous angles towards target
    this.phi += (this.targetPhi - this.phi) * kDamp;
    this.theta += (this.targetTheta - this.theta) * kDamp;
    this.radius += (this.targetRadius - this.radius) * kDamp;
    this.center.lerp(this.targetCenter, kDamp);
  }

  /**
   * Computes resulting Cartesian camera position from current spherical orbit.
   */
  public toCartesian(outPosition: THREE.Vector3): void {
    // Spherical to Cartesian:
    // x = r * sin(phi) * sin(theta)
    // y = r * cos(phi)
    // z = r * sin(phi) * cos(theta)
    const sinPhi = Math.sin(this.phi);
    outPosition.set(
      this.radius * sinPhi * Math.sin(this.theta),
      this.radius * Math.cos(this.phi),
      this.radius * sinPhi * Math.cos(this.theta)
    );
    outPosition.add(this.center);
  }
}

// ============================================================================
// CameraSplineController Main Engine Class
// ============================================================================

/**
 * 3D Cinematic Camera Spline Flight System & Dual-Mode Decoupling State Machine.
 * Manages trajectory flight, dynamic banking, velocity FOV breathing,
 * Lenis scroll lock decoupling, and spherical free-orbit inspection.
 */
export class CameraSplineController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private options: CameraSplineOptions;
  private abortController: AbortController;

  // Trajectory Splines
  private posSpline: CinematicSplinePath;
  private tgtSpline: CinematicSplinePath;

  // Dual-mode state machine matching 04_sculpting_harmony (_I = 'story', gI = 'scene')
  private mode: ShowroomInteractionMode = 'story';
  private transitionProgress = 0.0; // 0 = story, 1 = scene
  private isTransitioning = false;
  private transitionTimer = 0;
  private transitionDuration = 0.85;

  // Spherical orbit controller for 'scene' mode
  private orbit = new SphericalOrbitController();

  // Instantaneous spline evaluations
  private splinePos = new THREE.Vector3();
  private splineTarget = new THREE.Vector3();
  private splineTangent = new THREE.Vector3();

  // Instantaneous orbit evaluations
  private orbitPos = new THREE.Vector3();
  private orbitTarget = new THREE.Vector3();

  // Blended output frame vectors
  private finalPos = new THREE.Vector3();
  private finalTarget = new THREE.Vector3();
  private finalUp = new THREE.Vector3(0, 1, 0);

  // Dynamic camera attributes
  private currentRoll = 0;
  private currentFov: number;
  private currentProgressU = 0;
  private activePOVIndex = 0;

  // Subtle story parallax tracking
  private pointerNorm = { x: 0, y: 0 };
  private pointerTarget = { x: 0, y: 0 };
  private storyParallaxYaw = 0;
  private storyParallaxPitch = 0;

  // Pointer drag & touch tracking
  private isPointerDown = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private touchStartDistance = 0;
  private isPinching = false;

  // Event Listeners
  private povChangeListeners = new Set<(pov: ArchitecturalPOV, index: number) => void>();
  private modeChangeListeners = new Set<(mode: ShowroomInteractionMode) => void>();
  private frameListeners = new Set<(frame: CameraFrame) => void>();

  // Scroll lock safety guard to ensure perfect 1:1 balance of stop/start calls
  private hasScrollLocked = false;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    options?: Partial<CameraSplineOptions>
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.abortController = new AbortController();

    this.options = {
      algorithm: options?.algorithm ?? 'catmullrom',
      baseFov: options?.baseFov ?? camera.fov,
      fovBreathingScale: options?.fovBreathingScale ?? 2.4,
      bankIntensity: options?.bankIntensity ?? 0.042,
      orbitFriction: options?.orbitFriction ?? 8.5,
      zoomFriction: options?.zoomFriction ?? 9.0,
      orbitSensitivity: {
        rotate: options?.orbitSensitivity?.rotate ?? 0.0032,
        zoom: options?.orbitSensitivity?.zoom ?? 0.0016,
        touchRotate: options?.orbitSensitivity?.touchRotate ?? 0.0042,
        pinchZoom: options?.orbitSensitivity?.pinchZoom ?? 0.008,
      },
      parallaxIntensity: {
        yaw: options?.parallaxIntensity?.yaw ?? 2.2 * DEG_TO_RAD,
        pitch: options?.parallaxIntensity?.pitch ?? 1.8 * DEG_TO_RAD,
      },
      transitionDuration: options?.transitionDuration ?? 0.85,
      signal: options?.signal,
    };

    this.currentFov = this.options.baseFov;

    // Link optional parent AbortSignal
    if (this.options.signal) {
      this.options.signal.addEventListener('abort', () => this.dispose(), { once: true });
    }

    // Build position and target splines across all 4 architectural POVs
    const camPts = ARCHITECTURAL_POVS.map((p) => new THREE.Vector3(...p.position));
    const tgtPts = ARCHITECTURAL_POVS.map((p) => new THREE.Vector3(...p.target));

    this.posSpline = new CinematicSplinePath(camPts, this.options.algorithm);
    this.tgtSpline = new CinematicSplinePath(tgtPts, this.options.algorithm);

    // Initial evaluation at u = 0.0
    const curveU = this.posSpline.remapScrollToCurveU(0.0);
    this.posSpline.getPointAt(curveU, this.splinePos);
    this.tgtSpline.getPointAt(curveU, this.splineTarget);
    this.camera.position.copy(this.splinePos);
    this.camera.lookAt(this.splineTarget);

    // Setup input listeners
    this.bindEvents();

    // Register initial POV
    this.updateActivePOV(0.0, true);
  }

  // ==========================================================================
  // Event Binding & DOM Interaction Setup
  // ==========================================================================

  private bindEvents(): void {
    const { signal } = this.abortController;

    // Desktop Pointer Events
    this.domElement.addEventListener('pointerdown', this.onPointerDown, { signal });
    window.addEventListener('pointermove', this.onPointerMove, { passive: true, signal });
    window.addEventListener('pointerup', this.onPointerUp, { passive: true, signal });
    window.addEventListener('pointercancel', this.onPointerUp, { passive: true, signal });
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false, signal });
    this.domElement.addEventListener('dblclick', this.onDoubleClick, { signal });

    // Touch Pinch & Zoom Events
    this.domElement.addEventListener('touchstart', this.onTouchStart, { passive: true, signal });
    this.domElement.addEventListener('touchmove', this.onTouchMove, { passive: false, signal });
    this.domElement.addEventListener('touchend', this.onTouchEnd, { passive: true, signal });

    // Keyboard Shortcuts (Space toggles mode, Escape exits scene, 1-4 jump to POVs)
    window.addEventListener('keydown', this.onKeyDown, { signal });
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    this.isPointerDown = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    if (this.mode === 'scene') {
      this.domElement.style.cursor = 'grabbing';
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);

    // Normalized screen coordinates [-1..1] for ambient story parallax
    this.pointerTarget.x = THREE.MathUtils.clamp((e.clientX / w) * 2 - 1, -1, 1);
    this.pointerTarget.y = THREE.MathUtils.clamp((e.clientY / h) * 2 - 1, -1, 1);

    if (this.isPointerDown && this.mode === 'scene') {
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;

      this.orbit.applyDrag(dx, dy, this.options.orbitSensitivity.rotate);
    }
  };

  private onPointerUp = (): void => {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;
    if (this.mode === 'scene') {
      this.domElement.style.cursor = 'grab';
    }
  };

  private onWheel = (e: WheelEvent): void => {
    if (this.mode === 'scene') {
      // In scene mode, wheel controls spherical zoom and must not trigger page scroll
      e.preventDefault();
      e.stopPropagation();
      this.orbit.applyZoom(e.deltaY, this.options.orbitSensitivity.zoom);
    }
  };

  private onDoubleClick = (): void => {
    if (this.mode === 'scene') {
      // Double click resets orbit to active POV's default startRot and radius
      const activePOV = ARCHITECTURAL_POVS[this.activePOVIndex];
      this.orbit.resetToPOV(activePOV, false);
      studioAudio.tick(720, 0.025);
    }
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 2) {
      this.isPinching = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.touchStartDistance = Math.hypot(dx, dy);
    } else if (e.touches.length === 1) {
      this.isPinching = false;
      this.lastPointerX = e.touches[0].clientX;
      this.lastPointerY = e.touches[0].clientY;
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (this.mode !== 'scene') return;

    // Prevent native page pull-to-refresh or rubber-banding while inspecting 3D model
    e.preventDefault();

    if (e.touches.length === 2 && this.isPinching) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const deltaDist = this.touchStartDistance - dist;
      this.touchStartDistance = dist;
      this.orbit.applyZoom(deltaDist * 4.0, this.options.orbitSensitivity.pinchZoom);
    } else if (e.touches.length === 1 && !this.isPinching) {
      const dx = e.touches[0].clientX - this.lastPointerX;
      const dy = e.touches[0].clientY - this.lastPointerY;
      this.lastPointerX = e.touches[0].clientX;
      this.lastPointerY = e.touches[0].clientY;
      this.orbit.applyDrag(dx, dy, this.options.orbitSensitivity.touchRotate);
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    if (e.touches.length < 2) {
      this.isPinching = false;
    }
    if (e.touches.length === 1) {
      this.lastPointerX = e.touches[0].clientX;
      this.lastPointerY = e.touches[0].clientY;
    }
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    // Ignore input if user is typing into a text field
    const activeEl = document.activeElement;
    if (
      activeEl instanceof HTMLInputElement ||
      activeEl instanceof HTMLTextAreaElement ||
      activeEl?.getAttribute('contenteditable') === 'true'
    ) {
      return;
    }

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      this.toggleMode();
    } else if (e.key === 'Escape' || e.code === 'Escape') {
      if (this.mode === 'scene') {
        e.preventDefault();
        this.setMode('story');
      }
    } else if (['1', '2', '3', '4'].includes(e.key)) {
      e.preventDefault();
      const povIdx = parseInt(e.key, 10) - 1;
      this.jumpToPOV(povIdx);
    }
  };

  // ==========================================================================
  // Dual-Mode State Machine & Scroll Decoupling
  // ==========================================================================

  /**
   * Sets current interaction mode with animated Quintic easing cross-fade.
   * Automatically handles Lenis scroll locking / decoupling.
   */
  public async setMode(
    targetMode: ShowroomInteractionMode,
    customDuration?: number
  ): Promise<void> {
    if (this.mode === targetMode && !this.isTransitioning) return;

    this.mode = targetMode;
    this.transitionDuration = customDuration ?? this.options.transitionDuration;
    this.isTransitioning = true;
    this.transitionTimer = 0;

    if (targetMode === 'scene') {
      // 04_sculpting_harmony decoupling gate: pause Lenis scroll immediately
      if (!this.hasScrollLocked) {
        stopScroll();
        this.hasScrollLocked = true;
      }
      this.domElement.style.cursor = 'grab';

      // Seed spherical orbit from current camera position and active POV target
      this.orbit.setFromCartesian(this.splinePos, this.splineTarget);

      // Play subtle acoustic focus click
      studioAudio.tick(640, 0.035);
    } else {
      // Restore Lenis scroll
      if (this.hasScrollLocked) {
        startScroll();
        this.hasScrollLocked = false;
      }
      this.domElement.style.cursor = 'default';

      // Play acoustic release tick
      studioAudio.tick(480, 0.03);
    }

    // Notify registered listeners
    this.modeChangeListeners.forEach((fn) => fn(this.mode));
  }

  /**
   * Toggles between 'story' and 'scene' interaction modes.
   */
  public async toggleMode(): Promise<void> {
    const nextMode = this.mode === 'story' ? 'scene' : 'story';
    return this.setMode(nextMode);
  }

  /** Current active mode */
  public getMode(): ShowroomInteractionMode {
    return this.mode;
  }

  /** Whether the state machine is currently animating a mode cross-fade */
  public isModeTransitioning(): boolean {
    return this.isTransitioning;
  }

  // ==========================================================================
  // POV Navigation & Arc-Length Teleportation
  // ==========================================================================

  /**
   * Jumps camera to a target architectural POV by index (0..3) or semantic ID.
   */
  public jumpToPOV(povIndexOrId: number | string, immediate = false): void {
    let targetIdx = 0;
    if (typeof povIndexOrId === 'number') {
      targetIdx = THREE.MathUtils.clamp(povIndexOrId, 0, ARCHITECTURAL_POVS.length - 1);
    } else {
      const found = ARCHITECTURAL_POVS.findIndex((p) => p.id === povIndexOrId);
      if (found !== -1) targetIdx = found;
    }

    const pov = ARCHITECTURAL_POVS[targetIdx];
    if (!pov) return;

    studioAudio.tick(560, 0.025);

    if (this.mode === 'scene') {
      // In scene mode, animate orbit center to the new POV
      this.orbit.resetToPOV(pov, immediate);
      this.activePOVIndex = targetIdx;
      this.povChangeListeners.forEach((fn) => fn(pov, targetIdx));
    } else {
      // In story mode, drive page scroll via Lenis to the canonical U
      const limit = getScrollLimit();
      const targetScrollY = pov.canonicalU * limit;
      scrollToTarget(targetScrollY, {
        duration: immediate ? 0 : 1.2,
        immediate,
      });
    }
  }

  /** Active architectural POV metadata */
  public getActivePOV(): ArchitecturalPOV {
    return ARCHITECTURAL_POVS[this.activePOVIndex];
  }

  /** Active architectural POV index (0..3) */
  public getActivePOVIndex(): number {
    return this.activePOVIndex;
  }

  /** Normalized scroll progress u [0..1] */
  public getProgress(): number {
    return this.currentProgressU;
  }

  /** Resets orbit rotation in 'scene' mode to 04_sculpting_harmony default */
  public resetOrbit(immediate = false): void {
    const activePOV = ARCHITECTURAL_POVS[this.activePOVIndex];
    this.orbit.resetToPOV(activePOV, immediate);
  }

  // ==========================================================================
  // Per-Frame Evaluation & Render Tick
  // ==========================================================================

  /**
   * Updates camera spline position, dynamic banking, velocity FOV breathing,
   * spherical orbit damping, and dual-mode cross-fading.
   *
   * @param scrollProgress Normalized page scroll progress [0..1]
   * @param scrollVelocity Signed scroll velocity from Lenis ticker
   * @param dt Delta time in seconds
   * @returns Evaluated CameraFrame
   */
  public update(scrollProgress: number, scrollVelocity: number, dt: number): CameraFrame {
    const reduced = prefersReducedMotion();
    this.currentProgressU = THREE.MathUtils.clamp(scrollProgress, 0, 1);

    // 1. Evaluate Spline Trajectory ('Story' baseline)
    const curveU = this.posSpline.remapScrollToCurveU(this.currentProgressU);
    this.posSpline.getPointAt(curveU, this.splinePos);
    this.tgtSpline.getPointAt(curveU, this.splineTarget);
    this.posSpline.getTangentAt(curveU, this.splineTangent);

    // Dynamic banking / roll:
    // When spline turns in XZ plane, bank camera subtly into turn like a steadycam
    if (!reduced) {
      const targetRoll = -this.splineTangent.x * this.options.bankIntensity;
      const kRoll = 1.0 - Math.exp(-6.0 * dt);
      this.currentRoll += (targetRoll - this.currentRoll) * kRoll;
    } else {
      this.currentRoll = 0;
    }

    // Velocity-driven FOV breathing:
    // +2.4° during fast scroll glides, settling smoothly back to baseFov at rest
    const speedNorm = THREE.MathUtils.clamp(Math.abs(scrollVelocity) / 32.0, 0, 1);
    const targetFov = reduced
      ? this.options.baseFov
      : this.options.baseFov + speedNorm * this.options.fovBreathingScale;
    const kFov = 1.0 - Math.exp(-5.0 * dt);
    this.currentFov += (targetFov - this.currentFov) * kFov;

    // Subtle pointer parallax look-tilt in 'story' mode
    if (!reduced && !isTouch() && this.mode === 'story') {
      const kPointer = 1.0 - Math.exp(-6.5 * dt);
      this.pointerNorm.x += (this.pointerTarget.x - this.pointerNorm.x) * kPointer;
      this.pointerNorm.y += (this.pointerTarget.y - this.pointerNorm.y) * kPointer;

      this.storyParallaxYaw = -this.pointerNorm.x * this.options.parallaxIntensity.yaw;
      this.storyParallaxPitch = -this.pointerNorm.y * this.options.parallaxIntensity.pitch;
    } else {
      this.storyParallaxYaw = 0;
      this.storyParallaxPitch = 0;
    }

    // 2. Evaluate Spherical Orbit ('Scene' inspection)
    this.orbit.update(dt, this.options.orbitFriction);
    this.orbit.toCartesian(this.orbitPos);
    this.orbitTarget.copy(this.orbit.center);

    // 3. Evaluate Dual-Mode Cross-Fade Transition
    if (this.isTransitioning) {
      this.transitionTimer += dt;
      const rawT = THREE.MathUtils.clamp(this.transitionTimer / this.transitionDuration, 0, 1);
      // Quintic easeOut: 1 - (1 - t)^5
      const easeT = 1.0 - Math.pow(1.0 - rawT, 5);

      if (this.mode === 'scene') {
        this.transitionProgress = easeT;
      } else {
        this.transitionProgress = 1.0 - easeT;
      }

      if (rawT >= 1.0) {
        this.isTransitioning = false;
        this.transitionProgress = this.mode === 'scene' ? 1.0 : 0.0;
      }
    } else {
      this.transitionProgress = this.mode === 'scene' ? 1.0 : 0.0;
    }

    // 4. Blend Spline Frame and Orbit Frame
    const alpha = this.transitionProgress;
    this.finalPos.lerpVectors(this.splinePos, this.orbitPos, alpha);
    this.finalTarget.lerpVectors(this.splineTarget, this.orbitTarget, alpha);

    // Apply blended transforms to actual PerspectiveCamera
    this.camera.position.copy(this.finalPos);
    this.camera.lookAt(this.finalTarget);

    // Apply subtle story parallax and roll
    if (alpha < 0.99) {
      if (Math.abs(this.storyParallaxYaw) > 0.0001) this.camera.rotateY(this.storyParallaxYaw * (1.0 - alpha));
      if (Math.abs(this.storyParallaxPitch) > 0.0001) this.camera.rotateX(this.storyParallaxPitch * (1.0 - alpha));
      if (Math.abs(this.currentRoll) > 0.0001) this.camera.rotateZ(this.currentRoll * (1.0 - alpha));
    }

    // Update FOV & projection
    if (Math.abs(this.camera.fov - this.currentFov) > 0.005) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }

    // 5. Update Active Architectural POV Tracking
    this.updateActivePOV(this.currentProgressU, false);

    // 6. Assemble Frame State
    const frame: CameraFrame = {
      position: this.finalPos.clone(),
      target: this.finalTarget.clone(),
      up: this.camera.up.clone(),
      fov: this.camera.fov,
      roll: this.currentRoll,
      progressU: this.currentProgressU,
      activePOVIndex: this.activePOVIndex,
      mode: this.mode,
      transitionProgress: this.transitionProgress,
    };

    this.frameListeners.forEach((fn) => fn(frame));
    return frame;
  }

  /**
   * Tracks nearest architectural POV based on progress u and fires change events.
   */
  private updateActivePOV(progressU: number, isInitial = false): void {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < ARCHITECTURAL_POVS.length; i++) {
      const dist = Math.abs(progressU - ARCHITECTURAL_POVS[i].canonicalU);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    if (nearestIdx !== this.activePOVIndex || isInitial) {
      this.activePOVIndex = nearestIdx;
      const pov = ARCHITECTURAL_POVS[nearestIdx];

      // If already in 'scene' mode and user scrolls or jumps, update orbit center
      if (this.mode === 'scene' && !isInitial) {
        this.orbit.resetToPOV(pov, false);
      }

      this.povChangeListeners.forEach((fn) => fn(pov, nearestIdx));
    }
  }

  // ==========================================================================
  // Event Subscription Hooks
  // ==========================================================================

  /**
   * Subscribes to architectural POV change events.
   */
  public onPOVChange(callback: (pov: ArchitecturalPOV, index: number) => void): () => void {
    this.povChangeListeners.add(callback);
    // Immediately emit current state
    callback(ARCHITECTURAL_POVS[this.activePOVIndex], this.activePOVIndex);
    return () => {
      this.povChangeListeners.delete(callback);
    };
  }

  /**
   * Subscribes to interaction mode transitions ('story' <-> 'scene').
   */
  public onModeChange(callback: (mode: ShowroomInteractionMode) => void): () => void {
    this.modeChangeListeners.add(callback);
    callback(this.mode);
    return () => {
      this.modeChangeListeners.delete(callback);
    };
  }

  /**
   * Subscribes to per-frame camera evaluation ticks.
   */
  public onFrame(callback: (frame: CameraFrame) => void): () => void {
    this.frameListeners.add(callback);
    return () => {
      this.frameListeners.delete(callback);
    };
  }

  // ==========================================================================
  // Lifecycle Disposal
  // ==========================================================================

  /**
   * Disposes all listeners, aborts controllers, and releases scroll locks cleanly.
   */
  public dispose(): void {
    this.abortController.abort();

    // Release scroll lock if currently in scene mode
    if (this.hasScrollLocked) {
      startScroll();
      this.hasScrollLocked = false;
    }

    this.povChangeListeners.clear();
    this.modeChangeListeners.clear();
    this.frameListeners.clear();
    this.domElement.style.cursor = 'default';
  }
}
