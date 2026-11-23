# Rubiconius 02 — Batch 1 Code Review Package

You are a Principal Frontend Architect and WebGL Motion Performance Specialist. 
Please review this deterministic plumbing and architecture hardening batch on an Astro + Three.js + GSAP + Lenis luxury architectural studio project ("Rubiconius").

---

## 1. Scope & Hard Boundaries
- **Zero Visual Changes:** No changes to visual layout, styling, typography, colors, or WebGL rendering.
- **Zero New npm Packages:** No editing `package.json`.
- **Zero Forbidden Edits:** Did not touch `src/engine/gl/*`, `src/engine/showcase/*`, `src/engine/transition.ts`, `src/engine/showroom/pins.ts`, `atmosphere.ts`, `index.ts`, or `src/motion/works.ts`.
- **Zero Premature Activations:** Kept `<CaseShowcase />` unmounted from `[slug].astro`.

---

## 2. Verification Test Outputs (Fresh Evidence)
- **`npx astro check`:** 0 errors, 0 warnings.
- **`npm run build`:** 0 errors, complete in 9.93s (8 static pages generated).
- **Headless Playwright QA (`node scripts/verify-batch1.mjs`):** Tested Desktop (1440x900) & Mobile (390x844) across `/`, `/works/`, `/works/heritage-panelled-gallery/`, `/practice/`, and `/showroom/`. 100% PASS (HTTP 200, zero overflow, zero page/console errors).

---

## 3. Code Implementation by Task

### Task 1 — Scroll Authority, Drawer Lock & Safari Guard

#### `src/engine/scroll.ts`
```ts
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './env';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

let lenis: Lenis | null = null;
let lockDepth = 0;
let scrollEndBound = false;
const listeners = new Set<(s: ScrollState) => void>();

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
    listeners.forEach((fn) => fn(state));
  });
  gsap.ticker.add((time) => lenis?.raf(time * 1000), false, true);
  gsap.ticker.lagSmoothing(0);
}

function nativeTick() {
  const max = document.documentElement.scrollHeight - innerHeight;
  state.velocity = scrollY - state.y;
  state.y = scrollY;
  state.progress = max > 0 ? scrollY / max : 0;
  listeners.forEach((fn) => fn(state));
}

export const onScroll = (fn: (s: ScrollState) => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
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
```

#### `src/engine/astro.ts` (Same-URL Internal Smooth-Scroll Interceptor)
```ts
import { boot, cleanup, enter, leave, syncFlags } from './index';
import { scrollToTarget } from './scroll';

let navigating = false;
let clickInterceptorBound = false;

function bindSameUrlClickInterceptor() {
  if (clickInterceptorBound || typeof document === 'undefined') return;
  clickInterceptorBound = true;

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = (e.target as Element)?.closest<HTMLAnchorElement>('a[href]');
    if (!anchor || anchor.hasAttribute('download') || anchor.target === '_blank') return;

    try {
      const url = new URL(anchor.href, location.href);
      if (url.origin === location.origin && url.pathname === location.pathname && !url.hash && !url.search) {
        e.preventDefault();
        scrollToTarget(0);
      }
    } catch {}
  });
}

export function start(setup?: () => void) {
  bindSameUrlClickInterceptor();
  document.addEventListener('astro:before-preparation', (e) => {
    navigating = true;
    const load = e.loader;
    e.loader = async () => { await Promise.all([leave(), load()]); };
  });
  document.addEventListener('astro:before-swap', () => cleanup());
  document.addEventListener('astro:after-swap', () => {
    syncFlags();
    document.getElementById('loader')?.remove();
  });
  document.addEventListener('astro:page-load', () => {
    if (!navigating) return void boot(setup);
    navigating = false;
    enter();
  });
  boot(setup);
}
```

#### `src/layouts/Base.astro` & `src/components/ShowroomStage.astro`
- Added `data-lenis-prevent` to `#mobile-menu` in `Base.astro`.
- Added `data-lenis-prevent` to `.drawer__panel` (#consult-drawer) in `Base.astro`.
- Added `data-lenis-prevent` to `.showroom-drawer__panel` in `ShowroomStage.astro`.

---

### Task 2 — Zero-Network GPU Tier Classifier & Font-Gated SplitText

#### `src/engine/env.ts`
```ts
export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isTouch = () => matchMedia('(hover: none), (pointer: coarse)').matches;
export const isMobile = () => matchMedia('(max-width: 767px)').matches;

let cachedTier: 'high' | 'medium' | 'low' | null = null;

export function getQualityTier(): 'high' | 'medium' | 'low' {
  if (cachedTier) return cachedTier;
  if (typeof window === 'undefined') return 'high';

  try {
    const memory = (navigator as any).deviceMemory ?? 8;
    const cores = navigator.hardwareConcurrency ?? 4;
    const coarse = matchMedia('(hover: none), (pointer: coarse)').matches;

    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    let isSoftwareOrLowEnd = false;
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)?.toLowerCase() || '';
        if (
          renderer.includes('swiftshader') ||
          renderer.includes('llvmpipe') ||
          renderer.includes('software') ||
          renderer.includes('mali-4') ||
          renderer.includes('adreno 3')
        ) {
          isSoftwareOrLowEnd = true;
        }
      }
    }

    if (isSoftwareOrLowEnd || memory <= 2 || cores <= 2) {
      cachedTier = 'low';
    } else if (coarse || memory <= 4 || cores <= 4) {
      cachedTier = 'medium';
    } else {
      cachedTier = 'high';
    }
  } catch {
    cachedTier = 'medium';
  }
  return cachedTier;
}
```

#### `src/engine/reveal.ts`
```ts
const activeSplits = new Set<SplitText>();

export function revertSplits() {
  activeSplits.forEach((self) => {
    try {
      self.revert();
    } catch {}
  });
  activeSplits.clear();
}

export async function ensureFontsReady() {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch {}
  }
}

function splitTween(el: HTMLElement, isIntro: boolean) {
  const type = (el.dataset.split || 'lines') as keyof typeof durations;
  const delay = parseFloat(el.dataset.delay || '0');
  const s = { tween: undefined as gsap.core.Tween | undefined, done: false, requested: false, split: null as SplitText | null };

  const createSplit = () => {
    if (!el.isConnected || s.split) return;
    s.split = SplitText.create(el, {
      type: type === 'lines' ? 'lines' : `lines,${type}`,
      mask: 'lines',
      autoSplit: true,
      linesClass: 'split-line',
      onSplit(self) {
        activeSplits.add(self);
        gsap.set(el, { visibility: 'visible' });
        if (s.done) return;
        const targets = type === 'lines' ? self.lines : type === 'words' ? self.words : self.chars;
        s.tween = gsap.from(targets, {
          yPercent: 110,
          rotate: type === 'chars' ? 0 : 1.5,
          duration: durations[type],
          stagger: staggers[type],
          ease: ease.out,
          delay,
          paused: isIntro && !s.requested,
          onComplete: () => {
            s.done = true;
            try {
              self.revert();
              activeSplits.delete(self);
            } catch {}
          },
          scrollTrigger: isIntro ? undefined : { trigger: el, start: 'top 88%', once: true },
        });
        if (isIntro && s.requested) {
          s.tween?.play();
        }
        return s.tween;
      },
    });
    activeSplits.add(s.split);
  };

  if (typeof document !== 'undefined' && document.fonts?.status !== 'loaded') {
    ensureFontsReady().then(createSplit);
  } else {
    createSplit();
  }

  return () => {
    s.requested = true;
    s.tween?.play();
  };
}
```

#### `src/engine/index.ts`
- Imported `ensureFontsReady` and `revertSplits` from `./reveal`.
- Gated `boot()` and `enter()` behind `await ensureFontsReady()`.
- Added `revertSplits()` to `cleanup()`.
- Exported `getQualityTier` from `./env`.

---

### Task 3 — Design Tokens & Decode-Safe Guard

#### `src/styles/tokens.css`
```css
  /* Rubiconius 02 — Showcase, Atmosphere & Depth Stage Tokens */
  --surface-ivory: #EAE4D9;
  --surface-walnut: #76533B;
  --surface-charcoal: #20201E;
  --accent-bronze: #A77C4D;
  --accent-brass: #C8A97E;
  --stage-bg: var(--c-dark-bg);
  --stage-fg: var(--c-dark-fg);
  --stage-border: var(--c-dark-line);
  --z-showcase: 2;
  --z-inspector: 65;
```

#### `src/styles/engine.css`
Maintained: `.gl-on [data-gl].is-gl-ready img, .gl-on [data-gl].is-gl-ready .gl-fallback { opacity: 0; }`

---

### Task 4 — Data Schema, Showcase Component Skeleton & Fallback CSS

#### `src/data/site.ts`
```ts
export type SurfaceTheme = 'charcoal' | 'walnut' | 'ivory';

export interface ShowcasePlate {
  id: string;
  index: string;                              // '01' | '02' | '03' | '04'
  title: string;                              // Cormorant Garamond / Boska editorial title
  annotation: string;                         // DM Mono uppercase architectural spec
  caption: string;                            // Manrope concise architectural note
  image: ImageMetadata;                       // Real ESM-imported site photograph
  backdropImage?: ImageMetadata;              // Optional Z-Back atmospheric layer
  isConceptRender?: boolean;                  // Explicit transparency tag if ever used
  cropRect: [number, number, number, number]; // [offsetX, offsetY, scaleX, scaleY]
  surfaceTheme: SurfaceTheme;
  swatchHex: string;                          // Real swatch from commission.materials
  materialSpec: string;                       // Extended dossier breakdown for Phase 6 Inspector
}
```
In `heritage-panelled-gallery`:
- 4 real-photo study plates using `realReadingCorner` (1920x1090) and real swatches (`#2B2623`, `#5C412A`, `#D8D3C9`, `#EFECE6`).
- All `cropRect` scales $\ge 0.72$ (`1.0`, `0.8`, `0.75`, `0.78`) to protect Retina displays from pixelation.
- Set `mobileSrc: '/models/rubiconius_pov_mobile.glb'` in `showroom.asset`.

#### `src/components/CaseShowcase.astro`
Semantic, accessible showcase skeleton component (kept unmounted from `src/pages/works/[slug].astro`).

#### `src/styles/showcase.css`
Modular CSS providing `< 768px` snap-scroll and `prefers-reduced-motion` static grid fallbacks.

---

### Task 5 — Contextual Studio Brief & Offline Mobile GLB Pipeline

#### `src/motion/setup.ts`
Auto-populates consultation brief context (`activeContext` and `city`) when visiting `/works/[slug]/` if empty.

#### `src/engine/showroom/assets.ts`
Registered `MeshoptDecoder`:
```ts
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// In loadGlbAsset:
loader.setMeshoptDecoder(MeshoptDecoder);
```
- Produced `rubiconius_pov_mobile.glb` (5.08 MB) using Meshopt geometry compression + embedded WebP textures, keeping node names intact (`Courtyard_WaterPlane`, empties, hotspots) without KTX2/Basis WASM 404s.

---

## Instructions for Gemini Reviewer
1. Evaluate architectural discipline, safety against memory leaks, and layout stability.
2. Confirm that all 6 requirements are cleanly fulfilled without regressions or visual disruptions.
3. Note any suggestions or edge cases for upcoming Phase 5 (OGL multi-layer depth & shader grazing sheen).
