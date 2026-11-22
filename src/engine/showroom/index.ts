import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { showroom } from '../../data/site';
import { isTouch, prefersReducedMotion } from '../env';
import { pauseGL, resumeGL } from '../gl';
import { getScrollLimit, onScroll, resizeScroll, scrollState, scrollToTarget } from '../scroll';
import { studioAudio } from '../audio';
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
      };
      jumpTo: (u: number, immediate?: boolean) => void;
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

  const initialDpr = Math.min(window.devicePixelRatio || 1, 1.5);
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

  // Living ICG-style Atmosphere (PMREM studio reflections, swaying leaf shadows, sunbeam motes, shimmering water)
  const atmosphere = createLivingAtmosphere(scene, renderer);

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
    if (!prefersReducedMotion()) {
      atmosphere.update((now - bootTime) / 1000);
    }

    if (!dprSteppedDown && initialDpr > 1.5 && isReady) {
      if (dt > 0.022) {
        slowAccum += dt;
        if (slowAccum > 2.0) {
          dprSteppedDown = true;
          renderer.setPixelRatio(1.5);
          renderer.setSize(host.clientWidth || window.innerWidth, host.clientHeight || window.innerHeight, false);
        }
      } else {
        slowAccum = Math.max(0, slowAccum - dt * 0.5);
      }
    }

    if (debugFly.isActive()) {
      debugFly.update(dt);
    } else {
      // Smooth damped scrub (~0.6s catch-up matching scrub: 0.6)
      const kScroll = prefersReducedMotion() ? 1 : 1 - Math.exp((-dt / 0.6) * 3.0);
      currentU += (targetU - currentU) * kScroll;

      rail.samplePosition(currentU, railPos);
      rail.sampleTarget(currentU, railLook);
      tactile.apply(camera, railPos, railLook, scrollVel, dt);

      // Gentle ICG-style velocity-settle snap on fullscreen desktop only (never trap inline homepage scroll!)
      if (
        !isInline &&
        !isTouch() &&
        !prefersReducedMotion() &&
        !drawer.isOpen() &&
        !isSnapping &&
        now > snapCooldownUntil
      ) {
        if (Math.abs(scrollVel) < 0.05) {
          idleFrames++;
          if (idleFrames === 12) {
            const limit = getScrollLimit();
            if (limit > 0) {
              const curPx = currentU * limit;
              const hit =
                currentU > 0.985
                  ? rail.waypoints[rail.waypoints.length - 1]
                  : rail.waypoints.find((w) => {
                      const dPx = Math.abs(curPx - w.u * limit);
                      return dPx > 10 && dPx <= 220;
                    });
              if (hit) {
                isSnapping = true;
                scrollToTarget(hit.u * limit, {
                  duration: 0.8,
                  onComplete: () => {
                    isSnapping = false;
                    snapCooldownUntil = performance.now() + 900;
                  },
                });
              }
            }
          }
        } else {
          idleFrames = 0;
        }
      }
    }

    chapters.update(currentU, false);
    pins.update(camera, stageW, stageH, currentU, drawer.isOpen());

    renderer.render(scene, camera);
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
    logWaypoint: () => (debugFly.isActive() ? debugFly.logWaypoint() : null),
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;

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
