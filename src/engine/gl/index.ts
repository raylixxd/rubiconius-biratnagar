import { Renderer, Camera, Transform, Plane, Program, Mesh, Texture, Vec2, Triangle } from 'ogl';
import { gsap } from 'gsap';
import { getTierPrefix, plateVert, plateFrag, proceduralVertex, proceduralFragment } from './shaders';
import { scrollState } from '../scroll';
import { prefersReducedMotion, getQualityTier } from '../env';

type GLHook = (t: number, vw: number, vh: number) => boolean;

export type Item = {
  el: HTMLElement;
  mesh: Mesh;
  program: Program;
  hover: { v: number };
  revealed: boolean;
  inView: boolean;
  scrub: boolean;
  bounds?: { top: number; left: number; width: number; height: number };
  io?: IntersectionObserver;
  visIo?: IntersectionObserver;
  ro?: ResizeObserver;
  off: () => void;
};

let renderer: Renderer | null = null;
let camera: Camera;
let scene: Transform;
let geometry: Plane;
const items: Item[] = [];
const textures = new Map<string, Texture>();
const renderHooks = new Set<GLHook>();
let vw = 0, vh = 0, time = 0, velocity = 0, lastBgRender = 0, globalDusk = 0;
let paused = false;
let bg: { scene: Transform; program: Program } | null = null;
const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

const hex = (h: string) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export function glSupported() {
  if (prefersReducedMotion()) return false;
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return false;
  try { return !!document.createElement('canvas').getContext('webgl'); } catch { return false; }
}

export function initGL() {
  if (renderer || !glSupported()) return;
  const tier = getQualityTier();
  const maxDpr = tier === 'high' ? Math.min(window.devicePixelRatio || 1, 1.75) :
                 tier === 'medium' ? 1.25 : 1.0;
  renderer = new Renderer({
    dpr: maxDpr,
    alpha: true,
    antialias: tier === 'high',
    premultipliedAlpha: true,
    powerPreference: 'high-performance',
  });
  const gl = renderer.gl;
  const canvas = gl.canvas as HTMLCanvasElement;
  canvas.classList.add('gl-canvas');
  canvas.setAttribute('aria-hidden', 'true');
  (document.getElementById('gl') || document.body).appendChild(canvas);

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    paused = true;
  }, false);

  canvas.addEventListener('webglcontextrestored', () => {
    paused = false;
    textures.clear();
    resize(true);
    for (const it of items) {
      const img = it.el.querySelector('img');
      if (img && it.el.dataset.gl !== 'procedural') {
        loadTexture(img, it.program, it.el, it);
      }
    }
  }, false);

  camera = new Camera(gl, { near: -10, far: 10 });
  camera.position.z = 1;
  scene = new Transform();
  geometry = new Plane(gl, { widthSegments: 32, heightSegments: 32 });
  document.documentElement.classList.add('gl-on');
  resize(true);
  addEventListener('resize', () => resize(false), { passive: true });
  addEventListener('pointermove', (e) => {
    mouse.tx = e.clientX / (vw || 1);
    mouse.ty = 1 - e.clientY / (vh || 1);
  }, { passive: true });
  gsap.ticker.add(render);
}

export function registerGLHook(fn: GLHook): () => void {
  renderHooks.add(fn);
  return () => renderHooks.delete(fn);
}

export function setGLDusk(v: number) {
  globalDusk = v;
}

export function getGLDusk() {
  return globalDusk;
}

export function setGLFront(mode: 'none' | 'inspector' | 'flip') {
  const glHost = document.getElementById('gl');
  if (!glHost) return;
  glHost.classList.toggle('gl--inspector', mode === 'inspector');
  glHost.classList.toggle('gl--flip', mode === 'flip');
}

export function getGLItemByFlip(slug: string) {
  for (const it of items) {
    if (it.el.dataset.glFlip === slug) {
      const b = it.bounds || measureItem(it);
      return {
        item: it,
        rect: {
          left: b.left,
          top: b.top - scrollState().y,
          width: b.width,
          height: b.height,
        },
        src: it.el.querySelector('img')?.currentSrc || it.el.querySelector('img')?.src || '',
      };
    }
  }
  return null;
}

export function setBackground(fragment: string, uniforms: Record<string, { value: unknown }> = {}) {
  if (!renderer) return null;
  clearBackground();
  const gl = renderer.gl;
  const program = new Program(gl, {
    vertex: `attribute vec2 uv; attribute vec2 position; varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`,
    fragment,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new Vec2(vw, vh) },
      uScroll: { value: 0 },
      uScrollY: { value: 0 },
      uVelocity: { value: 0 },
      uMouse: { value: new Vec2(0.5, 0.5) },
      ...uniforms,
    },
    depthTest: false,
    depthWrite: false,
  });
  const bgScene = new Transform();
  new Mesh(gl, { geometry: new Triangle(gl), program }).setParent(bgScene);
  bg = { scene: bgScene, program };
  return program;
}

export function clearBackground() { bg = null; }

export function getGLContext(autoInit = true) {
  if (!renderer && autoInit) initGL();
  if (!renderer) return null;
  return {
    renderer,
    gl: renderer.gl,
    scene,
    camera,
    geometry,
    loadTexture,
    textures,
  };
}

function measureItem(it: Item) {
  const r = it.el.getBoundingClientRect();
  it.bounds = {
    top: r.top + scrollState().y,
    left: r.left,
    width: r.width,
    height: r.height,
  };
  return it.bounds;
}

function resize(force = false) {
  if (!renderer) return;
  if (!force && vw > 0 && innerWidth === vw && Math.abs(innerHeight - vh) < 140 && vw < 768) return;
  vw = innerWidth;
  vh = innerHeight;
  renderer.setSize(vw, vh);
  camera.orthographic({ left: -vw / 2, right: vw / 2, top: vh / 2, bottom: -vh / 2, near: -10, far: 10 });
  for (const it of items) measureItem(it);
}

function evictTextureIfNeeded(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  if (textures.size < 16) return;
  const oldestKey = textures.keys().next().value;
  if (oldestKey !== undefined) {
    const oldestTex = textures.get(oldestKey);
    textures.delete(oldestKey);
    if (oldestTex?.texture) gl.deleteTexture(oldestTex.texture);
  }
}

function loadTexture(img: HTMLImageElement, program: Program, el?: HTMLElement, item?: Item) {
  const src = img.currentSrc || img.src;
  if (!src || !renderer) return;
  const gl = renderer.gl;

  const apply = (t: Texture) => {
    program.uniforms.tMap.value = t;
    const im = t.image as (HTMLImageElement | { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number });
    if (im) {
      const w = ('naturalWidth' in im ? im.naturalWidth : im.width) || 1;
      const h = ('naturalHeight' in im ? im.naturalHeight : im.height) || 1;
      if (program.uniforms.uImageSizes?.value) (program.uniforms.uImageSizes.value as Vec2).set(w, h);
      if (program.uniforms.uImage?.value) (program.uniforms.uImage.value as Vec2).set(w, h);
    }
    el?.classList.add('is-gl-ready');
    if (item) measureItem(item);
  };

  const cached = textures.get(src);
  if (cached && cached.image) {
    textures.delete(src);
    textures.set(src, cached);
    return apply(cached);
  }

  const commitImage = (loadedImg: HTMLImageElement) => {
    const existing = textures.get(src);
    if (existing && existing.image) {
      apply(existing);
      return;
    }
    evictTextureIfNeeded(gl);
    const tex = existing || new Texture(gl, { generateMipmaps: false, minFilter: gl.LINEAR });
    tex.image = loadedImg;
    textures.set(src, tex);
    apply(tex);
  };

  if (img.complete && img.naturalWidth) {
    if ('decode' in img) {
      img.decode().catch(() => {}).then(() => commitImage(img));
    } else {
      commitImage(img);
    }
    return;
  }

  const im = new Image();
  im.crossOrigin = 'anonymous';
  im.decoding = 'async';
  im.onload = async () => {
    if ('decode' in im) {
      try { await im.decode(); } catch { /* ignore decode failure */ }
    }
    commitImage(im);
  };
  im.src = src;
}

function add(el: HTMLElement) {
  if (!renderer) return;
  const gl = renderer.gl;
  const tier = getQualityTier();
  const prefix = getTierPrefix(tier);
  const procedural = el.dataset.gl === 'procedural';
  const uniforms: Record<string, { value: unknown }> = {
    uPlaneSizes: { value: new Vec2(1, 1) },
    uTime: { value: 0 },
    uHover: { value: 0 },
    uVelocity: { value: 0 },
    uRevealProgress: { value: el.hasAttribute('data-gl-instant') ? 1 : 0 },
    uScrollProgress: { value: 0 },
    uExpandProgress: { value: 0 },
    uFluteStrength: { value: 0.012 },
    uDusk: { value: globalDusk },
    uBronzeTint: { value: [0.655, 0.486, 0.302] },
    uCameraPos: { value: [0, 0, 1] },
    uCropRect: { value: [0, 0, 1, 1] },
  };

  if (procedural) {
    const [c1, c2, c3] = (el.dataset.colors || '#eceae4,#a67c52,#1f4a3c').split(',').map(hex);
    Object.assign(uniforms, { uC1: { value: c1 }, uC2: { value: c2 }, uC3: { value: c3 }, uSeed: { value: parseFloat(el.dataset.seed || '1') } });
  } else {
    const blank = new Texture(gl, { image: new Uint8Array([0, 0, 0, 0]), width: 1, height: 1 });
    Object.assign(uniforms, { tMap: { value: blank }, uImageSizes: { value: new Vec2(1, 1) } });
  }

  const program = new Program(gl, {
    vertex: procedural ? proceduralVertex : prefix + plateVert,
    fragment: procedural ? proceduralFragment : prefix + plateFrag,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new Mesh(gl, { geometry, program });
  mesh.setParent(scene);
  const hover = { v: 0 };
  const enter = () => gsap.to(hover, { v: 1, duration: 0.75, ease: 'expo.out' });
  const leave = () => gsap.to(hover, { v: 0, duration: 0.75, ease: 'expo.out' });
  const scrub = el.hasAttribute('data-gl-scrub');

  const move = (e: PointerEvent) => {
    const b = item.bounds || measureItem(item);
    if (b.width > 0 && b.height > 0 && program.uniforms.uCameraPos?.value) {
      const nx = ((e.clientX - b.left) / b.width - 0.5) * 2;
      const ny = ((e.clientY - (b.top - scrollState().y)) / b.height - 0.5) * 2;
      (program.uniforms.uCameraPos.value as number[])[0] = nx;
      (program.uniforms.uCameraPos.value as number[])[1] = -ny;
    }
  };

  const item: Item = {
    el, mesh, program, hover, revealed: el.hasAttribute('data-gl-instant'), inView: true, scrub,
    off: () => {
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('pointermove', move);
    },
  };
  measureItem(item);
  el.addEventListener('pointerenter', enter);
  el.addEventListener('pointerleave', leave);
  el.addEventListener('pointermove', move, { passive: true });

  if (typeof ResizeObserver !== 'undefined') {
    item.ro = new ResizeObserver(() => measureItem(item));
    item.ro.observe(el);
  }

  const img = el.querySelector('img');
  if (procedural) {
    el.classList.add('is-gl-ready');
  } else if (img) {
    if (img.complete && img.naturalWidth) loadTexture(img, program, el, item);
    else img.addEventListener('load', () => loadTexture(img, program, el, item), { once: true });
  }

  item.visIo = new IntersectionObserver(([e]) => {
    item.inView = Boolean(e?.isIntersecting);
  }, { rootMargin: '240px 0px' });
  item.visIo.observe(el);

  if (!el.hasAttribute('data-gl-instant') && !scrub) {
    item.io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !item.revealed) {
        item.revealed = true;
        gsap.to(program.uniforms.uRevealProgress, {
          value: 1,
          duration: parseFloat(el.dataset.glDuration || '1.35'),
          ease: 'expo.out',
          delay: parseFloat(el.dataset.delay || '0'),
        });
        item.io?.disconnect();
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    item.io.observe(el);
  }
  items.push(item);
}

export function mountGL(root: ParentNode = document) {
  if (!renderer && root.querySelector('[data-gl], [data-showcase-gl], [data-gl-seam]')) {
    initGL();
  }
  if (!renderer) return;
  root.querySelectorAll<HTMLElement>('[data-gl]').forEach(add);
}

export function unmountGL() {
  while (items.length) {
    const it = items.pop()!;
    it.off();
    it.io?.disconnect();
    it.visIo?.disconnect();
    it.ro?.disconnect();
    it.mesh.setParent(null);
    it.program.remove?.();
  }
}

export function hideGL(duration = 0.55) {
  return gsap.to(items.map((i) => i.program.uniforms.uRevealProgress), { value: 0, duration, ease: 'expo.in' });
}

export function pauseGL() {
  paused = true;
  if (renderer) renderer.gl.canvas.style.visibility = 'hidden';
}

export function resumeGL() {
  paused = false;
  if (renderer) renderer.gl.canvas.style.visibility = '';
}

function render(t: number) {
  if (!renderer || paused || document.hidden) return;
  time = t;
  const sNow = scrollState();
  const target = Math.max(-40, Math.min(40, sNow.velocity));
  velocity += (target - velocity) * 0.12;
  const clampedVel = Math.max(-0.42, Math.min(0.42, velocity * 0.015));

  let visible = 0;
  for (const it of items) {
    if (!it.inView) {
      it.mesh.visible = false;
      continue;
    }
    const b = it.bounds || measureItem(it);
    const top = b.top - sNow.y;
    const bottom = top + b.height;
    const onScreen = bottom > -240 && top < vh + 240 && b.width > 0;
    it.mesh.visible = onScreen;
    if (!onScreen) continue;
    visible++;
    it.mesh.scale.set(b.width, b.height, 1);
    it.mesh.position.set(b.left + b.width / 2 - vw / 2, vh / 2 - (top + b.height / 2), 0);
    const u = it.program.uniforms;
    u.uPlaneSizes?.value.set(b.width, b.height);
    if (u.uTime) u.uTime.value = time;
    if (u.uHover) u.uHover.value = it.hover.v;
    if (u.uVelocity) u.uVelocity.value = clampedVel;
    if (u.uDusk) u.uDusk.value = globalDusk;
    if (u.uScrollProgress) u.uScrollProgress.value = Math.min(1, Math.max(0, 1 - (top + b.height * 0.5) / (vh + b.height)));
    if (it.scrub && u.uRevealProgress) u.uRevealProgress.value = Math.min(1, Math.max(0, (vh - top) / (vh * 0.75)));
  }

  let hooksVisible = false;
  for (const hook of renderHooks) {
    if (hook(t, vw, vh)) hooksVisible = true;
  }

  mouse.x += (mouse.tx - mouse.x) * 0.08;
  mouse.y += (mouse.ty - mouse.y) * 0.08;

  if (bg) {
    if (
      visible === 0 &&
      !hooksVisible &&
      Math.abs(sNow.velocity) < 0.05 &&
      Math.abs(mouse.tx - mouse.x) < 0.002 &&
      Math.abs(mouse.ty - mouse.y) < 0.002 &&
      t - lastBgRender < 0.04
    ) {
      return;
    }
    lastBgRender = t;
    const u = bg.program.uniforms;
    u.uTime.value = time;
    u.uResolution.value.set(vw, vh);
    u.uScroll.value = sNow.progress;
    u.uScrollY.value = sNow.y;
    u.uVelocity.value = velocity;
    u.uMouse.value.set(mouse.x, mouse.y);
    renderer.render({ scene: bg.scene, camera });
    renderer.render({ scene, camera, clear: false });
  } else if (visible > 0 || hooksVisible || renderer.gl.canvas.dataset.dirty !== '0') {
    renderer.render({ scene, camera });
    renderer.gl.canvas.dataset.dirty = (visible > 0 || hooksVisible) ? '1' : '0';
  }
}
