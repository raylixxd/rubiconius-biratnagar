# Rubiconius Visual Elevation Implementation Plan (v2 — Audited Against Current Codebase)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate Rubiconius Biratnagar into an architectural monograph presentation by fixing all CSS geometry, contrast, selector, apron-seam, grid-balance, and mobile-compositing defects across `tokens.css`, `site.css`, and `showroom.css`, verified against the **actual current codebase on disk**—with zero edits to HTML markup, client copy, or 3D WebGL/shader math.

**Architecture:** Pre-flight audit findings are locked in below. All visual upgrades live inside presentation CSS with desktop-gated glass/blend compositing guards, WCAG 2.2 AA/AAA contrast enforcement, balanced 12-column editorial spread math, and verified Lenis 1.3 scroll compliance.

**Tech Stack:** Astro 7.4.13, CSS Custom Properties, Lenis 1.3.27, GSAP 3.15.1, SVG `feTurbulence` (static 2-octave tile), OGL/WebGL.

---

## Global Constraints (Hard Stop on Violation)
- **Zero HTML Alterations:** Do not modify any `.astro` template structure, tag hierarchy, classes, or `data-gl` attributes.
- **Zero Copy / Voice Alterations:** Preserve all Biratnagar & Dharan client copy, project titles, founder quotes, and contact numbers verbatim.
- **Zero 3D Engine / Shader Alterations:** Never edit files inside `src/engine/gl/`.
- **Strict 0px Architectural Radius on Rectangular Chrome:** Eliminate all `999px` pills and `4px` radii on every rectangular showroom/HUD button, bar, chip, hint, and drawer control—while **explicitly preserving** `border-radius: 50%` on circular spatial pin markers (`.showroom-pin__ring`, `.showroom-pin__dot`).
- **WCAG 2.2 Compliance Floor:**
  - Normal text contrast `>= 4.5:1` (SC 1.4.3 AA; target `>= 7.0:1` AAA on HUD overlays).
  - Interactive non-text UI indicators & radar rings `>= 3.0:1` against adjacent colors (SC 1.4.11 AA).
  - Mobile interactive touch targets `>= 44x44 CSS px` (SC 2.5.5 AAA; clears SC 2.5.8 AA `24x24 px` floor).
  - Respect `@media (prefers-reduced-motion: reduce)` across CSS animations and Lenis.
- **Mobile GPU & WebGL Protection:** Gate `backdrop-filter` and `mix-blend-mode` behind `@media (hover: hover) and (pointer: fine)` with high-opacity solid fallbacks on coarse-pointer/touch screens.
- **Responsive Integrity:** Zero horizontal overflow (`scrollWidth <= innerWidth`) across `375px`, `768px`, `1024px`, and `1440px`.

---

## Task 0: Pre-Flight Codebase Audit Findings (Verified on Current Disk)

1. **`src/styles/tokens.css` (Verified):**
   - `--c-bg: #EFECE6`, `--c-surface: #E5E0D7`, `--c-fg: #1C1917`, `--c-accent: #1F4336`, `--c-bronze: #8A6A42`.
   - `--c-dark-bg: #231E1A`, `--c-dark-fg: #F3EFE8`, `--c-dark-accent: #C9A97E`.
   - `--radius: 0px` is already defined.
2. **`src/styles/showroom.css` Border-Radius Leaks (Verified Exact Lines):**
   - Line `473`: `.showroom-hint` uses `border-radius: 999px;`
   - Lines `253`, `282`, `496`, `547`, `667`, `776`, `905` (`.showroom-inline-fs`) use `border-radius: 4px;`
   - Lines `393` (`.showroom-pin__ring`) and `402` (`.showroom-pin__dot`) use `border-radius: 50%;` (preserve).
   - Line `422`: `.showroom-pin__chip` already has `border-radius: 0;`, light background `rgb(236 234 228 / 0.92)`, and `color: #111211;` (must be paired with `color: var(--c-dark-fg, #f3efe8)` if moved to dark smoked glass).
   - Line `150`: `.showroom-atmosphere__grain { display: none; }`
3. **`src/pages/index.astro` & `src/styles/site.css` Selectors (Verified):**
   - `.works-grid` direct children are `<article class="work-card">` (with `work-card--lead` on index `0`). Images are standard `<Image width={1280} height={800}>` (16:10 natural ratio), without `[data-gl]` attributes.
   - `src/engine/gl/index.ts` (line 223) dynamically reads `it.el.getBoundingClientRect()` every frame and updates `it.mesh.scale.set(r.width, r.height, 1)`—so any responsive aspect-ratio shift is WebGL-safe.
   - `.palette-ledger` uses `.palette-ledger li` and `.swatch` (lines `371`, `381` in `site.css`), currently `11px x 11px`.
   - `.showroom-apron--top` and `--bottom` (lines `404–409` in `site.css`) are `aria-hidden="true"` empty dividers with zero overlaid text, currently using `#EFECE6 0%, #D8D0C3 48%, #231E1A 100%`.
4. **`src/engine/scroll.ts` (Verified):**
   - Uses `import Lenis from 'lenis';` with `duration: 1.2`, `smoothWheel: true`, `wheelMultiplier: 1.0`, `touchMultiplier: 1.2`, `anchors: true`, `syncTouch` omitted (defaults to `false`), `prefersReducedMotion()` guard at line 15, and `ScrollTrigger.update()` + `gsap.ticker.lagSmoothing(0)`. **Already clean.**

---

## Task 1: Strict 0px Architectural Radius Discipline & 44px Touch Targets
**Files:** `src/styles/showroom.css`, `scripts/verify-visual-elevation.js`

- [ ] **Step 1: Scaffold `scripts/verify-visual-elevation.js` with `--check-radius`**
  Write a comment-stripping CSS parser check asserting:
  - `--radius: 0px` in `tokens.css`.
  - Every rectangular control in `showroom.css` (lines `253`, `282`, `473`, `496`, `547`, `667`, `776`, `905` `.showroom-inline-fs`) has `border-radius: 0` (or `0px`).
  - `.showroom-pin__ring` and `.showroom-pin__dot` retain `50%`.
  - Mobile interactive showroom buttons define `min-width >= 44px` and `min-height >= 44px`.
- [ ] **Step 2: Run `node scripts/verify-visual-elevation.js --check-radius` and confirm FAIL**
- [ ] **Step 3: Apply 0px architectural geometry & mobile touch-target clearances in `src/styles/showroom.css`**
  - Change line `473` (`.showroom-hint`) from `border-radius: 999px;` to `border-radius: 0;`.
  - Change lines `253`, `282`, `496`, `547`, `667`, `776`, and `905` (`.showroom-inline-fs`) from `border-radius: 4px;` to `border-radius: 0;`.
  - Add `@media (max-width: 767px), (pointer: coarse)` guard ensuring `.showroom-exit`, `.showroom-sound`, `.showroom-inline-fs`, `.showroom-drawer__close`, and `.showroom-chapter` maintain `min-height: 44px; min-width: 44px;`.
- [ ] **Step 4: Re-run `node scripts/verify-visual-elevation.js --check-radius` and confirm PASS**
- [ ] **Step 5: Commit**

---

## Task 2: Balanced 12-Column Monograph Spread for `.works-grid`
**Files:** `src/styles/site.css` (lines `287–305`), `scripts/verify-visual-elevation.js`

- [ ] **Step 1: Add `--check-works-grid` to `scripts/verify-visual-elevation.js`**
  Assert `@media (min-width: 1024px)` defines a 12-column grid on `.works-grid` targeting `.work-card:nth-child(1..3)`, with `16 / 10`, `5 / 4`, `16 / 9` aspect ratios and clean collapse below `1024px`.
- [ ] **Step 2: Run `node scripts/verify-visual-elevation.js --check-works-grid` and confirm FAIL**
- [ ] **Step 3: Implement the 12-column architectural spread in `src/styles/site.css`**
  ```css
  @media (min-width: 1024px) {
    .works-grid {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      align-items: start;
      gap: clamp(2.25rem, 3.5vw, 3.5rem) clamp(1.5rem, 2.5vw, 2.25rem);
      counter-reset: work-plate;
    }

    .works-grid > .work-card {
      counter-increment: work-plate;
      position: relative;
    }

    /* Plate 01: Wide editorial anchor (7 cols, 16:10 matches native 1280x800) */
    .works-grid > .work-card:nth-child(1) {
      grid-column: 1 / 8;
    }
    .works-grid > .work-card:nth-child(1) .work-card__media {
      aspect-ratio: 16 / 10;
    }

    /* Plate 02: Offset companion (5 cols, 5:4) */
    .works-grid > .work-card:nth-child(2) {
      grid-column: 8 / 13;
      margin-top: clamp(3rem, 5vw, 4.5rem);
    }
    .works-grid > .work-card:nth-child(2) .work-card__media {
      aspect-ratio: 5 / 4;
    }

    /* Plate 03: Centered architectural spread (8 cols, 16:9) */
    .works-grid > .work-card:nth-child(3) {
      grid-column: 3 / 11;
      margin-top: clamp(1rem, 2.5vw, 2rem);
    }
    .works-grid > .work-card:nth-child(3) .work-card__media {
      aspect-ratio: 16 / 9;
    }

    /* Auto-numbered archival stamp (zero HTML edits) */
    .work-card__meta::before {
      content: "PLATE 0" counter(work-plate);
      display: block;
      font-family: var(--f-body);
      font-size: 0.6875rem;
      letter-spacing: 0.16em;
      color: var(--c-bronze);
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
  }
  ```
- [ ] **Step 4: Re-run `node scripts/verify-visual-elevation.js --check-works-grid` and confirm PASS**
- [ ] **Step 5: Commit**

---

## Task 3: Performance-Guarded Architectural Micro-Grain
**Files:** `src/styles/showroom.css` (line `150`), `src/styles/site.css`, `scripts/verify-visual-elevation.js`

- [ ] **Step 1: Add `--check-grain` to `scripts/verify-visual-elevation.js`**
  Assert `.showroom-atmosphere__grain` is `display: block`, uses `numOctaves='2'` with `viewBox='0 0 200 200'`, and gates `mix-blend-mode` behind `@media (hover: hover) and (pointer: fine)` with `html.is-showroom body::before { display: none; }`.
- [ ] **Step 2: Run `node scripts/verify-visual-elevation.js --check-grain` and confirm FAIL**
- [ ] **Step 3: Activate showroom & editorial paper micro-grain safely**
  Replace line `150` in `src/styles/showroom.css` and add desktop-gated `body::before` grain in `src/styles/site.css`.
- [ ] **Step 4: Re-run `node scripts/verify-visual-elevation.js --check-grain` and confirm PASS**
- [ ] **Step 5: Commit**

---

## Task 4: Seamless Oklab-Sampled Apron Threshold & Inset Brass Datum
**Files:** `src/styles/site.css` (lines `402–409`), `scripts/verify-visual-elevation.js`

- [ ] **Step 1: Add `--check-apron` to `scripts/verify-visual-elevation.js`**
  Assert `#D8D0C3` is removed, outer stops use `var(--c-bg, #EFECE6)` and `var(--c-dark-bg, #231E1A)`, 7 Oklab cosine S-curve sRGB stops are present, and inset `1px` brass datum aligns to `var(--gutter)`.
- [ ] **Step 2: Run `node scripts/verify-visual-elevation.js --check-apron` and confirm FAIL**
- [ ] **Step 3: Replace flat linear aprons in `src/styles/site.css` (lines `403–409`)**
- [ ] **Step 4: Re-run `node scripts/verify-visual-elevation.js --check-apron` and confirm PASS**
- [ ] **Step 5: Commit**

---

## Task 5: High-Contrast Living 3D Spatial Pins, Adaptive Glass HUD & Tactile Swatches
**Files:** `src/styles/showroom.css` (lines `386–451`), `src/styles/site.css` (lines `371–392`), `scripts/verify-visual-elevation.js`

- [ ] **Step 1: Add `--check-pins` and `--check-swatches` to `scripts/verify-visual-elevation.js`**
  Assert:
  - `@keyframes pin-radar` animates `transform` and `opacity` only, using `var(--c-dark-accent, #C9A97E)` + dark halo, disabled under `prefers-reduced-motion: reduce`.
  - `.showroom-pin__chip` uses smoked dark background paired with `color: var(--c-dark-fg, #F3EFE8)` (WCAG AAA) and desktop-gated `backdrop-filter`.
  - `src/styles/site.css` updates `.palette-ledger li` and `.palette-ledger .swatch` (`18px x 18px`, desktop-gated hover elevation).
- [ ] **Step 2: Run `node scripts/verify-visual-elevation.js --check-pins --check-swatches` and confirm FAIL**
- [ ] **Step 3: Implement pin contrast, radar pulse, adaptive HUD glass, and swatch upgrades**
- [ ] **Step 4: Re-run `node scripts/verify-visual-elevation.js --check-pins --check-swatches` and confirm PASS**
- [ ] **Step 5: Commit**

---

## Task 6: Conditional Non-Destructive Lenis 1.3 Audit Gate
**Files:** `src/engine/scroll.ts` (Audited — No-Op unless `touchMultiplier: 1` strictly desired), `scripts/verify-visual-elevation.js`

- [ ] **Step 1: Add `--check-lenis` to `scripts/verify-visual-elevation.js`**
  Assert `src/engine/scroll.ts` preserves `smoothWheel: true`, omits `syncTouch: true`, honors `prefersReducedMotion()`, avoids mixing `lerp` + `duration`, and keeps `ScrollTrigger.update` + `gsap.ticker.lagSmoothing(0)`.
- [ ] **Step 2: Verify `src/engine/scroll.ts` passes cleanly (Decision Gate A: Already Clean; optionally tighten `touchMultiplier: 1.2` -> `1` if desired)**
- [ ] **Step 3: Run `node scripts/verify-visual-elevation.js --check-lenis` and confirm PASS**

---

## Task 7: Full Regression Suite, Diff Boundary Guard, Typecheck & Build
**Files:** `scripts/verify-visual-elevation.js`

- [ ] **Step 1: Add `--check-boundaries` to `scripts/verify-visual-elevation.js`**
  Verify via `git diff --name-only` that zero `.astro` files and zero `src/engine/gl/` files were modified.
- [ ] **Step 2: Run full static & build gates**
  ```bash
  node scripts/verify-visual-elevation.js --all
  npx astro check
  npm run build
  ```
- [ ] **Step 3: Execute live `npm run preview` viewport audit across `375px`, `768px`, `1024px`, and `1440px`**
- [ ] **Step 4: Final verification commit**

---

## Phase 2: Native GSAP Motion Enhancements (Adapted from Cloned Effect Repos)

> **Architectural Rule:** Adapt the *patterns* from `image-reveal-hover` and `smooth-parallax-scroll` using Rubiconius's already-installed `gsap: ^3.15.1` and `lenis: ^1.3.27` inside `src/motion/setup.ts`. Do **not** install Framer Motion or React, and do **not** add horizontal pinning on `/` (preserving `ShowroomStage` as the sole pinned scroll centerpiece).

### Task 8: Desktop-Gated Material Specimen Hover Reveal (Adapted from `codrops/ImageRevealHover`)
**Files:** `src/motion/setup.ts`, `src/styles/site.css`, `scripts/verify-visual-elevation.js`

- [ ] **Step 1: Add `--check-phase2-hover` to `scripts/verify-visual-elevation.js`**
  Assert:
  - Hover reveal initialization in `src/motion/setup.ts` exits early on `isTouch() || prefersReducedMotion()`.
  - Floating `.specimen-hover-reveal` card uses `border-radius: 0`, `pointer-events: none`, and cleans up all event listeners via `onPage` teardown return function (zero memory leaks across Astro view transitions).
- [ ] **Step 2: Run `node scripts/verify-visual-elevation.js --check-phase2-hover` and confirm FAIL**
- [ ] **Step 3: Implement GSAP `quickTo` specimen preview on `.palette-ledger li` in `src/motion/setup.ts` & `src/styles/site.css`**
  - Dynamically mount a single `pointer-events: none` floating `0px`-cornered specimen plate inside `onPage` (requiring zero `.astro` template edits).
  - Bind `gsap.quickTo` (`x`, `y`, `duration: 0.35`, `ease: 'power3.out'`) to pointer movement over `.palette-ledger li`, revealing a crisp material swatch/texture plate on hover and fading out cleanly on `pointerleave`.
  - Gate CSS styling behind `@media (hover: hover) and (pointer: fine)`.
- [ ] **Step 4: Re-run `node scripts/verify-visual-elevation.js --check-phase2-hover` and confirm PASS**
- [ ] **Step 5: Commit**
  ```bash
  git add src/motion/setup.ts src/styles/site.css scripts/verify-visual-elevation.js
  git commit -m "feat(motion): add desktop-only GSAP specimen hover reveal on materiality ledger"
  ```

---

### Task 9: Native GSAP `ScrollTrigger` Parallax Depth (Adapted from `olivierlarose/smooth-parallax-scroll`)
**Files:** `src/motion/setup.ts`, `scripts/verify-visual-elevation.js`

- [ ] **Step 1: Add `--check-phase2-parallax` to `scripts/verify-visual-elevation.js`**
  Assert:
  - `ScrollTrigger` parallax tween in `src/motion/setup.ts` uses `scrub: true` (never numeric catch-up like `scrub: 1`, preventing double-smoothing with Lenis) and exits early when `prefersReducedMotion()` or `isMobile()` is true.
  - Parallax is scoped strictly to non-pinned editorial media (`.atelier-band__visual img`) so it never collides with `ShowroomStage` scroll pinning.
- [ ] **Step 2: Run `node scripts/verify-visual-elevation.js --check-phase2-parallax` and confirm FAIL**
- [ ] **Step 3: Port parallax depth ratio via GSAP `ScrollTrigger` in `src/motion/setup.ts`**
  - Apply subtle vertical `yPercent` travel (`-8` to `8`, `scale: 1.08` bleed guard) on `.atelier-band__visual img` with `scrub: true` and clean `ScrollTrigger.kill()` on `onPage` cleanup.
- [ ] **Step 4: Re-run `node scripts/verify-visual-elevation.js --check-phase2-parallax` and confirm PASS**
- [ ] **Step 5: Final Phase 2 verification (`npx astro check && npm run build`) & commit**
  ```bash
  git add src/motion/setup.ts scripts/verify-visual-elevation.js
  git commit -m "feat(motion): add Lenis-synced GSAP parallax depth to editorial atelier plate"
  ```
