# 1:1 Reconstruction Blueprint: Locomotive
**Target URL:** https://locomotive.ca/  
**Category:** Editorial & Motion  
**Benchmark Tier:** High-Ticket Production Grade  

---

## 1. Executive Summary & Aesthetic Architecture
* **Visual Signature:** Locomotive relies on a high-discipline layout characterized by precise visual hierarchy, micro-interactions, and fluid responsiveness.
* **Core Technical Stack Detected:** Three.js, WebGL 2.0, GSAP, GSAP ScrollTrigger, Lenis Smooth Scroll, Locomotive Scroll, PixiJS, Framer Motion, Next.js, Barba.js Paging, Web Audio API, Draco Compression, Basis/KTX2 Textures
* **Motion Choreography:** Lenis operating with duration 1.15s - 1.25s, easing `cubic-bezier(0.25, 1, 0.5, 1)`.

---

## 2. Design Tokens & Styling Recipe
* **Typography Hierarchy:**
  - `ff("primary")`
  - `inherit`
  - `monospace,monospace`
  - `var(--bs-ff)`
* **Core Color Palette Tokens:**
  - `#ddd`
  - `#312DFB`
  - `#000`
  - `#bbbcc4`
  - `#039`
  - `#FFFFFF`
  - `#ccc`
  - `#fff`
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
* **Extracted 3D Geometry:** 1 models discovered (uploads/team/3d/fred2024_2-rigged.compressed.glb,uploads/team/3d/jeff-rigged.compressed.glb,uploads/team/3d/mat-rigged.compressed.glb,uploads/team/3d/dust2024-rigged.compressed.glb,uploads/team/3d/mc-rigged.compressed.glb,uploads/team/3d/bastien-rigged.compressed.glb,uploads/team/3d/julien-rigged.compressed.glb,uploads/team/3d/ben-rigged.compressed.glb,uploads/team/3d/chauncey-rigged.compressed.glb,uploads/team/3d/jeremy-rigged.compressed.glb,uploads/team/3d/arnaud-rigged.compressed.glb,uploads/team/3d/xavier-rigged.compressed.glb,uploads/team/3d/pascal-rigged.compressed.glb,uploads/team/3d/michel-rigged.compressed.glb,uploads/team/3d/charles-rigged-2.compressed.glb,uploads/team/3d/nath-rigged.compressed.glb,uploads/team/3d/maureen-rigged-2.compressed.glb,uploads/team/3d/simon-rigged.compressed.glb,uploads/team/3d/steph-rigged.compressed.glb,uploads/team/3d/lea-rigged.compressed.glb,uploads/team/3d/leo-rigged.compressed.glb,uploads/team/3d/laurence-rigged.compressed.glb,uploads/team/3d/alex-gatteffosse-compressed.glb,uploads/team/3d/rebeka-rigged.compressed.glb,uploads/team/3d/hugo-rigged.compressed.glb,uploads/team/3d/mathis-humbert_compressed.glb,uploads/team/3d/cath-dorion_rigged.compressed.glb,uploads/team/3d/olivier-tardif-compressed.glb)
* **Extracted Textures & Imagery:** 19 media references identified
* **Audio Stems:** 1 audio triggers found
* **GLSL / Custom Shaders:** 28 shader functions isolated

---

## 5. 1:1 Implementation Roadmap
1. **Scaffold:** Next.js (App Router) + Tailwind CSS + Lucide Icons.
2. **Motion:** Wire up `@studio-freight/lenis` and `gsap` with `ScrollTrigger`.
3. **Typography:** Match typographic contrast: large fluid headers (`clamp(2.5rem, 6vw, 6.5rem)`) with high line-height, tight tracking (`-0.03em`), paired with high-legibility body (`1rem` / `1.6` line-height).
4. **Imagery & Media:** High-contrast imagery with subtle `scale(1.05)` hover transitions and smooth opacity fades.
