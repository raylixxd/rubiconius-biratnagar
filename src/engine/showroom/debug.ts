import * as THREE from 'three';

export class DebugFlyController {
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private keys = new Set<string>();
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private yaw = 0;
  private pitch = 0;
  private badge: HTMLElement | null = null;
  private active = false;

  constructor(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement, signal: AbortSignal) {
    this.camera = camera;
    this.canvas = canvas;

    const params = new URLSearchParams(window.location.search);
    const hasParam = params.get('debug') === '1';
    if (!hasParam) return;

    this.active = true;
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    this.yaw = euler.y;
    this.pitch = euler.x;

    this.mountBadge();
    window.addEventListener('keydown', this.onKeyDown, { signal });
    window.addEventListener('keyup', this.onKeyUp, { signal });
    this.canvas.addEventListener('pointerdown', this.onDown, { signal });
    window.addEventListener('pointermove', this.onMove, { passive: true, signal });
    window.addEventListener('pointerup', this.onUp, { passive: true, signal });
    signal.addEventListener('abort', () => this.badge?.remove(), { once: true });
  }

  public isActive() {
    return this.active;
  }

  private mountBadge() {
    const el = document.createElement('div');
    el.className = 'showroom-debug-badge';
    el.setAttribute('data-debug-badge', '');
    el.textContent = 'DEBUG FLY · WASD/QE move · Drag look · Press P to log waypoint';
    document.body.appendChild(el);
    this.badge = el;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === 'p') {
      this.logWaypoint();
      return;
    }
    this.keys.add(k);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private onMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.yaw -= dx * 0.004;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.004, -Math.PI * 0.48, Math.PI * 0.48);
  };

  private onUp = () => {
    this.dragging = false;
  };

  public logWaypoint() {
    const pos = this.camera.position;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const tgt = pos.clone().addScaledVector(dir, 3.0);
    const r = (n: number) => Math.round(n * 1000) / 1000;
    const snippet = {
      cam: [r(pos.x), r(pos.y), r(pos.z)],
      target: [r(tgt.x), r(tgt.y), r(tgt.z)],
    };
    console.info('[Showroom Waypoint]', JSON.stringify(snippet));
    if (this.badge) {
      this.badge.textContent = `Logged waypoint: cam ${JSON.stringify(snippet.cam)} target ${JSON.stringify(snippet.target)}`;
    }
    return snippet;
  }

  public update(dt: number) {
    if (!this.active) return;
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));

    const speed = (this.keys.has('shift') ? 5.5 : 2.2) * dt;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);

    if (this.keys.has('w')) this.camera.position.addScaledVector(forward, speed);
    if (this.keys.has('s')) this.camera.position.addScaledVector(forward, -speed);
    if (this.keys.has('d')) this.camera.position.addScaledVector(right, speed);
    if (this.keys.has('a')) this.camera.position.addScaledVector(right, -speed);
    if (this.keys.has('e')) this.camera.position.y += speed;
    if (this.keys.has('q')) this.camera.position.y -= speed;
  }
}
