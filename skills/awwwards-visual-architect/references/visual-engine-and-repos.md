# Visual Engine, GitHub Repos, and Scroll Math Contracts

Use these exact repositories and mathematical contracts in Phase 3 to build 60fps WebGL, optical post-processing, and pinned scroll choreography.

## 1. Open-Source Visual GitHub Repository Stack

| Visual Layer | Repository | Purpose |
| :--- | :--- | :--- |
| **Smooth Scroll** | `https://github.com/darkroomengineering/lenis` | Native-feel inertia scroll driving GSAP ScrollTrigger and live velocity shader uniforms. |
| **Core Motion & ScrollTrigger** | `https://github.com/greensock/gsap` and `https://github.com/greensock/gsap-skills` | 100% free GSAP engine (ScrollTrigger, SplitText, MorphSVG, DrawSVG, Flip, Draggable, MotionPath) plus official React/SSR `useGSAP()` rules. |
| **React Spring & Layout Morphs** | `https://github.com/motiondivision/motion` | Hardware-accelerated spring physics, gestures, and shared-element layout transitions for React/JS UI. |
| **DOM-to-WebGL Sync (Ref)** | `https://github.com/lusionltd/WebGL-Scroll-Sync` | Lusion's canonical zero-drift synchronization between HTML DOM bounds and WebGL meshes. |
| **DOM-to-WebGL (React/R3F)** | `https://github.com/14islands/r3f-scroll-rig` | Syncs React/Next.js DOM images and sections directly onto R3F meshes with Lenis. |
| **DOM-to-WebGL (Vanilla)** | `https://github.com/martinlaxenaire/curtainsjs` | Turns HTML images/videos into shader-warped WebGL planes (React wrapper: `martinlaxenaire/react-curtains`). |
| **3D Studio Materials & Helpers** | `https://github.com/pmndrs/drei` and `https://github.com/pmndrs/drei-vanilla` | Studio lighting, `MeshTransmissionMaterial` glass, `Environment`, `Lightformers`, `Caustics`, and `ContactShadows` for Apple-grade 3D polish. |
| **Real-Time 3D Physics (WASM)** | `https://github.com/pmndrs/react-three-rapier` | Rust WASM rigid-body physics, collisions, and instanced mesh physics (Bruno Simon / Lusion interactive worlds). |
| **GLSL / WGSL Shader Library** | `https://github.com/patriciogonzalezvivo/lygia` | Granular multi-language shader library (GLSL, WGSL, TSL) for procedural noise, SDFs, lighting, blur, and optical distortion. |
| **Minimal WebGL Engine** | `https://github.com/oframe/ogl` | Lightweight WebGL core (used by Lusion) for custom shaders without full Three.js bundle weight. |
| **2D WebGL / WebGPU Canvas** | `https://github.com/pixijs/pixijs` | Ultra-fast 2D WebGL/WebGPU renderer for liquid image distortion, displacement filters, and interactive particle VFX. |
| **State-Machine Vector Motion** | `https://github.com/rive-app/rive-wasm` | Interactive JS/WASM runtime for Rive animations (used on Lando Norris and MindMarket for crisp micro-motion without heavy WebGL). |
| **Optical Post-Processing** | `https://github.com/pmndrs/postprocessing` and `https://github.com/pmndrs/react-postprocessing` | Single merged `EffectPass` for velocity-reactive RGB chromatic aberration, bloom, bokeh DOF, lens distortion, and film grain. |
| **Spline 3D Camera Editor** | `https://github.com/theatre-js/theatre` | Keyframe and spline choreography for scrubbing 3D cameras, lights, and shader uniforms on scroll. |
| **3D Kinetic Typography** | `https://github.com/protectwise/troika` | SDF 3D typography (`troika-three-text`) rendered in WebGL so headlines layer in Z-depth with 3D geometry. |
| **SVG Path Morphing** | `https://github.com/veltman/flubber` | Smooth SVG path-to-path shape morphing for bespoke masks and tactile transitions. |
| **Fluid & Path-Tracing (Vault)** | `repos/webgl-fluid-simulation` and `repos/three-gpu-pathtracer` | Velocity-reactive Navier-Stokes fluid displacement and real-time GPU path-traced studio hardware lighting. |

## 2. Native Lenis + GSAP ScrollTrigger + Zero-Re-Render Uniform Bus

```javascript
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Shared mutable bus: NEVER trigger React useState inside scroll or pointermove
export const motionBus = {
  progress: 0,
  velocity: 0,
  pointerX: 0,
  pointerY: 0,
  pointerVelocityX: 0,
  pointerVelocityY: 0,
};

const lenis = new Lenis({
  autoRaf: false,
  duration: 1.18,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  wheelMultiplier: 1.0, // NEVER drop below 1.0
  touchMultiplier: 1.5,
});

lenis.on('scroll', (e) => {
  ScrollTrigger.update();
  const clamped = Math.max(-120, Math.min(120, (e.velocity || 0) * 10));
  motionBus.velocity = clamped;
  document.documentElement.style.setProperty('--scroll-velocity', `${clamped}px`);
});

gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

## 3. Five-Stage Pinned Hero Scroll Budget

Use a `500vh` to `600vh` outer track with `position: sticky; top: 0; height: 100svh;` inner stage (never `100vh`) and ScrollTrigger `scrub: 0.6` (`<= 0.8`):

| Normalized Progress (`p`) | Stage | Visual Choreography |
| :--- | :--- | :--- |
| `0.00 - 0.24` | **Thesis / Title Card** | Staggered display reveal (`y: 24 -> 0`, `stagger: 0.08`, `expo.out`) + autonomous breathing 3D/shader focal point. |
| `0.24 - 0.62` | **Spatial Choreography** | Scroll-scrubbed 3D spline camera flythrough and DOM-to-WebGL plane curvature. |
| `0.62 - 0.82` | **Proof Convergence** | Product/work showcase with Z-depth kinetic typography layered behind and in front of 3D geometry. |
| `0.82 - 0.95` | **Signature Climax** | Single tactile or shader climax (refraction burst, physical spring stamp, or full-screen plane morph). |
| `0.95 - 1.00` | **Stage Exit & Dock** | Hero unpins cleanly; persistent navigation header unlocks and docks at top-0 without clipping. |

## 4. GPU-Tier Progressive Scaling

- Cap WebGL pixel ratio at `Math.min(window.devicePixelRatio, 2)`.
- Pause WebGL rendering via `IntersectionObserver` when the canvas is off-screen.
- On low-power mobile devices or weak GPUs, disable heavy multi-pass bloom/DOF and step down gracefully to crisp CSS/Canvas/SVG motion so mid-range phones hold 60fps.
