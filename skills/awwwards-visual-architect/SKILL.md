---
name: awwwards-visual-architect
description: Build visually extraordinary, Awwwards Site of the Day and Apple-caliber websites using WebGL, GLSL shaders, Lenis and GSAP scroll choreography, DOM-to-WebGL synced planes, post-processing, kinetic 3D typography, curated UI/UX gallery research locks, and automated Playwright screenshot QA. Use whenever the user asks to build, design, redesign, or plan an award-winning, visually appealing, immersive, 3D, WebGL, Apple-grade, or Awwwards-level website, landing page, studio site, product launch, or portfolio, or asks to combine reverse-engineered sites, shaders, and creative coding repos into a flagship web experience.
---
# Awwwards Visual Architect

A full-stack creative direction and WebGL engineering system for shipping Awwwards Site of the Day and Apple-caliber websites with zero generic AI slop. It pairs research-first visual calibration from top UI/UX galleries with native scroll physics, shader-driven 3D depth, Samana Studio's 10 Invisible Details, and a mandatory Playwright screenshot and blind jury QA loop.

## When to Use

- Building a flagship portfolio, creative studio site, luxury brand, hospitality showcase, or product launch that must stand out visually.
- Redesigning an ordinary website into an immersive 3D, WebGL, or editorial motion experience.
- Combining reverse-engineered Awwwards sites, custom GLSL shaders, and creative coding GitHub repos into a cohesive build.
- Auditing or upgrading an existing frontend so it clears an Awwwards-grade visual bar across desktop and mobile.

## Core Philosophy

1. **Every paused frame is a poster.** Motion amplifies a composition; it never rescues a weak layout. Lock typography, lighting, and negative space before layering animation.
2. **One signature visual moment beats ten noisy gimmicks.** Build around a single unforgettable interaction tied to the brand's physical world, and keep everything around it quiet and precise.
3. **Research-first Reference Lock.** Never design from generic model defaults, and never average five inspiration sites into a bland middle. Study live galleries, pick one primary visual foundation, and borrow at most two specific details from other winners.
4. **Native physics and 60fps discipline.** Never artificially throttle scroll speed (`wheelMultiplier < 1.0`) or cause React re-renders inside scroll/pointer loops.

## Workflow

Execute all five phases in strict order. Write planning outputs into `DESIGN.md` before writing application code.

### Phase 1: Ground-Truth Brief and Gallery Research Lock

1. Audit all real client assets first (logos, photography, video, real copy). Never fabricate metrics, awards, registration numbers, or client logos. Mark unconfirmed items explicitly as placeholders.
2. Consult `references/galleries-and-benchmarks.md` to calibrate visual taste against live shipped work across Awwwards, The FWA, Godly, Refs.Gallery, Minimal Gallery, Typewolf, Site of Sites, Land-book, Lapa Ninja, and Refero.
3. Write a **Reference Lock** inside `DESIGN.md` naming:

- One primary foundation benchmark (live site or reverse-engineered disassembly).
- At most two specific visual details borrowed from secondary references.
- What must survive unchanged, what is rejected, and the locked role of every color token.

### Phase 2: First-Principles Concept and Art Direction (`DESIGN.md`)

1. Generate **three distinct visual concepts** from different territories (material/craft, physical metaphor, typographic/spatial system). Score each 1 to 5 on Originality, Fit, Feasibility, and Low Portability (lower portability is better because the concept belongs uniquely to this brand).
2. Lock one **Concept Card** in `DESIGN.md`:

- **Idea:** One sentence a stranger immediately understands.
- **Metaphor:** The physical world the site borrows its rules and lighting from.
- **Signature Moment:** The single unforgettable interactive moment and the exact shader/recipe powering it.
- **First-3-Seconds Emotion:** What the opening viewport should feel like.
- **Motion Verb:** Concrete physical behavior (for example: "cut like an aperture", "settle like heavy glass", "flow like liquid mercury").
- **Screenshot Frame:** The paused frame someone would screenshot and share.

3. Define the **Art Direction System** in `DESIGN.md`:

- **Palette:** 4 to 6 named semantic tokens (`--ground`, `--ink`, `--muted`, `--line`, `--accent`, `--curtain`). Keep accent accent-only, and use at most one soft off-center atmospheric radial glow on dark surfaces.
- **Typography:** Maximum 2 typefaces with fluid `clamp()` sizing and dramatic display-to-body contrast.
- **Layout Rhythm:** Assign a distinct layout family to every section so no two adjacent sections repeat the same grid.
- **Genericness Test:** List three default AI cliches you actively killed before writing code.

### Phase 3: Visual Engine and Shader Architecture

Consult `references/visual-engine-and-repos.md` for exact code contracts and `references/vault-routing-and-shaders.md` to match the domain to one primary GLSL shader and disassembly.

1. **Stack Selection (One Default + Escape Hatch):**

- Default for app features, forms, or React teams: **Next.js (App Router, TypeScript)** + React Three Fiber + `14islands/r3f-scroll-rig` + `pmndrs/react-postprocessing`.
- Escape hatch for pure motion/editorial showcases: **Astro** or self-contained static HTML/CSS/JS + `oframe/ogl` + `martinlaxenaire/curtainsjs` + GSAP/Lenis.

2. **Native Scroll and Zero-Re-Render Uniform Bus:**

- Initialize Lenis with `autoRaf: false`, `duration: 1.18`, exponential-out easing, `smoothWheel: true`, `wheelMultiplier: 1.0`, `touchMultiplier: 1.5`, driven by `gsap.ticker`. Keep ScrollTrigger `scrub <= 0.8`.
- Store `{ progress, velocity, pointerX, pointerY, pointerVelocity }` in a plain mutable ref/object and push directly to GLSL uniforms and CSS custom properties inside a single RAF loop.

3. **Five Visual Layers (Scale Spectacle to the Brief):**

- **DOM-to-WebGL Synced Planes:** Mirror key images/videos onto WebGL planes (`r3f-scroll-rig`, `curtainsjs`, or `lusionltd/WebGL-Scroll-Sync`) so media curves with scroll velocity and ripples on hover with zero opaque image boxes on colored canvases.
- **3D Stage, Vault Shader and Spline Camera:** Adapt one domain-matched GLSL shader (`creative_vault/recipes/shaders/`), drive 3D camera choreography along a scroll spline (`theatre-js/theatre` or GSAP), and keep a subtle living idle state.
- **Optical Post-Processing:** Use a single merged `EffectPass` (`pmndrs/postprocessing`) linking scroll velocity to subtle chromatic aberration, bloom, bokeh depth of field, and fine animated film grain.
- **Z-Depth Kinetic Typography:** Layer display type behind and in front of the 3D focal point (`protectwise/troika` or `SplitText` + `veltman/flubber` SVG masks).
- **5-Stage Pinned Hero Track:** Use a `500vh` to `600vh` outer track with a `100svh` sticky stage mapped across `[0.00-0.24]` thesis reveal, `[0.24-0.62]` 3D/plane choreography, `[0.62-0.82]` proof convergence, `[0.82-0.95]` tactile/shader climax, and `[0.95-1.00]` clean unpin and navbar dock.

### Phase 4: Hero-First Authored Build

1. Build and visually perfect the **Hero (first 3 seconds = 40% of total effort)** before coding lower sections.
2. Apply all **Samana Studio 10 Invisible Details** and enforce the **Anti-Slop Visual & Copy Kill List** in `references/craft-and-qa-gate.md`:

- Use `cubic-bezier(.16, 1, .3, 1)` or GSAP `expo.out` everywhere.
- Preserve at least 40% breathing whitespace on an 8pt scale.
- Animate only `transform` and `opacity` on DOM elements, cap WebGL DPR at `Math.min(window.devicePixelRatio, 2)`, and step down gracefully on low-end mobile GPUs.
- Redesign mobile (`390x844`) as a true reflow with `0px` horizontal overflow and >= 44x44px tap targets.
- Provide full `@media (prefers-reduced-motion: reduce)` unpinned fallbacks and readable `no-js` DOM states.

### Phase 5: Automated Playwright Visual QA and Blind Jury Loop

Never declare a build complete until it passes **at least two full QA cycles** using `references/craft-and-qa-gate.md`:

1. Build and serve locally; assert HTTP 200 and zero console or WebGL shader compilation errors.
2. Capture Playwright screenshots at Desktop `1440x900` (hero, mid-scroll, climax, lower sections, footer), Mobile `390x844` (hero, mid-scroll, overflow check), and `prefers-reduced-motion`.
3. Open and visually inspect every screenshot against the 12-point binary fail gate in `references/craft-and-qa-gate.md`. Reject immediately if any frame looks boxy, flat, cramped, clipped, or displays opaque image boxes.
4. Score blindly against the Awwwards rubric (Design 40%, Usability 30%, Creativity 20%, Content 10%). Fix the highest-impact defects and re-verify until every category clears `>= 8.0/10`.

## Gotchas

- **Never copy JSX stubs from `creative_vault/recipes/components/`:** Auto-generated `*Experience.tsx` files contain generic glassmorphism cards (`backdrop-blur-xl` + neon badges) that fail anti-slop rules. Extract only the real GLSL shaders (`recipes/shaders/*.ts`), blueprints, and 10 deep disassemblies.
- **Never use `useState` inside `pointermove` or `scroll` listeners:** Hooks that call `setState` on mouse movement cause 60 React re-renders per second and destroy frame pacing. Always mutate a `useRef` or uniform object inside RAF.
- **Never use `100vh` for sticky mobile stages:** Mobile browser address bars cause layout jumps; always use `100svh`.
- **Never lower `wheelMultiplier` below `1.0`:** Slowing the user's wheel to fake scroll length feels broken; increase the outer track height (`500vh-600vh`) instead.
- **Never stack multiple heavy shaders or glass cards:** One signature WebGL moment with generous negative space always outperforms visual clutter.
