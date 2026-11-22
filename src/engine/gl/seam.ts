import { Mesh, Plane, Program, Vec2 } from 'ogl';
import { getGLContext, getGLDusk, registerGLHook } from './index';
import { prefersReducedMotion, isTouch, isMobile } from '../env';
import { scrollState } from '../scroll';

const SEAM_VERT = /* glsl */ `
attribute vec3 position;
attribute vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SEAM_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uProgress;
uniform float uDusk;
uniform vec2 uResolution;

vec2 gradHash(vec2 x) {
  vec2 k = vec2(0.3183099, 0.3678794);
  x = x * k + k.yx;
  return -1.0 + 2.0 * fract(16.0 * k * fract(x.x * x.y * (x.x + x.y)));
}
float gradNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(gradHash(i), f), dot(gradHash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(gradHash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(gradHash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  if (uProgress <= 0.005 || uProgress >= 0.995) discard;
  float ridge = gradNoise(vec2(vUv.x * 5.5, uProgress * 2.2)) * 0.14;
  float frontier = 1.0 - uProgress;
  float d = vUv.y - (frontier + ridge * sin(uProgress * 3.14159265));

  vec3 topCol = vec3(0.02, 0.02, 0.02); // Hero Obsidian #050505
  vec3 plaster = mix(vec3(0.937, 0.925, 0.902), vec3(0.086, 0.082, 0.075), uDusk); // #EFECE6 / #161513
  vec3 bronze = vec3(0.655, 0.486, 0.302); // #A77C4D

  float blend = smoothstep(-0.22, 0.22, d);
  vec3 col = mix(plaster, topCol, blend);

  float rim = exp(-abs(d) * 18.0) * sin(uProgress * 3.14159265);
  col = mix(col, bronze, clamp(rim * 0.65, 0.0, 0.65));

  float edgeFade = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
  float alpha = edgeFade * sin(uProgress * 3.14159265) * 0.92;
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

let seamMesh: Mesh | null = null;
let seamProgram: Program | null = null;
let seamGeom: Plane | null = null;
let unhook: (() => void) | null = null;
let ro: ResizeObserver | null = null;
let onResize: (() => void) | null = null;

export function mountSeam(root: ParentNode = document) {
  unmountSeam();
  if (prefersReducedMotion() || isTouch() || isMobile()) return;

  const el = root.querySelector<HTMLElement>('[data-gl-seam]');
  if (!el) return;

  const ctx = getGLContext(true);
  if (!ctx) return;

  const SEAM_H = 140;
  let docTop = el.getBoundingClientRect().top + scrollState().y;

  const measure = () => {
    docTop = el.getBoundingClientRect().top + scrollState().y;
  };

  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(measure);
    ro.observe(document.body);
  }
  onResize = measure;
  addEventListener('resize', onResize, { passive: true });

  seamGeom = new Plane(ctx.gl, { widthSegments: 24, heightSegments: 4 });
  seamProgram = new Program(ctx.gl, {
    vertex: SEAM_VERT,
    fragment: SEAM_FRAG,
    uniforms: {
      uProgress: { value: 0 },
      uDusk: { value: getGLDusk() },
      uResolution: { value: new Vec2(innerWidth, innerHeight) },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  seamMesh = new Mesh(ctx.gl, { geometry: seamGeom, program: seamProgram });
  seamMesh.position.z = 0.05;
  seamMesh.setParent(ctx.scene);

  unhook = registerGLHook((_t, vw, vh) => {
    if (!seamMesh || !seamProgram) return false;
    const screenY = docTop - scrollState().y;
    const progress = Math.min(1, Math.max(0, 1 - (screenY - vh * 0.14) / (vh * 0.72)));

    if (progress <= 0.005 || progress >= 0.995 || screenY < -SEAM_H || screenY > vh + SEAM_H) {
      seamMesh.visible = false;
      return false;
    }

    seamMesh.visible = true;
    seamMesh.position.x = 0;
    seamMesh.position.y = vh / 2 - screenY;
    seamMesh.scale.set(vw, SEAM_H, 1);
    seamProgram.uniforms.uProgress.value = progress;
    seamProgram.uniforms.uDusk.value = getGLDusk();
    seamProgram.uniforms.uResolution.value.set(vw, vh);
    return true;
  });
}

export function unmountSeam() {
  unhook?.();
  unhook = null;
  ro?.disconnect();
  ro = null;
  if (onResize) {
    removeEventListener('resize', onResize);
    onResize = null;
  }
  const ctx = getGLContext(false);
  if (ctx && seamMesh?.parent) ctx.scene.removeChild(seamMesh);
  seamProgram?.remove?.();
  seamGeom?.remove?.();
  seamMesh = null;
  seamProgram = null;
  seamGeom = null;
}
