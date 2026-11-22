export const vertex = /* glsl */ `
attribute vec3 position;
attribute vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uVelocity;
uniform float uHover;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  float vel = clamp(uVelocity, -1.25, 1.25);
  float bend = sin(uv.x * 3.14159265);
  p.y += bend * vel * 0.085;
  p.z += bend * (uHover * 0.05 + abs(vel) * 0.025);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const common = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uPlane;
uniform float uTime;
uniform float uHover;
uniform float uVelocity;
uniform float uReveal;
uniform vec2 uMouse;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}
float revealMask(vec2 uv) {
  float edge = uReveal * 1.24 - 0.12 + (noise(uv * vec2(6.0, 2.0) + uTime * 0.16) - 0.5) * 0.1;
  return smoothstep(edge, edge - 0.07, uv.y);
}`;

// Optical architectural daylight plate with filmic gallery curves, chromatic split & hover relief
export const imageFragment = /* glsl */ `
${common}
uniform sampler2D tMap;
uniform vec2 uImage;
vec2 cover(vec2 uv) {
  vec2 r = vec2(min((uPlane.x / uPlane.y) / (uImage.x / uImage.y), 1.0), min((uPlane.y / uPlane.x) / (uImage.y / uImage.x), 1.0));
  return uv * r + (1.0 - r) * 0.5;
}
void main() {
  vec2 uv = vUv;
  vec2 c = uv - 0.5;
  uv = 0.5 + c * (1.0 - uHover * 0.05);
  float liq = (fbm(uv * 3.2 + uTime * 0.22) - 0.5) * (0.022 * uHover + min(0.016, abs(uVelocity) * 0.007));
  uv += liq;
  vec2 dir = (uv - uMouse) * uHover;
  uv += dir * 0.028 * smoothstep(0.55, 0.0, length(vUv - uMouse));
  float shift = min(0.014, abs(uVelocity) * 0.0045 + uHover * 0.003);
  vec2 t = cover(uv);
  float r = texture2D(tMap, t + vec2(shift, 0.0)).r;
  float g = texture2D(tMap, t).g;
  float b = texture2D(tMap, t - vec2(shift, 0.0)).b;
  vec3 col = vec3(r, g, b);
  // Subtle filmic gallery S-curve + warm architectural limestone harmony
  col = mix(col, col * col * (3.0 - 2.0 * col), 0.22);
  col += (hash(vUv * uPlane + fract(uTime)) - 0.5) * 0.018;
  gl_FragColor = vec4(col, 1.0) * revealMask(vUv);
}`;

export const proceduralFragment = /* glsl */ `
${common}
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform float uSeed;
void main() {
  vec2 uv = vUv;
  vec2 p = uv * vec2(uPlane.x / uPlane.y, 1.0) * 1.8 + uSeed * 7.0;
  float t = uTime * 0.04;
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  float f = fbm(p + 2.2 * q);
  vec3 col = mix(uC1, uC2, smoothstep(0.2, 0.8, f));
  col = mix(col, uC3, smoothstep(0.55, 0.95, f));
  col += (hash(uv * uPlane + fract(uTime)) - 0.5) * 0.03;
  gl_FragColor = vec4(col, 1.0) * revealMask(vUv);
}`;
