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

export { onScroll, scrollState, scrollToTarget, getScrollLimit, resizeScroll, stopScroll, startScroll } from './scroll';
export { setTransition, holdEnter } from './transition';
export { setLoaderFormat, setLoaderExit, registerLoaderTask } from './loader';
export { hideGL, pauseGL, resumeGL, setBackground, clearBackground, glSupported, setGLDusk, getGLDusk } from './gl';
export { ease, isTouch, isMobile, prefersReducedMotion, getQualityTier } from './env';
export { studioAudio } from './audio';
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
    const c = fn({ intro: intro!, path: location.pathname });
    if (typeof c === 'function') cleanups.push(c);
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
  stopScroll();
  await ensureFontsReady();
  initPage();
  await runLoader();
  startScroll();
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
