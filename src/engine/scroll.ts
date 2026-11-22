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
const state: ScrollState = { y: 0, velocity: 0, progress: 0 };

export function initScroll() {
  bindScrollEnd();
  if (lenis || prefersReducedMotion()) {
    if (!lenis) addEventListener('scroll', nativeTick, { passive: true });
    return;
  }
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1.0,
    touchMultiplier: 1.2,
    anchors: true,
  });
  lenis.on('scroll', (l: Lenis) => {
    state.y = l.scroll;
    state.velocity = l.velocity;
    state.progress = l.limit > 0 ? l.scroll / l.limit : 0;
    if (ScrollTrigger.getAll().length > 0) ScrollTrigger.update();
    dispatchScroll(state);
  });
  gsap.ticker.add((time) => lenis?.raf(time * 1000), false, true);
  gsap.ticker.lagSmoothing(0);
}

function nativeTick() {
  const max = document.documentElement.scrollHeight - innerHeight;
  state.velocity = scrollY - state.y;
  state.y = scrollY;
  state.progress = max > 0 ? scrollY / max : 0;
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
