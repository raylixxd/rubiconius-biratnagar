import { Mesh, Program, Texture, Vec2 } from 'ogl';
import { gsap } from 'gsap';
import { getGLContext, getGLDusk, registerGLHook, setGLFront } from './index';
import { getQualityTier, prefersReducedMotion } from '../env';
import { getTierPrefix, plateVert, plateFrag } from './shaders';

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PendingFlip {
  slug: string;
  rect: Rect;
  mesh: Mesh;
  program: Program;
  blankTex: Texture;
  unhook: () => void;
}

let pendingFlip: PendingFlip | null = null;
let activeTween: gsap.core.Tween | null = null;
let bound = false;

export function hasPendingFlip(): boolean {
  return Boolean(pendingFlip);
}

export function cancelFlip() {
  activeTween?.kill();
  activeTween = null;
  if (pendingFlip) {
    try {
      pendingFlip.unhook();
      const ctx = getGLContext(false);
      if (ctx) {
        if (pendingFlip.mesh.parent) ctx.scene.removeChild(pendingFlip.mesh);
        if (pendingFlip.blankTex?.texture) ctx.gl.deleteTexture(pendingFlip.blankTex.texture);
      }
      pendingFlip.program.remove?.();
    } catch {}
    pendingFlip = null;
  }
  setGLFront('none');
}

export function bindFlipClicks() {
  if (bound || typeof document === 'undefined') return;
  bound = true;

  document.addEventListener(
    'click',
    (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (window.innerWidth < 768 || prefersReducedMotion()) return;

      const anchor = (e.target as Element)?.closest<HTMLAnchorElement>('a[data-transition="flip"][data-gl-flip]');
      if (!anchor || anchor.hasAttribute('download') || anchor.target === '_blank') return;

      const slug = anchor.dataset.glFlip;
      const ctx = getGLContext(false);
      if (!slug || !ctx) return;

      const srcContainer =
        (document.querySelector<HTMLElement>(`[data-gl][data-gl-flip="${slug}"]`) || anchor);
      const img = srcContainer.querySelector<HTMLImageElement>('img');
      if (!img) return;

      const r = srcContainer.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) return;

      cancelFlip();

      try {
        const tier = getQualityTier();
        const prefix = getTierPrefix(tier);
        const blank = new Texture(ctx.gl, { image: new Uint8Array([0, 0, 0, 0]), width: 1, height: 1 });
        const program = new Program(ctx.gl, {
          vertex: prefix + plateVert,
          fragment: prefix + plateFrag,
          uniforms: {
            tMap: { value: blank },
            uPlaneSizes: { value: new Vec2(r.width, r.height) },
            uImageSizes: { value: new Vec2(img.naturalWidth || 1600, img.naturalHeight || 1000) },
            uCropRect: { value: [0, 0, 1, 1] },
            uScrollProgress: { value: 0 },
            uVelocity: { value: 0 },
            uHover: { value: 0 },
            uExpandProgress: { value: 1 },
            uFluteStrength: { value: 0 },
            uRevealProgress: { value: 1 },
            uDusk: { value: getGLDusk() },
            uBronzeTint: { value: [0.655, 0.486, 0.302] },
            uCameraPos: { value: [0, 0, 1] },
          },
          transparent: true,
          depthTest: false,
          depthWrite: false,
        });

        const mesh = new Mesh(ctx.gl, { geometry: ctx.geometry, program });
        mesh.position.z = 0.5;
        mesh.setParent(ctx.scene);
        ctx.loadTexture(img, program);

        const rect: Rect = { left: r.left, top: r.top, width: r.width, height: r.height };
        const unhook = registerGLHook((_t, vw, vh) => {
          if (!pendingFlip) return false;
          const cur = pendingFlip.rect;
          mesh.visible = true;
          mesh.position.x = cur.left + cur.width / 2 - vw / 2;
          mesh.position.y = vh / 2 - (cur.top + cur.height / 2);
          mesh.scale.set(cur.width, cur.height, 1);
          program.uniforms.uPlaneSizes.value.set(cur.width, cur.height);
          program.uniforms.uDusk.value = getGLDusk();
          return true;
        });

        setGLFront('flip');
        pendingFlip = { slug, rect, mesh, program, blankTex: blank, unhook };
      } catch {
        cancelFlip();
      }
    },
    { capture: true }
  );
}

export function completeFlip(): Promise<void> {
  if (!pendingFlip) return Promise.resolve();
  const state = pendingFlip;

  try {
    const destEl = document.querySelector<HTMLElement>(
      `[data-gl][data-gl-flip="${state.slug}"], .case-plate[data-gl-flip="${state.slug}"]`
    );
    if (!destEl) {
      cancelFlip();
      return Promise.resolve();
    }

    const dest = destEl.getBoundingClientRect();
    if (dest.width < 10 || dest.height < 10) {
      cancelFlip();
      return Promise.resolve();
    }

    destEl.style.visibility = 'hidden';

    return new Promise<void>((resolve) => {
      activeTween = gsap.to(state.rect, {
        left: dest.left,
        top: dest.top,
        width: dest.width,
        height: dest.height,
        duration: 0.82,
        ease: 'power4.inOut',
        onComplete: () => {
          destEl.style.visibility = '';
          cancelFlip();
          resolve();
        },
        onInterrupt: () => {
          destEl.style.visibility = '';
          cancelFlip();
          resolve();
        },
      });
    });
  } catch {
    cancelFlip();
    return Promise.resolve();
  }
}
