# Craft Standards, Anti-Slop Kill List, and 12-Point Visual QA Gate

Apply these standards during Phase 4 and enforce every binary check in Phase 5 before shipping.

## 1. Samana Studio's 10 Invisible Details

1. **Physical Easing:** Use `cubic-bezier(.16, 1, .3, 1)` or GSAP `expo.out` everywhere. Never use linear or generic `ease-in-out`.
2. **Hero First 3 Seconds (40% of Effort):** Engineer the opening viewport like a film title card with staggered reveals (`y: 24 -> 0`, `opacity: 0 -> 1`, `stagger: 0.08`, `expo.out`) and autonomous ambient motion.
3. **Scroll Rhythm and Parallax:** Layer multi-speed parallax (`yPercent` and 3D camera depth) so scrolling feels spatial.
4. **40% Breathing Whitespace:** Enforce an 8pt spacing scale and strip unnecessary borders, cards, and pill badges.
5. **True Spatial Depth:** Use WebGL 3D space or `perspective: 800px` layered parallax rather than flat 2D stacks.
6. **Subtle Presence:** Add desktop-only `pointermove` light/tilt response (`transform`/`opacity` only) that eases smoothly back on leave.
7. **Typographic Scale Discipline:** Maximum 2 font families with extreme display-to-body contrast.
8. **Intentional Atmospheric Light:** Use at most one soft, off-center `radial-gradient` atmospheric glow on dark surfaces (`rgba(..., .09)`).
9. **60fps Compositor Discipline:** Animate only `transform` and `opacity` on DOM elements.
10. **Open-Loop Narrative Flow:** Give each section one clear focal idea and a visual hand-off into the next section.

## 2. Anti-Slop Visual and Copy Kill List

Reject and redesign immediately if any of these appear:

- Generic purple-blue AI gradients, glowing neon borders everywhere, or glassmorphism card spam.
- Centered generic hero over a random gradient blob.
- Opaque rectangular `.jpg` or `.png` image boxes sitting visibly on dark or colored stages (use alpha cutouts, shader-blended WebGL planes, or procedural 3D geometry).
- Repetitive 3-column equal feature cards, uniform bento grids, "How It Works 1-2-3" templates, or fake "Trusted By" logo bars.
- Decorative `01 / 02 / 03` numerals on content that is not an actual sequence.
- Hiding the native cursor or shipping fake preloaders longer than 1.2 seconds.
- AI copy cliches ("elevate", "seamless", "unleash", "cutting-edge", "passionate about") or em/en dashes in visible UI copy.
- Invented metrics, fake testimonials, or unverified client credentials.

## 3. Mobile Reflow and Inclusive Fallbacks

- Redesign mobile (`390x844`) with intentional re-stacking and fluid `clamp()` scaling, never a shrunk desktop layout.
- Assert `document.documentElement.scrollWidth <= window.innerWidth` (`0px` horizontal overflow).
- Keep tap targets `>= 44x44px` and never hide core actions behind hover-only triggers.
- `@media (prefers-reduced-motion: reduce)` must unpin sticky tracks (`height: auto; position: relative;`) and display every stage cleanly.
- `.no-js` fallback must keep all content visible in the DOM if scripts fail.

## 4. Mandatory 12-Point Playwright Screenshot and Blind Jury Gate

Capture Playwright screenshots at Desktop `1440x900` (hero `p=0.05`, mid-scroll `p=0.45`, climax `p=0.88`, lower sections, footer), Mobile `390x844`, and `prefers-reduced-motion`. Open and visually inspect every screenshot against all 12 binary checks:

- [ ] HTTP 200 with zero runtime JS or WebGL shader console errors.
- [ ] Opening hero reads like an Awwwards SOTD / Apple title card within 3 seconds.
- [ ] Zero opaque rectangular image boxes visible on dark or colored backgrounds.
- [ ] Zero generic glass cards, purple AI gradients, or cookie-cutter 3-column rows.
- [ ] At least 40% intentional whitespace and dramatic display-to-body typography contrast.
- [ ] Sticky navigation bars and HUDs never clip scrolling content underneath.
- [ ] WebGL/shader focal point renders crisply with zero black canvas or broken fallback.
- [ ] Mobile `390x844` has `0px` horizontal overflow and clean vertical reflow.
- [ ] `prefers-reduced-motion` renders 100% readable without trapped pinned sections.
- [ ] Visible UI copy is free of AI buzzwords and em/en dashes.
- [ ] Zero unstyled browser-default buttons, inputs, or raw blue links.
- [ ] Blind Awwwards jury audit (`Design 40%`, `Usability 30%`, `Creativity 20%`, `Content 10%`) scores `>= 8.0/10` in every category.

If any single box fails, fix the root cause and re-run Playwright verification (minimum 2 full passes) before shipping.
