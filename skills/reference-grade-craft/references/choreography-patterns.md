# Pinned Multi-Stage Scroll Choreography Patterns

Reusable, production-proven patterns for award-winning long-scroll websites inspired by Lenis, Awwwards, and bespoke agency prototypes.

---

## 1. DOM Architecture for 6-Viewport Pinned Hero

```html
<!-- Outer track determines total scroll distance (e.g. 600vh) -->
<section id="hero" class="hero-track" data-stage="thesis">
  <!-- Pinned container remains locked at 100svh while user scrolls through the 600vh track -->
  <div class="hero-pin">
    <!-- Ambient visual backdrop (mesh grid, glowing gradients, video film layer) -->
    <div class="hero-bg" aria-hidden="true">
      <div class="bg-layer bg-navy"></div>
      <div class="bg-layer bg-paper"></div>
      <div class="bg-layer bg-grid"></div>
    </div>

    <!-- Muted ambient video container -->
    <div class="hero-film">
      <video id="hero-video" src="assets/media/clip.mp4" muted loop autoplay playsinline preload="auto"></video>
      <div class="film-overlay"></div>
    </div>

    <!-- Interactive SVG / 3D Canvas element (e.g. morphing hand or token) -->
    <svg id="stage-svg" viewBox="0 0 800 600" aria-hidden="true">
      <path id="morph-path" d="...initial pose..." />
    </svg>

    <!-- Phase 1: Thesis -->
    <div class="stage stage--thesis is-active" id="stage-thesis">
      <div class="stage-content">
        <h1>Authentic Thesis <span class="serif">Delivered Right</span></h1>
        <p>Ground-truth facts and verifiable client outcomes.</p>
      </div>
    </div>

    <!-- Phase 2: Structural Breakdown / Mechanics -->
    <div class="stage stage--details" id="stage-details">
      <div class="stage-content">
        <h2>Unfolding <span class="serif">Process</span></h2>
        <ul class="checklist">...</ul>
      </div>
    </div>

    <!-- Phase 3: Evidence Ledger -->
    <div class="stage stage--proof" id="stage-proof">
      <div class="stage-content">
        <div id="grant-ledger" class="ledger-grid">...10 real cards...</div>
        <div id="physical-stamp" class="stamp-seal">APPROVED</div>
      </div>
    </div>

    <!-- Scroll Progress Indicator -->
    <div class="stage-meter" aria-hidden="true">
      <span class="is-on"></span>
      <span></span>
      <span></span>
    </div>
  </div>
</section>
```

### Essential CSS:
```css
.hero-track {
  position: relative;
  height: 600vh; /* 6 viewports of scroll depth */
  width: 100%;
}

.hero-pin {
  position: sticky;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100svh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stage {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s ease, transform 0.4s ease;
  transform: translateY(20px);
}

.stage.is-active {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}
```

---

## 2. GSAP ScrollTrigger + Lenis Synchronization Engine

```javascript
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// 1. Natural Lenis Physics (Never throttle wheelMultiplier below 1)
const lenis = new Lenis({
  autoRaf: false,
  duration: 1.18,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  wheelMultiplier: 1.0,
  touchMultiplier: 1.5,
  wrapper: window,
  content: document.body,
});

// 2. Synchronize Lenis with ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);

// Pass velocity to CSS custom property for dynamic skew/blur effects
lenis.on('scroll', e => {
  const velocity = Math.max(-120, Math.min(120, (e.velocity || 0) * 10));
  document.documentElement.style.setProperty('--scroll-velocity', `${velocity}px`);
});

// Drive Lenis through GSAP's central RAF ticker
gsap.ticker.add(time => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// 3. Normalized ScrollTrigger Progress Driver
const heroTrack = document.getElementById('hero');

ScrollTrigger.create({
  trigger: heroTrack,
  start: 'top top',
  end: 'bottom bottom',
  scrub: 0.6, // Snappy response without sluggish drag
  onUpdate: self => {
    updateHeroStages(self.progress);
  },
});
```

---

## 3. Normalized Stage & Morph State Machine

```javascript
function updateHeroStages(p) {
  // Determine current active narrative phase
  const stage = p < 0.24 ? 'thesis' : p < 0.62 ? 'details' : 'proof';
  heroTrack.dataset.stage = stage;

  // Toggle active class on stage containers
  document.querySelectorAll('.stage').forEach(el => {
    el.classList.toggle('is-active', el.classList.contains(`stage--${stage}`));
  });

  // SVG Pose State Machine
  const pose = p < 0.24 ? 'point' : p < 0.62 ? 'open' : p < 0.82 ? 'stamp' : 'offer';
  const hand = document.getElementById('stage-svg');
  if (hand && hand.dataset.pose !== pose) {
    hand.dataset.pose = pose;
    // If MorphSVGPlugin is registered, morph to the designated pose path
    if (window.MorphSVGPlugin && POSE_PATHS[pose]) {
      gsap.to('#morph-path', { morphSVG: POSE_PATHS[pose], duration: 0.35, ease: 'power2.out' });
    }
  }

  // Physical Stamp Impact at p >= 0.82
  const stamp = document.getElementById('physical-stamp');
  if (stamp) {
    const isStamped = p >= 0.82;
    if (stamp.dataset.stamped !== String(isStamped)) {
      stamp.dataset.stamped = String(isStamped);
      if (isStamped) {
        gsap.fromTo(stamp, 
          { scale: 2.2, opacity: 0, rotation: -18 },
          { scale: 1.0, opacity: 1, rotation: -6, duration: 0.28, ease: 'back.out(2.2)' }
        );
      }
    }
  }

  // Navbar Unlock at p >= 0.995 (right before hero unpins)
  const nav = document.querySelector('.site-header');
  if (nav) {
    nav.dataset.state = p >= 0.995 ? 'unlocked' : 'locked';
  }
}
```

---

## 4. Fallback for Reduced-Motion & No-JS

Always include fallbacks so users without JavaScript or users with motion sensitivity retain 100% access to content:

```css
/* Prefers-reduced-motion: Stack all stages cleanly without pinning */
@media (prefers-reduced-motion: reduce) {
  .hero-track {
    height: auto !important;
  }
  .hero-pin {
    position: relative !important;
    height: auto !important;
    overflow: visible !important;
  }
  .stage {
    position: relative !important;
    opacity: 1 !important;
    transform: none !important;
    pointer-events: auto !important;
    padding: 4rem 1.5rem !important;
  }
  .site-header {
    position: sticky !important;
    top: 0 !important;
    transform: none !important;
  }
}

/* No-JS: If JS is disabled or fails */
.no-js .hero-track {
  height: auto !important;
}
.no-js .hero-pin {
  position: relative !important;
  height: auto !important;
}
.no-js .stage {
  position: relative !important;
  opacity: 1 !important;
  transform: none !important;
  pointer-events: auto !important;
}
```
