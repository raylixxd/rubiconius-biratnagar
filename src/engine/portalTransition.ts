/**
 * Portal Transition Router - Rubiconius Biratnagar
 *
 * Reverse-engineered & extracted from 06_unseen architecture:
 * 1. Contextual transition router supporting 7 named transitions:
 *    `toHome`, `toWorks`, `toProject`, `projectToProject`, `toPractice`, `toShowroom`, and `default`.
 * 2. WebGL FLIP camera zoom / canvas coordinate handoff & expanding aperture overlays during Astro client navigation.
 * 3. Scroll memory and Lenis re-initialization hook on route change without page flicker.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ease, prefersReducedMotion, isMobile } from './env';
import {
  resetScroll,
  startScroll,
  stopScroll,
  resizeScroll,
  scrollToTarget,
  scrollState,
} from './scroll';
import { setGLDusk } from './gl';
import { hasPendingFlip, cancelFlip, completeFlip } from './gl/flip';

// Register GSAP plugins safely
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// ---------------------------------------------------------------------------
// TYPES & INTERFACES
// ---------------------------------------------------------------------------

export type RouteName =
  | 'home'
  | 'works'
  | 'project'
  | 'practice'
  | 'showroom'
  | 'unknown';

export type TransitionName =
  | 'toHome'
  | 'toWorks'
  | 'toProject'
  | 'projectToProject'
  | 'toPractice'
  | 'toShowroom'
  | 'default';

export interface TransitionContext {
  fromPath: string;
  toPath: string;
  fromRoute: RouteName;
  toRoute: RouteName;
  transitionName: TransitionName | string;
  triggerElement: HTMLElement | null;
  navigationType: 'push' | 'replace' | 'traverse';
  direction: 'forward' | 'back' | 'none';
  clickCoords?: { x: number; y: number } | null;
  flipOrigin?: FlipOriginData | null;
  curtainEl?: HTMLElement | null;
  apertureEl?: HTMLElement | null;
  customData: Record<string, unknown>;
}

export interface TransitionHooks {
  name: TransitionName | string;
  leave: (ctx: TransitionContext) => Promise<void> | gsap.core.Animation | void;
  enter: (ctx: TransitionContext) => Promise<void> | gsap.core.Animation | void;
  onBeforeSwap?: (ctx: TransitionContext) => void | Promise<void>;
  onAfterSwap?: (ctx: TransitionContext) => void | Promise<void>;
}

export type TransitionDefinition = TransitionHooks;

export interface ContextualRule {
  fromPattern: string;
  toPattern: string;
  transition: TransitionName | string;
}

export interface FlipOriginData {
  slug: string;
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  imageSrc?: string;
  naturalWidth?: number;
  naturalHeight?: number;
  element: HTMLElement;
}

export interface ApertureOptions {
  originX?: number;
  originY?: number;
  duration?: number;
  ease?: string;
  accentColor?: string;
  backdropColor?: string;
}

export interface ScrollMemoryRecord {
  y: number;
  timestamp: number;
}

export interface PortalRouterOptions {
  enableAperture?: boolean;
  enableScrollMemory?: boolean;
  enableFlipZoom?: boolean;
}

// ---------------------------------------------------------------------------
// ROUTE RESOLVER UTILS
// ---------------------------------------------------------------------------

/**
 * Normalizes an URL pathname for consistent routing comparisons.
 */
export function normalizePath(path: string): string {
  if (!path) return '/';
  try {
    const parsed = new URL(path, 'http://localhost');
    let p = parsed.pathname.replace(/\/+$/, '');
    if (p === '') p = '/';
    return p;
  } catch {
    let p = path.replace(/[?#].*$/, '').replace(/\/+$/, '');
    if (p === '') p = '/';
    return p;
  }
}

/**
 * Identifies the canonical route category from a normalized path.
 */
export function resolveRouteName(path: string): RouteName {
  const p = normalizePath(path);
  if (p === '/' || p === '/index.html') return 'home';
  if (p === '/works') return 'works';
  if (p.startsWith('/works/')) return 'project';
  if (p === '/practice' || p === '/about' || p === '/contact') return 'practice';
  if (p === '/showroom' || p === '/experience' || p === '/atmosphere') return 'showroom';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// CONTEXTUAL ROUTE TABLE (Extracted from 06_unseen architecture)
// ---------------------------------------------------------------------------

const contextualRoutes: ContextualRule[] = [
  // To Home
  { fromPattern: '^/works$', toPattern: '^/$', transition: 'toHome' },
  { fromPattern: '^/works/.+', toPattern: '^/$', transition: 'toHome' },
  { fromPattern: '^/practice$', toPattern: '^/$', transition: 'toHome' },
  { fromPattern: '^/showroom$', toPattern: '^/$', transition: 'toHome' },

  // To Works
  { fromPattern: '^/$', toPattern: '^/works$', transition: 'toWorks' },
  { fromPattern: '^/practice$', toPattern: '^/works$', transition: 'toWorks' },
  { fromPattern: '^/showroom$', toPattern: '^/works$', transition: 'toWorks' },
  { fromPattern: '^/works/.+', toPattern: '^/works$', transition: 'toWorks' },

  // To Project
  { fromPattern: '^/$', toPattern: '^/works/.+', transition: 'toProject' },
  { fromPattern: '^/works$', toPattern: '^/works/.+', transition: 'toProject' },
  { fromPattern: '^/practice$', toPattern: '^/works/.+', transition: 'toProject' },
  { fromPattern: '^/showroom$', toPattern: '^/works/.+', transition: 'toProject' },

  // Project to Project (case study chain)
  { fromPattern: '^/works/.+', toPattern: '^/works/.+', transition: 'projectToProject' },

  // To Practice
  { fromPattern: '^/$', toPattern: '^/practice$', transition: 'toPractice' },
  { fromPattern: '^/works$', toPattern: '^/practice$', transition: 'toPractice' },
  { fromPattern: '^/works/.+', toPattern: '^/practice$', transition: 'toPractice' },
  { fromPattern: '^/showroom$', toPattern: '^/practice$', transition: 'toPractice' },

  // To Showroom
  { fromPattern: '^/$', toPattern: '^/showroom$', transition: 'toShowroom' },
  { fromPattern: '^/works$', toPattern: '^/showroom$', transition: 'toShowroom' },
  { fromPattern: '^/works/.+', toPattern: '^/showroom$', transition: 'toShowroom' },
  { fromPattern: '^/practice$', toPattern: '^/showroom$', transition: 'toShowroom' },
];

/**
 * Registers an arbitrary contextual routing rule.
 */
export function addContextualRoute(
  fromPattern: string,
  toPattern: string,
  transition: TransitionName | string
): void {
  contextualRoutes.unshift({ fromPattern, toPattern, transition });
}

/**
 * Matches fromPath and toPath against the registered contextual routes.
 */
export function getTransitionName(fromPath: string, toPath: string): TransitionName {
  const normFrom = normalizePath(fromPath);
  const normTo = normalizePath(toPath);

  if (normFrom === normTo) {
    return 'default';
  }

  for (const route of contextualRoutes) {
    const fromRegex = new RegExp(route.fromPattern);
    const toRegex = new RegExp(route.toPattern);

    if (fromRegex.test(normFrom) && toRegex.test(normTo)) {
      return route.transition as TransitionName;
    }
  }

  // Fallback to route-name heuristics
  const fromRoute = resolveRouteName(normFrom);
  const toRoute = resolveRouteName(normTo);

  if (fromRoute === 'project' && toRoute === 'project') return 'projectToProject';
  if (toRoute === 'project') return 'toProject';
  if (toRoute === 'home') return 'toHome';
  if (toRoute === 'works') return 'toWorks';
  if (toRoute === 'practice') return 'toPractice';
  if (toRoute === 'showroom') return 'toShowroom';

  return 'default';
}

// ---------------------------------------------------------------------------
// SCROLL MEMORY MANAGER (Zero flicker without page jump)
// ---------------------------------------------------------------------------

class ScrollMemoryManager {
  private cache = new Map<string, ScrollMemoryRecord>();
  private isTraversing = false;
  private pendingTargetY: number | null = null;

  init(): void {
    if (typeof window === 'undefined') return;
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    window.addEventListener('popstate', () => {
      this.isTraversing = true;
    });
  }

  save(path = window.location.pathname): void {
    const norm = normalizePath(path);
    const currentY = scrollState().y || window.scrollY || document.documentElement.scrollTop || 0;
    this.cache.set(norm, {
      y: Math.max(0, currentY),
      timestamp: Date.now(),
    });
  }

  get(path: string): number | null {
    const norm = normalizePath(path);
    const record = this.cache.get(norm);
    return record ? record.y : null;
  }

  isTraverseNavigation(): boolean {
    return this.isTraversing;
  }

  markTraverse(flag: boolean): void {
    this.isTraversing = flag;
  }

  prepareBeforeSwap(toPath: string): void {
    // Determine target scroll position
    let targetY = 0;
    if (this.isTraversing) {
      const saved = this.get(toPath);
      if (saved !== null) {
        targetY = saved;
      }
    }
    this.pendingTargetY = targetY;

    // Instantly freeze and prevent scroll leaps during DOM swapping
    stopScroll();
    if (targetY === 0) {
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    }
  }

  reinitializeAfterSwap(): void {
    const targetY = this.pendingTargetY ?? 0;
    this.pendingTargetY = null;
    this.isTraversing = false;

    // Reset or restore scroll coordinate via Lenis immediately before paint
    if (targetY > 0) {
      scrollToTarget(targetY, { immediate: true });
    } else {
      resetScroll();
    }

    // Refresh Lenis and GSAP ScrollTrigger calculations
    requestAnimationFrame(() => {
      resizeScroll();
      if (ScrollTrigger.getAll().length > 0) {
        ScrollTrigger.refresh();
      }
      startScroll();
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const scrollMemory = new ScrollMemoryManager();

// ---------------------------------------------------------------------------
// APERTURE OVERLAY SYSTEM (Architectural Iris Expansion)
// ---------------------------------------------------------------------------

const APERTURE_ELEMENT_ID = 'portal-aperture';

function getOrCreateApertureElement(): HTMLElement {
  let el = document.getElementById(APERTURE_ELEMENT_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = APERTURE_ELEMENT_ID;
    el.className = 'portal-aperture';
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('data-astro-transition-persist', 'portal-aperture');
    el.innerHTML = `
      <div class="aperture__veil"></div>
      <div class="aperture__iris">
        <div class="aperture__rim"></div>
      </div>
    `;

    // Ensure styling is present in head
    if (!document.getElementById('portal-aperture-styles')) {
      const style = document.createElement('style');
      style.id = 'portal-aperture-styles';
      style.textContent = `
        .portal-aperture {
          position: fixed;
          inset: 0;
          z-index: 550;
          pointer-events: none;
          visibility: hidden;
          opacity: 0;
          overflow: hidden;
        }
        .portal-aperture.is-active {
          visibility: visible;
          pointer-events: auto;
        }
        .aperture__veil {
          position: absolute;
          inset: 0;
          background: #050505;
          opacity: 0;
        }
        .aperture__iris {
          position: absolute;
          width: 0px;
          height: 0px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(167, 124, 77, 0.12) 0%, rgba(5, 5, 5, 0.98) 75%);
          box-shadow: 0 0 80px rgba(167, 124, 77, 0.4), inset 0 0 40px rgba(0, 0, 0, 0.9);
          will-change: width, height, transform, opacity;
        }
        .aperture__rim {
          position: absolute;
          inset: -1px;
          border-radius: 50%;
          border: 1px solid rgba(167, 124, 77, 0.85);
          box-shadow: 0 0 24px rgba(167, 124, 77, 0.7);
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(el);
  }
  return el;
}

/**
 * Triggers an expanding architectural iris from a focal point.
 */
export function triggerApertureOverlay(opts: ApertureOptions = {}): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const el = getOrCreateApertureElement();
  const iris = el.querySelector<HTMLElement>('.aperture__iris');
  const veil = el.querySelector<HTMLElement>('.aperture__veil');
  if (!iris || !veil) return Promise.resolve();

  const x = opts.originX ?? window.innerWidth / 2;
  const y = opts.originY ?? window.innerHeight / 2;
  const maxDim = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  ) * 2.2;

  el.classList.add('is-active');
  gsap.killTweensOf([el, iris, veil]);

  return new Promise<void>((resolve) => {
    gsap.set(el, { opacity: 1 });
    gsap.set(iris, {
      left: x,
      top: y,
      width: 0,
      height: 0,
      opacity: 1,
    });
    gsap.set(veil, { opacity: 0 });

    const tl = gsap.timeline({
      onComplete: () => resolve(),
    });

    tl.to(
      veil,
      {
        opacity: 0.85,
        duration: (opts.duration ?? 0.55) * 0.7,
        ease: 'power2.inOut',
      },
      0
    ).to(
      iris,
      {
        width: maxDim,
        height: maxDim,
        duration: opts.duration ?? 0.55,
        ease: opts.ease ?? ease.inOut,
      },
      0
    );
  });
}

/**
 * Closes or contracts the aperture overlay away after new page enter.
 */
export function closeApertureOverlay(opts: ApertureOptions = {}): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const el = document.getElementById(APERTURE_ELEMENT_ID);
  if (!el) return Promise.resolve();
  const iris = el.querySelector<HTMLElement>('.aperture__iris');
  const veil = el.querySelector<HTMLElement>('.aperture__veil');
  if (!iris || !veil) return Promise.resolve();

  return new Promise<void>((resolve) => {
    gsap.killTweensOf([el, iris, veil]);
    const tl = gsap.timeline({
      onComplete: () => {
        el.classList.remove('is-active');
        gsap.set(el, { opacity: 0 });
        resolve();
      },
    });

    tl.to(
      veil,
      {
        opacity: 0,
        duration: (opts.duration ?? 0.5) * 0.6,
        ease: 'power2.out',
      },
      0
    ).to(
      iris,
      {
        opacity: 0,
        duration: opts.duration ?? 0.5,
        ease: 'power2.out',
      },
      0
    );
  });
}

// ---------------------------------------------------------------------------
// WEBGL FLIP CAMERA ZOOM & COORDINATE HANDOFF
// ---------------------------------------------------------------------------

let capturedFlipOrigin: FlipOriginData | null = null;
let lastClickCoords: { x: number; y: number } | null = null;

/**
 * Captures clicked element coordinates for FLIP camera zoom handoff.
 */
export function captureFlipOrigin(
  el: HTMLElement,
  slug?: string
): FlipOriginData | null {
  if (!el || typeof el.getBoundingClientRect !== 'function') return null;

  const rect = el.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return null;

  const resolvedSlug =
    slug ||
    el.dataset.glFlip ||
    el.closest('[data-gl-flip]')?.getAttribute('data-gl-flip') ||
    '';

  const img = el.querySelector('img');

  capturedFlipOrigin = {
    slug: resolvedSlug,
    rect: {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    },
    imageSrc: img?.currentSrc || img?.src,
    naturalWidth: img?.naturalWidth || 1600,
    naturalHeight: img?.naturalHeight || 1000,
    element: el,
  };

  return capturedFlipOrigin;
}

export function getCapturedFlipOrigin(): FlipOriginData | null {
  return capturedFlipOrigin;
}

export function clearCapturedFlipOrigin(): void {
  capturedFlipOrigin = null;
}

/**
 * Computes camera zoom/pan offsets between screen bounding boxes.
 */
export function calculateCameraHandoff(
  sourceRect: { left: number; top: number; width: number; height: number },
  targetRect: { left: number; top: number; width: number; height: number },
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight
): {
  deltaX: number;
  deltaY: number;
  scaleX: number;
  scaleY: number;
  progress: number;
} {
  const sourceCenterX = sourceRect.left + sourceRect.width / 2;
  const sourceCenterY = sourceRect.top + sourceRect.height / 2;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  // Normalized coordinate shifts in WebGL screen space (-1 to +1)
  const deltaX = ((targetCenterX - sourceCenterX) / viewportWidth) * 2;
  const deltaY = -((targetCenterY - sourceCenterY) / viewportHeight) * 2;
  const scaleX = targetRect.width / (sourceRect.width || 1);
  const scaleY = targetRect.height / (sourceRect.height || 1);

  return { deltaX, deltaY, scaleX, scaleY, progress: 0 };
}

// ---------------------------------------------------------------------------
// 7 NAMED CONTEXTUAL TRANSITIONS
// ---------------------------------------------------------------------------

function getCurtain(): HTMLElement | null {
  return typeof document !== 'undefined' ? document.getElementById('curtain') : null;
}

/**
 * 1. toHome: Transition returning to Obsidian Hero Flagship
 */
export const toHomeTransition: TransitionDefinition = {
  name: 'toHome',
  leave: async (ctx) => {
    const c = ctx.curtainEl || getCurtain();
    if (prefersReducedMotion() || !c) {
      if (c) gsap.to(c, { opacity: 1, duration: 0.2 });
      return;
    }

    // Smoothly lerp dusk back to zero
    setGLDusk(0);

    const blades = c.querySelectorAll('.curtain__blades > .curtain__blade');
    gsap.killTweensOf([c, blades]);

    await new Promise<void>((resolve) => {
      gsap.timeline({ onComplete: () => resolve() })
        .set(c, { autoAlpha: 1 })
        .fromTo(
          blades,
          { scaleY: 0, transformOrigin: 'bottom center' },
          { scaleY: 1, duration: 0.42, stagger: 0.03, ease: ease.inOut }
        );
    });
  },
  enter: async (ctx) => {
    const c = ctx.curtainEl || getCurtain();
    if (prefersReducedMotion() || !c) {
      if (c) gsap.to(c, { autoAlpha: 0, duration: 0.2 });
      return;
    }

    const blades = c.querySelectorAll('.curtain__blades > .curtain__blade');
    gsap.killTweensOf([c, blades]);

    await new Promise<void>((resolve) => {
      gsap.timeline({ onComplete: () => resolve() })
        .to(blades, {
          scaleY: 0,
          transformOrigin: 'top center',
          duration: 0.48,
          stagger: 0.03,
          ease: ease.inOut,
        })
        .set(c, { autoAlpha: 0 });
    });
  },
};

/**
 * 2. toWorks: Transition to Works Portfolio / Horizontal Runway
 */
export const toWorksTransition: TransitionDefinition = {
  name: 'toWorks',
  leave: async (ctx) => {
    const c = ctx.curtainEl || getCurtain();
    if (prefersReducedMotion() || !c) {
      if (c) gsap.to(c, { opacity: 1, duration: 0.2 });
      return;
    }

    const blades = c.querySelectorAll('.curtain__blades > .curtain__blade');
    gsap.killTweensOf([c, blades]);

    await new Promise<void>((resolve) => {
      gsap.timeline({ onComplete: () => resolve() })
        .set(c, { autoAlpha: 1 })
        .fromTo(
          blades,
          { scaleY: 0, transformOrigin: 'bottom center' },
          { scaleY: 1, duration: 0.44, stagger: 0.035, ease: ease.inOut }
        );
    });
  },
  enter: async (ctx) => {
    const c = ctx.curtainEl || getCurtain();
    if (prefersReducedMotion() || !c) {
      if (c) gsap.to(c, { autoAlpha: 0, duration: 0.2 });
      return;
    }

    const blades = c.querySelectorAll('.curtain__blades > .curtain__blade');
    gsap.killTweensOf([c, blades]);

    // Animate filters and runway entrance in parallel with curtain unmask
    const filters = document.querySelector('.js-project-filters, .runway__counter');
    if (filters) {
      gsap.fromTo(
        filters,
        { y: -20, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.6, delay: 0.2, ease: ease.out }
      );
    }

    await new Promise<void>((resolve) => {
      gsap.timeline({ onComplete: () => resolve() })
        .to(blades, {
          scaleY: 0,
          transformOrigin: 'top center',
          duration: 0.48,
          stagger: 0.035,
          ease: ease.inOut,
        })
        .set(c, { autoAlpha: 0 });
    });
  },
};

/**
 * 3. toProject: FLIP Camera Zoom or Aperture Expansion into Case Study
 */
export const toProjectTransition: TransitionDefinition = {
  name: 'toProject',
  leave: async (ctx) => {
    const flipActive = hasPendingFlip();

    if (flipActive) {
      // WebGL FLIP handles its own canvas transformation, curtain is skipped
      return;
    }

    // If click coordinate exists and not reduced motion, trigger expanding aperture
    if (ctx.clickCoords && !prefersReducedMotion() && !isMobile()) {
      await triggerApertureOverlay({
        originX: ctx.clickCoords.x,
        originY: ctx.clickCoords.y,
        duration: 0.52,
      });
      return;
    }

    // Fallback curtain
    const c = ctx.curtainEl || getCurtain();
    if (c) {
      const blades = c.querySelectorAll('.curtain__blades > .curtain__blade');
      await new Promise<void>((r) => {
        gsap.timeline({ onComplete: () => r() })
          .set(c, { autoAlpha: 1 })
          .fromTo(blades, { scaleY: 0, transformOrigin: 'bottom center' }, { scaleY: 1, duration: 0.4, stagger: 0.03, ease: ease.inOut });
      });
    }
  },
  enter: async (ctx) => {
    const flipActive = hasPendingFlip();

    if (flipActive) {
      // Execute seamless OGL FLIP interpolation to full bleed destination hero plate
      await completeFlip();
      return;
    }

    // If aperture was triggered, smoothly dissolve it
    const aperture = document.getElementById(APERTURE_ELEMENT_ID);
    if (aperture?.classList.contains('is-active')) {
      await closeApertureOverlay({ duration: 0.45 });
      return;
    }

    // Fallback curtain enter
    const c = ctx.curtainEl || getCurtain();
    if (c) {
      const blades = c.querySelectorAll('.curtain__blades > .curtain__blade');
      await new Promise<void>((r) => {
        gsap.timeline({ onComplete: () => r() })
          .to(blades, { scaleY: 0, transformOrigin: 'top center', duration: 0.45, stagger: 0.03, ease: ease.inOut })
          .set(c, { autoAlpha: 0 });
      });
    }
  },
};

/**
 * 4. projectToProject: Seamless Next Project Handoff
 */
export const projectToProjectTransition: TransitionDefinition = {
  name: 'projectToProject',
  leave: async (ctx) => {
    const c = ctx.curtainEl || getCurtain();
    if (prefersReducedMotion() || !c) {
      if (c) gsap.to(c, { opacity: 1, duration: 0.2 });
      return;
    }

    // Horizontal blade shutter or wipe for sequential project traversal
    const blades = c.querySelectorAll('.curtain__blades > .curtain__blade');
    gsap.killTweensOf([c, blades]);

    await new Promise<void>((resolve) => {
      gsap.timeline({ onComplete: () => resolve() })
        .set(c, { autoAlpha: 1 })
        .fromTo(
          blades,
          { scaleY: 0, transformOrigin: 'bottom center' },
          { scaleY: 1, duration: 0.38, stagger: 0.025, ease: ease.inOut }
        );
    });
  },
  enter: async (ctx) => {
    const c = ctx.curtainEl || getCurtain();
    if (prefersReducedMotion() || !c) {
      if (c) gsap.to(c, { autoAlpha: 0, duration: 0.2 });
      return;
    }

    const blades = c.querySelectorAll('.curtain__blades > .curtain__blade');
    gsap.killTweensOf([c, blades]);

    // Animate hero plate subtle scale-in from 1.05 to 1.0
    const heroPlate = document.querySelector('.case-plate, [data-gl="case"]');
    if (heroPlate) {
      gsap.fromTo(
        heroPlate,
        { scale: 1.05, autoAlpha: 0.6 },
        { scale: 1.0, autoAlpha: 1, duration: 0.8, ease: ease.soft }
      );
    }

    await new Promise<void>((resolve) => {
      gsap.timeline({ onComplete: () => resolve() })
        .to(blades, {
          scaleY: 0,
          transformOrigin: 'top center',
          duration: 0.42,
          stagger: 0.025,
          ease: ease.inOut,
        })
        .set(c, { autoAlpha: 0 });
    });
  },
};

/**
 * 5. toPractice: Transition to Practice / Studio Architecture
 */
export const toPracticeTransition: TransitionDefinition = {
  name: 'toPractice',
  leave: async (ctx) => {
    const c = ctx.curtainEl || getCurtain();
    if (prefersReducedMotion() || !c) {
      if (c) gsap.to(c, { opacity: 1, duration: 0.2 });
      return;
    }

    const blades = c.querySelectorAll('.curtain__blades > .curtain__blade');
    gsap.killTweensOf([c, blades]);

    await new Promise<void>((resolve) => {
      gsap.timeline({ onComplete: () => resolve() })
        .set(c, { autoAlpha: 1 })
        .fromTo(
          blades,
          { scaleY: 0, transformOrigin: 'bottom center' },
          { scaleY: 1, duration: 0.42, stagger: 0.03, ease: ease.inOut }
        );
    });
  },
  enter: async (ctx) => {
    const c = ctx.curtainEl || getCurtain();
    if (prefersReducedMotion() || !c) {
      if (c) gsap.to(c, { autoAlpha: 0, duration: 0.2 });
      return;
    }

    const blades = c.querySelectorAll('.curtain__blades > .curtain__blade');
    gsap.killTweensOf([c, blades]);

    // Scope strip hairlines reveal
    const scopeLines = document.querySelectorAll('.scope-strip__row, .practice-divider');
    if (scopeLines.length > 0) {
      gsap.fromTo(
        scopeLines,
        { scaleX: 0, transformOrigin: 'left center' },
        { scaleX: 1, duration: 0.7, stagger: 0.08, delay: 0.2, ease: ease.out }
      );
    }

    await new Promise<void>((resolve) => {
      gsap.timeline({ onComplete: () => resolve() })
        .to(blades, {
          scaleY: 0,
          transformOrigin: 'top center',
          duration: 0.48,
          stagger: 0.03,
          ease: ease.inOut,
        })
        .set(c, { autoAlpha: 0 });
    });
  },
};

/**
 * 6. toShowroom: Transition to 3D Materials Experience
 */
export const toShowroomTransition: TransitionDefinition = {
  name: 'toShowroom',
  leave: async (ctx) => {
    // Showroom entry uses expanding aperture iris overlay
    if (ctx.clickCoords && !prefersReducedMotion()) {
      await triggerApertureOverlay({
        originX: ctx.clickCoords.x,
        originY: ctx.clickCoords.y,
        duration: 0.6,
        ease: 'expo.inOut',
      });
      return;
    }

    const c = ctx.curtainEl || getCurtain();
    if (c) {
      const blades = c.querySelectorAll('.curtain__blades > .curtain__blade');
      await new Promise<void>((r) => {
        gsap.timeline({ onComplete: () => r() })
          .set(c, { autoAlpha: 1 })
          .fromTo(blades, { scaleY: 0, transformOrigin: 'bottom center' }, { scaleY: 1, duration: 0.45, stagger: 0.03, ease: ease.inOut });
      });
    }
  },
  enter: async (ctx) => {
    document.documentElement.classList.add('is-showroom');

    const aperture = document.getElementById(APERTURE_ELEMENT_ID);
    if (aperture?.classList.contains('is-active')) {
      await closeApertureOverlay({ duration: 0.55 });
      return;
    }

    const c = ctx.curtainEl || getCurtain();
    if (c) {
      const blades = c.querySelectorAll('.curtain__blades > .curtain__blade');
      await new Promise<void>((r) => {
        gsap.timeline({ onComplete: () => r() })
          .to(blades, { scaleY: 0, transformOrigin: 'top center', duration: 0.5, stagger: 0.03, ease: ease.inOut })
          .set(c, { autoAlpha: 0 });
      });
    }
  },
};

/**
 * 7. default: Fallback Shutter Transition
 */
export const defaultTransition: TransitionDefinition = {
  name: 'default',
  leave: async (ctx) => {
    const c = ctx.curtainEl || getCurtain();
    if (prefersReducedMotion() || !c) {
      if (c) gsap.to(c, { opacity: 1, duration: 0.2 });
      return;
    }

    const blades = c.querySelectorAll('.curtain__blades > .curtain__blade');
    gsap.killTweensOf([c, blades]);

    await new Promise<void>((resolve) => {
      gsap.timeline({ onComplete: () => resolve() })
        .set(c, { autoAlpha: 1 })
        .fromTo(
          blades,
          { scaleY: 0, transformOrigin: 'bottom center' },
          { scaleY: 1, duration: 0.44, stagger: 0.035, ease: ease.inOut }
        );
    });
  },
  enter: async (ctx) => {
    const c = ctx.curtainEl || getCurtain();
    if (prefersReducedMotion() || !c) {
      if (c) gsap.to(c, { autoAlpha: 0, duration: 0.2 });
      return;
    }

    const blades = c.querySelectorAll('.curtain__blades > .curtain__blade');
    gsap.killTweensOf([c, blades]);

    await new Promise<void>((resolve) => {
      gsap.timeline({ onComplete: () => resolve() })
        .to(blades, {
          scaleY: 0,
          transformOrigin: 'top center',
          duration: 0.46,
          stagger: 0.035,
          ease: ease.inOut,
        })
        .set(c, { autoAlpha: 0 });
    });
  },
};

export const namedTransitions: Record<TransitionName, TransitionDefinition> = {
  toHome: toHomeTransition,
  toWorks: toWorksTransition,
  toProject: toProjectTransition,
  projectToProject: projectToProjectTransition,
  toPractice: toPracticeTransition,
  toShowroom: toShowroomTransition,
  default: defaultTransition,
};

// ---------------------------------------------------------------------------
// TRANSITION REGISTRY & DISPATCHER
// ---------------------------------------------------------------------------

const customTransitions = new Map<string, TransitionDefinition>();

export function registerTransition(name: string, transition: TransitionDefinition): void {
  customTransitions.set(name, transition);
}

export function getRegisteredTransition(name: string): TransitionDefinition | undefined {
  if (name in namedTransitions) {
    return namedTransitions[name as TransitionName];
  }
  return customTransitions.get(name);
}

export function getContextualTransition(fromPath: string, toPath: string): TransitionDefinition {
  const name = getTransitionName(fromPath, toPath);
  return getRegisteredTransition(name) || defaultTransition;
}

// ---------------------------------------------------------------------------
// LIFECYCLE LISTENERS & EVENT EMITTER
// ---------------------------------------------------------------------------

type Listener<T> = (data: T) => void;

const startListeners = new Set<Listener<TransitionContext>>();
const endListeners = new Set<Listener<TransitionContext>>();
const beforeSwapListeners = new Set<Listener<TransitionContext>>();
const afterSwapListeners = new Set<Listener<TransitionContext>>();

export function onPortalTransitionStart(fn: Listener<TransitionContext>): () => void {
  startListeners.add(fn);
  return () => startListeners.delete(fn);
}

export function onPortalTransitionEnd(fn: Listener<TransitionContext>): () => void {
  endListeners.add(fn);
  return () => endListeners.delete(fn);
}

export function onBeforeRouteSwap(fn: Listener<TransitionContext>): () => void {
  beforeSwapListeners.add(fn);
  return () => beforeSwapListeners.delete(fn);
}

export function onAfterRouteSwap(fn: Listener<TransitionContext>): () => void {
  afterSwapListeners.add(fn);
  return () => afterSwapListeners.delete(fn);
}

// ---------------------------------------------------------------------------
// CONTEXT STATE & NAVIGATION RUNTIME
// ---------------------------------------------------------------------------

let currentContext: TransitionContext | null = null;
let routerInitialized = false;

export function getCurrentTransitionContext(): TransitionContext | null {
  return currentContext;
}

/**
 * Global click interceptor to record coordinates & FLIP targets.
 */
function bindInteractionTracker(): void {
  if (typeof document === 'undefined') return;

  document.addEventListener(
    'click',
    (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      lastClickCoords = { x: e.clientX, y: e.clientY };

      const anchor = (e.target as Element)?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor) return;

      // Check if clicked element or parent is a FLIP candidate
      const flipContainer = anchor.closest<HTMLElement>('[data-gl-flip]') || anchor;
      const slug = flipContainer.dataset.glFlip || anchor.dataset.glFlip;

      if (slug && anchor.getAttribute('data-transition') === 'flip') {
        captureFlipOrigin(flipContainer, slug);
      }
    },
    { capture: true, passive: true }
  );
}

/**
 * Initializes the contextual SPA router with Astro client navigation hooks.
 */
export function initPortalRouter(options: PortalRouterOptions = {}): () => void {
  if (routerInitialized || typeof document === 'undefined') return () => {};
  routerInitialized = true;

  if (options.enableScrollMemory !== false) {
    scrollMemory.init();
  }
  if (options.enableFlipZoom !== false) {
    bindInteractionTracker();
  }

  // Astro: Before navigation preparation
  const onBeforePreparation = (event: Event) => {
    const navEv = event as Event & {
      from?: URL;
      to?: URL;
      direction?: string;
      navigationType?: string;
      loader?: () => Promise<void>;
    };

    const fromPath = navEv.from?.pathname || window.location.pathname;
    const toPath = navEv.to?.pathname || '/';

    scrollMemory.save(fromPath);

    const isTraverse = navEv.navigationType === 'traverse' || scrollMemory.isTraverseNavigation();
    scrollMemory.markTraverse(isTraverse);

    const transitionName = getTransitionName(fromPath, toPath);
    const transition = getContextualTransition(fromPath, toPath);

    currentContext = {
      fromPath,
      toPath,
      fromRoute: resolveRouteName(fromPath),
      toRoute: resolveRouteName(toPath),
      transitionName,
      triggerElement: capturedFlipOrigin?.element || null,
      navigationType: (navEv.navigationType as any) || (isTraverse ? 'traverse' : 'push'),
      direction: (navEv.direction as any) || (isTraverse ? 'back' : 'forward'),
      clickCoords: lastClickCoords,
      flipOrigin: capturedFlipOrigin,
      curtainEl: getCurtain(),
      apertureEl: document.getElementById(APERTURE_ELEMENT_ID),
      customData: {},
    };

    startListeners.forEach((fn) => fn(currentContext!));

    const originalLoader = navEv.loader;
    if (originalLoader) {
      navEv.loader = async () => {
        try {
          await Promise.all([
            Promise.resolve(transition.leave(currentContext!)),
            originalLoader(),
          ]);
        } catch (err) {
          console.error('[PortalTransition] Leave error:', err);
          await originalLoader();
        }
      };
    }
  };

  // Astro: Before DOM swap (freeze scroll, persist WebGL & curtain)
  const onBeforeSwap = (_event: Event) => {
    void _event;
    if (!currentContext) return;

    scrollMemory.prepareBeforeSwap(currentContext.toPath);
    beforeSwapListeners.forEach((fn) => fn(currentContext!));

    if (currentContext.transitionName && typeof getRegisteredTransition(currentContext.transitionName)?.onBeforeSwap === 'function') {
      getRegisteredTransition(currentContext.transitionName)?.onBeforeSwap?.(currentContext);
    }
  };

  // Astro: After DOM swap
  const onAfterSwap = () => {
    if (!currentContext) return;

    afterSwapListeners.forEach((fn) => fn(currentContext!));

    if (currentContext.transitionName && typeof getRegisteredTransition(currentContext.transitionName)?.onAfterSwap === 'function') {
      getRegisteredTransition(currentContext.transitionName)?.onAfterSwap?.(currentContext);
    }
  };

  // Astro: Page Load / Enter
  const onPageLoad = async () => {
    if (!currentContext) return;

    const ctx = currentContext;
    const transition = getContextualTransition(ctx.fromPath, ctx.toPath);

    try {
      await Promise.resolve(transition.enter(ctx));
    } catch (err) {
      console.error('[PortalTransition] Enter error:', err);
    } finally {
      scrollMemory.reinitializeAfterSwap();
      endListeners.forEach((fn) => fn(ctx));
      clearCapturedFlipOrigin();
      lastClickCoords = null;
      currentContext = null;
    }
  };

  document.addEventListener('astro:before-preparation', onBeforePreparation);
  document.addEventListener('astro:before-swap', onBeforeSwap);
  document.addEventListener('astro:after-swap', onAfterSwap);
  document.addEventListener('astro:page-load', onPageLoad);

  return () => {
    document.removeEventListener('astro:before-preparation', onBeforePreparation);
    document.removeEventListener('astro:before-swap', onBeforeSwap);
    document.removeEventListener('astro:after-swap', onAfterSwap);
    document.removeEventListener('astro:page-load', onPageLoad);
    routerInitialized = false;
  };
}

/**
 * Hook to manually trigger scroll reinitialization after asynchronous content mounting.
 */
export function reinitScrollAfterTransition(targetY?: number): void {
  if (typeof targetY === 'number') {
    scrollToTarget(targetY, { immediate: true });
  } else {
    resetScroll();
  }
  requestAnimationFrame(() => {
    resizeScroll();
    if (ScrollTrigger.getAll().length > 0) {
      ScrollTrigger.refresh();
    }
    startScroll();
  });
}

// ---------------------------------------------------------------------------
// FLIP HELPERS FOR EXTERNAL WIRE-IN
// ---------------------------------------------------------------------------

export function completePortalFlip(): Promise<void> {
  return completeFlip();
}

export function cancelPortalFlip(): void {
  cancelFlip();
  clearCapturedFlipOrigin();
}
