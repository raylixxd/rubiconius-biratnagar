export function getTierPrefix(tier: 'high' | 'medium' | 'low'): string {
  return [
    tier === 'high' ? '#define TIER_HIGH' : '',
    tier === 'medium' ? '#define TIER_MEDIUM' : '',
    tier === 'low' ? '#define TIER_LOW' : '',
  ]
    .filter(Boolean)
    .join('\n') + '\n';
}

export const proceduralVertex = /* glsl */ `
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
  float vel = clamp(uVelocity, -0.42, 0.42);
  float bend = sin(uv.x * 3.14159265);
  p.y += bend * vel * 0.045;
  p.z += bend * (uHover * 0.035 + abs(vel) * 0.025);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const proceduralFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uPlaneSizes;
uniform float uTime;
uniform float uRevealProgress;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform float uSeed;

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
void main() {
  if (uRevealProgress <= 0.001) discard;
  vec2 uv = vUv;
  vec2 p = uv * vec2(uPlaneSizes.x / max(1.0, uPlaneSizes.y), 1.0) * 1.8 + uSeed * 7.0;
  float t = uTime * 0.04;
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  float f = fbm(p + 2.2 * q);
  vec3 col = mix(uC1, uC2, smoothstep(0.2, 0.8, f));
  col = mix(col, uC3, smoothstep(0.55, 0.95, f));
  col += (hash(uv * uPlaneSizes + fract(uTime)) - 0.5) * 0.02;
  float alpha = clamp(uRevealProgress, 0.0, 1.0);
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

export const plateVert = /* glsl */ `
attribute vec3 position;
attribute vec2 uv;
attribute vec3 normal;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

uniform float uVelocity;
uniform float uHover;
uniform float uExpandProgress;
uniform vec3 uCameraPos;

varying vec2 vUv;
varying vec3 vNormal;

#ifdef TIER_MEDIUM
varying float vFresnel;
#endif

void main() {
  vUv = uv;
  vec3 p = position;
  float flatten = 1.0 - clamp(uExpandProgress, 0.0, 1.0);
  float vel = clamp(uVelocity, -0.42, 0.42);
  if (abs(vel) < 0.001) vel = 0.0;

  // Vertical inertia curvature & subtle shear on scroll
  float bend = sin(uv.y * 3.14159265);
  p.z += bend * abs(vel) * 0.035 * flatten;
  p.y += bend * vel * 0.045 * flatten;

  // Perturb normal along curvature so grazing sheen tracks scroll & hover cleanly
  float tilt = cos(uv.y * 3.14159265) * 0.38 * abs(vel) * flatten;
  vec3 curvedNormal = normalize(normal + vec3(0.0, -tilt, 0.0));
  vNormal = normalize(normalMatrix * curvedNormal);

  #ifdef TIER_MEDIUM
  vec3 localView = normalize(vec3((0.5 - uv.x) * 0.48 + uCameraPos.x * 0.02, (0.5 - uv.y) * 0.48 + uCameraPos.y * 0.02, 1.0));
  float f = dot(localView, vNormal);
  vFresnel = smoothstep(0.0, 1.0, 1.0 - max(0.0, f));
  #endif

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const plateFrag = /* glsl */ `
precision highp float;

uniform sampler2D tMap;
uniform vec2 uPlaneSizes;
uniform vec2 uImageSizes;
uniform vec4 uCropRect;

uniform float uScrollProgress;
uniform float uVelocity;
uniform float uHover;
uniform float uExpandProgress;
uniform float uFluteStrength;
uniform float uRevealProgress;
uniform float uDusk;
uniform vec3 uBronzeTint;
uniform vec3 uCameraPos;

varying vec2 vUv;
varying vec3 vNormal;

#ifdef TIER_MEDIUM
varying float vFresnel;
#endif

// Compact MIT 2D gradient noise (Inigo Quilez / Ashima style, mediump-safe, zero #extension)
vec2 gradHash(vec2 x) {
  vec2 k = vec2(0.3183099, 0.3678794);
  x = x * k + k.yx;
  return -1.0 + 2.0 * fract(16.0 * k * fract(x.x * x.y * (x.x + x.y)));
}
float gradNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(gradHash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
        dot(gradHash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(gradHash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
        dot(gradHash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// Apache-2.0 Khronos PBR Neutral Tone Mapping
vec3 PBRNeutralToneMapping(vec3 color) {
  const float startCompression = 0.76;
  const float desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b));
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < startCompression) return color;
  const float d = 1.0 - startCompression;
  float newPeak = 1.0 - d * d / (peak + d - startCompression);
  color *= newPeak / peak;
  float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
  return mix(color, vec3(newPeak), g);
}

vec2 coverAspect(vec2 uv, vec2 plane, vec2 image) {
  float safePy = max(1.0, plane.y);
  float safeIy = max(1.0, image.y);
  float pRatio = max(0.001, plane.x / safePy);
  float iRatio = max(0.001, image.x / safeIy);
  vec2 r = vec2(min(pRatio / iRatio, 1.0), min(iRatio / pRatio, 1.0));
  return uv * r + (1.0 - r) * 0.5;
}

void main() {
  if (uRevealProgress <= 0.001) discard;

  vec2 uv = vUv;
  float flatten = 1.0 - clamp(uExpandProgress, 0.0, 1.0);
  float vel = clamp(uVelocity, -0.42, 0.42);

  // Restrained fluted-glass optical refraction near vertical plate edges
  float edgeMask = pow(abs(uv.x - 0.5) * 2.0, 2.2) * sin(uv.x * 28.0) * vel * uFluteStrength * flatten;
  uv.x += edgeMask;

  // Optical breathing zoom + hover micro-zoom (flattens when expanded)
  vec2 center = uv - 0.5;
  float zoom = mix(1.04, 1.0, clamp(uScrollProgress, 0.0, 1.0)) - uHover * 0.03 * flatten;
  zoom = mix(zoom, 1.0, clamp(uExpandProgress, 0.0, 1.0));
  uv = 0.5 + center * zoom;

  // Aspect-locked cover + Retina-safe crop interpolation (detail crop -> full frame on expand)
  vec2 coverUv = coverAspect(uv, uPlaneSizes, uImageSizes);
  vec4 activeCrop = mix(uCropRect, vec4(0.0, 0.0, 1.0, 1.0), clamp(uExpandProgress, 0.0, 1.0));
  vec2 sampleUv = clamp(activeCrop.xy + coverUv * activeCrop.zw, vec2(0.001), vec2(0.999));

  vec4 tex = texture2D(tMap, sampleUv);
  vec3 col = tex.rgb;

  // Low-amplitude noise micro-variation + Tier-aware Bronze grazing sheen (never amplifies WebP blocks)
  float fresnel = 0.0;
  float micro = 0.0;
  #ifdef TIER_HIGH
  vec3 localView = normalize(vec3((0.5 - vUv.x) * 0.48 + uCameraPos.x * 0.02, (0.5 - vUv.y) * 0.48 + uCameraPos.y * 0.02, 1.0));
  float f = dot(localView, normalize(vNormal));
  fresnel = smoothstep(0.0, 1.0, 1.0 - max(0.0, f));
  micro = gradNoise(vUv * 4.5 + vec2(uScrollProgress * 1.4, 0.0)) * 0.035;
  #elif defined(TIER_MEDIUM)
  fresnel = vFresnel;
  micro = gradNoise(vUv * 3.0) * 0.025;
  #endif

  float sheen = pow(clamp(fresnel + uHover * 0.14 + micro, 0.0, 1.0), 2.2) * (0.18 + uHover * 0.16) * flatten;
  col = mix(col, uBronzeTint, sheen);

  // Warm 2700K architectural Dusk curve + Khronos PBR Neutral color science
  vec3 duskGrade = col * vec3(1.06, 0.93, 0.80) * 0.84;
  col = mix(col, duskGrade, clamp(uDusk, 0.0, 1.0));
  col = PBRNeutralToneMapping(col);

  // Interleaved gradient film grain (Jimenez)
  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) * 0.015;
  col = clamp(col + grain, 0.0, 1.0);

  // Anamorphic vertical aperture reveal mask with bronze rim
  float alpha = tex.a;
  if (uRevealProgress < 0.999) {
    float n = gradNoise(vec2(vUv.x * 7.0, vUv.y * 3.0)) * 0.035 * (1.0 - uRevealProgress);
    float halfOpen = uRevealProgress * 0.56;
    float dist = abs(vUv.y - 0.5) + n;
    float mask = 1.0 - smoothstep(halfOpen - 0.04, halfOpen, dist);
    float rim = smoothstep(halfOpen - 0.055, halfOpen - 0.015, dist) * (1.0 - smoothstep(halfOpen - 0.015, halfOpen + 0.015, dist));
    col += uBronzeTint * rim * sin(uRevealProgress * 3.14159265) * 0.55;
    alpha *= mask;
  }

  gl_FragColor = vec4(col * alpha, alpha);
}
`;
