# 1:1 Reconstruction Blueprint: Vide Infra (Sobha Privy)
**Target URL:** https://videinfra.com/  
**Category:** Architecture & Luxury  
**Benchmark Tier:** High-Ticket Production Grade  

---

## 1. Executive Summary & Aesthetic Architecture
* **Visual Signature:** Vide Infra (Sobha Privy) relies on a high-discipline layout characterized by precise visual hierarchy, micro-interactions, and fluid responsiveness.
* **Core Technical Stack Detected:** Three.js, WebGL 2.0, WebGPU, Locomotive Scroll, PixiJS, Next.js, Barba.js Paging, Web Audio API, Draco Compression, Basis/KTX2 Textures
* **Motion Choreography:** Locomotive operating with duration 1.15s - 1.25s, easing `cubic-bezier(0.25, 1, 0.5, 1)`.

---

## 2. Design Tokens & Styling Recipe
* **Typography Hierarchy:**
  - `lil-gui`
  - `var(--font-family-mono)`
  - `var(--font-family)`
* **Core Color Palette Tokens:**
  - `#039`
  - `#020`
  - `#0ff`
  - `#002`
  - `#4f4f4f`
  - `#111111`
  - `#a2db3c`
  - `#ebebeb`
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
* **Extracted 3D Geometry:** 6 models discovered (/assets/webgl/models/awwwards.glb, /assets/webgl/models/cssda.glb, /assets/webgl/models/fwa.glb)
* **Extracted Textures & Imagery:** 27 media references identified
* **Audio Stems:** 0 audio triggers found
* **GLSL / Custom Shaders:** 12 shader functions isolated

---

## 5. 1:1 Implementation Roadmap
1. **Scaffold:** Next.js (App Router) + Tailwind CSS + Lucide Icons.
2. **Motion:** Wire up `@studio-freight/lenis` and `gsap` with `ScrollTrigger`.
3. **Typography:** Match typographic contrast: large fluid headers (`clamp(2.5rem, 6vw, 6.5rem)`) with high line-height, tight tracking (`-0.03em`), paired with high-legibility body (`1rem` / `1.6` line-height).
4. **Imagery & Media:** High-contrast imagery with subtle `scale(1.05)` hover transitions and smooth opacity fades.
