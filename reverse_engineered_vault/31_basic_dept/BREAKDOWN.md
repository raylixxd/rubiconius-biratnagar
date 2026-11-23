# 1:1 Reconstruction Blueprint: Basic/Dept
**Target URL:** https://www.basicagency.com/  
**Category:** Editorial & Motion  
**Benchmark Tier:** High-Ticket Production Grade  

---

## 1. Executive Summary & Aesthetic Architecture
* **Visual Signature:** Basic/Dept relies on a high-discipline layout characterized by precise visual hierarchy, micro-interactions, and fluid responsiveness.
* **Core Technical Stack Detected:** Three.js, Framer Motion, Next.js, Web Audio API
* **Motion Choreography:** CSS/Native Inertia operating with duration 1.15s - 1.25s, easing `cubic-bezier(0.25, 1, 0.5, 1)`.

---

## 2. Design Tokens & Styling Recipe
* **Typography Hierarchy:**
  - System Luxury Sans / Serif Pairing (Editorial Grade)
* **Core Color Palette Tokens:**
  - `#c79494`
  - `#424e1b`
  - `#3e4146`
  - `#5c5137`
  - `#8c7972`
  - `#cbbfa6`
  - `#5f1b09`
  - `#dd9b9b`
* **Grid & Whitespace Rules:**
  - Container Max-Width: `1440px` - `1600px`
  - Horizontal Gutter: `clamp(1.5rem, 5vw, 5rem)`
  - Section Spacing: `clamp(5rem, 12vh, 12rem)`

---

## 3. Motion & Interaction Blueprint (1:1 Ratio Recipe)
* **Smooth Scroll Setup:**
```typescript
import Lenis from '@studio-freight/lenis';

export const initLenis = () => {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1.0,
    touchMultiplier: 2.0,
  });

  function raf(time: number) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  return lenis;
};
```

* **ScrollTrigger Parallax Formula:**
```typescript
gsap.to('.hero-visual', {
  yPercent: 15,
  ease: 'none',
  scrollTrigger: {
    trigger: '.hero-container',
    start: 'top top',
    end: 'bottom top',
    scrub: 1.0,
  }
});
```

---

## 4. Discovered Assets & Resources
* **Extracted 3D Geometry:** 0 models discovered (None / Procedural)
* **Extracted Textures & Imagery:** 50 media references identified
* **Audio Stems:** 0 audio triggers found
* **GLSL / Custom Shaders:** 0 shader functions isolated

---

## 5. 1:1 Implementation Roadmap
1. **Scaffold:** Next.js (App Router) + Tailwind CSS + Lucide Icons.
2. **Motion:** Wire up `@studio-freight/lenis` and `gsap` with `ScrollTrigger`.
3. **Typography:** Match typographic contrast: large fluid headers (`clamp(2.5rem, 6vw, 6.5rem)`) with high line-height, tight tracking (`-0.03em`), paired with high-legibility body (`1rem` / `1.6` line-height).
4. **Imagery & Media:** High-contrast imagery with subtle `scale(1.05)` hover transitions and smooth opacity fades.
