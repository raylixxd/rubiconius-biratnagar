# Rubiconius Architecture — Design & Motion Architecture Lock

## 1. Studio & Concept Card
- **Brand:** Rubiconius Interior Architecture (`Biratnagar & Dharan, Nepal`)
- **Principal:** Riya Agrawal (`26.4678° N, 87.2767° E` · `Sun to Fri, 11 AM to 5 PM`)
- **Concept:** An architectural monograph built on OTTO Objects scroll physics, tactile surface transitions, pure vector elevation drafting, and real-time 3D spatial walkthroughs. Zero e-commerce tropes, zero ornamental clutter.

## 2. Vault Reference Lock
| Layer | Primary Reference | Mechanics Applied |
| :--- | :--- | :--- |
| **Scroll Backbone & Iris** | `40_otto_objects`, `24_studio_freight`, `01_igloo` | Lenis (`duration: 1.18`, `wheelMultiplier: 1.0`, `autoRaf: false` inside `gsap.ticker`), single mutable `uniformBus`, radial iris mask preloader capped at `1.2s`, proportional `1440px` unit `--s` with responsive `<= 767px` 4-col mobile reflow. |
| **Transparent Header & Theme** | `anuc_home`, `dhk_architects`, `40_otto_objects` | Fixed transparent coordinate header (zero background boxes on desktop) inverting `data-theme="dark" \| "light"` by section boundary, compressing central display headline `scale: 1 -> 0.28` on scroll. |
| **Hero WebGL & Surface Depth** | `16_lusion`, `06_unseen`, `40_otto_objects` | Full-bleed DOM-synced hero WebGL lens (`uniformBus.velocity` + spring-damper pointer ripples, switchable fluted glass / daylight caustics / warm grazing films). |
| **Editorial Story & Pinned Gallery** | `40_otto_objects`, `oh_architecture` | Asymmetric architectural thesis plates lifting into a pure borderless vector CAD room morph (`01 / 02 / 03`), then a pinned `100svh` horizontal gallery with internal counter-parallax (`xPercent: -8 -> +8`) and bottom `01-04` scrub ruler. |
| **Portfolio Lookbook & CAD Drafting** | `telha_clarke`, `oakame`, `21_studio_ko`, `40_otto_objects` | Asymmetric 12-column editorial lookbook with `W x D x H` room dimensions and clean `[ Lookbook | Index ]` view switch, followed by an interactive `1:20` vector CAD elevation sheet (`BlueprintEngine`). |
| **Dark Contrast, Spatial & Footer** | `dhk_architects`, `04_sculpting_harmony`, `20_snohetta`, `28_cuberto` | Abrupt `#1E1B1A` dark material showcase -> `#050505` obsidian commitment manifesto -> `120svh` difference material composition -> pinned 3D room walkthrough -> `100svh` monumental edge-to-edge SVG `RUBICONIUS` wordmark footer. |

## 3. Semantic Color Tokens (5 Core Tokens)
- `--ground-light`: `#EFECE6` (warm mineral alabaster paper)
- `--ground-dark`: `#1E1B1A` (charcoal architectural timber obsidian)
- `--ink`: `#3F3A38` (deep umber body ink) & `#F2F2F2` (high-contrast light ink on dark stages)
- `--muted`: `#8A827F` (graphite secondary captions)
- `--accent`: `#8A6A42` (brushed bronze accent-only ticks and active pins)

## 4. Typography Hierarchy (2 Families Max)
- **Display Serif:** `Boska` (monograph headlines, oversized chapter markers, monumental wordmark)
- **Grotesk Body & Micro-UI:** `Switzer` (tabular-nums dimensions, coordinates, navigation, specifications)

## 5. Multi-Stage Layout Rhythm (~28,000px to 31,000px, ~50s Native Scroll)
Zero adjacent sections share the same grid:
1. **Act 1 (`#cover`, Dark, `100svh`):** Uncluttered full-bleed architectural hero + WebGL lens + bottom shader selector.
2. **Act 2 (`#otto-story` + `.otto-spin-stage`, Light `#EFECE6`, `~5.8svh`):** Staggered asymmetric editorial thesis plates + `W x D x H` specs + pure borderless pinned 3-step SVG CAD room elevation morph.
3. **Act 3 (`#otto-gallery`, Light `#EFECE6`, `~4.4svh`):** Pinned `100svh` horizontal gallery with internal frame counter-parallax & bottom `01-04` scrub ruler (native touch horizontal swipe on `<= 767px`).
4. **Act 4 (`#works` + `#cad-sheet`, Light `#EFECE6`, `~5.2svh`):** Asymmetric 12-column Lookbook (`1-7`, `6-12`, `2-8`) with `[ Lookbook | Index ]` table toggle + embedded interactive 1:20 CAD drafting board.
5. **Act 5 (`#collection` + `#manifesto`, Dark `#1E1B1A` / `#050505`, `~3.8svh`):** Staggered dark commission showcase + obsidian `we [verb]` commitment ledger.
6. **Act 6 (`#atelier-close` + `#showroom-inline` + Footer, Light -> Dark `#1E1B1A`, `~8.4svh`):** Quiet `120svh` difference material selector -> pinned 6-viewport Three.js 3D architectural walkthrough -> `100svh` monumental SVG `RUBICONIUS` wordmark footer.
