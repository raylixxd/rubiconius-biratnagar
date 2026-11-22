import { Mesh, Program, Vec2, Texture } from 'ogl';
import { gsap } from 'gsap';
import { getGLContext, getGLDusk, registerGLHook } from '../gl';
import { getQualityTier } from '../env';
import { getTierPrefix, plateVert, plateFrag } from '../gl/shaders';
import { scrollState } from '../scroll';

export interface ShowcaseRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ShowcasePlateMesh {
  plateId: string;
  el: HTMLElement;
  mesh: Mesh;
  program: Program;
  cropRect: [number, number, number, number];
  baseLeft: number;
  offsetInViewport: number;
  width: number;
  height: number;
  hover: { v: number };
  reveal: number;
  expand: number;
  overrideRect: ShowcaseRect | null;
  dimOpacity: number;
  off: () => void;
}

let plateMeshes: ShowcasePlateMesh[] = [];
let unhookGL: (() => void) | null = null;
let nearViewport = true;
let visIo: IntersectionObserver | null = null;

export function getShowcasePlateItems(): ShowcasePlateMesh[] {
  return plateMeshes;
}

export function setPlateHover(plateId: string, active: number) {
  const item = plateMeshes.find((p) => p.plateId === plateId);
  if (item) gsap.to(item.hover, { v: active, duration: 0.6, ease: 'power2.out' });
}

export function setShowcaseReveal(progress: number) {
  if (plateMeshes[0]) {
    plateMeshes[0].reveal = Math.min(1, Math.max(0, progress * 1.15));
  }
  if (plateMeshes[1]) {
    plateMeshes[1].reveal = Math.min(1, Math.max(0, (progress - 0.15) * 1.18));
  }
  for (let i = 2; i < plateMeshes.length; i++) {
    plateMeshes[i].reveal = 1.0;
  }
}

export function initShowcasePlates(
  showcaseEl: HTMLElement,
  viewportEl: HTMLElement,
  trackEl: HTMLElement,
  getPinState: () => { start: number; end: number; x: number; progress: number; velocity: number }
): ShowcasePlateMesh[] {
  disposeShowcasePlates();
  const ctx = getGLContext(true);
  if (!ctx) return [];

  const tier = getQualityTier();
  const prefix = getTierPrefix(tier);
  const elements = trackEl.querySelectorAll<HTMLElement>('[data-showcase-gl]');
  const curTrackX = (gsap.getProperty(trackEl, 'x') as number) || 0;
  const viewportRect = viewportEl.getBoundingClientRect();

  elements.forEach((el, idx) => {
    const img = el.querySelector<HTMLImageElement>('img');
    const plateId = el.dataset.plateId || String(idx);
    let cropRect: [number, number, number, number] = [0.0, 0.0, 1.0, 1.0];
    if (el.dataset.cropRect) {
      try {
        const parsed = JSON.parse(el.dataset.cropRect);
        if (Array.isArray(parsed) && parsed.length === 4) cropRect = parsed as [number, number, number, number];
      } catch {}
    }

    const rect = el.getBoundingClientRect();
    const baseLeft = rect.left - curTrackX;
    const offsetInViewport = rect.top - viewportRect.top;
    const width = rect.width || 560;
    const height = rect.height || 350;

    const uniforms: Record<string, { value: unknown }> = {
      tMap: { value: null as Texture | null },
      uPlaneSizes: { value: new Vec2(width, height) },
      uImageSizes: { value: new Vec2(1920, 1090) },
      uCropRect: { value: [...cropRect] },
      uScrollProgress: { value: 0 },
      uVelocity: { value: 0 },
      uHover: { value: 0 },
      uExpandProgress: { value: 0 },
      uFluteStrength: { value: 0.015 },
      uRevealProgress: { value: 1.0 },
      uDusk: { value: getGLDusk() },
      uBronzeTint: { value: [0.655, 0.486, 0.302] },
      uCameraPos: { value: [0, 0, 1] },
    };

    const program = new Program(ctx.gl, {
      vertex: prefix + plateVert,
      fragment: prefix + plateFrag,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const mesh = new Mesh(ctx.gl, { geometry: ctx.geometry, program });
    mesh.position.z = 0;
    mesh.setParent(ctx.scene);

    if (img) ctx.loadTexture(img, program, el);

    const hover = { v: 0 };
    const onEnter = () => gsap.to(hover, { v: 1, duration: 0.6, ease: 'power2.out' });
    const onLeave = () => gsap.to(hover, { v: 0, duration: 0.6, ease: 'power2.out' });
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);

    plateMeshes.push({
      plateId,
      el,
      mesh,
      program,
      cropRect,
      baseLeft,
      offsetInViewport,
      width,
      height,
      hover,
      reveal: 1.0,
      expand: 0.0,
      overrideRect: null,
      dimOpacity: 1.0,
      off: () => {
        el.removeEventListener('pointerenter', onEnter);
        el.removeEventListener('pointerleave', onLeave);
      },
    });
  });

  nearViewport = true;
  if (typeof IntersectionObserver !== 'undefined') {
    visIo = new IntersectionObserver(
      ([entry]) => {
        nearViewport = Boolean(entry?.isIntersecting);
      },
      { rootMargin: '140px 0px' }
    );
    visIo.observe(showcaseEl);
  }

  unhookGL = registerGLHook((_t, vw, vh) => {
    const anyExpanded = plateMeshes.some((p) => p.overrideRect !== null);
    if (!nearViewport && !anyExpanded) {
      for (const item of plateMeshes) item.mesh.visible = false;
      return false;
    }

    const sY = scrollState().y;
    const { start: pinStart, end: pinEnd, x: currentTrackX, progress, velocity } = getPinState();
    const clampedVel = Math.max(-0.42, Math.min(0.42, velocity * 0.008));
    const duskVal = getGLDusk();
    const viewportScreenTop = Math.max(pinStart, Math.min(pinEnd, sY)) - sY;

    let anyVisible = false;
    for (const item of plateMeshes) {
      const ov = item.overrideRect;
      const sx = ov ? ov.left : item.baseLeft + currentTrackX;
      const sy = ov ? ov.top : viewportScreenTop + item.offsetInViewport;
      const w = ov ? ov.width : item.width;
      const h = ov ? ov.height : item.height;

      const culled = !ov && (sx + w < -260 || sx > vw + 260 || sy + h < -240 || sy > vh + 240);
      if (culled || w <= 0 || item.dimOpacity <= 0.01) {
        item.mesh.visible = false;
        continue;
      }

      anyVisible = true;
      item.mesh.visible = true;
      item.mesh.position.x = sx + w / 2 - vw / 2;
      item.mesh.position.y = vh / 2 - (sy + h / 2);
      item.mesh.position.z = ov ? 0.2 : 0;
      item.mesh.scale.set(w, h, 1);

      item.program.uniforms.uPlaneSizes.value.set(w, h);
      item.program.uniforms.uVelocity.value = ov ? 0 : clampedVel;
      item.program.uniforms.uScrollProgress.value = progress;
      item.program.uniforms.uHover.value = item.hover.v;
      item.program.uniforms.uRevealProgress.value = item.reveal * item.dimOpacity;
      item.program.uniforms.uExpandProgress.value = item.expand;
      item.program.uniforms.uDusk.value = duskVal;

      if (!ov) {
        const cardCenterNorm = (sx + w / 2 - vw / 2) / Math.max(1, vw / 2);
        const cardEl = item.el.closest('.showcase-plate');
        const frontEl = cardEl?.querySelector<HTMLElement>('[data-depth-front]');
        if (frontEl) {
          frontEl.style.transform = `translate3d(${cardCenterNorm * -24}px, 0, 0)`;
        }
      }
    }

    return anyVisible;
  });

  return plateMeshes;
}

export function measureShowcasePlates(viewportEl: HTMLElement, trackEl: HTMLElement) {
  const curTrackX = (gsap.getProperty(trackEl, 'x') as number) || 0;
  const viewportRect = viewportEl.getBoundingClientRect();
  plateMeshes.forEach((item) => {
    const rect = item.el.getBoundingClientRect();
    item.baseLeft = rect.left - curTrackX;
    item.offsetInViewport = rect.top - viewportRect.top;
    item.width = rect.width;
    item.height = rect.height;
    item.program.uniforms.uPlaneSizes.value.set(rect.width, rect.height);
  });
}

export function disposeShowcasePlates() {
  unhookGL?.();
  unhookGL = null;
  visIo?.disconnect();
  visIo = null;
  const ctx = getGLContext(false);
  plateMeshes.forEach((item) => {
    item.off();
    if (ctx && item.mesh.parent) ctx.scene.removeChild(item.mesh);
    item.program.remove?.();
  });
  plateMeshes = [];
}
