import * as THREE from 'three';
import type { ShowroomWaypoint } from '../../data/site';
import { studioAudio } from '../audio';

export type ActivePinItem = {
  waypoint: ShowroomWaypoint;
  anchor: THREE.Vector3;
  el: HTMLElement;
  btn: HTMLButtonElement;
};

export class SpatialPins {
  private items: ActivePinItem[] = [];
  private tmp = new THREE.Vector3();

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
      this.items.push({ waypoint: wp, anchor, el, btn });
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
    for (const item of this.items) {
      this.tmp.copy(item.anchor).project(camera);

      const isBehind = this.tmp.z > 1.0 || this.tmp.z < -1.0;
      const isOffscreen = Math.abs(this.tmp.x) > 1.08 || Math.abs(this.tmp.y) > 1.08;

      // Smooth fade window around waypoint u so pins arrive organically as you enter each room
      const dist = Math.abs(progressU - item.waypoint.u);
      const visibility = THREE.MathUtils.clamp(1 - (dist - 0.12) / 0.14, 0, 1);

      if (isBehind || isOffscreen || visibility <= 0.02 || drawerOpen) {
        item.el.style.opacity = '0';
        item.el.style.pointerEvents = 'none';
        item.btn.tabIndex = -1;
        item.el.setAttribute('aria-hidden', 'true');
      } else {
        const sx = (this.tmp.x * 0.5 + 0.5) * width;
        const sy = (-this.tmp.y * 0.5 + 0.5) * height;
        item.el.classList.toggle('is-left', sx > width - 250);
        item.el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
        item.el.style.opacity = visibility.toFixed(3);
        item.el.style.pointerEvents = visibility > 0.35 ? 'auto' : 'none';
        item.btn.tabIndex = visibility > 0.35 ? 0 : -1;
        item.el.setAttribute('aria-hidden', 'false');
      }
    }
  }
}
