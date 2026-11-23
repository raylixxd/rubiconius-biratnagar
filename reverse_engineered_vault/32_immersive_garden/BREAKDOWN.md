# 1:1 Reconstruction Blueprint: Immersive Garden
**Target URL:** https://immersive-g.com/  
**Category:** 3D & WebGL  
**Benchmark Tier:** High-Ticket Production Grade  

---

## 1. Executive Summary & Aesthetic Architecture
* **Visual Signature:** Immersive Garden relies on a high-discipline layout characterized by precise visual hierarchy, micro-interactions, and fluid responsiveness.
* **Core Technical Stack Detected:** Three.js, WebGL 2.0, GSAP, GSAP ScrollTrigger, Lenis Smooth Scroll, Framer Motion, Next.js, Nuxt / Vue, Web Audio API, Draco Compression, Basis/KTX2 Textures
* **Motion Choreography:** Lenis operating with duration 1.15s - 1.25s, easing `cubic-bezier(0.25, 1, 0.5, 1)`.

---

## 2. Design Tokens & Styling Recipe
* **Typography Hierarchy:**
  - `HelveticaNeueLight,sans-serif`
  - `monospace,monospace`
  - `HelveticaNeueRegular`
  - `var(--font-family)`
  - `HelveticaNeueRegular,sans-serif`
* **Core Color Palette Tokens:**
  - `#030303`
  - `#ddd`
  - `#173`
  - `#00FF00`
  - `#e8e8e8`
  - `#c8cad0`
  - `#362c1f`
  - `#000`
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
    scrub: 0.6,
  }
});
```

---

## 4. Discovered Assets & Resources
* **Extracted 3D Geometry:** 16 models discovered (.glb, /webgl/about-detail/global_compressed.glb, /webgl/about-detail/scene_1_compressed.glb)
* **Extracted Textures & Imagery:** 165 media references identified
* **Audio Stems:** 6 audio triggers found
* **GLSL / Custom Shaders:** 79 shader functions isolated

---

## 5. 1:1 Implementation Roadmap
1. **Scaffold:** Next.js (App Router) + Tailwind CSS + Lucide Icons.
2. **Motion:** Wire up `@studio-freight/lenis` and `gsap` with `ScrollTrigger`.
3. **Typography:** Match typographic contrast: large fluid headers (`clamp(2.5rem, 6vw, 6.5rem)`) with high line-height, tight tracking (`-0.03em`), paired with high-legibility body (`1rem` / `1.6` line-height).
4. **Imagery & Media:** High-contrast imagery with subtle `scale(1.05)` hover transitions and smooth opacity fades.
