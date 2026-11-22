# Rubiconius `/works/` Monograph & Precision Directory Implementation Plan (33.0 to 70.0)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Rubiconius `/works/` portfolio, connected room dossiers, and WhatsApp inquiry drawer into a museum-grade architectural monograph and precision directory adhering to the aesthetic standards of Norm Architects and Vincent Van Duysen.

**Architecture:** Refactor the data layer (`src/data/site.ts`) with aligned slugs and typed materiality specs; replace DOM duplication on `/works/` with an interactive, scroll-synchronized `Editorial | Index` view switcher; implement an asymmetric 3-spread editorial layout alongside a pointer-safe directory; apply glassmorphism and flex-isolation CSS fixes to eliminate all text collisions; and sanitize the inquiry modal.

**Tech Stack:** Astro 5, TypeScript, Tailwind CSS, GSAP 3 (ScrollTrigger, SplitText), Lenis Smooth Scroll, WebP/AVIF image pipeline.

**Spec:** Synthesizes `c:\Users\Lenovo LOQ\Downloads\rubiconius_master_architectural_digital_blueprint_33_0_to_70_0.html` and the user's Principal Creative Frontend Engineer execution requirements.

---

## Global Constraints & Non-Negotiable Anti-Slop Rules

1. **Banned UI Patterns:** No boxed SaaS cards, no drop shadows, no pill-shaped toggle buttons, no bouncy spring easing, no tutorial tooltips, no promotional banners. Strict `border-radius: 0px` across all architectural imagery and interactive surfaces.
2. **Banned Copy:** Never output `"polished"`, `"functional"`, `"livable"`, `"Observed Details"`, `"3 Selected Room Studies"`, `"The Rubiconius Promise"`, `"Hover row to preview"`, `"Click to open dossier"`, `"Tap any room study"`, `"crafted alongside local artisans"`, `"timeless"`, `"elevate"`, `"seamless"`, `"bespoke sanctuary"`, or `"5.0 ★"` / `"Google Reviews"` inside any modal or `/works/` copy.
3. **Motion Physics:** Use strictly weighted, architectural easing `cubic-bezier(0.22, 1, 0.36, 1)` between `300ms` and `500ms`.
4. **Preserved Architecture:** Keep intact the Boska (serif) + Switzer (sans) typography pairing, 3-link top nav, studio preloader, `.webp` optimization, and WhatsApp brief prefill and submission logic.

## Review Focus & Failure Modes

1. **Horizontal Viewport Overflow:** Breakdowns on narrow mobile screens (375px/390px) caused by wide table columns or unclipped elements.
2. **Scroll Height Desynchronization:** Lenis smooth-scroll clipping the footer or leaving dead space after switching between `Editorial` and `Index` views.
3. **Legacy Link 404s:** External or internal traffic hitting the 3 old slugs (`munal-residence`, `dharan-foothills-villa`, `sal-kota-penthouse`) resulting in HTTP 404.
4. **Touch Device Preview Trapping:** Floating cursor preview lingering or covering touch targets on mobile touchscreens.
5. **Sticky Header & Text Collisions:** Lower headings scrolling visibly underneath the top navigation bar with unstyled transparency.

---

## Task Decomposition

### Task 1: Data Layer Migration, Typology Expansion & 301 Redirects
**Files to Modify:**
- `src/data/site.ts`: Update `Commission` type definition; update slugs, materiality specifications, typologies, and years; add optional `detailImage?: ImageMetadata` field.
- `vercel.json`: Create or update permanent 301 redirects from legacy slugs to new slugs.
- `astro.config.mjs`: Verify redirect configuration alignment.

**Steps:**
- [ ] Update `Commission` type in `src/data/site.ts` to include:
  - `slug`: `'fluted-master-suite' | 'formal-drawing-room' | 'heritage-panelled-gallery'`
  - `typology`: `'Private Residence' | 'Formal Reception' | 'Private Gallery'`
  - `year`: `'2024' | '2023' | '2024'`
  - `location`: `'Biratnagar' | 'Dharan' | 'Biratnagar'`
  - `detailImage?: ImageMetadata`
- [ ] Update the 3 commission entries in `commissions`:
  - `munal-residence` &rarr; `fluted-master-suite` (`Fluted Master Suite`, Typology: `Private Residence`, Year: `2024`, Location: `Biratnagar`)
  - `dharan-foothills-villa` &rarr; `formal-drawing-room` (`Formal Drawing Room`, Typology: `Formal Reception`, Year: `2023`, Location: `Dharan`)
  - `sal-kota-penthouse` &rarr; `heritage-panelled-gallery` (`Heritage Panelled Gallery`, Typology: `Private Gallery`, Year: `2024`, Location: `Biratnagar`)
- [ ] Rewrite `materials` array in each commission to be concise architectural specifications (timber, stone, metal, upholstery, lighting) rather than observational notes.
- [ ] Add `301` redirects in `vercel.json` (or `astro.config.mjs`):
  - `/works/munal-residence/` &rarr; `/works/fluted-master-suite/`
  - `/works/dharan-foothills-villa/` &rarr; `/works/formal-drawing-room/`
  - `/works/sal-kota-penthouse/` &rarr; `/works/heritage-panelled-gallery/`
- [ ] Sanitize global tagline and description in `src/data/site.ts` to purge banned words (`polished`, `functional`, `livable`).
- [ ] **Verification:** Run `npm run build` to verify routes generate with new slugs.

---

### Task 2: Individual Room Dossier Route Alignment (`/works/[slug].astro`)
**Files to Modify:**
- `src/pages/works/[slug].astro`: Update metadata labels, breadcrumbs, and next-project navigation links.

**Steps:**
- [ ] Rename `"Observed Details & Materials"` to `"Materiality"` on line 49.
- [ ] Replace hardcoded `"Eastern Nepal"` with dynamic `{commission.location} · {commission.year}`.
- [ ] Update fact sheet to display `Typology`, `Location`, `Year`, `Scope`, and `Studio`.
- [ ] Verify `<title>`, `<h1>`, breadcrumbs, and OpenGraph metadata match `/works/` verbatim.
- [ ] Ensure button retains `data-drawer-context={commission.title}` for seamless WhatsApp inquiry integration.
- [ ] **Verification:** Build test confirming `/works/fluted-master-suite/`, `/works/formal-drawing-room/`, and `/works/heritage-panelled-gallery/` render with zero errors.

---

### Task 3: Unified `/works/` Component with Minimalist `Editorial | Index` View Switcher
**Files to Modify:**
- `src/pages/works/index.astro`: Rewrite template to remove duplicate rendering; implement typographic view switcher (`Editorial | Index`); build asymmetric monograph editorial spreads; build precision hairline directory.
- `src/styles/site.css`: Add styling for view switcher, asymmetric spreads, zero-radius frames, and mobile responsiveness.
- `src/motion/works.ts`: Wire up view switcher state, cross-fade animations, cursor preview gating, and Lenis scroll resize.

**Steps:**
- [ ] Delete `"3 Selected Room Studies"` counter.
- [ ] Rewrite hero copy:
  - Eyebrow: `Portfolio · Biratnagar & Dharan`
  - Title: Monograph architectural title focused on proportion, daylight, and joinery.
  - Subhead: Restrained spatial copy with zero banned phrases.
- [ ] Add typographic view switcher:
  - Switzer uppercase `11px`, `letter-spacing: 0.14em`.
  - Active: `opacity: 1` with 1px bottom hairline; Inactive: `opacity: 0.4`, hover `0.75`. Zero pill backgrounds.
  - Default: `Editorial`.
- [ ] Build **`Editorial` View (Asymmetric Monograph Pacing)**:
  - **Study 01 (`Fluted Master Suite`):** 12-col grid &rarr; 8 cols primary 4:3 architectural frame + 4 cols bottom-aligned detail crop above quiet `Materiality` spec.
  - **Study 02 (`Formal Drawing Room`):** Full-width monumental 16:9 frame + 2-col hairline caption bar.
  - **Study 03 (`Heritage Panelled Gallery`):** Reversed asymmetry &rarr; 4 cols title/materiality/detail on left, 8 cols primary frame on right.
  - Full-bleed single-column stack on mobile (&le; 768px).
- [ ] Build **`Index` View (Precision Architectural Directory)**:
  - Remove all `"Hover row to preview"` / `"Tap any room study"` instructional copy.
  - Full-width 1px hairline rows, subtle hover tint, right-aligned `&rarr;` arrow translating 4px on hover.
  - Floating preview strictly gated behind `@media (hover: hover) and (pointer: fine)`.
  - Mobile (&le; 768px): 2-tier stacked row (Line 1: Index + Boska Title; Line 2: Typology/Location + Year + `&rarr;`) with zero horizontal overflow.
- [ ] Connect `Editorial | Index` switcher in `src/motion/works.ts`:
  - 350ms `cubic-bezier(0.22, 1, 0.36, 1)` cross-fade.
  - Immediately call `resizeScroll()` on view toggle to recalculate Lenis scroll dimensions.
  - Ensure listeners attach to `astro:page-load` for Astro ClientRouter compatibility.
- [ ] **Verification:** Verify toggle works cleanly in browser without layout flash or scroll clipping.

---

### Task 4: Layout Polish, Closing Transition & WhatsApp Modal Sanitization
**Files to Modify:**
- `src/pages/works/index.astro`: Replace `"The Rubiconius Promise"` with the quiet architectural closing transition to `/showroom/`.
- `src/layouts/Base.astro`: Sanitize footer copy; remove `"5.0 ★ (27 Google Reviews)"` from the WhatsApp consultation drawer; update modal header and subtitle.
- `src/styles/tokens.css` & `src/styles/site.css`: Enforce sticky header glassmorphism (`backdrop-filter: blur(16px)` + `scroll-padding-top: 88px`) and flex isolation on study cards.

**Steps:**
- [ ] Delete `"The Rubiconius Promise"` block completely from `/works/index.astro`.
- [ ] Add architectural closing transition above footer:
  - 1px top hairline divider with `padding-block: clamp(5rem, 9vw, 8rem)`.
  - Tracked Switzer eyebrow (`11px`, uppercase): `MATERIAL STUDY`.
  - Monumental Boska display link: `Enter the 3D Material Room &rarr;` linking to `/showroom/`.
- [ ] Sanitize `src/layouts/Base.astro`:
  - Footer lead copy: Rewrite without `"polished, functional"`.
  - Inquire Drawer header: Replace `"Direct Studio Brief · 5.0 ★ (27 Google Reviews)"` with:
    - Kicker: `Direct Studio Brief`
    - Subtitle: `Private Residential & Spatial Commissions · Biratnagar`
  - Keep all form inputs, prefill preview, and WhatsApp redirect logic completely intact.
- [ ] Implement Sticky Header Glassmorphism in `src/styles/site.css`:
  - `html { scroll-padding-top: 88px; }`
  - `.site-header { position: sticky; top: 0; z-index: 50; background: oklch(0.968 0.008 85 / 0.82); backdrop-filter: blur(16px) saturate(140%); -webkit-backdrop-filter: blur(16px) saturate(140%); border-bottom: 1px solid oklch(0.866 0.014 80 / 0.7); }`
- [ ] **Verification:** Test drawer opens cleanly, prefill generates correctly, and modal contains zero star ratings.

---

### Task 5: Repo-Wide Audit, Build Verification & Quality Assurance
**Steps:**
- [ ] **Repo-wide grep check:** Run regex scan across `src/` to verify zero banned words:
  `Observed Details|Selected Room Studies|Rubiconius Promise|Hover row to preview|Click to open dossier|Tap any room study|Google Reviews|5\.0 ★|polished|livable`
- [ ] **Build & Typecheck:** Run `npm run build` in `rubiconius-biratnagar` directory to confirm 0 compilation errors, 0 broken static paths, and clean HTML outputs.
- [ ] **Responsive & Visual Telemetry Check:** Inspect desktop (1440px) and mobile (390px) viewports to verify:
  - Zero double-layer text collisions on scroll.
  - Zero negative margin text collisions on `/works/`.
  - Zero duplicate project renders.
  - Working `Editorial | Index` switcher with smooth scroll height update.
  - Zero horizontal overflow.
