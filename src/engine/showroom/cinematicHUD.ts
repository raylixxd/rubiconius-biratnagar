/**
 * src/engine/showroom/cinematicHUD.ts
 *
 * Real-Time Architectural Viewfinder HUD & Telemetry Engine
 * Reverse-engineered & extracted from 05_kpr, 04_sculpting_harmony, and 40_otto_objects.
 *
 * Core Capabilities:
 * 1. 2D/3D Hybrid Viewfinder HUD:
 *    - Screen-space high-DPI Canvas overlay with sub-pixel crispness.
 *    - Interactive optical reticle crosshairs with dynamic aperture widening on movement.
 *    - True cardinal compass azimuth rose with 360° heading dial & yaw calculation.
 *    - Pitch/roll artificial horizon ladder with degree rungs, roll banking, & zenith/nadir tags.
 *    - 35mm optical focal millimeter vernier scale tracking camera FOV & sensor dimensions.
 *    - Golden ratio & architectural rule-of-thirds drafting composition guides.
 *
 * 2. Real-Time Telemetry Cluster:
 *    - High-precision 60fps frame delta timer with 60-frame rolling EMA and jitter variance.
 *    - GPU draw call, triangle count, geometry, texture, and shader program inspector.
 *    - Camera world coordinates (X, Y, Z to 3 decimal places) with fixed sign formatting.
 *    - Sun altitude/azimuth solar calculation with correlated color temperature (Kelvin).
 *    - Active architectural POV proximity indicator with metric span & material finish spec.
 *    - Bi-directional synchronization with DOM datum attributes ([data-hud-*]).
 *
 * 3. Web Audio FFT Spectrum Visualizer:
 *    - Non-intrusive tap into soundEngine.ts master gain / Web Audio AnalyserNode.
 *    - 64 logarithmic frequency bands mapped from 20 Hz to 16,000 Hz (Bark/Mel scale).
 *    - Phosphor decay physics (exponential falloff mimicking CRT oscilloscope phosphor persistence).
 *    - Peak hold markers with gravity drop-off and temporal hold.
 *    - Procedural ambient room resonance simulation (65 Hz body pulse) during audio suspension.
 *
 * 4. Architectural Screenshot & CAD Blueprint Exporter:
 *    - Multi-sampling high-resolution renderer capture (1x, 2x, 4x supersampling up to 8K).
 *    - Custom architectural title block stamp (DIN EN ISO 7200 / ANSI engineering title block)
 *      with project name, location, GPS, elevation, date, POV, optical specs, and scale bar.
 *    - CAD Blueprint mode: inverts scene into cyan-blue blueprint schematic with drafting grid.
 *    - Programmatic download triggering with custom filenames.
 */

import * as THREE from 'three';
import { soundEngine } from '../soundEngine';
import { prefersReducedMotion } from '../env';

// ============================================================================
// 01. TYPE DEFINITIONS & CONTRACTS
// ============================================================================

export type HUDDensityMode = 'minimal' | 'standard' | 'technical' | 'blueprint';

export type TimeOfDayPreset = 'morning' | 'day' | 'golden' | 'dusk' | 'night';

export interface ArchitecturalPOVTelemetry {
  index: string;
  id: string;
  label: string;
  subtitle: string;
  u: number;
  span: string;
  spec: string;
  position?: [number, number, number];
  target?: [number, number, number];
}

export interface HUDColorTheme {
  accentBrass: string;
  accentBrassAlpha: string;
  inkWhite: string;
  inkMuted: string;
  lineHairline: string;
  lineGrid: string;
  horizonSky: string;
  horizonGround: string;
  phosphorGreen: string;
  phosphorDecay: string;
  phosphorPeak: string;
  blueprintBackground: string;
  blueprintGrid: string;
  blueprintInk: string;
  blueprintAccent: string;
  dangerAlert: string;
}

export interface TelemetrySnapshot {
  fps: number;
  fpsSmoothed: number;
  frameDeltaMs: number;
  frameVarianceMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  shaderPrograms: number;
  cameraPosition: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
  cameraRotationDeg: { pitch: number; yaw: number; roll: number };
  fov: number;
  focalLengthMm: number;
  aspectRatio: number;
  sunAltitudeDeg: number;
  sunAzimuthDeg: number;
  solarKelvin: number;
  lightingPreset: TimeOfDayPreset;
  activePOV: ArchitecturalPOVTelemetry | null;
  povProximity: number;
  splineProgress: number;
  interactionMode: 'story' | 'scene' | 'orbit' | 'inspect';
  audioPeakRms: number;
  audioActive: boolean;
  timestamp: string;
  gpsCoordinates: string;
  datumElevation: string;
}

export interface ReticleState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  expansion: number;
  targetExpansion: number;
  opacity: number;
  lockedTarget: THREE.Vector3 | null;
}

export interface TitleBlockData {
  projectName: string;
  subTitle: string;
  location: string;
  gpsCoordinates: string;
  datumElevation: string;
  architect: string;
  date: string;
  activePOV: string;
  roomSpan: string;
  materialFinish: string;
  focalLength: string;
  lightingPreset: string;
  sheetNumber: string;
  revision: string;
  scaleRatio: string;
  status: string;
}

export interface ScreenshotExportOptions {
  supersample?: 1 | 2 | 4;
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
  quality?: number;
  includeHUD?: boolean;
  includeTitleBlock?: boolean;
  blueprintMode?: boolean;
  filename?: string;
  titleBlockData?: Partial<TitleBlockData>;
}

export interface ScreenshotExportResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  filesizeBytes: number;
  filename: string;
}

export interface CinematicHUDOptions {
  canvasHost?: HTMLElement;
  scene?: THREE.Scene;
  camera?: THREE.PerspectiveCamera;
  renderer?: THREE.WebGLRenderer;
  density?: HUDDensityMode;
  theme?: Partial<HUDColorTheme>;
  showGrid?: boolean;
  showHorizon?: boolean;
  showCompass?: boolean;
  showReticle?: boolean;
  showFocalScale?: boolean;
  showTelemetry?: boolean;
  showAudioVisualizer?: boolean;
  gpsCoordinates?: string;
  datumElevation?: string;
  architecturalPOVs?: ArchitecturalPOVTelemetry[];
  signal?: AbortSignal;
}

// ============================================================================
// 02. DEFAULT THEMES & CANONICAL ARCHITECTURAL STATIONS
// ============================================================================

export const DEFAULT_HUD_THEME: HUDColorTheme = {
  accentBrass: '#C9A97E',
  accentBrassAlpha: 'rgba(201, 169, 126, 0.45)',
  inkWhite: '#F3EFE8',
  inkMuted: 'rgba(243, 239, 232, 0.48)',
  lineHairline: 'rgba(243, 239, 232, 0.14)',
  lineGrid: 'rgba(243, 239, 232, 0.05)',
  horizonSky: 'rgba(201, 169, 126, 0.55)',
  horizonGround: 'rgba(138, 180, 165, 0.55)',
  phosphorGreen: '#C9A97E',
  phosphorDecay: 'rgba(201, 169, 126, 0.28)',
  phosphorPeak: '#F5E6CC',
  blueprintBackground: '#081726',
  blueprintGrid: 'rgba(56, 189, 248, 0.12)',
  blueprintInk: '#E0F2FE',
  blueprintAccent: '#38BDF8',
  dangerAlert: '#EF4444',
};

export const CANONICAL_SHOWROOM_POVS: ArchitecturalPOVTelemetry[] = [
  {
    index: '01',
    id: 'pov-01-master-bay',
    label: 'F.S. III Master Bay',
    subtitle: 'Fluted Sal Canopy & Cove Grazing',
    u: 0.0,
    span: '8,450 × 5,600 × 3,200 mm',
    spec: 'Solid 24mm Shorea robusta fluted woodwork, honed Kota limestone hearth plinth',
    position: [0.0, 1.85, 5.2],
    target: [0.0, 1.2, 0.0],
  },
  {
    index: '02',
    id: 'pov-02-joinery-axis',
    label: 'F.S. II Joinery Axis',
    subtitle: 'Honed Marble Plane & Credenza Datum',
    u: 0.25,
    span: '12,800 × 7,400 × 3,450 mm',
    spec: 'Calacatta Viola marble bench, concealed unlacquered spun brass edge profiles',
    position: [2.8, 1.6, 2.1],
    target: [0.5, 1.1, -1.0],
  },
  {
    index: '03',
    id: 'pov-03-terracotta-threshold',
    label: 'F.S. I Terracotta Threshold',
    subtitle: 'Monolithic Plinth & Raking Daylight',
    u: 0.5,
    span: '9,200 × 4,800 × 3,100 mm',
    spec: 'Mineral lime plaster, floor-to-ceiling fluted reeded acoustic glazing',
    position: [-3.2, 1.5, 0.8],
    target: [0.0, 1.0, 0.0],
  },
  {
    index: '04',
    id: 'pov-04-material-table',
    label: 'Material Study Table',
    subtitle: 'Tactile Macro Specimen Array & Specular Grazing',
    u: 0.75,
    span: '3,600 × 1,400 × 760 mm',
    spec: 'Honed travertine slab, patinated brass hardware, hand-rubbed tung oil timber',
    position: [1.2, 1.2, -3.4],
    target: [0.2, 0.85, -2.5],
  },
];

// 35mm optical prime focal length stops (in mm)
const OPTICAL_PRIME_STOPS = [18, 24, 28, 35, 50, 85, 105, 135];

// Full-frame sensor dimensions: 36mm x 24mm
const FULL_FRAME_SENSOR_HEIGHT_MM = 24.0;

// ============================================================================
// 03. MATHEMATICAL HELPERS & TRIGONOMETRY
// ============================================================================

/**
 * Calculates effective 35mm optical focal length from camera vertical FOV in degrees.
 */
export function calculate35mmFocalLength(fovDegrees: number): number {
  const rad = THREE.MathUtils.degToRad(fovDegrees);
  return Math.round((0.5 * FULL_FRAME_SENSOR_HEIGHT_MM) / Math.tan(rad * 0.5));
}

/**
 * Calculates vertical FOV from 35mm optical focal length in mm.
 */
export function calculateFovFromFocalLength(focalLengthMm: number): number {
  const rad = 2 * Math.atan((0.5 * FULL_FRAME_SENSOR_HEIGHT_MM) / focalLengthMm);
  return THREE.MathUtils.radToDeg(rad);
}

/**
 * Extracts cardinal compass heading (0° to 360°) and Euler pitch/roll from camera.
 */
export function extractCameraOrientation(camera: THREE.Camera): {
  headingDeg: number;
  pitchDeg: number;
  rollDeg: number;
  cardinal: string;
} {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

  // Azimuth yaw: angle in horizontal X-Z plane
  let heading = THREE.MathUtils.radToDeg(Math.atan2(-forward.x, -forward.z));
  if (heading < 0) heading += 360;

  // Pitch elevation: angle with horizontal plane
  const pitch = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(forward.y, -1, 1)));

  // Roll bank: rotation around forward axis
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const roll = THREE.MathUtils.radToDeg(Math.atan2(up.dot(right), up.y));

  // 16-point cardinal rose designation
  const cardinals = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW', 'N'
  ];
  const cardinalIdx = Math.round((heading % 360) / 22.5);
  const cardinal = cardinals[cardinalIdx] || 'N';

  return {
    headingDeg: heading,
    pitchDeg: pitch,
    rollDeg: roll,
    cardinal,
  };
}

/**
 * Calculates sun elevation and azimuth based on time of day preset and day progress.
 */
export function calculateSunPosition(
  preset: TimeOfDayPreset,
  progress = 0
): { altitudeDeg: number; azimuthDeg: number; kelvin: number } {
  switch (preset) {
    case 'morning':
    case 'day':
      return {
        altitudeDeg: 18.5 + progress * 4.0,
        azimuthDeg: 82.0 + progress * 8.0,
        kelvin: 5500,
      };
    case 'golden':
      return {
        altitudeDeg: 11.2 - progress * 3.5,
        azimuthDeg: 242.0 + progress * 10.0,
        kelvin: 3200,
      };
    case 'dusk':
      return {
        altitudeDeg: -2.8 - progress * 4.0,
        azimuthDeg: 288.0 + progress * 6.0,
        kelvin: 2200,
      };
    case 'night':
      return {
        altitudeDeg: -18.0,
        azimuthDeg: 315.0,
        kelvin: 1800,
      };
    default:
      return {
        altitudeDeg: 45.0,
        azimuthDeg: 180.0,
        kelvin: 5000,
      };
  }
}

/**
 * Formats coordinate to 3 decimal places with fixed sign.
 */
export function formatFixedSignCoord(n: number): string {
  const sign = n >= 0 ? '+' : '-';
  const abs = Math.abs(n).toFixed(3);
  return `${sign}${abs.padStart(6, '0')}`;
}

// ============================================================================
// 04. AUDIO SPECTRUM ANALYSER SUBSYSTEM
// ============================================================================

export class HUDAudioSpectrumAnalyzer {
  private analyser: AnalyserNode | null = null;
  private fftData: Uint8Array | null = null;
  private bandCount = 64;
  private frequencyBands: Float32Array;
  private phosphorDecay: Float32Array;
  private peakHoldValues: Float32Array;
  private peakHoldTimers: Float32Array;
  private fallbackNoisePhase = 0;
  private lastRms = 0;

  constructor(bandCount = 64) {
    this.bandCount = bandCount;
    this.frequencyBands = new Float32Array(bandCount);
    this.phosphorDecay = new Float32Array(bandCount);
    this.peakHoldValues = new Float32Array(bandCount);
    this.peakHoldTimers = new Float32Array(bandCount);
    this.initAudioHook();
  }

  /**
   * Safe non-invasive tap into soundEngine.ts master audio graph.
   */
  private initAudioHook(): void {
    if (typeof window === 'undefined') return;

    try {
      const se = soundEngine as unknown as {
        ctx?: AudioContext;
        ensureContext?: () => AudioContext | null;
        masterGain?: GainNode;
        getAnalyser?: () => AnalyserNode;
      };

      if (typeof se.getAnalyser === 'function') {
        this.analyser = se.getAnalyser();
      } else {
        const ctx = se.ctx || (typeof se.ensureContext === 'function' ? se.ensureContext() : null);
        if (ctx && se.masterGain) {
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.82;
          se.masterGain.connect(analyser);
          this.analyser = analyser;
          this.fftData = new Uint8Array(analyser.frequencyBinCount);
        }
      }

      if (this.analyser && !this.fftData) {
        this.fftData = new Uint8Array(this.analyser.frequencyBinCount);
      }
    } catch (err) {
      console.warn('[CinematicHUD] Failed to tap soundEngine AudioContext:', err);
    }
  }

  /**
   * Re-checks and binds audio context if it initialized after HUD construction.
   */
  public ensureAudioConnection(): void {
    if (!this.analyser) {
      this.initAudioHook();
    }
  }

  /**
   * Updates frequency band amplitudes, phosphor decay physics, and peak hold markers.
   */
  public update(dt: number): void {
    this.ensureAudioConnection();

    let hasLiveAudio = false;

    if (this.analyser && this.fftData) {
      try {
        (this.analyser as unknown as { getByteFrequencyData: (arr: Uint8Array) => void }).getByteFrequencyData(this.fftData);
        let sumSquares = 0;

        // Group linear FFT bins into 64 logarithmic bands (20Hz to 16kHz)
        const binCount = this.fftData.length;
        for (let i = 0; i < this.bandCount; i++) {
          // Logarithmic bin distribution
          const startBin = Math.floor(Math.pow(i / this.bandCount, 2.2) * (binCount - 2));
          const endBin = Math.max(
            startBin + 1,
            Math.floor(Math.pow((i + 1) / this.bandCount, 2.2) * (binCount - 1))
          );

          let bandSum = 0;
          let count = 0;
          for (let b = startBin; b <= endBin && b < binCount; b++) {
            bandSum += this.fftData[b];
            count++;
          }

          const rawNorm = count > 0 ? (bandSum / count) / 255.0 : 0;
          this.frequencyBands[i] = rawNorm;
          sumSquares += rawNorm * rawNorm;
        }

        this.lastRms = Math.sqrt(sumSquares / this.bandCount);
        hasLiveAudio = this.lastRms > 0.005;
      } catch {
        hasLiveAudio = false;
      }
    }

    // Procedural room resonance simulation (65 Hz warm body pulse) when audio is silent
    if (!hasLiveAudio) {
      this.fallbackNoisePhase += dt * 0.85;
      const breathingGain = 0.065 + Math.sin(this.fallbackNoisePhase * 0.4) * 0.035;

      for (let i = 0; i < this.bandCount; i++) {
        // 65Hz peak in lower octaves (around bands 6-12)
        const distFrom65Hz = Math.abs(i - 9);
        const resonance = Math.exp(-distFrom65Hz * 0.35);
        const microJitter = (Math.sin(this.fallbackNoisePhase * 3.5 + i * 0.8) + 1.0) * 0.5;
        const targetVal = resonance * breathingGain * (0.6 + 0.4 * microJitter);

        // Smoothly glide toward target
        this.frequencyBands[i] += (targetVal - this.frequencyBands[i]) * Math.min(1.0, dt * 10.0);
      }
      this.lastRms = breathingGain * 0.5;
    }

    // Phosphor decay physics & peak hold gravity
    const decayFactor = Math.pow(0.92, dt * 60.0);
    const gravity = dt * 1.8;

    for (let i = 0; i < this.bandCount; i++) {
      const current = this.frequencyBands[i];

      // Phosphor decay: immediate attack, exponential falloff
      if (current >= this.phosphorDecay[i]) {
        this.phosphorDecay[i] = current;
      } else {
        this.phosphorDecay[i] = Math.max(0, this.phosphorDecay[i] * decayFactor);
      }

      // Peak hold markers
      if (current >= this.peakHoldValues[i]) {
        this.peakHoldValues[i] = current;
        this.peakHoldTimers[i] = 0.65; // hold for 650ms
      } else {
        if (this.peakHoldTimers[i] > 0) {
          this.peakHoldTimers[i] -= dt;
        } else {
          this.peakHoldValues[i] = Math.max(0, this.peakHoldValues[i] - gravity);
        }
      }
    }
  }

  public getBands(): Float32Array {
    return this.frequencyBands;
  }

  public getPhosphorDecay(): Float32Array {
    return this.phosphorDecay;
  }

  public getPeakHold(): Float32Array {
    return this.peakHoldValues;
  }

  public getRms(): number {
    return this.lastRms;
  }

  public isLive(): boolean {
    return this.lastRms > 0.005;
  }

  public dispose(): void {
    this.analyser = null;
    this.fftData = null;
  }
}

// ============================================================================
// 05. 2D VIEWPORT CANVAS RENDERER (VIEWFINDER & TELEMETRY HUD)
// ============================================================================

export class HUDViewfinderCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private theme: HUDColorTheme;
  private density: HUDDensityMode = 'standard';

  // Interactive reticle state
  private reticle: ReticleState = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    expansion: 0,
    targetExpansion: 0,
    opacity: 0.85,
    lockedTarget: null,
  };

  // Smoothed telemetry
  private smoothedPitch = 0;
  private smoothedRoll = 0;
  private smoothedHeading = 0;

  constructor(canvas: HTMLCanvasElement, theme: HUDColorTheme) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('[CinematicHUD] Unable to acquire 2D canvas context');
    this.ctx = ctx;
    this.theme = theme;
  }

  public resize(width: number, height: number, dpr = window.devicePixelRatio || 1): void {
    this.width = width;
    this.height = height;
    this.dpr = Math.min(2.0, dpr);

    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.reticle.x = width * 0.5;
    this.reticle.y = height * 0.5;
    this.reticle.targetX = width * 0.5;
    this.reticle.targetY = height * 0.5;
  }

  public setDensity(density: HUDDensityMode): void {
    this.density = density;
  }

  public setTheme(theme: HUDColorTheme): void {
    this.theme = theme;
  }

  public updateReticlePointer(screenX: number, screenY: number, isMoving = false): void {
    // Parallax lead towards mouse cursor
    const centerX = this.width * 0.5;
    const centerY = this.height * 0.5;
    const maxOffset = 36.0;

    const dx = screenX - centerX;
    const dy = screenY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0.001) {
      const factor = Math.min(maxOffset, dist * 0.06);
      this.reticle.targetX = centerX + (dx / dist) * factor;
      this.reticle.targetY = centerY + (dy / dist) * factor;
    } else {
      this.reticle.targetX = centerX;
      this.reticle.targetY = centerY;
    }

    this.reticle.targetExpansion = isMoving ? 14.0 : 0.0;
  }

  public render(
    dt: number,
    telemetry: TelemetrySnapshot,
    audioAnalyzer: HUDAudioSpectrumAnalyzer,
    visible = true
  ): void {
    if (!visible || this.width <= 0 || this.height <= 0) return;

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, w, h);

    // Smooth Euler angles for jitter-free HUD horizon & compass
    const smoothing = Math.min(1.0, dt * 14.0);
    this.smoothedPitch += (telemetry.cameraRotationDeg.pitch - this.smoothedPitch) * smoothing;
    this.smoothedRoll += (telemetry.cameraRotationDeg.roll - this.smoothedRoll) * smoothing;

    // Heading angle wrap-around smoothing
    let headingDiff = telemetry.cameraRotationDeg.yaw - this.smoothedHeading;
    while (headingDiff < -180) headingDiff += 360;
    while (headingDiff > 180) headingDiff -= 360;
    this.smoothedHeading += headingDiff * smoothing;
    if (this.smoothedHeading < 0) this.smoothedHeading += 360;
    if (this.smoothedHeading >= 360) this.smoothedHeading -= 360;

    // Smooth reticle spring motion
    const reticleSpeed = Math.min(1.0, dt * 16.0);
    this.reticle.x += (this.reticle.targetX - this.reticle.x) * reticleSpeed;
    this.reticle.y += (this.reticle.targetY - this.reticle.y) * reticleSpeed;
    this.reticle.expansion += (this.reticle.targetExpansion - this.reticle.expansion) * (dt * 8.0);

    const isBlueprint = this.density === 'blueprint';
    const accent = isBlueprint ? this.theme.blueprintAccent : this.theme.accentBrass;
    const ink = isBlueprint ? this.theme.blueprintInk : this.theme.inkWhite;
    const muted = isBlueprint ? 'rgba(224, 242, 254, 0.45)' : this.theme.inkMuted;
    const lineHairline = isBlueprint ? 'rgba(56, 189, 248, 0.25)' : this.theme.lineHairline;

    // 1. Perimeter Drafting Frame & Corner Crosshair Brackets
    this.drawCornerBrackets(ctx, w, h, accent, lineHairline);

    // 2. Architectural Golden Ratio & Rule-of-Thirds Grid (technical & blueprint modes)
    if (this.density === 'technical' || this.density === 'blueprint') {
      this.drawArchitecturalGrid(ctx, w, h, isBlueprint);
    }

    // 3. Central Interactive Viewfinder Reticle
    this.drawReticle(ctx, this.reticle.x, this.reticle.y, this.reticle.expansion, accent, ink);

    // 4. Artificial Horizon Ladder (Pitch / Roll indicator)
    if (this.density !== 'minimal') {
      this.drawHorizonLadder(ctx, w * 0.5, h * 0.5, this.smoothedPitch, this.smoothedRoll, accent, muted);
    }

    // 5. Cardinal Compass Azimuth Rose (Top/Bottom dial)
    this.drawCompassRose(ctx, w * 0.5, 48, this.smoothedHeading, accent, ink, muted);

    // 6. 35mm Optical Vernier Scale (Right margin)
    this.draw35mmOpticalScale(ctx, w - 38, h * 0.5, telemetry.focalLengthMm, telemetry.fov, accent, ink, muted);

    // 7. Telemetry Data Readouts (Top Left, Top Right, Bottom Left, Bottom Right)
    this.drawTelemetryClusters(ctx, w, h, telemetry, accent, ink, muted);

    // 8. 64-Band Audio Spectrum Phosphor Waveform (Bottom Center)
    this.drawAudioSpectrum(ctx, w * 0.5, h - 34, audioAnalyzer, accent, isBlueprint);

    ctx.restore();
  }

  // ==========================================
  // VIEWPORT DRAWING PRIMITIVES
  // ==========================================

  private drawCornerBrackets(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    accent: string,
    hairline: string
  ): void {
    const margin = Math.max(16, Math.min(28, w * 0.024));
    const arm = 14;

    ctx.save();
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = hairline;

    // Outer bounding hairline frame
    ctx.strokeRect(margin, margin, w - margin * 2, h - margin * 2);

    // 4 Corner Precision L-Brackets
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(margin, margin + arm);
    ctx.lineTo(margin, margin);
    ctx.lineTo(margin + arm, margin);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(w - margin - arm, margin);
    ctx.lineTo(w - margin, margin);
    ctx.lineTo(w - margin, margin + arm);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(margin, h - margin - arm);
    ctx.lineTo(margin, h - margin);
    ctx.lineTo(margin + arm, h - margin);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(w - margin - arm, h - margin);
    ctx.lineTo(w - margin, h - margin);
    ctx.lineTo(w - margin, h - margin - arm);
    ctx.stroke();

    ctx.restore();
  }

  private drawArchitecturalGrid(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    isBlueprint: boolean
  ): void {
    ctx.save();
    ctx.strokeStyle = isBlueprint ? this.theme.blueprintGrid : this.theme.lineGrid;
    ctx.lineWidth = 0.75;
    ctx.setLineDash([2, 4]);

    // Rule of Thirds
    const x1 = w * 0.3333;
    const x2 = w * 0.6667;
    const y1 = h * 0.3333;
    const y2 = h * 0.6667;

    ctx.beginPath();
    ctx.moveTo(x1, 0);
    ctx.lineTo(x1, h);
    ctx.moveTo(x2, 0);
    ctx.lineTo(x2, h);
    ctx.moveTo(0, y1);
    ctx.lineTo(w, y1);
    ctx.moveTo(0, y2);
    ctx.lineTo(w, y2);
    ctx.stroke();

    // Subtle center cross tick marks
    ctx.setLineDash([]);
    ctx.strokeStyle = isBlueprint ? 'rgba(56, 189, 248, 0.3)' : 'rgba(243, 239, 232, 0.2)';
    ctx.beginPath();
    // (x1, y1)
    ctx.moveTo(x1 - 6, y1); ctx.lineTo(x1 + 6, y1);
    ctx.moveTo(x1, y1 - 6); ctx.lineTo(x1, y1 + 6);
    // (x2, y1)
    ctx.moveTo(x2 - 6, y1); ctx.lineTo(x2 + 6, y1);
    ctx.moveTo(x2, y1 - 6); ctx.lineTo(x2, y1 + 6);
    // (x1, y2)
    ctx.moveTo(x1 - 6, y2); ctx.lineTo(x1 + 6, y2);
    ctx.moveTo(x1, y2 - 6); ctx.lineTo(x1, y2 + 6);
    // (x2, y2)
    ctx.moveTo(x2 - 6, y2); ctx.lineTo(x2 + 6, y2);
    ctx.moveTo(x2, y2 - 6); ctx.lineTo(x2, y2 + 6);
    ctx.stroke();

    ctx.restore();
  }

  private drawReticle(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    expansion: number,
    accent: string,
    ink: string
  ): void {
    ctx.save();
    ctx.translate(cx, cy);

    const baseRadius = 18;
    const radius = baseRadius + expansion;
    const gap = 6 + expansion * 0.4;
    const tickLen = 8;

    // Outer dashed precision circle
    ctx.strokeStyle = 'rgba(243, 239, 232, 0.28)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Center focal point dot
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, 0, 1.75, 0, Math.PI * 2);
    ctx.fill();

    // Optical vernier crosshair ticks (with aperture gap)
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.0;

    // Top tick
    ctx.beginPath();
    ctx.moveTo(0, -(gap + tickLen));
    ctx.lineTo(0, -gap);
    ctx.stroke();

    // Bottom tick
    ctx.beginPath();
    ctx.moveTo(0, gap);
    ctx.lineTo(0, gap + tickLen);
    ctx.stroke();

    // Left tick
    ctx.beginPath();
    ctx.moveTo(-(gap + tickLen), 0);
    ctx.lineTo(-gap, 0);
    ctx.stroke();

    // Right tick
    ctx.beginPath();
    ctx.moveTo(gap, 0);
    ctx.lineTo(gap + tickLen, 0);
    ctx.stroke();

    // Diagonal corner brackets for drafting reticle
    const dOff = radius * 0.7071;
    const dArm = 3;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.0;

    ctx.beginPath();
    // Top Right
    ctx.moveTo(dOff - dArm, -dOff); ctx.lineTo(dOff, -dOff); ctx.lineTo(dOff, -dOff + dArm);
    // Bottom Right
    ctx.moveTo(dOff - dArm, dOff); ctx.lineTo(dOff, dOff); ctx.lineTo(dOff, dOff - dArm);
    // Bottom Left
    ctx.moveTo(-dOff + dArm, dOff); ctx.lineTo(-dOff, dOff); ctx.lineTo(-dOff, dOff - dArm);
    // Top Left
    ctx.moveTo(-dOff + dArm, -dOff); ctx.lineTo(-dOff, -dOff); ctx.lineTo(-dOff, -dOff + dArm);
    ctx.stroke();

    ctx.restore();
  }

  private drawHorizonLadder(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    pitchDeg: number,
    rollDeg: number,
    accent: string,
    muted: string
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(THREE.MathUtils.degToRad(-rollDeg));

    // Vertical pitch displacement: 3.5 pixels per degree
    const pitchScale = 3.5;
    const ladderWidth = 140;

    // Main horizon reference line
    const horizonY = pitchDeg * pitchScale;

    // Center break in horizon line
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = accent;

    ctx.beginPath();
    // Left wing
    ctx.moveTo(-ladderWidth * 0.65, horizonY);
    ctx.lineTo(-24, horizonY);
    // Center point indicator
    ctx.moveTo(-24, horizonY);
    ctx.lineTo(-24, horizonY + 4);
    // Right wing
    ctx.moveTo(24, horizonY);
    ctx.lineTo(ladderWidth * 0.65, horizonY);
    // Center point indicator
    ctx.moveTo(24, horizonY);
    ctx.lineTo(24, horizonY + 4);
    ctx.stroke();

    // Pitch rungs at -20°, -15°, -10°, -5°, +5°, +10°, +15°, +20°
    ctx.font = '9px ui-monospace, SFMono-Regular, monospace';
    ctx.fillStyle = muted;
    ctx.strokeStyle = 'rgba(243, 239, 232, 0.35)';
    ctx.lineWidth = 0.85;

    const rungs = [-20, -15, -10, -5, 5, 10, 15, 20];
    for (const deg of rungs) {
      const rungY = (pitchDeg - deg) * pitchScale;

      // Cull rungs outside central viewport band
      if (Math.abs(rungY) > 130) continue;

      const halfW = deg % 10 === 0 ? 32 : 18;
      const tickH = deg > 0 ? 4 : -4; // Sky points down to horizon, ground points up

      ctx.beginPath();
      // Left rung
      ctx.moveTo(-halfW - 8, rungY);
      ctx.lineTo(-8, rungY);
      ctx.lineTo(-8, rungY + tickH);

      // Right rung
      ctx.moveTo(8, rungY + tickH);
      ctx.lineTo(8, rungY);
      ctx.lineTo(halfW + 8, rungY);
      ctx.stroke();

      // Degree label on major rungs (10°, 20°)
      if (Math.abs(deg) % 10 === 0) {
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.abs(deg)}°`, -halfW - 12, rungY + 3);
        ctx.textAlign = 'left';
        ctx.fillText(`${Math.abs(deg)}°`, halfW + 12, rungY + 3);
      }
    }

    // Roll pointer arc at top (fixed relative to airframe / viewport)
    ctx.rotate(THREE.MathUtils.degToRad(rollDeg)); // un-rotate back to screen space
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(243, 239, 232, 0.2)';
    ctx.arc(0, 0, 110, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.stroke();

    // Bank angle index triangle
    const rollRad = THREE.MathUtils.degToRad(-rollDeg - 90);
    const tipX = Math.cos(rollRad) * 110;
    const tipY = Math.sin(rollRad) * 110;

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawCompassRose(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    headingDeg: number,
    accent: string,
    ink: string,
    muted: string
  ): void {
    ctx.save();
    ctx.translate(cx, cy);

    // Linear horizontal tape compass (Awwwards 05_kpr benchmark style)
    const tapeWidth = Math.min(260, this.width * 0.4);
    const pixelsPerDegree = tapeWidth / 60.0; // 60° visible window

    // Clipping window for tape
    ctx.beginPath();
    ctx.rect(-tapeWidth * 0.5, -18, tapeWidth, 34);
    ctx.clip();

    ctx.font = '9px ui-monospace, SFMono-Regular, monospace';
    ctx.textAlign = 'center';

    const minDeg = Math.floor(headingDeg - 35);
    const maxDeg = Math.ceil(headingDeg + 35);

    for (let deg = minDeg; deg <= maxDeg; deg++) {
      let normalizedDeg = deg % 360;
      if (normalizedDeg < 0) normalizedDeg += 360;

      const x = (deg - headingDeg) * pixelsPerDegree;

      if (deg % 10 === 0) {
        // Major 10° tick
        ctx.strokeStyle = normalizedDeg % 90 === 0 ? accent : 'rgba(243, 239, 232, 0.4)';
        ctx.lineWidth = normalizedDeg % 90 === 0 ? 1.5 : 1.0;

        ctx.beginPath();
        ctx.moveTo(x, -6);
        ctx.lineTo(x, 4);
        ctx.stroke();

        // Cardinal labels
        let label = '';
        if (normalizedDeg === 0) label = 'N';
        else if (normalizedDeg === 45) label = 'NE';
        else if (normalizedDeg === 90) label = 'E';
        else if (normalizedDeg === 135) label = 'SE';
        else if (normalizedDeg === 180) label = 'S';
        else if (normalizedDeg === 225) label = 'SW';
        else if (normalizedDeg === 270) label = 'W';
        else if (normalizedDeg === 315) label = 'NW';
        else label = `${normalizedDeg}°`;

        ctx.fillStyle = normalizedDeg % 90 === 0 ? accent : muted;
        ctx.fillText(label, x, 14);
      } else if (deg % 5 === 0) {
        // Minor 5° tick
        ctx.strokeStyle = 'rgba(243, 239, 232, 0.2)';
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(x, -3);
        ctx.lineTo(x, 2);
        ctx.stroke();
      }
    }

    // Center lubber line & triangle pointer
    ctx.restore();
    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(4, -24);
    ctx.lineTo(-4, -24);
    ctx.closePath();
    ctx.fill();

    // Numeric heading read-out above tape
    ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    const hdgPad = Math.round(headingDeg).toString().padStart(3, '0');
    ctx.fillText(`AZ ${hdgPad}°`, 0, -28);

    ctx.restore();
  }

  private draw35mmOpticalScale(
    ctx: CanvasRenderingContext2D,
    x: number,
    cy: number,
    focalLengthMm: number,
    fovDeg: number,
    accent: string,
    ink: string,
    muted: string
  ): void {
    ctx.save();
    ctx.translate(x, cy);

    const scaleHeight = Math.min(220, this.height * 0.45);
    const minFocal = 16;
    const maxFocal = 135;

    // Logarithmic mapping of focal lengths along vertical scale
    const focalToY = (f: number): number => {
      const norm = (Math.log(f) - Math.log(minFocal)) / (Math.log(maxFocal) - Math.log(minFocal));
      return scaleHeight * 0.5 - norm * scaleHeight; // Wide at bottom, tele at top
    };

    // Vertical baseline rule
    ctx.strokeStyle = 'rgba(243, 239, 232, 0.18)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, -scaleHeight * 0.5);
    ctx.lineTo(0, scaleHeight * 0.5);
    ctx.stroke();

    // Major prime focal length stops
    ctx.font = '8.5px ui-monospace, SFMono-Regular, monospace';
    ctx.textAlign = 'right';

    for (const f of OPTICAL_PRIME_STOPS) {
      const y = focalToY(f);
      const isCurrentStop = Math.abs(f - focalLengthMm) < 3.0;

      ctx.strokeStyle = isCurrentStop ? accent : 'rgba(243, 239, 232, 0.35)';
      ctx.lineWidth = isCurrentStop ? 1.5 : 0.85;

      ctx.beginPath();
      ctx.moveTo(-6, y);
      ctx.lineTo(0, y);
      ctx.stroke();

      ctx.fillStyle = isCurrentStop ? accent : muted;
      ctx.fillText(`${f}mm`, -10, y + 3);
    }

    // Active sliding optical cursor & focal read-out
    const activeY = focalToY(THREE.MathUtils.clamp(focalLengthMm, minFocal, maxFocal));

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(2, activeY);
    ctx.lineTo(8, activeY - 4);
    ctx.lineTo(8, activeY + 4);
    ctx.closePath();
    ctx.fill();

    // Telemetry label
    ctx.textAlign = 'left';
    ctx.fillStyle = ink;
    ctx.font = '9px ui-monospace, SFMono-Regular, monospace';
    ctx.fillText(`${focalLengthMm}MM`, 12, activeY + 3);

    // Header tag at top
    ctx.textAlign = 'right';
    ctx.fillStyle = muted;
    ctx.font = '8px ui-monospace, SFMono-Regular, monospace';
    ctx.fillText('35MM OPTICS', 0, -scaleHeight * 0.5 - 10);
    ctx.fillText(`FOV ${fovDeg.toFixed(1)}°`, 0, -scaleHeight * 0.5 - 1);

    ctx.restore();
  }

  private drawTelemetryClusters(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    telemetry: TelemetrySnapshot,
    accent: string,
    ink: string,
    muted: string
  ): void {
    const padX = Math.max(22, w * 0.032);
    const topY = Math.max(54, h * 0.082);
    const bottomY = h - Math.max(54, h * 0.082);

    ctx.save();
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';

    // ----------------------------------------------------
    // TOP LEFT: World Coordinates, Elevation & GPS
    // ----------------------------------------------------
    const posX = formatFixedSignCoord(telemetry.cameraPosition.x);
    const posY = formatFixedSignCoord(telemetry.cameraPosition.y);
    const posZ = formatFixedSignCoord(telemetry.cameraPosition.z);

    ctx.textAlign = 'left';
    // Coordinate Status Pip
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(padX, topY - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = ink;
    ctx.fillText(telemetry.gpsCoordinates, padX + 8, topY);

    ctx.fillStyle = muted;
    ctx.fillText(telemetry.datumElevation, padX + 8, topY + 14);
    ctx.fillText(`CAM  X ${posX}  Y ${posY}  Z ${posZ}`, padX + 8, topY + 28);

    // ----------------------------------------------------
    // TOP RIGHT: GPU Draw Calls, Triangles & Shaders
    // ----------------------------------------------------
    ctx.textAlign = 'right';
    ctx.fillStyle = ink;
    ctx.fillText('RUBICONIUS ARCHITECTURAL STUDY', w - padX, topY);

    ctx.fillStyle = muted;
    ctx.fillText(
      `GPU  ${telemetry.drawCalls} CALLS · ${(telemetry.triangles / 1000).toFixed(1)}K TRIS · ${telemetry.geometries} GEOM`,
      w - padX,
      topY + 14
    );
    ctx.fillText(
      `FPS  ${telemetry.fpsSmoothed.toFixed(0)} (${telemetry.frameDeltaMs.toFixed(1)}ms ±${telemetry.frameVarianceMs.toFixed(1)})`,
      w - padX,
      topY + 28
    );

    // ----------------------------------------------------
    // BOTTOM LEFT: Active Architectural POV & Metric Span
    // ----------------------------------------------------
    ctx.textAlign = 'left';
    if (telemetry.activePOV) {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(padX, bottomY - 26, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = ink;
      ctx.fillText(
        `POV ${telemetry.activePOV.index} · ${telemetry.activePOV.label.toUpperCase()}`,
        padX + 8,
        bottomY - 24
      );

      ctx.fillStyle = muted;
      ctx.fillText(`SPAN  ${telemetry.activePOV.span}`, padX + 8, bottomY - 10);
      ctx.fillText(`SPEC  ${telemetry.activePOV.spec.slice(0, 48)}...`, padX + 8, bottomY + 4);
    } else {
      ctx.fillStyle = muted;
      ctx.fillText(`U-PROGRESS  ${(telemetry.splineProgress * 100).toFixed(1)}%`, padX, bottomY - 10);
    }

    // ----------------------------------------------------
    // BOTTOM RIGHT: Solar Altitude/Azimuth & Daylight Preset
    // ----------------------------------------------------
    ctx.textAlign = 'right';
    ctx.fillStyle = ink;
    ctx.fillText(
      `SOLAR  ALT ${telemetry.sunAltitudeDeg.toFixed(1)}° · AZ ${telemetry.sunAzimuthDeg.toFixed(0)}°`,
      w - padX,
      bottomY - 24
    );

    ctx.fillStyle = muted;
    ctx.fillText(
      `LIGHT  ${telemetry.lightingPreset.toUpperCase()} · ${telemetry.solarKelvin}K`,
      w - padX,
      bottomY - 10
    );
    ctx.fillText(
      `MODE  ${telemetry.interactionMode.toUpperCase()} INSPECTION`,
      w - padX,
      bottomY + 4
    );

    ctx.restore();
  }

  private drawAudioSpectrum(
    ctx: CanvasRenderingContext2D,
    cx: number,
    baseY: number,
    audioAnalyzer: HUDAudioSpectrumAnalyzer,
    accent: string,
    isBlueprint: boolean
  ): void {
    const bands = audioAnalyzer.getBands();
    const decay = audioAnalyzer.getPhosphorDecay();
    const peaks = audioAnalyzer.getPeakHold();
    const count = bands.length;

    const totalWidth = Math.min(280, this.width * 0.42);
    const barHeightMax = 22;
    const barWidth = Math.max(1.5, (totalWidth / count) - 1.0);
    const gap = 1.0;
    const startX = cx - (count * (barWidth + gap)) * 0.5;

    ctx.save();

    // Baseline rule
    ctx.strokeStyle = isBlueprint ? 'rgba(56, 189, 248, 0.2)' : 'rgba(243, 239, 232, 0.16)';
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.moveTo(startX - 8, baseY);
    ctx.lineTo(startX + count * (barWidth + gap) + 8, baseY);
    ctx.stroke();

    for (let i = 0; i < count; i++) {
      const x = startX + i * (barWidth + gap);
      const hInstant = Math.max(1, bands[i] * barHeightMax);
      const hDecay = Math.max(1, decay[i] * barHeightMax);
      const hPeak = Math.max(1, peaks[i] * barHeightMax);

      // 1. Phosphor persistence decay trail (translucent green/amber glow)
      ctx.fillStyle = isBlueprint ? 'rgba(56, 189, 248, 0.18)' : this.theme.phosphorDecay;
      ctx.fillRect(x, baseY - hDecay, barWidth, hDecay);

      // 2. Instantaneous amplitude bar
      ctx.fillStyle = accent;
      ctx.fillRect(x, baseY - hInstant, barWidth, hInstant);

      // 3. Peak hold dot cap
      ctx.fillStyle = isBlueprint ? '#BAE6FD' : this.theme.phosphorPeak;
      ctx.fillRect(x, baseY - hPeak - 1.5, barWidth, 1.0);
    }

    // Audio status tag
    ctx.font = '8px ui-monospace, SFMono-Regular, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = isBlueprint ? 'rgba(224, 242, 254, 0.45)' : this.theme.inkMuted;
    ctx.fillText('FFT 64-BAND ROOM ACOUSTICS · 65HZ BODY PEAK', cx, baseY + 12);

    ctx.restore();
  }
}

// ============================================================================
// 06. ARCHITECTURAL SCREENSHOT & CAD BLUEPRINT EXPORTER
// ============================================================================

export class HUDBlueprintExporter {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private gpsCoordinates: string;
  private datumElevation: string;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    gpsCoordinates = '26.4678° N · 87.2767° E',
    datumElevation = '+72.4M MSL'
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.gpsCoordinates = gpsCoordinates;
    this.datumElevation = datumElevation;
  }

  /**
   * Captures high-resolution supersampled camera snapshot with optional DIN/ISO title block.
   */
  public async exportSnapshot(
    options: ScreenshotExportOptions = {},
    telemetry: TelemetrySnapshot
  ): Promise<ScreenshotExportResult> {
    const {
      supersample = 2,
      format = 'image/png',
      quality = 0.95,
      includeHUD = true,
      includeTitleBlock = true,
      blueprintMode = false,
      filename = `RUBICONIUS_A101_${Date.now()}.png`,
      titleBlockData = {},
    } = options;

    const originalSize = new THREE.Vector2();
    this.renderer.getSize(originalSize);
    const originalPixelRatio = this.renderer.getPixelRatio();
    const originalAspect = this.camera.aspect;
    const originalToneMapping = this.renderer.toneMapping;
    const originalBackground = this.scene.background;

    // Supersampled dimensions (e.g. 2x = 3840x2160 4K UHD from 1080p)
    const exportWidth = Math.round(originalSize.x * supersample);
    const exportHeight = Math.round(originalSize.y * supersample);

    // Offscreen staging canvas
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = exportWidth;
    compositeCanvas.height = exportHeight;
    const ctx = compositeCanvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('[HUDBlueprintExporter] Failed to acquire composite canvas 2D context');

    try {
      // 1. Configure supersampled render target
      this.renderer.setPixelRatio(1.0);
      this.renderer.setSize(exportWidth, exportHeight, false);
      this.camera.aspect = exportWidth / exportHeight;
      this.camera.updateProjectionMatrix();

      // Blueprint styling override
      if (blueprintMode) {
        this.scene.background = new THREE.Color(0x081726);
      }

      // 2. Render 3D Scene
      this.renderer.render(this.scene, this.camera);

      // Draw rendered WebGL buffer into composite canvas
      ctx.drawImage(this.renderer.domElement, 0, 0, exportWidth, exportHeight);

      // Blueprint color grading filter (cyan monochrome tone)
      if (blueprintMode) {
        this.applyBlueprintMonochromePass(ctx, exportWidth, exportHeight);
      }

      // 3. Render 2D Viewfinder Overlay on top
      if (includeHUD) {
        const hudCanvas = document.createElement('canvas');
        hudCanvas.width = exportWidth;
        hudCanvas.height = exportHeight;
        const hudView = new HUDViewfinderCanvas(hudCanvas, DEFAULT_HUD_THEME);
        hudView.resize(exportWidth, exportHeight, 1.0);
        hudView.setDensity(blueprintMode ? 'blueprint' : 'technical');

        const audioDummy = new HUDAudioSpectrumAnalyzer(64);
        audioDummy.update(0.016);
        hudView.render(0.016, telemetry, audioDummy, true);

        ctx.drawImage(hudCanvas, 0, 0);
        audioDummy.dispose();
      }

      // 4. Render DIN EN ISO 7200 / ANSI Title Block Stamp
      if (includeTitleBlock) {
        const titleData: TitleBlockData = {
          projectName: titleBlockData.projectName || 'RUBICONIUS ARCHITECTURAL STUDY',
          subTitle: titleBlockData.subTitle || 'TERAI SANCTUARY RESIDENCE',
          location: titleBlockData.location || 'Biratnagar, Koshi Province, Nepal',
          gpsCoordinates: this.gpsCoordinates,
          datumElevation: this.datumElevation,
          architect: titleBlockData.architect || 'Rubiconius Architectural Atelier',
          date: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' NPT (UTC+5:45)',
          activePOV: telemetry.activePOV ? `POV ${telemetry.activePOV.index} · ${telemetry.activePOV.label}` : 'STATION ORBIT INSPECTION',
          roomSpan: telemetry.activePOV?.span || 'METRIC SCALE 1:50',
          materialFinish: telemetry.activePOV?.spec || 'Honed Kota Stone · Sal Wood Joinery · Unlacquered Brass',
          focalLength: `${telemetry.focalLengthMm}mm Prime · FOV ${telemetry.fov.toFixed(1)}°`,
          lightingPreset: `${telemetry.lightingPreset.toUpperCase()} VOLUMETRIC (${telemetry.solarKelvin}K)`,
          sheetNumber: titleBlockData.sheetNumber || 'SHEET A-101',
          revision: titleBlockData.revision || 'REV 04.2',
          scaleRatio: titleBlockData.scaleRatio || '1:50 METRIC',
          status: titleBlockData.status || 'ISSUED FOR DESIGN REVIEW · NOT FOR CONSTRUCTION',
        };

        this.drawArchitecturalTitleBlock(ctx, exportWidth, exportHeight, titleData, blueprintMode);
      }

      // 5. Export to Blob and DataURL
      const dataUrl = compositeCanvas.toDataURL(format, quality);
      const blob = await new Promise<Blob>((resolve, reject) => {
        compositeCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
          format,
          quality
        );
      });

      return {
        dataUrl,
        blob,
        width: exportWidth,
        height: exportHeight,
        filesizeBytes: blob.size,
        filename,
      };
    } finally {
      // Restore renderer state
      this.scene.background = originalBackground;
      this.renderer.toneMapping = originalToneMapping;
      this.renderer.setPixelRatio(originalPixelRatio);
      this.renderer.setSize(originalSize.x, originalSize.y, false);
      this.camera.aspect = originalAspect;
      this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Applies CAD blueprint monochromatic cyan color grading pass.
   */
  private applyBlueprintMonochromePass(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ): void {
    ctx.save();
    // Semi-transparent blueprint deep cyan tint wash
    ctx.globalCompositeOperation = 'color';
    ctx.fillStyle = '#0284C7';
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(14, 165, 233, 0.2)';
    ctx.fillRect(0, 0, w, h);

    // Drafting grid lines
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1.0;
    const gridStep = Math.max(32, Math.round(w / 40));

    ctx.beginPath();
    for (let x = 0; x < w; x += gridStep) {
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
    }
    for (let y = 0; y < h; y += gridStep) {
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draws authentic engineering DIN EN ISO 7200 / ANSI Title Block Stamp in bottom right corner.
   */
  private drawArchitecturalTitleBlock(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    d: TitleBlockData,
    isBlueprint: boolean
  ): void {
    ctx.save();

    const scale = Math.max(1.0, w / 1920);
    const blockWidth = 460 * scale;
    const blockHeight = 160 * scale;
    const margin = 28 * scale;

    const bx = w - margin - blockWidth;
    const by = h - margin - blockHeight;

    const bg = isBlueprint ? 'rgba(8, 23, 38, 0.94)' : 'rgba(10, 10, 10, 0.92)';
    const border = isBlueprint ? '#38BDF8' : '#C9A97E';
    const textPrimary = isBlueprint ? '#E0F2FE' : '#F3EFE8';
    const textMuted = isBlueprint ? 'rgba(224, 242, 254, 0.55)' : 'rgba(243, 239, 232, 0.55)';
    const hairline = isBlueprint ? 'rgba(56, 189, 248, 0.35)' : 'rgba(201, 169, 126, 0.35)';

    // Title Block Container Background & Border
    ctx.fillStyle = bg;
    ctx.fillRect(bx, by, blockWidth, blockHeight);
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.5 * scale;
    ctx.strokeRect(bx, by, blockWidth, blockHeight);

    // Internal Grid Dividers
    ctx.strokeStyle = hairline;
    ctx.lineWidth = 1.0 * scale;

    // Row lines
    const r1 = by + 46 * scale;
    const r2 = by + 92 * scale;
    const r3 = by + 126 * scale;

    ctx.beginPath();
    ctx.moveTo(bx, r1); ctx.lineTo(bx + blockWidth, r1);
    ctx.moveTo(bx, r2); ctx.lineTo(bx + blockWidth, r2);
    ctx.moveTo(bx, r3); ctx.lineTo(bx + blockWidth, r3);

    // Column dividers
    const c1 = bx + 310 * scale;
    const c2 = bx + 220 * scale;

    ctx.moveTo(c1, by); ctx.lineTo(c1, r3);
    ctx.moveTo(c2, r2); ctx.lineTo(c2, r3);
    ctx.stroke();

    // ----------------------------------------------------
    // CELL 1: Project Name & Location (Top Left)
    // ----------------------------------------------------
    ctx.font = `bold ${12 * scale}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = textPrimary;
    ctx.textAlign = 'left';
    ctx.fillText(d.projectName, bx + 12 * scale, by + 18 * scale);

    ctx.font = `${9.5 * scale}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = border;
    ctx.fillText(d.subTitle, bx + 12 * scale, by + 31 * scale);

    ctx.font = `${8.5 * scale}px ui-monospace, SFMono-Regular, monospace`;
    ctx.fillStyle = textMuted;
    ctx.fillText(`${d.location} · ${d.gpsCoordinates}`, bx + 12 * scale, by + 42 * scale);

    // ----------------------------------------------------
    // CELL 2: Architectural POV & Specifications (Mid Left)
    // ----------------------------------------------------
    ctx.font = `bold ${10 * scale}px ui-monospace, SFMono-Regular, monospace`;
    ctx.fillStyle = textPrimary;
    ctx.fillText(d.activePOV, bx + 12 * scale, r1 + 16 * scale);

    ctx.font = `${8.5 * scale}px ui-monospace, SFMono-Regular, monospace`;
    ctx.fillStyle = textMuted;
    ctx.fillText(`SPAN: ${d.roomSpan}`, bx + 12 * scale, r1 + 29 * scale);
    ctx.fillText(`OPTICS: ${d.focalLength} · LIGHT: ${d.lightingPreset}`, bx + 12 * scale, r1 + 41 * scale);

    // ----------------------------------------------------
    // CELL 3: Scale & Elevation Datum (Bottom Left)
    // ----------------------------------------------------
    ctx.font = `${8.5 * scale}px ui-monospace, SFMono-Regular, monospace`;
    ctx.fillStyle = textMuted;
    ctx.fillText(`SCALE: ${d.scaleRatio}`, bx + 12 * scale, r2 + 15 * scale);
    ctx.fillText(`ELEV: ${d.datumElevation}`, bx + 12 * scale, r2 + 28 * scale);

    ctx.fillText(`DATE: ${d.date.slice(0, 10)}`, c2 + 10 * scale, r2 + 15 * scale);
    ctx.fillText(d.status.slice(0, 18), c2 + 10 * scale, r2 + 28 * scale);

    // ----------------------------------------------------
    // CELL 4: Sheet Number & North Arrow (Right Box)
    // ----------------------------------------------------
    ctx.font = `bold ${16 * scale}px ui-monospace, SFMono-Regular, monospace`;
    ctx.fillStyle = border;
    ctx.textAlign = 'center';
    ctx.fillText(d.sheetNumber, c1 + (blockWidth - (c1 - bx)) * 0.5, by + 26 * scale);

    ctx.font = `${9 * scale}px ui-monospace, SFMono-Regular, monospace`;
    ctx.fillStyle = textMuted;
    ctx.fillText(d.revision, c1 + (blockWidth - (c1 - bx)) * 0.5, by + 40 * scale);

    // Vector North Arrow Graphic
    const naX = c1 + (blockWidth - (c1 - bx)) * 0.5;
    const naY = r1 + 24 * scale;
    const naR = 14 * scale;

    ctx.beginPath();
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.0 * scale;
    ctx.arc(naX, naY, naR, 0, Math.PI * 2);
    ctx.stroke();

    // North Pointer Arrow
    ctx.beginPath();
    ctx.fillStyle = border;
    ctx.moveTo(naX, naY - naR + 2 * scale);
    ctx.lineTo(naX + 4 * scale, naY + naR - 4 * scale);
    ctx.lineTo(naX, naY + 2 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = textPrimary;
    ctx.moveTo(naX, naY - naR + 2 * scale);
    ctx.lineTo(naX - 4 * scale, naY + naR - 4 * scale);
    ctx.lineTo(naX, naY + 2 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.font = `bold ${8 * scale}px ui-monospace, monospace`;
    ctx.fillStyle = border;
    ctx.fillText('N', naX, naY - naR - 3 * scale);

    // ----------------------------------------------------
    // BOTTOM CELL: Metric Scale Bar Graphic (0 - 1m - 2m - 5m)
    // ----------------------------------------------------
    ctx.textAlign = 'left';
    ctx.font = `${7.5 * scale}px ui-monospace, SFMono-Regular, monospace`;
    ctx.fillStyle = textMuted;
    ctx.fillText('METRIC GRAPHIC SCALE', bx + 12 * scale, r3 + 12 * scale);

    const barX = bx + 130 * scale;
    const barY = r3 + 7 * scale;
    const barH = 5 * scale;
    const segW = 32 * scale;

    // Segment 1 (Solid)
    ctx.fillStyle = border;
    ctx.fillRect(barX, barY, segW, barH);
    // Segment 2 (Outline)
    ctx.strokeStyle = border;
    ctx.strokeRect(barX + segW, barY, segW, barH);
    // Segment 3 (Solid)
    ctx.fillRect(barX + segW * 2, barY, segW, barH);

    ctx.fillStyle = textMuted;
    ctx.fillText('0', barX - 2, barY + barH + 9 * scale);
    ctx.fillText('1M', barX + segW - 6 * scale, barY + barH + 9 * scale);
    ctx.fillText('2M', barX + segW * 2 - 6 * scale, barY + barH + 9 * scale);
    ctx.fillText('5M', barX + segW * 3 - 6 * scale, barY + barH + 9 * scale);

    ctx.restore();
  }

  /**
   * Programmatic download helper.
   */
  public async downloadSnapshot(
    options: ScreenshotExportOptions = {},
    telemetry: TelemetrySnapshot
  ): Promise<ScreenshotExportResult> {
    const result = await this.exportSnapshot(options, telemetry);
    if (typeof document === 'undefined') return result;

    const link = document.createElement('a');
    link.href = result.dataUrl;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Subtle acoustic trigger
    try {
      soundEngine.pin();
    } catch {}

    return result;
  }
}

// ============================================================================
// 07. UNIFIED CINEMATIC HUD ORCHESTRATOR
// ============================================================================

export class CinematicHUD {
  private canvasHost: HTMLElement;
  private canvas: HTMLCanvasElement;
  private viewfinder: HUDViewfinderCanvas;
  private audioAnalyzer: HUDAudioSpectrumAnalyzer;
  private blueprintExporter: HUDBlueprintExporter;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private architecturalPOVs: ArchitecturalPOVTelemetry[];
  private gpsCoordinates: string;
  private datumElevation: string;

  private density: HUDDensityMode = 'standard';
  private visible = true;
  private lightingPreset: TimeOfDayPreset = 'morning';
  private interactionMode: 'story' | 'scene' | 'orbit' | 'inspect' = 'story';
  private splineProgress = 0;

  // Telemetry rolling window
  private frameCount = 0;
  private fpsBuffer: number[] = [];
  private rollingFps = 60.0;
  private frameVariance = 0.5;


  // DOM sync element cache
  private domHudElement: HTMLElement | null = null;
  private domCoordsEl: HTMLElement | null = null;
  private domActivePovEl: HTMLElement | null = null;
  private domSpanEl: HTMLElement | null = null;
  private domFpsEl: HTMLElement | null = null;
  private domAzimuthEl: HTMLElement | null = null;
  private domCompassNeedleEl: HTMLElement | null = null;

  private abortController = new AbortController();

  constructor(options: CinematicHUDOptions = {}) {
    const {
      canvasHost = typeof document !== 'undefined' ? document.body : ({} as HTMLElement),
      scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(48, 16 / 9, 0.1, 100),
      renderer = new THREE.WebGLRenderer(),
      density = 'standard',
      theme = DEFAULT_HUD_THEME,
      gpsCoordinates = '26.4678° N · 87.2767° E',
      datumElevation = '+72.4M MSL',
      architecturalPOVs = CANONICAL_SHOWROOM_POVS,
      signal,
    } = options;

    this.canvasHost = canvasHost;
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.density = density;
    this.gpsCoordinates = gpsCoordinates;
    this.datumElevation = datumElevation;
    this.architecturalPOVs = architecturalPOVs;

    if (signal) {
      signal.addEventListener('abort', () => this.dispose());
    }

    const mergedTheme: HUDColorTheme = { ...DEFAULT_HUD_THEME, ...theme };

    // Create high-DPI transparent overlay canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'showroom-hud-canvas';
    this.canvas.style.position = 'absolute';
    this.canvas.style.inset = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '19';

    if (this.canvasHost.appendChild) {
      this.canvasHost.appendChild(this.canvas);
    }

    this.viewfinder = new HUDViewfinderCanvas(this.canvas, mergedTheme);
    this.viewfinder.setDensity(this.density);

    this.audioAnalyzer = new HUDAudioSpectrumAnalyzer(64);

    this.blueprintExporter = new HUDBlueprintExporter(
      this.renderer,
      this.scene,
      this.camera,
      this.gpsCoordinates,
      this.datumElevation
    );

    this.initDOMCache();
    this.initEventListeners();
    this.resize();
  }

  private initDOMCache(): void {
    if (typeof document === 'undefined') return;

    this.domHudElement = document.querySelector<HTMLElement>('[data-showroom-hud]');
    this.domCoordsEl = document.querySelector<HTMLElement>('[data-hud-coords]');
    this.domActivePovEl = document.querySelector<HTMLElement>('[data-hud-active-pov]');
    this.domSpanEl = document.querySelector<HTMLElement>('[data-hud-span]');
    this.domFpsEl = document.querySelector<HTMLElement>('[data-hud-fps]');
    this.domAzimuthEl = document.querySelector<HTMLElement>('[data-hud-azimuth]');
    this.domCompassNeedleEl = document.querySelector<HTMLElement>('[data-hud-compass-needle]');
  }

  private initEventListeners(): void {
    if (typeof window === 'undefined') return;
    const { signal } = this.abortController;

    // Pointer move listener for reticle parallax
    const onPointerMove = (e: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.viewfinder.updateReticlePointer(x, y, true);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true, signal });

    // Keyboard controls for architectural HUD inspection
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in form inputs
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;

      // H: Toggle HUD overlay visibility
      if (e.key === 'h' || e.key === 'H') {
        this.toggleVisibility();
      }

      // M: Cycle HUD density (minimal -> standard -> technical -> blueprint)
      if (e.key === 'm' || e.key === 'M') {
        this.cycleDensity();
      }

      // B: Toggle CAD Blueprint mode
      if (e.key === 'b' || e.key === 'B') {
        this.setDensity(this.density === 'blueprint' ? 'standard' : 'blueprint');
      }

      // P: Capture 2x Snapshot
      if ((e.key === 'p' || e.key === 'P') && !e.shiftKey) {
        e.preventDefault();
        this.captureSnapshot({ supersample: 2, blueprintMode: this.density === 'blueprint' });
      }

      // Shift+P: Capture 4K Blueprint Sheet
      if ((e.key === 'p' || e.key === 'P') && e.shiftKey) {
        e.preventDefault();
        this.captureSnapshot({
          supersample: 4,
          blueprintMode: true,
          filename: `RUBICONIUS_CAD_BLUEPRINT_${Date.now()}.png`,
        });
      }
    };

    window.addEventListener('keydown', onKeyDown, { signal });

    // Window resize
    window.addEventListener('resize', () => this.resize(), { passive: true, signal });

    // Time of day lighting sync
    window.addEventListener(
      'studio:lighting',
      (e) => {
        const detail = (e as CustomEvent<{ preset?: TimeOfDayPreset }>).detail;
        if (detail?.preset) {
          this.lightingPreset = detail.preset;
        }
      },
      { signal }
    );
  }

  public resize(
    width = this.canvasHost.clientWidth || window.innerWidth,
    height = this.canvasHost.clientHeight || window.innerHeight,
    dpr = window.devicePixelRatio || 1
  ): void {
    if (width <= 0 || height <= 0) return;
    this.viewfinder.resize(width, height, dpr);
  }

  public setDensity(density: HUDDensityMode): void {
    this.density = density;
    this.viewfinder.setDensity(density);
    if (this.domHudElement) {
      this.domHudElement.setAttribute('data-hud-density', density);
    }
  }

  public cycleDensity(): HUDDensityMode {
    const modes: HUDDensityMode[] = ['minimal', 'standard', 'technical', 'blueprint'];
    const nextIdx = (modes.indexOf(this.density) + 1) % modes.length;
    this.setDensity(modes[nextIdx]);
    return this.density;
  }

  public toggleVisibility(): boolean {
    this.visible = !this.visible;
    this.canvas.style.display = this.visible ? 'block' : 'none';
    if (this.domHudElement) {
      this.domHudElement.style.display = this.visible ? 'block' : 'none';
    }
    return this.visible;
  }

  public setVisibility(visible: boolean): void {
    this.visible = visible;
    this.canvas.style.display = visible ? 'block' : 'none';
    if (this.domHudElement) {
      this.domHudElement.style.display = visible ? 'block' : 'none';
    }
  }

  public setTimeOfDay(preset: TimeOfDayPreset): void {
    this.lightingPreset = preset;
  }

  public setInteractionMode(mode: 'story' | 'scene' | 'orbit' | 'inspect'): void {
    this.interactionMode = mode;
  }

  public setSplineProgress(u: number): void {
    this.splineProgress = THREE.MathUtils.clamp(u, 0, 1);
  }

  /**
   * Evaluates active architectural POV by comparing camera position with POVs.
   */
  private resolveActivePOV(): { pov: ArchitecturalPOVTelemetry | null; proximity: number } {
    if (!this.architecturalPOVs || this.architecturalPOVs.length === 0) {
      return { pov: null, proximity: 0 };
    }

    // Match by spline progress u or spatial proximity
    let bestPov: ArchitecturalPOVTelemetry | null = null;
    let minDistance = Infinity;

    for (const pov of this.architecturalPOVs) {
      const uDist = Math.abs(this.splineProgress - pov.u);
      if (uDist < minDistance) {
        minDistance = uDist;
        bestPov = pov;
      }
    }

    const proximity = Math.max(0, 1.0 - minDistance * 4.0);
    return { pov: bestPov, proximity };
  }

  /**
   * Compiles instantaneous telemetry snapshot.
   */
  public getTelemetry(dt: number): TelemetrySnapshot {
    const frameDeltaMs = dt > 0 ? dt * 1000 : 16.67;
    const instantFps = frameDeltaMs > 0 ? 1000 / frameDeltaMs : 60;

    // Rolling 60-frame buffer
    this.fpsBuffer.push(instantFps);
    if (this.fpsBuffer.length > 60) this.fpsBuffer.shift();

    const sum = this.fpsBuffer.reduce((a, b) => a + b, 0);
    this.rollingFps = sum / this.fpsBuffer.length;

    // Variance calculation
    const variance =
      this.fpsBuffer.reduce((a, b) => a + Math.pow(b - this.rollingFps, 2), 0) /
      this.fpsBuffer.length;
    this.frameVariance = Math.sqrt(variance);

    // Orientation
    const orient = extractCameraOrientation(this.camera);

    // Optical metrics
    const fov = this.camera.fov;
    const focalLengthMm = calculate35mmFocalLength(fov);
    const aspect = this.camera.aspect;

    // Solar metrics
    const sun = calculateSunPosition(this.lightingPreset, this.splineProgress);

    // GPU metrics
    const renderInfo = this.renderer.info.render;
    const memoryInfo = this.renderer.info.memory;
    const programsCount = this.renderer.info.programs?.length ?? 0;

    // Active POV
    const { pov, proximity } = this.resolveActivePOV();

    // Look Target
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const target = new THREE.Vector3().copy(this.camera.position).addScaledVector(forward, 5.0);

    return {
      fps: Math.round(instantFps),
      fpsSmoothed: this.rollingFps,
      frameDeltaMs,
      frameVarianceMs: this.frameVariance,
      drawCalls: renderInfo.calls,
      triangles: renderInfo.triangles,
      geometries: memoryInfo.geometries,
      textures: memoryInfo.textures,
      shaderPrograms: programsCount,
      cameraPosition: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z,
      },
      cameraTarget: {
        x: target.x,
        y: target.y,
        z: target.z,
      },
      cameraRotationDeg: {
        pitch: orient.pitchDeg,
        yaw: orient.headingDeg,
        roll: orient.rollDeg,
      },
      fov,
      focalLengthMm,
      aspectRatio: aspect,
      sunAltitudeDeg: sun.altitudeDeg,
      sunAzimuthDeg: sun.azimuthDeg,
      solarKelvin: sun.kelvin,
      lightingPreset: this.lightingPreset,
      activePOV: pov,
      povProximity: proximity,
      splineProgress: this.splineProgress,
      interactionMode: this.interactionMode,
      audioPeakRms: this.audioAnalyzer.getRms(),
      audioActive: this.audioAnalyzer.isLive(),
      timestamp: new Date().toISOString(),
      gpsCoordinates: this.gpsCoordinates,
      datumElevation: this.datumElevation,
    };
  }

  /**
   * Synchronizes telemetry with DOM tags for hybrid DOM/Canvas accessibility.
   */
  private syncDOMTelemetry(telemetry: TelemetrySnapshot): void {
    if (this.domCoordsEl) {
      this.domCoordsEl.textContent = `${telemetry.gpsCoordinates} · ${telemetry.datumElevation}`;
    }

    if (this.domActivePovEl && telemetry.activePOV) {
      this.domActivePovEl.textContent = `POV ${telemetry.activePOV.index} · ${telemetry.activePOV.label.toUpperCase()}`;
    }

    if (this.domSpanEl && telemetry.activePOV) {
      this.domSpanEl.textContent = `· ${telemetry.activePOV.span}`;
    }

    if (this.domFpsEl) {
      this.domFpsEl.textContent = `· ${Math.round(telemetry.fpsSmoothed)} FPS`;
    }

    if (this.domAzimuthEl) {
      const az = Math.round(telemetry.cameraRotationDeg.yaw).toString().padStart(3, '0');
      this.domAzimuthEl.textContent = `AZ ${az}°`;
    }

    if (this.domCompassNeedleEl) {
      this.domCompassNeedleEl.style.transform = `rotate(${telemetry.cameraRotationDeg.yaw}deg)`;
    }
  }

  /**
   * Primary frame update call - invokes in RAF or GSAP ticker.
   */
  public update(dt: number): void {
    if (!this.visible && prefersReducedMotion()) return;

    this.frameCount++;

    // 1. Update audio FFT spectrum
    this.audioAnalyzer.update(dt);

    // 2. Compute telemetry
    const telemetry = this.getTelemetry(dt);

    // 3. Render 2D Viewfinder overlay
    this.viewfinder.render(dt, telemetry, this.audioAnalyzer, this.visible);

    // 4. Synchronize DOM elements (throttled to every 3 frames for zero reflow overhead)
    if (this.frameCount % 3 === 0) {
      this.syncDOMTelemetry(telemetry);
    }
  }

  /**
   * Captures snapshot via Blueprint Exporter.
   */
  public async captureSnapshot(options: ScreenshotExportOptions = {}): Promise<ScreenshotExportResult> {
    const telemetry = this.getTelemetry(0.016);
    return this.blueprintExporter.downloadSnapshot(options, telemetry);
  }

  /**
   * Disposes all canvas elements, audio nodes, and event listeners.
   */
  public dispose(): void {
    this.abortController.abort();
    this.audioAnalyzer.dispose();

    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}

// ============================================================================
// 08. FACTORY FUNCTION & CONVENIENCE API
// ============================================================================

export function createCinematicHUD(options: CinematicHUDOptions = {}): CinematicHUD {
  return new CinematicHUD(options);
}
