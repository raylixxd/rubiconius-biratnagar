import { gsap } from 'gsap';
import { initScroll, resetScroll, resizeScroll, startScroll, stopScroll, clearPageScrollListeners } from './scroll';
import { initReveals, ensureFontsReady, revertSplits } from './reveal';
import { initGL, mountGL, unmountGL, setGLDusk } from './gl';
import { mountSeam, unmountSeam } from './gl/seam';
import { mountChromaticAberration, unmountChromaticAberration } from './gl/chromatic';
import { unmountDissolvePass } from './gl/dissolve';
import { bindFlipClicks, completeFlip } from './gl/flip';
import { mountShowcase, unmountShowcase } from './showcase';
import { initCursor, initMagnetic } from './interactions';
import { runLoader } from './loader';
import { playEnter, playLeave } from './transition';
import { prefersReducedMotion } from './env';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export { onScroll, scrollState, uniformBus, getNormalizedVelocity, scrollToTarget, getScrollLimit, resizeScroll, stopScroll, startScroll } from './scroll';
export { setTransition, holdEnter } from './transition';
export { setLoaderFormat, setLoaderExit, registerLoaderTask } from './loader';
export { hideGL, pauseGL, resumeGL, setBackground, clearBackground, glSupported, setGLDusk, getGLDusk, setRunwayState } from './gl';
export { ease, isTouch, isMobile, prefersReducedMotion, getQualityTier } from './env';
export { soundEngine, studioAudio } from './soundEngine';
export {
  ChromaticAberrationPass,
  createChromaticPass,
  mountChromaticAberration,
  unmountChromaticAberration,
  setChromaticVelocity,
  setChromaticConfig,
  getChromaticState,
  isChromaticSupported,
  CHROMATIC_VERT,
  CHROMATIC_FRAG,
  type ChromaticAberrationOptions,
  type ChromaticPassState,
} from './gl/chromatic';
export {
  BronzeDissolvePass,
  createDissolvePass,
  mountDissolvePass,
  unmountDissolvePass,
  triggerRouteDissolve,
  setDissolveProgress,
  getDissolveState,
  isDissolveSupported,
  DISSOLVE_VERT,
  DISSOLVE_FRAG,
  type DissolvePassOptions,
  type RouteDissolveConfig,
  type DissolvePassState,
  type DissolveDirection,
} from './gl/dissolve';
export {
  LiquidDisplacementEngine,
  WaveEquationSolver,
  SnellRefractionDispersion,
  WaterCausticsGenerator,
  DropletMetaballPhysics,
  createLiquidDisplacement,
  mountLiquidDisplacement,
  createThreeLiquidSurface,
  OGLLiquidDisplacementPass,
  getLiquidPreset,
  isLiquidDisplacementSupported,
  LIQUID_PRESETS,
  WAVE_SOLVER_FRAG,
  WAVE_SPLAT_FRAG,
  WAVE_NORMAL_FRAG,
  REFRACTION_DISPERSION_FRAG,
  CAUSTICS_GEN_FRAG,
  METABALL_FIELD_FRAG,
  type LiquidPresetName,
  type WaveSolverOptions,
  type RefractionOptions,
  type CausticsOptions,
  type DropletPhysicsOptions,
  type LiquidDisplacementOptions,
  type LiquidDisplacementHandle,
  type ThreeLiquidSurfaceMeshOptions,
  type ThreeLiquidSurfaceHandle,
  type DropletState,
  type ImpulseOptions,
} from './gl/liquidDisplacement';
export {
  BlueprintEngine,
  createBlueprintEngine,
  RUBICONIUS_COMMISSIONS,
  BLUEPRINT_THEMES,
  OSnapManager,
  distance,
  midpoint,
  angleRadians,
  angleDegrees,
  formatMetricMm,
  formatElevationM,
  snapToOrtho,
  computeBounds,
  type RubiconiusCommissionId,
  type BlueprintThemeId,
  type BlueprintTool,
  type SnapType,
  type SnapPoint,
  type CADPoint,
  type CADBounds,
  type CADLineStyle,
  type CADLineElement,
  type CADRectElement,
  type CADArcElement,
  type CADPolylineElement,
  type CADTextElement,
  type CADGeometryElement,
  type CADDatum,
  type CADDimension,
  type CADLeader,
  type CADHatch,
  type CADMeasurement,
  type RubiconiusCommission,
  type ViewportState,
  type BlueprintTheme,
  type SVGExportOptions,
  type BlueprintEngineOptions,
  type CADTelemetry,
} from './blueprintEngine';

export type PageFn = (page: { intro: gsap.core.Timeline; path: string }) => void | (() => void);
const pageFns = new Set<PageFn>();
const cleanups: (() => void)[] = [];
let ctx: gsap.Context | null = null;
let intro: gsap.core.Timeline | null = null;
let ready = false;
let booted = false;

export function onPage(fn: PageFn) {
  pageFns.add(fn);
  if (ready) runPageFn(fn);
  return () => { pageFns.delete(fn); };
}

function runPageFn(fn: PageFn) {
  ctx?.add(() => {
    try {
      const c = fn({ intro: intro!, path: location.pathname });
      if (typeof c === 'function') cleanups.push(c);
    } catch (err) {
      console.error('[engine] page init error:', err);
    }
  });
}

export function syncFlags() {
  const docEl = document.documentElement;
  const h = docEl.classList;
  h.add('js', 'is-booted');
  h.toggle('motion', !prefersReducedMotion());
  if (document.querySelector('.gl-canvas')) h.add('gl-on');
  delete docEl.dataset.lighting;
  setGLDusk(0);
}

function initPage() {
  syncFlags();
  document.getElementById('cursor')?.classList.remove('is-active');
  ctx = gsap.context(() => {
    intro = initReveals(document);
    initMagnetic(document);
  });
  mountGL(document);
  mountSeam(document);
  mountShowcase(document);
  mountChromaticAberration();
  ready = true;
  pageFns.forEach(runPageFn);
  requestAnimationFrame(() => {
    resizeScroll();
    if (ScrollTrigger.getAll().length > 0) ScrollTrigger.refresh();
  });
}

export async function boot(setup?: () => void) {
  if (booted) return;
  booted = true;
  syncFlags();
  initScroll();
  if (document.querySelector('[data-gl], [data-showcase-gl], [data-gl-seam]')) initGL();
  initCursor();
  bindFlipClicks();
  setup?.();
  await Promise.race([ensureFontsReady(), new Promise((r) => setTimeout(r, 1500))]);
  try {
    initPage();
  } catch (err) {
    console.error('[engine] initPage error:', err);
  }
  await runLoader();
  intro?.play();
}

export async function leave(skipCurtain = false) {
  stopScroll();
  if (!skipCurtain) await playLeave();
}

export function cleanup() {
  if (!ready) return;
  ready = false;
  cleanups.splice(0).forEach((c) => c());
  clearPageScrollListeners();
  revertSplits();
  unmountShowcase();
  unmountSeam();
  unmountChromaticAberration();
  unmountDissolvePass();
  ctx?.revert();
  ctx = null;
  unmountGL();
}

export async function enter({ transition = true, scrollTop = true } = {}) {
  if (!booted) return;
  cleanup();
  if (scrollTop) resetScroll();
  await ensureFontsReady();
  initPage();
  const flipDone = completeFlip();
  if (transition) await playEnter();
  await flipDone;
  startScroll();
  intro?.play();
}
