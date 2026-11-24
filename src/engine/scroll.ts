import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './env';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

let lenis: Lenis | null = null;
let lockDepth = 0;
let scrollEndBound = false;
const permanentListeners = new Set<(s: ScrollState) => void>();
const pageListeners = new Set<(s: ScrollState) => void>();

function dispatchScroll(s: ScrollState) {
  permanentListeners.forEach((fn) => fn(s));
  pageListeners.forEach((fn) => fn(s));
}

function bindScrollEnd() {
  if (scrollEndBound || typeof window === 'undefined') return;
  scrollEndBound = true;
  window.addEventListener(
    'scrollend',
    (e) => {
      if ((lenis as any)?.isScrolling) {
        e.stopImmediatePropagation();
      }
    },
    { capture: true }
  );
}

export type ScrollState = { y: number; velocity: number; progress: number };
export type UniformBus = {
  progress: number;
  velocity: number;
  pointerX: number;
  pointerY: number;
  pointerVelocity: number;
};

const state: ScrollState = { y: 0, velocity: 0, progress: 0 };
export const uniformBus: UniformBus = {
  progress: 0,
  velocity: 0,
  pointerX: 0.5,
  pointerY: 0.5,
  pointerVelocity: 0,
};

let prevPtrX = 0.5;
let prevPtrY = 0.5;
let ptrBound = false;

function bindUniformPointer() {
  if (ptrBound || typeof window === 'undefined') return;
  ptrBound = true;
  window.addEventListener(
    'pointermove',
    (e) => {
      const vw = window.innerWidth || 1;
      const vh = window.innerHeight || 1;
      const nx = e.clientX / vw;
      const ny = e.clientY / vh;
      const dv = Math.hypot(nx - prevPtrX, ny - prevPtrY);
      prevPtrX = nx;
      prevPtrY = ny;
      uniformBus.pointerX = nx;
      uniformBus.pointerY = ny;
      uniformBus.pointerVelocity = Math.min(1, uniformBus.pointerVelocity * 0.65 + dv * 12);
    },
    { passive: true }
  );
}

export function initScroll() {
  bindScrollEnd();
  bindUniformPointer();
  if (lenis || prefersReducedMotion()) {
    if (!lenis) addEventListener('scroll', nativeTick, { passive: true });
    return;
  }
  lenis = new Lenis({
    autoRaf: false,
    duration: 1.18,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1.0,
    touchMultiplier: 1.5,
    syncTouch: true,
    anchors: true,
  });
  lenis.on('scroll', (l: Lenis) => {
    state.y = l.scroll;
    state.velocity = l.velocity;
    state.progress = l.limit > 0 ? l.scroll / l.limit : 0;
    uniformBus.progress = state.progress;
    uniformBus.velocity = state.velocity;
    if (ScrollTrigger.getAll().length > 0) ScrollTrigger.update();
    dispatchScroll(state);
  });
  gsap.ticker.add((time) => {
    uniformBus.pointerVelocity *= 0.9;
    lenis?.raf(time * 1000);
  }, false, true);
  gsap.ticker.lagSmoothing(0);
}

function nativeTick() {
  const max = document.documentElement.scrollHeight - innerHeight;
  state.velocity = scrollY - state.y;
  state.y = scrollY;
  state.progress = max > 0 ? scrollY / max : 0;
  uniformBus.progress = state.progress;
  uniformBus.velocity = state.velocity;
  dispatchScroll(state);
}

export const onScroll = (fn: (s: ScrollState) => void, isPermanent = false) => {
  const target = isPermanent ? permanentListeners : pageListeners;
  target.add(fn);
  return () => target.delete(fn);
};

export function clearPageScrollListeners() {
  pageListeners.clear();
}
export const scrollState = () => state;
export function getNormalizedVelocity(): number {
  return Math.max(-1, Math.min(1, state.velocity / 35));
}

export function stopScroll() {
  lockDepth++;
  if (lockDepth === 1) lenis?.stop();
}

export function startScroll() {
  lockDepth = Math.max(0, lockDepth - 1);
  if (lockDepth === 0) lenis?.start();
}

export function resetScroll() {
  lockDepth = 0;
  if (lenis) {
    lenis.scrollTo(0, { immediate: true, force: true });
    lenis.start();
  } else {
    scrollTo(0, 0);
  }
  state.y = 0;
  state.velocity = 0;
  state.progress = 0;
}
export function resizeScroll() {
  lenis?.resize();
}
export function getScrollLimit(): number {
  lenis?.resize();
  if (lenis && lenis.limit > 0) return lenis.limit;
  return Math.max(0, document.documentElement.scrollHeight - innerHeight);
}
export function scrollToTarget(
  target: string | HTMLElement | number,
  opts?: { duration?: number; immediate?: boolean; onComplete?: () => void }
) {
  if (lenis) {
    lenis.scrollTo(target, {
      duration: opts?.immediate ? 0 : (opts?.duration ?? 1.2),
      immediate: opts?.immediate ?? false,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      onComplete: opts?.onComplete,
    });
  } else if (typeof target === 'number') {
    scrollTo({ top: target, behavior: opts?.immediate ? 'auto' : 'smooth' });
    opts?.onComplete?.();
  } else {
    (typeof target === 'string' ? document.querySelector(target) : target)?.scrollIntoView();
    opts?.onComplete?.();
  }
}
