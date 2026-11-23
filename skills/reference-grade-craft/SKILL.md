---
name: reference-grade-craft
description: Use when designing, building, or reviewing web interfaces, landing pages, long-scroll websites (like Lenis, Awwwards, STILL / FORM, or bespoke prototypes), or interactive frontends. Enforces deep thinking, architectural pre-planning, ground-truth asset discovery, authentic pinned multi-stage scroll choreography (without artificial scroll slowing), bespoke SVG/motion mechanics, zero-build or clean modern architectures, and 30-point browser acceptance audits.
---

# Reference-Grade Craft & Deep Architectural Planning

## Overview
This skill establishes the non-negotiable engineering and design standards required to produce world-class, award-winning web experiences matching **Lenis.dev**, **Awwwards Site of the Year**, **STILL / FORM**, and gold-standard client prototypes (e.g. `d30b35fb`).

It eliminates the five failure modes of generic AI web development:
1. **Hallucinated Fluff:** Inventing fake stats, registration badges, branch counts, or stock photos instead of discovering and elevating real client evidence.
2. **Artificial Scroll Throttling:** Artificially lowering `wheelMultiplier` (e.g., `0.88`) or inflating `scrub` (e.g., `2.0`), which makes pages feel sticky, laggy, and broken.
3. **Generic UI Clichés:** Dropping in cookie-cutter cards and pill badges instead of authoring bespoke SVG mechanics and tactile physical moments.
4. **Fragile Over-Engineering:** Relying on bloated, failing toolchains when high-performance, self-contained static HTML5/CSS3/Vanilla JS + locally vendored GSAP/Lenis provides instant 60fps load times and zero downtime.
5. **Unverified Claims:** Claiming a surface works without running automated headless browser checks across desktop, mobile, reduced-motion, and no-JS states.

---

## The Workflow: Four Compulsory Phases

Every web or UI task must proceed sequentially through these four phases:

```
[Phase 1: Deep Thinking & Ground Truth]
                ↓
[Phase 2: Architectural Planning & Scroll Mathematics]
                ↓
[Phase 3: Authored Implementation & Micro-Craft]
                ↓
[Phase 4: Automated Browser Verification]
```

---

## Phase 1: Deep Thinking & Ground Truth Discovery

Before writing any code or templates, pause and execute the [Deep Thinking Protocol](./references/deep-thinking-protocol.md):

1. **Interrogate the Reference Standard:**
   - What specific craft makes the reference site feel elite?
   - Identify the motion language: Is it continuous pinning? Viewport-to-inline coordinate docking? SVG line morphing? Physical impact feedback?
2. **Audit Local Disk for Real Evidence:**
   - Always search the workspace, parent directories, and asset folders for real assets before writing code:
     - Transparent logos and marks (`.png`, `.svg`).
     - Real advising, office, or product video (`.mp4`, `.webm` — optimized under 2MB).
     - Published customer/student portraits and outcome records.
     - Real geographical address, founding date, and brand colors.
3. **Establish Strict Evidence Boundaries:**
   - **Never invent** tax IDs, registration numbers, branch counts, fake revenue, or 100% guarantee promises.
   - If a detail is unconfirmed, mark it as a pre-launch gate; never fabricate it.

---

## Phase 2: Architectural Planning & Scroll Mathematics

Before writing code, draft the implementation plan covering:

1. **The Scroll Timeline Budget:**
   - For long-scroll experiences, establish an explicit pinned container (e.g., `height: 600vh` outer track with `position: sticky; top: 0; height: 100svh` stage).
   - Divide the normalized scroll progress $p \in [0, 1]$ into clear narrative stages:
     - **$p \in [0.00, 0.24]$: Stage 1 (Thesis / Hook / Preloader).** Brand mark stroke draw, bold thesis heading, ambient video background.
     - **$p \in [0.24, 0.62]$: Stage 2 (Structural Breakdown).** Unfolding process checklist, cards gliding in, procedural details released.
     - **$p \in [0.62, 0.82]$: Stage 3 (Evidence Convergence).** Real client outcome cards and published proof ledger.
     - **$p \in [0.82, 0.95]$: Stage 4 (Tactile Climax).** Physical impact event (e.g. `VISA GRANTED` stamp drops with scale bounce and rotation).
     - **$p \in [0.95, 1.00]$: Stage 5 (Stage Exit & Docking).** Hero unpins; navigation header unlocks and docks.
2. **Strict Scroll Physics Rules:**
   - Keep Lenis native: `duration: 1.18 - 1.2`, `easing: exponential out`, `smoothWheel: true`, `wheelMultiplier: 1.0`.
   - **NEVER** set `wheelMultiplier` below 1.0 or `scrub` above 0.8 to artificially stretch scroll time.
3. **Stack Selection:**
   - For interactive prototypes and high-craft landing pages, prefer zero-build static stacks with locally vendored GSAP (ScrollTrigger, DrawSVG, MorphSVG, SplitText) and Lenis.
   - If using Next.js/React, ensure zero hydration mismatches and strict dependency hygiene.

---

## Phase 3: Authored Implementation & Micro-Craft

See [Choreography Patterns](./references/choreography-patterns.md) for full reference code:

1. **Bespoke SVG Mechanics:**
   - Author multi-pose SVG elements that morph dynamically as scroll progress updates (e.g. hand poses: `point → open → stamp → offer`).
2. **Editorial Typography Hierarchy:**
   - Combine an authoritative display sans (e.g., Archivo, Syne) with an expressive, warm serif italic (e.g., Instrument Serif) for key narrative words.
3. **Physical Tactile Climax:**
   - Trigger physical impact animations using GSAP springs or keyframe stamps at designated scroll milestones ($p \approx 0.82$).
4. **Inclusive Fallbacks:**
   - `@media (prefers-reduced-motion: reduce)`: Unpin the stage and stack all content cleanly in readable vertical order.
   - `.no-js`: Ensure all stages, copy, and images are 100% visible if scripts are disabled or blocked.

---

## Phase 4: Automated Browser Verification

Never deliver work without automated testing. Run the verification script or equivalent Playwright/Puppeteer checks:

```bash
node scripts/verify-acceptance.mjs --dir <path-to-build>
```

### The Acceptance Checklist:
- [ ] HTTP 200 and DOM loads without runtime JavaScript console errors.
- [ ] Visual Render & Computed CSS Audit: Rendered elements must NOT fall back to browser default user-agent styles (e.g. unstyled raw inputs, unstyled bevel buttons, raw link blue). Visual screenshots must be inspected to guarantee CSS selectors and classes properly attached.
- [ ] Zero network requests leak to external third-party CDNs (all assets and libraries are locally vendored or bundled).
- [ ] Mobile audit (390px width): `scrollWidth <= innerWidth` with zero horizontal overflow.
- [ ] Pinned stage scrubs smoothly from 0.0 to 1.0 without jumping or freezing.
- [ ] Physical climax / stamp lands at the intended scroll milestone.
- [ ] Navigation header unlocks cleanly before the hero track unpins.
- [ ] `prefers-reduced-motion` and `no-js` display all content legibly.

---

## Anti-Slop Visual Craft & Reference-Fidelity Gate (Non-Negotiable)

Before any build is considered acceptable, enforce these five visual-craft rules:

1. **Zero Opaque Image Boxes on Canvas:** Never place opaque raster `.jpg`/`.png` rectangles onto a dark or colored background where the image's bounding box is visible against the page or blocks background typography/grid lines. Use true alpha-transparent cutouts, real-time procedural Three.js/WebGL 3D hardware, or precision SVG/Canvas rendering so subjects float cleanly on the stage.
2. **Visual Focal Point First (No Checklist Box-Stuffing):** Never reduce an Awwwards/Apple-grade brief into repetitive `1px` bordered boxes stuffed with small monospace labels. Nail the hero stage—dramatic lighting, confident display typography scale, generous negative space, and seamless depth—and visually inspect it *before* building secondary sections.
3. **Zero Sticky, HUD, or Backdrop Clipping:** Sticky control bars, floating docks, and text contrast backdrops must never clip scrolling content underneath, cast harsh rectangular boxes over stage visuals, or leave awkward oversized/odd-span empty grid cells.
4. **Benchmark-First Visual Calibration:** When reference URLs are provided (e.g., `apple.com/airpods-max/`, `scrolltide.co/`, `nothing.tech/`), inspect the live reference's actual spacing, typography contrast, lighting, and motion rhythm first—do not just extract CSS tokens and improvise a generic dark grid.
5. **Mandatory Human-Grade Screenshot Critique:** Always open and read the captured desktop and mobile screenshots via `read_file` after rendering. Zero console errors and `0px` horizontal overflow prove nothing about aesthetics; if a screenshot looks boxy, cramped, flat, or has visible image bounding boxes, treat it as a hard failure and redesign immediately.

---

## Samana Studio's 10 Invisible Details ("Before You Ship" Gate)

Apply these 10 non-negotiable craft standards (from `samana-guide.pdf`) to every high-craft build and run all 10 checks before shipping:

1. **Motion — Easing Curves (`cubic-bezier(.16, 1, .3, 1)`):** Nothing moves linearly or with generic `ease-in-out`. Every transition decelerates into place like a physical object.
2. **The Hero — First 3 Seconds (40% of Effort):** Engineer the opening viewport like a film title card: staggered line/word reveals (`y: 24 -> 0`, `opacity: 0 -> 1`, `stagger: 0.08`, `ease: "expo.out"`) + autonomous 3D/ambient motion even if the visitor does nothing.
3. **Scroll — Rhythm & Parallax:** Lenis smooth scroll + multi-speed depth parallax (`yPercent` / WebGL camera depth) so scrolling feels like unwrapping a space, never reading a document.
4. **Whitespace — Saying Less (8pt Scale + 40% Breathing Room):** Strip unnecessary cards, borders, and labels; enforce an 8px spacing scale with generous section padding so every remaining element feels intentional.
5. **Depth — WebGL & 3D Space:** Build a true 3D space (`Three.js` / WebGL layers + reacting light/shadow, or `perspective: 800px` `rotateX`/`rotateY` tilt) rather than a flat 2D stack.
6. **Presence — Micro-Interactions:** Subtle `pointermove` depth/glow response per layer (desktop only, `transform`/`opacity` only) that eases smoothly back to center on leave.
7. **Type — Scale & Discipline:** Maximum 2 typefaces; dramatic size contrast (**huge display `clamp()` + small crisp body/eyebrow — never medium everywhere**). Display type integrates *into* the scene.
8. **Color — Intentional Dark Atmosphere:** Use **one** soft, off-center `radial-gradient` atmospheric glow (e.g., `radial-gradient(760px 520px at 82% -10%, rgba(..., .09), transparent 60%)`)—never noisy patterns or competing glows—so dark surfaces act as jewelry-store lighting.
9. **Performance — 60fps Compositor Discipline:** Animate **only `transform` and `opacity`** on DOM elements and budget WebGL draw calls so mid-range mobile phones hold 60fps.
10. **Narrative — Open Loops:** Every section has one eyebrow label, one implied question in its headline, and a closing hand-off into the next section—ending with a natural pull to contact/act.
