import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { ShowroomAsset, ShowroomWaypoint } from '../../data/site';
import { isMobile } from '../env';

export type LoadedAsset = {
  object3D: THREE.Object3D;
  toneMapping: THREE.ToneMapping;
  extractedWaypoints?: ShowroomWaypoint[];
  dispose: () => void;
};

type LoadOptions = {
  asset: ShowroomAsset;
  waypoints: ShowroomWaypoint[];
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  onProgress?: (fraction: number, label: string) => void;
};

function disposeObjectTree(root: THREE.Object3D) {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        for (const key of Object.keys(m)) {
          const val = (m as unknown as Record<string, unknown>)[key];
          if (val && typeof val === 'object' && 'isTexture' in val) {
            (val as THREE.Texture).dispose();
          }
        }
        m.dispose();
      }
    }
  });
}

function resolveToneMapping(mode: 'aces' | 'none'): THREE.ToneMapping {
  return mode === 'aces' ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
}

function attachVideoWall(root: THREE.Object3D): () => void {
  let targetMesh: THREE.Mesh | null = null;
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && /VideoWall_Vault/i.test(obj.name)) {
      targetMesh = obj as THREE.Mesh;
    }
  });
  if (!targetMesh) return () => {};

  const video = document.createElement('video');
  video.src = '/videos/studio-vault.mp4';
  video.crossOrigin = 'anonymous';
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;

  const onCanPlay = () => {
    video.play().catch(() => {});
  };
  video.addEventListener('canplay', onCanPlay);

  const tex = new THREE.VideoTexture(video);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;

  const prevMat = (targetMesh as THREE.Mesh).material;
  const videoMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  (targetMesh as THREE.Mesh).material = videoMat;
  video.play().catch(() => {});

  return () => {
    video.removeEventListener('canplay', onCanPlay);
    video.pause();
    video.removeAttribute('src');
    video.load();
    tex.dispose();
    videoMat.dispose();
    if (prevMat) {
      const arr = Array.isArray(prevMat) ? prevMat : [prevMat];
      arr.forEach((m) => m.dispose());
    }
  };
}

function extractWaypointsFromScene(
  sceneRoot: THREE.Object3D,
  fallbackWaypoints: ShowroomWaypoint[]
): ShowroomWaypoint[] {
  const camMap = new Map<number, [number, number, number]>();
  const tgtMap = new Map<number, [number, number, number]>();
  const pinMap = new Map<string, [number, number, number]>();
  const tmp = new THREE.Vector3();

  sceneRoot.updateMatrixWorld(true);
  sceneRoot.traverse((obj) => {
    const mCam = obj.name.match(/^CamPoint_(\d+)$/i);
    if (mCam) {
      obj.getWorldPosition(tmp);
      camMap.set(parseInt(mCam[1], 10), [tmp.x, tmp.y, tmp.z]);
    }
    const mTgt = obj.name.match(/^CamTarget_(\d+)$/i);
    if (mTgt) {
      obj.getWorldPosition(tmp);
      tgtMap.set(parseInt(mTgt[1], 10), [tmp.x, tmp.y, tmp.z]);
    }
    if (/^Hotspot_/i.test(obj.name)) {
      obj.getWorldPosition(tmp);
      pinMap.set(obj.name.toLowerCase(), [tmp.x, tmp.y, tmp.z]);
    }
  });

  const slugToEmpty: Record<string, string> = {
    'fluted-suite': 'hotspot_flutedsuite',
    'timber-hearth': 'hotspot_timberhearth',
    'courtyard-hall': 'hotspot_courtyardhall',
  };

  return fallbackWaypoints.map((wp, idx) => {
    const cam = camMap.get(idx) ?? wp.cam;
    const target = tgtMap.get(idx) ?? wp.target;
    let pin = wp.pin;
    if (pin) {
      const emptyKey = slugToEmpty[pin.studySlug];
      const extractedAnchor = emptyKey ? pinMap.get(emptyKey) : undefined;
      if (extractedAnchor) {
        pin = { ...pin, anchor: extractedAnchor };
      }
    }
    return { ...wp, cam, target, pin };
  });
}

async function loadGlbAsset(opts: LoadOptions & { asset: Extract<ShowroomAsset, { type: 'glb' }> }): Promise<LoadedAsset> {
  const { asset, waypoints, scene, onProgress } = opts;

  const draco = new DRACOLoader();
  draco.setDecoderPath('/draco/');

  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);

  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  const chosenSrc = (isMobile() || saveData) && asset.mobileSrc ? asset.mobileSrc : asset.src;

  let extractedWaypoints = waypoints;

  if (asset.railFrom === 'empties' && asset.cameraPathsSrc) {
    onProgress?.(0.15, 'Loading camera rail');
    try {
      const camGltf = await loader.loadAsync(asset.cameraPathsSrc);
      extractedWaypoints = extractWaypointsFromScene(camGltf.scene, waypoints);
      disposeObjectTree(camGltf.scene);
    } catch {
      // Fallback cleanly to configured waypoints in site.ts
    }
  }

  onProgress?.(0.3, 'Streaming architectural scene');
  const gltf = await loader.loadAsync(chosenSrc, (ev) => {
    if (ev.total > 0) {
      const frac = 0.3 + Math.min(0.65, (ev.loaded / ev.total) * 0.65);
      onProgress?.(frac, 'Streaming architectural scene');
    }
  });

  const root = gltf.scene;
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh && mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if ('map' in m && m.map) {
          (m.map as THREE.Texture).colorSpace = THREE.SRGBColorSpace;
          (m.map as THREE.Texture).anisotropy = Math.min(8, opts.renderer.capabilities.getMaxAnisotropy());
        }
        if ('fog' in m) {
          (m as THREE.MeshBasicMaterial).fog = true;
        }
      }
    }
  });

  const disposeVideo = attachVideoWall(root);
  scene.add(root);
  onProgress?.(1, 'Scene ready');

  return {
    object3D: root,
    toneMapping: resolveToneMapping(asset.toneMapping),
    extractedWaypoints,
    dispose: () => {
      disposeVideo();
      scene.remove(root);
      disposeObjectTree(root);
      draco.dispose();
    },
  };
}

async function loadSplatAsset(opts: LoadOptions & { asset: Extract<ShowroomAsset, { type: 'splat' }> }): Promise<LoadedAsset> {
  const { asset, scene, renderer, onProgress } = opts;
  onProgress?.(0.2, 'Initializing Gaussian Splat engine');

  // Lazy-loaded so GLB builds pay zero Spark bundle cost on initial load
  const { SparkRenderer, SplatMesh, SplatFileType } = await import('@sparkjsdev/spark');

  const spark = new SparkRenderer({ renderer });
  scene.add(spark);

  onProgress?.(0.45, 'Streaming 3D Gaussian Splat');
  const fileType = asset.format === 'ply' ? SplatFileType.PLY : SplatFileType.SPZ;
  const splat = new SplatMesh({
    url: asset.src,
    fileType,
  });

  if (asset.transform?.position) {
    splat.position.set(...asset.transform.position);
  }
  if (asset.transform?.rotation) {
    splat.rotation.set(...asset.transform.rotation);
  }
  if (typeof asset.transform?.scale === 'number') {
    splat.scale.setScalar(asset.transform.scale);
  }

  scene.add(splat);
  await splat.initialized;
  onProgress?.(1, 'Splat ready');

  return {
    object3D: splat,
    toneMapping: resolveToneMapping(asset.toneMapping),
    dispose: () => {
      scene.remove(splat);
      scene.remove(spark);
      splat.dispose();
      if (typeof (spark as unknown as { dispose?: () => void }).dispose === 'function') {
        (spark as unknown as { dispose: () => void }).dispose();
      }
    },
  };
}

export async function loadShowroomAsset(opts: LoadOptions): Promise<LoadedAsset> {
  if (opts.asset.type === 'splat') {
    return loadSplatAsset({ ...opts, asset: opts.asset });
  }
  return loadGlbAsset({ ...opts, asset: opts.asset });
}
