# Design Spec: Rubiconius Monograph + Standalone 3D Material Study

**Date:** 2026-11-22  
**Status:** Approved for execution  
**Scope:** Focused layout, copy, performance, and route-isolation overhaul across `/`, `/works/`, `/works/[slug]/`, `/practice/`, and `/showroom/` (copy-only alignment inside the standalone 3D drawer).

---

## 1. Intent & Why
Three specific issues block immediate buy-in from founder Riya Agrawal:
1. **Desktop Right-Hand Voids:** Capped-width plates (`.hero__plate` at `64%`, `.case-plate` at `960px`, portrait work frames at `640px`) sit flush-left inside a `1560px` container, leaving 35%–55% empty cream space on the right at `1440px`.
2. **Homepage Scroll Lag:** Mounting `<ShowroomStage mode="inline" />` (`600vh`), statically importing Three.js on `/`, and rendering a fullscreen `body::before` `mix-blend-mode: multiply` noise filter over the OGL daylight canvas add heavy GPU compositing overhead.
3. **Fabricated Metrics & Voice Mismatch:** Unverified square footages (`3,800`, `5,100`, `3,450 sq. ft.`), years (`2021–2025`), guessed streets (`Vijayapur Slope`), and generic minimalist jargon clash with Rubiconius's warm, modern-classic rooms and omit her real story, dual offices, hours, and verified channels (`RUBICONIUS-DATA.md`).

---

## 2. Approaches Considered & Choice
- **Approach A (Editorial + Dark 3D Preview Banner on `/`):** Separates 3D onto `/showroom/`, leaves a dark 3D portal banner on `/`.
- **Approach B (Pure Monograph, Remove 3D):** Maximum editorial cohesion, but gives up the custom Three.js differentiator.
- **Approach C (Keep Inline 3D on `/`):** Retains the `600vh` scroll track, GPU overhead, and aesthetic contrast directly on `/`.
- **Chosen — Hybrid (A + B):** Pure, cohesive, zero-3D editorial monograph across `/`, `/works/`, `/works/[slug]/`, and `/practice/`, with **`/showroom/` kept completely separate** (dynamically imported only on `/showroom/`).

---

## 3. Goals, Non-Goals & Anti-Goals
- **Goals:**
  - Zero right-hand voids at `1440px` via `.wrap` (`1320px`) and 12-column image+copy spreads.
  - Zero Three.js / `.glb` / Draco payloads downloaded on non-showroom routes.
  - 100% verified data from `RUBICONIUS-DATA.md`: dual offices (`Munal Path, Kochakhaltol, Biratnagar 56613` & `Gita Mandir Line, Dharan 56701`), hours (`Sun – Fri, 11 AM – 5 PM`), rating (`5.0 ★ · 27 reviews`), social channels (Instagram, Facebook, Houzz, YouTube), real services, and Riya's verified "crossing the Rubicon" and Kolkata-honed design voice.
  - Context-aware WhatsApp consultation drawer reflecting the active room/study and her actual services.
- **Non-Goals:** No backend/CMS, no new dependencies, no edits to Three.js rendering, `.glb` models, camera rails, or waypoint IDs/`u`/`cam`/`target`/`anchor`.
- **Anti-Goals:** No fabricated sq. ft., years, locations, or fake exclusivity badges; no scroll pinning traps; no over-stretching low-res photos; include only the 3 cleanest real rooms (do not add `real-wood-study.jpg`).

---

## 4. Page & Component Architecture
- **Global (`tokens.css`, `site.css`, `Base.astro`, `setup.ts`):** Remove `body::before` `mix-blend-mode` noise; tighten `.wrap` to `1320px`; dynamically import `../engine/showroom` inside `onPage` only when on `/showroom/`; wire both offices, hours, and verified social channels in footer; add room-aware context (`data-drawer-context`) and `5.0 ★ · 27 Google Reviews` proof to `#consult-drawer`.
- **Home (`/`):** Asymmetric 12-col hero (`real-dining-hall.jpg` cols 1–7, headline + bio + CTA cols 8–12) → 3-col `4/5` Selected Works grid → Capabilities & Handpicked Craft diptych (5 real services + `real-lounge-vignette.jpg`) → Crossing the Rubicon quote + 4 verified studio facts + subtle link to `/showroom/`.
- **Works (`/works/` & `/works/[slug]/`):** Honest directory columns (`No.`, `Space`, `Scope`, `Focus`, `Region`); 12-col feature spreads on `/works/`; 12-col plate + dossier sidebar spread on `/works/[slug]/` with room-specific WhatsApp trigger.
- **Practice (`/practice/`):** Split hero + 12-col studio plate beside Biratnagar & Dharan offices, hours, rating, and verified channels + founder story & 3-stage process below.
- **Showroom (`/showroom/` & `drawer.ts`):** Standalone 3D concept preview only; pin drawer reads honest `materialStudies` concept entries and links to `/works/` rather than tying unrelated residences to 3D pins.
