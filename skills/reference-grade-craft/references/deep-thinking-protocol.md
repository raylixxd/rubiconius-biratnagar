# Deep Thinking & Architectural Planning Protocol

This protocol must be executed before writing any code, scaffolding components, or drafting copy for web and UI tasks. It prevents the primary failure modes of AI-generated web interfaces: generic SaaS fluff, fake claims, broken scroll physics, and bloated, brittle architectures.

---

## 1. Deep Thinking: The First-Principles Interrogation

Before typing a single line of HTML, CSS, or JS, pause and answer these five questions in your thinking process:

1. **What is the True Reference Standard?**
   - If the user references Lenis, Awwwards, STILL / FORM, Truus, or bespoke local prototypes (e.g., `d30b35fb`): What makes that reference elite?
   - Is it smooth-scrolled continuous pinning? Bespoke SVG choreography? Authentic editorial typography? Tactile physical feedback?
   - *Trap to avoid:* Never imitate an award-winning site by simply slowing down the user's scrollbar. That creates sticky, sluggish frustration.

2. **What is the Ground-Truth Evidence Boundary?**
   - What real assets exist right now on the disk or in the repo? (Logos, transparent marks, real videos, student/client portraits, actual location addresses).
   - What is strictly *unconfirmed*? (Registration numbers, tax IDs, branch counts, fake revenue/visas, price tags).
   - *Ironclad rule:* Never invent statistics, claims, or testimonials. Real proof always outperforms hallucinated superlatives.

3. **What is the Narrative Arc of the Scroll?**
   - A world-class hero is not a static 100vh banner with text and a button. It is a **multi-stage pinned journey** (typically 4.0 to 8.0 viewports long).
   - How does the thesis state itself? How do details unfold? Where does proof converge? Where does the physical climax hit? When does navigation unlock?

4. **What is the Architectural Stack for Maximum Velocity & Reliability?**
   - Does this need a heavyweight framework, or is a zero-build, self-contained static HTML5/CSS3/Vanilla JS + locally vendored GSAP & Lenis stack 10x faster, zero-maintenance, and locked at 60fps?
   - If using Next.js/React: Is hydration clean? Are dependencies locked? Is bundle overhead minimized?

5. **What Are the Failure Modes & Edge Cases?**
   - What happens on mobile (390px viewport width)? Is there horizontal overflow?
   - What happens if the user has `prefers-reduced-motion` enabled?
   - What happens if JavaScript fails to load (`no-js` fallback)?

---

## 2. Pinned Multi-Stage Scroll Mathematical Formula

When building a long-scroll hero or section, never alter wheel speed artificially. Use native Lenis physics and map the pinned scroll progress $p \in [0, 1]$ across explicit narrative stages:

### Physics Settings:
```javascript
const lenis = new Lenis({
  autoRaf: false,
  duration: 1.18, // Natural inertia deceleration
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential out
  smoothWheel: true,
  wheelMultiplier: 1.0, // NEVER drop below 1.0 to fake "length"
  touchMultiplier: 1.5,
});
```

### Stage Budgeting:
| Normalized Progress ($p$) | Stage | Visual & Interaction Choreography |
| :--- | :--- | :--- |
| **$0.00 - 0.24$** | **Phase 1: Thesis / Preloader** | Brand mark stroke draw, opening thesis typography reveal, video ambient background. Hand pose: `point`. |
| **$0.24 - 0.62$** | **Phase 2: Mechanics & Breakdown** | Unfolding procedural checklist, cards glide into view, details released progressively. Hand pose: `open`. |
| **$0.62 - 0.82$** | **Phase 3: Evidence Convergence** | Real outcome portraits and grant records slide into a ledger or carousel. Hand pose: `stamp`. |
| **$0.82 - 0.95$** | **Phase 4: Tactile Climax** | Physical impact event (e.g. `VISA GRANTED` stamp drops with scale bounce, shake, and seal ring). Hand pose: `offer`. |
| **$0.95 - 1.00$** | **Phase 5: Stage Exit & Docking** | Pinned stage unpins cleanly; persistent site header unlocks from hidden/locked state and docks at top-0. |

---

## 3. Real Asset Discovery Checklist

Before writing templates, run local discovery commands:
1. Scan for transparent logo PNGs/SVGs (`logo-white.png`, `mark.png`, `favicon.svg`).
2. Scan for authentic photography and video (`.mp4`, `.webm`, `.webp`, `.jpg`). Verify video bitrate is optimized (< 2MB, muted, loop, playsinline).
3. Extract real client data: real branch address, founding year, verified client outcomes.
4. Mark unverified details with explicit comments or admin gates—never publish fake numbers.

---

## 4. Authored Craft Over Stock Components

1. **Bespoke SVG Mechanics:**
   - Author custom SVG elements (e.g., `#document-hand` morphing between distinct postures using GSAP `MorphSVGPlugin`).
   - Use `DrawSVGPlugin` for preloader outlines, signature paths, and progress lines.
2. **Editorial Typography:**
   - Pair an authoritative display sans (e.g., Archivo, Syne, Neue Haas Grotesk) with an expressive, warm serif italic (e.g., Instrument Serif, Playfair) for high-contrast emphasis words.
   - Use `SplitText` to reveal headings word-by-word or character-by-character on scroll scrub.
3. **Tactile Feedback:**
   - Stamp impacts, card dockings, coordinate morphs, and subtle sound or haptic visual shakes.

---

## 5. Automated Verification Gates

Never declare a web surface ready without running browser checks:
1. HTTP status 200, zero console errors, zero runtime requests leaking to external CDNs.
2. Pinned stage completes full narrative from 0 to 1 without jumping or sticking.
3. Responsive viewport test (390x844 mobile): `scrollWidth <= innerWidth` (zero horizontal overflow).
4. Accessibility: `prefers-reduced-motion` degrades to unpinned readable stack; `no-js` ensures all content is visible in the DOM.
