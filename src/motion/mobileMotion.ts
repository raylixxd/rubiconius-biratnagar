/**
 * CINEMATIC MOBILE GYROSCOPE & DEVICE ORIENTATION MOTION PARALLAX ENGINE
 *
 * Reverse-engineered, production-grade mobile sensory motion choreography extracted from:
 * 1. 34_14islands: Cinematic mobile device tilt, multi-plane depth layering, and responsive camera parallax.
 * 2. 28_cuberto: Fluid 3D card tilt physics, dynamic specular reflection glare, and spring-damper sensor filtering.
 *
 * Core Capabilities:
 * 1. DeviceOrientationEvent sensor integration with iOS 13+ WebKit permission request handshake (requestPermission).
 * 2. Dual-axis alpha/beta/gamma rotation smoothing via second-order spring-damper dynamical physics (stiffness: 0.08, damping: 0.88).
 * 3. Jitter deadband filtering and shortest-angular-path unwrap preventing 360-degree rotational flips and hand micro-tremors.
 * 4. Multi-layer 3D tilt driver for mobile cards, hero typography/images, and Three.js camera look-at angle modulators.
 * 5. Automated device capability detection with seamless, zero-penalty fallback to kinetic touch/pointer drag and desktop emulation.
 * 6. High-performance design: zero per-frame garbage collection, sleep-on-rest RAF loop, and CSS hardware-accelerated custom properties.
 * 7. Full React 19 hooks and vanilla TypeScript singleton/controller architectures.
 */

import * as THREE from 'three';

// ============================================================================
// 1. TYPES, INTERFACES & PRESETS
// ============================================================================

/** Permission state of device orientation sensor */
export type DeviceSensorPermission =
  | 'unknown'
  | 'checking'
  | 'prompt'
  | 'granted'
  | 'denied'
  | 'unsupported';

/** Operating input mode currently driving motion */
export type MotionInputMode =
  | 'gyroscope'
  | 'touch_drag'
  | 'pointer_hover'
  | 'simulated'
  | 'disabled';

/** Raw orientation angles delivered by browser IMU */
export interface RawOrientationAngles {
  /** Compass heading (Z-axis, 0 to 360 deg) */
  alpha: number;
  /** Front-to-back tilt / pitch (X-axis, -180 to 180 deg) */
  beta: number;
  /** Left-to-right tilt / roll (Y-axis, -90 to 90 deg) */
  gamma: number;
  /** True if angles are relative to Earth's coordinate frame */
  absolute: boolean;
  /** Timestamp of raw sensor event */
  timestamp: number;
}

/** 2D Vector representing normalized or pixel offsets */
export interface Vector2D {
  x: number;
  y: number;
}

/** 3D Vector representing orientation or spatial offsets */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/** Instantaneous velocity state */
export interface MotionVelocity {
  x: number;
  y: number;
  z: number;
  magnitude: number;
}

/** Normalized motion state ready for visual parallax binding */
export interface NormalizedMotionState {
  /** Normalized horizontal tilt (-1.0 left to +1.0 right) */
  x: number;
  /** Normalized vertical tilt (-1.0 top to +1.0 bottom) */
  y: number;
  /** Normalized twist / yaw (-1.0 to +1.0) */
  z: number;
  /** Filtered raw pitch (beta) in degrees */
  pitchDeg: number;
  /** Filtered raw roll (gamma) in degrees */
  rollDeg: number;
  /** Filtered raw yaw (alpha) in degrees */
  yawDeg: number;
  /** Combined magnitude of normalized tilt (0.0 to ~1.414) */
  magnitude: number;
  /** Polar angle of tilt vector in radians (-PI to PI) */
  angleRad: number;
  /** Instantaneous normalized velocity */
  velocity: MotionVelocity;
  /** True when motion has converged to rest within tolerance */
  isResting: boolean;
  /** Active input mode providing motion data */
  activeMode: MotionInputMode;
  /** Timestamp of the computed state */
  timestamp: number;
}

/** Physics configuration parameters for spring-damper filter */
export interface SpringDamperConfig {
  /** Spring stiffness coefficient (default: 0.08) */
  stiffness: number;
  /** Damping dissipation ratio (default: 0.88, where 1.0 is critically damped) */
  damping: number;
  /** Virtual inertial mass (default: 1.0) */
  mass: number;
  /** Minimum sensor delta (degrees) below which micro-jitter is deadband filtered */
  deadbandDeg: number;
  /** Velocity and displacement epsilon to transition to sleep state */
  sleepThreshold: number;
}

/** Configuration options for the primary MobileMotionController */
export interface MobileMotionOptions {
  /** Spring physics settings */
  spring: Partial<SpringDamperConfig>;
  /** Maximum allowable tilt angle in degrees for horizontal axis (gamma, default: 35) */
  maxTiltX: number;
  /** Maximum allowable tilt angle in degrees for vertical axis (beta, default: 35) */
  maxTiltY: number;
  /** Neutral handheld pitch angle in degrees (default: 45.0, typical smartphone reading angle) */
  neutralBeta: number;
  /** Neutral handheld roll angle in degrees (default: 0.0) */
  neutralGamma: number;
  /** Automatically calibrate neutral handheld baseline on first interaction or prolonged hold */
  autoCalibrate: boolean;
  /** Duration in milliseconds of steady hold required to re-center neutral baseline */
  autoCalibrateDelay: number;
  /** Screen orientation dynamic axis remapping (portrait vs landscape) */
  trackScreenOrientation: boolean;
  /** Clean fallback to touch drag on unsupported devices or denied permissions */
  enableTouchFallback: boolean;
  /** Kinetic drag sensitivity multiplier for touch gestures */
  touchSensitivity: number;
  /** Inertial momentum decay friction for touch gestures (0.0 to 1.0) */
  touchFriction: number;
  /** Pull touch coordinates back to neutral center on release */
  touchSpringBack: boolean;
  /** Fallback to mouse hover tracking on desktop environments */
  enableMouseFallback: boolean;
  /** Respect user prefers-reduced-motion media query by freezing tilt at neutral */
  respectReducedMotion: boolean;
  /** Automatically detach/pause listeners when tab visibility is hidden */
  pauseWhenHidden: boolean;
}

/** Configuration for 3D card tilt driver (Cuberto style) */
export interface CardTiltOptions {
  /** Maximum 3D rotation along X-axis in degrees (pitch, default: 14) */
  maxRotationX: number;
  /** Maximum 3D rotation along Y-axis in degrees (yaw, default: 14) */
  maxRotationY: number;
  /** CSS 3D perspective depth in pixels (default: 1000) */
  perspective: number;
  /** Subtle scale boost applied to card on active tilt (default: 1.02) */
  scaleOnTilt: number;
  /** Z-translation depth elevation in pixels (default: 18) */
  elevationZ: number;
  /** Enable dynamic specular reflection glare highlight */
  enableGlare: boolean;
  /** Maximum opacity of specular glare highlight (default: 0.40) */
  maxGlareOpacity: number;
  /** Color of specular glare (default: 'rgba(255, 255, 255, 0.45)') */
  glareColor: string;
  /** Invert tilt direction */
  reverse: boolean;
  /** Transform easing curve identifier or custom mapping function */
  easing: (t: number) => number;
}

/** Layer configuration for multi-plane 2.5D parallax hero (14islands style) */
export interface ParallaxLayerConfig {
  /** Target element or selector string */
  element?: HTMLElement | null;
  /** Depth factor: negative moves background deeper, positive pops forward (-1.0 to 1.5) */
  depth: number;
  /** Maximum horizontal pixel offset */
  maxOffsetX: number;
  /** Maximum vertical pixel offset */
  maxOffsetY: number;
  /** Secondary rotation multiplier (degrees) */
  rotationFactor?: number;
  /** Scale factor response to tilt magnitude */
  scaleFactor?: number;
  /** Subtle blur dispersion factor response to angular velocity */
  blurFactor?: number;
}

/** Three.js 3D Camera Look-At modulator configuration */
export interface ThreeCameraGyroOptions {
  /** Maximum camera translation offset in 3D world units [x, y, z] */
  maxPositionOffset: [number, number, number];
  /** Maximum camera rotation angle offset in radians [x, y, z] */
  maxRotationOffset: [number, number, number];
  /** Base camera look-at target coordinate */
  baseTarget: [number, number, number];
  /** Maximum displacement of look-at target vector */
  maxTargetOffset: [number, number, number];
  /** Field of view perturbation response to tilt magnitude (degrees) */
  fovPerturbation: number;
  /** Smooth lerp interpolation factor blending with scene camera (0.0 to 1.0) */
  lerpFactor: number;
}

/** Diagnostic metrics for real-time telemetry HUD */
export interface MotionDiagnostics {
  fps: number;
  sensorUpdateCount: number;
  rawBeta: number;
  rawGamma: number;
  rawAlpha: number;
  smoothedX: number;
  smoothedY: number;
  velocity: number;
  jitterVariance: number;
  state: DeviceSensorPermission;
  mode: MotionInputMode;
  orientationType: string;
  isSleeping: boolean;
}

// Default Presets
export const MOTION_PRESETS = {
  /** 14islands signature: buttery, cinematic, deep multi-plane parallax with subtle response */
  FOURTEEN_ISLANDS_CINEMATIC: {
    spring: { stiffness: 0.08, damping: 0.88, mass: 1.0, deadbandDeg: 0.12, sleepThreshold: 0.0001 },
    maxTiltX: 30,
    maxTiltY: 30,
    neutralBeta: 45,
    neutralGamma: 0,
    touchSensitivity: 1.0,
    touchFriction: 0.92,
  } as Partial<MobileMotionOptions>,

  /** Cuberto signature: responsive, elastic 3D card tilt with vibrant specular reflection */
  CUBERTO_FLUID_CARD: {
    spring: { stiffness: 0.12, damping: 0.82, mass: 0.8, deadbandDeg: 0.08, sleepThreshold: 0.0001 },
    maxTiltX: 40,
    maxTiltY: 40,
    neutralBeta: 48,
    neutralGamma: 0,
    touchSensitivity: 1.25,
    touchFriction: 0.89,
  } as Partial<MobileMotionOptions>,

  /** Architectural Monolith: heavy, deliberate, monumentally stable physical damping */
  ARCHITECTURAL_MONOLITH: {
    spring: { stiffness: 0.045, damping: 0.94, mass: 1.5, deadbandDeg: 0.18, sleepThreshold: 0.00005 },
    maxTiltX: 22,
    maxTiltY: 22,
    neutralBeta: 45,
    neutralGamma: 0,
    touchSensitivity: 0.8,
    touchFriction: 0.95,
  } as Partial<MobileMotionOptions>,
};

// ============================================================================
// 2. MATHEMATICAL & PHYSICS ENGINE: SECOND-ORDER SPRING-DAMPER
// ============================================================================

/**
 * Single-axis second-order spring-damper with deadband filtering and frame-rate compensation.
 * Solves: m*a + c*v + k*(x - target) = 0
 */
export class SpringDamper1D {
  private position: number;
  private velocity: number;
  private target: number;
  private stiffness: number;
  private damping: number;
  private mass: number;
  private deadband: number;
  private sleepThreshold: number;
  private isResting: boolean;

  constructor(initialPosition = 0, config: Partial<SpringDamperConfig> = {}) {
    this.position = initialPosition;
    this.velocity = 0;
    this.target = initialPosition;
    this.stiffness = config.stiffness ?? 0.08;
    this.damping = config.damping ?? 0.88;
    this.mass = config.mass ?? 1.0;
    this.deadband = config.deadbandDeg ?? 0.12;
    this.sleepThreshold = config.sleepThreshold ?? 0.0001;
    this.isResting = true;
  }

  public setConfig(config: Partial<SpringDamperConfig>): void {
    if (config.stiffness !== undefined) this.stiffness = config.stiffness;
    if (config.damping !== undefined) this.damping = config.damping;
    if (config.mass !== undefined) this.mass = config.mass;
    if (config.deadbandDeg !== undefined) this.deadband = config.deadbandDeg;
    if (config.sleepThreshold !== undefined) this.sleepThreshold = config.sleepThreshold;
  }

  public setTarget(newTarget: number): void {
    const delta = newTarget - this.target;
    // Deadband filtering: suppress micro sensor jitter around noise floor
    if (Math.abs(delta) < this.deadband) {
      return;
    }
    this.target = newTarget;
    this.isResting = false;
  }

  public snapTo(pos: number): void {
    this.position = pos;
    this.target = pos;
    this.velocity = 0;
    this.isResting = true;
  }

  /**
   * Semi-implicit Euler integration step with delta-time normalization (relative to 60fps).
   */
  public update(dtSeconds: number): { position: number; velocity: number; isResting: boolean } {
    if (this.isResting) {
      return { position: this.position, velocity: 0, isResting: true };
    }

    // Normalize delta time against 60fps baseline (16.667ms) to protect against frame spikes
    const timeScale = Math.min(Math.max(dtSeconds / (1 / 60), 0.1), 3.0);

    const displacement = this.position - this.target;
    const springForce = -this.stiffness * displacement;
    const dampingForce = -this.damping * this.velocity;
    const acceleration = (springForce + dampingForce) / this.mass;

    this.velocity += acceleration * timeScale;
    this.position += this.velocity * timeScale;

    // Check convergence to rest
    if (
      Math.abs(this.velocity) < this.sleepThreshold &&
      Math.abs(this.position - this.target) < this.sleepThreshold
    ) {
      this.position = this.target;
      this.velocity = 0;
      this.isResting = true;
    }

    return {
      position: this.position,
      velocity: this.velocity,
      isResting: this.isResting,
    };
  }

  public getPosition(): number {
    return this.position;
  }

  public getVelocity(): number {
    return this.velocity;
  }

  public getTarget(): number {
    return this.target;
  }

  public isSleeping(): boolean {
    return this.isResting;
  }
}

/**
 * Angle unwrap helper ensuring shortest rotation path for circular angles (e.g. 0 to 360 deg).
 * Prevents catastrophic 359° spin-flips when crossing origin.
 */
export function unwrapAngleDeg(current: number, target: number): number {
  let diff = (target - current) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return current + diff;
}

/**
 * Clamps a numeric scalar between minimum and maximum bounds.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * Standard cubic smoothstep interpolation.
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// ============================================================================
// 3. CORE CONTROLLER: MobileMotionController
// ============================================================================

export type MotionListener = (state: NormalizedMotionState) => void;

/**
 * WebKit DeviceOrientationEvent interface extending window definition with iOS 13+ permission method.
 */
interface DeviceOrientationEventWithPermission extends DeviceOrientationEvent {
  requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
}

/**
 * Primary cinematic mobile motion controller orchestrating gyroscope sensors,
 * spring-damper physics, coordinate remapping, touch fallback, and listeners.
 */
export class MobileMotionController {
  private static instance: MobileMotionController | null = null;

  private options: MobileMotionOptions;
  private permissionState: DeviceSensorPermission = 'unknown';
  private activeMode: MotionInputMode = 'disabled';

  // Physics springs for pitch (beta), roll (gamma), and yaw (alpha)
  private springBeta: SpringDamper1D;
  private springGamma: SpringDamper1D;
  private springAlpha: SpringDamper1D;

  // Raw and calibrated reference values
  private rawOrientation: RawOrientationAngles = {
    alpha: 0,
    beta: 45,
    gamma: 0,
    absolute: false,
    timestamp: 0,
  };
  private calibratedBeta = 45;
  private calibratedGamma = 0;
  private calibrationSamples: { beta: number; gamma: number }[] = [];
  private isCalibrating = false;
  private calibrationTimer: number | null = null;

  // Touch drag kinematics fallback
  private touchOrigin: Vector2D = { x: 0, y: 0 };
  private touchCurrent: Vector2D = { x: 0, y: 0 };
  private touchVelocity: Vector2D = { x: 0, y: 0 };
  private lastTouchTime = 0;
  private isTouching = false;

  // Mouse hover fallback (desktop)
  private mouseTarget: Vector2D = { x: 0, y: 0 };

  // Screen orientation angle (0, 90, 180, 270)
  private screenOrientationDeg = 0;

  // Engine state & listeners
  private listeners: Set<MotionListener> = new Set();
  private rafId: number | null = null;
  private lastFrameTimestamp = 0;
  private isDestroyed = false;
  private isSuspended = false;

  // Diagnostics tracking
  private sensorEventCount = 0;
  private frameCount = 0;
  private lastFpsSampleTime = 0;
  private currentFps = 60;
  private jitterSum = 0;

  // Pre-allocated return state object preventing GC allocations
  private currentState: NormalizedMotionState = {
    x: 0,
    y: 0,
    z: 0,
    pitchDeg: 45,
    rollDeg: 0,
    yawDeg: 0,
    magnitude: 0,
    angleRad: 0,
    velocity: { x: 0, y: 0, z: 0, magnitude: 0 },
    isResting: true,
    activeMode: 'disabled',
    timestamp: 0,
  };

  /**
   * Singleton accessor ensuring one shared high-performance loop across components.
   */
  public static getInstance(options?: Partial<MobileMotionOptions>): MobileMotionController {
    if (!MobileMotionController.instance) {
      MobileMotionController.instance = new MobileMotionController(options);
    } else if (options) {
      MobileMotionController.instance.updateOptions(options);
    }
    return MobileMotionController.instance;
  }

  constructor(options: Partial<MobileMotionOptions> = {}) {
    this.options = {
      spring: {
        stiffness: 0.08,
        damping: 0.88,
        mass: 1.0,
        deadbandDeg: 0.12,
        sleepThreshold: 0.0001,
        ...options.spring,
      },
      maxTiltX: options.maxTiltX ?? 35,
      maxTiltY: options.maxTiltY ?? 35,
      neutralBeta: options.neutralBeta ?? 45,
      neutralGamma: options.neutralGamma ?? 0,
      autoCalibrate: options.autoCalibrate ?? true,
      autoCalibrateDelay: options.autoCalibrateDelay ?? 2000,
      trackScreenOrientation: options.trackScreenOrientation ?? true,
      enableTouchFallback: options.enableTouchFallback ?? true,
      touchSensitivity: options.touchSensitivity ?? 1.0,
      touchFriction: options.touchFriction ?? 0.92,
      touchSpringBack: options.touchSpringBack ?? true,
      enableMouseFallback: options.enableMouseFallback ?? true,
      respectReducedMotion: options.respectReducedMotion ?? true,
      pauseWhenHidden: options.pauseWhenHidden ?? true,
    };

    this.calibratedBeta = this.options.neutralBeta;
    this.calibratedGamma = this.options.neutralGamma;

    this.springBeta = new SpringDamper1D(this.calibratedBeta, this.options.spring);
    this.springGamma = new SpringDamper1D(this.calibratedGamma, this.options.spring);
    this.springAlpha = new SpringDamper1D(0, this.options.spring);

    if (typeof window !== 'undefined') {
      this.initEnvironment();
    }
  }

  /**
   * Update configuration dynamically at runtime.
   */
  public updateOptions(options: Partial<MobileMotionOptions>): void {
    this.options = {
      ...this.options,
      ...options,
      spring: { ...this.options.spring, ...options.spring },
    };

    this.springBeta.setConfig(this.options.spring);
    this.springGamma.setConfig(this.options.spring);
    this.springAlpha.setConfig(this.options.spring);
  }

  /**
   * Initialize sensor listeners, visibility hooks, and fallback handlers.
   */
  private initEnvironment(): void {
    if (typeof window === 'undefined') return;

    // Check reduced motion preference
    if (this.options.respectReducedMotion) {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (motionQuery.matches) {
        this.activeMode = 'disabled';
        this.permissionState = 'denied';
        return;
      }
      motionQuery.addEventListener('change', (e) => {
        if (e.matches) {
          this.activeMode = 'disabled';
          this.resetToNeutral();
        } else {
          this.detectSensors();
        }
      });
    }

    // Track screen orientation changes
    this.updateScreenOrientation();
    window.addEventListener('orientationchange', this.handleScreenOrientationChange, { passive: true });
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', this.handleScreenOrientationChange);
    }

    // Page visibility hook to conserve mobile battery
    if (this.options.pauseWhenHidden) {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    // Check device orientation availability
    this.detectSensors();

    // Start RAF rendering loop
    this.startLoop();
  }

  /**
   * Detects sensor support and triggers iOS 13+ handshake if necessary.
   */
  public async detectSensors(): Promise<DeviceSensorPermission> {
    if (typeof window === 'undefined') return 'unsupported';

    const orientationEvent = window.DeviceOrientationEvent as unknown as DeviceOrientationEventWithPermission;

    // 1. Check iOS 13+ permission requirement
    if (orientationEvent && typeof orientationEvent.requestPermission === 'function') {
      this.permissionState = 'prompt';
      this.activeMode = this.options.enableTouchFallback ? 'touch_drag' : 'disabled';
      this.bindTouchFallback();
      return this.permissionState;
    }

    // 2. Standard Android / Modern Browsers supporting DeviceOrientationEvent
    if ('DeviceOrientationEvent' in window) {
      this.permissionState = 'checking';
      this.bindSensorListeners();

      // Verify that real non-null gyro data actually arrives within timeout
      window.setTimeout(() => {
        if (this.sensorEventCount === 0 || this.rawOrientation.beta === null) {
          // No gyro events received (likely desktop browser or device lacking IMU)
          if (this.activeMode === 'gyroscope') {
            this.unbindSensorListeners();
            if (this.isMobileTouchDevice()) {
              this.activeMode = 'touch_drag';
              this.permissionState = 'unsupported';
              this.bindTouchFallback();
            } else if (this.options.enableMouseFallback) {
              this.activeMode = 'pointer_hover';
              this.permissionState = 'unsupported';
              this.bindMouseFallback();
            } else {
              this.activeMode = 'disabled';
              this.permissionState = 'unsupported';
            }
          }
        }
      }, 900);

      return this.permissionState;
    }

    // 3. Fallback when DeviceOrientationEvent is absent entirely
    this.permissionState = 'unsupported';
    if (this.isMobileTouchDevice() && this.options.enableTouchFallback) {
      this.activeMode = 'touch_drag';
      this.bindTouchFallback();
    } else if (this.options.enableMouseFallback) {
      this.activeMode = 'pointer_hover';
      this.bindMouseFallback();
    } else {
      this.activeMode = 'disabled';
    }

    return this.permissionState;
  }

  /**
   * Explicitly requests iOS 13+ gyroscope permissions from a user activation gesture.
   */
  public async requestPermission(): Promise<DeviceSensorPermission> {
    if (typeof window === 'undefined') return 'unsupported';

    const orientationEvent = window.DeviceOrientationEvent as unknown as DeviceOrientationEventWithPermission;

    if (orientationEvent && typeof orientationEvent.requestPermission === 'function') {
      try {
        const response = await orientationEvent.requestPermission();
        if (response === 'granted') {
          this.permissionState = 'granted';
          this.activeMode = 'gyroscope';
          this.unbindTouchFallback();
          this.unbindMouseFallback();
          this.bindSensorListeners();
          return 'granted';
        } else {
          this.permissionState = 'denied';
          this.activeMode = this.options.enableTouchFallback ? 'touch_drag' : 'disabled';
          if (this.options.enableTouchFallback) this.bindTouchFallback();
          return 'denied';
        }
      } catch (err) {
        console.warn('[MobileMotion] Permission handshake rejected:', err);
        this.permissionState = 'denied';
        this.activeMode = this.options.enableTouchFallback ? 'touch_drag' : 'disabled';
        if (this.options.enableTouchFallback) this.bindTouchFallback();
        return 'denied';
      }
    }

    // For non-iOS platforms, detectSensors handles attachment directly
    return this.detectSensors();
  }

  /**
   * Binds device orientation hardware event listener.
   */
  private bindSensorListeners(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('deviceorientation', this.handleDeviceOrientation, { passive: true });
  }

  private unbindSensorListeners(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('deviceorientation', this.handleDeviceOrientation);
  }

  /**
   * DeviceOrientationEvent handler with screen coordinate remapping and jitter tracking.
   */
  private handleDeviceOrientation = (event: DeviceOrientationEvent): void => {
    if (this.isSuspended || this.isDestroyed) return;

    if (event.beta === null || event.gamma === null) {
      return;
    }

    this.sensorEventCount++;
    if (this.permissionState === 'checking' || this.permissionState === 'prompt') {
      this.permissionState = 'granted';
      this.activeMode = 'gyroscope';
      this.unbindTouchFallback();
      this.unbindMouseFallback();
    }

    let rawAlpha = event.alpha ?? 0;
    let rawBeta = event.beta;
    let rawGamma = event.gamma;

    // Remap axes according to physical screen orientation
    if (this.options.trackScreenOrientation && this.screenOrientationDeg !== 0) {
      const remapped = this.remapOrientationByScreenAngle(rawBeta, rawGamma, this.screenOrientationDeg);
      rawBeta = remapped.beta;
      rawGamma = remapped.gamma;
    }

    // Track sensor jitter variance
    const prevBeta = this.rawOrientation.beta;
    const deltaBeta = Math.abs(rawBeta - prevBeta);
    this.jitterSum += deltaBeta;

    this.rawOrientation = {
      alpha: rawAlpha,
      beta: rawBeta,
      gamma: rawGamma,
      absolute: event.absolute ?? false,
      timestamp: performance.now(),
    };

    // Auto-calibration handling
    if (this.options.autoCalibrate) {
      this.recordCalibrationSample(rawBeta, rawGamma);
    }

    // Feed spring-damper targets with calibrated offsets
    const deltaTargetBeta = rawBeta - this.calibratedBeta;
    const deltaTargetGamma = rawGamma - this.calibratedGamma;

    this.springBeta.setTarget(deltaTargetBeta);
    this.springGamma.setTarget(deltaTargetGamma);

    // Alpha shortest unwrapped circular angle target
    const currentAlpha = this.springAlpha.getTarget();
    const unwrappedAlpha = unwrapAngleDeg(currentAlpha, rawAlpha);
    this.springAlpha.setTarget(unwrappedAlpha);
  };

  /**
   * Remaps beta and gamma axes based on device rotation angle (0, 90, 180, 270 deg).
   */
  private remapOrientationByScreenAngle(
    beta: number,
    gamma: number,
    deg: number
  ): { beta: number; gamma: number } {
    switch (deg) {
      case 90:
        // Landscape (turned left)
        return { beta: -gamma, gamma: beta };
      case -90:
      case 270:
        // Landscape (turned right)
        return { beta: gamma, gamma: -beta };
      case 180:
        // Upside down portrait
        return { beta: -beta, gamma: -gamma };
      default:
        // Standard portrait
        return { beta, gamma };
    }
  }

  /**
   * Updates cached screen orientation angle.
   */
  private updateScreenOrientation(): void {
    if (typeof window === 'undefined') return;
    if (window.screen?.orientation) {
      this.screenOrientationDeg = window.screen.orientation.angle;
    } else if (typeof window.orientation === 'number') {
      this.screenOrientationDeg = window.orientation;
    } else {
      this.screenOrientationDeg = 0;
    }
  }

  private handleScreenOrientationChange = (): void => {
    this.updateScreenOrientation();
    this.recalibrate();
  };

  /**
   * Samples steady device hold to re-anchor neutral rest baseline.
   */
  private recordCalibrationSample(beta: number, gamma: number): void {
    if (this.calibrationSamples.length > 30) {
      this.calibrationSamples.shift();
    }
    this.calibrationSamples.push({ beta, gamma });

    if (!this.isCalibrating && !this.calibrationTimer) {
      this.calibrationTimer = window.setTimeout(() => {
        this.evaluateAutoCalibration();
        this.calibrationTimer = null;
      }, this.options.autoCalibrateDelay);
    }
  }

  private evaluateAutoCalibration(): void {
    if (this.calibrationSamples.length < 15) return;

    let sumBeta = 0;
    let sumGamma = 0;
    let maxBetaDelta = 0;
    let maxGammaDelta = 0;

    const first = this.calibrationSamples[0];
    for (const sample of this.calibrationSamples) {
      sumBeta += sample.beta;
      sumGamma += sample.gamma;
      maxBetaDelta = Math.max(maxBetaDelta, Math.abs(sample.beta - first.beta));
      maxGammaDelta = Math.max(maxGammaDelta, Math.abs(sample.gamma - first.gamma));
    }

    // If device was held steadily within ~1.5 degrees, gently drift calibrated baseline
    if (maxBetaDelta < 1.5 && maxGammaDelta < 1.5) {
      const avgBeta = sumBeta / this.calibrationSamples.length;
      const avgGamma = sumGamma / this.calibrationSamples.length;
      // Soft drift 20% towards stable average
      this.calibratedBeta = this.calibratedBeta * 0.8 + avgBeta * 0.2;
      this.calibratedGamma = this.calibratedGamma * 0.8 + avgGamma * 0.2;
    }
  }

  /**
   * Explicitly sets current handheld position as the zero-tilt neutral center.
   */
  public recalibrate(): void {
    if (this.rawOrientation.beta !== 0 || this.rawOrientation.gamma !== 0) {
      this.calibratedBeta = this.rawOrientation.beta;
      this.calibratedGamma = this.rawOrientation.gamma;
    } else {
      this.calibratedBeta = this.options.neutralBeta;
      this.calibratedGamma = this.options.neutralGamma;
    }
    this.springBeta.snapTo(0);
    this.springGamma.snapTo(0);
  }

  /**
   * Sets manual neutral handheld anchor angles.
   */
  public setNeutralAnchor(betaDeg: number, gammaDeg: number): void {
    this.calibratedBeta = betaDeg;
    this.calibratedGamma = gammaDeg;
    this.recalibrate();
  }

  // ==========================================================================
  // TOUCH FALLBACK KINEMATICS
  // ==========================================================================

  private bindTouchFallback(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    window.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    window.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', this.handleTouchEnd, { passive: true });
  }

  private unbindTouchFallback(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchmove', this.handleTouchMove);
    window.removeEventListener('touchend', this.handleTouchEnd);
    window.removeEventListener('touchcancel', this.handleTouchEnd);
  }

  private handleTouchStart = (e: TouchEvent): void => {
    if (this.isSuspended || e.touches.length !== 1) return;
    const touch = e.touches[0];
    this.touchOrigin = { x: touch.clientX, y: touch.clientY };
    this.touchCurrent = { x: touch.clientX, y: touch.clientY };
    this.touchVelocity = { x: 0, y: 0 };
    this.lastTouchTime = performance.now();
    this.isTouching = true;
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (!this.isTouching || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const now = performance.now();
    const dt = Math.max((now - this.lastTouchTime) / 1000, 0.001);

    const dx = touch.clientX - this.touchCurrent.x;
    const dy = touch.clientY - this.touchCurrent.y;

    this.touchVelocity = {
      x: dx / dt,
      y: dy / dt,
    };

    this.touchCurrent = { x: touch.clientX, y: touch.clientY };
    this.lastTouchTime = now;

    // Normalize touch drag offset relative to window dimensions (-1.0 to 1.0)
    const normX = clamp(
      ((touch.clientX - window.innerWidth / 2) / (window.innerWidth / 2)) * this.options.touchSensitivity,
      -1,
      1
    );
    const normY = clamp(
      ((touch.clientY - window.innerHeight / 2) / (window.innerHeight / 2)) * this.options.touchSensitivity,
      -1,
      1
    );

    // Map normalized touch offset to virtual tilt degrees
    const targetGamma = normX * this.options.maxTiltX;
    const targetBeta = normY * this.options.maxTiltY;

    this.springGamma.setTarget(targetGamma);
    this.springBeta.setTarget(targetBeta);
  };

  private handleTouchEnd = (): void => {
    this.isTouching = false;
    if (this.options.touchSpringBack) {
      // Spring back to neutral origin on touch release
      this.springGamma.setTarget(0);
      this.springBeta.setTarget(0);
    }
  };

  // ==========================================================================
  // DESKTOP MOUSE HOVER FALLBACK
  // ==========================================================================

  private bindMouseFallback(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('mousemove', this.handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', this.handleMouseLeave, { passive: true });
  }

  private unbindMouseFallback(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseleave', this.handleMouseLeave);
  }

  private handleMouseMove = (e: MouseEvent): void => {
    if (this.isSuspended || this.activeMode !== 'pointer_hover') return;
    const normX = clamp((e.clientX - window.innerWidth / 2) / (window.innerWidth / 2), -1, 1);
    const normY = clamp((e.clientY - window.innerHeight / 2) / (window.innerHeight / 2), -1, 1);

    const targetGamma = normX * this.options.maxTiltX;
    const targetBeta = normY * this.options.maxTiltY;

    this.springGamma.setTarget(targetGamma);
    this.springBeta.setTarget(targetBeta);
  };

  private handleMouseLeave = (): void => {
    if (this.activeMode !== 'pointer_hover') return;
    this.springGamma.setTarget(0);
    this.springBeta.setTarget(0);
  };

  // ==========================================================================
  // VISIBILITY & LIFECYCLE MANAGEMENT
  // ==========================================================================

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.isSuspended = true;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    } else {
      this.isSuspended = false;
      this.lastFrameTimestamp = performance.now();
      this.startLoop();
    }
  };

  private isMobileTouchDevice(): boolean {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  private resetToNeutral(): void {
    this.springBeta.snapTo(0);
    this.springGamma.snapTo(0);
    this.springAlpha.snapTo(0);
    this.computeAndDispatchState(0.016);
  }

  // ==========================================================================
  // MAIN RAF ANIMATION & INTEGRATION LOOP
  // ==========================================================================

  private startLoop(): void {
    if (this.rafId !== null || this.isDestroyed) return;
    this.lastFrameTimestamp = performance.now();
    this.lastFpsSampleTime = this.lastFrameTimestamp;
    this.rafId = requestAnimationFrame(this.tick);
  }

  private tick = (timestamp: number): void => {
    if (this.isDestroyed) return;

    const dtSeconds = Math.max((timestamp - this.lastFrameTimestamp) / 1000, 0.001);
    this.lastFrameTimestamp = timestamp;

    // Track FPS metrics
    this.frameCount++;
    if (timestamp - this.lastFpsSampleTime >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (timestamp - this.lastFpsSampleTime));
      this.frameCount = 0;
      this.lastFpsSampleTime = timestamp;
    }

    if (!this.isSuspended) {
      this.computeAndDispatchState(dtSeconds);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  /**
   * Physics step & state broadcast.
   */
  public step(dtSeconds = 0.016): NormalizedMotionState {
    this.computeAndDispatchState(dtSeconds);
    return this.currentState;
  }

  private computeAndDispatchState(dtSeconds: number): void {
    // Step individual spring-damper solvers
    const stepBeta = this.springBeta.update(dtSeconds);
    const stepGamma = this.springGamma.update(dtSeconds);
    const stepAlpha = this.springAlpha.update(dtSeconds);

    const isAllResting = stepBeta.isResting && stepGamma.isResting && stepAlpha.isResting;

    // Normalize horizontal and vertical angles to [-1.0, 1.0]
    const normX = clamp(stepGamma.position / this.options.maxTiltX, -1.0, 1.0);
    const normY = clamp(stepBeta.position / this.options.maxTiltY, -1.0, 1.0);
    const normZ = clamp((stepAlpha.position % 360) / 180, -1.0, 1.0);

    // Compute velocity magnitude
    const velX = stepGamma.velocity / this.options.maxTiltX;
    const velY = stepBeta.velocity / this.options.maxTiltY;
    const velZ = stepAlpha.velocity / 180;
    const velMagnitude = Math.sqrt(velX * velX + velY * velY);

    // Polar coordinates for dynamic lighting/glare calculations
    const magnitude = clamp(Math.sqrt(normX * normX + normY * normY), 0, 1.414);
    const angleRad = Math.atan2(normY, normX);

    // Populate mutated state object without GC allocation
    this.currentState.x = normX;
    this.currentState.y = normY;
    this.currentState.z = normZ;
    this.currentState.pitchDeg = stepBeta.position;
    this.currentState.rollDeg = stepGamma.position;
    this.currentState.yawDeg = stepAlpha.position;
    this.currentState.magnitude = magnitude;
    this.currentState.angleRad = angleRad;
    this.currentState.velocity.x = velX;
    this.currentState.velocity.y = velY;
    this.currentState.velocity.z = velZ;
    this.currentState.velocity.magnitude = velMagnitude;
    this.currentState.isResting = isAllResting;
    this.currentState.activeMode = this.activeMode;
    this.currentState.timestamp = performance.now();

    // Broadcast to registered listeners
    for (const listener of this.listeners) {
      listener(this.currentState);
    }

    // Apply root CSS custom properties for hardware-accelerated styling
    if (typeof document !== 'undefined' && document.documentElement) {
      this.syncRootCssVariables(this.currentState);
    }
  }

  /**
   * Syncs hardware-accelerated CSS custom variables to document root for seamless zero-JS CSS animations.
   */
  private syncRootCssVariables(state: NormalizedMotionState): void {
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--gyro-x', state.x.toFixed(4));
    rootStyle.setProperty('--gyro-y', state.y.toFixed(4));
    rootStyle.setProperty('--gyro-deg-x', state.pitchDeg.toFixed(2) + 'deg');
    rootStyle.setProperty('--gyro-deg-y', state.rollDeg.toFixed(2) + 'deg');
    rootStyle.setProperty('--gyro-vel-x', state.velocity.x.toFixed(4));
    rootStyle.setProperty('--gyro-vel-y', state.velocity.y.toFixed(4));
    rootStyle.setProperty('--gyro-mag', state.magnitude.toFixed(4));
    rootStyle.setProperty('--gyro-glare-x', ((state.x * 0.5 + 0.5) * 100).toFixed(1) + '%');
    rootStyle.setProperty('--gyro-glare-y', ((state.y * 0.5 + 0.5) * 100).toFixed(1) + '%');
  }

  // ==========================================================================
  // PUBLIC SUBSCRIPTION API & DIAGNOSTICS
  // ==========================================================================

  public subscribe(listener: MotionListener): () => void {
    this.listeners.add(listener);
    // Emit immediate current state
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): Readonly<NormalizedMotionState> {
    return this.currentState;
  }

  public getPermissionState(): DeviceSensorPermission {
    return this.permissionState;
  }

  public getActiveMode(): MotionInputMode {
    return this.activeMode;
  }

  public getDiagnostics(): MotionDiagnostics {
    return {
      fps: this.currentFps,
      sensorUpdateCount: this.sensorEventCount,
      rawBeta: this.rawOrientation.beta,
      rawGamma: this.rawOrientation.gamma,
      rawAlpha: this.rawOrientation.alpha,
      smoothedX: this.currentState.x,
      smoothedY: this.currentState.y,
      velocity: this.currentState.velocity.magnitude,
      jitterVariance: this.sensorEventCount > 0 ? this.jitterSum / this.sensorEventCount : 0,
      state: this.permissionState,
      mode: this.activeMode,
      orientationType: typeof window !== 'undefined' ? (window.screen?.orientation?.type ?? 'unknown') : 'ssr',
      isSleeping: this.currentState.isResting,
    };
  }

  /**
   * Manual simulator for headless testing or deterministic visual validation.
   */
  public simulateOrientation(betaDeg: number, gammaDeg: number, alphaDeg = 0): void {
    this.activeMode = 'simulated';
    this.springBeta.setTarget(betaDeg - this.calibratedBeta);
    this.springGamma.setTarget(gammaDeg - this.calibratedGamma);
    this.springAlpha.setTarget(alphaDeg);
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.unbindSensorListeners();
    this.unbindTouchFallback();
    this.unbindMouseFallback();
    if (typeof window !== 'undefined') {
      window.removeEventListener('orientationchange', this.handleScreenOrientationChange);
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', this.handleScreenOrientationChange);
      }
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.listeners.clear();
    MobileMotionController.instance = null;
  }
}

// ============================================================================
// 4. CARD TILT DRIVER (CUBERTO SIGNATURE 3D SPECULAR REFLECTION)
// ============================================================================

/**
 * High-performance 3D Card Tilt Driver with dynamic specular reflection glare.
 * Injects perspective, transforms, and specular gradient highlights directly into DOM.
 */
export class CardTiltDriver {
  private element: HTMLElement;
  private glareElement: HTMLElement | null = null;
  private options: CardTiltOptions;
  private unsubscribe: (() => void) | null = null;

  constructor(element: HTMLElement, options: Partial<CardTiltOptions> = {}) {
    this.element = element;
    this.options = {
      maxRotationX: options.maxRotationX ?? 14,
      maxRotationY: options.maxRotationY ?? 14,
      perspective: options.perspective ?? 1000,
      scaleOnTilt: options.scaleOnTilt ?? 1.02,
      elevationZ: options.elevationZ ?? 16,
      enableGlare: options.enableGlare ?? true,
      maxGlareOpacity: options.maxGlareOpacity ?? 0.40,
      glareColor: options.glareColor ?? 'rgba(255, 255, 255, 0.45)',
      reverse: options.reverse ?? false,
      easing: options.easing ?? ((t: number) => t),
    };

    this.initElement();
    this.bind();
  }

  private initElement(): void {
    this.element.style.transformStyle = 'preserve-3d';
    this.element.style.willChange = 'transform';

    if (this.options.enableGlare) {
      this.createGlareLayer();
    }
  }

  private createGlareLayer(): void {
    let existing = this.element.querySelector('.gyro-glare-overlay') as HTMLElement;
    if (!existing) {
      existing = document.createElement('div');
      existing.className = 'gyro-glare-overlay';
      existing.style.position = 'absolute';
      existing.style.inset = '0';
      existing.style.borderRadius = 'inherit';
      existing.style.pointerEvents = 'none';
      existing.style.mixBlendMode = 'overlay';
      existing.style.overflow = 'hidden';
      existing.style.opacity = '0';
      existing.style.transition = 'opacity 0.25s ease-out';
      existing.style.zIndex = '10';

      const sheen = document.createElement('div');
      sheen.className = 'gyro-glare-sheen';
      sheen.style.position = 'absolute';
      sheen.style.inset = '-50%';
      sheen.style.width = '200%';
      sheen.style.height = '200%';
      sheen.style.background = `radial-gradient(circle at 50% 50%, ${this.options.glareColor} 0%, rgba(255, 255, 255, 0) 65%)`;
      sheen.style.transform = 'translate(-50%, -50%)';

      existing.appendChild(sheen);
      this.element.appendChild(existing);
    }
    this.glareElement = existing;
  }

  private bind(): void {
    const controller = MobileMotionController.getInstance();
    this.unsubscribe = controller.subscribe((state) => {
      this.renderTilt(state);
    });
  }

  private renderTilt(state: NormalizedMotionState): void {
    if (!this.element) return;

    const factor = this.options.reverse ? -1 : 1;
    const rotX = (-state.y * this.options.maxRotationX * factor).toFixed(2);
    const rotY = (state.x * this.options.maxRotationY * factor).toFixed(2);
    const scale = (1.0 + state.magnitude * (this.options.scaleOnTilt - 1.0)).toFixed(4);
    const elevZ = (state.magnitude * this.options.elevationZ).toFixed(1);

    // Apply hardware-accelerated transform
    this.element.style.transform = `perspective(${this.options.perspective}px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(${elevZ}px) scale3d(${scale}, ${scale}, 1)`;

    // Modulate specular reflection glare
    if (this.glareElement) {
      const sheen = this.glareElement.firstElementChild as HTMLElement;
      if (sheen) {
        const glareX = ((state.x * 0.5 + 0.5) * 100).toFixed(1);
        const glareY = ((state.y * 0.5 + 0.5) * 100).toFixed(1);
        const glareOpacity = (state.magnitude * this.options.maxGlareOpacity).toFixed(3);

        this.glareElement.style.opacity = glareOpacity;
        sheen.style.transform = `translate(${glareX}%, ${glareY}%)`;
      }
    }
  }

  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.glareElement && this.glareElement.parentNode) {
      this.glareElement.parentNode.removeChild(this.glareElement);
    }
    this.element.style.transform = '';
    this.element.style.transformStyle = '';
    this.element.style.willChange = '';
  }
}

// ============================================================================
// 5. HERO MULTI-LAYER PARALLAX DRIVER (14ISLANDS SIGNATURE)
// ============================================================================

/**
 * Orchestrates multi-layer depth parallax across 2D/2.5D hero imagery and architectural plates.
 */
export class HeroParallaxDriver {
  private layers: ParallaxLayerConfig[] = [];
  private unsubscribe: (() => void) | null = null;

  constructor(layers: ParallaxLayerConfig[]) {
    this.layers = layers;
    this.initLayers();
    this.bind();
  }

  private initLayers(): void {
    for (const layer of this.layers) {
      if (layer.element) {
        layer.element.style.willChange = 'transform';
      }
    }
  }

  private bind(): void {
    const controller = MobileMotionController.getInstance();
    this.unsubscribe = controller.subscribe((state) => {
      this.renderParallax(state);
    });
  }

  private renderParallax(state: NormalizedMotionState): void {
    for (const layer of this.layers) {
      if (!layer.element) continue;

      const offsetX = (state.x * layer.maxOffsetX * layer.depth).toFixed(2);
      const offsetY = (state.y * layer.maxOffsetY * layer.depth).toFixed(2);
      const rot = layer.rotationFactor ? ` rotate(${(state.x * layer.rotationFactor).toFixed(2)}deg)` : '';
      const scale = layer.scaleFactor
        ? ` scale(${(1.0 + state.magnitude * (layer.scaleFactor - 1.0)).toFixed(4)})`
        : '';

      layer.element.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)${rot}${scale}`;

      if (layer.blurFactor && layer.blurFactor > 0) {
        const blurPx = (state.velocity.magnitude * layer.blurFactor).toFixed(1);
        layer.element.style.filter = blurPx === '0.0' ? '' : `blur(${blurPx}px)`;
      }
    }
  }

  public setLayers(layers: ParallaxLayerConfig[]): void {
    this.layers = layers;
    this.initLayers();
  }

  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    for (const layer of this.layers) {
      if (layer.element) {
        layer.element.style.transform = '';
        layer.element.style.willChange = '';
        layer.element.style.filter = '';
      }
    }
  }
}

// ============================================================================
// 6. THREE.JS CAMERA GYRO LOOK-AT DRIVER
// ============================================================================

/**
 * Seamlessly modulates Three.js perspective/orthographic camera positions and look-at targets.
 */
export class ThreeCameraGyroDriver {
  private camera: THREE.Camera;
  private options: ThreeCameraGyroOptions;
  private unsubscribe: (() => void) | null = null;

  // Scratch vectors avoiding garbage collection
  private initialPosition = new THREE.Vector3();
  private initialRotation = new THREE.Euler();
  private targetOffset = new THREE.Vector3();
  private lookAtVector = new THREE.Vector3();

  constructor(camera: THREE.Camera, options: Partial<ThreeCameraGyroOptions> = {}) {
    this.camera = camera;
    this.options = {
      maxPositionOffset: options.maxPositionOffset ?? [0.35, 0.25, 0.15],
      maxRotationOffset: options.maxRotationOffset ?? [0.08, 0.12, 0.04],
      baseTarget: options.baseTarget ?? [0, 0, 0],
      maxTargetOffset: options.maxTargetOffset ?? [0.4, 0.3, 0.0],
      fovPerturbation: options.fovPerturbation ?? 1.5,
      lerpFactor: options.lerpFactor ?? 0.08,
    };

    this.initialPosition.copy(this.camera.position);
    this.initialRotation.copy(this.camera.rotation);
    this.bind();
  }

  private bind(): void {
    const controller = MobileMotionController.getInstance();
    this.unsubscribe = controller.subscribe((state) => {
      this.updateCamera(state);
    });
  }

  /**
   * Modulate camera matrices based on smoothed motion state.
   */
  public updateCamera(state: NormalizedMotionState): void {
    if (!this.camera) return;

    // Position perturbation
    const targetPosX = this.initialPosition.x + state.x * this.options.maxPositionOffset[0];
    const targetPosY = this.initialPosition.y - state.y * this.options.maxPositionOffset[1];
    const targetPosZ = this.initialPosition.z + state.magnitude * this.options.maxPositionOffset[2];

    this.camera.position.x += (targetPosX - this.camera.position.x) * this.options.lerpFactor;
    this.camera.position.y += (targetPosY - this.camera.position.y) * this.options.lerpFactor;
    this.camera.position.z += (targetPosZ - this.camera.position.z) * this.options.lerpFactor;

    // Look-At target perturbation
    this.targetOffset.set(
      this.options.baseTarget[0] + state.x * this.options.maxTargetOffset[0],
      this.options.baseTarget[1] - state.y * this.options.maxTargetOffset[1],
      this.options.baseTarget[2] + state.z * this.options.maxTargetOffset[2]
    );

    this.lookAtVector.lerp(this.targetOffset, this.options.lerpFactor);
    this.camera.lookAt(this.lookAtVector);

    // FOV breathing modulation for PerspectiveCamera
    if ((this.camera as THREE.PerspectiveCamera).isPerspectiveCamera && this.options.fovPerturbation > 0) {
      const pCam = this.camera as THREE.PerspectiveCamera;
      const baseFov = pCam.fov;
      const targetFov = baseFov - state.magnitude * this.options.fovPerturbation;
      pCam.fov += (targetFov - pCam.fov) * this.options.lerpFactor;
      pCam.updateProjectionMatrix();
    }
  }

  public setBaseTarget(target: [number, number, number]): void {
    this.options.baseTarget = target;
  }

  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.camera.position.copy(this.initialPosition);
    this.camera.rotation.copy(this.initialRotation);
  }
}

// ============================================================================
// 7. VANILLA DOM & THREE.JS INTEGRATION HELPERS
// ============================================================================

/**
 * Bind 3D card tilt and specular glare directly to an HTMLElement.
 */
export function bindCardTilt<T extends HTMLElement>(
  element: T | null,
  options?: Partial<CardTiltOptions>
): (() => void) | undefined {
  if (!element) return undefined;
  const driver = new CardTiltDriver(element, options);
  return () => driver.destroy();
}

/**
 * Bind multi-layer 2.5D hero parallax to element configurations.
 */
export function bindHeroParallax(layerConfigs: ParallaxLayerConfig[]): () => void {
  const driver = new HeroParallaxDriver(layerConfigs);
  return () => driver.destroy();
}

/**
 * Modulate Three.js camera look-at angle and position from mobile orientation.
 */
export function bindThreeCameraGyro(
  camera: THREE.Camera | null,
  options?: Partial<ThreeCameraGyroOptions>
): (() => void) | undefined {
  if (!camera) return undefined;
  const driver = new ThreeCameraGyroDriver(camera, options);
  return () => driver.destroy();
}

// ============================================================================
// 8. CONVENIENCE FACTORIES & DIAGNOSTIC HUD
// ============================================================================

/**
 * Convenience factory creating and initializing a new MobileMotionController.
 */
export function createMobileMotion(options?: Partial<MobileMotionOptions>): MobileMotionController {
  return MobileMotionController.getInstance(options);
}

/**
 * Renders an optional diagnostic telemetry HUD on screen for visual inspection and debugging.
 */
export function mountMotionDiagnosticsHUD(): () => void {
  if (typeof document === 'undefined') return () => {};

  let hud = document.getElementById('gyro-telemetry-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'gyro-telemetry-hud';
    hud.style.position = 'fixed';
    hud.style.bottom = '16px';
    hud.style.left = '16px';
    hud.style.padding = '10px 14px';
    hud.style.background = 'rgba(10, 10, 10, 0.85)';
    hud.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    hud.style.borderRadius = '8px';
    hud.style.fontFamily = 'monospace';
    hud.style.fontSize = '11px';
    hud.style.color = '#36C2CE';
    hud.style.zIndex = '999999';
    hud.style.pointerEvents = 'none';
    hud.style.backdropFilter = 'blur(10px)';
    document.body.appendChild(hud);
  }

  const controller = MobileMotionController.getInstance();
  const interval = window.setInterval(() => {
    if (!hud) return;
    const diag = controller.getDiagnostics();
    hud.innerHTML = `
      <div style="font-weight:bold;color:#FFB347;margin-bottom:4px;">GYRO TELEMETRY (14islands / Cuberto)</div>
      <div>FPS: <span style="color:#FFF">${diag.fps}</span> | Mode: <span style="color:#FFF">${diag.mode}</span></div>
      <div>Perm: <span style="color:#FFF">${diag.state}</span> | Sleep: <span style="color:#FFF">${diag.isSleeping}</span></div>
      <div>X: <span style="color:#FFF">${diag.smoothedX.toFixed(3)}</span> | Y: <span style="color:#FFF">${diag.smoothedY.toFixed(3)}</span></div>
      <div>Pitch(b): <span style="color:#FFF">${diag.rawBeta.toFixed(1)}°</span> | Roll(g): <span style="color:#FFF">${diag.rawGamma.toFixed(1)}°</span></div>
      <div>Velocity: <span style="color:#FFF">${diag.velocity.toFixed(4)}</span> | Jitter: <span style="color:#FFF">${diag.jitterVariance.toFixed(4)}</span></div>
    `;
  }, 100);

  return () => {
    clearInterval(interval);
    if (hud && hud.parentNode) {
      hud.parentNode.removeChild(hud);
    }
  };
}
