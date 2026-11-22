import * as THREE from 'three';
import type { ShowroomWaypoint } from '../../data/site';
import { studioAudio } from '../audio';

export type ActivePinItem = {
  waypoint: ShowroomWaypoint;
  anchor: THREE.Vector3;
  el: HTMLElement;
  btn: HTMLButtonElement;
  occluded: boolean;
};

export class SpatialPins {
  private items: ActivePinItem[] = [];
  private tmp = new THREE.Vector3();
  private dir = new THREE.Vector3();
  private ray = new THREE.Raycaster();
  private occluders: THREE.Object3D[] = [];
  private hits: THREE.Intersection[] = [];
  private frameCount = 0;

  constructor(
    container: HTMLElement,
    waypoints: ShowroomWaypoint[],
    signal: AbortSignal,
    onSelect: (wp: ShowroomWaypoint, anchor: THREE.Vector3) => void
  ) {
    waypoints.forEach((wp) => {
      if (!wp.pin) return;
      const el = container.querySelector<HTMLElement>(`[data-showroom-pin="${wp.id}"]`);
      const btn = el?.querySelector<HTMLButtonElement>('button');
      if (!el || !btn) return;

      const anchor = new THREE.Vector3(...wp.pin.anchor);
      const handleClick = () => {
        studioAudio.pin();
        onSelect(wp, anchor);
      };
      btn.addEventListener('click', handleClick, { signal });
      this.items.push({ waypoint: wp, anchor, el, btn, occluded: false });
    });

    signal.addEventListener('abort', () => {
      this.occluders.length = 0;
      this.hits.length = 0;
    }, { once: true });
  }

  public setOccluders(root: THREE.Object3D) {
    this.occluders.length = 0;
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && !/water|glass|window|pend|leaf|dust/i.test(obj.name)) {
        this.occluders.push(obj);
      }
    });
  }

  public updateAnchors(waypoints: ShowroomWaypoint[]) {
    for (const item of this.items) {
      const updated = waypoints.find((w) => w.id === item.waypoint.id);
      if (updated?.pin) {
        item.waypoint = updated;
        item.anchor.set(...updated.pin.anchor);
      }
    }
  }

  public update(camera: THREE.PerspectiveCamera, width: number, height: number, progressU: number, drawerOpen: boolean) {
    const checkOcclusion = (++this.frameCount % 4) === 0 && this.occluders.length > 0;

    for (const item of this.items) {
      this.tmp.copy(item.anchor).project(camera);

      const isBehind = this.tmp.z > 1.0 || this.tmp.z < -1.0;
      const isOffscreen = Math.abs(this.tmp.x) > 1.08 || Math.abs(this.tmp.y) > 1.08;

      const dist = Math.abs(progressU - item.waypoint.u);
      const visibility = THREE.MathUtils.clamp(1 - (dist - 0.12) / 0.14, 0, 1);

      if (isBehind || isOffscreen || visibility <= 0.02 || drawerOpen) {
        item.occluded = false;
        item.el.style.opacity = '0';
        item.el.style.pointerEvents = 'none';
        item.btn.tabIndex = -1;
        item.el.setAttribute('aria-hidden', 'true');
      } else {
        if (checkOcclusion) {
          this.dir.copy(item.anchor).sub(camera.position);
          const distToAnchor = this.dir.length();
          if (distToAnchor > 0.45) {
            this.dir.divideScalar(distToAnchor);
            this.ray.set(camera.position, this.dir);
            this.ray.far = distToAnchor - 0.35;
            this.hits.length = 0;
            this.ray.intersectObjects(this.occluders, false, this.hits);
            item.occluded = this.hits.length > 0;
          } else {
            item.occluded = false;
          }
        }

        const sx = (this.tmp.x * 0.5 + 0.5) * width;
        const sy = (-this.tmp.y * 0.5 + 0.5) * height;
        const finalOpacity = item.occluded ? Math.min(visibility, 0.18) : visibility;
        const interactive = !item.occluded && visibility > 0.35;

        item.el.classList.toggle('is-left', sx > width - 250);
        item.el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
        item.el.style.opacity = finalOpacity.toFixed(3);
        item.el.style.pointerEvents = interactive ? 'auto' : 'none';
        item.btn.tabIndex = interactive ? 0 : -1;
        item.el.setAttribute('aria-hidden', 'false');
      }
    }
  }
}
