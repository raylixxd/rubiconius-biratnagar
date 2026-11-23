/**
 * CELESTIAL ASTRONOMICAL SKY DOME & ATMOSPHERIC SCATTERING ENGINE
 *
 * Reverse-Engineered & Mathematically Derived Production Architecture:
 * 1. 03_star_atlas: GPU Starfield Instancing, Apparent Magnitude Flux, Planckian Blackbody
 *    Radiation Color Temperature Distribution, and Northern Hemisphere Constellation Network.
 * 2. 32_immersive_garden: Preetham / Bruneton Atmospheric Single Scattering, Day/Golden/Night
 *    Time-of-Day Lerping, Ozone Chappuis Absorption, and Solar/Lunar Directional Handoff.
 *
 * Astronomical & Scientific Formulations:
 * - Meeus, Jean. Astronomical Algorithms (2nd Ed., 1998) - Lunar Perturbations & Solar Ephemeris.
 * - Spencer, J. W. (1971) - Fourier Series Equation of Time (EoT) & Declination.
 * - Preetham, Shirley, Smits (SIGGRAPH 1999) - A Practical Analytic Model for Daylight.
 * - Bruneton, E. & Neyret, F. (EGSR 2008) - Precomputed Atmospheric Scattering.
 * - Pierce, A. K. (Solar Physics 1993) - Pierce Solar Limb Darkening Coefficients.
 * - Saemundsson, T. (1986) - Bennett Atmospheric Refraction Formulation for Low Horizons.
 * - Kang et al. (CIE 1931) - Correlated Color Temperature to Linear sRGB Planckian Locus.
 *
 * Geographic Anchor Datums:
 * - Biratnagar, Morang, Eastern Terai, Nepal: 26.4678° N, 87.2767° E, 80m AMSL, UTC+5:45 (NPT).
 * - Dharan, Sunsari, Mahabharat Foothills, Nepal: 26.8124° N, 87.2834° E, 349m AMSL, UTC+5:45 (NPT).
 */

import * as THREE from 'three';

// ============================================================================
// SECTION 1: ASTRONOMICAL CONSTANTS, GEOGRAPHIC DATUMS, & INTERFACES
// ============================================================================

/** Standard Julian epoch J2000.0 (January 1.5, 2000 TT) */
export const J2000_EPOCH = 2451545.0;

/** Mean obliquity of the ecliptic at J2000.0 in radians (23.43929111 degrees) */
export const OBLIQUITY_J2000_RAD = 0.4090928042223289;

/** Mean Earth equatorial radius in meters */
export const EARTH_RADIUS_METERS = 6371000.0;

/** Mean atmosphere outer boundary radius in meters */
export const ATMOSPHERE_RADIUS_METERS = 6471000.0;

/** Apparent angular semi-diameter of the Sun at 1 AU in radians (~16 arcmin) */
export const SOLAR_ANGULAR_RADIUS_RAD = 0.00465421;

/** Apparent angular semi-diameter of the Moon at mean perigee/apogee in radians (~15.5 arcmin) */
export const LUNAR_ANGULAR_RADIUS_RAD = 0.00450841;

/** Atmospheric scale height for Rayleigh scattering (density e-folding height) in meters */
export const SCALE_HEIGHT_RAYLEIGH_METERS = 8400.0;

/** Atmospheric scale height for Mie aerosol scattering in meters */
export const SCALE_HEIGHT_MIE_METERS = 1200.0;

/** Standard Rayleigh scattering coefficients at sea level for RGB [680nm, 550nm, 440nm] in m^-1 */
export const RAYLEIGH_SCATTERING_COEFFICIENTS = new THREE.Vector3(5.802e-6, 13.558e-6, 33.100e-6);

/** Baseline Mie scattering coefficient at sea level for clean rural atmosphere in m^-1 */
export const MIE_SCATTERING_BASE_COEFFICIENT = 2.100e-5;

/** Chappuis ozone absorption cross-section peak coefficients for RGB in m^-1 */
export const OZONE_ABSORPTION_COEFFICIENTS = new THREE.Vector3(3.426e-7, 8.298e-7, 0.356e-7);

/** Pierce solar limb darkening quadratic coefficients for 550nm: I(mu) = 1 - u*(1 - mu) - v*(1 - mu)^2 */
export const SOLAR_LIMB_DARKENING = { u: 0.429, v: 0.107 };

/** Geographic Datums for Eastern Nepal */
export interface ObserverLocation {
  name: string;
  latitudeDeg: number;
  longitudeDeg: number;
  elevationMeters: number;
  timezoneOffsetHours: number; // Nepal Standard Time is UTC +5:45 (+5.75)
}

export const BIRATNAGAR_LOCATION: ObserverLocation = {
  name: 'Biratnagar, Morang (Terai Plain)',
  latitudeDeg: 26.4678,
  longitudeDeg: 87.2767,
  elevationMeters: 80.0,
  timezoneOffsetHours: 5.75,
};

export const DHARAN_LOCATION: ObserverLocation = {
  name: 'Dharan, Sunsari (Mahabharat Ridge)',
  latitudeDeg: 26.8124,
  longitudeDeg: 87.2834,
  elevationMeters: 349.0,
  timezoneOffsetHours: 5.75,
};

/** Solar Ephemeris Calculation Output */
export interface SolarEphemeris {
  azimuthDeg: number;       // Measured from North (0° = North, 90° = East, 180° = South, 270° = West)
  altitudeDeg: number;      // Unrefracted geometric altitude above horizon (-90° to +90°)
  apparentAltitudeDeg: number; // Altitude corrected for Saemundsson atmospheric refraction
  zenithDeg: number;        // Zenith angle (90° - altitude)
  declinationRad: number;   // Celestial declination (-0.41 to +0.41 rad)
  rightAscensionRad: number;// Celestial right ascension (0 to 2*PI rad)
  hourAngleRad: number;     // Local hour angle (-PI to +PI rad)
  directionVector: THREE.Vector3; // Unit vector in Topocentric Horizon coordinates (+X=East, +Y=Zenith, -Z=North)
  equationOfTimeMinutes: number; // Difference between True Solar Time and Mean Solar Time
  localSiderealTimeRad: number;  // Local Sidereal Time in radians
  trueSolarTimeHours: number;    // Solar time of day (0.0 to 24.0h)
  distanceAU: number;       // Distance from Earth to Sun in astronomical units (~0.983 to 1.017)
  isAboveHorizon: boolean;  // True if apparent altitude > -0.8333° (accounting for solar radius & refraction)
  twilightState: 'day' | 'civil' | 'nautical' | 'astronomical' | 'night';
}

/** Lunar Ephemeris Calculation Output */
export type LunarPhaseName =
  | 'New Moon'
  | 'Waxing Crescent'
  | 'First Quarter'
  | 'Waxing Gibbous'
  | 'Full Moon'
  | 'Waning Gibbous'
  | 'Third Quarter'
  | 'Waning Crescent';

export interface LunarEphemeris {
  azimuthDeg: number;
  altitudeDeg: number;
  apparentAltitudeDeg: number;
  zenithDeg: number;
  declinationRad: number;
  rightAscensionRad: number;
  directionVector: THREE.Vector3;
  distanceEarthRadii: number;
  distanceKm: number;
  phaseAngleDeg: number;     // Elongation phase angle (0° = Full Moon, 180° = New Moon)
  illuminatedFraction: number; // 0.0 (New Moon) to 1.0 (Full Moon)
  phaseName: LunarPhaseName;
  positionAngleBrightLimbDeg: number; // Angle of illuminated crescent axis relative to celestial north
  earthshineFactor: number;   // Peak intensity multiplier for ashen earthlight during slender crescents
  oppositionSurge: number;    // Retroreflective Seeliger brightness spike within 5° of full moon
  isAboveHorizon: boolean;
}

/** Comprehensive Instantaneous Ephemeris State */
export interface CelestialEphemerisState {
  timestamp: Date;
  julianDate: number;
  dayOfYear: number;
  localHour: number;
  location: ObserverLocation;
  solar: SolarEphemeris;
  lunar: LunarEphemeris;
  lstRadians: number;
  siderealRotationMatrix: THREE.Matrix4;
}

/** Star Catalog Entry (Astronomical Standard Format) */
export interface StarCatalogEntry {
  name: string;
  bayerDesignation?: string;
  constellation: string;
  rightAscensionHours: number; // Right Ascension (0.0 to 24.0 hours)
  declinationDeg: number;      // Declination (-90.0° to +90.0°)
  apparentMagnitude: number;   // Visual magnitude (-1.46 to +6.5)
  colorTemperatureK: number;   // Blackbody temperature in Kelvin (2,800K to 35,000K)
  spectralClass: string;       // O, B, A, F, G, K, M
}

/** Constellation Line Segment Connection */
export interface ConstellationSegment {
  constellationName: string;
  star1: string;
  star2: string;
  star1Coords: { raH: number; decDeg: number };
  star2Coords: { raH: number; decDeg: number };
}

/** Master Engine Configuration Options */
export interface CelestialAtmosphereConfig {
  location: ObserverLocation;
  dayOfYear: number;          // 1 to 365
  hourOfDay: number;          // 0.0 to 24.0
  turbidity: number;          // 1.8 (crystal clear mountain) to 8.0 (thick Terai valley haze)
  rayleighFactor: number;     // Scalar multiplier for molecular scattering
  mieFactor: number;          // Scalar multiplier for aerosol scattering
  mieAsymmetryG: number;      // Cornette-Shanks asymmetry factor (0.76 to 0.86)
  ozoneFactor: number;        // Scalar multiplier for Chappuis ozone absorption
  exposure: number;           // Photometric tone mapping exposure scalar
  starCount: number;          // Number of instanced stars (up to 20,000)
  starScintillationSpeed: number; // Twinkling atmospheric temporal frequency
  starMagnitudeLimit: number; // Maximum faint star cutoff magnitude (default 6.5)
  constellationsVisible: boolean;
  constellationLineOpacity: number;
  lunarEarthshineStrength: number;
  lakeSpecularRoughness: number; // Water reflection roughness
}

export const DEFAULT_CELESTIAL_CONFIG: CelestialAtmosphereConfig = {
  location: BIRATNAGAR_LOCATION,
  dayOfYear: 326, // Late Autumn / November clear skies over Eastern Nepal
  hourOfDay: 17.65, // Golden hour / dusk transition (5:39 PM NPT)
  turbidity: 3.4, // Typical atmospheric haze across the eastern Terai basin
  rayleighFactor: 1.0,
  mieFactor: 1.15,
  mieAsymmetryG: 0.82,
  ozoneFactor: 1.25,
  exposure: 0.000085,
  starCount: 20000,
  starScintillationSpeed: 1.85,
  starMagnitudeLimit: 6.5,
  constellationsVisible: true,
  constellationLineOpacity: 0.45,
  lunarEarthshineStrength: 0.045,
  lakeSpecularRoughness: 0.08,
};

// ============================================================================
// SECTION 2: EPHEMERIS ASTRONOMICAL SOLAR & LUNAR CALCULATOR (Pillar 1)
// ============================================================================

/**
 * Computes Julian Date from calendar date and time.
 * Implements standard Meeus Chapter 7 algorithm.
 */
export function computeJulianDate(date: Date): number {
  let Y = date.getUTCFullYear();
  let M = date.getUTCMonth() + 1;
  const D =
    date.getUTCDate() +
    date.getUTCHours() / 24.0 +
    date.getUTCMinutes() / 1440.0 +
    date.getUTCSeconds() / 86400.0 +
    date.getUTCMilliseconds() / 86400000.0;

  if (M <= 2) {
    Y -= 1;
    M += 12;
  }

  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4); // Gregorian calendar correction

  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5;
}

/**
 * Computes Julian Date from day of year (1-365) and local decimal hour for a given year.
 */
export function computeJulianDateFromDayOfYear(
  year: number,
  dayOfYear: number,
  localHour: number,
  timezoneOffsetHours: number
): number {
  const utcHour = localHour - timezoneOffsetHours;
  // Compute Jan 1.0 of the target year
  const Y = year - 1;
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const jan1JD = Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * 14) + 1 + B - 1524.5;
  return jan1JD + (dayOfYear - 1) + utcHour / 24.0;
}

/**
 * Greenwich Mean Sidereal Time (GMST) in radians for a given Julian Date.
 * Meeus formula (Eq 12.4).
 */
export function computeGMSTRadians(jd: number): number {
  const T = (jd - J2000_EPOCH) / 36525.0;
  let theta0 =
    280.46061837 +
    360.98564736629 * (jd - J2000_EPOCH) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;
  theta0 = ((theta0 % 360.0) + 360.0) % 360.0;
  return THREE.MathUtils.degToRad(theta0);
}

/**
 * Local Sidereal Time (LST) in radians for an observer at given longitude.
 */
export function computeLSTRadians(jd: number, longitudeDeg: number): number {
  const gmst = computeGMSTRadians(jd);
  let lst = gmst + THREE.MathUtils.degToRad(longitudeDeg);
  lst = ((lst % (2.0 * Math.PI)) + 2.0 * Math.PI) % (2.0 * Math.PI);
  return lst;
}

/**
 * Saemundsson (1986) Bennett atmospheric refraction correction in degrees.
 * Evaluates the apparent upward lift of celestial bodies near the horizon.
 */
export function computeAtmosphericRefractionDeg(geometricAltitudeDeg: number, pressureHPa = 1013.25, tempC = 20.0): number {
  if (geometricAltitudeDeg < -2.0) return 0.0;
  const h = Math.max(-1.5, geometricAltitudeDeg);
  // Saemundsson empirical formula (arcminutes)
  const rMinutes =
    1.02 /
    Math.tan(THREE.MathUtils.degToRad(h + 10.3 / (h + 5.11)));
  // Pressure & temperature scaling
  const ptCorrection = (pressureHPa / 1010.0) * (283.0 / (273.0 + tempC));
  return (rMinutes / 60.0) * ptCorrection;
}

/**
 * Rigorous Ephemeris Solar Position Calculator for Biratnagar / Dharan.
 * Computes exact azimuth, altitude, declination, hour angle, and topocentric direction vector.
 */
export function computeSolarEphemeris(
  dayOfYear: number,
  localHour: number,
  location: ObserverLocation,
  year = 2026
): SolarEphemeris {
  const jd = computeJulianDateFromDayOfYear(year, dayOfYear, localHour, location.timezoneOffsetHours);
  const lstRad = computeLSTRadians(jd, location.longitudeDeg);

  // Fractional year angle gamma (Spencer 1971)
  const gamma = (2.0 * Math.PI / 365.0) * (dayOfYear - 1 + (localHour - 12.0) / 24.0);

  // Equation of Time in minutes (Spencer Fourier formulation)
  const eotMinutes =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2.0 * gamma) -
      0.040849 * Math.sin(2.0 * gamma));

  // Solar declination in radians (Spencer 1971)
  const declinationRad =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2.0 * gamma) +
    0.000907 * Math.sin(2.0 * gamma) -
    0.002697 * Math.cos(3.0 * gamma) +
    0.001480 * Math.sin(3.0 * gamma);

  // True Solar Time (TST) in minutes
  const timeOffsetMinutes = eotMinutes + 4.0 * location.longitudeDeg - 60.0 * location.timezoneOffsetHours;
  const trueSolarTimeMinutes = localHour * 60.0 + timeOffsetMinutes;
  let trueSolarTimeHours = (trueSolarTimeMinutes / 60.0) % 24.0;
  if (trueSolarTimeHours < 0) trueSolarTimeHours += 24.0;

  // Solar Hour Angle in radians
  const hourAngleDeg = (trueSolarTimeMinutes / 4.0) - 180.0;
  const hourAngleRad = THREE.MathUtils.degToRad(hourAngleDeg);

  // Observer latitude in radians
  const latRad = THREE.MathUtils.degToRad(location.latitudeDeg);

  // Solar Zenith and Altitude (Spherical Trigonometry)
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinDec = Math.sin(declinationRad);
  const cosDec = Math.cos(declinationRad);
  const cosH = Math.cos(hourAngleRad);

  const sinAltitude = sinLat * sinDec + cosLat * cosDec * cosH;
  const altitudeRad = Math.asin(Math.max(-1.0, Math.min(1.0, sinAltitude)));
  const geometricAltitudeDeg = THREE.MathUtils.radToDeg(altitudeRad);

  // Solar Azimuth (measured clockwise from true North)
  const cosAltitude = Math.cos(altitudeRad);
  let azimuthRad = 0;
  if (cosAltitude > 1e-6) {
    const cosAzimuth = (sinDec - sinLat * sinAltitude) / (cosLat * cosAltitude);
    const clampedCosAz = Math.max(-1.0, Math.min(1.0, cosAzimuth));
    azimuthRad = Math.acos(clampedCosAz);
    if (Math.sin(hourAngleRad) > 0) {
      azimuthRad = 2.0 * Math.PI - azimuthRad;
    }
  }
  const azimuthDeg = THREE.MathUtils.radToDeg(azimuthRad);

  // Apparent altitude including Saemundsson atmospheric refraction
  const refractionDeg = computeAtmosphericRefractionDeg(geometricAltitudeDeg);
  const apparentAltitudeDeg = geometricAltitudeDeg + refractionDeg;
  const zenithDeg = 90.0 - apparentAltitudeDeg;

  // Right Ascension via equatorial coordinates
  const rightAscensionRad = ((lstRad - hourAngleRad) % (2.0 * Math.PI) + 2.0 * Math.PI) % (2.0 * Math.PI);

  // Topocentric 3D Unit Vector in Three.js Horizon frame:
  // +X = East, +Y = Zenith (Up), -Z = True North, +Z = South
  const apparentAltRad = THREE.MathUtils.degToRad(apparentAltitudeDeg);
  const azRad = THREE.MathUtils.degToRad(azimuthDeg);
  const dirX = Math.cos(apparentAltRad) * Math.sin(azRad);
  const dirY = Math.sin(apparentAltRad);
  const dirZ = -Math.cos(apparentAltRad) * Math.cos(azRad);
  const directionVector = new THREE.Vector3(dirX, dirY, dirZ).normalize();

  // Approximate Sun-Earth distance in AU (eccentricity ~0.0167)
  const distanceAU = 1.00014 - 0.01671 * Math.cos(gamma) - 0.00014 * Math.cos(2.0 * gamma);

  // Astronomical twilight boundaries
  let twilightState: SolarEphemeris['twilightState'] = 'night';
  if (apparentAltitudeDeg > -0.8333) {
    twilightState = 'day';
  } else if (apparentAltitudeDeg > -6.0) {
    twilightState = 'civil';
  } else if (apparentAltitudeDeg > -12.0) {
    twilightState = 'nautical';
  } else if (apparentAltitudeDeg > -18.0) {
    twilightState = 'astronomical';
  }

  return {
    azimuthDeg,
    altitudeDeg: geometricAltitudeDeg,
    apparentAltitudeDeg,
    zenithDeg,
    declinationRad,
    rightAscensionRad,
    hourAngleRad,
    directionVector,
    equationOfTimeMinutes: eotMinutes,
    localSiderealTimeRad: lstRad,
    trueSolarTimeHours,
    distanceAU,
    isAboveHorizon: apparentAltitudeDeg > -0.8333,
    twilightState,
  };
}

/**
 * Truncated Meeus Lunar Ephemeris Algorithm (Astronomical Algorithms Chapter 47).
 * Computes topocentric position, phase angle, crescent orientation, and earthshine factor.
 */
export function computeLunarEphemeris(
  dayOfYear: number,
  localHour: number,
  location: ObserverLocation,
  solar: SolarEphemeris,
  year = 2026
): LunarEphemeris {
  const jd = computeJulianDateFromDayOfYear(year, dayOfYear, localHour, location.timezoneOffsetHours);
  const T = (jd - J2000_EPOCH) / 36525.0;

  // Moon's mean longitude
  let L0 = 218.3164477 + 481267.88123421 * T;
  // Moon's mean elongation
  let D = 297.8501921 + 445267.1114034 * T;
  // Sun's mean anomaly
  let M = 357.5291092 + 35999.0502909 * T;
  // Moon's mean anomaly
  let Mprime = 134.9633964 + 477198.8675055 * T;
  // Moon's argument of latitude
  let F = 93.2720950 + 483202.0175233 * T;

  L0 = THREE.MathUtils.degToRad(((L0 % 360.0) + 360.0) % 360.0);
  D = THREE.MathUtils.degToRad(((D % 360.0) + 360.0) % 360.0);
  M = THREE.MathUtils.degToRad(((M % 360.0) + 360.0) % 360.0);
  Mprime = THREE.MathUtils.degToRad(((Mprime % 360.0) + 360.0) % 360.0);
  F = THREE.MathUtils.degToRad(((F % 360.0) + 360.0) % 360.0);

  // Periodic perturbation terms for Lunar Longitude (Sigma L in arcseconds)
  let sigmaL =
    22640.0 * Math.sin(Mprime) +
    -4586.0 * Math.sin(Mprime - 2.0 * D) +
    2370.0 * Math.sin(2.0 * D) +
    769.0 * Math.sin(2.0 * Mprime) +
    -668.0 * Math.sin(M) +
    -412.0 * Math.sin(2.0 * F) +
    -212.0 * Math.sin(2.0 * Mprime - 2.0 * D) +
    -206.0 * Math.sin(Mprime + M - 2.0 * D) +
    192.0 * Math.sin(Mprime + 2.0 * D) +
    -165.0 * Math.sin(M - 2.0 * D);

  // Periodic perturbation terms for Lunar Latitude (Sigma B in arcseconds)
  let sigmaB =
    18461.0 * Math.sin(F) +
    -1010.0 * Math.sin(Mprime - F) +
    1010.0 * Math.sin(Mprime + F) +
    -631.0 * Math.sin(F - 2.0 * D) +
    -257.0 * Math.sin(Mprime - F - 2.0 * D) +
    -173.0 * Math.sin(F + 2.0 * D);

  // Distance perturbation terms (Sigma R in meters / Earth radii)
  let sigmaR =
    -20954.0 * Math.cos(Mprime) +
    -3699.0 * Math.cos(2.0 * D - Mprime) +
    -2956.0 * Math.cos(2.0 * D);

  const eclipticLongitudeRad = L0 + THREE.MathUtils.degToRad(sigmaL / 3600.0);
  const eclipticLatitudeRad = THREE.MathUtils.degToRad(sigmaB / 3600.0);
  const distanceKm = 385000.56 + sigmaR;
  const distanceEarthRadii = distanceKm / 6378.137;

  // Convert Ecliptic to Equatorial Coordinates (Right Ascension and Declination)
  const sinEclLong = Math.sin(eclipticLongitudeRad);
  const cosEclLong = Math.cos(eclipticLongitudeRad);
  const sinEclLat = Math.sin(eclipticLatitudeRad);
  const cosEclLat = Math.cos(eclipticLatitudeRad);
  const sinEps = Math.sin(OBLIQUITY_J2000_RAD);
  const cosEps = Math.cos(OBLIQUITY_J2000_RAD);

  const sinDec = sinEclLat * cosEps + cosEclLat * sinEps * sinEclLong;
  const declinationRad = Math.asin(Math.max(-1.0, Math.min(1.0, sinDec)));

  const yRA = cosEclLat * cosEps * sinEclLong - sinEclLat * sinEps;
  const xRA = cosEclLat * cosEclLong;
  let rightAscensionRad = Math.atan2(yRA, xRA);
  if (rightAscensionRad < 0) rightAscensionRad += 2.0 * Math.PI;

  // Topocentric Correction for Biratnagar / Dharan (Parallax)
  const lstRad = computeLSTRadians(jd, location.longitudeDeg);
  const hourAngleRad = ((lstRad - rightAscensionRad) % (2.0 * Math.PI) + 2.0 * Math.PI) % (2.0 * Math.PI);

  const latRad = THREE.MathUtils.degToRad(location.latitudeDeg);
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const cosDec = Math.cos(declinationRad);
  const cosH = Math.cos(hourAngleRad);

  const sinAltitude = sinLat * sinDec + cosLat * cosDec * cosH;
  const altitudeRad = Math.asin(Math.max(-1.0, Math.min(1.0, sinAltitude)));
  let geometricAltitudeDeg = THREE.MathUtils.radToDeg(altitudeRad);

  // Topocentric parallax correction (Earth radius vs Moon distance ~1 degree shift!)
  const parallaxRad = Math.asin(Math.cos(altitudeRad) / distanceEarthRadii);
  geometricAltitudeDeg -= THREE.MathUtils.radToDeg(parallaxRad);

  // Azimuth calculation
  const cosAltitude = Math.cos(altitudeRad);
  let azimuthRad = 0;
  if (cosAltitude > 1e-6) {
    const cosAz = (sinDec - sinLat * sinAltitude) / (cosLat * cosAltitude);
    azimuthRad = Math.acos(Math.max(-1.0, Math.min(1.0, cosAz)));
    if (Math.sin(hourAngleRad) > 0) azimuthRad = 2.0 * Math.PI - azimuthRad;
  }
  const azimuthDeg = THREE.MathUtils.radToDeg(azimuthRad);

  const refractionDeg = computeAtmosphericRefractionDeg(geometricAltitudeDeg);
  const apparentAltitudeDeg = geometricAltitudeDeg + refractionDeg;
  const zenithDeg = 90.0 - apparentAltitudeDeg;

  // 3D Unit Vector in Topocentric Horizon Frame
  const appAltRad = THREE.MathUtils.degToRad(apparentAltitudeDeg);
  const azR = THREE.MathUtils.degToRad(azimuthDeg);
  const dirX = Math.cos(appAltRad) * Math.sin(azR);
  const dirY = Math.sin(appAltRad);
  const dirZ = -Math.cos(appAltRad) * Math.cos(azR);
  const directionVector = new THREE.Vector3(dirX, dirY, dirZ).normalize();

  // Lunar Phase Angle (Meeus Chapter 48 formula)
  // cos(i) = -cos(D) with minor planetary terms
  const cosPhaseAngle = -Math.cos(D) + 0.004 * Math.cos(D - M) - 0.003 * Math.cos(D + Mprime);
  const phaseAngleRad = Math.acos(Math.max(-1.0, Math.min(1.0, cosPhaseAngle)));
  const phaseAngleDeg = THREE.MathUtils.radToDeg(phaseAngleRad);

  // Illuminated Fraction k = (1 + cos(i)) / 2
  const illuminatedFraction = Math.max(0.0, Math.min(1.0, (1.0 + Math.cos(phaseAngleRad)) / 2.0));

  // Determine standard astronomical phase name
  const isWaxing = Math.sin(D) > 0;
  let phaseName: LunarPhaseName = 'New Moon';
  if (illuminatedFraction < 0.03) {
    phaseName = 'New Moon';
  } else if (illuminatedFraction > 0.97) {
    phaseName = 'Full Moon';
  } else if (isWaxing) {
    if (illuminatedFraction < 0.45) phaseName = 'Waxing Crescent';
    else if (illuminatedFraction < 0.55) phaseName = 'First Quarter';
    else phaseName = 'Waxing Gibbous';
  } else {
    if (illuminatedFraction > 0.55) phaseName = 'Waning Gibbous';
    else if (illuminatedFraction > 0.45) phaseName = 'Third Quarter';
    else phaseName = 'Waning Crescent';
  }

  // Position angle of the bright limb (direction pointing to the Sun)
  const dAlpha = solar.rightAscensionRad - rightAscensionRad;
  const numChi = Math.cos(solar.declinationRad) * Math.sin(dAlpha);
  const denChi =
    Math.sin(solar.declinationRad) * Math.cos(declinationRad) -
    Math.cos(solar.declinationRad) * Math.sin(declinationRad) * Math.cos(dAlpha);
  const posAngleRad = Math.atan2(numChi, denChi);
  const positionAngleBrightLimbDeg = THREE.MathUtils.radToDeg(posAngleRad);

  // Earthshine Factor: Da Vinci glow is strongest when Moon is a thin crescent (Earth is nearly "full" in lunar sky)
  // Peaks at illuminatedFraction < 0.25 and drops to zero at full moon.
  const earthshineFactor = Math.pow(1.0 - illuminatedFraction, 2.5);

  // Lunar Opposition Surge (Seeliger effect): sharp brightness rise within 5° of phase angle = 0°
  const oppositionSurge = Math.exp(-phaseAngleDeg / 3.5) * 0.42;

  return {
    azimuthDeg,
    altitudeDeg: geometricAltitudeDeg,
    apparentAltitudeDeg,
    zenithDeg,
    declinationRad,
    rightAscensionRad,
    directionVector,
    distanceEarthRadii,
    distanceKm,
    phaseAngleDeg,
    illuminatedFraction,
    phaseName,
    positionAngleBrightLimbDeg,
    earthshineFactor,
    oppositionSurge,
    isAboveHorizon: apparentAltitudeDeg > -0.5,
  };
}

/**
 * Computes full instantaneous celestial ephemeris state including Sidereal Transformation Matrix.
 */
export function computeCelestialEphemerisState(
  date: Date,
  location: ObserverLocation
): CelestialEphemerisState {
  const jd = computeJulianDate(date);
  const year = date.getUTCFullYear();
  // Day of year calculation
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const diffMs = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diffMs / 86400000.0) + 1;
  const localHour =
    date.getUTCHours() +
    date.getUTCMinutes() / 60.0 +
    date.getUTCSeconds() / 3600.0 +
    location.timezoneOffsetHours;

  const solar = computeSolarEphemeris(dayOfYear, localHour, location, year);
  const lunar = computeLunarEphemeris(dayOfYear, localHour, location, solar, year);
  const lstRad = computeLSTRadians(jd, location.longitudeDeg);

  // Sidereal Rotation Matrix: Transforms Celestial Equatorial (J2000) coordinates to Local Horizon coordinates
  // Step 1: Rotate by LST around Earth polar axis
  // Step 2: Tilt polar axis by observer latitude (90° - latitude)
  const latRad = THREE.MathUtils.degToRad(location.latitudeDeg);
  const siderealRotationMatrix = new THREE.Matrix4();
  const mRotZ = new THREE.Matrix4().makeRotationY(lstRad);
  const mTiltX = new THREE.Matrix4().makeRotationX(Math.PI / 2.0 - latRad);
  siderealRotationMatrix.multiplyMatrices(mTiltX, mRotZ);

  return {
    timestamp: date,
    julianDate: jd,
    dayOfYear,
    localHour,
    location,
    solar,
    lunar,
    lstRadians: lstRad,
    siderealRotationMatrix,
  };
}

// ============================================================================
// SECTION 3: PREETHAM / BRUNETON ATMOSPHERIC SKY DOME SHADER (Pillar 2)
// ============================================================================

/**
 * Vertex Shader for the Sky Dome:
 * Inverted dome geometry placed at infinity, passing through world view directions.
 */
export const SKY_DOME_VERT = /* glsl */ `
varying vec3 vWorldDirection;
varying vec3 vPosition;

void main() {
  vWorldDirection = normalize(position);
  vPosition = position;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  // Force depth buffer write to far clipping plane (z = w)
  gl_Position = (projectionMatrix * mvPosition).xyww;
}
`;

/**
 * Fragment Shader for the Bruneton/Preetham Sky Dome:
 * Implements physical Rayleigh single scattering, Mie aerosol scattering (Terai mountain haze),
 * Chappuis ozone absorption, golden hour horizon red-shift, Pierce solar limb darkening,
 * and deep twilight ozone blue.
 */
export const SKY_DOME_FRAG = /* glsl */ `
precision highp float;

varying vec3 vWorldDirection;
varying vec3 vPosition;

uniform vec3 uSunDirection;
uniform vec3 uMoonDirection;
uniform float uSunIntensity;
uniform float uMoonIntensity;
uniform float uMoonIllumination;
uniform float uTurbidity;
uniform float uRayleighScalar;
uniform float uMieScalar;
uniform float uMieAsymmetryG;
uniform float uOzoneScalar;
uniform float uExposure;
uniform float uTime;
uniform vec3 uGroundAlbedo;

#define PI 3.14159265358979323846
#define SUN_ANGULAR_RADIUS 0.00465421
#define MOON_ANGULAR_RADIUS 0.00450841

// Rayleigh phase function: P_R(theta) = 3 / (16*PI) * (1 + cos^2(theta))
float rayleighPhase(float cosTheta) {
  return (3.0 / (16.0 * PI)) * (1.0 + cosTheta * cosTheta);
}

// Cornette-Shanks formulation of the Henyey-Greenstein Mie phase function:
// P_M(theta) = (3 / (8*PI)) * ((1 - g^2) * (1 + cos^2(theta))) / ((2 + g^2) * (1 + g^2 - 2*g*cos(theta))^1.5)
float miePhase(float cosTheta, float g) {
  float g2 = g * g;
  float num = 3.0 * (1.0 - g2) * (1.0 + cosTheta * cosTheta);
  float den = (8.0 * PI) * (2.0 + g2) * pow(max(0.0001, 1.0 + g2 - 2.0 * g * cosTheta), 1.5);
  return num / den;
}

// Kasten & Young (1989) empirical optical airmass formula accounting for Earth atmospheric curvature:
// m(z) = 1.0 / (cos(z) + 0.50572 * (96.07995 - z)^(-1.6364))
float opticalAirmass(float cosZenith) {
  float zenithAngleDeg = acos(clamp(cosZenith, -1.0, 1.0)) * (180.0 / PI);
  if (zenithAngleDeg > 91.0) {
    return 38.0; // Clamped maximum optical thickness near astronomical horizon
  }
  float term = max(0.01, 96.07995 - zenithAngleDeg);
  return 1.0 / (max(0.0001, cosZenith) + 0.50572 * pow(term, -1.6364));
}

// Pierce (1993) Solar Limb Darkening:
// I(mu) = 1.0 - u*(1.0 - mu) - v*(1.0 - mu)^2 where mu = cos(angle from center)
float solarLimbDarkening(float mu) {
  float u = 0.429;
  float v = 0.107;
  float oneMinusMu = 1.0 - mu;
  return 1.0 - u * oneMinusMu - v * oneMinusMu * oneMinusMu;
}

// ACES Filmic Tone Mapping Curve (Narkowicz 2015 formulation)
vec3 acesFilmic(vec3 x) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  vec3 V = normalize(vWorldDirection);
  vec3 S = normalize(uSunDirection);
  vec3 M = normalize(uMoonDirection);

  float cosZenithV = max(0.001, V.y);
  float cosZenithS = S.y;
  float cosThetaSun = dot(V, S);
  float cosThetaMoon = dot(V, M);

  // Effective optical airmass along the line of sight and sun illumination path
  float viewAirmass = opticalAirmass(cosZenithV);
  float sunAirmass = opticalAirmass(max(0.01, cosZenithS));

  // Physical scattering and absorption coefficients for standard Earth atmosphere
  // Rayleigh: Wavelength-dependent (lambda^-4) -> intense blue sky
  vec3 betaRayleigh = vec3(5.802e-6, 13.558e-6, 33.100e-6) * uRayleighScalar;

  // Mie: Aerosol particles in the Terai basin, scaled by atmospheric turbidity (2.0 to 8.0)
  vec3 betaMie = vec3(2.100e-5) * (uTurbidity * 0.28) * uMieScalar;

  // Ozone (Chappuis band): Peak absorption in yellow/orange (550-650nm) -> deep cobalt twilight
  vec3 betaOzone = vec3(3.426e-7, 8.298e-7, 0.356e-7) * 12.0 * uOzoneScalar;

  // Extinction / Transmittance along sunlight traversal through atmosphere:
  // T_sun = exp(-(betaR * sR + betaM * sM + betaOzone * sOzone))
  vec3 totalExtinction = betaRayleigh * 8400.0 + betaMie * 1200.0 + betaOzone * 25000.0;
  vec3 opticalDepthSun = totalExtinction * sunAirmass;
  vec3 sunTransmittance = exp(-opticalDepthSun);

  // Single-scattering optical depth along viewer ray
  vec3 opticalDepthView = totalExtinction * viewAirmass;
  vec3 viewTransmittance = exp(-opticalDepthView);

  // Phase functions
  float pRayleigh = rayleighPhase(cosThetaSun);
  float pMie = miePhase(cosThetaSun, uMieAsymmetryG);

  // In-scattering single scattering integral approximation:
  // S = (betaR * pR + betaM * pM) * (T_sun * sunIntensity) * ((1.0 - viewTransmittance) / totalExtinction)
  vec3 inScatteringRayleigh = betaRayleigh * pRayleigh;
  vec3 inScatteringMie = betaMie * pMie;
  vec3 inScattering = (inScatteringRayleigh + inScatteringMie) * sunTransmittance * uSunIntensity;

  // Integrate along view path
  vec3 skyLuminance = inScattering * (vec3(1.0) - viewTransmittance) / max(vec3(1e-7), totalExtinction);

  // Terai Mountain Atmospheric Haze & Valley Mist Horizon Red-Shift:
  // As the sun approaches the horizon (cosZenithS -> 0), Rayleigh scattering completely extinguishes blue light,
  // leaving warm terracotta bronze, amber, and crimson light scattered forward through valley moisture.
  float horizonHazeBand = exp(-max(0.0, V.y) * (12.0 / max(1.0, uTurbidity)));
  vec3 sunsetHorizonGlow = vec3(1.0, 0.48, 0.18) * exp(-max(0.0, cosZenithS) * 6.0) * horizonHazeBand * (uTurbidity * 0.45);
  skyLuminance += sunsetHorizonGlow * uSunIntensity * (0.65 + 0.35 * cosThetaSun);

  // Deep Twilight Ozone Chappuis Blue:
  // When sun is below horizon (-0.01 to -0.2 rad), direct sunlight is gone, but stratospheric ozone scatters rich cobalt/indigo
  if (cosZenithS < 0.05) {
    float twilightFactor = smoothstep(-0.25, 0.02, cosZenithS) * smoothstep(0.05, -0.15, cosZenithS);
    vec3 ozoneBlue = vec3(0.06, 0.14, 0.38) * twilightFactor * (0.8 + 0.2 * V.y);
    skyLuminance += ozoneBlue;
  }

  // Solar Disk with Pierce Limb Darkening:
  // Angular distance to sun center
  float sunAngularDist = acos(clamp(cosThetaSun, -1.0, 1.0));
  if (sunAngularDist < SUN_ANGULAR_RADIUS && cosZenithS > -0.02) {
    float mu = sqrt(max(0.0, 1.0 - pow(sunAngularDist / SUN_ANGULAR_RADIUS, 2.0)));
    float limbIntensity = solarLimbDarkening(mu);
    vec3 solarDiskColor = sunTransmittance * uSunIntensity * limbIntensity * 28000.0;
    skyLuminance += solarDiskColor;
  }

  // Circumsolar Mie Aerosol Corona (Golden Halo)
  float circumsolarHalo = pow(max(0.0, cosThetaSun), 140.0) * (0.85 * uTurbidity) * uSunIntensity;
  skyLuminance += sunTransmittance * circumsolarHalo * vec3(1.0, 0.88, 0.65);

  // Lunar Atmospheric In-Scattering & Night Sky Ambient:
  // Night sky Rayleigh scattering from moonlight
  if (uMoonIntensity > 0.001) {
    float pRayleighMoon = rayleighPhase(cosThetaMoon);
    float pMieMoon = miePhase(cosThetaMoon, 0.72);
    vec3 moonInScattering = (betaRayleigh * pRayleighMoon + betaMie * pMieMoon * 0.25) * uMoonIntensity * uMoonIllumination;
    vec3 moonSky = moonInScattering * (vec3(1.0) - viewTransmittance) / max(vec3(1e-7), totalExtinction);
    // Cool lunar indigo tint
    skyLuminance += moonSky * vec3(0.68, 0.82, 1.0);
  }

  // Baseline Night Sky Airglow (Chemiluminescence at 557.7nm) & Cosmic Zodiacal Radiance
  vec3 nightAirglow = vec3(0.00045, 0.00085, 0.0016) * (0.4 + 0.6 * V.y);
  skyLuminance = max(skyLuminance, nightAirglow);

  // Ground plane haze blend for lower hemisphere
  if (V.y < 0.0) {
    float groundBlend = smoothstep(0.0, -0.15, V.y);
    vec3 groundColor = uGroundAlbedo * (skyLuminance * 0.15 + vec3(0.02, 0.02, 0.018));
    skyLuminance = mix(skyLuminance, groundColor, groundBlend);
  }

  // Photometric Exposure Tone Mapping (ACES Filmic)
  vec3 exposed = skyLuminance * uExposure;
  vec3 ldrColor = acesFilmic(exposed);

  // Gamma correction (sRGB transfer)
  vec3 finalColor = pow(ldrColor, vec3(1.0 / 2.2));

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// ============================================================================
// SECTION 4: GPU STARFIELD & CONSTELLATIONS (Pillar 3)
// ============================================================================

/**
 * Real Astronomical Bright Star Anchors (J2000 Equinox):
 * Used to anchor the 20,000 star instanced field and northern constellations.
 */
export const BRIGHT_STAR_CATALOG: StarCatalogEntry[] = [
  { name: 'Sirius', bayerDesignation: 'Alpha Canis Majoris', constellation: 'Canis Major', rightAscensionHours: 6.7525, declinationDeg: -16.7161, apparentMagnitude: -1.46, colorTemperatureK: 9940, spectralClass: 'A1V' },
  { name: 'Canopus', bayerDesignation: 'Alpha Carinae', constellation: 'Carina', rightAscensionHours: 6.3992, declinationDeg: -52.6958, apparentMagnitude: -0.74, colorTemperatureK: 7400, spectralClass: 'A9II' },
  { name: 'Arcturus', bayerDesignation: 'Alpha Boötis', constellation: 'Boötes', rightAscensionHours: 14.2611, declinationDeg: 19.1822, apparentMagnitude: -0.05, colorTemperatureK: 4286, spectralClass: 'K1.5III' },
  { name: 'Vega', bayerDesignation: 'Alpha Lyrae', constellation: 'Lyra', rightAscensionHours: 18.6156, declinationDeg: 38.7836, apparentMagnitude: 0.03, colorTemperatureK: 9602, spectralClass: 'A0V' },
  { name: 'Capella', bayerDesignation: 'Alpha Aurigae', constellation: 'Auriga', rightAscensionHours: 5.2781, declinationDeg: 45.9980, apparentMagnitude: 0.08, colorTemperatureK: 4970, spectralClass: 'G3III' },
  { name: 'Rigel', bayerDesignation: 'Beta Orionis', constellation: 'Orion', rightAscensionHours: 5.2422, declinationDeg: -8.2016, apparentMagnitude: 0.13, colorTemperatureK: 12100, spectralClass: 'B8Ia' },
  { name: 'Procyon', bayerDesignation: 'Alpha Canis Minoris', constellation: 'Canis Minor', rightAscensionHours: 7.6553, declinationDeg: 5.2250, apparentMagnitude: 0.34, colorTemperatureK: 6530, spectralClass: 'F5IV' },
  { name: 'Betelgeuse', bayerDesignation: 'Alpha Orionis', constellation: 'Orion', rightAscensionHours: 5.9194, declinationDeg: 7.4070, apparentMagnitude: 0.50, colorTemperatureK: 3600, spectralClass: 'M1-2Ia' },
  { name: 'Achernar', bayerDesignation: 'Alpha Eridani', constellation: 'Eridanus', rightAscensionHours: 1.6286, declinationDeg: -57.2367, apparentMagnitude: 0.46, colorTemperatureK: 15000, spectralClass: 'B3Vpe' },
  { name: 'Hadar', bayerDesignation: 'Beta Centauri', constellation: 'Centaurus', rightAscensionHours: 14.0639, declinationDeg: -60.3731, apparentMagnitude: 0.61, colorTemperatureK: 25000, spectralClass: 'B1III' },
  { name: 'Altair', bayerDesignation: 'Alpha Aquilae', constellation: 'Aquila', rightAscensionHours: 19.8464, declinationDeg: 8.8683, apparentMagnitude: 0.77, colorTemperatureK: 7700, spectralClass: 'A7V' },
  { name: 'Aldebaran', bayerDesignation: 'Alpha Tauri', constellation: 'Taurus', rightAscensionHours: 4.5986, declinationDeg: 16.5093, apparentMagnitude: 0.85, colorTemperatureK: 3900, spectralClass: 'K5III' },
  { name: 'Spica', bayerDesignation: 'Alpha Virginis', constellation: 'Virgo', rightAscensionHours: 13.4199, declinationDeg: -11.1614, apparentMagnitude: 0.98, colorTemperatureK: 25300, spectralClass: 'B1III' },
  { name: 'Antares', bayerDesignation: 'Alpha Scorpii', constellation: 'Scorpius', rightAscensionHours: 16.4900, declinationDeg: -26.4320, apparentMagnitude: 1.06, colorTemperatureK: 3660, spectralClass: 'M1.5Iab' },
  { name: 'Pollux', bayerDesignation: 'Beta Geminorum', constellation: 'Gemini', rightAscensionHours: 7.7553, declinationDeg: 28.0262, apparentMagnitude: 1.14, colorTemperatureK: 4666, spectralClass: 'K0III' },
  { name: 'Fomalhaut', bayerDesignation: 'Alpha Piscis Austrini', constellation: 'Piscis Austrinus', rightAscensionHours: 22.9608, declinationDeg: -29.6222, apparentMagnitude: 1.16, colorTemperatureK: 8590, spectralClass: 'A3V' },
  { name: 'Deneb', bayerDesignation: 'Alpha Cygni', constellation: 'Cygnus', rightAscensionHours: 20.6905, declinationDeg: 45.2803, apparentMagnitude: 1.25, colorTemperatureK: 8525, spectralClass: 'A2Ia' },
  { name: 'Regulus', bayerDesignation: 'Alpha Leonis', constellation: 'Leo', rightAscensionHours: 10.1395, declinationDeg: 11.9672, apparentMagnitude: 1.36, colorTemperatureK: 12460, spectralClass: 'B8IVn' },
  { name: 'Adhara', bayerDesignation: 'Epsilon Canis Majoris', constellation: 'Canis Major', rightAscensionHours: 6.9771, declinationDeg: -28.9721, apparentMagnitude: 1.50, colorTemperatureK: 22200, spectralClass: 'B2II' },
  { name: 'Castor', bayerDesignation: 'Alpha Geminorum', constellation: 'Gemini', rightAscensionHours: 7.5767, declinationDeg: 31.8883, apparentMagnitude: 1.58, colorTemperatureK: 10286, spectralClass: 'A1V' },
  { name: 'Bellatrix', bayerDesignation: 'Gamma Orionis', constellation: 'Orion', rightAscensionHours: 5.4189, declinationDeg: 6.3497, apparentMagnitude: 1.64, colorTemperatureK: 21800, spectralClass: 'B2III' },
  { name: 'Alnilam', bayerDesignation: 'Epsilon Orionis', constellation: 'Orion', rightAscensionHours: 5.6036, declinationDeg: -1.2019, apparentMagnitude: 1.69, colorTemperatureK: 27500, spectralClass: 'B0Ia' },
  { name: 'Alnitak', bayerDesignation: 'Zeta Orionis', constellation: 'Orion', rightAscensionHours: 5.6793, declinationDeg: -1.9426, apparentMagnitude: 1.74, colorTemperatureK: 29500, spectralClass: 'O9.5Ib' },
  { name: 'Mintaka', bayerDesignation: 'Delta Orionis', constellation: 'Orion', rightAscensionHours: 5.5334, declinationDeg: -0.2991, apparentMagnitude: 2.23, colorTemperatureK: 29800, spectralClass: 'O9.5II' },
  { name: 'Saiph', bayerDesignation: 'Kappa Orionis', constellation: 'Orion', rightAscensionHours: 5.7959, declinationDeg: -9.6696, apparentMagnitude: 2.07, colorTemperatureK: 26500, spectralClass: 'B0.5Ia' },
  { name: 'Polaris', bayerDesignation: 'Alpha Ursae Minoris', constellation: 'Ursa Minor', rightAscensionHours: 2.5297, declinationDeg: 89.2641, apparentMagnitude: 1.98, colorTemperatureK: 6015, spectralClass: 'F7Ib' },
  { name: 'Dubhe', bayerDesignation: 'Alpha Ursae Majoris', constellation: 'Ursa Major', rightAscensionHours: 11.0622, declinationDeg: 61.7508, apparentMagnitude: 1.79, colorTemperatureK: 4500, spectralClass: 'K0III' },
  { name: 'Merak', bayerDesignation: 'Beta Ursae Majoris', constellation: 'Ursa Major', rightAscensionHours: 11.0307, declinationDeg: 56.3824, apparentMagnitude: 2.37, colorTemperatureK: 9340, spectralClass: 'A1V' },
  { name: 'Phecda', bayerDesignation: 'Gamma Ursae Majoris', constellation: 'Ursa Major', rightAscensionHours: 11.8971, declinationDeg: 53.6948, apparentMagnitude: 2.44, colorTemperatureK: 9355, spectralClass: 'A0Ve' },
  { name: 'Megrez', bayerDesignation: 'Delta Ursae Majoris', constellation: 'Ursa Major', rightAscensionHours: 12.2570, declinationDeg: 57.0326, apparentMagnitude: 3.31, colorTemperatureK: 8630, spectralClass: 'A3V' },
  { name: 'Alioth', bayerDesignation: 'Epsilon Ursae Majoris', constellation: 'Ursa Major', rightAscensionHours: 12.9005, declinationDeg: 55.9598, apparentMagnitude: 1.77, colorTemperatureK: 9020, spectralClass: 'A0p' },
  { name: 'Mizar', bayerDesignation: 'Zeta Ursae Majoris', constellation: 'Ursa Major', rightAscensionHours: 13.3987, declinationDeg: 54.9254, apparentMagnitude: 2.23, colorTemperatureK: 9000, spectralClass: 'A2V' },
  { name: 'Alkaid', bayerDesignation: 'Eta Ursae Majoris', constellation: 'Ursa Major', rightAscensionHours: 13.7924, declinationDeg: 49.3133, apparentMagnitude: 1.86, colorTemperatureK: 15540, spectralClass: 'B3V' },
  { name: 'Schedar', bayerDesignation: 'Alpha Cassiopeiae', constellation: 'Cassiopeia', rightAscensionHours: 0.6751, declinationDeg: 56.5373, apparentMagnitude: 2.24, colorTemperatureK: 4530, spectralClass: 'K0IIIa' },
  { name: 'Caph', bayerDesignation: 'Beta Cassiopeiae', constellation: 'Cassiopeia', rightAscensionHours: 0.1529, declinationDeg: 59.1498, apparentMagnitude: 2.28, colorTemperatureK: 7079, spectralClass: 'F2III' },
  { name: 'Gamma Cas', bayerDesignation: 'Gamma Cassiopeiae', constellation: 'Cassiopeia', rightAscensionHours: 0.9452, declinationDeg: 60.7167, apparentMagnitude: 2.15, colorTemperatureK: 25000, spectralClass: 'B0IV:evar' },
  { name: 'Ruchbah', bayerDesignation: 'Delta Cassiopeiae', constellation: 'Cassiopeia', rightAscensionHours: 1.4273, declinationDeg: 60.2353, apparentMagnitude: 2.68, colorTemperatureK: 8400, spectralClass: 'A5V' },
  { name: 'Segin', bayerDesignation: 'Epsilon Cassiopeiae', constellation: 'Cassiopeia', rightAscensionHours: 1.9066, declinationDeg: 63.6701, apparentMagnitude: 3.35, colorTemperatureK: 15170, spectralClass: 'B3V' },
];

/**
 * Northern Hemisphere Constellation Line Segments (Orion, Ursa Major, Cassiopeia, etc.)
 */
export const CONSTELLATION_SEGMENTS: ConstellationSegment[] = [
  // Orion (The Hunter)
  { constellationName: 'Orion', star1: 'Betelgeuse', star2: 'Bellatrix', star1Coords: { raH: 5.9194, decDeg: 7.4070 }, star2Coords: { raH: 5.4189, decDeg: 6.3497 } },
  { constellationName: 'Orion', star1: 'Bellatrix', star2: 'Rigel', star1Coords: { raH: 5.4189, decDeg: 6.3497 }, star2Coords: { raH: 5.2422, decDeg: -8.2016 } },
  { constellationName: 'Orion', star1: 'Rigel', star2: 'Saiph', star1Coords: { raH: 5.2422, decDeg: -8.2016 }, star2Coords: { raH: 5.7959, decDeg: -9.6696 } },
  { constellationName: 'Orion', star1: 'Saiph', star2: 'Betelgeuse', star1Coords: { raH: 5.7959, decDeg: -9.6696 }, star2Coords: { raH: 5.9194, decDeg: 7.4070 } },
  { constellationName: 'Orion', star1: 'Alnitak', star2: 'Alnilam', star1Coords: { raH: 5.6793, decDeg: -1.9426 }, star2Coords: { raH: 5.6036, decDeg: -1.2019 } },
  { constellationName: 'Orion', star1: 'Alnilam', star2: 'Mintaka', star1Coords: { raH: 5.6036, decDeg: -1.2019 }, star2Coords: { raH: 5.5334, decDeg: -0.2991 } },

  // Ursa Major (Saptarishi / The Great Bear)
  { constellationName: 'Ursa Major', star1: 'Dubhe', star2: 'Merak', star1Coords: { raH: 11.0622, decDeg: 61.7508 }, star2Coords: { raH: 11.0307, decDeg: 56.3824 } },
  { constellationName: 'Ursa Major', star1: 'Merak', star2: 'Phecda', star1Coords: { raH: 11.0307, decDeg: 56.3824 }, star2Coords: { raH: 11.8971, decDeg: 53.6948 } },
  { constellationName: 'Ursa Major', star1: 'Phecda', star2: 'Megrez', star1Coords: { raH: 11.8971, decDeg: 53.6948 }, star2Coords: { raH: 12.2570, decDeg: 57.0326 } },
  { constellationName: 'Ursa Major', star1: 'Megrez', star2: 'Dubhe', star1Coords: { raH: 12.2570, decDeg: 57.0326 }, star2Coords: { raH: 11.0622, decDeg: 61.7508 } },
  { constellationName: 'Ursa Major', star1: 'Megrez', star2: 'Alioth', star1Coords: { raH: 12.2570, decDeg: 57.0326 }, star2Coords: { raH: 12.9005, decDeg: 55.9598 } },
  { constellationName: 'Ursa Major', star1: 'Alioth', star2: 'Mizar', star1Coords: { raH: 12.9005, decDeg: 55.9598 }, star2Coords: { raH: 13.3987, decDeg: 54.9254 } },
  { constellationName: 'Ursa Major', star1: 'Mizar', star2: 'Alkaid', star1Coords: { raH: 13.3987, decDeg: 54.9254 }, star2Coords: { raH: 13.7924, decDeg: 49.3133 } },

  // Cassiopeia (The Queen 'W' formation)
  { constellationName: 'Cassiopeia', star1: 'Caph', star2: 'Schedar', star1Coords: { raH: 0.1529, decDeg: 59.1498 }, star2Coords: { raH: 0.6751, decDeg: 56.5373 } },
  { constellationName: 'Cassiopeia', star1: 'Schedar', star2: 'Gamma Cas', star1Coords: { raH: 0.6751, decDeg: 56.5373 }, star2Coords: { raH: 0.9452, decDeg: 60.7167 } },
  { constellationName: 'Cassiopeia', star1: 'Gamma Cas', star2: 'Ruchbah', star1Coords: { raH: 0.9452, decDeg: 60.7167 }, star2Coords: { raH: 1.4273, decDeg: 60.2353 } },
  { constellationName: 'Cassiopeia', star1: 'Ruchbah', star2: 'Segin', star1Coords: { raH: 1.4273, decDeg: 60.2353 }, star2Coords: { raH: 1.9066, decDeg: 63.6701 } },
];

/**
 * Converts blackbody color temperature (Kelvin) to normalized linear sRGB color.
 * Implements Tanner Helland / Kang approximation of the Planckian locus.
 */
export function planckColorTemperatureToLinearRGB(tempK: number): [number, number, number] {
  const T = Math.max(1000.0, Math.min(40000.0, tempK)) / 100.0;
  let r: number;
  let g: number;
  let b: number;

  // Red
  if (T <= 66.0) {
    r = 255.0;
  } else {
    r = T - 60.0;
    r = 329.698727446 * Math.pow(r, -0.1332047592);
    r = Math.max(0.0, Math.min(255.0, r));
  }

  // Green
  if (T <= 66.0) {
    g = T;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
    g = Math.max(0.0, Math.min(255.0, g));
  } else {
    g = T - 60.0;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
    g = Math.max(0.0, Math.min(255.0, g));
  }

  // Blue
  if (T >= 66.0) {
    b = 255.0;
  } else if (T <= 19.0) {
    b = 0.0;
  } else {
    b = T - 10.0;
    b = 138.5177312231 * Math.log(b) - 305.0447927307;
    b = Math.max(0.0, Math.min(255.0, b));
  }

  // Normalize and convert from sRGB non-linear to linear photometric radiance
  const linR = Math.pow(r / 255.0, 2.2);
  const linG = Math.pow(g / 255.0, 2.2);
  const linB = Math.pow(b / 255.0, 2.2);

  return [linR, linG, linB];
}

/**
 * Converts Equatorial Celestial Coordinates (RA hours, Dec degrees) on unit sphere
 * into 3D Cartesian coordinates in the J2000 Celestial Equatorial reference frame.
 */
export function equatorialToCartesian(raHours: number, decDeg: number, radius = 1.0): THREE.Vector3 {
  const alpha = (raHours / 24.0) * (2.0 * Math.PI);
  const delta = THREE.MathUtils.degToRad(decDeg);
  const x = radius * Math.cos(delta) * Math.cos(alpha);
  const y = radius * Math.sin(delta); // +Y = Celestial North Pole
  const z = -radius * Math.cos(delta) * Math.sin(alpha);
  return new THREE.Vector3(x, y, z);
}

/**
 * Deterministic pseudo-random number generator (Mulberry32) for reproducible star fields.
 */
function createSeededRNG(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates 20,000 instanced starfield buffer attributes with real astronomical distribution:
 * - Real bright star catalog anchors.
 * - Milky Way galactic equator density concentration.
 * - Apparent visual magnitude (-1.46 to +6.5) flux scaling.
 * - Planck blackbody radiation temperature colors (3000K red giants to 35000K blue supermassive).
 */
export function generateStarfieldData(totalStars = 20000, seed = 42) {
  const rng = createSeededRNG(seed);
  const positions = new Float32Array(totalStars * 3);
  const colors = new Float32Array(totalStars * 3);
  const magnitudes = new Float32Array(totalStars);
  const twinkleParams = new Float32Array(totalStars * 2); // [phase, frequency]

  let starIdx = 0;

  // 1. Insert astronomically verified anchor stars
  for (const anchor of BRIGHT_STAR_CATALOG) {
    if (starIdx >= totalStars) break;
    const v = equatorialToCartesian(anchor.rightAscensionHours, anchor.declinationDeg, 1.0);
    positions[starIdx * 3 + 0] = v.x;
    positions[starIdx * 3 + 1] = v.y;
    positions[starIdx * 3 + 2] = v.z;

    const rgb = planckColorTemperatureToLinearRGB(anchor.colorTemperatureK);
    colors[starIdx * 3 + 0] = rgb[0];
    colors[starIdx * 3 + 1] = rgb[1];
    colors[starIdx * 3 + 2] = rgb[2];

    magnitudes[starIdx] = anchor.apparentMagnitude;
    twinkleParams[starIdx * 2 + 0] = rng() * Math.PI * 2.0;
    twinkleParams[starIdx * 2 + 1] = 1.0 + rng() * 2.5;

    starIdx++;
  }

  // 2. Procedural background stars with galactic latitude concentration
  while (starIdx < totalStars) {
    let raH = rng() * 24.0;
    let decDeg: number;

    // 40% of stars biased toward the galactic plane (Milky Way band)
    if (rng() < 0.45) {
      // Galactic plane passes near RA 5-6h, Dec +20-30° (Monoceros/Gemini) and RA 18-19h, Dec -10 to +30° (Cygnus/Sagittarius)
      const isSummerMilkyWay = rng() < 0.5;
      const centerRA = isSummerMilkyWay ? 19.0 : 6.0;
      const centerDec = isSummerMilkyWay ? 15.0 : 25.0;
      raH = (centerRA + (rng() - 0.5) * 5.0 + 24.0) % 24.0;
      decDeg = centerDec + (rng() - 0.5) * 35.0;
      decDeg = Math.max(-89.0, Math.min(89.0, decDeg));
    } else {
      // Uniform spherical distribution: dec = asin(2*u - 1)
      const u = rng();
      decDeg = THREE.MathUtils.radToDeg(Math.asin(2.0 * u - 1.0));
    }

    const v = equatorialToCartesian(raH, decDeg, 1.0);
    positions[starIdx * 3 + 0] = v.x;
    positions[starIdx * 3 + 1] = v.y;
    positions[starIdx * 3 + 2] = v.z;

    // Apparent visual magnitude: Log-power distribution where faint stars dominate
    // N(m) ~ 10^(0.6 * m), limit to magnitude +6.5
    const magRandom = Math.pow(rng(), 0.38);
    const mag = 2.0 + magRandom * 4.5; // Spread from +2.0 to +6.5
    magnitudes[starIdx] = mag;

    // Stellar spectral distribution (IMF): Mostly cool K/M dwarfs, fewer F/G, rare hot O/B stars
    let tempK: number;
    const spectralRoll = rng();
    if (spectralRoll < 0.55) {
      // M / K dwarfs (3000K to 4800K)
      tempK = 3100.0 + rng() * 1700.0;
    } else if (spectralRoll < 0.82) {
      // G / F stars (5200K to 7200K, like Sun)
      tempK = 5200.0 + rng() * 2000.0;
    } else if (spectralRoll < 0.96) {
      // A stars (7500K to 10000K, Sirius/Vega type)
      tempK = 7500.0 + rng() * 2500.0;
    } else {
      // B / O massive giants (11000K to 32000K, Rigel/Spica type)
      tempK = 11000.0 + rng() * 21000.0;
    }

    const rgb = planckColorTemperatureToLinearRGB(tempK);
    colors[starIdx * 3 + 0] = rgb[0];
    colors[starIdx * 3 + 1] = rgb[1];
    colors[starIdx * 3 + 2] = rgb[2];

    twinkleParams[starIdx * 2 + 0] = rng() * Math.PI * 2.0;
    twinkleParams[starIdx * 2 + 1] = 0.8 + rng() * 3.2;

    starIdx++;
  }

  return { positions, colors, magnitudes, twinkleParams };
}

/**
 * Vertex Shader for GPU Instanced Starfield:
 * Rotates celestial sphere in real time via Sidereal Matrix (LST + Latitude)
 * and scales point size based on astronomical apparent magnitude.
 */
export const STAR_VERT = /* glsl */ `
attribute float aMagnitude;
attribute vec3 aColor;
attribute vec2 aTwinkle; // [phase, frequency]

uniform mat4 uSiderealMatrix;
uniform float uTime;
uniform float uScintillationSpeed;
uniform float uDpr;
uniform float uSunAltitude;
uniform float uMoonIllumination;

varying vec3 vColor;
varying float vAlpha;

void main() {
  // Transform Equatorial J2000 coordinate to Local Topocentric Horizon coordinate
  vec4 horizonPos = uSiderealMatrix * vec4(position, 1.0);
  vec3 normPos = normalize(horizonPos.xyz);

  // Altitude check: suppress stars below horizon (normPos.y <= 0.0)
  float altitude = normPos.y;
  if (altitude <= -0.01) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // Clip offscreen
    gl_PointSize = 0.0;
    return;
  }

  // Astronomical Scintillation (Atmospheric Twinkling):
  // Harmonic oscillation modulated by optical airmass (stars near horizon twinkle intensely)
  float airmassFactor = 1.0 / max(0.08, altitude);
  float phase = aTwinkle.x;
  float freq = aTwinkle.y * uScintillationSpeed;
  float t = uTime * freq + phase;
  float twinkleNoise =
    sin(t) * 0.35 +
    sin(t * 2.3 + 1.2) * 0.25 +
    sin(t * 5.1 + 3.4) * 0.15;
  float twinkleIntensity = 1.0 + twinkleNoise * clamp(airmassFactor * 0.12, 0.15, 0.75);

  // Atmospheric Extinction (Greenstein formula): stars dim near horizon
  float extinction = exp(-0.18 * clamp(airmassFactor, 1.0, 14.0));

  // Daytime / Twilight suppression: Stars fade smoothly as Sun rises from -12° to -2°
  float sunFade = smoothstep(-2.0, -12.0, uSunAltitude);

  // Point size from Pogson's ratio: Flux = 10^(-0.4 * Magnitude)
  // Brighter stars have larger optical Airy disks
  float flux = pow(10.0, -0.22 * (aMagnitude - (-1.46)));
  float baseSize = 2.4 + flux * 5.8;
  gl_PointSize = clamp(baseSize * uDpr * twinkleIntensity * extinction, 1.5, 14.0);

  // Compute final alpha
  float alpha = clamp(twinkleIntensity * extinction * sunFade, 0.0, 1.0);
  vAlpha = alpha;
  vColor = aColor;

  // Project to sky dome background at far plane
  vec4 mvPosition = modelViewMatrix * vec4(normPos * 950.0, 1.0);
  gl_Position = (projectionMatrix * mvPosition).xyww;
}
`;

/**
 * Fragment Shader for GPU Instanced Starfield:
 * Renders smooth Gaussian optical point diffraction disks with chromatic core.
 */
export const STAR_FRAG = /* glsl */ `
precision mediump float;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float distSq = dot(coord, coord);
  if (distSq > 0.25) discard;

  // Gaussian Airy disk profile
  float radial = exp(-distSq * 18.0);
  float core = exp(-distSq * 60.0);

  // Luminous white core blending into Planckian temperature outer corona
  vec3 finalRgb = mix(vColor, vec3(1.0, 0.98, 0.95), core * 0.75);
  float finalAlpha = radial * vAlpha;

  if (finalAlpha <= 0.005) discard;
  gl_FragColor = vec4(finalRgb, finalAlpha);
}
`;

/**
 * Shaders for Northern Hemisphere Constellation Connecting Lines
 */
export const CONSTELLATION_VERT = /* glsl */ `
uniform mat4 uSiderealMatrix;
uniform float uSunAltitude;
uniform float uOpacity;

varying float vFade;

void main() {
  vec4 horizonPos = uSiderealMatrix * vec4(position, 1.0);
  vec3 normPos = normalize(horizonPos.xyz);

  // Suppress segments below the horizon
  float altitude = normPos.y;
  float horizonCut = smoothstep(0.02, 0.12, altitude);
  float sunFade = smoothstep(-4.0, -14.0, uSunAltitude);
  vFade = horizonCut * sunFade * uOpacity;

  vec4 mvPosition = modelViewMatrix * vec4(normPos * 945.0, 1.0);
  gl_Position = (projectionMatrix * mvPosition).xyww;
}
`;

export const CONSTELLATION_FRAG = /* glsl */ `
precision mediump float;

varying float vFade;
uniform vec3 uLineColor;

void main() {
  if (vFade <= 0.002) discard;
  gl_FragColor = vec4(uLineColor, vFade);
}
`;

// ============================================================================
// SECTION 5: PROCEDURAL LUNAR PHASE & WATER REFLECTION ENGINE (Pillar 4)
// ============================================================================

/**
 * Vertex Shader for 3D Lunar Mesh:
 * Billboards or orients the Moon toward observer camera at exact astronomical position.
 */
export const MOON_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

/**
 * Fragment Shader for Procedural Moon:
 * Evaluates Lommel-Seeliger scattering on lunar regolith, sub-solar terminator line,
 * dark-side Da Vinci Earthshine illumination, opposition surge, and procedural maria textures.
 */
export const MOON_FRAG = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

uniform vec3 uSunDirection;
uniform vec3 uMoonDirection;
uniform float uMoonPhaseAngle;
uniform float uEarthshineFactor;
uniform float uOppositionSurge;
uniform float uSunAltitude;

// Procedural 2D Hash & Value Noise for Lunar Maria (Sea of Tranquility / Imbrium)
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbmLunar(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.08;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 S = normalize(uSunDirection);
  vec3 V = normalize(cameraPosition - vWorldPos);

  // Sub-solar lighting angle
  float NdotS = dot(N, S);

  // Lommel-Seeliger scattering model for porous particulate lunar regolith:
  // L(alpha) = NdotS / (NdotS + NdotV)
  float NdotV = max(0.001, dot(N, V));
  float lommelSeeliger = max(0.0, NdotS) / (max(0.0, NdotS) + NdotV);

  // Procedural Maria Albedo Generation:
  // High-albedo anorthosite highlands vs dark basaltic plains
  vec2 lunarUv = vUv * vec2(4.0, 2.0);
  float n1 = fbmLunar(lunarUv * 3.5);
  float n2 = fbmLunar(lunarUv * 8.2 + vec2(1.7, 4.3));
  float craterRays = pow(abs(sin(lunarUv.x * 24.0 + n1 * 4.0)), 12.0) * 0.18;

  // Maria mask: dark smooth basalt beds
  float maria = smoothstep(0.42, 0.68, n1 * 0.7 + n2 * 0.3);
  vec3 basaltColor = vec3(0.24, 0.23, 0.22); // Dark lunar seas
  vec3 highlandColor = vec3(0.78, 0.77, 0.74); // Bright cratered highlands
  vec3 albedo = mix(highlandColor, basaltColor, maria) + vec3(craterRays);

  // Direct Solar Illumination on lit crescent
  float directSun = smoothstep(-0.04, 0.08, NdotS) * lommelSeeliger;
  vec3 litColor = albedo * vec3(1.0, 0.98, 0.92) * (directSun + uOppositionSurge * 0.25);

  // Earthshine (Ashen Light / Da Vinci Glow):
  // Sunlight bouncing off Earth's cloud tops and oceans onto the unlit lunar nightside
  // Characterized by delicate cool cyan-slate hue: vec3(0.038, 0.052, 0.075)
  float darkSide = smoothstep(0.06, -0.12, NdotS);
  vec3 earthshineColor = albedo * vec3(0.052, 0.072, 0.098) * darkSide * uEarthshineFactor;

  // Composite Lunar Radiance
  vec3 finalColor = litColor + earthshineColor;

  // Atmospheric horizon reddening when Moon is near horizon (altitude < 10°)
  float moonAlt = uMoonDirection.y;
  if (moonAlt < 0.2) {
    float extinctionR = exp(-max(0.0, 0.2 - moonAlt) * 4.0);
    finalColor *= vec3(1.0, 0.78 + 0.22 * extinctionR, 0.55 + 0.45 * extinctionR);
  }

  // Atmospheric day suppression
  float dayFade = smoothstep(2.0, -8.0, uSunAltitude);
  finalColor *= dayFade;

  // Soft spherical rim falloff
  float rim = smoothstep(0.0, 0.25, NdotV);

  gl_FragColor = vec4(finalColor, rim);
}
`;

/**
 * Specular Water Reflection Calculator for Courtyard Reflecting Basins & Lake Pools:
 * Calculates physical specular glitter path on ruffled water from Moon & Sun.
 */
export function computeCelestialWaterSpecular(
  normal: THREE.Vector3,
  viewDir: THREE.Vector3,
  lightDir: THREE.Vector3,
  lightColor: THREE.Color,
  lightIntensity: number,
  roughness = 0.08
): { specularColor: THREE.Color; specularIntensity: number } {
  // Blinn-Phong microfacet halfway vector
  const H = new THREE.Vector3().addVectors(lightDir, viewDir).normalize();
  const NdotH = Math.max(0.0, normal.dot(H));
  const NdotL = Math.max(0.0, normal.dot(lightDir));

  // Microfacet specular exponent: m = 2 / (roughness^2) - 2
  const exponent = Math.max(16.0, 2.0 / (roughness * roughness) - 2.0);
  const specFactor = Math.pow(NdotH, exponent) * NdotL;

  // Schlick Fresnel factor
  const VdotH = Math.max(0.0, viewDir.dot(H));
  const f0 = 0.02; // Water index of refraction n = 1.333 -> f0 = ((1.333-1)/(1.333+1))^2 = 0.02
  const fresnel = f0 + (1.0 - f0) * Math.pow(1.0 - VdotH, 5.0);

  const specularIntensity = specFactor * fresnel * lightIntensity;
  const specularColor = lightColor.clone().multiplyScalar(specularIntensity);

  return { specularColor, specularIntensity };
}

// ============================================================================
// SECTION 6: UNIFIED SYSTEM CLASS & LIFECYCLE MANAGEMENT
// ============================================================================

export class CelestialAtmosphereSystem {
  public config: CelestialAtmosphereConfig;
  public ephemeris: CelestialEphemerisState;

  // Three.js Scene Graphs & Objects
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera;
  private skyDomeMesh: THREE.Mesh | null = null;
  private skyDomeMaterial: THREE.ShaderMaterial | null = null;
  private starfieldPoints: THREE.Points | null = null;
  private starfieldMaterial: THREE.ShaderMaterial | null = null;
  private constellationLines: THREE.LineSegments | null = null;
  private constellationMaterial: THREE.ShaderMaterial | null = null;
  private moonMesh: THREE.Mesh | null = null;
  private moonMaterial: THREE.ShaderMaterial | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private moonLight: THREE.DirectionalLight | null = null;

  // Pre-allocated math objects to avoid GC pressure in RAF loop
  private readonly _vTemp = new THREE.Vector3();
  private readonly _cTemp = new THREE.Color();
  private readonly _mTemp = new THREE.Matrix4();

  // Internal clock
  private elapsedTimeSec = 0;

  constructor(camera: THREE.Camera, config?: Partial<CelestialAtmosphereConfig>) {
    this.camera = camera;
    this.config = { ...DEFAULT_CELESTIAL_CONFIG, ...config };

    // Initial astronomical calculation
    const now = new Date();
    this.ephemeris = computeCelestialEphemerisState(now, this.config.location);

    this.initSkyDome();
    this.initStarfield();
    this.initConstellations();
    this.initMoon();
    this.initLights();

    // Sync initial state
    this.syncUniforms();
  }

  /**
   * Initializes the Bruneton/Preetham Sky Dome Mesh
   */
  private initSkyDome(): void {
    // Large inverted sphere acting as the celestial background vault
    const skyGeo = new THREE.SphereGeometry(980.0, 48, 32);
    this.skyDomeMaterial = new THREE.ShaderMaterial({
      vertexShader: SKY_DOME_VERT,
      fragmentShader: SKY_DOME_FRAG,
      uniforms: {
        uSunDirection: { value: new THREE.Vector3() },
        uMoonDirection: { value: new THREE.Vector3() },
        uSunIntensity: { value: 1.0 },
        uMoonIntensity: { value: 0.0 },
        uMoonIllumination: { value: 0.0 },
        uTurbidity: { value: this.config.turbidity },
        uRayleighScalar: { value: this.config.rayleighFactor },
        uMieScalar: { value: this.config.mieFactor },
        uMieAsymmetryG: { value: this.config.mieAsymmetryG },
        uOzoneScalar: { value: this.config.ozoneFactor },
        uExposure: { value: this.config.exposure },
        uTime: { value: 0.0 },
        uGroundAlbedo: { value: new THREE.Vector3(0.18, 0.16, 0.14) }, // Travertine / alluvial soil albedo
      },
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    });

    this.skyDomeMesh = new THREE.Mesh(skyGeo, this.skyDomeMaterial);
    this.skyDomeMesh.renderOrder = -100;
  }

  /**
   * Initializes the 20,000 GPU Instanced Starfield Points
   */
  private initStarfield(): void {
    const data = generateStarfieldData(this.config.starCount);
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    starGeo.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3));
    starGeo.setAttribute('aMagnitude', new THREE.BufferAttribute(data.magnitudes, 1));
    starGeo.setAttribute('aTwinkle', new THREE.BufferAttribute(data.twinkleParams, 2));

    this.starfieldMaterial = new THREE.ShaderMaterial({
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      uniforms: {
        uSiderealMatrix: { value: new THREE.Matrix4() },
        uTime: { value: 0.0 },
        uScintillationSpeed: { value: this.config.starScintillationSpeed },
        uDpr: { value: typeof window !== 'undefined' ? window.devicePixelRatio || 1.0 : 1.0 },
        uSunAltitude: { value: 0.0 },
        uMoonIllumination: { value: 0.0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.starfieldPoints = new THREE.Points(starGeo, this.starfieldMaterial);
    this.starfieldPoints.renderOrder = -95;
    this.starfieldPoints.frustumCulled = false;
  }

  /**
   * Initializes the Northern Hemisphere Constellation Network Lines
   */
  private initConstellations(): void {
    const linePositions: number[] = [];
    for (const seg of CONSTELLATION_SEGMENTS) {
      const p1 = equatorialToCartesian(seg.star1Coords.raH, seg.star1Coords.decDeg, 1.0);
      const p2 = equatorialToCartesian(seg.star2Coords.raH, seg.star2Coords.decDeg, 1.0);
      linePositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }

    const constGeo = new THREE.BufferGeometry();
    constGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

    this.constellationMaterial = new THREE.ShaderMaterial({
      vertexShader: CONSTELLATION_VERT,
      fragmentShader: CONSTELLATION_FRAG,
      uniforms: {
        uSiderealMatrix: { value: new THREE.Matrix4() },
        uSunAltitude: { value: 0.0 },
        uOpacity: { value: this.config.constellationLineOpacity },
        uLineColor: { value: new THREE.Color(0x8faee8) }, // Delicate celestial cyan-white
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.constellationLines = new THREE.LineSegments(constGeo, this.constellationMaterial);
    this.constellationLines.renderOrder = -94;
    this.constellationLines.frustumCulled = false;
    this.constellationLines.visible = this.config.constellationsVisible;
  }

  /**
   * Initializes the 3D Procedural Moon Mesh
   */
  private initMoon(): void {
    // High-resolution sphere for the procedural Moon
    const moonGeo = new THREE.SphereGeometry(18.0, 36, 24);
    this.moonMaterial = new THREE.ShaderMaterial({
      vertexShader: MOON_VERT,
      fragmentShader: MOON_FRAG,
      uniforms: {
        uSunDirection: { value: new THREE.Vector3() },
        uMoonDirection: { value: new THREE.Vector3() },
        uMoonPhaseAngle: { value: 0.0 },
        uEarthshineFactor: { value: this.config.lunarEarthshineStrength },
        uOppositionSurge: { value: 0.0 },
        uSunAltitude: { value: 0.0 },
      },
      transparent: true,
      depthWrite: false,
    });

    this.moonMesh = new THREE.Mesh(moonGeo, this.moonMaterial);
    this.moonMesh.renderOrder = -90;
  }

  /**
   * Initializes Directional Lights for Sun & Moon
   */
  private initLights(): void {
    this.sunLight = new THREE.DirectionalLight(0xfff3db, 1.5);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 80;
    this.sunLight.shadow.camera.left = -15;
    this.sunLight.shadow.camera.right = 15;
    this.sunLight.shadow.camera.top = 15;
    this.sunLight.shadow.camera.bottom = -15;
    this.sunLight.shadow.bias = -0.0001;
    this.sunLight.shadow.normalBias = 0.02;

    this.moonLight = new THREE.DirectionalLight(0x7e9de8, 0.25);
    this.moonLight.castShadow = false; // Primary shadow caster is Sun; Moon provides soft fill
  }

  /**
   * Attaches all celestial elements to a Three.js scene
   */
  public attachToScene(scene: THREE.Scene): void {
    this.scene = scene;
    if (this.skyDomeMesh) scene.add(this.skyDomeMesh);
    if (this.starfieldPoints) scene.add(this.starfieldPoints);
    if (this.constellationLines) scene.add(this.constellationLines);
    if (this.moonMesh) scene.add(this.moonMesh);
    if (this.sunLight) scene.add(this.sunLight);
    if (this.moonLight) scene.add(this.moonLight);
  }

  /**
   * Detaches celestial elements from the Three.js scene
   */
  public detachFromScene(): void {
    if (!this.scene) return;
    if (this.skyDomeMesh) this.scene.remove(this.skyDomeMesh);
    if (this.starfieldPoints) this.scene.remove(this.starfieldPoints);
    if (this.constellationLines) this.scene.remove(this.constellationLines);
    if (this.moonMesh) this.scene.remove(this.moonMesh);
    if (this.sunLight) this.scene.remove(this.sunLight);
    if (this.moonLight) this.scene.remove(this.moonLight);
    this.scene = null;
  }

  /**
   * Sets observer location (Biratnagar, Dharan, or custom)
   */
  public setLocation(location: ObserverLocation): void {
    this.config.location = location;
    this.recomputeEphemeris();
  }

  /**
   * Sets time of day and calendar day of year
   */
  public setTime(hourOfDay: number, dayOfYear?: number): void {
    this.config.hourOfDay = hourOfDay;
    if (dayOfYear !== undefined) this.config.dayOfYear = dayOfYear;
    this.recomputeEphemeris();
  }

  /**
   * Convenience preset configuration (day, golden hour, twilight, night)
   */
  public setPreset(preset: 'day' | 'golden' | 'twilight' | 'night'): void {
    switch (preset) {
      case 'day':
        this.config.hourOfDay = 12.0; // High solar noon
        this.config.turbidity = 2.8;
        break;
      case 'golden':
        this.config.hourOfDay = 17.45; // Golden hour rake across eastern Terai
        this.config.turbidity = 4.2;
        break;
      case 'twilight':
        this.config.hourOfDay = 18.25; // Civil / Nautical deep twilight ozone blue
        this.config.turbidity = 3.6;
        break;
      case 'night':
        this.config.hourOfDay = 22.5; // Deep starry midnight
        this.config.turbidity = 2.2;
        break;
    }
    this.recomputeEphemeris();
  }

  /**
   * Recomputes ephemeris state from current config
   */
  private recomputeEphemeris(): void {
    const year = 2026;
    const jd = computeJulianDateFromDayOfYear(
      year,
      this.config.dayOfYear,
      this.config.hourOfDay,
      this.config.location.timezoneOffsetHours
    );

    const solar = computeSolarEphemeris(this.config.dayOfYear, this.config.hourOfDay, this.config.location, year);
    const lunar = computeLunarEphemeris(this.config.dayOfYear, this.config.hourOfDay, this.config.location, solar, year);
    const lstRad = computeLSTRadians(jd, this.config.location.longitudeDeg);

    const latRad = THREE.MathUtils.degToRad(this.config.location.latitudeDeg);
    const siderealRotationMatrix = new THREE.Matrix4();
    const mRotZ = new THREE.Matrix4().makeRotationY(lstRad);
    const mTiltX = new THREE.Matrix4().makeRotationX(Math.PI / 2.0 - latRad);
    siderealRotationMatrix.multiplyMatrices(mTiltX, mRotZ);

    this.ephemeris = {
      timestamp: new Date(),
      julianDate: jd,
      dayOfYear: this.config.dayOfYear,
      localHour: this.config.hourOfDay,
      location: this.config.location,
      solar,
      lunar,
      lstRadians: lstRad,
      siderealRotationMatrix,
    };

    this.syncUniforms();
  }

  /**
   * Synchronizes shader uniforms and Three.js directional lights with updated ephemeris
   */
  private syncUniforms(): void {
    const { solar, lunar, siderealRotationMatrix } = this.ephemeris;

    // 1. Sky Dome Uniforms
    if (this.skyDomeMaterial) {
      const u = this.skyDomeMaterial.uniforms;
      u.uSunDirection.value.copy(solar.directionVector);
      u.uMoonDirection.value.copy(lunar.directionVector);
      u.uTurbidity.value = this.config.turbidity;
      u.uRayleighScalar.value = this.config.rayleighFactor;
      u.uMieScalar.value = this.config.mieFactor;
      u.uMieAsymmetryG.value = this.config.mieAsymmetryG;
      u.uOzoneScalar.value = this.config.ozoneFactor;
      u.uExposure.value = this.config.exposure;

      // Sun intensity curves based on solar altitude
      const sunAlt = solar.apparentAltitudeDeg;
      if (sunAlt > 0.0) {
        u.uSunIntensity.value = Math.sin(THREE.MathUtils.degToRad(sunAlt)) * 1.5 + 0.1;
      } else if (sunAlt > -12.0) {
        u.uSunIntensity.value = Math.max(0.0, 1.0 + sunAlt / 12.0) * 0.1;
      } else {
        u.uSunIntensity.value = 0.0;
      }

      // Moon intensity
      const moonAlt = lunar.apparentAltitudeDeg;
      if (moonAlt > 0.0) {
        u.uMoonIntensity.value = Math.sin(THREE.MathUtils.degToRad(moonAlt)) * 0.35 * lunar.illuminatedFraction;
      } else {
        u.uMoonIntensity.value = 0.0;
      }
      u.uMoonIllumination.value = lunar.illuminatedFraction;
    }

    // 2. Starfield Uniforms
    if (this.starfieldMaterial) {
      const u = this.starfieldMaterial.uniforms;
      u.uSiderealMatrix.value.copy(siderealRotationMatrix);
      u.uSunAltitude.value = solar.apparentAltitudeDeg;
      u.uMoonIllumination.value = lunar.illuminatedFraction;
      u.uScintillationSpeed.value = this.config.starScintillationSpeed;
    }

    // 3. Constellation Uniforms
    if (this.constellationMaterial) {
      const u = this.constellationMaterial.uniforms;
      u.uSiderealMatrix.value.copy(siderealRotationMatrix);
      u.uSunAltitude.value = solar.apparentAltitudeDeg;
      u.uOpacity.value = this.config.constellationLineOpacity;
    }
    if (this.constellationLines) {
      this.constellationLines.visible = this.config.constellationsVisible;
    }

    // 4. Moon Mesh Positioning & Uniforms
    if (this.moonMesh && this.moonMaterial) {
      // Place Moon at distance 800 along lunar direction vector
      const moonPos = lunar.directionVector.clone().multiplyScalar(800.0);
      this.moonMesh.position.copy(moonPos);
      this.moonMesh.lookAt(0, 0, 0); // Orient toward origin

      const u = this.moonMaterial.uniforms;
      u.uSunDirection.value.copy(solar.directionVector);
      u.uMoonDirection.value.copy(lunar.directionVector);
      u.uMoonPhaseAngle.value = lunar.phaseAngleDeg;
      u.uEarthshineFactor.value = this.config.lunarEarthshineStrength * lunar.earthshineFactor;
      u.uOppositionSurge.value = lunar.oppositionSurge;
      u.uSunAltitude.value = solar.apparentAltitudeDeg;

      this.moonMesh.visible = lunar.apparentAltitudeDeg > -2.0;
    }

    // 5. Directional Lights
    if (this.sunLight) {
      const sunDist = 30.0;
      this.sunLight.position.copy(solar.directionVector).multiplyScalar(sunDist);

      const alt = solar.apparentAltitudeDeg;
      if (alt > 0) {
        // Daytime / Golden hour color shift
        const tGolden = Math.max(0.0, Math.min(1.0, alt / 15.0));
        // Deep warm amber at horizon -> crisp architectural cream at noon
        this.sunLight.color.lerpColors(new THREE.Color(0xff8833), new THREE.Color(0xfff5e6), tGolden);
        this.sunLight.intensity = Math.max(0.05, Math.sin(THREE.MathUtils.degToRad(alt))) * 2.2;
      } else {
        this.sunLight.intensity = 0.0;
      }
    }

    if (this.moonLight) {
      const moonDist = 30.0;
      this.moonLight.position.copy(lunar.directionVector).multiplyScalar(moonDist);

      const mAlt = lunar.apparentAltitudeDeg;
      if (mAlt > 0 && solar.apparentAltitudeDeg < 0) {
        this.moonLight.color.setHex(0x9dbcee); // Soft celestial silver-blue
        this.moonLight.intensity = (Math.sin(THREE.MathUtils.degToRad(mAlt)) * 0.45 * lunar.illuminatedFraction);
      } else {
        this.moonLight.intensity = 0.0;
      }
    }
  }

  /**
   * Main Frame Update Loop:
   * Centers the celestial sphere on the active camera to ensure infinite depth,
   * advances scintillation timers, and updates dynamic uniforms.
   */
  public update(deltaSec: number, camera?: THREE.Camera): void {
    if (camera) this.camera = camera;
    this.elapsedTimeSec += deltaSec;

    const camPos = this.camera.position;

    // Follow camera position (celestial vault at infinity)
    if (this.skyDomeMesh) this.skyDomeMesh.position.copy(camPos);
    if (this.starfieldPoints) this.starfieldPoints.position.copy(camPos);
    if (this.constellationLines) this.constellationLines.position.copy(camPos);

    // Update temporal noise uniforms
    if (this.skyDomeMaterial) {
      this.skyDomeMaterial.uniforms.uTime.value = this.elapsedTimeSec;
    }
    if (this.starfieldMaterial) {
      this.starfieldMaterial.uniforms.uTime.value = this.elapsedTimeSec;
    }
  }

  // ==========================================================================
  // Public Getter APIs for Lighting, Color, and Reflection Integration
  // ==========================================================================

  public getSunDirection(): THREE.Vector3 {
    return this.ephemeris.solar.directionVector.clone();
  }

  public getMoonDirection(): THREE.Vector3 {
    return this.ephemeris.lunar.directionVector.clone();
  }

  public getSunLightColor(): THREE.Color {
    return this.sunLight ? this.sunLight.color.clone() : new THREE.Color(0xffffff);
  }

  public getMoonLightColor(): THREE.Color {
    return this.moonLight ? this.moonLight.color.clone() : new THREE.Color(0x7e9de8);
  }

  public getSunIntensity(): number {
    return this.sunLight ? this.sunLight.intensity : 0.0;
  }

  public getMoonIntensity(): number {
    return this.moonLight ? this.moonLight.intensity : 0.0;
  }

  public getAmbientLightColor(): THREE.Color {
    const alt = this.ephemeris.solar.apparentAltitudeDeg;
    if (alt > 10.0) {
      // Crisp daytime sky hemisphere ambient
      return new THREE.Color(0x556b8a);
    } else if (alt > -2.0) {
      // Warm golden hour terracotta ambient
      return new THREE.Color(0x8a5538);
    } else if (alt > -12.0) {
      // Deep twilight ozone blue ambient
      return new THREE.Color(0x18243b);
    } else {
      // Starry night indigo/charcoal ambient
      return new THREE.Color(0x0a0e17);
    }
  }

  public isNight(): boolean {
    return this.ephemeris.solar.apparentAltitudeDeg < -12.0;
  }

  public isGoldenHour(): boolean {
    const alt = this.ephemeris.solar.apparentAltitudeDeg;
    return alt >= -1.0 && alt <= 12.0;
  }

  public isTwilight(): boolean {
    const alt = this.ephemeris.solar.apparentAltitudeDeg;
    return alt < -1.0 && alt >= -12.0;
  }

  public getEphemeris(): CelestialEphemerisState {
    return this.ephemeris;
  }

  public setConstellationsVisible(visible: boolean): void {
    this.config.constellationsVisible = visible;
    if (this.constellationLines) this.constellationLines.visible = visible;
  }

  public setTurbidity(turbidity: number): void {
    this.config.turbidity = Math.max(1.5, Math.min(10.0, turbidity));
    if (this.skyDomeMaterial) {
      this.skyDomeMaterial.uniforms.uTurbidity.value = this.config.turbidity;
    }
  }

  /**
   * Evaluates specular reflection highlights on architectural water planes
   * (e.g. courtyard reflecting basin) from current celestial bodies.
   */
  public computeWaterSpecular(
    waterNormal: THREE.Vector3,
    viewDirection: THREE.Vector3,
    roughness = 0.08
  ): {
    sunSpecular: THREE.Color;
    moonSpecular: THREE.Color;
    dominantLightDirection: THREE.Vector3;
  } {
    const sunRes = computeCelestialWaterSpecular(
      waterNormal,
      viewDirection,
      this.getSunDirection(),
      this.getSunLightColor(),
      this.getSunIntensity(),
      roughness
    );

    const moonRes = computeCelestialWaterSpecular(
      waterNormal,
      viewDirection,
      this.getMoonDirection(),
      this.getMoonLightColor(),
      this.getMoonIntensity(),
      roughness
    );

    const isSunDominant = this.getSunIntensity() > this.getMoonIntensity();
    const dominantLightDirection = isSunDominant ? this.getSunDirection() : this.getMoonDirection();

    return {
      sunSpecular: sunRes.specularColor,
      moonSpecular: moonRes.specularColor,
      dominantLightDirection,
    };
  }

  /**
   * Cleanly disposes of all WebGL buffers, materials, geometries, and scene elements
   */
  public dispose(): void {
    this.detachFromScene();

    if (this.skyDomeMesh) {
      this.skyDomeMesh.geometry.dispose();
      this.skyDomeMaterial?.dispose();
    }
    if (this.starfieldPoints) {
      this.starfieldPoints.geometry.dispose();
      this.starfieldMaterial?.dispose();
    }
    if (this.constellationLines) {
      this.constellationLines.geometry.dispose();
      this.constellationMaterial?.dispose();
    }
    if (this.moonMesh) {
      this.moonMesh.geometry.dispose();
      this.moonMaterial?.dispose();
    }
    if (this.sunLight) this.sunLight.dispose();
    if (this.moonLight) this.moonLight.dispose();
  }
}

/**
 * Factory helper function to mount the celestial atmospheric system in one call
 */
export function createCelestialAtmosphere(
  scene: THREE.Scene,
  camera: THREE.Camera,
  options?: Partial<CelestialAtmosphereConfig>
): CelestialAtmosphereSystem {
  const system = new CelestialAtmosphereSystem(camera, options);
  system.attachToScene(scene);
  return system;
}
