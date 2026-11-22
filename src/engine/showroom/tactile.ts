import * as THREE from 'three';
import { isTouch, prefersReducedMotion } from '../env';

const DEG = Math.PI / 180;
const PARALLAX_YAW_MAX = 2.5 * DEG;
const PARALLAX_PITCH_MAX = 2.0 * DEG;
const DRAG_YAW_MAX = 12.0 * DEG;
const DRAG_PITCH_MAX = 6.0 * DEG;

export class TactileCamera {
  private pointerTarget = { x: 0, y: 0 };
  private pointer = { x: 0, y: 0 };

  private dragTarget = { yaw: 0, pitch: 0 };
  private drag = { yaw: 0, pitch: 0 };
  private isDragging = false;
  private lastX = 0;
  private lastY = 0;

  private baseFov: number;
  private currentFov: number;

  private pinAnchor: THREE.Vector3 | null = null;
  private pinAimBlend = 0;
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

    if (!isTouch() && !prefersReducedMotion()) {
      this.canvas.style.cursor = 'grab';
      window.addEventListener('pointermove', this.onPointerMove, { passive: true, signal });
      this.canvas.addEventListener('pointerdown', this.onPointerDown, { signal });
      window.addEventListener('pointerup', this.onPointerUp, { passive: true, signal });
      window.addEventListener('pointercancel', this.onPointerUp, { passive: true, signal });
      window.addEventListener('blur', this.onBlur, { passive: true, signal });
    }
  }

  private onPointerMove = (e: PointerEvent) => {
    const nx = (e.clientX / Math.max(1, innerWidth)) * 2 - 1;
    const ny = (e.clientY / Math.max(1, innerHeight)) * 2 - 1;
    this.pointerTarget.x = THREE.MathUtils.clamp(nx, -1, 1);
    this.pointerTarget.y = THREE.MathUtils.clamp(ny, -1, 1);

    if (this.isDragging) {
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      const sens = 0.0032;
      this.dragTarget.yaw = THREE.MathUtils.clamp(this.dragTarget.yaw - dx * sens, -DRAG_YAW_MAX, DRAG_YAW_MAX);
      this.dragTarget.pitch = THREE.MathUtils.clamp(this.dragTarget.pitch - dy * sens, -DRAG_PITCH_MAX, DRAG_PITCH_MAX);
      if (Math.abs(dx) + Math.abs(dy) > 2) this.onInteract?.();
    }
  };

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
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
    this.pointerTarget.x = 0;
    this.pointerTarget.y = 0;
    this.canvas.style.cursor = 'grab';
  };

  public setPinTarget(anchor: THREE.Vector3 | null) {
    this.pinAnchor = anchor ? anchor.clone() : null;
  }

  public notifyScrollVelocity(velocity: number) {
    // Gently recenter click-and-drag look offset when user resumes scrolling
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
  ) {
    const reduced = prefersReducedMotion();
    const kPointer = 1 - Math.exp(-5.5 * dt);
    const kDrag = 1 - Math.exp(-7.5 * dt);
    const kRecenter = 1 - Math.exp(-2.8 * dt);

    // Smooth pointer parallax
    this.pointer.x += (this.pointerTarget.x - this.pointer.x) * kPointer;
    this.pointer.y += (this.pointerTarget.y - this.pointer.y) * kPointer;

    // Gentle recentering of drag-to-look after release
    if (!this.isDragging && !this.pinAnchor) {
      this.dragTarget.yaw += (0 - this.dragTarget.yaw) * kRecenter * 0.45;
      this.dragTarget.pitch += (0 - this.dragTarget.pitch) * kRecenter * 0.45;
    }
    this.drag.yaw += (this.dragTarget.yaw - this.drag.yaw) * kDrag;
    this.drag.pitch += (this.dragTarget.pitch - this.drag.pitch) * kDrag;

    // Pin camera aim easing (gently lean lookAt 35% toward pin.anchor while drawer is open)
    const targetPinBlend = this.pinAnchor ? 0.38 : 0;
    this.pinAimBlend += (targetPinBlend - this.pinAimBlend) * (1 - Math.exp(-5.0 * dt));

    const desiredLook = railLook.clone();
    if (this.pinAnchor && this.pinAimBlend > 0.002) {
      desiredLook.lerp(this.pinAnchor, this.pinAimBlend);
    }

    if (!this.hasBlendedLook) {
      this.blendedLook.copy(desiredLook);
      this.hasBlendedLook = true;
    } else {
      this.blendedLook.lerp(desiredLook, 1 - Math.exp(-10.0 * dt));
    }

    camera.position.copy(railPos);
    camera.lookAt(this.blendedLook);

    // Apply damped pointer parallax + click-and-drag-to-look rotations on desktop
    if (!isTouch() && !reduced) {
      const yaw = -this.pointer.x * PARALLAX_YAW_MAX + this.drag.yaw;
      const pitch = -this.pointer.y * PARALLAX_PITCH_MAX + this.drag.pitch;
      camera.rotateY(yaw);
      camera.rotateX(pitch);
    }

    // Subtle FOV breathing: +2° during faster scroll glides, settling smoothly back at rest
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
