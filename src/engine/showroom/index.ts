import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { showroom } from '../../data/site';
import { getQualityTier, isTouch, prefersReducedMotion } from '../env';
import { pauseGL, resumeGL } from '../gl';
import { getScrollLimit, onScroll, resizeScroll, scrollState, scrollToTarget } from '../scroll';
import { studioAudio } from '../audio';
import { soundEngine } from '../soundEngine';
import { holdEnter } from '../transition';
import { registerLoaderTask } from '../loader';
import { CameraRail } from './rail';
import { loadShowroomAsset, type LoadedAsset } from './assets';
import { createLivingAtmosphere } from './atmosphere';
import { TactileCamera } from './tactile';
import { SpatialPins } from './pins';
import { MaterialDrawer } from './drawer';
import { ChapterBar } from './chapters';
import { ScrollHint } from './hints';
import { DebugFlyController } from './debug';
import { VolumetricShowroomSystem, type TimeOfDayPreset } from './volumetric';
import { createFluidGround, type FluidGroundHandle } from './fluidGround';
import { CameraSplineController, ARCHITECTURAL_POVS, type ArchitecturalPOV, type ShowroomInteractionMode } from './cameraSpline';
import { createCSMShadows, type CSMShadowController } from './csmShadows';
import { materialAtlas } from './materialAtlas';
import { createCinematicHUD } from './cinematicHUD';

export type ShowroomMode = 'fullscreen' | 'inline';

export type ShowroomHandle = {
  ready: Promise<void>;
  dispose: () => void;
};

declare global {
  interface Window {
    __showroomDebug?: {
      getState: () => {
        mode: ShowroomMode;
        u: number;
        targetU: number;
        cam: [number, number, number];
        fov: number;
        dpr: number;
        ready: boolean;
        visible: boolean;
        debugFly: boolean;
        audio: ReturnType<typeof studioAudio.getDebugState>;
        activePOV?: string;
        interactionMode?: ShowroomInteractionMode;
      };
      jumpTo: (u: number, immediate?: boolean) => void;
      jumpToPOV: (idx: number, immediate?: boolean) => void;
      setTimeOfDay: (preset: TimeOfDayPreset) => void;
      setMode: (mode: ShowroomInteractionMode) => void;
      logWaypoint: () => { cam: number[]; target: number[] } | null;
    };
  }
}

export function mountShowroom(
  root: HTMLElement,
  opts?: { mode?: ShowroomMode }
): ShowroomHandle {
  const mode: ShowroomMode =
    opts?.mode ?? (root.dataset.showroomMode === 'inline' ? 'inline' : 'fullscreen');
  const isInline = mode === 'inline';

  const host = root.querySelector<HTMLElement>('[data-showroom-canvas]');
  const drawerEl = root.querySelector<HTMLElement>('[data-showroom-drawer]');
  const statusEl = root.querySelector<HTMLElement>('[data-showroom-status]');
  const soundBtn = root.querySelector<HTMLButtonElement>('[data-showroom-sound]');

  if (!host || !drawerEl) {
    return { ready: Promise.resolve(), dispose: () => {} };
  }

  const abort = new AbortController();
  const { signal } = abort;
  let disposed = false;
  let isVisible = !isInline;

  if (!isInline) {
    document.documentElement.classList.add('is-showroom');
    pauseGL();
    studioAudio.startAmbient();
  }

  // Sync sound button (present in fullscreen header) with shared studioAudio state
  const syncSoundBtn = (enabled: boolean) => {
    if (!soundBtn) return;
    soundBtn.setAttribute('aria-pressed', String(enabled));
    const lbl = soundBtn.querySelector<HTMLElement>('[data-sound-label]');
    if (lbl) lbl.textContent = enabled ? 'Sound on' : 'Sound off';
  };
  syncSoundBtn(studioAudio.isEnabled());
  const offAudio = studioAudio.onChange(syncSoundBtn);
  soundBtn?.addEventListener(
    'click',
    () => {
      studioAudio.toggle();
    },
    { signal }
  );

  // Scene & direct WebGLRenderer (native MSAA for GLB, disabled for Spark splats for max FPS)
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(showroom.fog.color);
  scene.fog = new THREE.Fog(showroom.fog.color, showroom.fog.near, showroom.fog.far);

  const w = host.clientWidth || window.innerWidth;
  const h = host.clientHeight || window.innerHeight;
  const resolveFov = (width: number, height: number) =>
    width / Math.max(1, height) < 0.85 ? Math.round(showroom.baseFov * 1.24) : showroom.baseFov;
  const camera = new THREE.PerspectiveCamera(resolveFov(w, h), w / h, 0.1, 120);

  const initialDpr = getQualityTier() === 'high' ? Math.min(window.devicePixelRatio || 1, 1.5) : 1.0;
  const renderer = new THREE.WebGLRenderer({
    antialias: showroom.asset.type !== 'splat',
    powerPreference: 'high-performance',
    alpha: false,
  });
  renderer.setPixelRatio(initialDpr);
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping =
    showroom.asset.toneMapping === 'aces' ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;

  const canvas = renderer.domElement;
  canvas.className = 'showroom-webgl';
  host.appendChild(canvas);

  // Sync Lenis limit to this page's track height immediately
  resizeScroll();

  // Living ICG-style Atmosphere & Reverse-Engineered Visual Systems
  const atmosphere = createLivingAtmosphere(scene, renderer);
  const duskState = { v: document.documentElement.dataset.lighting === 'dusk' ? 1 : 0 };
  atmosphere.setDusk(duskState.v);

  // 1. Cascaded Shadow Maps (CSM) System
  const csm = createCSMShadows(
    scene,
    camera,
    {
      cascades: 3,
      maxFar: 45,
      mode: 'practical',
      bias: -0.0001,
      normalBias: 0.02,
    },
    renderer
  );

  // 2. Fluid Ground Plane Reflections & Navier-Stokes GPU Solver
  const fluidGround = createFluidGround({
    size: [32, 32],
    position: [0, -0.015, 0],
    reflectionIntensity: 0.42,
  });
  scene.add(fluidGround.mesh);

  // 3. Volumetric Sunbeams & Dust Motes System
  const volumetric = new VolumetricShowroomSystem({
    dustParticleCount: 384,
  });
  volumetric.attachToScene(scene);

  // Pointer event raycasting for interactive fluid ground perturbation
  const onPointerMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    fluidGround.raycastPointer(ndcX, ndcY, camera);
  };
  canvas.addEventListener('pointermove', onPointerMove, { passive: true, signal });

  // Time-of-Day & Lighting Mode Listener
  window.addEventListener(
    'studio:lighting',
    (e) => {
      const detail = (e as CustomEvent<{ preset?: TimeOfDayPreset; dusk?: boolean }>).detail;
      let preset: TimeOfDayPreset = 'day';
      if (detail?.preset) {
        preset = detail.preset;
      } else if (typeof detail?.dusk === 'boolean') {
        preset = detail.dusk ? 'night' : 'day';
      }
      const dusk = preset === 'night' ? 1.0 : preset === 'golden' ? 0.45 : 0.0;
      volumetric.setTimeOfDay(preset, 0.85);
      fluidGround.setDusk(dusk);
      csm.setDusk(dusk);
      cinematicHUD.setTimeOfDay(preset);
      gsap.to(duskState, {
        v: dusk,
        duration: 0.85,
        ease: 'power2.out',
        overwrite: true,
        onUpdate: () => atmosphere.setDusk(duskState.v),
      });
    },
    { signal }
  );

  // Cached layout metrics (avoids forced reflows on every scroll frame)
  let stageW = host.clientWidth || window.innerWidth;
  let stageH = host.clientHeight || window.innerHeight;
  let cachedTrackTop = 0;
  let cachedScrollable = 1;
  const syncMetrics = () => {
    stageW = host.clientWidth || window.innerWidth;
    stageH = host.clientHeight || window.innerHeight;
    cachedTrackTop = window.scrollY + root.getBoundingClientRect().top;
    cachedScrollable = Math.max(1, root.offsetHeight - window.innerHeight);
  };
  syncMetrics();
  ScrollTrigger.addEventListener('refresh', syncMetrics);

  // Inline scroll coordinate helpers
  const computeInlineU = (scrollY = scrollState().y) =>
    THREE.MathUtils.clamp((scrollY - cachedTrackTop) / cachedScrollable, 0, 1);

  const resolveScrollY = (u: number) => {
    const clamped = THREE.MathUtils.clamp(u, 0, 1);
    if (!isInline) {
      return clamped * getScrollLimit();
    }
    return cachedTrackTop + clamped * cachedScrollable;
  };

  // Subsystems
  let rail = new CameraRail(showroom.waypoints);
  const hints = new ScrollHint(root, signal);
  const tactile = new TactileCamera(canvas, showroom.baseFov, signal, () => hints.dismiss());
  const debugFly = new DebugFlyController(camera, canvas, signal);

  // 4. Camera Spline Controller with Lenis Decoupling (04_sculpting_harmony)
  const cameraSpline = new CameraSplineController(camera, canvas, {
    algorithm: 'catmullrom',
    baseFov: showroom.baseFov,
    signal,
  });

  // 5. Cinematic Viewfinder HUD & Real-Time Telemetry Cluster (05_kpr & 40_otto_objects)
  const cinematicHUD = createCinematicHUD({
    canvasHost: host,
    scene,
    camera,
    renderer,
    density: 'standard',
    signal,
  });

  const drawer = new MaterialDrawer(drawerEl, signal, () => {
    tactile.setPinTarget(null);
    root.classList.remove('has-drawer-open');
  });

  const chapters = new ChapterBar(
    root,
    showroom.waypoints,
    signal,
    () => {
      hints.dismiss();
      drawer.close();
    },
    isInline ? resolveScrollY : undefined
  );

  const pins = new SpatialPins(root, showroom.waypoints, signal, (wp, anchor) => {
    hints.dismiss();
    tactile.setPinTarget(anchor);
    if (wp.pin) {
      root.classList.add('has-drawer-open');
      drawer.openBySlug(wp.pin.studySlug);
    }
  });

  // Scroll state (reads directly from global Lenis singleton in src/engine/scroll.ts)
  let currentU = isInline ? computeInlineU() : THREE.MathUtils.clamp(scrollState().progress, 0, 1);
  let targetU = currentU;
  let scrollVel = 0;
  let isSnapping = false;
  let snapCooldownUntil = 0;
  let idleFrames = 0;

  const offScroll = onScroll((s) => {
    targetU = isInline ? computeInlineU(s.y) : THREE.MathUtils.clamp(s.progress, 0, 1);
    scrollVel = s.velocity;
    tactile.notifyScrollVelocity(s.velocity);
    if (Math.abs(s.velocity) > 0.25) {
      if (!isInline || isVisible) hints.dismiss();
      idleFrames = 0;
    }
  });

  // Set initial camera frame cleanly
  const railPos = new THREE.Vector3();
  const railLook = new THREE.Vector3();
  rail.samplePosition(currentU, railPos);
  rail.sampleTarget(currentU, railLook);
  camera.position.copy(railPos);
  camera.lookAt(railLook);
  chapters.update(currentU, true);

  // Resize handler
  const onResize = () => {
    if (disposed) return;
    syncMetrics();
    camera.fov = resolveFov(stageW, stageH);
    camera.aspect = stageW / stageH;
    camera.updateProjectionMatrix();
    renderer.setSize(stageW, stageH, false);
  };
  window.addEventListener('resize', onResize, { passive: true, signal });

  // Adaptive DPR monitoring (steps down to 1.5 if sustained frame time > 22ms over 2s)
  let slowAccum = 0;
  let dprSteppedDown = false;
  let lastNow = performance.now();
  const bootTime = lastNow;
  let isReady = false;
  let loadedAsset: LoadedAsset | null = null;

  const renderTick = () => {
    if (disposed || document.hidden) return;
    if (isInline && !isVisible) {
      lastNow = performance.now();
      return;
    }

    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) / 1000));
    lastNow = now;
    const timeSec = (now - bootTime) / 1000;
    if (!prefersReducedMotion()) {
      atmosphere.update(timeSec);
      volumetric.update(timeSec, dt);
      fluidGround.update(renderer, scene, camera, timeSec, dt);
    }
    csm.update();

    if (debugFly.isActive()) {
      debugFly.update(dt);
    } else {
      cameraSpline.update(targetU, scrollVel, dt);
      currentU = cameraSpline.getProgress();
    }

    chapters.update(currentU, false);
    pins.update(camera, stageW, stageH, currentU, drawer.isOpen());

    renderer.render(scene, camera);

    // 5. Update Real-Time Cinematic HUD Overlay (05_kpr & 40_otto_objects)
    cinematicHUD.setSplineProgress(currentU);
    cinematicHUD.setInteractionMode(cameraSpline.getMode());
    cinematicHUD.update(dt);
  };

  gsap.ticker.add(renderTick);

  // Lazy-streamable asset promise
  let loadPromise: Promise<void> | null = null;
  let resolveReady!: () => void;
  const ready = new Promise<void>((r) => {
    resolveReady = r;
  });

  const startLoad = () => {
    if (loadPromise || disposed) return loadPromise ?? ready;
    loadPromise = loadShowroomAsset({
      asset: showroom.asset,
      waypoints: showroom.waypoints,
      scene,
      renderer,
      onProgress: (frac, label) => {
        if (statusEl) {
          statusEl.textContent = `${label} · ${Math.round(frac * 100)}%`;
        }
      },
    })
      .then((loaded) => {
        if (disposed) {
          loaded.dispose();
          return;
        }
        loadedAsset = loaded;
        renderer.toneMapping = loaded.toneMapping;
        atmosphere.attachToLoadedScene(loaded.object3D);
        pins.setOccluders(loaded.object3D);

        // Setup Cascaded Shadow Maps materials on loaded geometry
        loaded.object3D.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat) => csm.setupMaterial(mat));
            } else if (mesh.material) {
              csm.setupMaterial(mesh.material);
            }
          }
        });

        // Apply procedural luxury architectural PBR materials
        materialAtlas.applyByMeshName(loaded.object3D);

        if (loaded.extractedWaypoints) {
          rail = new CameraRail(loaded.extractedWaypoints);
          pins.updateAnchors(loaded.extractedWaypoints);
          rail.samplePosition(currentU, railPos);
          rail.sampleTarget(currentU, railLook);
          camera.position.copy(railPos);
          camera.lookAt(railLook);
        }

        renderer.render(scene, camera);
        isReady = true;
        root.classList.add('is-ready');
        if (statusEl) statusEl.hidden = true;
        resolveReady();
      })
      .catch((err) => {
        console.error('[Showroom] Failed to load 3D asset:', err);
        if (statusEl) {
          statusEl.textContent = 'Unable to stream 3D scene.';
        }
        isReady = true;
        root.classList.add('is-ready');
        resolveReady();
      });
    return loadPromise;
  };

  let visIo: IntersectionObserver | null = null;
  let loadIo: IntersectionObserver | null = null;

  if (!isInline) {
    startLoad();
    holdEnter(ready, 1800);
    registerLoaderTask(ready);
  } else {
    // Inline mode: hand off GPU cleanly with global OGL and stream when within 900px
    visIo = new IntersectionObserver(
      ([entry]) => {
        if (disposed) return;
        const nowVisible = Boolean(entry?.isIntersecting);
        if (nowVisible === isVisible) return;
        isVisible = nowVisible;
        if (isVisible) {
          pauseGL();
          studioAudio.startAmbient();
          startLoad();
          targetU = computeInlineU();
          currentU = targetU;
          lastNow = performance.now();
          if (isReady) renderer.render(scene, camera);
        } else {
          studioAudio.stopAmbient();
          resumeGL();
        }
      },
      { threshold: 0.01 }
    );
    visIo.observe(root);

    loadIo = new IntersectionObserver(
      ([entry]) => {
        if (disposed) return;
        if (entry?.isIntersecting) {
          startLoad();
          loadIo?.disconnect();
          loadIo = null;
        }
      },
      { rootMargin: '400px 0px' }
    );
    loadIo.observe(root);
  }

  // Read-only telemetry handle for Playwright QA & dev authoring
  window.__showroomDebug = {
    getState: () => ({
      mode,
      u: currentU,
      targetU,
      cam: [
        Math.round(camera.position.x * 1000) / 1000,
        Math.round(camera.position.y * 1000) / 1000,
        Math.round(camera.position.z * 1000) / 1000,
      ],
      fov: Math.round(camera.fov * 100) / 100,
      dpr: renderer.getPixelRatio(),
      ready: isReady,
      visible: isVisible,
      debugFly: debugFly.isActive(),
      audio: studioAudio.getDebugState(),
      activePOV: ARCHITECTURAL_POVS[cameraSpline.getActivePOVIndex()]?.label,
      interactionMode: cameraSpline.getMode(),
    }),
    jumpTo: (u: number, immediate = false) => {
      const clamped = THREE.MathUtils.clamp(u, 0, 1);
      if (isInline) startLoad();
      const targetY = resolveScrollY(clamped);
      if (immediate) {
        scrollToTarget(targetY, { immediate: true });
        currentU = clamped;
        targetU = clamped;
        rail.samplePosition(currentU, railPos);
        rail.sampleTarget(currentU, railLook);
        camera.position.copy(railPos);
        camera.lookAt(railLook);
        chapters.update(currentU, true);
        if (isVisible) renderer.render(scene, camera);
      } else {
        scrollToTarget(targetY, { duration: 1.0 });
      }
    },
    jumpToPOV: (idx: number, immediate = false) => {
      cameraSpline.jumpToPOV(idx, immediate);
    },
    setTimeOfDay: (preset: TimeOfDayPreset) => {
      volumetric.setTimeOfDay(preset, 0.85);
      const dusk = preset === 'night' ? 1.0 : preset === 'golden' ? 0.45 : 0.0;
      fluidGround.setDusk(dusk);
      csm.setDusk(dusk);
    },
    setMode: (m: ShowroomInteractionMode) => {
      cameraSpline.setMode(m);
    },
    logWaypoint: () => (debugFly.isActive() ? debugFly.logWaypoint() : null),
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;

    cameraSpline.dispose();
    cinematicHUD.dispose();
    fluidGround.dispose();
    volumetric.dispose();
    csm.dispose();

    visIo?.disconnect();
    loadIo?.disconnect();
    ScrollTrigger.removeEventListener('refresh', syncMetrics);
    gsap.ticker.remove(renderTick);
    abort.abort();
    offScroll();
    offAudio();
    drawer.close();
    studioAudio.stopAmbient();

    if (loadedAsset) {
      loadedAsset.dispose();
      loadedAsset = null;
    }

    atmosphere.dispose();
    renderer.dispose();
    try {
      renderer.forceContextLoss();
    } catch {}
    canvas.remove();

    delete window.__showroomDebug;
    if (!isInline) {
      document.documentElement.classList.remove('is-showroom');
    }
    resumeGL();
  };

  return { ready, dispose };
}

// Re-export Cinematic HUD system and types
export {
  CinematicHUD,
  createCinematicHUD,
  type CinematicHUDOptions,
  type HUDDensityMode,
  type TelemetrySnapshot,
  type ScreenshotExportOptions,
  type ScreenshotExportResult,
  type TitleBlockData,
} from './cinematicHUD';

// Re-export Continuous 24-Hour Solar Choreography System
export {
  SolarChoreographyController,
  SolarTimeSlider,
  createSolarChoreography,
  createSolarSlider,
  computeSolarCoordinates,
  computeSolarPhotometrics,
  computeShadowChoreography,
  formatSolarTelemetry,
  cctToLinearRGB,
  evaluateArchitecturalCCT,
  driveCSMShadows,
  driveVolumetricSystem,
  driveCelestialAtmosphere,
  driveSceneLighting,
  ARCHITECTURAL_SOLAR_PRESETS,
  BIRATNAGAR_OBSERVER,
  DHARAN_OBSERVER,
  type SolarCoordinates,
  type SolarPhotometrics,
  type ShadowChoreographyState,
  type SolarChoreographySnapshot,
  type SolarPresetId,
  type SolarPreset,
  type SolarChoreographyTargets,
  type SolarChoreographyOptions,
  type SolarTimeSliderOptions,
} from './solarChoreography';

