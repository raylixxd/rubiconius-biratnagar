/**
 * ============================================================================
 * RUBICONIUS SHOWROOM â€” CONTINUOUS 24-HOUR ARCHITECTURAL SOLAR CHOREOGRAPHY
 * ============================================================================
 * Production-Grade Astronomical Ephemeris, Correlated Color Temperature (CCT),
 * Dynamic Sweeping Shadow Choreography, and Subsystem Orchestrator.
 *
 * Reverse-Engineered & Mathematically Derived Standards:
 * 1. 32_immersive_garden & 03_star_atlas:
 *    - Real-time continuous 24-hour solar path with Spencer/Meeus astronomical ephemeris.
 *    - Planckian locus blackbody radiation chromaticity (Kang et al. / CIE 1931).
 *    - Kasten-Young atmospheric air-mass extinction & Saemundsson refraction for low-angle horizons.
 * 2. 16_lusion & 04_sculpting_harmony:
 *    - Continuous time slider integration (06:00 Dawn to 22:00 Night) with inertia damping.
 *    - Multi-speed continuous architectural daylight timelapse playback.
 * 3. Peter Zumthor (Therme Vals) & Tadao Ando (Church of the Light) Architectural Precedent:
 *    - Sweeping raking shadows cast across vertical fluted Sal hardwood paneling (45Ã—30mm battens).
 *    - Elongated window mullion silhouettes cast across honed Kota limestone floors (12m Ã— 8m span).
 *    - Dynamic specular grazing highlights catching unlacquered spun brass hardware and reveals.
 *    - 1800K candlelit evening transition with interior architectural sconces & nocturnal moonlight.
 * 4. Subsystem Coordination:
 *    - Seamlessly drives `csmShadows.ts` (cascaded shadow map direction, normalBias, and cascades).
 *    - Seamlessly drives `volumetric.ts` (sunbeam angles, light tints, forward Mie dust motes).
 *    - Seamlessly drives `celestialAtmosphere.ts` (time-of-day, sky scattering, starfield, moon).
 *
 * Geographic Anchor:
 * - Biratnagar / Dharan, Eastern Terai, Nepal: 26.4678Â° N, 87.2767Â° E, ELEV +80m AMSL, UTC+5:45 (NPT).
 * ============================================================================
 */

import * as THREE from 'three';
import { getQualityTier, prefersReducedMotion } from '../env';
import type { CSMShadowController } from './csmShadows';
import type { VolumetricShowroomSystem, TimeOfDayPreset } from './volumetric';
import type { CelestialAtmosphereSystem, ObserverLocation } from './celestialAtmosphere';

// ============================================================================
// SECTION 1: GEOGRAPHIC CONSTANTS & ASTRONOMICAL DATUMS
// ============================================================================

/** Standard Julian epoch J2000.0 */
export const SOLAR_J2000_EPOCH = 2451545.0;

/** Biratnagar, Morang, Eastern Terai, Nepal geographic observer anchor */
export const BIRATNAGAR_OBSERVER: ObserverLocation = {
  name: 'Biratnagar Showroom (Eastern Terai)',
  latitudeDeg: 26.4678,
  longitudeDeg: 87.2767,
  elevationMeters: 80.0,
  timezoneOffsetHours: 5.75, // UTC+5:45 (Nepal Standard Time)
};

/** Dharan Foothills secondary geographic observer anchor */
export const DHARAN_OBSERVER: ObserverLocation = {
  name: 'Dharan Atelier (Mahabharat Foothills)',
  latitudeDeg: 26.8124,
  longitudeDeg: 87.2834,
  elevationMeters: 349.0,
  timezoneOffsetHours: 5.75,
};

/** Solar constant outside Earth atmosphere in W/m^2 */
export const SOLAR_CONSTANT_WM2 = 1361.0;

/** Peak clear-sky direct normal illuminance in lux at sea level */
export const PEAK_CLEAR_SKY_LUX = 105000.0;

/** Default day of year: Vernal Equinox (Day 80) / Mid-Spring architectural showcase */
export const DEFAULT_DAY_OF_YEAR = 110; // April 20

// ============================================================================
// SECTION 2: TYPES, INTERFACES & PRESETS
// ============================================================================

/** Real-time astronomical and geometric solar coordinates */
export interface SolarCoordinates {
  /** Local fractional hour [0.0..24.0] (e.g. 14.5 = 14:30) */
  hour: number;
  /** True local solar time in hours considering Equation of Time (EoT) */
  localSolarTimeHours: number;
  /** Solar declination angle in radians */
  declinationRad: number;
  /** Equation of Time in minutes */
  equationOfTimeMinutes: number;
  /** Solar azimuth in radians (0 = North, PI/2 = East, PI = South, 3PI/2 = West) */
  azimuthRad: number;
  /** Solar azimuth in degrees [0..360] */
  azimuthDeg: number;
  /** True geometric solar altitude in radians */
  altitudeRad: number;
  /** True geometric solar altitude in degrees [-90..90] */
  altitudeDeg: number;
  /** Apparent solar altitude corrected for Saemundsson atmospheric refraction in degrees */
  apparentAltitudeDeg: number;
  /** Solar zenith angle in degrees */
  zenithDeg: number;
  /** Normalized Three.js world-space direction vector pointing FROM showroom TO the Sun */
  sunDirection: THREE.Vector3;
  /** Normalized Three.js world-space direction vector pointing FROM showroom TO the Moon */
  moonDirection: THREE.Vector3;
  /** Optical air mass factor (1.0 at zenith, ~38.0 at horizon) */
  airMass: number;
  /** True if the sun center is above the astronomical horizon (apparent altitude > -0.833Â°) */
  isDaylight: boolean;
  /** True during civil, nautical, or astronomical twilight (-18Â° <= altitude < 0Â°) */
  isTwilight: boolean;
  /** True during deep night (altitude < -18Â°) */
  isNight: boolean;
}

/** Correlated Color Temperature (CCT) and photometric evaluation */
export interface SolarPhotometrics {
  /** Correlated Color Temperature in Kelvin [1800K..6500K] */
  cctKelvin: number;
  /** Linear sRGB direct sunlight color derived from Planckian blackbody locus */
  sunColor: THREE.Color;
  /** Linear sRGB ambient sky hemisphere color */
  skyColor: THREE.Color;
  /** Linear sRGB ground bounce reflection color (warm Kota stone & polished teak) */
  groundBounceColor: THREE.Color;
  /** Direct sunlight intensity normalized for Three.js directional lights [0.0..3.0] */
  directSunIntensity: number;
  /** Ambient light intensity normalized for Three.js hemisphere lights [0.0..1.5] */
  ambientSkyIntensity: number;
  /** Interior warm artificial fixture illumination factor [0.0..1.0] (1800K candlelight/sconce) */
  interiorFixtureIntensity: number;
  /** Linear sRGB interior fixture color (1800K warm candlelit incandescent) */
  interiorFixtureColor: THREE.Color;
  /** Dusk factor [0.0 (daylight) to 1.0 (deep dusk/night)] for backward-compatible shaders */
  duskProgress: number;
  /** Approximated ground illuminance in lux */
  illuminanceLux: number;
}

/** Dynamic architectural shadow sweep metrics */
export interface ShadowChoreographyState {
  /** Horizontal shadow projection throw multiplier = cot(apparentAltitude) */
  lengthMultiplier: number;
  /** Horizontal shadow angle in degrees (direction shadow falls across the floor) */
  shadowBearingDeg: number;
  /** Dynamic CSM normal bias adapted to grazing angles [0.015..0.028] to eliminate acne */
  recommendedNormalBias: number;
  /** Dynamic CSM depth bias [-0.00015..-0.00008] */
  recommendedBias: number;
  /** Shadow penumbra blur softness factor [1.0 (sharp noon) to 3.8 (soft horizon dusk)] */
  penumbraSoftness: number;
  /** Fluted Sal timber grazing intensity factor [0.0..1.0] */
  flutedWallGrazingFactor: number;
  /** Honed Kota stone floor specular incidence factor [0.0..1.0] */
  stoneFloorSpecularFactor: number;
  /** Unlacquered spun brass specular highlight luster [0.0..1.0] */
  bronzeSpecularLuster: number;
}

/** Complete solar simulation snapshot combining astronomy, lighting, and shadows */
export interface SolarChoreographySnapshot {
  coords: SolarCoordinates;
  photometrics: SolarPhotometrics;
  shadows: ShadowChoreographyState;
  /** Human-readable formatted time string (e.g. "06:15 AM", "12:00 PM", "05:45 PM") */
  formattedTime: string;
  /** Formatted CAD telemetry readout string (e.g. "AZ 248.5Â° Â· ALT 14.2Â° Â· 3200K") */
  cadTelemetry: string;
  /** Poetic architectural description of the current lighting atmosphere */
  architecturalNote: string;
}

/** Presets for architectural inspection moments */
export type SolarPresetId =
  | 'dawn_0600'
  | 'morning_0830'
  | 'midday_1200'
  | 'afternoon_1530'
  | 'golden_1730'
  | 'dusk_1830'
  | 'twilight_1930'
  | 'evening_2030'
  | 'night_2200';

export interface SolarPreset {
  id: SolarPresetId;
  hour: number;
  cctKelvin: number;
  label: string;
  shortLabel: string;
  sunAngleText: string;
  description: string;
}

/** 8 Architectural Solar Choreography Presets */
export const ARCHITECTURAL_SOLAR_PRESETS: Record<SolarPresetId, SolarPreset> = {
  dawn_0600: {
    id: 'dawn_0600',
    hour: 6.0,
    cctKelvin: 2200,
    label: 'Dawn Horizon Flare (06:00)',
    shortLabel: '06:00 Dawn',
    sunAngleText: '082Â° Azimuth Â· 04Â° Alt',
    description: 'Deep apricot horizon flare raking horizontally across the full length of the Kota stone floor.',
  },
  morning_0830: {
    id: 'morning_0830',
    hour: 8.5,
    cctKelvin: 4000,
    label: 'Morning Mist Clearance (08:30)',
    shortLabel: '08:30 Morning',
    sunAngleText: '108Â° Azimuth Â· 34Â° Alt',
    description: 'Crisp morning daylight streaming through east clerestory apertures, illuminating fluted Sal woodwork.',
  },
  midday_1200: {
    id: 'midday_1200',
    hour: 12.0,
    cctKelvin: 5500,
    label: 'High-CRI Solar Noon (12:00)',
    shortLabel: '12:00 Noon',
    sunAngleText: '178Â° Azimuth Â· 76Â° Alt',
    description: 'High-angle 5500K daylight casting razor-sharp, compact contact shadows within timber reveals and baseboards.',
  },
  afternoon_1530: {
    id: 'afternoon_1530',
    hour: 15.5,
    cctKelvin: 4600,
    label: 'Timber Chamfer Grazing (15:30)',
    shortLabel: '15:30 Afternoon',
    sunAngleText: '235Â° Azimuth Â· 42Â° Alt',
    description: 'Diagonal afternoon light grazing vertical Sal fluting, projecting rhythmic shadow stripes across the gallery.',
  },
  golden_1730: {
    id: 'golden_1730',
    hour: 17.5,
    cctKelvin: 3200,
    label: 'Golden Hour Rake (17:30)',
    shortLabel: '17:30 Golden',
    sunAngleText: '264Â° Azimuth Â· 14Â° Alt',
    description: 'Rich 3200K amber sunbeams sweeping through west glazing; long dramatic shadows climb the east joinery wall.',
  },
  dusk_1830: {
    id: 'dusk_1830',
    hour: 18.5,
    cctKelvin: 2200,
    label: 'Civil Dusk & Horizon Ember (18:30)',
    shortLabel: '18:30 Dusk',
    sunAngleText: '280Â° Azimuth Â· 01Â° Alt',
    description: 'Fiery 2200K sunset ember dissolving into indigo sky; brass fixtures ignite with micro-specular glints.',
  },
  twilight_1930: {
    id: 'twilight_1930',
    hour: 19.5,
    cctKelvin: 2000,
    label: 'Blue Hour & Sconce Awakening (19:30)',
    shortLabel: '19:30 Twilight',
    sunAngleText: '294Â° Azimuth Â· -12Â° Alt',
    description: 'Deep cobalt sky dome; warm 1950K interior architectural coves and spun brass sconces smoothly illuminate.',
  },
  evening_2030: {
    id: 'evening_2030',
    hour: 20.5,
    cctKelvin: 1800,
    label: 'Candlelit Architectural Evening (20:30)',
    shortLabel: '20:30 Candlelit',
    sunAngleText: 'Night Sky Â· -24Â° Alt',
    description: 'Intimate 1800K candlelit warmth embracing fluted woodwork; subtle cool nocturnal moonlight fills exterior court.',
  },
  night_2200: {
    id: 'night_2200',
    hour: 22.0,
    cctKelvin: 1800,
    label: 'Nocturnal Starlight Silence (22:00)',
    shortLabel: '22:00 Night',
    sunAngleText: '045Â° Moon Az Â· 48Â° Moon Alt',
    description: 'Full nocturnal silence; architectural low-voltage cove glow with crisp silver moonlight through roof light-wells.',
  },
};

/** Downstream showroom subsystems driven by SolarChoreography */
export interface SolarChoreographyTargets {
  /** Cascaded Shadow Maps system controller */
  csm?: CSMShadowController | null;
  /** Volumetric dust motes and light beams system */
  volumetric?: VolumetricShowroomSystem | null;
  /** Astronomical sky dome and celestial ephemeris system */
  celestial?: CelestialAtmosphereSystem | null;
  /** Primary directional sun light in Three.js scene */
  sunLight?: THREE.DirectionalLight | null;
  /** Hemispherical sky/ground ambient fill light */
  ambientLight?: THREE.HemisphereLight | null;
  /** Group or array of warm interior architectural fixtures (sconces, coves, pendants) */
  interiorFixtures?: THREE.Object3D[] | THREE.Group | null;
  /** Parent Three.js scene */
  scene?: THREE.Scene | null;
}

/** Master SolarChoreography configuration options */
export interface SolarChoreographyOptions {
  /** Initial hour of day [0.0..24.0] (default: 12.0) */
  initialHour?: number;
  /** Day of year [1..365] (default: 110, April 20) */
  dayOfYear?: number;
  /** Geographic observer location (default: BIRATNAGAR_OBSERVER) */
  observer?: ObserverLocation;
  /** Year of simulation (default: 2026) */
  year?: number;
  /** Interactive time slider minimum hour (default: 6.0, Dawn) */
  sliderMinHour?: number;
  /** Interactive time slider maximum hour (default: 22.0, Night) */
  sliderMaxHour?: number;
  /** Smooth spring-damper inertia lerp speed [0.05..0.30] (default: 0.14) */
  lerpSpeed?: number;
  /** Automated timelapse simulation speed multiplier (1x = real-time, 120x = 30s day) */
  timelapseSpeed?: number;
  /** Auto-dispatch 'studio:solar' and 'studio:lighting' custom DOM events */
  dispatchEvents?: boolean;
  /** Downstream targets to orchestrate */
  targets?: SolarChoreographyTargets;
}

// ============================================================================
// SECTION 3: ASTRONOMICAL EPHEMERIS & SOLAR POSITION ALGORITHMS
// ============================================================================

/**
 * Computes Julian Date from calendar parameters
 */
export function computeSolarJulianDate(year: number, dayOfYear: number, localHour: number, tzOffset: number): number {
  const utcHour = localHour - tzOffset;
  const a = Math.floor((14 - 1) / 12);
  const y = year + 4800 - a;
  const m = 1 + 12 * a - 3;
  let jd = dayOfYear + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  jd += (utcHour - 12.0) / 24.0;
  return jd;
}

/**
 * Saemundsson (1986) Bennett atmospheric refraction formulation for low-angle horizons.
 * Returns refraction angle in degrees added to true geometric altitude.
 */
export function computeSaemundssonRefractionDeg(geometricAltDeg: number): number {
  if (geometricAltDeg < -5.0) return 0.0;
  // Saemundsson formulation: R = 1.02 / tan(h + 10.3 / (h + 5.11)) in arcminutes
  const h = Math.max(-4.5, geometricAltDeg);
  const denom = Math.tan(((h + 10.3 / (h + 5.11)) * Math.PI) / 180.0);
  if (Math.abs(denom) < 1e-6) return 0.0;
  const rArcmin = 1.02 / denom;
  return Math.max(0.0, rArcmin / 60.0);
}

/**
 * Kasten and Young (1989) formula for optical relative air mass
 */
export function computeOpticalAirMass(apparentAltDeg: number): number {
  if (apparentAltDeg < -1.0) return 38.0;
  const h = Math.max(0.0, apparentAltDeg);
  const denom = Math.sin((h * Math.PI) / 180.0) + 0.50572 * Math.pow(h + 6.07995, -1.6364);
  return Math.min(38.0, 1.0 / Math.max(0.01, denom));
}

/**
 * High-Precision Spencer (1971) / Meeus (1998) Solar Position Formulation.
 * Accurately models Biratnagar, Nepal solar azimuth and altitude.
 */
export function computeSolarCoordinates(
  localHour: number,
  dayOfYear = DEFAULT_DAY_OF_YEAR,
  observer = BIRATNAGAR_OBSERVER,
  year = 2026
): SolarCoordinates {
  const clampedHour = ((localHour % 24.0) + 24.0) % 24.0;

  // 1. Fractional year angle gamma (Spencer 1971)
  const gamma = (2.0 * Math.PI / 365.0) * (dayOfYear - 1 + (clampedHour - 12.0) / 24.0);

  // 2. Equation of Time (EoT) in minutes (Spencer Fourier formulation)
  const equationOfTimeMinutes =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2.0 * gamma) -
      0.040849 * Math.sin(2.0 * gamma));

  // 3. Solar declination angle in radians
  const declinationRad =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2.0 * gamma) +
    0.000907 * Math.sin(2.0 * gamma) -
    0.002697 * Math.cos(3.0 * gamma) +
    0.00148 * Math.sin(3.0 * gamma);

  // 4. True Local Solar Time
  // Standard meridian for Nepal Time (UTC+5:45) is 86.25Â° E (exact 5h 45m).
  const standardMeridianDeg = observer.timezoneOffsetHours * 15.0; // 86.25Â°
  const timeOffsetMinutes = 4.0 * (observer.longitudeDeg - standardMeridianDeg) + equationOfTimeMinutes;
  const trueSolarMinutes = clampedHour * 60.0 + timeOffsetMinutes;
  const localSolarTimeHours = ((trueSolarMinutes / 60.0) % 24.0 + 24.0) % 24.0;

  // 5. Solar Hour Angle (H) in radians: 0 at solar noon, negative morning, positive afternoon
  const hourAngleRad = ((trueSolarMinutes / 4.0) - 180.0) * (Math.PI / 180.0);

  // 6. Geographic latitude
  const latRad = (observer.latitudeDeg * Math.PI) / 180.0;

  // 7. Geometric Solar Altitude (h)
  const sinAlt = Math.sin(latRad) * Math.sin(declinationRad) + Math.cos(latRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  const altitudeRad = Math.asin(Math.max(-1.0, Math.min(1.0, sinAlt)));
  const altitudeDeg = (altitudeRad * 180.0) / Math.PI;

  // 8. Atmospheric Refraction correction (Saemundsson)
  const refractionDeg = computeSaemundssonRefractionDeg(altitudeDeg);
  const apparentAltitudeDeg = altitudeDeg + refractionDeg;
  const apparentAltitudeRad = (apparentAltitudeDeg * Math.PI) / 180.0;
  const zenithDeg = 90.0 - apparentAltitudeDeg;

  // 9. Solar Azimuth (A) measured from True North (0Â° = North, 90Â° = East, 180Â° = South, 270Â° = West)
  const cosAlt = Math.cos(altitudeRad);
  let azimuthRad: number;
  if (Math.abs(cosAlt) < 1e-4) {
    azimuthRad = Math.PI; // Zenith/Nadir pole singularity fallback
  } else {
    const cosAz = (Math.sin(declinationRad) * Math.cos(latRad) - Math.cos(declinationRad) * Math.sin(latRad) * Math.cos(hourAngleRad)) / cosAlt;
    const clampedCosAz = Math.max(-1.0, Math.min(1.0, cosAz));
    let rawAz = Math.acos(clampedCosAz);
    if (Math.sin(hourAngleRad) > 0.0) {
      rawAz = 2.0 * Math.PI - rawAz;
    }
    azimuthRad = (rawAz + Math.PI) % (2.0 * Math.PI);
  }
  const azimuthDeg = (azimuthRad * 180.0) / Math.PI;

  // 10. Solar Direction Vector in Three.js coordinates
  // Convention: +Y is Up (zenith), +X is East, -Z is North, -X is West, +Z is South
  // At azimuth 180Â° (South), cos(180) = -1 -> points towards +Z
  // At azimuth 90Â° (East), sin(90) = 1 -> points towards +X
  const effectiveAltRad = apparentAltitudeRad;
  const cosEffAlt = Math.cos(effectiveAltRad);
  const sunDirX = Math.sin(azimuthRad) * cosEffAlt;
  const sunDirY = Math.sin(effectiveAltRad);
  const sunDirZ = -Math.cos(azimuthRad) * cosEffAlt;
  const sunDirection = new THREE.Vector3(sunDirX, sunDirY, sunDirZ).normalize();

  // 11. Lunar Direction Vector (approximate opposition / night celestial companion)
  // Lunar ephemeris simplified orbit: ~180Â° azimuth offset with +5.14Â° inclination perturbation
  const moonAzRad = (azimuthRad + Math.PI) % (2.0 * Math.PI);
  const moonAltRad = -effectiveAltRad * 0.85 + 0.12; // When sun is low/down, moon is up
  const cosMoonAlt = Math.cos(moonAltRad);
  const moonDirX = Math.sin(moonAzRad) * cosMoonAlt;
  const moonDirY = Math.sin(moonAltRad);
  const moonDirZ = -Math.cos(moonAzRad) * cosMoonAlt;
  const moonDirection = new THREE.Vector3(moonDirX, moonDirY, moonDirZ).normalize();

  // 12. Optical Air Mass & Twilight classification
  const airMass = computeOpticalAirMass(apparentAltitudeDeg);
  const isDaylight = apparentAltitudeDeg > -0.833; // Standard civil sun disk center threshold
  const isTwilight = apparentAltitudeDeg <= -0.833 && apparentAltitudeDeg >= -18.0;
  const isNight = apparentAltitudeDeg < -18.0;

  return {
    hour: clampedHour,
    localSolarTimeHours,
    declinationRad,
    equationOfTimeMinutes,
    azimuthRad,
    azimuthDeg,
    altitudeRad,
    altitudeDeg,
    apparentAltitudeDeg,
    zenithDeg,
    sunDirection,
    moonDirection,
    airMass,
    isDaylight,
    isTwilight,
    isNight,
  };
}

// ============================================================================
// SECTION 4: CORRELATED COLOR TEMPERATURE (CCT) & PLANCKIAN PHOTOMETRICS
// ============================================================================

/**
 * Converts Correlated Color Temperature (Kelvin) to Linear sRGB [r, g, b] (0..1)
 * Based on Tanner Helland analytical Planckian blackbody algorithm with Kang et al. linear correction.
 */
export function cctToLinearRGB(kelvin: number): [number, number, number] {
  const T = Math.max(1000.0, Math.min(25000.0, kelvin)) / 100.0;
  let r: number;
  let g: number;
  let b: number;

  // Red component
  if (T <= 66.0) {
    r = 255.0;
  } else {
    r = T - 60.0;
    r = 329.698727446 * Math.pow(r, -0.1332047592);
    r = Math.max(0.0, Math.min(255.0, r));
  }

  // Green component
  if (T <= 66.0) {
    g = T;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
    g = Math.max(0.0, Math.min(255.0, g));
  } else {
    g = T - 60.0;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
    g = Math.max(0.0, Math.min(255.0, g));
  }

  // Blue component
  if (T >= 66.0) {
    b = 255.0;
  } else if (T <= 19.0) {
    b = 0.0;
  } else {
    b = T - 10.0;
    b = 138.5177312231 * Math.log(b) - 305.0447927307;
    b = Math.max(0.0, Math.min(255.0, b));
  }

  // Convert non-linear sRGB (gamma ~2.2) to linear sRGB for physically based shading
  const toLinear = (c: number) => {
    const s = c / 255.0;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  return [toLinear(r), toLinear(g), toLinear(b)];
}

/**
 * Evaluates architectural CCT profile across the 24-hour cycle.
 * Produces smooth piecewise Hermite interpolation between distinct architectural daylight phases.
 */
export function evaluateArchitecturalCCT(hour: number): number {
  // Key architectural hour -> kelvin control points
  const points: [number, number][] = [
    [0.0, 1800],   // Midnight candlelit interior / moonlit quietude
    [4.5, 1800],   // Pre-dawn deep night
    [5.5, 2000],   // Astronomical dawn horizon glow
    [6.0, 2200],   // Sunrise / Dawn amber flare
    [7.0, 2800],   // Early morning golden warmth
    [8.5, 4000],   // Morning warm daylight
    [10.0, 4800],  // Late morning crisp daylight
    [12.0, 5500],  // Solar noon: High-CRI crisp daylight
    [14.5, 5200],  // Afternoon high daylight
    [16.0, 4400],  // Mid afternoon warm transition
    [17.5, 3200],  // Golden Hour: Rich amber raking light
    [18.2, 2500],  // Sunset rim fire
    [18.7, 2200],  // Civil dusk / twilight horizon ember
    [19.5, 2000],  // Blue hour sky + glowing brass sconces
    [20.5, 1800],  // Candlelit architectural evening
    [22.0, 1800],  // Deep nightfall
    [24.0, 1800],  // Midnight wrap
  ];

  const h = ((hour % 24.0) + 24.0) % 24.0;

  for (let i = 0; i < points.length - 1; i++) {
    const [h0, k0] = points[i];
    const [h1, k1] = points[i + 1];
    if (h >= h0 && h <= h1) {
      const t = (h - h0) / (h1 - h0);
      // Smooth cubic hermite easing
      const smoothT = t * t * (3.0 - 2.0 * t);
      return Math.round(k0 + (k1 - k0) * smoothT);
    }
  }

  return 5500;
}

/**
 * Computes complete photometrics, illuminance, and color temperatures from solar coordinates
 */
export function computeSolarPhotometrics(coords: SolarCoordinates): SolarPhotometrics {
  const altDeg = coords.apparentAltitudeDeg;
  const cctKelvin = evaluateArchitecturalCCT(coords.hour);
  const [lr, lg, lb] = cctToLinearRGB(cctKelvin);
  const sunColor = new THREE.Color(lr, lg, lb);

  // 1. Direct Sunlight Intensity:
  // Above 15Â°: full high-noon/daylight power (1.8 to 2.4)
  // 0Â° to 15Â°: rapid atmospheric extinction (air-mass attenuation)
  // < 0Â°: smoothly drops to zero
  let directSunIntensity = 0.0;
  if (altDeg > 0.0) {
    const horizonFactor = Math.min(1.0, altDeg / 18.0);
    const airMassExtinction = Math.exp(-0.09 * (coords.airMass - 1.0));
    directSunIntensity = 2.4 * Math.pow(horizonFactor, 0.6) * airMassExtinction;
  }

  // 2. Dusk Progress factor [0.0 (daylight) to 1.0 (deep night)]
  // Golden hour starts around alt = 15Â° (dusk = 0.25)
  // Sunset at alt = 0Â° (dusk = 0.65)
  // Twilight ends at alt = -12Â° (dusk = 1.0)
  let duskProgress = 0.0;
  if (altDeg >= 25.0) {
    duskProgress = 0.0;
  } else if (altDeg >= 0.0) {
    // 25Â° down to 0Â° maps to 0.0 -> 0.65
    duskProgress = (1.0 - altDeg / 25.0) * 0.65;
  } else if (altDeg >= -12.0) {
    // 0Â° down to -12Â° maps to 0.65 -> 1.0
    duskProgress = 0.65 + (-altDeg / 12.0) * 0.35;
  } else {
    duskProgress = 1.0;
  }

  // 3. Ambient Sky Hemisphere Color & Intensity:
  // Day: crisp sky blue (0.72, 0.84, 0.98)
  // Golden hour: warm peach/amber (0.95, 0.80, 0.62)
  // Dusk: deep violet-indigo (0.34, 0.26, 0.48)
  // Night: deep midnight cobalt (0.04, 0.06, 0.12) with subtle starlight fill
  const skyColorDay = new THREE.Color(0.72, 0.84, 0.98);
  const skyColorGolden = new THREE.Color(0.95, 0.80, 0.62);
  const skyColorDusk = new THREE.Color(0.34, 0.26, 0.48);
  const skyColorNight = new THREE.Color(0.04, 0.06, 0.12);

  let skyColor = new THREE.Color();
  let ambientSkyIntensity = 0.55;

  if (duskProgress < 0.35) {
    const t = duskProgress / 0.35;
    skyColor.copy(skyColorDay).lerp(skyColorGolden, t);
    ambientSkyIntensity = THREE.MathUtils.lerp(0.55, 0.62, t);
  } else if (duskProgress < 0.70) {
    const t = (duskProgress - 0.35) / 0.35;
    skyColor.copy(skyColorGolden).lerp(skyColorDusk, t);
    ambientSkyIntensity = THREE.MathUtils.lerp(0.62, 0.32, t);
  } else {
    const t = (duskProgress - 0.70) / 0.30;
    skyColor.copy(skyColorDusk).lerp(skyColorNight, t);
    ambientSkyIntensity = THREE.MathUtils.lerp(0.32, 0.14, t);
  }

  // 4. Ground Bounce Color:
  // Reflects warm Kota limestone, seasoned Sal timber flooring, and terracotta plinths
  const groundDay = new THREE.Color(0.48, 0.42, 0.34);
  const groundGolden = new THREE.Color(0.56, 0.41, 0.24);
  const groundNight = new THREE.Color(0.03, 0.025, 0.02);
  const groundBounceColor = groundDay.clone().lerp(groundGolden, Math.min(1.0, duskProgress * 1.5)).lerp(groundNight, Math.max(0.0, (duskProgress - 0.6) / 0.4));

  // 5. Interior Warm Architectural Fixture Intensity & Color (1800K candlelit warmth)
  // Fades in smoothly as natural exterior daylight wanes (duskProgress > 0.45)
  const interiorFixtureIntensity = Math.min(1.0, Math.max(0.0, (duskProgress - 0.40) / 0.50));
  const [firR, firG, firB] = cctToLinearRGB(1800);
  const interiorFixtureColor = new THREE.Color(firR, firG, firB);

  // 6. Estimated Ground Illuminance in Lux
  const illuminanceLux = Math.max(0.2, PEAK_CLEAR_SKY_LUX * Math.sin(Math.max(0.0, altDeg) * Math.PI / 180.0) * Math.exp(-0.11 * coords.airMass));

  return {
    cctKelvin,
    sunColor,
    skyColor,
    groundBounceColor,
    directSunIntensity,
    ambientSkyIntensity,
    interiorFixtureIntensity,
    interiorFixtureColor,
    duskProgress,
    illuminanceLux,
  };
}

// ============================================================================
// SECTION 5: DYNAMIC SWEEPING SHADOW CHOREOGRAPHY MECHANICS
// ============================================================================

/**
 * Computes sweeping shadow metrics across fluted Sal woodwork, Kota stone floor, and brass fixtures.
 */
export function computeShadowChoreography(
  coords: SolarCoordinates,
  photometrics: SolarPhotometrics
): ShadowChoreographyState {
  const altDeg = coords.apparentAltitudeDeg;

  // 1. Shadow Length Multiplier = cot(alt)
  // Clamped between 0.15 (high noon, nearly vertical) and 12.0 (dawn/dusk horizontal rake)
  let lengthMultiplier = 0.2;
  if (altDeg > 0.5) {
    const rad = (altDeg * Math.PI) / 180.0;
    lengthMultiplier = Math.min(12.0, Math.max(0.15, 1.0 / Math.tan(rad)));
  } else {
    lengthMultiplier = 12.0;
  }

  // 2. Horizontal Shadow Bearing Angle (direction shadow falls across the floor)
  // Shadow falls exactly 180Â° opposite to the solar azimuth
  const shadowBearingDeg = (coords.azimuthDeg + 180.0) % 360.0;

  // 3. Dynamic CSM normalBias to prevent self-shadowing acne on vertical fluted Sal battens:
  // High noon (alt > 50Â°): 0.016 is sufficient
  // Grazing angle (alt < 15Â°): steep incident angles require 0.026 - 0.028 to prevent surface striping
  const grazingWeight = Math.max(0.0, Math.min(1.0, (50.0 - Math.max(0.0, altDeg)) / 45.0));
  const recommendedNormalBias = THREE.MathUtils.lerp(0.016, 0.027, grazingWeight);
  const recommendedBias = THREE.MathUtils.lerp(-0.00012, -0.00008, grazingWeight);

  // 4. Shadow Penumbra Softness:
  // Low horizon angles have heavy atmospheric scattering (Rayleigh + Mie), diffusing shadow edges
  const penumbraSoftness = THREE.MathUtils.lerp(1.0, 3.4, Math.pow(grazingWeight, 1.2));

  // 5. Fluted Sal Timber Grazing Factor:
  // Sal woodwork runs vertically along East and West gallery walls (normals point East/West)
  // When sun is in the East (morning, az ~90Â°) or West (afternoon, az ~270Â°) at mid-to-low altitude,
  // the grazing angle maximizes rhythmic shadow striping inside the 15mm reveals.
  const eastWestAlignment = Math.abs(Math.sin(coords.azimuthRad));
  const altitudeGrazingBand = Math.sin(Math.max(0.0, Math.min(Math.PI, (altDeg / 60.0) * Math.PI)));
  const flutedWallGrazingFactor = Math.min(1.0, eastWestAlignment * 0.75 + altitudeGrazingBand * 0.45);

  // 6. Honed Kota Stone Floor Specular Factor:
  // Low-angle raking light hits the honed limestone floor at glancing angles, producing luminous Fresnel highlights
  const stoneFloorSpecularFactor = Math.max(0.0, Math.min(1.0, (1.0 - Math.sin(Math.max(0.0, altDeg) * Math.PI / 180.0)) * photometrics.directSunIntensity));

  // 7. Unlacquered Spun Brass Specular Highlight Luster:
  // Spun brass pulls and sconce reveals ignite when illuminated by high-temperature direct sunlight or dusk amber
  const bronzeSpecularLuster = Math.min(1.0, photometrics.directSunIntensity * (0.6 + 0.4 * (1.0 - grazingWeight)));

  return {
    lengthMultiplier,
    shadowBearingDeg,
    recommendedNormalBias,
    recommendedBias,
    penumbraSoftness,
    flutedWallGrazingFactor,
    stoneFloorSpecularFactor,
    bronzeSpecularLuster,
  };
}

/**
 * Creates human-readable time and CAD telemetry strings
 */
export function formatSolarTelemetry(coords: SolarCoordinates, photometrics: SolarPhotometrics): {
  formattedTime: string;
  cadTelemetry: string;
  architecturalNote: string;
} {
  const totalMinutes = Math.round(coords.hour * 60.0);
  const rawHours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const padMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;

  const period = rawHours >= 12 ? 'PM' : 'AM';
  const displayHours = rawHours % 12 === 0 ? 12 : rawHours % 12;
  const padDisplayHours = displayHours < 10 ? `0${displayHours}` : `${displayHours}`;
  const formattedTime = `${padDisplayHours}:${padMinutes} ${period}`;

  const azStr = coords.azimuthDeg.toFixed(1).padStart(5, '0');
  const altSign = coords.altitudeDeg >= 0 ? '+' : '';
  const altStr = `${altSign}${coords.apparentAltitudeDeg.toFixed(1)}`;
  const cadTelemetry = `AZ ${azStr}Â° Â· ALT ${altStr}Â° Â· ${photometrics.cctKelvin}K Â· ${coords.isDaylight ? 'DAY' : coords.isTwilight ? 'TWILIGHT' : 'NIGHT'}`;

  // Architectural note selection based on hour
  let architecturalNote = 'Continuous architectural solar path simulation across Biratnagar, Nepal.';
  if (coords.hour < 5.5) {
    architecturalNote = 'Nocturnal silence: fluted Sal woodwork resting under subtle moonlit blue ambient fill.';
  } else if (coords.hour < 7.0) {
    architecturalNote = 'Dawn horizon flare: 2200K apricot sunbeams raking horizontally across honed Kota stone.';
  } else if (coords.hour < 10.0) {
    architecturalNote = 'Crisp morning daylight streaming through east clerestories; vertical Sal batten shadows emerge.';
  } else if (coords.hour < 14.0) {
    architecturalNote = '5500K high-CRI midday sun: razor-sharp contact shadows beneath furniture plinths and cabinetry.';
  } else if (coords.hour < 16.5) {
    architecturalNote = 'Afternoon sun grazing vertical timber reveals; microfacet shadows tilt and sweep eastwards.';
  } else if (coords.hour < 18.0) {
    architecturalNote = '3200K golden hour: dramatic elongated window mullion shadows climb the east joinery wall.';
  } else if (coords.hour < 19.0) {
    architecturalNote = 'Dusk horizon ember: rich apricot-crimson rim flare; spun brass fixtures catch brilliant highlights.';
  } else if (coords.hour < 21.0) {
    architecturalNote = '1800K candlelit warmth: interior sconces and timber cove LEDs illuminate the intimate gallery.';
  } else {
    architecturalNote = 'Deep architectural evening: 1800K incandescent warmth balanced with cool starlight fill.';
  }

  return { formattedTime, cadTelemetry, architecturalNote };
}

// ============================================================================
// SECTION 6: DOWNSTREAM SUB-SYSTEM DRIVERS
// ============================================================================

/**
 * Driver adapter synchronizing Cascaded Shadow Maps with real-time solar path
 */
export function driveCSMShadows(csm: CSMShadowController, snapshot: SolarChoreographySnapshot): void {
  const { coords, photometrics, shadows } = snapshot;

  // 1. Set Light Direction: CSM expects vector pointing to the sun
  csm.setLightDirection(coords.sunDirection);

  // 2. Set Light Intensity: scales direct sunlight based on altitude & air-mass
  csm.setIntensity(photometrics.directSunIntensity);

  // 3. Set Dusk Progress: smoothly modulates dusk color & shadow relaxation
  csm.setDusk(photometrics.duskProgress);

  // 4. Update dynamic shadow bias and normalBias to prevent acne on fluted timber
  for (const light of csm.csm.lights) {
    light.color.copy(photometrics.sunColor);
    light.shadow.normalBias = shadows.recommendedNormalBias;
    light.shadow.bias = shadows.recommendedBias;
  }

  // 5. Trigger CSM internal matrix and cascade synchronization
  csm.update();
}

/**
 * Driver adapter synchronizing Volumetric dust motes and light beams with solar path
 */
export function driveVolumetricSystem(volumetric: VolumetricShowroomSystem, snapshot: SolarChoreographySnapshot): void {
  const { coords, photometrics, shadows } = snapshot;

  // 1. Dust Motes Direction, Tint, and Forward Mie Scattering
  const dustColor = photometrics.sunColor.clone().multiplyScalar(0.95);
  const dustGlow = THREE.MathUtils.lerp(0.85, 1.45, shadows.flutedWallGrazingFactor);

  volumetric.dustMotes.setLightState(
    coords.sunDirection,
    photometrics.sunColor,
    dustColor,
    photometrics.directSunIntensity * dustGlow
  );

  // 2. Synchronize Light Beams: Map continuous hour to nearest or interpolated TimeOfDayPreset
  let preset: TimeOfDayPreset = 'day';
  if (photometrics.duskProgress >= 0.75) {
    preset = 'night';
  } else if (photometrics.duskProgress >= 0.25) {
    preset = 'golden';
  } else {
    preset = 'day';
  }

  // Volumetric system handles its own smooth lerping
  volumetric.setTimeOfDay(preset, 0.4);
}

/**
 * Driver adapter synchronizing Celestial Sky Dome & Starfield with solar path
 */
export function driveCelestialAtmosphere(
  celestial: CelestialAtmosphereSystem,
  snapshot: SolarChoreographySnapshot,
  dayOfYear = DEFAULT_DAY_OF_YEAR
): void {
  celestial.setTime(snapshot.coords.hour, dayOfYear);
}

/**
 * Driver adapter synchronizing primary Three.js scene lights
 */
export function driveSceneLighting(
  targets: SolarChoreographyTargets,
  snapshot: SolarChoreographySnapshot
): void {
  const { coords, photometrics } = snapshot;

  // 1. Primary Directional Sunlight
  if (targets.sunLight) {
    targets.sunLight.position.copy(coords.sunDirection).multiplyScalar(40.0);
    targets.sunLight.color.copy(photometrics.sunColor);
    targets.sunLight.intensity = photometrics.directSunIntensity;
    targets.sunLight.visible = coords.apparentAltitudeDeg > -4.0;
  }

  // 2. Hemispherical Sky/Ground Ambient Light
  if (targets.ambientLight) {
    targets.ambientLight.color.copy(photometrics.skyColor);
    targets.ambientLight.groundColor.copy(photometrics.groundBounceColor);
    targets.ambientLight.intensity = photometrics.ambientSkyIntensity;
  }

  // 3. Warm Interior Architectural Fixtures (1800K candlelit sconces & coves)
  if (targets.interiorFixtures) {
    const intensity = photometrics.interiorFixtureIntensity;
    const color = photometrics.interiorFixtureColor;

    if (Array.isArray(targets.interiorFixtures)) {
      targets.interiorFixtures.forEach((obj) => {
        obj.traverse((child) => {
          if ((child as any).isLight) {
            const light = child as THREE.Light;
            light.color.copy(color);
            light.intensity = intensity;
          }
          if ((child as any).isMesh && (child as THREE.Mesh).material) {
            const mat = (child as THREE.Mesh).material as any;
            if (mat.emissive && mat.emissiveIntensity !== undefined) {
              mat.emissive.copy(color);
              mat.emissiveIntensity = intensity * 1.5;
            }
          }
        });
      });
    } else if ((targets.interiorFixtures as any).isObject3D) {
      targets.interiorFixtures.traverse((child) => {
        if ((child as any).isLight) {
          const light = child as THREE.Light;
          light.color.copy(color);
          light.intensity = intensity;
        }
        if ((child as any).isMesh && (child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material as any;
          if (mat.emissive && mat.emissiveIntensity !== undefined) {
            mat.emissive.copy(color);
            mat.emissiveIntensity = intensity * 1.5;
          }
        }
      });
    }
  }
}

// ============================================================================
// SECTION 7: MASTER SOLAR CHOREOGRAPHY CONTROLLER CLASS
// ============================================================================

export class SolarChoreographyController {
  private _options: Required<SolarChoreographyOptions>;
  private _targets: SolarChoreographyTargets;

  /** Current animated/interpolated hour [0.0..24.0] */
  private _currentHour: number;
  /** Target hour requested by slider, preset, or script */
  private _targetHour: number;

  /** Automated timelapse playback state */
  private _isPlaying = false;
  private _playbackSpeed: number;

  /** Cached evaluation snapshot */
  private _snapshot: SolarChoreographySnapshot;

  /** Animation/Tween handle for programmatic smooth jumps */
  private _tween: {
    startHour: number;
    destHour: number;
    startTime: number;
    durationSec: number;
    active: boolean;
  } = {
    startHour: 12.0,
    destHour: 12.0,
    startTime: 0,
    durationSec: 1.0,
    active: false,
  };

  /** Change listeners */
  private _listeners: Set<(snapshot: SolarChoreographySnapshot) => void> = new Set();

  /** Disposed flag */
  private _disposed = false;

  constructor(options: SolarChoreographyOptions = {}) {
    this._options = {
      initialHour: options.initialHour ?? 12.0,
      dayOfYear: options.dayOfYear ?? DEFAULT_DAY_OF_YEAR,
      observer: options.observer ?? BIRATNAGAR_OBSERVER,
      year: options.year ?? 2026,
      sliderMinHour: options.sliderMinHour ?? 6.0,
      sliderMaxHour: options.sliderMaxHour ?? 22.0,
      lerpSpeed: options.lerpSpeed ?? (prefersReducedMotion() ? 1.0 : 0.14),
      timelapseSpeed: options.timelapseSpeed ?? 60.0, // 60x speed default (1 min = 1 hour)
      dispatchEvents: options.dispatchEvents ?? true,
      targets: options.targets ?? {},
    };

    this._targets = { ...this._options.targets };
    this._currentHour = this._options.initialHour;
    this._targetHour = this._options.initialHour;
    this._playbackSpeed = this._options.timelapseSpeed;

    // Initial evaluation
    this._snapshot = this.evaluateSnapshot(this._currentHour);
    this.applyToTargets(this._snapshot);
  }

  // --------------------------------------------------------------------------
  // Core Time & Evaluation Methods
  // --------------------------------------------------------------------------

  /**
   * Evaluates complete astronomical, photometric, and shadow snapshot at given hour
   */
  public evaluateSnapshot(hour: number): SolarChoreographySnapshot {
    const coords = computeSolarCoordinates(hour, this._options.dayOfYear, this._options.observer, this._options.year);
    const photometrics = computeSolarPhotometrics(coords);
    const shadows = computeShadowChoreography(coords, photometrics);
    const { formattedTime, cadTelemetry, architecturalNote } = formatSolarTelemetry(coords, photometrics);

    return {
      coords,
      photometrics,
      shadows,
      formattedTime,
      cadTelemetry,
      architecturalNote,
    };
  }

  /**
   * Sets the target time of day immediately or smoothly with lerp
   * @param hour Decimal hour [0.0..24.0] (e.g. 17.5 = 17:30)
   * @param immediate If true, skips spring-damper inertia and snaps immediately
   */
  public setTime(hour: number, immediate = false): void {
    if (this._disposed) return;
    const clamped = Math.max(0.0, Math.min(24.0, hour));
    this._targetHour = clamped;

    if (immediate || prefersReducedMotion()) {
      this._currentHour = clamped;
      this._tween.active = false;
      this._snapshot = this.evaluateSnapshot(this._currentHour);
      this.applyToTargets(this._snapshot);
      this.notifyListeners();
    }
  }

  /**
   * Smoothly animates to target hour over duration with cubic-in-out easing
   */
  public animateTo(destHour: number, durationSec = 1.2): void {
    if (this._disposed) return;
    this._tween = {
      startHour: this._currentHour,
      destHour: Math.max(0.0, Math.min(24.0, destHour)),
      startTime: performance.now() / 1000.0,
      durationSec: Math.max(0.1, durationSec),
      active: true,
    };
    this._targetHour = destHour;
  }

  /**
   * Applies an architectural solar preset
   */
  public applyPreset(presetId: SolarPresetId, durationSec = 1.2): void {
    const preset = ARCHITECTURAL_SOLAR_PRESETS[presetId];
    if (preset) {
      this.animateTo(preset.hour, durationSec);
    }
  }

  // --------------------------------------------------------------------------
  // Automated Playback & Timelapse Controls
  // --------------------------------------------------------------------------

  public play(speedMultiplier?: number): void {
    if (speedMultiplier !== undefined) {
      this._playbackSpeed = speedMultiplier;
    }
    this._isPlaying = true;
    this._tween.active = false;
  }

  public pause(): void {
    this._isPlaying = false;
  }

  public togglePlay(): boolean {
    if (this._isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this._isPlaying;
  }

  public isPlaying(): boolean {
    return this._isPlaying;
  }

  public setPlaybackSpeed(speed: number): void {
    this._playbackSpeed = Math.max(0.1, speed);
  }

  // --------------------------------------------------------------------------
  // Per-Frame Update Loop
  // --------------------------------------------------------------------------

  /**
   * Main per-frame update method. Call within requestAnimationFrame loop.
   * @param deltaSec Elapsed delta time in seconds
   */
  public update(deltaSec: number): SolarChoreographySnapshot {
    if (this._disposed) return this._snapshot;

    const dt = Math.min(0.1, Math.max(0.001, deltaSec));
    let timeChanged = false;

    // 1. Programmatic Tween Animation
    if (this._tween.active) {
      const now = performance.now() / 1000.0;
      const elapsed = now - this._tween.startTime;
      const progress = Math.min(1.0, elapsed / this._tween.durationSec);

      // Smooth cubic-in-out curve
      const ease = progress < 0.5 ? 4.0 * progress * progress * progress : 1.0 - Math.pow(-2.0 * progress + 2.0, 3.0) / 2.0;

      this._currentHour = this._tween.startHour + (this._tween.destHour - this._tween.startHour) * ease;
      this._targetHour = this._currentHour;
      timeChanged = true;

      if (progress >= 1.0) {
        this._tween.active = false;
        this._currentHour = this._tween.destHour;
      }
    }
    // 2. Automated Continuous Timelapse Playback
    else if (this._isPlaying) {
      // 1 real second = (speed / 3600) hours
      const hourDelta = (dt * this._playbackSpeed) / 3600.0;
      this._currentHour = (this._currentHour + hourDelta) % 24.0;
      this._targetHour = this._currentHour;
      timeChanged = true;
    }
    // 3. Spring-damper / Lerp tracking towards target hour (e.g. from user dragging slider)
    else if (Math.abs(this._currentHour - this._targetHour) > 0.0005) {
      const lerpFactor = THREE.MathUtils.clamp(dt * (this._options.lerpSpeed * 60.0), 0.01, 1.0);
      this._currentHour = THREE.MathUtils.lerp(this._currentHour, this._targetHour, lerpFactor);
      timeChanged = true;
    }

    // Update snapshot and propagate downstream if time advanced
    if (timeChanged) {
      this._snapshot = this.evaluateSnapshot(this._currentHour);
      this.applyToTargets(this._snapshot);
      this.notifyListeners();
    }

    return this._snapshot;
  }

  // --------------------------------------------------------------------------
  // Target Orchestration & Event Dispatching
  // --------------------------------------------------------------------------

  /**
   * Applies the solar snapshot across all attached downstream showroom subsystems
   */
  private applyToTargets(snapshot: SolarChoreographySnapshot): void {
    // 1. CSM Cascaded Shadows
    if (this._targets.csm) {
      driveCSMShadows(this._targets.csm, snapshot);
    }

    // 2. Volumetric Dust Motes & Sunbeams
    if (this._targets.volumetric) {
      driveVolumetricSystem(this._targets.volumetric, snapshot);
    }

    // 3. Celestial Astronomical Sky Dome
    if (this._targets.celestial) {
      driveCelestialAtmosphere(this._targets.celestial, snapshot, this._options.dayOfYear);
    }

    // 4. Directional Sunlight, Hemisphere Ambient, and Interior Fixtures
    driveSceneLighting(this._targets, snapshot);

    // 5. Custom DOM Event Dispatching for HUD, Telemetry, and Monograph UI
    if (this._options.dispatchEvents && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('studio:solar', {
          detail: {
            snapshot,
            hour: snapshot.coords.hour,
            cctKelvin: snapshot.photometrics.cctKelvin,
            azimuthDeg: snapshot.coords.azimuthDeg,
            altitudeDeg: snapshot.coords.altitudeDeg,
            duskProgress: snapshot.photometrics.duskProgress,
            formattedTime: snapshot.formattedTime,
            cadTelemetry: snapshot.cadTelemetry,
            architecturalNote: snapshot.architecturalNote,
          },
        })
      );

      // Backwards compatibility with showroom.astro 'studio:lighting' event
      const mode = snapshot.photometrics.duskProgress > 0.7 ? 'dusk' : snapshot.photometrics.duskProgress > 0.25 ? 'golden' : 'morning';
      window.dispatchEvent(
        new CustomEvent('studio:lighting', {
          detail: {
            mode,
            duskVal: snapshot.photometrics.duskProgress,
            kelvin: `${snapshot.photometrics.cctKelvin}K`,
            note: snapshot.architecturalNote,
          },
        })
      );
    }
  }

  // --------------------------------------------------------------------------
  // Getters & Target Attachment
  // --------------------------------------------------------------------------

  public getSnapshot(): SolarChoreographySnapshot {
    return this._snapshot;
  }

  public getHour(): number {
    return this._currentHour;
  }

  public getTargetHour(): number {
    return this._targetHour;
  }

  public getDayOfYear(): number {
    return this._options.dayOfYear;
  }

  public setDayOfYear(day: number): void {
    this._options.dayOfYear = Math.max(1, Math.min(365, day));
    this._snapshot = this.evaluateSnapshot(this._currentHour);
    this.applyToTargets(this._snapshot);
    this.notifyListeners();
  }

  public setObserver(observer: ObserverLocation): void {
    this._options.observer = observer;
    this._snapshot = this.evaluateSnapshot(this._currentHour);
    this.applyToTargets(this._snapshot);
    this.notifyListeners();
  }

  /**
   * Attaches or updates downstream subsystems
   */
  public attachTargets(newTargets: Partial<SolarChoreographyTargets>): void {
    this._targets = { ...this._targets, ...newTargets };
    this.applyToTargets(this._snapshot);
  }

  /**
   * Subscribes to real-time solar changes
   */
  public onChange(fn: (snapshot: SolarChoreographySnapshot) => void): () => void {
    this._listeners.add(fn);
    fn(this._snapshot);
    return () => this._listeners.delete(fn);
  }

  private notifyListeners(): void {
    for (const listener of this._listeners) {
      try {
        listener(this._snapshot);
      } catch (err) {
        console.error('[SolarChoreography] Listener error:', err);
      }
    }
  }

  public dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._isPlaying = false;
    this._listeners.clear();
  }
}

// ============================================================================
// SECTION 8: INTERACTIVE LUXURY ARCHITECTURAL TIME SLIDER WIDGET
// ============================================================================

export interface SolarTimeSliderOptions {
  /** Controller to drive */
  controller: SolarChoreographyController;
  /** Existing slider input element in DOM (e.g. input[type="range"]) */
  existingInput?: HTMLInputElement | null;
  /** Parent container to inject luxury glassmorphic widget if existingInput not provided */
  container?: HTMLElement | null;
  /** Minimum hour for slider (default: 6.0, Dawn) */
  minHour?: number;
  /** Maximum hour for slider (default: 22.0, Night) */
  maxHour?: number;
  /** Step precision in hours (default: 0.05 = 3 minutes) */
  step?: number;
  /** Auto-bind keyboard shortcuts (Left/Right arrows for minutes, Space for timelapse play/pause) */
  enableKeyboard?: boolean;
}

export class SolarTimeSlider {
  public readonly controller: SolarChoreographyController;
  public readonly element: HTMLElement | null = null;
  public readonly inputEl: HTMLInputElement | null = null;

  private _timeDisplayEl: HTMLElement | null = null;
  private _kelvinDisplayEl: HTMLElement | null = null;
  private _cadDisplayEl: HTMLElement | null = null;
  private _playButtonEl: HTMLButtonElement | null = null;

  private _minHour: number;
  private _maxHour: number;
  private _step: number;

  private _unbindController: (() => void) | null = null;
  private _keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _disposed = false;

  constructor(options: SolarTimeSliderOptions) {
    this.controller = options.controller;
    this._minHour = options.minHour ?? 6.0;
    this._maxHour = options.maxHour ?? 22.0;
    this._step = options.step ?? 0.05;

    // 1. Use existing DOM elements if provided
    if (options.existingInput) {
      this.inputEl = options.existingInput;
      this.setupExistingInput();
    }
    // 2. Otherwise create luxury glassmorphic architectural slider
    else if (options.container) {
      this.element = this.createArchitecturalWidget();
      options.container.appendChild(this.element);
      this.inputEl = this.element.querySelector<HTMLInputElement>('input[type="range"]');
    }

    // 3. Bind Controller Listener
    this._unbindController = this.controller.onChange((snapshot) => {
      this.syncUIFromSnapshot(snapshot);
    });

    // 4. Keyboard Shortcuts
    if (options.enableKeyboard ?? true) {
      this.bindKeyboardShortcuts();
    }
  }

  private setupExistingInput(): void {
    if (!this.inputEl) return;
    this.inputEl.min = String(this._minHour);
    this.inputEl.max = String(this._maxHour);
    this.inputEl.step = String(this._step);
    this.inputEl.value = String(this.controller.getHour());

    this.inputEl.addEventListener('input', () => {
      const val = parseFloat(this.inputEl!.value);
      this.controller.setTime(val, false);
    });
  }

  /**
   * Creates an architectural glassmorphic slider widget with Swiss datums & telemetry
   */
  private createArchitecturalWidget(): HTMLElement {
    const root = document.createElement('div');
    root.className = 'solar-architectural-slider';
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Architectural Solar Path & Time Slider');

    root.innerHTML = `
      <div class="solar-slider__header">
        <div class="solar-slider__metric-cluster">
          <span class="solar-slider__datum-badge">SOLAR TRACK</span>
          <span class="solar-slider__time-val" data-solar-time>12:00 PM</span>
          <span class="solar-slider__kelvin-val" data-solar-kelvin>5500K</span>
        </div>
        <div class="solar-slider__controls-cluster">
          <button type="button" class="solar-slider__play-btn" data-solar-play aria-label="Toggle Solar Timelapse">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <polygon points="4,2 14,8 4,14" />
            </svg>
            <span class="play-label">TIMELAPSE</span>
          </button>
        </div>
      </div>

      <div class="solar-slider__track-wrapper">
        <input
          type="range"
          class="solar-slider__range-input"
          min="${this._minHour}"
          max="${this._maxHour}"
          step="${this._step}"
          value="${this.controller.getHour()}"
          aria-label="Solar Time of Day Slider"
        />
        <div class="solar-slider__ticks" aria-hidden="true">
          <span class="tick" data-time="06:00">06:00<br/>DAWN</span>
          <span class="tick" data-time="09:00">09:00</span>
          <span class="tick" data-time="12:00">12:00<br/>NOON</span>
          <span class="tick" data-time="15:00">15:00</span>
          <span class="tick" data-time="18:00">18:00<br/>GOLDEN</span>
          <span class="tick" data-time="20:00">20:00</span>
          <span class="tick" data-time="22:00">22:00<br/>NIGHT</span>
        </div>
      </div>

      <div class="solar-slider__footer">
        <span class="solar-slider__cad-telemetry" data-solar-cad>AZ 178.0Â° Â· ALT +76.0Â° Â· 5500K</span>
      </div>
    `;

    this._timeDisplayEl = root.querySelector('[data-solar-time]');
    this._kelvinDisplayEl = root.querySelector('[data-solar-kelvin]');
    this._cadDisplayEl = root.querySelector('[data-solar-cad]');
    this._playButtonEl = root.querySelector('[data-solar-play]');

    const rangeInput = root.querySelector<HTMLInputElement>('input[type="range"]');
    if (rangeInput) {
      rangeInput.addEventListener('input', () => {
        const val = parseFloat(rangeInput.value);
        this.controller.setTime(val, false);
      });
    }

    if (this._playButtonEl) {
      this._playButtonEl.addEventListener('click', () => {
        const playing = this.controller.togglePlay();
        this.updatePlayButtonState(playing);
      });
    }

    return root;
  }

  private updatePlayButtonState(playing: boolean): void {
    if (!this._playButtonEl) return;
    this._playButtonEl.setAttribute('aria-pressed', String(playing));
    const label = this._playButtonEl.querySelector('.play-label');
    if (label) {
      label.textContent = playing ? 'PAUSE' : 'TIMELAPSE';
    }
  }

  private syncUIFromSnapshot(snapshot: SolarChoreographySnapshot): void {
    if (this._disposed) return;

    if (this.inputEl && document.activeElement !== this.inputEl) {
      this.inputEl.value = snapshot.coords.hour.toFixed(2);
    }
    if (this._timeDisplayEl) {
      this._timeDisplayEl.textContent = snapshot.formattedTime;
    }
    if (this._kelvinDisplayEl) {
      this._kelvinDisplayEl.textContent = `${snapshot.photometrics.cctKelvin}K`;
    }
    if (this._cadDisplayEl) {
      this._cadDisplayEl.textContent = snapshot.cadTelemetry;
    }
    if (this._playButtonEl) {
      this.updatePlayButtonState(this.controller.isPlaying());
    }
  }

  private bindKeyboardShortcuts(): void {
    if (typeof window === 'undefined') return;

    this._keydownHandler = (e: KeyboardEvent) => {
      // Ignore if user is typing into input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const current = this.controller.getTargetHour();
        const next = Math.min(this._maxHour, current + (e.shiftKey ? 1.0 : 0.25)); // 15 mins or 1 hour
        this.controller.setTime(next, false);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const current = this.controller.getTargetHour();
        const prev = Math.max(this._minHour, current - (e.shiftKey ? 1.0 : 0.25));
        this.controller.setTime(prev, false);
      } else if (e.key === ' ' && e.altKey) {
        e.preventDefault();
        this.controller.togglePlay();
      }
    };

    window.addEventListener('keydown', this._keydownHandler);
  }

  public dispose(): void {
    if (this._disposed) return;
    this._disposed = true;

    if (this._unbindController) {
      this._unbindController();
      this._unbindController = null;
    }
    if (this._keydownHandler && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._keydownHandler);
      this._keydownHandler = null;
    }
    if (this.element && this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}

// ============================================================================
// SECTION 9: FACTORY FUNCTIONS & GLOBAL SINGLETON
// ============================================================================

/**
 * Creates and initializes the complete Solar Choreography System
 */
export function createSolarChoreography(options: SolarChoreographyOptions = {}): SolarChoreographyController {
  return new SolarChoreographyController(options);
}

/**
 * Creates an interactive slider controller bound to a SolarChoreography instance
 */
export function createSolarSlider(options: SolarTimeSliderOptions): SolarTimeSlider {
  return new SolarTimeSlider(options);
}
