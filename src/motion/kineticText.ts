/**
 * KINETIC MOTION ENGINE — RUBICONIUS BIRATNAGAR
 * Reverse-engineered & synthesized from:
 * 1. 111 West 57th / Above the Clouds (Dual-layer typography masking & differential vertical parallax)
 * 2. 28_cuberto (Magnetic cursor & viscous spring-damper button attraction with dual-axis return)
 * 3. 29_mouthwash (Velocity-skewed kinetic reveals, multi-stage viewport typography stagger, 3D matrix3d tilt)
 *
 * Zero third-party dependencies beyond GSAP.
 */

import { gsap } from 'gsap';

// ============================================================================
// ENVIRONMENT & ACCESSIBILITY GUARDS
// ============================================================================

export const isClient = typeof window !== 'undefined' && typeof document !== 'undefined';

export function isReducedMotion(): boolean {
  if (!isClient) return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isTouchDevice(): boolean {
  if (!isClient) return false;
  return window.matchMedia('(hover: none), (pointer: coarse)').matches;
}

// ============================================================================
// 1. SPRING-DAMPER 2D PHYSICS ENGINE
// ============================================================================

export interface SpringDamperConfig {
  stiffness: number; // Spring tension coefficient (e.g. 0.12)
  damping: number;   // Friction / viscous drag coefficient (e.g. 0.85)
  mass: number;      // Virtual mass (default 1.0)
  precision: number; // Threshold below which simulation is considered at rest (default 0.001)
}

export const DEFAULT_SPRING_CONFIG: SpringDamperConfig = {
  stiffness: 0.12,
  damping: 0.85,
  mass: 1.0,
  precision: 0.001,
};

/**
 * High-performance 2D spring-damper numerical integrator
 * Uses semi-implicit Euler integration with viscous damping.
 */
export class SpringDamper2D {
  public currentX = 0;
  public currentY = 0;
  public targetX = 0;
  public targetY = 0;
  public velocityX = 0;
  public velocityY = 0;

  public stiffness: number;
  public damping: number;
  public mass: number;
  public precision: number;

  constructor(config?: Partial<SpringDamperConfig>) {
    const cfg = { ...DEFAULT_SPRING_CONFIG, ...config };
    this.stiffness = cfg.stiffness;
    this.damping = cfg.damping;
    this.mass = cfg.mass;
    this.precision = cfg.precision;
  }

  public setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  public snapTo(x: number, y: number): void {
    this.currentX = x;
    this.currentY = y;
    this.targetX = x;
    this.targetY = y;
    this.velocityX = 0;
    this.velocityY = 0;
  }

  public step(dt = 1): boolean {
    const forceX = (this.targetX - this.currentX) * this.stiffness;
    const forceY = (this.targetY - this.currentY) * this.stiffness;

    const ax = forceX / this.mass;
    const ay = forceY / this.mass;

    this.velocityX = (this.velocityX + ax * dt) * this.damping;
    this.velocityY = (this.velocityY + ay * dt) * this.damping;

    this.currentX += this.velocityX * dt;
    this.currentY += this.velocityY * dt;

    const dx = Math.abs(this.targetX - this.currentX);
    const dy = Math.abs(this.targetY - this.currentY);
    const vx = Math.abs(this.velocityX);
    const vy = Math.abs(this.velocityY);

    const isAtRest = dx < this.precision && dy < this.precision && vx < this.precision && vy < this.precision;
    if (isAtRest) {
      this.currentX = this.targetX;
      this.currentY = this.targetY;
      this.velocityX = 0;
      this.velocityY = 0;
      return true; // Settled
    }
    return false; // Active
  }
}

// ============================================================================
// 2. MAGNETIC CURSOR & BUTTON MECHANICS
// ============================================================================

export interface MagneticOptions {
  stiffness?: number;       // Spring stiffness (default 0.12)
  damping?: number;         // Spring damping (default 0.85)
  strength?: number;        // Primary pull multiplier (default 0.38)
  childStrength?: number;   // Nested label pull multiplier (default 0.18)
  radius?: number;          // Magnetic trigger radius padding beyond rect in px (default 40)
  maxOffset?: number;       // Maximum allowed offset in px (default 32)
  returnDuration?: number;  // Fallback return duration
}

export interface MagneticController {
  element: HTMLElement;
  updateRect: () => void;
  destroy: () => void;
}

/**
 * Binds spring-damper magnetic attraction to an interactive element (button, badge, link).
 * When pointer enters proximity, pulls element and its inner label toward cursor with viscous return.
 */
export function createMagneticSpring(
  element: HTMLElement,
  options: Partial<MagneticOptions> = {}
): MagneticController {
  if (!isClient || isReducedMotion() || isTouchDevice()) {
    return {
      element,
      updateRect: () => {},
      destroy: () => {},
    };
  }

  const stiffness = options.stiffness ?? 0.12;
  const damping = options.damping ?? 0.85;
  const strength = options.strength ?? 0.38;
  const childStrength = options.childStrength ?? 0.18;
  const radius = options.radius ?? 40;
  const maxOffset = options.maxOffset ?? 32;

  const childEl = element.querySelector<HTMLElement>('[data-magnetic-child], .btn__label, .btn__text, .badge__text, span');

  const spring = new SpringDamper2D({ stiffness, damping });
  const childSpring = new SpringDamper2D({ stiffness: stiffness * 0.9, damping: damping * 0.92 });

  let rect = element.getBoundingClientRect();
  let isHovered = false;
  let rafId = 0;
  let isRunning = false;

  const updateRect = () => {
    rect = element.getBoundingClientRect();
  };

  const render = () => {
    const parentSettled = spring.step();
    const childSettled = childEl ? childSpring.step() : true;

    element.style.transform = `translate3d(${spring.currentX.toFixed(3)}px, ${spring.currentY.toFixed(3)}px, 0)`;

    if (childEl) {
      childEl.style.transform = `translate3d(${childSpring.currentX.toFixed(3)}px, ${childSpring.currentY.toFixed(3)}px, 0)`;
    }

    if (parentSettled && childSettled && !isHovered) {
      element.style.transform = '';
      if (childEl) childEl.style.transform = '';
      isRunning = false;
      return;
    }

    rafId = requestAnimationFrame(render);
  };

  const startLoop = () => {
    if (!isRunning) {
      isRunning = true;
      rafId = requestAnimationFrame(render);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;

    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const maxDist = Math.max(rect.width, rect.height) * 0.5 + radius;

    if (dist < maxDist) {
      isHovered = true;
      const pullX = Math.max(-maxOffset, Math.min(maxOffset, dx * strength));
      const pullY = Math.max(-maxOffset, Math.min(maxOffset, dy * strength));
      spring.setTarget(pullX, pullY);

      if (childEl) {
        const cPullX = Math.max(-maxOffset * 0.6, Math.min(maxOffset * 0.6, dx * childStrength));
        const cPullY = Math.max(-maxOffset * 0.6, Math.min(maxOffset * 0.6, dy * childStrength));
        childSpring.setTarget(cPullX, cPullY);
      }
      startLoop();
    } else if (isHovered) {
      onPointerLeave();
    }
  };

  const onPointerEnter = () => {
    updateRect();
    isHovered = true;
  };

  const onPointerLeave = () => {
    isHovered = false;
    spring.setTarget(0, 0);
    if (childEl) childSpring.setTarget(0, 0);
    startLoop();
  };

  element.addEventListener('pointerenter', onPointerEnter, { passive: true });
  element.addEventListener('pointermove', onPointerMove, { passive: true });
  element.addEventListener('pointerleave', onPointerLeave, { passive: true });
  window.addEventListener('resize', updateRect, { passive: true });
  window.addEventListener('scroll', updateRect, { passive: true });

  const destroy = () => {
    cancelAnimationFrame(rafId);
    isRunning = false;
    element.removeEventListener('pointerenter', onPointerEnter);
    element.removeEventListener('pointermove', onPointerMove);
    element.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('resize', updateRect);
    window.removeEventListener('scroll', updateRect);
    element.style.transform = '';
    if (childEl) childEl.style.transform = '';
  };

  return { element, updateRect, destroy };
}

/**
 * Initializes magnetic attraction on all matching elements under root.
 */
export function initMagneticElements(
  root: ParentNode = document,
  options?: Partial<MagneticOptions>
): () => void {
  if (!isClient || isReducedMotion() || isTouchDevice()) return () => {};

  const controllers: MagneticController[] = [];
  const targets = root.querySelectorAll<HTMLElement>(
    '[data-magnetic], [data-magnetic-button], .btn--magnetic, .magnetic-target'
  );

  targets.forEach((el) => {
    const customStrength = el.dataset.magnetic ? parseFloat(el.dataset.magnetic) : undefined;
    controllers.push(
      createMagneticSpring(el, {
        ...options,
        strength: !isNaN(customStrength as number) ? customStrength : options?.strength,
      })
    );
  });

  return () => {
    controllers.forEach((c) => c.destroy());
    controllers.length = 0;
  };
}

export interface MagneticCursorOptions {
  cursorSelector?: string;
  dotSelector?: string;
  stiffness?: number;
  damping?: number;
  activeScale?: number;
  hoverScale?: number;
}

/**
 * Magnetic Cursor Engine: Spring-damper physics pulling cursor follower to pointer and magnetic targets.
 */
export function initMagneticCursor(
  cursorEl?: HTMLElement | null,
  options: Partial<MagneticCursorOptions> = {}
): () => void {
  if (!isClient || isReducedMotion() || isTouchDevice()) return () => {};

  const cursor = cursorEl || document.querySelector<HTMLElement>(options.cursorSelector || '#cursor, .custom-cursor');
  if (!cursor) return () => {};

  const spring = new SpringDamper2D({
    stiffness: options.stiffness ?? 0.16,
    damping: options.damping ?? 0.82,
    precision: 0.001,
  });

  let mouseX = window.innerWidth * 0.5;
  let mouseY = window.innerHeight * 0.5;
  let targetX = mouseX;
  let targetY = mouseY;
  let isMoving = false;
  let rafId = 0;
  let currentTargetEl: HTMLElement | null = null;

  spring.snapTo(mouseX, mouseY);

  const loop = () => {
    spring.setTarget(targetX, targetY);
    spring.step();

    cursor.style.transform = `translate3d(${(spring.currentX).toFixed(2)}px, ${(spring.currentY).toFixed(2)}px, 0)`;

    if (isMoving || !document.hidden) {
      rafId = requestAnimationFrame(loop);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    const hit = document.elementFromPoint(mouseX, mouseY);
    const magneticEl = hit?.closest<HTMLElement>('[data-magnetic], [data-cursor-snap], button, a');

    if (magneticEl && magneticEl.dataset.cursorSnap !== 'false') {
      currentTargetEl = magneticEl;
      const rect = magneticEl.getBoundingClientRect();
      const snapX = rect.left + rect.width * 0.5;
      const snapY = rect.top + rect.height * 0.5;
      targetX = snapX + (mouseX - snapX) * 0.35;
      targetY = snapY + (mouseY - snapY) * 0.35;
      cursor.classList.add('is-magnetized');
    } else {
      currentTargetEl = null;
      targetX = mouseX;
      targetY = mouseY;
      cursor.classList.remove('is-magnetized');
    }

    if (!isMoving) {
      isMoving = true;
      rafId = requestAnimationFrame(loop);
    }
  };

  const onPointerLeave = () => {
    cursor.classList.remove('is-active', 'is-magnetized');
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', onPointerLeave, { passive: true });
  rafId = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(rafId);
    isMoving = false;
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerleave', onPointerLeave);
  };
}

// ============================================================================
// 3. SPLIT-TEXT KINETIC REVEAL & DIFFERENTIAL PARALLAX ENGINE
// ============================================================================

export interface SplitResult {
  root: HTMLElement;
  words: HTMLElement[];
  chars: HTMLElement[];
  innerWords: HTMLElement[];
  innerChars: HTMLElement[];
  revert: () => void;
}

export interface SplitTextOptions {
  splitChars?: boolean;
  wordClass?: string;
  charClass?: string;
}

const splitCache = new WeakMap<HTMLElement, { originalHTML: string; originalAria: string | null }>();

/**
 * Splits text into dual-layer masking spans:
 * Outer span: overflow hidden masking viewport container
 * Inner span: transformable kinetic text element (translation, skew, rotate)
 * Preserves accessibility via aria-label and aria-hidden.
 */
export function splitTextDualLayer(
  target: HTMLElement | string,
  options: SplitTextOptions = {}
): SplitResult | null {
  if (!isClient) return null;

  const element = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!element) return null;

  const originalHTML = element.innerHTML;
  const originalAria = element.getAttribute('aria-label');
  const fullText = (element.textContent || '').trim();

  if (!fullText) return null;

  splitCache.set(element, { originalHTML, originalAria });

  if (!originalAria) {
    element.setAttribute('aria-label', fullText);
  }

  const splitChars = !!options.splitChars;
  const wordClass = options.wordClass || 'kt-word';
  const charClass = options.charClass || 'kt-char';

  const rawWords = fullText.split(/\s+/);
  const words: HTMLElement[] = [];
  const chars: HTMLElement[] = [];
  const innerWords: HTMLElement[] = [];
  const innerChars: HTMLElement[] = [];

  const fragment = document.createDocumentFragment();

  rawWords.forEach((wordStr, wIdx) => {
    const wordOuter = document.createElement('span');
    wordOuter.className = `${wordClass}-mask`;
    wordOuter.setAttribute('aria-hidden', 'true');
    wordOuter.style.display = 'inline-block';
    wordOuter.style.overflow = 'hidden';
    wordOuter.style.verticalAlign = 'top';

    const wordInner = document.createElement('span');
    wordInner.className = `${wordClass}-inner`;
    wordInner.style.display = 'inline-block';
    wordInner.style.willChange = 'transform, opacity';

    if (splitChars) {
      Array.from(wordStr).forEach((ch) => {
        const charOuter = document.createElement('span');
        charOuter.className = `${charClass}-mask`;
        charOuter.style.display = 'inline-block';
        charOuter.style.overflow = 'hidden';
        charOuter.style.verticalAlign = 'top';

        const charInner = document.createElement('span');
        charInner.className = `${charClass}-inner`;
        charInner.style.display = 'inline-block';
        charInner.style.willChange = 'transform, opacity';
        charInner.textContent = ch;

        charOuter.appendChild(charInner);
        wordInner.appendChild(charOuter);

        chars.push(charOuter);
        innerChars.push(charInner);
      });
    } else {
      wordInner.textContent = wordStr;
    }

    wordOuter.appendChild(wordInner);
    fragment.appendChild(wordOuter);

    words.push(wordOuter);
    innerWords.push(wordInner);

    if (wIdx < rawWords.length - 1) {
      const space = document.createTextNode('\u00A0');
      fragment.appendChild(space);
    }
  });

  element.replaceChildren(fragment);

  const revert = () => {
    const cached = splitCache.get(element);
    if (cached) {
      element.innerHTML = cached.originalHTML;
      if (cached.originalAria !== null) {
        element.setAttribute('aria-label', cached.originalAria);
      } else {
        element.removeAttribute('aria-label');
      }
      splitCache.delete(element);
    }
  };

  return { root: element, words, chars, innerWords, innerChars, revert };
}

export interface KineticRevealOptions {
  splitMode?: 'words' | 'chars';
  stagger?: number;
  duration?: number;
  delay?: number;
  skewAmount?: number;
  yOffsetPercent?: number;
  ease?: string;
  threshold?: number;
  rootMargin?: string;
  onComplete?: () => void;
}

/**
 * Split-Text Kinetic Reveal: Dual-layer words/chars emerge with staggered skew and vertical translation on viewport intersection.
 */
export function initKineticReveal(
  targets: string | HTMLElement | HTMLElement[] = '[data-kinetic-reveal]',
  options: Partial<KineticRevealOptions> = {}
): () => void {
  if (!isClient) return () => {};

  const elements: HTMLElement[] =
    typeof targets === 'string'
      ? Array.from(document.querySelectorAll<HTMLElement>(targets))
      : Array.isArray(targets)
      ? targets
      : [targets];

  if (!elements.length) return () => {};

  const cleanups: (() => void)[] = [];
  const prefersReduced = isReducedMotion();

  const stagger = options.stagger ?? (options.splitMode === 'chars' ? 0.018 : 0.045);
  const duration = options.duration ?? 1.15;
  const delay = options.delay ?? 0;
  const skewAmount = prefersReduced ? 0 : (options.skewAmount ?? 5);
  const yOffsetPercent = prefersReduced ? 0 : (options.yOffsetPercent ?? 115);
  const ease = options.ease ?? 'expo.out';
  const threshold = options.threshold ?? 0.15;
  const rootMargin = options.rootMargin ?? '0px 0px -8% 0px';

  elements.forEach((el) => {
    const split = splitTextDualLayer(el, {
      splitChars: options.splitMode === 'chars' || el.dataset.kineticReveal === 'chars',
    });

    if (!split) return;
    cleanups.push(split.revert);

    const animatedItems = split.innerChars.length > 0 ? split.innerChars : split.innerWords;

    if (prefersReduced) {
      gsap.set(animatedItems, { opacity: 1, yPercent: 0, rotateZ: 0, skewY: 0 });
      return;
    }

    // Set initial masked state
    gsap.set(animatedItems, {
      yPercent: yOffsetPercent,
      skewY: skewAmount,
      rotateZ: 1.5,
      opacity: 0,
    });

    let observer: IntersectionObserver | null = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            observer?.disconnect();
            observer = null;

            gsap.to(animatedItems, {
              yPercent: 0,
              skewY: 0,
              rotateZ: 0,
              opacity: 1,
              duration,
              delay,
              stagger: {
                each: stagger,
                from: 'start',
                ease: 'power2.out',
              },
              ease,
              onComplete: options.onComplete,
            });
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    cleanups.push(() => observer?.disconnect());
  });

  return () => {
    cleanups.forEach((c) => c());
    cleanups.length = 0;
  };
}

export interface DifferentialParallaxOptions {
  distance?: number;      // Maximum differential parallax travel in px (default 36)
  velocitySkew?: boolean; // Apply subtle velocity-driven skew (default true)
  maxSkew?: number;       // Maximum scroll skew degrees (default 6)
}

/**
 * Differential Parallax Typography Engine (111 West 57th / Mouthwash):
 * Alternating words and dual layers slide at differential rates during scroll with velocity-proportional skew.
 */
export function initDifferentialParallax(
  targets: string | HTMLElement | HTMLElement[] = '[data-differential-parallax]',
  options: Partial<DifferentialParallaxOptions> = {}
): () => void {
  if (!isClient || isReducedMotion()) return () => {};

  const elements: HTMLElement[] =
    typeof targets === 'string'
      ? Array.from(document.querySelectorAll<HTMLElement>(targets))
      : Array.isArray(targets)
      ? targets
      : [targets];

  if (!elements.length) return () => {};

  const distance = options.distance ?? 36;
  const velocitySkew = options.velocitySkew ?? true;
  const maxSkew = options.maxSkew ?? 6;

  const splits: SplitResult[] = [];
  elements.forEach((el) => {
    const s = splitTextDualLayer(el, { splitChars: false });
    if (s) splits.push(s);
  });

  let lastScrollY = window.scrollY;
  let scrollVelocity = 0;
  let rafId = 0;

  const update = () => {
    const currentY = window.scrollY;
    const rawDelta = currentY - lastScrollY;
    lastScrollY = currentY;

    // Smoothed velocity decay
    scrollVelocity += (rawDelta - scrollVelocity) * 0.15;
    const clampedVelocity = Math.max(-100, Math.min(100, scrollVelocity));
    const skew = velocitySkew ? Math.max(-maxSkew, Math.min(maxSkew, clampedVelocity * 0.05)) : 0;

    const viewportH = window.innerHeight;

    splits.forEach((split) => {
      const rect = split.root.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > viewportH) return; // Out of view

      const progress = (viewportH - rect.top) / (viewportH + rect.height);
      const normalizedProgress = (progress - 0.5) * 2; // -1 to 1

      split.innerWords.forEach((word, idx) => {
        const factor = idx % 2 === 0 ? 1.25 : -0.75;
        const translateY = normalizedProgress * distance * factor;
        word.style.transform = `translate3d(0, ${translateY.toFixed(2)}px, 0) skewY(${skew.toFixed(2)}deg)`;
      });
    });

    rafId = requestAnimationFrame(update);
  };

  rafId = requestAnimationFrame(update);

  return () => {
    cancelAnimationFrame(rafId);
    splits.forEach((s) => s.revert());
    splits.length = 0;
  };
}

// ============================================================================
// 4. 3D CARD HOVER PERSPECTIVE WITH SPECULAR LIGHTING GLARE
// ============================================================================

export interface Perspective3DOptions {
  maxPitch?: number;        // Max X rotation in degrees (default 12)
  maxYaw?: number;          // Max Y rotation in degrees (default 14)
  perspective?: number;     // 3D perspective depth in px (default 1000)
  scale?: number;           // Scale on hover (default 1.035)
  liftZ?: number;           // Z-axis translation in px on hover (default 22)
  stiffness?: number;       // Spring stiffness for tilt (default 0.10)
  damping?: number;         // Spring damping for tilt (default 0.82)
  glare?: boolean;          // Enable specular glare sheen overlay (default true)
  maxGlareOpacity?: number; // Max glare sheen opacity (default 0.45)
  glareColor?: string;      // Glare highlight color (default bronze/ivory gradient)
}

export interface Card3DController {
  card: HTMLElement;
  updateRect: () => void;
  destroy: () => void;
}

/**
 * Computes CSS 4x4 matrix3d representation combining perspective, translation, rotation, and scale.
 */
function computeMatrix3D(
  rotXDeg: number,
  rotYDeg: number,
  scale: number,
  transZ: number,
  perspective: number
): string {
  const radX = (rotXDeg * Math.PI) / 180;
  const radY = (rotYDeg * Math.PI) / 180;

  const cx = Math.cos(radX);
  const sx = Math.sin(radX);
  const cy = Math.cos(radY);
  const sy = Math.sin(radY);

  const p = -1 / Math.max(100, perspective);

  // Column-major 4x4 matrix for CSS matrix3d(m11, m12, ... m44)
  const m11 = scale * cy;
  const m12 = scale * sx * sy;
  const m13 = scale * cx * sy;
  const m14 = m13 * p;

  const m21 = 0;
  const m22 = scale * cx;
  const m23 = -scale * sx;
  const m24 = m23 * p;

  const m31 = -scale * sy;
  const m32 = scale * sx * cy;
  const m33 = scale * cx * cy;
  const m34 = m33 * p;

  const m41 = 0;
  const m42 = 0;
  const m43 = transZ;
  const m44 = 1 + transZ * p;

  return `matrix3d(${m11.toFixed(6)}, ${m12.toFixed(6)}, ${m13.toFixed(6)}, ${m14.toFixed(8)}, ` +
    `${m21.toFixed(6)}, ${m22.toFixed(6)}, ${m23.toFixed(6)}, ${m24.toFixed(8)}, ` +
    `${m31.toFixed(6)}, ${m32.toFixed(6)}, ${m33.toFixed(6)}, ${m34.toFixed(8)}, ` +
    `${m41.toFixed(6)}, ${m42.toFixed(6)}, ${m43.toFixed(6)}, ${m44.toFixed(8)})`;
}

/**
 * Creates 3D Card Hover Perspective Controller.
 * Computes matrix3d tilt based on mouse coordinates relative to card center with specular lighting glare sheen.
 */
export function create3DPerspectiveCard(
  card: HTMLElement,
  options: Partial<Perspective3DOptions> = {}
): Card3DController {
  if (!isClient || isReducedMotion() || isTouchDevice()) {
    return {
      card,
      updateRect: () => {},
      destroy: () => {},
    };
  }

  const maxPitch = options.maxPitch ?? 12;
  const maxYaw = options.maxYaw ?? 14;
  const perspective = options.perspective ?? 1000;
  const hoverScale = options.scale ?? 1.035;
  const liftZ = options.liftZ ?? 22;
  const stiffness = options.stiffness ?? 0.10;
  const damping = options.damping ?? 0.82;
  const enableGlare = options.glare ?? true;
  const maxGlareOpacity = options.maxGlareOpacity ?? 0.45;

  let rect = card.getBoundingClientRect();
  let isHovered = false;
  let rafId = 0;
  let isRunning = false;

  // Spring rotX, rotY
  const tiltSpring = new SpringDamper2D({ stiffness, damping, precision: 0.001 });
  // Spring scale, liftZ
  const depthSpring = new SpringDamper2D({ stiffness, damping, precision: 0.001 });
  depthSpring.snapTo(1.0, 0);

  // Setup Glare Overlay
  let glareEl: HTMLElement | null = null;
  if (enableGlare) {
    glareEl = card.querySelector<HTMLElement>('.card-3d__glare');
    if (!glareEl) {
      glareEl = document.createElement('div');
      glareEl.className = 'card-3d__glare';
      glareEl.style.position = 'absolute';
      glareEl.style.inset = '0';
      glareEl.style.pointerEvents = 'none';
      glareEl.style.borderRadius = 'inherit';
      glareEl.style.overflow = 'hidden';
      glareEl.style.mixBlendMode = 'overlay';
      glareEl.style.opacity = '0';
      glareEl.style.zIndex = '10';
      glareEl.style.transition = 'opacity 0.28s cubic-bezier(0.19, 1, 0.22, 1)';
      card.style.position = card.style.position || 'relative';
      card.appendChild(glareEl);
    }
  }

  // Nested Depth Elements (differential translation in 3D space)
  const depthLayers = card.querySelectorAll<HTMLElement>('[data-depth]');

  const updateRect = () => {
    rect = card.getBoundingClientRect();
  };

  const render = () => {
    const tiltSettled = tiltSpring.step();
    const depthSettled = depthSpring.step();

    const currentRotX = tiltSpring.currentX;
    const currentRotY = tiltSpring.currentY;
    const currentScale = depthSpring.currentX;
    const currentLiftZ = depthSpring.currentY;

    card.style.transform = computeMatrix3D(currentRotX, currentRotY, currentScale, currentLiftZ, perspective);

    // Apply differential parallax to internal layers
    if (depthLayers.length > 0) {
      depthLayers.forEach((layer) => {
        const factor = parseFloat(layer.dataset.depth || '0.3');
        const lx = (currentRotY / maxYaw) * factor * 24;
        const ly = (-currentRotX / maxPitch) * factor * 24;
        const lz = (currentLiftZ * factor) * 1.5;
        layer.style.transform = `translate3d(${lx.toFixed(2)}px, ${ly.toFixed(2)}px, ${lz.toFixed(2)}px)`;
      });
    }

    if (tiltSettled && depthSettled && !isHovered) {
      card.style.transform = '';
      if (glareEl) glareEl.style.opacity = '0';
      depthLayers.forEach((l) => (l.style.transform = ''));
      isRunning = false;
      return;
    }

    rafId = requestAnimationFrame(render);
  };

  const startLoop = () => {
    if (!isRunning) {
      isRunning = true;
      rafId = requestAnimationFrame(render);
    }
  };

  const onPointerEnter = () => {
    updateRect();
    isHovered = true;
    depthSpring.setTarget(hoverScale, liftZ);
    if (glareEl) glareEl.style.opacity = '1';
    startLoop();
  };

  const onPointerMove = (e: PointerEvent) => {
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;

    const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width * 0.5)));
    const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height * 0.5)));

    // Pitch: moving mouse up (negative ny) tilts card toward user (positive rotX)
    const targetPitch = -ny * maxPitch;
    // Yaw: moving mouse right (positive nx) tilts card right (positive rotY)
    const targetYaw = nx * maxYaw;

    tiltSpring.setTarget(targetPitch, targetYaw);

    if (glareEl) {
      const glareX = ((nx + 1) * 0.5) * 100;
      const glareY = ((ny + 1) * 0.5) * 100;
      const dist = Math.hypot(nx, ny);
      const glareAlpha = Math.min(maxGlareOpacity, dist * maxGlareOpacity);

      glareEl.style.background = `radial-gradient(
        circle 400px at ${glareX.toFixed(1)}% ${glareY.toFixed(1)}%,
        rgba(255, 255, 255, ${(glareAlpha * 1.4).toFixed(3)}) 0%,
        rgba(214, 180, 138, ${(glareAlpha * 0.6).toFixed(3)}) 35%,
        rgba(0, 0, 0, 0) 70%
      )`;
    }

    startLoop();
  };

  const onPointerLeave = () => {
    isHovered = false;
    tiltSpring.setTarget(0, 0);
    depthSpring.setTarget(1.0, 0);
    if (glareEl) glareEl.style.opacity = '0';
    startLoop();
  };

  card.addEventListener('pointerenter', onPointerEnter, { passive: true });
  card.addEventListener('pointermove', onPointerMove, { passive: true });
  card.addEventListener('pointerleave', onPointerLeave, { passive: true });
  window.addEventListener('resize', updateRect, { passive: true });
  window.addEventListener('scroll', updateRect, { passive: true });

  const destroy = () => {
    cancelAnimationFrame(rafId);
    isRunning = false;
    card.removeEventListener('pointerenter', onPointerEnter);
    card.removeEventListener('pointermove', onPointerMove);
    card.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('resize', updateRect);
    window.removeEventListener('scroll', updateRect);
    card.style.transform = '';
    if (glareEl) {
      glareEl.remove();
      glareEl = null;
    }
    depthLayers.forEach((l) => (l.style.transform = ''));
  };

  return { card, updateRect, destroy };
}

/**
 * Initializes 3D Perspective Card Hover on all matching elements under root.
 */
export function init3DPerspectiveCards(
  root: ParentNode = document,
  options?: Partial<Perspective3DOptions>
): () => void {
  if (!isClient || isReducedMotion() || isTouchDevice()) return () => {};

  const controllers: Card3DController[] = [];
  const cards = root.querySelectorAll<HTMLElement>(
    '[data-tilt-card], [data-3d-card], .work-card, .hero-dock-card'
  );

  cards.forEach((card) => {
    controllers.push(create3DPerspectiveCard(card, options));
  });

  return () => {
    controllers.forEach((c) => c.destroy());
    controllers.length = 0;
  };
}

// ============================================================================
// 5. MASTER UNIFIED KINETIC MOTION ENGINE
// ============================================================================

export interface KineticEngineConfig {
  magnetic?: Partial<MagneticOptions>;
  cursor?: Partial<MagneticCursorOptions>;
  reveal?: Partial<KineticRevealOptions>;
  parallax?: Partial<DifferentialParallaxOptions>;
  perspectiveCards?: Partial<Perspective3DOptions>;
}

export interface KineticEngineInstance {
  cleanup: () => void;
  refresh: () => void;
}

/**
 * Master initialization entry point for the kinetic motion suite.
 * Instantiates magnetic cursors/buttons, dual-layer split-text reveals, differential typography parallax,
 * and 3D matrix3d perspective card hover engines with unified lifecycle cleanup.
 */
export function initKineticMotionEngine(
  root: ParentNode = document,
  config: Partial<KineticEngineConfig> = {}
): KineticEngineInstance {
  if (!isClient) {
    return { cleanup: () => {}, refresh: () => {} };
  }

  const cleanups: (() => void)[] = [];

  const setup = () => {
    cleanups.push(initMagneticElements(root, config.magnetic));
    cleanups.push(initMagneticCursor(null, config.cursor));
    cleanups.push(initKineticReveal('[data-kinetic-reveal]', config.reveal));
    cleanups.push(initDifferentialParallax('[data-differential-parallax]', config.parallax));
    cleanups.push(init3DPerspectiveCards(root, config.perspectiveCards));
  };

  setup();

  const cleanup = () => {
    cleanups.forEach((c) => c());
    cleanups.length = 0;
  };

  const refresh = () => {
    cleanup();
    setup();
  };

  return { cleanup, refresh };
}
