import * as THREE from 'three';
import type { ShowroomWaypoint } from '../../data/site';

export type ResolvedWaypoint = ShowroomWaypoint & {
  railU: number;
};

export class CameraRail {
  private posCurve: THREE.CatmullRomCurve3;
  private tgtCurve: THREE.CatmullRomCurve3;
  public waypoints: ResolvedWaypoint[];

  constructor(waypoints: ShowroomWaypoint[]) {
    const camPts = waypoints.map((w) => new THREE.Vector3(...w.cam));
    const tgtPts = waypoints.map((w) => new THREE.Vector3(...w.target));

    this.posCurve = new THREE.CatmullRomCurve3(camPts, false, 'centripetal');
    this.tgtCurve = new THREE.CatmullRomCurve3(tgtPts, false, 'centripetal');

    // Remap each waypoint's canonical u to exact cumulative arc-length along posCurve
    // so clicking chapter N lands squarely on control point N with zero spline drift.
    const segmentLengths = this.computeControlPointU(camPts);
    this.waypoints = waypoints.map((w, idx) => ({
      ...w,
      railU: segmentLengths[idx],
    }));
  }

  private computeControlPointU(pts: THREE.Vector3[]): number[] {
    const n = pts.length;
    if (n <= 1) return [0];

    // Dense sample of posCurve to find closest arc-length parameter for each control point
    const samples = 400;
    const sampled: THREE.Vector3[] = [];
    for (let i = 0; i <= samples; i++) {
      sampled.push(this.posCurve.getPointAt(i / samples));
    }

    const result: number[] = [0];
    let lastBestIdx = 0;
    for (let k = 1; k < n - 1; k++) {
      let bestIdx = lastBestIdx;
      let bestDist = Infinity;
      for (let i = lastBestIdx; i <= samples; i++) {
        const d = sampled[i].distanceToSquared(pts[k]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      lastBestIdx = bestIdx;
      result.push(bestIdx / samples);
    }
    result.push(1);
    return result;
  }

  // Maps normalized scroll progress (0..1) through waypoint intervals onto curve arc-length u
  public scrollToCurveU(scrollProgress: number): number {
    const p = THREE.MathUtils.clamp(scrollProgress, 0, 1);
    const wps = this.waypoints;
    if (wps.length <= 1) return p;

    for (let i = 0; i < wps.length - 1; i++) {
      const a = wps[i];
      const b = wps[i + 1];
      if (p >= a.u && p <= b.u) {
        const span = Math.max(0.0001, b.u - a.u);
        const local = (p - a.u) / span;
        return THREE.MathUtils.lerp(a.railU, b.railU, local);
      }
    }
    return p;
  }

  public samplePosition(scrollProgress: number, out: THREE.Vector3): THREE.Vector3 {
    const curveU = this.scrollToCurveU(scrollProgress);
    return this.posCurve.getPointAt(THREE.MathUtils.clamp(curveU, 0, 1), out);
  }

  public sampleTarget(scrollProgress: number, out: THREE.Vector3): THREE.Vector3 {
    const curveU = this.scrollToCurveU(scrollProgress);
    return this.tgtCurve.getPointAt(THREE.MathUtils.clamp(curveU, 0, 1), out);
  }
}
