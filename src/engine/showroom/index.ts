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

  // Living ICG-style Atmosphere (PMREM studio reflections, swaying leaf shadows, sunbeam motes, shimmering water)
  const atmosphere = createLivingAtmosphere(scene, renderer);
  const duskState = { v: document.documentElement.dataset.lighting === 'dusk' ? 1 : 0 };
  atmosphere.setDusk(duskState.v);
  window.addEventListener(
    'rubiconius:lighting',
    (e) => {
      const dusk = Boolean((e as CustomEvent<{ dusk?: boolean }>).detail?.dusk);
      gsap.to(duskState, {
        v: dusk ? 1 : 0,
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
        pins.setOccluders(loaded.object3D);

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

  // Directional sun light for architectural illumination and solar choreography
  const sunLight = new THREE.DirectionalLight(0xfffdf9, 1.6);
  sunLight.position.set(5, 12, 6);
  scene.add(sunLight);

  // --------------------------------------------------------------------------
  // PBR Material Switching System (Kota Stone, Sal Timber, Fluted Brass, Plaster)
  // --------------------------------------------------------------------------
  const PBR_PRESETS: Record<string, {
    label: string;
    color: string;
    roughness: number;
    metalness: number;
    clearcoat?: number;
    description: string;
  }> = {
    kota_stone: {
      label: 'Honed Kota Limestone',
      color: '#8E9988',
      roughness: 0.88,
      metalness: 0.0,
      clearcoat: 0.0,
      description: 'Honed Kota Limestone · Dolomitic sediment · Matte micro-cleft cleft surface · Cool tactile signature',
    },
    sal_timber: {
      label: 'Fluted Sal Hardwood',
      color: '#5C3A21',
      roughness: 0.46,
      metalness: 0.0,
      clearcoat: 0.0,
      description: 'Fluted Sal Hardwood · Shorea robusta · Terai timber · Anisotropy 0.88 · Longitudinal fiber sheen',
    },
    fluted_brass: {
      label: 'Patinated Spun Brass',
      color: '#D4AF37',
      roughness: 0.28,
      metalness: 0.98,
      clearcoat: 0.32,
      description: 'Patinated Spun Brass · C26000 alloy · Concentric lathe grain · Metalness 0.98 · Warm specular brilliance',
    },
    plaster: {
      label: 'Hand-trowelled Mineral Plaster',
      color: '#D8D4CC',
      roughness: 0.82,
      metalness: 0.0,
      clearcoat: 0.0,
      description: 'Hand-trowelled Mineral Plaster · Fine aggregate mottling · Roughness 0.82 · Low-glare diffuse reflection',
    },
  };

  let activeMaterialKey = 'kota_stone';
  const activeMatLabel = root.querySelector<HTMLElement>('[data-active-mat-label]');
  const matPills = root.querySelectorAll<HTMLButtonElement>('[data-mat-preset]');

  const applyPBRMaterial = (key: string) => {
    const preset = PBR_PRESETS[key];
    if (!preset) return;
    activeMaterialKey = key;
    if (activeMatLabel) activeMatLabel.textContent = preset.label;

    matPills.forEach((btn) => {
      const isActive = btn.dataset.matPreset === key;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-checked', String(isActive));
    });

    soundEngine.click();

    if (loadedAsset?.object3D) {
      const tint = new THREE.Color(preset.color);
      loadedAsset.object3D.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh && mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const m of mats) {
            if (/VideoWall|Courtyard_Water/i.test(mesh.name)) continue;
            if ('roughness' in m) (m as THREE.MeshStandardMaterial).roughness = preset.roughness;
            if ('metalness' in m) (m as THREE.MeshStandardMaterial).metalness = preset.metalness;
            if (preset.clearcoat !== undefined && 'clearcoat' in m) {
              (m as THREE.MeshPhysicalMaterial).clearcoat = preset.clearcoat;
            }
            if ('color' in m) {
              (m as THREE.MeshStandardMaterial).color.lerp(tint, 0.25);
            }
            m.needsUpdate = true;
          }
        }
      });
    }
  };

  matPills.forEach((btn) => {
    btn.addEventListener(
      'click',
      () => {
        const k = btn.dataset.matPreset;
        if (k) applyPBRMaterial(k);
      },
      { signal }
    );
  });

  // --------------------------------------------------------------------------
  // Daylight & Sun Angle Slider and Presets (Morning, Noon, Golden Dusk, Night)
  // --------------------------------------------------------------------------
  const solarSlider = root.querySelector<HTMLInputElement>('[data-solar-slider]');
  const solarVal = root.querySelector<HTMLElement>('[data-solar-val]');
  const solarReadout = root.querySelector<HTMLElement>('[data-solar-readout]');
  const solarPills = root.querySelectorAll<HTMLButtonElement>('[data-solar-preset]');

  const SOLAR_PRESETS: Record<string, { hour: number; label: string }> = {
    morning: { hour: 8.5, label: '08:30 Morning · 4000K Crisp Daylight' },
    noon: { hour: 12.0, label: '12:00 Noon · 5500K High-CRI Sun' },
    golden: { hour: 17.5, label: '17:30 Golden Dusk · 3200K Raking Light' },
    night: { hour: 22.0, label: '22:00 Night · 1800K Intimate Warmth' },
  };

  const applySolarHour = (hour: number, activePresetKey?: string) => {
    const clampedHour = THREE.MathUtils.clamp(hour, 6, 22);
    const hourNorm = (clampedHour - 6) / 16;
    const azDeg = Math.round(82 + hourNorm * 180);
    const altDeg = Math.round(Math.max(4, Math.sin(hourNorm * Math.PI) * 78));
    const radAz = (azDeg * Math.PI) / 180;
    const radAlt = (altDeg * Math.PI) / 180;

    sunLight.position.set(
      Math.cos(radAz) * Math.cos(radAlt) * 16,
      Math.sin(radAlt) * 16,
      Math.sin(radAz) * Math.cos(radAlt) * 16
    );

    let kelvin = 5500;
    let duskFrac = 0;
    if (clampedHour < 10) {
      kelvin = Math.round(2200 + ((clampedHour - 6) / 4) * 2300);
      duskFrac = Math.max(0, 1 - (clampedHour - 6) / 3) * 0.45;
      sunLight.color.set('#FFF4E8');
      sunLight.intensity = 1.35;
    } else if (clampedHour <= 15) {
      kelvin = 5500;
      duskFrac = 0;
      sunLight.color.set('#FFFDF9');
      sunLight.intensity = 1.65;
    } else if (clampedHour <= 18.5) {
      kelvin = Math.round(5500 - ((clampedHour - 15) / 3.5) * 3300);
      duskFrac = ((clampedHour - 15) / 3.5) * 0.85;
      sunLight.color.set('#FFB366');
      sunLight.intensity = 1.45;
    } else {
      kelvin = 1800;
      duskFrac = 1.0;
      sunLight.color.set('#8898B0');
      sunLight.intensity = 0.42;
    }

    atmosphere.setDusk(duskFrac);

    const h = Math.floor(clampedHour);
    const m = Math.round((clampedHour - h) * 60);
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    if (solarSlider && Math.abs(parseFloat(solarSlider.value) - clampedHour) > 0.05) {
      solarSlider.value = String(clampedHour);
    }
    if (solarVal) solarVal.textContent = timeStr;
    if (solarReadout) {
      const presetMatch = activePresetKey ? SOLAR_PRESETS[activePresetKey]?.label : undefined;
      solarReadout.textContent =
        presetMatch ?? `${timeStr} · ${kelvin}K · ${azDeg}° Az · ${altDeg}° Alt`;
    }

    solarPills.forEach((btn) => {
      const isMatch = activePresetKey ? btn.dataset.solarPreset === activePresetKey : false;
      btn.classList.toggle('is-active', isMatch);
      btn.setAttribute('aria-checked', String(isMatch));
    });
  };

  solarPills.forEach((btn) => {
    btn.addEventListener(
      'click',
      () => {
        const pKey = btn.dataset.solarPreset;
        if (pKey && SOLAR_PRESETS[pKey]) {
          soundEngine.click();
          applySolarHour(SOLAR_PRESETS[pKey].hour, pKey);
        }
      },
      { signal }
    );
  });

  if (solarSlider) {
    solarSlider.addEventListener(
      'input',
      () => {
        const val = parseFloat(solarSlider.value);
        applySolarHour(val);
      },
      { signal }
    );
  }

  // --------------------------------------------------------------------------
  // Camera Exploration Mode (Walk Rail vs Free Orbit)
  // --------------------------------------------------------------------------
  const modePills = root.querySelectorAll<HTMLButtonElement>('[data-cam-mode-btn]');
  const gestureHint = root.querySelector<HTMLElement>('[data-gesture-hint]');

  const setCameraInteractionMode = (nextMode: 'rail' | 'orbit') => {
    tactile.setMode(nextMode);
    soundEngine.click();

    modePills.forEach((btn) => {
      const isActive = btn.dataset.camModeBtn === nextMode;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-checked', String(isActive));
    });

    if (gestureHint) {
      gestureHint.textContent =
        nextMode === 'orbit'
          ? '1-Finger Drag to Orbit · Pinch to Zoom · Bounded Limits'
          : 'Drag to look · Scroll to walk · Click marker to inspect';
    }
  };

  modePills.forEach((btn) => {
    btn.addEventListener(
      'click',
      () => {
        const m = btn.dataset.camModeBtn as 'rail' | 'orbit';
        if (m) setCameraInteractionMode(m);
      },
      { signal }
    );
  });

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
