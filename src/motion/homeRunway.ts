import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  createBlueprintEngine,
  prefersReducedMotion,
  scrollToTarget,
  studioAudio,
  uniformBus,
  type BlueprintEngine,
  type BlueprintThemeId,
  type BlueprintTool,
  type RubiconiusCommissionId,
} from '../engine';

gsap.registerPlugin(ScrollTrigger);

const OTTO_VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const OTTO_FRAG = `
precision highp float;
uniform sampler2D uBare;
uniform vec2 uPlane;
uniform vec2 uImgSize;
uniform float uS;
uniform float uNow;
uniform float uHover;
uniform float uActive;
uniform float uMotion;
uniform vec4 uDrops[16];
uniform vec2 uVel[16];
uniform float uEdge;
uniform float uWobble;
uniform float uSmear;
uniform float uThrow;
uniform float uSpread;
uniform float uSink;
uniform float uSwell;
uniform float uBend;
uniform float uLens;
uniform float uFilm;
uniform float uWaveEvery;
varying vec2 vUv;

float hash(vec2 p) {
  p = mod(p, 289.0);
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

vec2 coverUv(vec2 uv) {
  float ca = uPlane.x / max(uPlane.y, 1.0);
  float ia = uImgSize.x / max(uImgSize.y, 1.0);
  vec2 scale = ca > ia ? vec2(1.0, ia / ca) : vec2(ca / ia, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

vec3 sampleScene(vec2 p1440) {
  vec2 uv = vec2(p1440.x * uS / uPlane.x, 1.0 - p1440.y * uS / uPlane.y);
  return texture2D(uBare, coverUv(clamp(uv, 0.001, 0.999))).rgb;
}

vec3 surfaceFilm(vec2 p, vec3 base, float t) {
  float luma = dot(base, vec3(0.299, 0.587, 0.114));
  // Fluted relief emphasis in architectural timber/stone mid-tones
  float fluteMask = smoothstep(0.06, 0.65, luma) * smoothstep(0.95, 0.25, vUv.y);
  vec2 slope = vec2(sin(p.x * 0.085) * 0.6, cos(p.y * 0.05) * 0.4) * fluteMask;
  float k = fluteMask * 0.35;

  if (uFilm < 0.5) {
    // (A) Fluted Glass: vertical architectural refraction sheen
    vec3 bent = sampleScene(p + slope * 6.5);
    return mix(base, bent + vec3(0.045, 0.038, 0.03) * (1.0 - bent), k);
  }

  if (uFilm < 1.5) {
    // (C) Daylight Caustics + periodic climbing wave sheet
    vec2 q = p / 20.0;
    float ts = t * 1.4;
    vec2 drift = vec2(noise(q * 0.3 + ts * 0.05), noise(q * 0.3 + 9.1 - ts * 0.04)) * 3.0;
    float n1 = noise(q + drift + vec2(ts * 0.08, 0.0));
    float n2 = noise(q * 1.3 + drift + vec2(7.3, 2.1) - vec2(0.0, ts * 0.07));
    float caustics = pow(clamp(1.0 - abs(n1 - n2) * 7.2, 0.0, 1.0), 4.0) * (0.55 + 0.45 * noise(q * 0.5 - ts * 0.03));

    float phase = fract(t / uWaveEvery);
    float waveMask = 0.0;
    if (phase < 0.78) {
      float u = phase / 0.78;
      float head = mix(-0.08, 1.12, u);
      float behind = head - (1.0 - vUv.y);
      if (behind > -0.04 && behind < 0.09) {
        float lip = exp(-pow(behind / 0.015, 2.0));
        float sheet = smoothstep(0.0, 0.016, behind) * (1.0 - smoothstep(0.03, 0.09, behind));
        waveMask = max(lip, sheet * 0.6) * smoothstep(0.0, 0.14, u) * (1.0 - smoothstep(0.65, 0.78, u));
      }
    }

    vec3 bent = sampleScene(p + slope * (5.5 + waveMask * 8.0));
    vec3 glow = vec3(0.02 + caustics * 0.09 + waveMask * 0.14) * (1.0 - bent);
    return mix(base, bent + glow, max(k, waveMask * 0.48));
  }

  // (D) Brass Dew: cellular micro-droplets across warm surfaces
  float cs = 9.0;
  vec2 cell = floor(p / cs);
  float h0 = hash(cell);
  vec2 c = (cell + 0.5 + (vec2(hash(cell + 7.1), hash(cell + 3.3)) - 0.5) * 0.85) * cs;
  float r = mix(1.0, 2.6, hash(cell + 9.7)) * smoothstep(0.18, 0.75, fluteMask);
  vec2 away = p - c;
  float d = length(away) / max(r, 0.001);
  vec3 col = base;
  if (r > 0.45 && d < 1.15 && h0 < 0.68) {
    float cover = 1.0 - smoothstep(0.82, 1.08, d);
    vec3 seen = sampleScene(c - away * 2.2) * 0.94;
    vec3 n = normalize(vec3(away / max(r, 0.001), sqrt(max(1.0 - d * d, 0.0))));
    vec3 lightDir = normalize(vec3(-0.25, -0.65, 0.72));
    float spec = pow(max(dot(n, normalize(lightDir + vec3(0.0, 0.0, 1.0))), 0.0), 32.0);
    float glint = 0.4 + 0.6 * pow(0.5 + 0.5 * sin(t * 1.4 + h0 * 40.0), 6.0);
    seen += (spec * glint * 0.75) * (1.0 - seen);
    col = mix(col, seen, cover * 0.62);
  }
  return col;
}

void main() {
  vec2 plane1440 = uPlane / max(uS, 0.0001);
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * plane1440;
  vec3 bare = sampleScene(p);
  float t = uNow * uMotion;
  vec3 still = surfaceFilm(p, bare, t);

  if (uActive < 0.5 && uHover < 0.001) {
    gl_FragColor = vec4(still, 1.0);
    return;
  }

  float field = 0.0;
  vec2 slope = vec2(0.0);
  float wobblePhase = uNow * 2.1 * uMotion;
  vec2 at = p + (vec2(
    noise(p / 70.0 + wobblePhase * 0.12),
    noise(p / 70.0 - wobblePhase * 0.09 + 11.7)
  ) - 0.5) * uWobble;

  for (int i = 0; i < 16; i++) {
    vec4 drop = uDrops[i];
    vec2 v = uVel[i];
    if (drop.w <= 0.1) continue;
    float r = 0.0;
    vec2 centre = drop.xy;
    if (i == 0) {
      r = drop.w * uHover;
    } else {
      float age = uNow - drop.z;
      if (age < 0.0 || age > uSink) continue;
      float life = age / uSink;
      float swell = min(1.0, age / max(uSwell, 0.001));
      float sink = 1.0 - life;
      centre += v * uThrow * (1.0 - exp(-age / max(uThrow, 0.001))) * uMotion;
      r = drop.w * swell * (1.0 + uSpread * life) * sink * sink;
    }
    if (r < 0.5) continue;
    vec2 away = at - centre;
    float speed = length(v);
    if (speed > 1.0) {
      vec2 along = v / speed;
      float stretch = 1.0 + min(speed * uSmear, 2.6);
      float a = dot(away, along);
      a /= a < 0.0 ? stretch : mix(1.0, stretch, 0.35);
      away = along * a + (away - along * dot(away, along));
    }
    float R = 1.6 * r;
    float q = dot(away, away) / (R * R);
    if (q >= 1.0) continue;
    float w = 1.0 - q;
    field += w * w * w / 0.2262;
    slope += 3.0 * w * w * (-2.0 * away / (R * R)) / 0.2262;
  }

  float open = smoothstep(1.0 - uEdge, 1.0 + uEdge, field);
  if (open <= 0.001) {
    gl_FragColor = vec4(still, 1.0);
    return;
  }

  vec2 inward = slope / max(length(slope), 0.0001);
  float rim = exp(-pow((field - 1.0) / 0.18, 2.0));
  float lens = clamp(field - 1.0, 0.0, 1.5) / 1.5;
  vec2 bent = inward * (rim * uBend + lens * uLens);

  vec3 lensRgb = vec3(
    sampleScene(p + bent * 0.90).r,
    sampleScene(p + bent * 1.00).g,
    sampleScene(p + bent * 1.10).b
  );
  // Subtle warm architectural cove illumination inside lens
  vec3 warmGlow = lensRgb * vec3(1.04, 1.01, 0.96) + vec3(0.03, 0.022, 0.014) * lens;
  vec3 lightDir = normalize(vec3(-0.15, -0.75, 0.65));
  float lip = exp(-pow((field - 1.0) / 0.2, 2.0));
  vec3 normal = normalize(vec3(-inward * lip * 1.6, 1.0));
  float spec = pow(clamp(dot(normal, lightDir), 0.0, 1.0), 22.0) * lip;

  vec3 col = mix(still, warmGlow, open);
  col += (spec * 0.42 + rim * 0.06) * (1.0 - col);
  gl_FragColor = vec4(col, 1.0);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s);
    return null;
  }
  return s;
}

/**
 * Custom Otto Objects Hero WebGL Fluid Lens + Switchable Surface Films ((A) Fluted Glass, (C) Daylight Caustics, (D) Brass Dew).
 */
function initOttoHeroGL(): (() => void) | void {
  const hero = document.querySelector<HTMLElement>('.otto-hero');
  const canvas = hero?.querySelector<HTMLCanvasElement>('[data-otto-hero-gl]');
  const img = hero?.querySelector<HTMLImageElement>('.otto-hero__img');
  const filmBtns = Array.from(hero?.querySelectorAll<HTMLButtonElement>('[data-otto-film]') || []);
  if (!hero || !canvas || !img) return;

  const gl = canvas.getContext('webgl', {
    alpha: false,
    depth: false,
    antialias: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  });
  if (!gl) return;

  const vs = compileShader(gl, gl.VERTEX_SHADER, OTTO_VERT);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, OTTO_FRAG);
  if (!vs || !fs) return;

  const program = gl.createProgram();
  if (!program) return;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

  gl.useProgram(program);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  // Seed 1x1 warm obsidian pixel before photo upload finishes
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([18, 16, 15, 255]));

  const uLoc = (n: string) => gl.getUniformLocation(program, n);
  const uBare = uLoc('uBare');
  const uPlane = uLoc('uPlane');
  const uImgSize = uLoc('uImgSize');
  const uS = uLoc('uS');
  const uNow = uLoc('uNow');
  const uHover = uLoc('uHover');
  const uActive = uLoc('uActive');
  const uMotion = uLoc('uMotion');
  const uDrops = uLoc('uDrops');
  const uVel = uLoc('uVel');
  const uEdge = uLoc('uEdge');
  const uWobble = uLoc('uWobble');
  const uSmear = uLoc('uSmear');
  const uThrow = uLoc('uThrow');
  const uSpread = uLoc('uSpread');
  const uSink = uLoc('uSink');
  const uSwell = uLoc('uSwell');
  const uBend = uLoc('uBend');
  const uLens = uLoc('uLens');
  const uFilm = uLoc('uFilm');
  const uWaveEvery = uLoc('uWaveEvery');

  const reduced = prefersReducedMotion();
  const drops = new Float32Array(64);
  const vel = new Float32Array(32);

  let filmMode = 1; // Default (C) Daylight Caustics
  let imgUploaded = false;
  let destroyed = false;
  let visible = true;
  let rafId = 0;
  let renderedFrames = 0;

  let rect = hero.getBoundingClientRect();
  const resize = () => {
    rect = hero.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);
    gl.uniform2f(uPlane, w, h);
    gl.uniform1f(uS, w / 1440);
  };
  resize();

  const uploadImg = () => {
    if (destroyed || !img.complete || !img.naturalWidth) return;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.useProgram(program);
    gl.uniform2f(uImgSize, img.naturalWidth, img.naturalHeight);
    imgUploaded = true;
  };
  if (img.complete && img.naturalWidth) uploadImg();
  else img.addEventListener('load', uploadImg, { once: true });

  // Pointer spring-damper physics (1440 normalized space)
  const target = { x: 720, y: 520 };
  const pos = { x: 720, y: 520 };
  const pVel = { x: 0, y: 0 };
  const hoverState = { v: 0 };
  let isOver = false;
  let nextSlot = 1;
  let lastSpawn = { x: -10000, y: -10000 };
  let lastSpawnTime = -10000;
  const startTime = performance.now();
  let lastTime = startTime;

  const toNorm = (clientX: number, clientY: number) => {
    rect = hero.getBoundingClientRect();
    const s = Math.max(rect.width / 1440, 0.001);
    return { x: (clientX - rect.left) / s, y: (clientY - rect.top) / s };
  };

  const onMove = (e: PointerEvent) => {
    if (destroyed) return;
    const n = toNorm(e.clientX, e.clientY);
    const maxH = rect.height / Math.max(rect.width / 1440, 0.001);
    const inside = n.x >= 0 && n.y >= 0 && n.x <= 1440 && n.y <= maxH;
    if (inside && !isOver) {
      isOver = true;
      pos.x = n.x;
      pos.y = n.y;
      pVel.x = 0;
      pVel.y = 0;
      gsap.to(hoverState, { v: 1, duration: 0.75, ease: 'power3.out', overwrite: true });
    } else if (!inside && isOver) {
      isOver = false;
      gsap.to(hoverState, { v: 0, duration: 1.0, ease: 'power3.out', overwrite: true });
    }
    target.x = n.x;
    target.y = n.y;
  };

  const onLeave = () => {
    if (!isOver) return;
    isOver = false;
    gsap.to(hoverState, { v: 0, duration: 1.0, ease: 'power3.out', overwrite: true });
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);

  const filmHandlers: Array<() => void> = [];
  filmBtns.forEach((btn) => {
    const fn = () => {
      const idx = Number(btn.dataset.ottoFilm ?? '1');
      filmMode = Number.isFinite(idx) ? idx : 1;
      filmBtns.forEach((b) => b.classList.toggle('is-on', b === btn));
      studioAudio.tick(440 + filmMode * 60, 0.015);
    };
    btn.addEventListener('click', fn);
    filmHandlers.push(() => btn.removeEventListener('click', fn));
  });

  const ro = new ResizeObserver(resize);
  ro.observe(hero);

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !rafId && !destroyed) rafId = requestAnimationFrame(tick);
    },
    { threshold: 0.01 }
  );
  io.observe(hero);

  const tick = (now: number) => {
    rafId = 0;
    if (destroyed || !visible || document.hidden) return;
    if (!imgUploaded) uploadImg();

    const t = (now - startTime) / 1000;
    const dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;

    // 2nd-order spring damper (stiffness 120, damping 13)
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const hDt = dt / steps;
    for (let i = 0; i < steps; i++) {
      pVel.x += ((target.x - pos.x) * 120 - pVel.x * 13) * hDt;
      pVel.y += ((target.y - pos.y) * 120 - pVel.y * 13) * hDt;
      pos.x += pVel.x * hDt;
      pos.y += pVel.y * hDt;
    }

    const speed = Math.hypot(pVel.x, pVel.y);
    if (isOver && Math.hypot(pos.x - lastSpawn.x, pos.y - lastSpawn.y) > 14) {
      const k = nextSlot * 4;
      drops[k] = pos.x;
      drops[k + 1] = pos.y;
      drops[k + 2] = t;
      drops[k + 3] = 96 * (1 + Math.min(1, 0.55 * (speed / 1000)));
      vel[nextSlot * 2] = pVel.x;
      vel[nextSlot * 2 + 1] = pVel.y;
      nextSlot = nextSlot === 15 ? 1 : nextSlot + 1;
      lastSpawn = { x: pos.x, y: pos.y };
      lastSpawnTime = t;
    }

    const motionFlag = reduced ? 0 : 1;
    drops[0] = pos.x + 10 * motionFlag * (Math.sin(t * 0.9) + 0.5 * Math.sin(t * 2.3 + 1.0));
    drops[1] = pos.y + 10 * motionFlag * (Math.cos(t * 1.27) + 0.5 * Math.sin(t * 1.9 + 2.0));
    drops[2] = 0;
    drops[3] = 112 * (1 + 0.05 * motionFlag * Math.sin(t * 1.6));
    vel[0] = pVel.x;
    vel[1] = pVel.y;

    const scrollVel = Math.min(35, Math.abs(uniformBus.velocity));
    gl.useProgram(program);
    gl.uniform1i(uBare, 0);
    gl.uniform1f(uNow, t);
    gl.uniform1f(uHover, hoverState.v);
    gl.uniform1f(uActive, hoverState.v > 0.001 || t - lastSpawnTime < 1.2 || scrollVel > 1.5 ? 1.0 : 0.0);
    gl.uniform1f(uMotion, motionFlag);
    gl.uniform4fv(uDrops, drops);
    gl.uniform2fv(uVel, vel);
    gl.uniform1f(uEdge, 0.065);
    gl.uniform1f(uWobble, 14.0);
    gl.uniform1f(uSmear, 0.0013 + scrollVel * 0.00018);
    gl.uniform1f(uThrow, 0.22);
    gl.uniform1f(uSpread, 0.85);
    gl.uniform1f(uSink, 1.2);
    gl.uniform1f(uSwell, 0.18 + scrollVel * 0.008);
    gl.uniform1f(uBend, 9.5 + scrollVel * 0.015 * 14);
    gl.uniform1f(uLens, 5.2);
    gl.uniform1f(uFilm, filmMode);
    gl.uniform1f(uWaveEvery, 3.8);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (imgUploaded && renderedFrames < 2) {
      renderedFrames++;
      if (renderedFrames >= 2) canvas.classList.add('is-ready');
    }

    if (!reduced) {
      rafId = requestAnimationFrame(tick);
    }
  };
  rafId = requestAnimationFrame(tick);

  return () => {
    destroyed = true;
    if (rafId) cancelAnimationFrame(rafId);
    ro.disconnect();
    io.disconnect();
    window.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    filmHandlers.forEach((fn) => fn());
    gl.deleteTexture(tex);
    gl.deleteBuffer(buf);
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}

/**
 * Otto Header Compression (`t50` scale 1 -> 0.24), Menu Folding (02/03), Hero Curtain Parallax, & 4-Pic Train.
 */
function initOttoHeaderAndStory(): (() => void) | void {
  const hero = document.querySelector<HTMLElement>('.otto-hero');
  const stage = hero?.querySelector<HTMLElement>('[data-otto-hero-stage]');
  const shade = hero?.querySelector<HTMLElement>('[data-otto-hero-shade]');
  const story = document.querySelector<HTMLElement>('.otto-story');
  const header = document.querySelector<HTMLElement>('.otto-header');
  const title = header?.querySelector<HTMLElement>('[data-otto-header-title]');
  const foldGroups = Array.from(header?.querySelectorAll<HTMLElement>('[data-otto-fold-group]') || []);
  const pics = Array.from(story?.querySelectorAll<HTMLElement>('.otto-story__picture') || []);
  const specs = Array.from(story?.querySelectorAll<HTMLElement>('.otto-story__specs .otto-abs') || []);
  const reduced = prefersReducedMotion();

  if (!hero || reduced) return;

  const isDesktop = () => window.innerWidth >= 900;
  const cleanups: Array<() => void> = [];

  // 1. Header title compression (`1 -> 0.28` centered top on desktop; smooth fade on mobile)
  if (title) {
    if (isDesktop()) {
      const t = gsap.fromTo(
        title,
        { scale: 1, y: 0 },
        {
          scale: 0.28,
          y: () => 5 * (window.innerWidth / 1440),
          ease: 'none',
          transformOrigin: '50% 0%',
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: 'bottom 85%',
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        }
      );
      cleanups.push(() => {
        t.scrollTrigger?.kill();
        t.kill();
        gsap.set(title, { clearProps: 'transform,opacity,visibility' });
      });
    } else {
      const t = gsap.to(title, {
        autoAlpha: 0,
        y: -14,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'top -22%',
          scrub: 0.4,
        },
      });
      cleanups.push(() => {
        t.scrollTrigger?.kill();
        t.kill();
        gsap.set(title, { clearProps: 'transform,opacity,visibility' });
      });
    }
  }

  // 2. Fold secondary header coordinate tag past 12% hero scroll
  if (header && foldGroups.length) {
    let folded = false;
    const setFold = (next: boolean) => {
      if (next === folded) return;
      folded = next;
      header.classList.toggle('is-folded', next);
      if (next) {
        gsap.to(foldGroups, { yPercent: -130, autoAlpha: 0, duration: 0.5, ease: 'power2.inOut', stagger: 0.03, overwrite: 'auto' });
      } else {
        gsap.to(foldGroups, { yPercent: 0, autoAlpha: 1, duration: 0.55, ease: 'power3.out', stagger: 0.03, overwrite: 'auto' });
      }
    };
    const st = ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: 'max',
      onUpdate: () => setFold(window.scrollY > window.innerHeight * 0.12),
      onRefresh: () => setFold(window.scrollY > window.innerHeight * 0.12),
    });
    cleanups.push(() => {
      st.kill();
      header.classList.remove('is-folded');
      gsap.set(foldGroups, { clearProps: 'transform,opacity,visibility' });
    });
  }

  // 3. Hero stage vertical parallax (`yPercent: 18`, `scale: 1.08`) + dusk shade as next section rises
  const nextSec = story || document.querySelector<HTMLElement>('#arch-story, #works, .arch-story');
  if (stage && shade && isDesktop() && nextSec) {
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: nextSec,
        start: 'top bottom',
        end: 'top top',
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });
    tl.to(stage, { yPercent: 18, scale: 1.08 }, 0).to(shade, { opacity: 0.55 }, 0);
    cleanups.push(() => {
      tl.scrollTrigger?.kill();
      tl.kill();
      gsap.set([stage, shade], { clearProps: 'transform,opacity' });
    });
  }

  // Asymmetric thesis plates parallax inside #arch-story
  const storyPlates = Array.from(document.querySelectorAll<HTMLElement>('[data-story-plate]'));
  if (storyPlates.length && isDesktop()) {
    storyPlates.forEach((el, idx) => {
      const fromY = idx === 0 ? 40 : 95;
      const toY = idx === 0 ? -25 : -45;
      const tw = gsap.fromTo(
        el,
        { y: fromY },
        {
          y: toY,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        }
      );
      cleanups.push(() => {
        tw.scrollTrigger?.kill();
        tw.kill();
        gsap.set(el, { clearProps: 'transform' });
      });
    });
  }

  // 4. Story 4-picture vertical train scrub & specs subtle entrance
  if (pics.length && isDesktop()) {
    gsap.set(pics, { yPercent: 65 });
    const train = gsap.timeline({ paused: true });
    pics.forEach((pic, idx) => {
      train.to(pic, { yPercent: 0, duration: 1.2 - idx * 0.1, ease: 'power3.out' }, idx * 0.1);
    });
    const st = ScrollTrigger.create({
      trigger: story,
      start: 'top bottom',
      endTrigger: pics[pics.length - 1],
      end: 'center 80%',
      scrub: 0.4,
      animation: train,
      invalidateOnRefresh: true,
    });
    cleanups.push(() => {
      st.kill();
      train.kill();
      gsap.set(pics, { clearProps: 'transform' });
    });
  }

  if (specs.length && isDesktop()) {
    const t = gsap.fromTo(
      specs,
      { y: 24, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.85,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: { trigger: specs[0], start: 'top 86%', once: true },
      }
    );
    cleanups.push(() => {
      t.scrollTrigger?.kill();
      t.kill();
      gsap.set(specs, { clearProps: 'transform,opacity' });
    });
  }

  // 5. Otto Objects Centerpiece Lift & Text-Parting Flight through .otto-story__lead & .otto-story__details
  const flight = story?.querySelector<HTMLElement>('[data-otto-story-flight]') ?? null;
  const spinStage = story?.querySelector<HTMLElement>('[data-otto-spin-stage]') ?? null;
  const lastPic = pics[pics.length - 1];
  const splitTargets = story
    ? Array.from(story.querySelectorAll<HTMLElement>('.otto-story__lead .otto-line__in, .otto-story__details .otto-line__in'))
    : [];

  if (story && flight && lastPic && splitTargets.length && isDesktop()) {
    const originals = new Map<HTMLElement, string>();
    const partedLines: Array<{ line: HTMLElement; left: HTMLSpanElement; right: HTMLSpanElement }> = [];

    splitTargets.forEach((el) => {
      const raw = el.textContent ?? '';
      const trimmed = raw.trim();
      if (!trimmed || trimmed === '\u00a0') return;
      originals.set(el, raw);

      const mid = Math.floor(raw.length / 2);
      let splitAt = mid;
      let bestDist = Infinity;
      for (let i = 1; i < raw.length - 1; i++) {
        if (raw[i] === ' ') {
          const d = Math.abs(i - mid);
          if (d < bestDist) {
            bestDist = d;
            splitAt = i;
          }
        }
      }

      const leftText = raw.slice(0, splitAt);
      const rightText = raw.slice(splitAt);
      el.textContent = '';
      const leftSpan = document.createElement('span');
      leftSpan.className = 'otto-half';
      leftSpan.textContent = leftText;
      const rightSpan = document.createElement('span');
      rightSpan.className = 'otto-half';
      rightSpan.textContent = rightText.startsWith(' ') ? `\u00a0${rightText.slice(1)}` : rightText;
      el.append(leftSpan, rightSpan);

      const parentLine = el.parentElement;
      if (parentLine) {
        partedLines.push({ line: parentLine, left: leftSpan, right: rightSpan });
      }
    });

    const smoothstep = (a: number, b: number, x: number) => {
      const k = Math.min(1, Math.max(0, (x - a) / Math.max(b - a, 0.0001)));
      return k * k * (3 - 2 * k);
    };

    const flightST = ScrollTrigger.create({
      trigger: lastPic,
      start: 'center 56%',
      endTrigger: spinStage ?? lastPic,
      end: spinStage ? 'top 62%' : 'bottom top',
    });

    const tickFlight = () => {
      const vw = story.offsetWidth;
      const vh = window.innerHeight;
      const s = vw / 1440;
      const p = flightST.progress;
      const alpha = p <= 0.01 || p >= 0.99 ? 0 : Math.min(smoothstep(0.01, 0.14, p), 1 - smoothstep(0.84, 0.99, p));

      const fw = flight.offsetWidth || 108 * s;
      const fh = flight.offsetHeight || 280 * s;
      const cx = story.getBoundingClientRect().left + vw * 0.5 - fw * 0.5;
      const cy = vh * 0.5 - fh * 0.5;

      flight.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0) scale(${(0.88 + 0.12 * smoothstep(0, 0.25, p)).toFixed(4)})`;
      flight.style.opacity = alpha.toFixed(3);

      const topEdge = cy;
      const botEdge = cy + fh;
      const range = 105 * s;
      const push = fw * 0.62 + 34 * s;

      for (const item of partedLines) {
        if (alpha <= 0.01) {
          item.left.style.transform = '';
          item.right.style.transform = '';
          continue;
        }
        const r = item.line.getBoundingClientRect();
        const dy = Math.max(0, topEdge - r.bottom, r.top - botEdge);
        const prox = (1 - smoothstep(0, range, dy)) * alpha;
        if (prox <= 0.002) {
          item.left.style.transform = '';
          item.right.style.transform = '';
        } else {
          const dx = (push * prox).toFixed(2);
          item.left.style.transform = `translate3d(-${dx}px, 0, 0)`;
          item.right.style.transform = `translate3d(${dx}px, 0, 0)`;
        }
      }
    };

    gsap.ticker.add(tickFlight);
    cleanups.push(() => {
      gsap.ticker.remove(tickFlight);
      flightST.kill();
      flight.style.opacity = '0';
      flight.style.transform = '';
      originals.forEach((txt, el) => {
        el.textContent = txt;
      });
    });
  }

  return () => cleanups.forEach((fn) => fn());
}

/**
 * Custom Otto Objects Pinned 3-Step Wireframe & Architectural Elevation Morph Stage.
 */
function initOttoFormsPin(): (() => void) | void {
  const stage = document.querySelector<HTMLElement>('[data-otto-spin-stage]');
  if (!stage || prefersReducedMotion()) return;

  const stepNum = stage.querySelector<HTMLElement>('[data-otto-step-num]');
  const steps = Array.from(stage.querySelectorAll<HTMLElement>('[data-otto-step]'));
  const titles = Array.from(stage.querySelectorAll<HTMLElement>('[data-otto-step-title]'));
  const flightInner = stage.querySelector<HTMLElement>('[data-otto-flight-inner]');
  const photo = stage.querySelector<HTMLElement>('[data-otto-flight-photo]');
  const svg = stage.querySelector<SVGSVGElement>('[data-otto-flight-svg]');
  const paths = Array.from(stage.querySelectorAll<SVGGeometryElement>('[data-otto-path]'));

  if (!steps.length || !titles.length) return;

  const isDesktop = window.innerWidth >= 900 && matchMedia('(hover: hover) and (pointer: fine)').matches;
  let activeStep = 0;

  const setStep = (idx: number) => {
    if (idx === activeStep) return;
    activeStep = idx;
    if (stepNum) stepNum.textContent = `0${idx + 1}`;
    steps.forEach((el, i) => el.classList.toggle('is-active', i === idx));
    titles.forEach((el, i) => el.classList.toggle('is-active', i === idx));
  };

  paths.forEach((p) => {
    p.style.strokeDasharray = '1 1';
    p.style.strokeDashoffset = '1';
  });

  if (!isDesktop) {
    // Clean mobile reveal: draw blueprint lines immediately on intersection
    const st = ScrollTrigger.create({
      trigger: stage,
      start: 'top 78%',
      once: true,
      onEnter: () => {
        if (svg) gsap.to(svg, { opacity: 1, duration: 0.7 });
        paths.forEach((p, i) => {
          gsap.to(p, { strokeDashoffset: 0, duration: 0.9, delay: i * 0.04, ease: 'power2.out' });
        });
      },
    });
    return () => {
      st.kill();
      paths.forEach((p) => {
        p.style.strokeDasharray = '';
        p.style.strokeDashoffset = '';
      });
    };
  }

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: stage,
      pin: true,
      anticipatePin: 1,
      start: 'top top',
      end: '+=295%',
      scrub: 0.5,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        setStep(p < 0.34 ? 0 : p < 0.68 ? 1 : 2);
      },
    },
  });

  if (flightInner) {
    tl.fromTo(flightInner, { scale: 0.94, rotateY: -5 }, { scale: 1.04, rotateY: 5, duration: 1 }, 0);
  }
  if (svg) {
    tl.fromTo(svg, { opacity: 0.72 }, { opacity: 1, duration: 0.3 }, 0);
  }
  const layer0 = paths.filter((p) => (p.dataset.cadStep || '0') === '0');
  const layer1 = paths.filter((p) => p.dataset.cadStep === '1');
  const layer2 = paths.filter((p) => p.dataset.cadStep === '2');
  layer0.forEach((path, i) => {
    tl.fromTo(path, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.32 }, 0.02 + i * 0.015);
  });
  layer1.forEach((path, i) => {
    tl.fromTo(path, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.32 }, 0.34 + i * 0.015);
  });
  layer2.forEach((path, i) => {
    tl.fromTo(path, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.32 }, 0.66 + i * 0.015);
  });

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
    gsap.set([flightInner, photo, svg].filter(Boolean) as HTMLElement[], { clearProps: 'transform,opacity' });
    paths.forEach((p) => {
      p.style.strokeDasharray = '';
      p.style.strokeDashoffset = '';
    });
    setStep(0);
  };
}

/**
 * Interactive Otto Objects `(I) (II) (III)` Architectural Scale Card Switcher with Slot-Roll Text & Sliding Border.
 */
function initOttoCard(): (() => void) | void {
  const card = document.querySelector<HTMLElement>('[data-otto-card]');
  if (!card) return;

  const frame = card.querySelector<HTMLElement>('[data-otto-card-frame]');
  const titleIn = card.querySelector<HTMLElement>('[data-otto-card-title] .otto-line__in');
  const dimsIn = card.querySelector<HTMLElement>('[data-otto-card-dims] .otto-line__in');
  const matEl = card.querySelector<HTMLElement>('[data-otto-card-mat]');
  const buyLink = card.querySelector<HTMLAnchorElement>('[data-otto-card-link]');
  const buyIn = buyLink?.querySelector<HTMLElement>('.otto-line__in');
  const btns = Array.from(card.querySelectorAll<HTMLButtonElement>('[data-otto-size]'));

  if (!frame || !btns.length) return;

  const specs: Record<string, { title: string; dims: string; mat: string; cta: string; href: string }> = {
    '1': {
      title: 'Fluted Study (I)',
      dims: 'W 4200 \u00d7 D 3600 \u00d7 H 3200 mm',
      mat: 'In Oiled Sal Timber & Brass Inlay',
      cta: 'Explore 3D Study (I)',
      href: '/showroom/',
    },
    '2': {
      title: 'Drawing Room (II)',
      dims: 'W 7800 \u00d7 D 4800 \u00d7 H 3400 mm',
      mat: 'In Honed Veined Marble & Anodized Bronze',
      cta: 'View Drawing Room (II)',
      href: '/works/formal-drawing-room/',
    },
    '3': {
      title: 'Fluted Suite (III)',
      dims: 'W 6400 \u00d7 D 5200 \u00d7 H 3200 mm',
      mat: 'In Seasoned Sal Timber & Honed Stone',
      cta: 'View Fluted Suite (III)',
      href: '/works/fluted-master-suite/',
    },
  };

  let activeIdx = Math.max(0, btns.findIndex((b) => b.classList.contains('is-active')));
  const getX = (el: HTMLElement) => Number(el.style.getPropertyValue('--x')) || 105;
  const frameBox = { x: getX(btns[activeIdx]), r: getX(btns[activeIdx]) + 133 };
  const applyFrame = () => {
    frame.style.setProperty('--x', String(frameBox.x));
    frame.style.setProperty('--r', String(frameBox.r));
  };
  applyFrame();

  const rollReplace = (el: HTMLElement | null | undefined, nextText: string, forward: boolean, delay = 0) => {
    if (!el || el.textContent === nextText) return;
    if (prefersReducedMotion()) {
      el.textContent = nextText;
      return;
    }
    gsap.killTweensOf(el);
    gsap.to(el, {
      yPercent: forward ? -115 : 115,
      opacity: 0,
      duration: 0.24,
      delay,
      ease: 'power2.in',
      onComplete: () => {
        el.textContent = nextText;
        gsap.fromTo(
          el,
          { yPercent: forward ? 115 : -115, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }
        );
      },
    });
  };

  const cleanups: Array<() => void> = [];
  btns.forEach((btn, idx) => {
    const fn = () => {
      if (idx === activeIdx) return;
      const forward = idx > activeIdx;
      activeIdx = idx;
      btns.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-checked', String(on));
      });
      studioAudio.tick(460 + idx * 55, 0.018);

      const nextX = getX(btn);
      const lead = { duration: 0.55, ease: 'power3.inOut', delay: 0 };
      const trail = { duration: 0.7, ease: 'power3.inOut', delay: 0.06 };
      gsap.killTweensOf(frameBox);
      gsap.to(frameBox, { r: nextX + 133, ...(forward ? lead : trail), onUpdate: applyFrame });
      gsap.to(frameBox, { x: nextX, ...(forward ? trail : lead), onUpdate: applyFrame });

      const data = specs[btn.dataset.ottoSize || '3'];
      if (data) {
        rollReplace(titleIn, data.title, forward, 0);
        rollReplace(dimsIn, data.dims, forward, 0.04);
        if (matEl) matEl.textContent = data.mat;
        rollReplace(buyIn, data.cta, forward, 0.08);
        if (buyLink) buyLink.href = data.href;
      }
    };
    btn.addEventListener('click', fn);
    cleanups.push(() => btn.removeEventListener('click', fn));
  });

  return () => {
    cleanups.forEach((fn) => fn());
    gsap.killTweensOf(frameBox);
  };
}

/**
 * Custom Otto Objects Dark `#1e1b1a` Staggered Collection Showcase + Cursor-Y Pill Tracker.
 */
function initOttoCollection(): (() => void) | void {
  const root = document.querySelector<HTMLElement>('.otto-collection');
  if (!root) return;

  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-otto-collection-card]'));
  const reduced = prefersReducedMotion();
  const isDesktop = window.innerWidth >= 900;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cleanups: Array<() => void> = [];

  cards.forEach((card, idx) => {
    const pic = card.querySelector<HTMLElement>('.otto-collection__pic');
    const img = pic?.querySelector<HTMLElement>('img');
    const labelText = card.dataset.label || 'Explore';

    // Cursor-tracking floating plate label (desktop hover)
    const label = document.createElement('span');
    label.className = 'otto-collection__label otto-t12';
    label.setAttribute('aria-hidden', 'true');
    label.innerHTML =
      `<span><span class="otto-collection__plate">${labelText}</span></span>` +
      `<span><span class="otto-collection__arrow">&rarr;</span></span>`;
    card.appendChild(label);

    if (finePointer) {
      const moveY = gsap.quickTo(label, 'y', { duration: 0.45, ease: 'power3.out' });
      const clampY = (clientY: number) => {
        const rect = card.getBoundingClientRect();
        const pad = 10 * (card.offsetWidth / 456);
        const raw = clientY - rect.top - label.offsetHeight / 2;
        return Math.min(Math.max(raw, pad), card.offsetHeight - label.offsetHeight - pad);
      };
      const onEnter = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        gsap.set(label, { y: clampY(e.clientY) });
        card.classList.add('is-hover');
      };
      const onMove = (e: PointerEvent) => {
        if (e.pointerType === 'mouse') moveY(clampY(e.clientY));
      };
      const onLeave = () => card.classList.remove('is-hover');
      card.addEventListener('pointerenter', onEnter);
      card.addEventListener('pointermove', onMove);
      card.addEventListener('pointerleave', onLeave);
      cleanups.push(() => {
        card.removeEventListener('pointerenter', onEnter);
        card.removeEventListener('pointermove', onMove);
        card.removeEventListener('pointerleave', onLeave);
        label.remove();
      });
    } else {
      cleanups.push(() => label.remove());
    }

    if (!reduced) {
      gsap.set(card, isDesktop ? { clipPath: 'inset(7% 7% 7% 7%)', opacity: 0 } : { opacity: 0 });
      if (pic) gsap.set(pic, { scale: 1.14 });
      const st = ScrollTrigger.create({
        trigger: card,
        start: 'top 95%',
        once: true,
        onEnter: () => {
          const delay = (idx % 3) * 0.08;
          gsap.to(card, {
            ...(isDesktop ? { clipPath: 'inset(0% 0% 0% 0%)' } : {}),
            opacity: 1,
            duration: 1.25,
            delay,
            ease: 'power3.out',
          });
          if (pic) gsap.to(pic, { scale: 1, duration: 1.65, delay, ease: 'power3.out' });
        },
      });
      cleanups.push(() => {
        st.kill();
        gsap.set([card, pic].filter(Boolean) as HTMLElement[], { clearProps: 'transform,clipPath,opacity' });
      });

      if (isDesktop && img) {
        const parallax = gsap.fromTo(
          img,
          { yPercent: -5 },
          {
            yPercent: 5,
            ease: 'none',
            scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true },
          }
        );
        cleanups.push(() => {
          parallax.scrollTrigger?.kill();
          parallax.kill();
          gsap.set(img, { clearProps: 'transform' });
        });
      }
    }
  });

  return () => cleanups.forEach((fn) => fn());
}

/**
 * Frame 3A: OH Architecture opposing horizontal glide on "FEATURED / WORKS (03)".
 */
function initMegaHeader(): (() => void) | void {
  const wrap = document.querySelector<HTMLElement>('[data-mega-header]');
  const leftWord = wrap?.querySelector<HTMLElement>('[data-mega-left]');
  const rightWord = wrap?.querySelector<HTMLElement>('[data-mega-right]');
  if (!wrap || !leftWord || !rightWord || prefersReducedMotion()) return;

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: wrap,
      start: 'top 90%',
      end: 'center 42%',
      scrub: 0.5,
      invalidateOnRefresh: true,
    },
  });

  tl.fromTo(leftWord, { xPercent: -7 }, { xPercent: 0 }, 0);
  tl.fromTo(rightWord, { xPercent: 9 }, { xPercent: 0 }, 0);

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
    gsap.set([leftWord, rightWord], { clearProps: 'transform' });
  };
}

/**
 * Frame 3B: Telha Clarke `c-works` kinetic flying `[ Title ]` + aperture zoom stack.
 */
function initTelhaWorks(): (() => void) | void {
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-tc-item]'));
  if (!items.length || prefersReducedMotion()) return;

  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const desktop = window.innerWidth >= 900 && finePointer;
  const cleanups: Array<() => void> = [];

  items.forEach((item) => {
    const bracketL = item.querySelector<HTMLElement>('[data-tc-bracket-l]');
    const bracketR = item.querySelector<HTMLElement>('[data-tc-bracket-r]');
    const title = item.querySelector<HTMLElement>('[data-tc-title]');
    const box = item.querySelector<HTMLElement>('[data-tc-box]');
    const img = item.querySelector<HTMLElement>('[data-tc-img]');
    const metas = Array.from(item.querySelectorAll<HTMLElement>('[data-tc-meta]'));

    if (!box || !img) return;

    const spread = desktop ? 18 : 6;
    const enterTl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: item,
        start: 'top 95%',
        end: 'top 35%',
        scrub: 0.15,
        invalidateOnRefresh: true,
      },
    });

    if (bracketL) enterTl.fromTo(bracketL, { x: '0vw' }, { x: `-${spread}vw` }, 0);
    if (bracketR) enterTl.fromTo(bracketR, { x: '0vw' }, { x: `${spread}vw` }, 0);
    if (title) enterTl.fromTo(title, { letterSpacing: '-0.025em' }, { letterSpacing: '0.03em' }, 0);
    enterTl.fromTo(
      box,
      { scale: 0.45, clipPath: 'inset(14% 18% 14% 18%)' },
      { scale: 1.0, clipPath: 'inset(0% 0% 0% 0%)' },
      0
    );
    enterTl.fromTo(img, { scale: 1.65 }, { scale: 1.0 }, 0);

    let leaveTl: gsap.core.Timeline | null = null;
    if (desktop) {
      leaveTl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: item,
          start: 'center 18%',
          end: 'bottom top',
          scrub: 0.15,
          invalidateOnRefresh: true,
          onEnter: () => {
            if (metas.length) gsap.to(metas, { yPercent: -20, opacity: 0.45, duration: 0.6, ease: 'expo.out' });
          },
          onLeaveBack: () => {
            if (metas.length) gsap.to(metas, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'expo.out' });
          },
        },
      });
      if (bracketL) leaveTl.fromTo(bracketL, { x: `-${spread}vw` }, { x: '0vw' }, 0);
      if (bracketR) leaveTl.fromTo(bracketR, { x: `${spread}vw` }, { x: '0vw' }, 0);
      if (title) leaveTl.fromTo(title, { letterSpacing: '0.03em' }, { letterSpacing: '-0.025em' }, 0);
      leaveTl.fromTo(box, { scale: 1.0, yPercent: 0 }, { scale: 0.58, yPercent: -18 }, 0);
      leaveTl.fromTo(img, { scale: 1.0 }, { scale: 1.45 }, 0);
    }

    cleanups.push(() => {
      enterTl.scrollTrigger?.kill();
      enterTl.kill();
      leaveTl?.scrollTrigger?.kill();
      leaveTl?.kill();
      gsap.set([bracketL, bracketR, title, box, img, ...metas].filter(Boolean) as HTMLElement[], {
        clearProps: 'transform,clipPath,letterSpacing,opacity',
      });
    });
  });

  return () => cleanups.forEach((fn) => fn());
}

/**
 * Frame 4B: House of Corto pinned center-portal explosion into 5-plate matrix + Otto Objects SVG smear.
 */
function initCortoMatrix(): (() => void) | void {
  const stage = document.querySelector<HTMLElement>('.corto-stage');
  const canvas = stage?.querySelector<HTMLElement>('.corto-stage__canvas');
  const center = stage?.querySelector<HTMLElement>('.corto-card--center');
  const sat1 = stage?.querySelector<HTMLElement>('.corto-card--sat-1');
  const sat2 = stage?.querySelector<HTMLElement>('.corto-card--sat-2');
  const sat3 = stage?.querySelector<HTMLElement>('.corto-card--sat-3');
  const sat4 = stage?.querySelector<HTMLElement>('.corto-card--sat-4');
  const labelL = stage?.querySelector<HTMLElement>('[data-corto-label-l]');
  const labelR = stage?.querySelector<HTMLElement>('[data-corto-label-r]');
  const blurNode = stage?.querySelector<SVGFEGaussianBlurElement>('[data-smear-blur]');

  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!stage || !canvas || !center || prefersReducedMotion() || window.innerWidth < 900 || !finePointer) {
    return;
  }

  let currentSmear = 0;
  let targetSmear = 0;
  let smearRaf = 0;

  const updateSmear = () => {
    targetSmear *= 0.84;
    currentSmear += (targetSmear - currentSmear) * 0.22;
    if (blurNode) {
      if (currentSmear > 0.25) {
        blurNode.setAttribute('stdDeviation', `0 ${currentSmear.toFixed(2)}`);
        canvas.style.filter = 'url(#corto-smear)';
      } else {
        blurNode.setAttribute('stdDeviation', '0 0');
        canvas.style.filter = '';
      }
    }
    if (currentSmear > 0.25 || targetSmear > 0.25) {
      smearRaf = requestAnimationFrame(updateSmear);
    } else {
      smearRaf = 0;
      if (blurNode) blurNode.setAttribute('stdDeviation', '0 0');
      canvas.style.filter = '';
    }
  };

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: stage,
      pin: true,
      anticipatePin: 1,
      start: 'top top',
      end: '+=200%',
      scrub: 0.5,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        targetSmear = Math.min(14, (Math.abs(self.getVelocity()) / 1000) * 6.5);
        if (targetSmear > 0.3 && !smearRaf) {
          smearRaf = requestAnimationFrame(updateSmear);
        }
      },
    },
  });

  tl.fromTo(center, { x: '0vw', y: '0vh', scale: 0.96 }, { x: '0vw', y: '-14vh', scale: 1.04, duration: 0.45 }, 0.05);
  if (sat1) tl.fromTo(sat1, { x: 0, y: 0, scale: 0.35, opacity: 0 }, { x: '-34vw', y: '-16vh', scale: 1.0, opacity: 1, duration: 0.45 }, 0.05);
  if (sat3) tl.fromTo(sat3, { x: 0, y: 0, scale: 0.35, opacity: 0 }, { x: '34vw', y: '-16vh', scale: 1.0, opacity: 1, duration: 0.45 }, 0.05);
  if (sat2) tl.fromTo(sat2, { x: 0, y: 0, scale: 0.35, opacity: 0 }, { x: '-18vw', y: '21vh', scale: 0.96, opacity: 1, duration: 0.45 }, 0.08);
  if (sat4) tl.fromTo(sat4, { x: 0, y: 0, scale: 0.35, opacity: 0 }, { x: '18vw', y: '21vh', scale: 0.96, opacity: 1, duration: 0.45 }, 0.08);
  if (labelL) tl.to(labelL, { opacity: 0, x: -32, duration: 0.25 }, 0.04);
  if (labelR) tl.to(labelR, { opacity: 0, x: 32, duration: 0.25 }, 0.04);
  tl.to(center, { scale: 1.04, duration: 0.45 }, 0.55);

  return () => {
    if (smearRaf) cancelAnimationFrame(smearRaf);
    canvas.style.filter = '';
    tl.scrollTrigger?.kill();
    tl.kill();
    gsap.set([center, sat1, sat2, sat3, sat4, labelL, labelR].filter(Boolean) as HTMLElement[], {
      clearProps: 'transform,opacity',
    });
  };
}

/**
 * Frame 6A: ANUC Home 4-column continuous vertical hairline staggered plate travel.
 */
function initAnucGrid(): (() => void) | void {
  const grid = document.querySelector<HTMLElement>('.anuc-grid');
  const plates = Array.from(document.querySelectorAll<HTMLElement>('[data-anuc-plate]'));
  if (!grid || !plates.length || prefersReducedMotion() || window.innerWidth < 900) return;

  const offsets = [
    { fromY: 50, toY: -10 },
    { fromY: 110, toY: -25 },
    { fromY: 35, toY: -40 },
  ];

  const tweens = plates.map((plate, i) => {
    const cfg = offsets[i] || offsets[0];
    return gsap.fromTo(
      plate,
      { y: cfg.fromY },
      {
        y: cfg.toY,
        ease: 'none',
        scrollTrigger: {
          trigger: grid,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.5,
          invalidateOnRefresh: true,
        },
      }
    );
  });

  return () => {
    tweens.forEach((t) => {
      t.scrollTrigger?.kill();
      t.kill();
    });
    gsap.set(plates, { clearProps: 'transform' });
  };
}

/**
 * Frame 6B: DHK Architects black-cut manifesto where `we` tracks the active line vertically on scroll.
 */
function initDhkManifesto(): (() => void) | void {
  const root = document.querySelector<HTMLElement>('.dhk-manifesto');
  const we = root?.querySelector<HTMLElement>('[data-dhk-we]');
  const lines = Array.from(root?.querySelectorAll<HTMLElement>('[data-dhk-line]') || []);
  if (!root || !we || !lines.length || prefersReducedMotion()) return;

  let activeIdx = 0;
  const setActive = (idx: number) => {
    activeIdx = idx;
    lines.forEach((line, i) => line.classList.toggle('is-active', i === idx));
    if (window.innerWidth >= 900) {
      const target = lines[idx];
      if (target) {
        const yOffset = target.offsetTop - lines[0].offsetTop;
        gsap.to(we, { y: yOffset, duration: 0.45, ease: 'expo.out', overwrite: 'auto' });
      }
    }
  };

  const triggers = lines.map((line, i) =>
    ScrollTrigger.create({
      trigger: line,
      start: 'top 62%',
      end: 'bottom 42%',
      onEnter: () => {
        setActive(i);
        studioAudio.tick(520 + i * 25, 0.012);
      },
      onEnterBack: () => setActive(i),
    })
  );

  const onResize = () => setActive(activeIdx);
  window.addEventListener('resize', onResize, { passive: true });

  return () => {
    window.removeEventListener('resize', onResize);
    triggers.forEach((st) => st.kill());
    gsap.set(we, { clearProps: 'transform' });
    lines.forEach((l) => l.classList.remove('is-active'));
    lines[0]?.classList.add('is-active');
  };
}

/**
 * Act 3: OTTO-Style Pinned Horizontal Gallery & 01-04 Scrub Ruler with Counter-Parallax Frames.
 */
function initOttoGalleryPin(): (() => void) | void {
  const root = document.querySelector<HTMLElement>('[data-otto-gallery]');
  if (!root || prefersReducedMotion() || window.innerWidth < 768) return;

  const track = root.querySelector<HTMLElement>('[data-gallery-track]');
  const parallaxFrames = Array.from(root.querySelectorAll<HTMLElement>('[data-gallery-parallax]'));
  const marks = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-gallery-mark]'));
  const thumb = root.querySelector<HTMLElement>('[data-gallery-thumb]');
  const activeIdxEl = root.querySelector<HTMLElement>('[data-gallery-active-idx]');
  const activeCapEl = root.querySelector<HTMLElement>('[data-gallery-active-cap]');
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-gallery-item]'));

  if (!track || !items.length) return;

  const captions = items.map((el) => el.dataset.caption || '');
  let lastActive = 0;

  const getDistance = () => Math.max(track.scrollWidth - window.innerWidth + window.innerWidth * 0.14, window.innerHeight * 2.2);

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: root,
      pin: true,
      anticipatePin: 1,
      start: 'top top',
      end: () => `+=${Math.max(window.innerHeight * 3.95, track.scrollWidth - window.innerWidth * 0.25)}`,
      scrub: 0.6,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        if (thumb) {
          thumb.style.transform = `translate3d(${(p * 300).toFixed(2)}%, 0, 0)`;
        }
        const idx = Math.min(items.length - 1, Math.max(0, Math.round(p * (items.length - 1))));
        if (idx !== lastActive) {
          lastActive = idx;
          marks.forEach((m, i) => m.classList.toggle('is-now', i === idx));
          if (activeIdxEl) activeIdxEl.textContent = `0${idx + 1}`;
          if (activeCapEl && captions[idx]) activeCapEl.textContent = captions[idx];
        }
      },
    },
  });

  tl.to(track, { x: () => -getDistance(), duration: 1 }, 0);
  parallaxFrames.forEach((frame) => {
    tl.fromTo(frame, { xPercent: -8 }, { xPercent: 8, duration: 1 }, 0);
  });

  const markHandlers: Array<() => void> = [];
  marks.forEach((btn, idx) => {
    const fn = () => {
      const st = tl.scrollTrigger;
      if (!st) return;
      const frac = items.length > 1 ? idx / (items.length - 1) : 0;
      const targetY = st.start + (st.end - st.start) * frac;
      scrollToTarget(targetY, { duration: 1.0 });
    };
    btn.addEventListener('click', fn);
    markHandlers.push(() => btn.removeEventListener('click', fn));
  });

  return () => {
    markHandlers.forEach((f) => f());
    tl.scrollTrigger?.kill();
    tl.kill();
    gsap.set([track, ...parallaxFrames, thumb].filter(Boolean) as HTMLElement[], { clearProps: 'transform' });
  };
}

/**
 * Act 4A: Telha Clarke [ Lookbook | Index ] Toggle + Floating Cursor Preview Plate.
 */
function initWorksViewToggle(): (() => void) | void {
  const sec = document.querySelector<HTMLElement>('[data-works-atelier]');
  if (!sec) return;

  const btns = Array.from(sec.querySelectorAll<HTMLButtonElement>('[data-works-view]'));
  const rows = Array.from(sec.querySelectorAll<HTMLElement>('[data-ledger-row]'));
  const preview = sec.querySelector<HTMLElement>('[data-ledger-preview]');
  const previewImg = preview?.querySelector<HTMLImageElement>('img');
  const cleanups: Array<() => void> = [];

  btns.forEach((btn) => {
    const fn = () => {
      const view = btn.dataset.worksView || 'lookbook';
      sec.dataset.view = view;
      btns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      studioAudio.tick(490, 0.015);
      requestAnimationFrame(() => ScrollTrigger.refresh());
    };
    btn.addEventListener('click', fn);
    cleanups.push(() => btn.removeEventListener('click', fn));
  });

  if (preview && previewImg && window.innerWidth >= 900 && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const moveX = gsap.quickTo(preview, 'x', { duration: 0.35, ease: 'power3.out' });
    const moveY = gsap.quickTo(preview, 'y', { duration: 0.35, ease: 'power3.out' });
    rows.forEach((row) => {
      const onEnter = (e: PointerEvent) => {
        const src = row.dataset.previewSrc;
        if (src && previewImg.src !== src) previewImg.src = src;
        gsap.set(preview, { x: e.clientX + 24, y: e.clientY - 120 });
        gsap.to(preview, { opacity: 1, duration: 0.25, ease: 'power2.out' });
      };
      const onMove = (e: PointerEvent) => {
        moveX(e.clientX + 24);
        moveY(Math.max(24, Math.min(window.innerHeight - 320, e.clientY - 120)));
      };
      const onLeave = () => {
        gsap.to(preview, { opacity: 0, duration: 0.2 });
      };
      row.addEventListener('pointerenter', onEnter);
      row.addEventListener('pointermove', onMove);
      row.addEventListener('pointerleave', onLeave);
      cleanups.push(() => {
        row.removeEventListener('pointerenter', onEnter);
        row.removeEventListener('pointermove', onMove);
        row.removeEventListener('pointerleave', onLeave);
      });
    });
  }

  return () => cleanups.forEach((f) => f());
}

/**
 * Act 4B: Embedded Interactive 1:20 Vector CAD Elevation Sheet (Lazy Mounted via IntersectionObserver).
 */
function initHomeBlueprintSheet(): (() => void) | void {
  const sec = document.querySelector<HTMLElement>('[data-home-cad-section]');
  const canvas = sec?.querySelector<HTMLCanvasElement>('[data-home-cad-canvas]');
  if (!sec || !canvas) return;

  let engine: BlueprintEngine | null = null;
  let disposed = false;

  const ensureMounted = () => {
    if (engine || disposed) return engine;
    engine = createBlueprintEngine(canvas, {
      commissionId: 'fluted_master_suite',
      themeId: 'warm_vellum',
      initialTool: 'measure',
    });
    return engine;
  };

  const io = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) ensureMounted();
    },
    { rootMargin: '500px' }
  );
  io.observe(sec);

  const cleanups: Array<() => void> = [];
  const commBtns = Array.from(sec.querySelectorAll<HTMLButtonElement>('[data-cad-comm]'));
  const toolBtns = Array.from(sec.querySelectorAll<HTMLButtonElement>('[data-cad-tool]'));
  const themeBtns = Array.from(sec.querySelectorAll<HTMLButtonElement>('[data-cad-theme]'));
  const zoomBtns = Array.from(sec.querySelectorAll<HTMLButtonElement>('[data-cad-zoom]'));
  const exportBtn = sec.querySelector<HTMLButtonElement>('[data-cad-export]');

  commBtns.forEach((btn) => {
    const fn = () => {
      const e = ensureMounted();
      const id = btn.dataset.cadComm as RubiconiusCommissionId;
      if (e && id) {
        e.setCommission(id);
        e.fitToViewport(false);
        commBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        studioAudio.tick(460, 0.015);
      }
    };
    btn.addEventListener('click', fn);
    cleanups.push(() => btn.removeEventListener('click', fn));
  });

  toolBtns.forEach((btn) => {
    const fn = () => {
      const e = ensureMounted();
      const tool = btn.dataset.cadTool as BlueprintTool;
      if (e && tool) {
        e.setTool(tool);
        toolBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        studioAudio.tick(520, 0.012);
      }
    };
    btn.addEventListener('click', fn);
    cleanups.push(() => btn.removeEventListener('click', fn));
  });

  themeBtns.forEach((btn) => {
    const fn = () => {
      const e = ensureMounted();
      const theme = btn.dataset.cadTheme as BlueprintThemeId;
      if (e && theme) {
        e.setTheme(theme);
        themeBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        studioAudio.tick(540, 0.012);
      }
    };
    btn.addEventListener('click', fn);
    cleanups.push(() => btn.removeEventListener('click', fn));
  });

  zoomBtns.forEach((btn) => {
    const fn = () => {
      const e = ensureMounted();
      const action = btn.dataset.cadZoom;
      if (!e) return;
      if (action === 'in') e.zoomIn(1.25);
      else if (action === 'out') e.zoomOut(1.25);
      else e.fitToViewport(false);
    };
    btn.addEventListener('click', fn);
    cleanups.push(() => btn.removeEventListener('click', fn));
  });

  if (exportBtn) {
    const fn = () => {
      ensureMounted()?.downloadSVG();
      studioAudio.tick(620, 0.02);
    };
    exportBtn.addEventListener('click', fn);
    cleanups.push(() => exportBtn.removeEventListener('click', fn));
  }

  return () => {
    disposed = true;
    io.disconnect();
    cleanups.forEach((f) => f());
    engine?.detachCanvas();
    engine = null;
  };
}

/**
 * Act 6A: OTTO-Style 120svh Difference Material Selector Stage.
 */
function initAtelierCloseStage(): (() => void) | void {
  const root = document.querySelector<HTMLElement>('[data-atelier-close]');
  if (!root) return;

  const btns = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-close-mat]'));
  const plates = Array.from(root.querySelectorAll<HTMLImageElement>('[data-close-plate]'));
  const activeLabel = root.querySelector<HTMLElement>('[data-close-active-label]');
  const cleanups: Array<() => void> = [];

  btns.forEach((btn, idx) => {
    const fn = () => {
      btns.forEach((b, i) => {
        const on = i === idx;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      plates.forEach((img, i) => img.classList.toggle('is-active', i === idx));
      if (activeLabel && btn.dataset.closeMat) activeLabel.textContent = btn.dataset.closeMat;
      studioAudio.tick(450 + idx * 45, 0.015);
    };
    btn.addEventListener('click', fn);
    cleanups.push(() => btn.removeEventListener('click', fn));
  });

  return () => cleanups.forEach((f) => f());
}

/**
 * Master initializer for homepage custom Otto Objects Hero + Multi-Benchmark Choreography.
 */
export function initHomeVisualChoreography(): (() => void) | void {
  const cleanHeroGL = initOttoHeroGL();
  const cleanOttoStory = initOttoHeaderAndStory();
  const cleanOttoForms = initOttoFormsPin();
  const cleanOttoGallery = initOttoGalleryPin();
  const cleanWorksToggle = initWorksViewToggle();
  const cleanCadSheet = initHomeBlueprintSheet();
  const cleanOttoCard = initOttoCard();
  const cleanMega = initMegaHeader();
  const cleanTelha = initTelhaWorks();
  const cleanCorto = initCortoMatrix();
  const cleanOttoCollection = initOttoCollection();
  const cleanAnuc = initAnucGrid();
  const cleanDhk = initDhkManifesto();
  const cleanAtelierClose = initAtelierCloseStage();

  return () => {
    cleanAtelierClose?.();
    cleanDhk?.();
    cleanAnuc?.();
    cleanOttoCollection?.();
    cleanCorto?.();
    cleanTelha?.();
    cleanMega?.();
    cleanOttoCard?.();
    cleanCadSheet?.();
    cleanWorksToggle?.();
    cleanOttoGallery?.();
    cleanOttoForms?.();
    cleanOttoStory?.();
    cleanHeroGL?.();
  };
}
