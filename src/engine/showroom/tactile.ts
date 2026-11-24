import * as THREE from 'three';
import { prefersReducedMotion } from '../env';

const DEG = Math.PI / 180;
const PARALLAX_YAW_MAX = 3.5 * DEG;
const PARALLAX_PITCH_MAX = 2.5 * DEG;
const DRAG_YAW_MAX = 48.0 * DEG;
const DRAG_PITCH_MIN = -24.0 * DEG;
const DRAG_PITCH_MAX = 28.0 * DEG;

// Polar angle bounds for free-orbit inspection mode
const ORBIT_POLAR_MIN = 14.0 * DEG;
const ORBIT_POLAR_MAX = 85.0 * DEG;
const ORBIT_RADIUS_MIN = 1.2;
const ORBIT_RADIUS_MAX = 8.5;

export type CameraInteractionMode = 'rail' | 'orbit';

export class TactileCamera {
  private pointerTarget = { x: 0, y: 0 };
  private pointer = { x: 0, y: 0 };

  private dragTarget = { yaw: 0, pitch: 0 };
  private drag = { yaw: 0, pitch: 0 };
  private isDragging = false;
  private lastX = 0;
  private lastY = 0;

  // Touch gesture state (1-finger orbit, 2-finger pinch zoom)
  private initialPinchDist = 0;
  private isPinching = false;

  // Free Orbit spherical coordinates
  private mode: CameraInteractionMode = 'rail';
  private orbitTarget = new THREE.Vector3(0, 1.2, 0);
  private currentSpherical = new THREE.Spherical(3.8, Math.PI * 0.42, 0);
  private targetSpherical = new THREE.Spherical(3.8, Math.PI * 0.42, 0);
  private modeBlend = 0; // 0 = rail, 1 = orbit

  private baseFov: number;
  private currentFov: number;

  private pinAnchor: THREE.Vector3 | null = null;
  private pinAimBlend = 0;
  private desiredLook = new THREE.Vector3();
  private blendedLook = new THREE.Vector3();
  private hasBlendedLook = false;

  private canvas: HTMLCanvasElement;
  private onInteract?: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    baseFov: number,
    signal: AbortSignal,
    onInteract?: () => void
  ) {
    this.canvas = canvas;
    this.baseFov = baseFov;
    this.currentFov = baseFov;
    this.onInteract = onInteract;

    // Prevent default browser touch actions (page pull, pinch zoom) on the WebGL canvas
    this.canvas.style.touchAction = 'none';
    this.canvas.style.cursor = 'grab';

    if (!prefersReducedMotion()) {
      window.addEventListener('pointermove', this.onPointerMove, { passive: true, signal });
      this.canvas.addEventListener('pointerdown', this.onPointerDown, { signal });
      window.addEventListener('pointerup', this.onPointerUp, { passive: true, signal });
      window.addEventListener('pointercancel', this.onPointerUp, { passive: true, signal });
      window.addEventListener('blur', this.onBlur, { passive: true, signal });

      // Native multi-touch gesture handlers for mobile pinch-to-zoom
      this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false, signal });
      this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false, signal });
      this.canvas.addEventListener('touchend', this.onTouchEnd, { passive: true, signal });
      this.canvas.addEventListener('touchcancel', this.onTouchEnd, { passive: true, signal });

      // Wheel handler for zoom in orbit mode
      this.canvas.addEventListener('wheel', this.onWheel, { passive: false, signal });
    }
  }

  public setMode(mode: CameraInteractionMode): void {
    this.mode = mode;
    this.onInteract?.();
  }

  public getMode(): CameraInteractionMode {
    return this.mode;
  }

  public setOrbitCenter(center: THREE.Vector3, radius = 3.6): void {
    this.orbitTarget.copy(center);
    this.targetSpherical.radius = THREE.MathUtils.clamp(radius, ORBIT_RADIUS_MIN, ORBIT_RADIUS_MAX);
    this.currentSpherical.radius = this.targetSpherical.radius;
  }

  public resetOrbit(): void {
    this.dragTarget.yaw = 0;
    this.dragTarget.pitch = 0;
    this.targetSpherical.theta = 0;
    this.targetSpherical.phi = Math.PI * 0.42;
    this.targetSpherical.radius = 3.8;
  }

  private onPointerMove = (e: PointerEvent) => {
    const nx = (e.clientX / Math.max(1, innerWidth)) * 2 - 1;
    const ny = (e.clientY / Math.max(1, innerHeight)) * 2 - 1;
    this.pointerTarget.x = THREE.MathUtils.clamp(nx, -1, 1);
    this.pointerTarget.y = THREE.MathUtils.clamp(ny, -1, 1);

    if (this.isDragging && !this.isPinching) {
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;

      if (this.mode === 'orbit') {
        const sensX = 0.0055;
        const sensY = 0.0045;
        this.targetSpherical.theta -= dx * sensX;
        this.targetSpherical.phi = THREE.MathUtils.clamp(
          this.targetSpherical.phi - dy * sensY,
          ORBIT_POLAR_MIN,
          ORBIT_POLAR_MAX
        );
      } else {
        const sens = 0.0036;
        this.dragTarget.yaw = THREE.MathUtils.clamp(
          this.dragTarget.yaw - dx * sens,
          -DRAG_YAW_MAX,
          DRAG_YAW_MAX
        );
        this.dragTarget.pitch = THREE.MathUtils.clamp(
          this.dragTarget.pitch - dy * sens,
          DRAG_PITCH_MIN,
          DRAG_PITCH_MAX
        );
      }

      if (Math.abs(dx) + Math.abs(dy) > 2) this.onInteract?.();
    }
  };

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.canvas.style.cursor = 'grabbing';
  };

  private onPointerUp = () => {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.canvas.style.cursor = 'grab';
  };

  private onBlur = () => {
    this.isDragging = false;
    this.isPinching = false;
    this.pointerTarget.x = 0;
    this.pointerTarget.y = 0;
    this.canvas.style.cursor = 'grab';
  };

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      this.isPinching = true;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      this.initialPinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      e.preventDefault();
    } else if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastX = e.touches[0].clientX;
      this.lastY = e.touches[0].clientY;
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && this.isPinching) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = dist / Math.max(1, this.initialPinchDist);
      const deltaZoom = (1 - ratio) * 2.2;
      this.targetSpherical.radius = THREE.MathUtils.clamp(
        this.targetSpherical.radius + deltaZoom,
        ORBIT_RADIUS_MIN,
        ORBIT_RADIUS_MAX
      );
      this.initialPinchDist = dist;
      this.onInteract?.();
      e.preventDefault();
    } else if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.lastX;
      const dy = e.touches[0].clientY - this.lastY;
      this.lastX = e.touches[0].clientX;
      this.lastY = e.touches[0].clientY;

      if (this.mode === 'orbit') {
        const sensX = 0.007;
        const sensY = 0.006;
        this.targetSpherical.theta -= dx * sensX;
        this.targetSpherical.phi = THREE.MathUtils.clamp(
          this.targetSpherical.phi - dy * sensY,
          ORBIT_POLAR_MIN,
          ORBIT_POLAR_MAX
        );
      } else {
        const sens = 0.0045;
        this.dragTarget.yaw = THREE.MathUtils.clamp(
          this.dragTarget.yaw - dx * sens,
          -DRAG_YAW_MAX,
          DRAG_YAW_MAX
        );
        this.dragTarget.pitch = THREE.MathUtils.clamp(
          this.dragTarget.pitch - dy * sens,
          DRAG_PITCH_MIN,
          DRAG_PITCH_MAX
        );
      }
      this.onInteract?.();
      e.preventDefault();
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) {
      this.isPinching = false;
    }
    if (e.touches.length === 0) {
      this.isDragging = false;
    }
  };

  private onWheel = (e: WheelEvent) => {
    if (this.mode === 'orbit') {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.004;
      this.targetSpherical.radius = THREE.MathUtils.clamp(
        this.targetSpherical.radius + zoomDelta,
        ORBIT_RADIUS_MIN,
        ORBIT_RADIUS_MAX
      );
      this.onInteract?.();
    }
  };

  public setPinTarget(anchor: THREE.Vector3 | null): void {
    this.pinAnchor = anchor ? anchor.clone() : null;
    if (this.pinAnchor) {
      this.setOrbitCenter(this.pinAnchor);
    }
  }

  public notifyScrollVelocity(velocity: number): void {
    if (!this.isDragging && Math.abs(velocity) > 0.35) {
      this.dragTarget.yaw *= 0.88;
      this.dragTarget.pitch *= 0.88;
    }
  }

  public apply(
    camera: THREE.PerspectiveCamera,
    railPos: THREE.Vector3,
    railLook: THREE.Vector3,
    scrollVelocity: number,
    dt: number
  ): void {
    const reduced = prefersReducedMotion();
    const kPointer = 1 - Math.exp(-5.5 * dt);
    const kDrag = 1 - Math.exp(-7.5 * dt);
    const kOrbit = 1 - Math.exp(-8.5 * dt);
    const kRecenter = 1 - Math.exp(-2.8 * dt);

    // Smooth pointer parallax
    this.pointer.x += (this.pointerTarget.x - this.pointer.x) * kPointer;
    this.pointer.y += (this.pointerTarget.y - this.pointer.y) * kPointer;

    // Smooth spherical damping for orbit mode
    this.currentSpherical.theta += (this.targetSpherical.theta - this.currentSpherical.theta) * kOrbit;
    this.currentSpherical.phi += (this.targetSpherical.phi - this.currentSpherical.phi) * kOrbit;
    this.currentSpherical.radius += (this.targetSpherical.radius - this.currentSpherical.radius) * kOrbit;

    // Mode cross-fade transition
    const targetModeBlend = this.mode === 'orbit' ? 1 : 0;
    this.modeBlend += (targetModeBlend - this.modeBlend) * (1 - Math.exp(-6.0 * dt));

    // Gentle recentering of drag-to-look in rail mode after release
    if (this.mode === 'rail' && !this.isDragging && !this.pinAnchor) {
      this.dragTarget.yaw += (0 - this.dragTarget.yaw) * kRecenter * 0.45;
      this.dragTarget.pitch += (0 - this.dragTarget.pitch) * kRecenter * 0.45;
    }
    this.drag.yaw += (this.dragTarget.yaw - this.drag.yaw) * kDrag;
    this.drag.pitch += (this.dragTarget.pitch - this.drag.pitch) * kDrag;

    // Pin camera aim easing
    const targetPinBlend = this.pinAnchor ? 0.38 : 0;
    this.pinAimBlend += (targetPinBlend - this.pinAimBlend) * (1 - Math.exp(-5.0 * dt));

    this.desiredLook.copy(railLook);
    if (this.pinAnchor && this.pinAimBlend > 0.002) {
      this.desiredLook.lerp(this.pinAnchor, this.pinAimBlend);
    }

    if (!this.hasBlendedLook) {
      this.blendedLook.copy(this.desiredLook);
      this.hasBlendedLook = true;
    } else {
      this.blendedLook.lerp(this.desiredLook, 1 - Math.exp(-10.0 * dt));
    }

    // Calculate free-orbit position around orbitTarget
    const orbitPos = new THREE.Vector3().setFromSpherical(this.currentSpherical).add(this.orbitTarget);

    // Blend camera position and look target between rail and orbit modes
    if (this.modeBlend > 0.001) {
      camera.position.lerpVectors(railPos, orbitPos, this.modeBlend);
      const activeLook = new THREE.Vector3().lerpVectors(this.blendedLook, this.orbitTarget, this.modeBlend);
      camera.lookAt(activeLook);
    } else {
      camera.position.copy(railPos);
      camera.lookAt(this.blendedLook);
    }

    // Apply damped pointer parallax & bounded drag yaw/pitch in rail mode
    if (this.modeBlend < 0.99 && !reduced) {
      const yaw = -this.pointer.x * PARALLAX_YAW_MAX + this.drag.yaw * (1 - this.modeBlend);
      const pitch = -this.pointer.y * PARALLAX_PITCH_MAX + this.drag.pitch * (1 - this.modeBlend);
      camera.rotateY(yaw);
      camera.rotateX(pitch);
    }

    // Subtle FOV breathing
    if (!reduced) {
      const speedNorm = THREE.MathUtils.clamp(Math.abs(scrollVelocity) / 28, 0, 1);
      const targetFov = this.baseFov + speedNorm * 2.0;
      const kFov = 1 - Math.exp(-4.5 * dt);
      const nextFov = this.currentFov + (targetFov - this.currentFov) * kFov;
      if (Math.abs(nextFov - this.currentFov) > 0.005) {
        this.currentFov = nextFov;
        camera.fov = this.currentFov;
        camera.updateProjectionMatrix();
      }
    }
  }
}
