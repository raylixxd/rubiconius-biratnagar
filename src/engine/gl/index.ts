import { Renderer, Camera, Transform, Plane, Program, Mesh, Texture, Vec2, Triangle } from 'ogl';
import { gsap } from 'gsap';
import { vertex, imageFragment, proceduralFragment } from './shaders';
import { scrollState } from '../scroll';
import { prefersReducedMotion } from '../env';

type Item = {
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
let vw = 0, vh = 0, time = 0, velocity = 0, lastBgRender = 0;
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
  renderer = new Renderer({
    dpr: Math.min(devicePixelRatio, 1.0),
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
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
    resize();
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
  geometry = new Plane(gl, { widthSegments: 24, heightSegments: 24 });
  document.documentElement.classList.add('gl-on');
  resize();
  addEventListener('resize', resize);
  addEventListener('pointermove', (e) => { mouse.tx = e.clientX / vw; mouse.ty = 1 - e.clientY / vh; }, { passive: true });
  gsap.ticker.add(render);
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

function resize() {
  if (!renderer) return;
  vw = innerWidth; vh = innerHeight;
  renderer.setSize(vw, vh);
  camera.orthographic({ left: -vw / 2, right: vw / 2, top: vh / 2, bottom: -vh / 2, near: -10, far: 10 });
  for (const it of items) measureItem(it);
}

function loadTexture(img: HTMLImageElement, program: Program, el?: HTMLElement, item?: Item) {
  const src = img.currentSrc || img.src;
  if (!src || !renderer) return;
  const gl = renderer.gl;
  let tex = textures.get(src);
  const apply = (t: Texture) => {
    program.uniforms.tMap.value = t;
    const im = t.image as (HTMLImageElement | { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number });
    if (im) {
      program.uniforms.uImage.value.set(
        ('naturalWidth' in im ? im.naturalWidth : im.width) || 1,
        ('naturalHeight' in im ? im.naturalHeight : im.height) || 1
      );
    }
    el?.classList.add('is-gl-ready');
    if (item) measureItem(item);
  };
  if (tex) return apply(tex);
  tex = new Texture(gl, { generateMipmaps: false, minFilter: gl.LINEAR });
  textures.set(src, tex);

  if (img.complete && img.naturalWidth) {
    if ('decode' in img) {
      img.decode().catch(() => {}).then(() => {
        tex!.image = img;
        apply(tex!);
      });
    } else {
      tex.image = img;
      apply(tex);
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
    tex!.image = im;
    apply(tex!);
  };
  im.src = src;
}

function add(el: HTMLElement) {
  if (!renderer) return;
  const gl = renderer.gl;
  const procedural = el.dataset.gl === 'procedural';
  const uniforms: Record<string, { value: unknown }> = {
    uPlane: { value: new Vec2(1, 1) },
    uTime: { value: 0 },
    uHover: { value: 0 },
    uVelocity: { value: 0 },
    uReveal: { value: el.hasAttribute('data-gl-instant') ? 1 : 0 },
    uMouse: { value: new Vec2(0.5, 0.5) },
  };
  if (procedural) {
    const [c1, c2, c3] = (el.dataset.colors || '#eceae4,#a67c52,#1f4a3c').split(',').map(hex);
    Object.assign(uniforms, { uC1: { value: c1 }, uC2: { value: c2 }, uC3: { value: c3 }, uSeed: { value: parseFloat(el.dataset.seed || '1') } });
  } else {
    const blank = new Texture(gl, { image: new Uint8Array([0, 0, 0, 0]), width: 1, height: 1 });
    Object.assign(uniforms, { tMap: { value: blank }, uImage: { value: new Vec2(1, 1) } });
  }
  const program = new Program(gl, { vertex, fragment: procedural ? proceduralFragment : imageFragment, uniforms, transparent: true });
  const mesh = new Mesh(gl, { geometry, program });
  mesh.setParent(scene);
  const hover = { v: 0 };
  const enter = () => gsap.to(hover, { v: 1, duration: 0.9, ease: 'expo.out' });
  const leave = () => gsap.to(hover, { v: 0, duration: 0.9, ease: 'expo.out' });
  const scrub = el.hasAttribute('data-gl-scrub');
  const item: Item = {
    el, mesh, program, hover, revealed: false, inView: true, scrub,
    off: () => {
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('pointermove', move);
    },
  };
  measureItem(item);
  const move = (e: PointerEvent) => {
    const b = item.bounds || measureItem(item);
    if (b.width > 0 && b.height > 0) {
      const x = (e.clientX - b.left) / b.width;
      const y = 1 - (e.clientY - (b.top - scrollState().y)) / b.height;
      program.uniforms.uMouse.value.set(x, y);
    }
  };
  el.addEventListener('pointerenter', enter);
  el.addEventListener('pointerleave', leave);
  el.addEventListener('pointermove', move);

  if (typeof ResizeObserver !== 'undefined') {
    item.ro = new ResizeObserver(() => {
      measureItem(item);
    });
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
  }, { rootMargin: '200px 0px' });
  item.visIo.observe(el);
  if (!el.hasAttribute('data-gl-instant') && !scrub) {
    item.io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !item.revealed) {
        item.revealed = true;
        gsap.to(program.uniforms.uReveal, { value: 1, duration: parseFloat(el.dataset.glDuration || '1.5'), ease: 'expo.out', delay: parseFloat(el.dataset.delay || '0') });
        item.io?.disconnect();
      }
    }, { rootMargin: '0px 0px -10% 0px' });
    item.io.observe(el);
  }
  items.push(item);
}

export function mountGL(root: ParentNode = document) {
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
  return gsap.to(items.map((i) => i.program.uniforms.uReveal), { value: 0, duration, ease: 'expo.in' });
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
  let visible = 0;
  for (const it of items) {
    if (!it.inView) {
      it.mesh.visible = false;
      continue;
    }
    const b = it.bounds || measureItem(it);
    const top = b.top - sNow.y;
    const bottom = top + b.height;
    const onScreen = bottom > -100 && top < vh + 100 && b.width > 0;
    it.mesh.visible = onScreen;
    if (!onScreen) continue;
    visible++;
    it.mesh.scale.set(b.width, b.height, 1);
    it.mesh.position.set(b.left + b.width / 2 - vw / 2, vh / 2 - (top + b.height / 2), 0);
    const u = it.program.uniforms;
    u.uPlane.value.set(b.width, b.height);
    u.uTime.value = time;
    u.uHover.value = it.hover.v;
    u.uVelocity.value = velocity * 0.05;
    if (it.scrub) u.uReveal.value = Math.min(1, Math.max(0, (vh - top) / (vh * 0.75)));
  }
  mouse.x += (mouse.tx - mouse.x) * 0.08;
  mouse.y += (mouse.ty - mouse.y) * 0.08;
  if (bg) {
    if (
      visible === 0 &&
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
  } else if (visible || renderer.gl.canvas.dataset.dirty !== '0') {
    renderer.render({ scene, camera });
    renderer.gl.canvas.dataset.dirty = visible ? '1' : '0';
  }
}
