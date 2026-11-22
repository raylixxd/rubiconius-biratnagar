import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type LivingAtmosphere = {
  update: (timeSec: number) => void;
  attachToLoadedScene: (root: THREE.Object3D) => void;
  dispose: () => void;
};

const LEAF_SHADOW_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Feathered NormalBlending dappled botanical leaf shadow shader:
// Zero quad boundary edge (feathers to alpha 0.000 well before edges) & zero MultiplyBlending console warnings!
const LEAF_SHADOW_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = rot * p * 2.04;
    a *= 0.5;
  }
  return v;
}

void main() {
  // Wide elliptical feather reaches 0.0 well inside the UV quad -> zero harsh plane seam ever!
  vec2 c = (vUv - 0.5) * 2.0;
  float radial = smoothstep(0.92, 0.18, length(c));
  if (radial <= 0.001) discard;

  float swayX = sin(uTime * 0.42 + vUv.y * 3.1) * 0.10 + cos(uTime * 0.23) * 0.04;
  float swayY = cos(uTime * 0.36 + vUv.x * 2.7) * 0.08;

  vec2 p = vec2(vUv.x * 4.8 + vUv.y * 2.2 + swayX, vUv.y * 7.2 - vUv.x * 1.3 + swayY);
  float c1 = fbm(p);
  float c2 = fbm(p * 1.8 + vec2(-uTime * 0.05, uTime * 0.035));
  float fronds = smoothstep(0.42, 0.76, c1 * 0.62 + c2 * 0.46);

  float alpha = fronds * radial * 0.16;
  gl_FragColor = vec4(0.14, 0.12, 0.10, alpha);
}
`;

const DUST_VERT = /* glsl */ `
attribute float aScale;
attribute float aPhase;
uniform float uTime;
uniform float uDpr;
varying float vAlpha;

void main() {
  vec3 pos = position;
  pos.x += sin(uTime * 0.26 + aPhase) * 0.16;
  pos.y += cos(uTime * 0.20 + aPhase * 1.3) * 0.10;
  pos.z += sin(uTime * 0.18 + aPhase * 0.7) * 0.14;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float dist = max(1.0, -mv.z);
  gl_PointSize = clamp((aScale * 14.0 * uDpr) / dist, 1.5, 7.0);
  vAlpha = smoothstep(10.0, 2.2, dist) * (0.22 + 0.14 * sin(uTime * 0.85 + aPhase));
  gl_Position = projectionMatrix * mv;
}
`;

const DUST_FRAG = /* glsl */ `
precision mediump float;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float soft = smoothstep(0.5, 0.1, d);
  gl_FragColor = vec4(1.0, 0.94, 0.83, soft * vAlpha);
}
`;

const WATER_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

// Translucent Architectural Reflecting Basin Shader:
// Reveals the dark wet basalt pool bed & submerged paver plinths underneath while reflecting golden sky & ripples
const WATER_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec3 vWorldPos;
uniform float uTime;

float waveHeight(vec2 p, float t) {
  float w = 0.0;
  w += sin(p.x * 2.1 + t * 0.9 + cos(p.y * 1.5 - t * 0.5)) * 0.45;
  w += cos(p.y * 2.8 - t * 0.75 + sin(p.x * 1.9 + t * 0.6)) * 0.35;
  w += sin((p.x + p.y) * 4.2 + t * 1.2) * 0.20;
  return w;
}

void main() {
  vec2 p = vUv * 10.0;
  float eps = 0.06;
  float h0 = waveHeight(p, uTime);
  float hx = waveHeight(p + vec2(eps, 0.0), uTime);
  float hy = waveHeight(p + vec2(0.0, eps), uTime);
  vec3 N = normalize(vec3((h0 - hx) * 0.18, 1.0, (h0 - hy) * 0.18));

  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndotv = clamp(dot(N, V), 0.0, 1.0);
  // Physical Schlick Fresnel: glancing angles reflect luminous sky, downward views stay translucent to dark basalt bed
  float fresnel = 0.08 + 0.88 * pow(1.0 - ndotv, 3.2);

  // Reflected morning sky gradient + subtle vertical architectural fin reflection
  vec3 R = reflect(-V, N);
  vec3 skyHorizon = vec3(0.92, 0.87, 0.77);
  vec3 skyZenith  = vec3(0.68, 0.75, 0.79);
  vec3 refl = mix(skyHorizon, skyZenith, clamp(R.y * 1.4, 0.0, 1.0));
  float finRefl = 0.90 + 0.10 * sin(vWorldPos.x * 14.0 + N.x * 8.0);
  refl *= finRefl;

  // Sun specular sparkle on micro-ripples
  vec3 sunDir = normalize(vec3(0.45, 0.65, -0.60));
  vec3 H = normalize(sunDir + V);
  float spec = pow(max(0.0, dot(N, H)), 96.0) * 0.55;

  // Delicate underwater caustic web
  float caustic = smoothstep(0.55, 0.95, abs(h0)) * 0.12;
  vec3 deepWater = vec3(0.04, 0.085, 0.078) + vec3(0.85, 0.80, 0.68) * caustic;

  vec3 col = mix(deepWater, refl, fresnel) + vec3(1.0, 0.95, 0.84) * spec;
  float alpha = clamp(0.42 + fresnel * 0.44, 0.42, 0.84);
  gl_FragColor = vec4(col, alpha);
}
`;

export function createLivingAtmosphere(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer
): LivingAtmosphere {
  const disposables: Array<() => void> = [];

  // 1. Live PMREM Studio Environment Map for metallic brass, bronze & Poly Haven PBR props
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.78;
  pmrem.dispose();

  // Warm balanced architectural lighting for live PBR props (mid_century_lounge_chair, potted plants, vases)
  const hemi = new THREE.HemisphereLight(0xfff4e2, 0x3b352c, 0.95);
  const key = new THREE.DirectionalLight(0xffe9c6, 1.55);
  key.position.set(6, 9, 3);
  const fill = new THREE.DirectionalLight(0xdce6ee, 0.45);
  fill.position.set(-5, 4, -4);
  scene.add(hemi, key, fill);
  disposables.push(() => {
    scene.remove(hemi, key, fill);
    scene.environment = null;
    envTex.dispose();
  });

  // 2. Feathered Swaying Botanical Leaf Shadow Patches (NormalBlending -> zero seams, zero console errors)
  const leafUniforms = { uTime: { value: 0 } };
  const leafMat = new THREE.ShaderMaterial({
    vertexShader: LEAF_SHADOW_VERT,
    fragmentShader: LEAF_SHADOW_FRAG,
    uniforms: leafUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const shadowPatches: Array<{ pos: [number, number, number]; size: [number, number] }> = [
    { pos: [1.3, 0.008, 4.9], size: [4.6, 3.8] },
    { pos: [0.0, 0.008, -5.6], size: [4.6, 3.8] },
  ];

  const shadowMeshes: THREE.Mesh[] = [];
  for (const patch of shadowPatches) {
    const geo = new THREE.PlaneGeometry(patch.size[0], patch.size[1]);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, leafMat);
    mesh.position.set(...patch.pos);
    mesh.renderOrder = 2;
    scene.add(mesh);
    shadowMeshes.push(mesh);
  }
  disposables.push(() => {
    for (const m of shadowMeshes) {
      scene.remove(m);
      m.geometry.dispose();
    }
    leafMat.dispose();
  });

  // 3. Whisper-Soft Floating Golden Sunlight Dust Motes
  const count = 140;
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const inSkylight = i >= count / 2;
    if (inSkylight) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 3.2;
      positions[i * 3 + 1] = 0.5 + Math.random() * 3.2;
      positions[i * 3 + 2] = -5.7 + (Math.random() - 0.5) * 3.0;
    } else {
      positions[i * 3 + 0] = -1.0 + Math.random() * 4.4;
      positions[i * 3 + 1] = 0.5 + Math.random() * 3.0;
      positions[i * 3 + 2] = 5.4 + (Math.random() - 0.5) * 4.0;
    }
    scales[i] = 0.5 + Math.random() * 1.05;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  dustGeo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  dustGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const dustUniforms = {
    uTime: { value: 0 },
    uDpr: { value: renderer.getPixelRatio() },
  };
  const dustMat = new THREE.ShaderMaterial({
    vertexShader: DUST_VERT,
    fragmentShader: DUST_FRAG,
    uniforms: dustUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dustPts = new THREE.Points(dustGeo, dustMat);
  dustPts.frustumCulled = false;
  scene.add(dustPts);
  disposables.push(() => {
    scene.remove(dustPts);
    dustGeo.dispose();
    dustMat.dispose();
  });

  // 4. Translucent Shimmering Courtyard Water + Subtle Pendant Sway
  const waterUniforms = { uTime: { value: 0 } };
  let waterMat: THREE.ShaderMaterial | null = null;
  const pendants: Array<{ obj: THREE.Object3D; baseRotZ: number; phase: number }> = [];

  const attachToLoadedScene = (root: THREE.Object3D) => {
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && /Courtyard_WaterPlane/i.test(obj.name)) {
        waterMat = new THREE.ShaderMaterial({
          vertexShader: WATER_VERT,
          fragmentShader: WATER_FRAG,
          uniforms: waterUniforms,
          transparent: true,
          depthWrite: false,
        });
        (obj as THREE.Mesh).material = waterMat;
        (obj as THREE.Mesh).renderOrder = 3;
      }
      if (/ST02_PendShade_/i.test(obj.name)) {
        pendants.push({
          obj,
          baseRotZ: obj.rotation.z,
          phase: pendants.length * 1.35,
        });
      }
    });
  };

  disposables.push(() => {
    waterMat?.dispose();
    pendants.length = 0;
  });

  return {
    attachToLoadedScene,
    update: (timeSec: number) => {
      leafUniforms.uTime.value = timeSec;
      dustUniforms.uTime.value = timeSec;
      waterUniforms.uTime.value = timeSec;
      for (const p of pendants) {
        p.obj.rotation.z = p.baseRotZ + Math.sin(timeSec * 0.72 + p.phase) * 0.007;
      }
    },
    dispose: () => {
      while (disposables.length) {
        disposables.pop()?.();
      }
    },
  };
}
