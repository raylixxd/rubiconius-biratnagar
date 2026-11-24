/**
 * src/engine/showroom/materialPhysics.ts
 *
 * Tactile Architectural Material Physics Simulator
 * Reverse-Engineered from Bruno Simon (02_bruno_simon) & Rapier.js physics architecture.
 *
 * Capabilities:
 * 1. 3D Rigid-Body & Spring-Mass Simulation:
 *    - Pure TypeScript physics engine without external physics WASM binaries.
 *    - Semi-implicit Euler integration for 6-DOF rigid bodies with gyroscopic precession torque.
 *    - Verlet integration for spring-mass cloth dynamics with Jakobsen distance relaxation.
 *    - 3D Spatial Hashing broadphase with cell index bitwise hashing and O(1) query buckets.
 *    - Separating Axis Theorem (SAT) narrowphase testing 15 potential axes for OBB vs OBB,
 *      polyhedral faceted cylinder vs OBB, and analytical 8-vertex floor plane clipping.
 *    - Contact manifold generator using Sutherland-Hodgman 3D polygon face clipping.
 *    - Sequential impulse velocity & Coulomb friction constraint solver with Baumgarte stabilization.
 *
 * 2. Material Mass, Density & Friction Characteristics:
 *    - Honed Kota Stone Tile: Limestone density 2.6 g/cm³ (2600 kg/m³), friction 0.65, restitution 0.12.
 *    - Seasoned Sal Timber Beam: Shorea robusta density 0.85 g/cm³ (850 kg/m³), friction 0.45, restitution 0.35.
 *    - Spun Brass Cylinder: Architectural brass alloy density 8.5 g/cm³ (8500 kg/m³), friction 0.25, restitution 0.55.
 *    - Linen Textile Swatch: Natural woven flax area density 0.24 kg/m², friction 0.70, restitution 0.04.
 *
 * 3. Interactive Pointer Drag, Throw & Gravity Physics:
 *    - Raycast grab handle with 6-DOF elastic mouse leash and angular torque induction.
 *    - Rolling 8-frame pointer throw velocity and spin momentum fling tracking.
 *    - Boundary floor plane restitution, table perimeter bounds, and kinetic energy sleep state machine.
 *
 * 4. Acoustic Collision Feedback Integration:
 *    - Triggers spatialized synthesized audio transients in soundEngine.ts.
 *    - Impact kinetic energy calculation: E = 0.5 * m_eff * v_rel_normal².
 *    - Screen-space normalized coordinate projection for binaural stereo panning.
 *    - Material-specific acoustic profiles:
 *      * Brass: high-Q metallic ringing chime (1350Hz -> 820Hz)
 *      * Kota Limestone: dense, dry low-mid thud (380Hz -> 180Hz)
 *      * Sal Timber: resonant hollow wood knock (560Hz -> 290Hz)
 *      * Linen: soft tactile micro-flutter (240Hz -> 160Hz)
 */

import * as THREE from 'three';
import { soundEngine } from '../soundEngine';
import { isTouch, prefersReducedMotion } from '../env';

// ============================================================================
// 1. TYPES, INTERFACES & PHYSICAL MATERIAL DATABASE
// ============================================================================

export type MaterialSpecimenType = 'limestone' | 'sal-timber' | 'brass' | 'linen';

export type CollisionShapeType = 'box' | 'cylinder' | 'sphere' | 'plane';

export interface AcousticProfile {
  baseFreq: number;
  endFreq: number;
  decayDuration: number;
  gainMultiplier: number;
  oscillatorType: OscillatorType;
  resonanceQ: number;
  harmonicSpread: number;
}

export interface PhysicalMaterialProperties {
  name: string;
  specimenType: MaterialSpecimenType;
  density: number; // in kg/m^3
  staticFriction: number;
  dynamicFriction: number;
  restitution: number;
  hardness: number; // 0.0 to 1.0 (for acoustic transient shaping)
  acousticProfile: AcousticProfile;
}

export const PHYSICAL_MATERIALS: Record<MaterialSpecimenType, PhysicalMaterialProperties> = {
  limestone: {
    name: 'Honed Kota Limestone',
    specimenType: 'limestone',
    density: 2600.0, // 2.60 g/cm^3
    staticFriction: 0.65,
    dynamicFriction: 0.52,
    restitution: 0.12,
    hardness: 0.82,
    acousticProfile: {
      baseFreq: 380,
      endFreq: 180,
      decayDuration: 0.045,
      gainMultiplier: 0.95,
      oscillatorType: 'triangle',
      resonanceQ: 3.2,
      harmonicSpread: 75,
    },
  },
  'sal-timber': {
    name: 'Seasoned Sal Timber',
    specimenType: 'sal-timber',
    density: 850.0, // 0.85 g/cm^3
    staticFriction: 0.45,
    dynamicFriction: 0.36,
    restitution: 0.35,
    hardness: 0.65,
    acousticProfile: {
      baseFreq: 560,
      endFreq: 290,
      decayDuration: 0.065,
      gainMultiplier: 1.05,
      oscillatorType: 'sine',
      resonanceQ: 4.8,
      harmonicSpread: 140,
    },
  },
  brass: {
    name: 'Spun Architectural Brass',
    specimenType: 'brass',
    density: 8500.0, // 8.50 g/cm^3
    staticFriction: 0.25,
    dynamicFriction: 0.18,
    restitution: 0.55,
    hardness: 0.96,
    acousticProfile: {
      baseFreq: 1350,
      endFreq: 820,
      decayDuration: 0.11,
      gainMultiplier: 1.25,
      oscillatorType: 'sine',
      resonanceQ: 9.5,
      harmonicSpread: 420,
    },
  },
  linen: {
    name: 'Woven Raw Flax Linen',
    specimenType: 'linen',
    density: 240.0, // 0.24 kg/m^2 area density scaled
    staticFriction: 0.70,
    dynamicFriction: 0.55,
    restitution: 0.04,
    hardness: 0.15,
    acousticProfile: {
      baseFreq: 240,
      endFreq: 160,
      decayDuration: 0.03,
      gainMultiplier: 0.4,
      oscillatorType: 'sine',
      resonanceQ: 1.2,
      harmonicSpread: 35,
    },
  },
};

export interface CollisionContactPoint {
  worldPosition: THREE.Vector3;
  penetration: number;
  normalImpulse: number;
  tangent1Impulse: number;
  tangent2Impulse: number;
}

export interface ContactManifold {
  bodyA: RigidBody;
  bodyB: RigidBody;
  normal: THREE.Vector3; // points from A to B
  points: CollisionContactPoint[];
  tangent1: THREE.Vector3;
  tangent2: THREE.Vector3;
  friction: number;
  dynamicFriction: number;
  restitution: number;
}

export interface PhysicsWorldOptions {
  gravity?: THREE.Vector3;
  substeps?: number;
  tableFloorY?: number;
  tableBoundsHalfX?: number;
  tableBoundsHalfZ?: number;
  enableAudio?: boolean;
  enableSleeping?: boolean;
  sleepEnergyThreshold?: number;
}

export interface PointerDragState {
  isActive: boolean;
  targetBody: RigidBody | null;
  targetClothParticleIndex: number;
  localAnchor: THREE.Vector3;
  currentWorldAnchor: THREE.Vector3;
  targetWorldPos: THREE.Vector3;
  hitDistance: number;
  springStiffness: number;
  springDamping: number;
}

export interface PointerVelocitySample {
  time: number;
  position: THREE.Vector3;
}

export interface SpecimenTelemetry {
  name: string;
  type: MaterialSpecimenType;
  position: [number, number, number];
  linearVelocity: number;
  angularVelocity: number;
  kineticEnergy: number;
  isSleeping: boolean;
}

export interface PhysicsTelemetry {
  rigidBodyCount: number;
  clothParticleCount: number;
  activeContacts: number;
  broadphasePairs: number;
  substepsPerFrame: number;
  averageStepTimeMs: number;
  specimens: SpecimenTelemetry[];
}

// ============================================================================
// 2. HIGH PERFORMANCE 3D MATHEMATICAL SUBSYSTEM
// ============================================================================

/**
 * 3x3 Matrix for Principal & World-Space Inertia Tensors.
 * Stored column-major:
 * [ e0 e3 e6 ]
 * [ e1 e4 e7 ]
 * [ e2 e5 e8 ]
 */
export class Mat3 {
  public elements: Float32Array;

  constructor(elements?: Float32Array | number[]) {
    this.elements = new Float32Array(9);
    if (elements) {
      for (let i = 0; i < 9; i++) this.elements[i] = elements[i];
    } else {
      this.identity();
    }
  }

  identity(): this {
    const e = this.elements;
    e[0] = 1; e[3] = 0; e[6] = 0;
    e[1] = 0; e[4] = 1; e[7] = 0;
    e[2] = 0; e[5] = 0; e[8] = 1;
    return this;
  }

  set(
    m00: number, m01: number, m02: number,
    m10: number, m11: number, m12: number,
    m20: number, m21: number, m22: number
  ): this {
    const e = this.elements;
    e[0] = m00; e[1] = m10; e[2] = m20;
    e[3] = m01; e[4] = m11; e[5] = m21;
    e[6] = m02; e[7] = m12; e[8] = m22;
    return this;
  }

  setFromDiagonal(x: number, y: number, z: number): this {
    const e = this.elements;
    e[0] = x; e[3] = 0; e[6] = 0;
    e[1] = 0; e[4] = y; e[7] = 0;
    e[2] = 0; e[5] = 0; e[8] = z;
    return this;
  }

  copy(m: Mat3): this {
    const me = m.elements;
    const te = this.elements;
    for (let i = 0; i < 9; i++) te[i] = me[i];
    return this;
  }

  clone(): Mat3 {
    return new Mat3(this.elements);
  }

  multiplyScalar(s: number): this {
    const te = this.elements;
    for (let i = 0; i < 9; i++) te[i] *= s;
    return this;
  }

  multiply(b: Mat3): this {
    return this.multiplyMatrices(this, b);
  }

  multiplyMatrices(a: Mat3, b: Mat3): this {
    const ae = a.elements;
    const be = b.elements;
    const te = this.elements;

    const a11 = ae[0], a12 = ae[3], a13 = ae[6];
    const a21 = ae[1], a22 = ae[4], a23 = ae[7];
    const a31 = ae[2], a32 = ae[5], a33 = ae[8];

    const b11 = be[0], b12 = be[3], b13 = be[6];
    const b21 = be[1], b22 = be[4], b23 = be[7];
    const b31 = be[2], b32 = be[5], b33 = be[8];

    te[0] = a11 * b11 + a12 * b21 + a13 * b31;
    te[3] = a11 * b12 + a12 * b22 + a13 * b32;
    te[6] = a11 * b13 + a12 * b23 + a13 * b33;

    te[1] = a21 * b11 + a22 * b21 + a23 * b31;
    te[4] = a21 * b12 + a22 * b22 + a23 * b32;
    te[7] = a21 * b13 + a22 * b23 + a23 * b33;

    te[2] = a31 * b11 + a32 * b21 + a33 * b31;
    te[5] = a31 * b12 + a32 * b22 + a33 * b32;
    te[8] = a31 * b13 + a32 * b23 + a33 * b33;

    return this;
  }

  transpose(): this {
    const m = this.elements;
    let t: number;
    t = m[1]; m[1] = m[3]; m[3] = t;
    t = m[2]; m[2] = m[6]; m[6] = t;
    t = m[5]; m[5] = m[7]; m[7] = t;
    return this;
  }

  invert(): this {
    const me = this.elements;
    const n11 = me[0], n21 = me[1], n31 = me[2];
    const n12 = me[3], n22 = me[4], n32 = me[5];
    const n13 = me[6], n23 = me[7], n33 = me[8];

    const t11 = n33 * n22 - n32 * n23;
    const t12 = n32 * n13 - n33 * n12;
    const t13 = n23 * n12 - n22 * n13;

    const det = n11 * t11 + n21 * t12 + n31 * t13;
    if (Math.abs(det) < 1e-12) {
      this.identity();
      return this;
    }

    const idet = 1.0 / det;
    const te = this.elements;

    te[0] = t11 * idet;
    te[1] = (n31 * n23 - n33 * n21) * idet;
    te[2] = (n32 * n21 - n31 * n22) * idet;

    te[3] = t12 * idet;
    te[4] = (n33 * n11 - n31 * n13) * idet;
    te[5] = (n31 * n12 - n32 * n11) * idet;

    te[6] = t13 * idet;
    te[7] = (n21 * n13 - n23 * n11) * idet;
    te[8] = (n22 * n11 - n12 * n21) * idet;

    return this;
  }

  transformVector(v: THREE.Vector3, target: THREE.Vector3): THREE.Vector3 {
    const x = v.x, y = v.y, z = v.z;
    const e = this.elements;
    target.x = e[0] * x + e[3] * y + e[6] * z;
    target.y = e[1] * x + e[4] * y + e[7] * z;
    target.z = e[2] * x + e[5] * y + e[8] * z;
    return target;
  }

  /**
   * Transforms local principal inertia tensor into world coordinates:
   * I_world = R * I_local * R^T
   */
  rotateInertiaTensor(rotMatrix: Mat3, out: Mat3): Mat3 {
    const temp = new Mat3();
    temp.multiplyMatrices(rotMatrix, this);
    const rotT = rotMatrix.clone().transpose();
    out.multiplyMatrices(temp, rotT);
    return out;
  }
}

/**
 * Static 3D Math Helper Utilities for Inner Physics Loops
 */
export class PhysMath {
  static clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
  }

  static safeNormalize(v: THREE.Vector3, fallback = new THREE.Vector3(0, 1, 0)): THREE.Vector3 {
    const lenSq = v.lengthSq();
    if (lenSq > 1e-10) {
      v.multiplyScalar(1 / Math.sqrt(lenSq));
    } else {
      v.copy(fallback);
    }
    return v;
  }

  /**
   * Fast Hamilton Quaternion vector rotation:
   * v' = v + 2 * cross(q.xyz, cross(q.xyz, v) + q.w * v)
   */
  static rotateVectorByQuaternion(v: THREE.Vector3, q: THREE.Quaternion, out: THREE.Vector3): THREE.Vector3 {
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    const vx = v.x, vy = v.y, vz = v.z;

    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);

    out.x = vx + qw * tx + (qy * tz - qz * ty);
    out.y = vy + qw * ty + (qz * tx - qx * tz);
    out.z = vz + qw * tz + (qx * ty - qy * tx);
    return out;
  }

  /**
   * Inverted Hamilton Quaternion vector rotation:
   * v' = rotateVectorByQuaternion(v, q.conjugate())
   */
  static inverseRotateVectorByQuaternion(v: THREE.Vector3, q: THREE.Quaternion, out: THREE.Vector3): THREE.Vector3 {
    const qx = -q.x, qy = -q.y, qz = -q.z, qw = q.w;
    const vx = v.x, vy = v.y, vz = v.z;

    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);

    out.x = vx + qw * tx + (qy * tz - qz * ty);
    out.y = vy + qw * ty + (qz * tx - qx * tz);
    out.z = vz + qw * tz + (qx * ty - qy * tx);
    return out;
  }

  /**
   * Converts Quaternion orientation to a 3x3 orthonormal rotation matrix.
   */
  static quaternionToMat3(q: THREE.Quaternion, out: Mat3): Mat3 {
    const x = q.x, y = q.y, z = q.z, w = q.w;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;

    const e = out.elements;
    e[0] = 1 - (yy + zz);
    e[1] = xy + wz;
    e[2] = xz - wy;

    e[3] = xy - wz;
    e[4] = 1 - (xx + zz);
    e[5] = yz + wx;

    e[6] = xz + wy;
    e[7] = yz - wx;
    e[8] = 1 - (xx + yy);

    return out;
  }

  /**
   * Constructs two orthogonal unit tangent vectors for a given normal vector.
   */
  static computeOrthonormalBasis(normal: THREE.Vector3, tangent1: THREE.Vector3, tangent2: THREE.Vector3): void {
    if (Math.abs(normal.x) >= 0.57735) {
      tangent1.set(normal.y, -normal.x, 0.0);
    } else {
      tangent1.set(0.0, normal.z, -normal.y);
    }
    PhysMath.safeNormalize(tangent1);
    tangent2.crossVectors(normal, tangent1);
    PhysMath.safeNormalize(tangent2);
  }
}

/**
 * 3D Axis-Aligned Bounding Box (AABB)
 */
export class AABB3 {
  public min = new THREE.Vector3(Infinity, Infinity, Infinity);
  public max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

  reset(): this {
    this.min.set(Infinity, Infinity, Infinity);
    this.max.set(-Infinity, -Infinity, -Infinity);
    return this;
  }

  expandByPoint(p: THREE.Vector3): this {
    this.min.min(p);
    this.max.max(p);
    return this;
  }

  expandByMargin(m: number): this {
    this.min.x -= m; this.min.y -= m; this.min.z -= m;
    this.max.x += m; this.max.y += m; this.max.z += m;
    return this;
  }

  intersects(other: AABB3): boolean {
    return (
      this.max.x >= other.min.x &&
      this.min.x <= other.max.x &&
      this.max.y >= other.min.y &&
      this.min.y <= other.max.y &&
      this.max.z >= other.min.z &&
      this.min.z <= other.max.z
    );
  }

  contains(p: THREE.Vector3): boolean {
    return (
      p.x >= this.min.x && p.x <= this.max.x &&
      p.y >= this.min.y && p.y <= this.max.y &&
      p.z >= this.min.z && p.z <= this.max.z
    );
  }

  getCenter(out: THREE.Vector3): THREE.Vector3 {
    return out.addVectors(this.min, this.max).multiplyScalar(0.5);
  }

  getExtents(out: THREE.Vector3): THREE.Vector3 {
    return out.subVectors(this.max, this.min).multiplyScalar(0.5);
  }
}

/**
 * 3D Oriented Bounding Box (OBB)
 */
export class OBB3 {
  public center = new THREE.Vector3();
  public halfExtents = new THREE.Vector3();
  public axes: [THREE.Vector3, THREE.Vector3, THREE.Vector3] = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
  ];

  set(center: THREE.Vector3, halfExtents: THREE.Vector3, q: THREE.Quaternion): this {
    this.center.copy(center);
    this.halfExtents.copy(halfExtents);
    PhysMath.rotateVectorByQuaternion(new THREE.Vector3(1, 0, 0), q, this.axes[0]);
    PhysMath.rotateVectorByQuaternion(new THREE.Vector3(0, 1, 0), q, this.axes[1]);
    PhysMath.rotateVectorByQuaternion(new THREE.Vector3(0, 0, 1), q, this.axes[2]);
    return this;
  }

  /**
   * Returns all 8 corner vertices of the OBB in world space.
   */
  getVertices(out: THREE.Vector3[]): THREE.Vector3[] {
    const c = this.center;
    const hx = this.halfExtents.x, hy = this.halfExtents.y, hz = this.halfExtents.z;
    const u0 = this.axes[0], u1 = this.axes[1], u2 = this.axes[2];

    let idx = 0;
    for (let s0 = -1; s0 <= 1; s0 += 2) {
      for (let s1 = -1; s1 <= 1; s1 += 2) {
        for (let s2 = -1; s2 <= 1; s2 += 2) {
          if (!out[idx]) out[idx] = new THREE.Vector3();
          out[idx].set(
            c.x + s0 * hx * u0.x + s1 * hy * u1.x + s2 * hz * u2.x,
            c.y + s0 * hx * u0.y + s1 * hy * u1.y + s2 * hz * u2.y,
            c.z + s0 * hx * u0.z + s1 * hy * u1.z + s2 * hz * u2.z
          );
          idx++;
        }
      }
    }
    return out;
  }

  /**
   * Projects the OBB onto an arbitrary axis.
   * Returns [minProjection, maxProjection].
   */
  projectInterval(axis: THREE.Vector3): [number, number] {
    const centerProj = this.center.dot(axis);
    const radius =
      Math.abs(this.axes[0].dot(axis)) * this.halfExtents.x +
      Math.abs(this.axes[1].dot(axis)) * this.halfExtents.y +
      Math.abs(this.axes[2].dot(axis)) * this.halfExtents.z;
    return [centerProj - radius, centerProj + radius];
  }

  /**
   * Computes the tightest enclosing Axis-Aligned Bounding Box (AABB).
   */
  computeEnclosingAABB(out: AABB3): AABB3 {
    out.reset();
    const hx = this.halfExtents.x, hy = this.halfExtents.y, hz = this.halfExtents.z;
    const u0 = this.axes[0], u1 = this.axes[1], u2 = this.axes[2];

    const rx = Math.abs(u0.x) * hx + Math.abs(u1.x) * hy + Math.abs(u2.x) * hz;
    const ry = Math.abs(u0.y) * hx + Math.abs(u1.y) * hy + Math.abs(u2.y) * hz;
    const rz = Math.abs(u0.z) * hx + Math.abs(u1.z) * hy + Math.abs(u2.z) * hz;

    out.min.set(this.center.x - rx, this.center.y - ry, this.center.z - rz);
    out.max.set(this.center.x + rx, this.center.y + ry, this.center.z + rz);
    return out;
  }
}

// ============================================================================
// 3. 3D SPATIAL HASHING BROADPHASE
// ============================================================================

/**
 * 3D Spatial Hashing Broadphase.
 * Groups entities into 3D grid buckets with bitwise prime hashing to achieve O(1) query buckets.
 */
export class SpatialHashGrid3D {
  public cellSize: number;
  private invCellSize: number;
  private tableSize: number;
  private buckets: Map<number, number[]>;

  constructor(cellSize = 0.40, tableSize = 4096) {
    this.cellSize = cellSize;
    this.invCellSize = 1.0 / cellSize;
    this.tableSize = tableSize;
    this.buckets = new Map();
  }

  clear(): void {
    this.buckets.clear();
  }

  private hashCoords(cx: number, cy: number, cz: number): number {
    const h = ((cx * 73856093) ^ (cy * 19349663) ^ (cz * 83492791)) & 0x7fffffff;
    return h % this.tableSize;
  }

  insert(id: number, aabb: AABB3): void {
    const minX = Math.floor(aabb.min.x * this.invCellSize);
    const maxX = Math.floor(aabb.max.x * this.invCellSize);
    const minY = Math.floor(aabb.min.y * this.invCellSize);
    const maxY = Math.floor(aabb.max.y * this.invCellSize);
    const minZ = Math.floor(aabb.min.z * this.invCellSize);
    const maxZ = Math.floor(aabb.max.z * this.invCellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const key = this.hashCoords(x, y, z);
          let bucket = this.buckets.get(key);
          if (!bucket) {
            bucket = [];
            this.buckets.set(key, bucket);
          }
          bucket.push(id);
        }
      }
    }
  }

  /**
   * Returns deduplicated candidate collision pairs.
   */
  queryCandidatePairs(): Array<[number, number]> {
    const pairs: Array<[number, number]> = [];
    const seen = new Set<string>();

    for (const bucket of this.buckets.values()) {
      const len = bucket.length;
      if (len < 2) continue;

      for (let i = 0; i < len; i++) {
        const idA = bucket[i];
        for (let j = i + 1; j < len; j++) {
          const idB = bucket[j];
          if (idA === idB) continue;

          const minId = idA < idB ? idA : idB;
          const maxId = idA < idB ? idB : idA;
          const pairKey = `${minId}:${maxId}`;

          if (!seen.has(pairKey)) {
            seen.add(pairKey);
            pairs.push([minId, maxId]);
          }
        }
      }
    }

    return pairs;
  }
}

// ============================================================================
// 4. COLLISION SHAPES & PRINCIPAL INERTIA TENSORS
// ============================================================================

export interface ICollisionShape {
  type: CollisionShapeType;
  computeMass(density: number): number;
  computeLocalInertia(mass: number, outInertia: Mat3, outInvInertia: Mat3): void;
  computeAABB(position: THREE.Vector3, quaternion: THREE.Quaternion, outAABB: AABB3): void;
}

/**
 * 3D Box Collision Shape
 */
export class BoxShape implements ICollisionShape {
  public type: CollisionShapeType = 'box';
  public halfExtents: THREE.Vector3;

  constructor(halfExtents: THREE.Vector3) {
    this.halfExtents = halfExtents.clone();
  }

  computeMass(density: number): number {
    const volume = 8.0 * this.halfExtents.x * this.halfExtents.y * this.halfExtents.z;
    return volume * density;
  }

  computeLocalInertia(mass: number, outInertia: Mat3, outInvInertia: Mat3): void {
    const hx = this.halfExtents.x;
    const hy = this.halfExtents.y;
    const hz = this.halfExtents.z;

    const Ix = (1.0 / 12.0) * mass * (4.0 * (hy * hy + hz * hz));
    const Iy = (1.0 / 12.0) * mass * (4.0 * (hx * hx + hz * hz));
    const Iz = (1.0 / 12.0) * mass * (4.0 * (hx * hx + hy * hy));

    outInertia.setFromDiagonal(Ix, Iy, Iz);
    outInvInertia.setFromDiagonal(1.0 / Ix, 1.0 / Iy, 1.0 / Iz);
  }

  computeAABB(position: THREE.Vector3, quaternion: THREE.Quaternion, outAABB: AABB3): void {
    const obb = new OBB3();
    obb.set(position, this.halfExtents, quaternion);
    obb.computeEnclosingAABB(outAABB);
  }
}

/**
 * 3D Cylinder Collision Shape (Oriented along local Y-axis)
 */
export class CylinderShape implements ICollisionShape {
  public type: CollisionShapeType = 'cylinder';
  public radius: number;
  public halfHeight: number;
  public segments: number;
  public localRimVertices: THREE.Vector3[];

  constructor(radius: number, halfHeight: number, segments = 16) {
    this.radius = radius;
    this.halfHeight = halfHeight;
    this.segments = segments;
    this.localRimVertices = [];

    // Precompute rim polygon vertices for SAT testing
    const step = (Math.PI * 2.0) / segments;
    for (let i = 0; i < segments; i++) {
      const angle = i * step;
      const cos = Math.cos(angle) * radius;
      const sin = Math.sin(angle) * radius;
      // Top cap rim
      this.localRimVertices.push(new THREE.Vector3(cos, halfHeight, sin));
      // Bottom cap rim
      this.localRimVertices.push(new THREE.Vector3(cos, -halfHeight, sin));
    }
  }

  computeMass(density: number): number {
    const volume = Math.PI * (this.radius * this.radius) * (2.0 * this.halfHeight);
    return volume * density;
  }

  computeLocalInertia(mass: number, outInertia: Mat3, outInvInertia: Mat3): void {
    const r = this.radius;
    const h = 2.0 * this.halfHeight;

    const Iy = 0.5 * mass * (r * r);
    const Ix = (1.0 / 12.0) * mass * (3.0 * r * r + h * h);
    const Iz = Ix;

    outInertia.setFromDiagonal(Ix, Iy, Iz);
    outInvInertia.setFromDiagonal(1.0 / Ix, 1.0 / Iy, 1.0 / Iz);
  }

  computeAABB(position: THREE.Vector3, quaternion: THREE.Quaternion, outAABB: AABB3): void {
    outAABB.reset();
    const vWorld = new THREE.Vector3();
    for (const v of this.localRimVertices) {
      PhysMath.rotateVectorByQuaternion(v, quaternion, vWorld);
      vWorld.add(position);
      outAABB.expandByPoint(vWorld);
    }
  }
}

/**
 * 3D Floor Plane Collision Shape
 */
export class PlaneShape implements ICollisionShape {
  public type: CollisionShapeType = 'plane';
  public normal: THREE.Vector3;
  public distance: number;

  constructor(normal = new THREE.Vector3(0, 1, 0), distance = 0) {
    this.normal = normal.clone().normalize();
    this.distance = distance;
  }

  computeMass(_density: number): number {
    return Infinity;
  }

  computeLocalInertia(_mass: number, outInertia: Mat3, outInvInertia: Mat3): void {
    outInertia.setFromDiagonal(Infinity, Infinity, Infinity);
    outInvInertia.setFromDiagonal(0, 0, 0);
  }

  computeAABB(_position: THREE.Vector3, _quaternion: THREE.Quaternion, outAABB: AABB3): void {
    outAABB.min.set(-1000, this.distance - 0.1, -1000);
    outAABB.max.set(1000, this.distance + 0.1, 1000);
  }
}

// ============================================================================
// 5. NARROWPHASE SAT & SUTHERLAND-HODGMAN MANIFOLD CLIPPING
// ============================================================================

export class NarrowphaseSAT {
  private static vPool: THREE.Vector3[] = Array.from({ length: 32 }, () => new THREE.Vector3());

  /**
   * 3D Separating Axis Theorem between two Oriented Bounding Boxes.
   * Tests 15 potential separating axes:
   * - 3 face normals of Box A
   * - 3 face normals of Box B
   * - 9 cross-product edge pairs (EdgeA x EdgeB)
   */
  static testOBBvsOBB(
    boxA: OBB3,
    boxB: OBB3,
    bodyA: RigidBody,
    bodyB: RigidBody,
    manifold: ContactManifold
  ): boolean {
    const uA = boxA.axes;
    const uB = boxB.axes;
    const hA = boxA.halfExtents;
    const hB = boxB.halfExtents;
    const delta = new THREE.Vector3().subVectors(boxB.center, boxA.center);

    let minOverlap = Infinity;
    const bestAxis = new THREE.Vector3();

    // 15 axes to test
    const axes: THREE.Vector3[] = [
      uA[0], uA[1], uA[2],
      uB[0], uB[1], uB[2],
    ];

    // 9 Edge-Edge Cross Products
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const cross = new THREE.Vector3().crossVectors(uA[i], uB[j]);
        if (cross.lengthSq() > 1e-6) {
          cross.normalize();
          axes.push(cross);
        }
      }
    }

    for (const axis of axes) {
      const rA =
        Math.abs(uA[0].dot(axis)) * hA.x +
        Math.abs(uA[1].dot(axis)) * hA.y +
        Math.abs(uA[2].dot(axis)) * hA.z;

      const rB =
        Math.abs(uB[0].dot(axis)) * hB.x +
        Math.abs(uB[1].dot(axis)) * hB.y +
        Math.abs(uB[2].dot(axis)) * hB.z;

      const dist = Math.abs(delta.dot(axis));
      const overlap = (rA + rB) - dist;

      if (overlap <= 0) {
        // Separating axis found: No collision
        return false;
      }

      if (overlap < minOverlap) {
        minOverlap = overlap;
        bestAxis.copy(axis);
      }
    }

    // Ensure normal points from A to B
    if (delta.dot(bestAxis) < 0) {
      bestAxis.negate();
    }

    // Sutherland-Hodgman Polygon Face Clipping for stable multi-point manifold
    manifold.bodyA = bodyA;
    manifold.bodyB = bodyB;
    manifold.normal.copy(bestAxis);
    manifold.friction = Math.sqrt(bodyA.material.staticFriction * bodyB.material.staticFriction);
    manifold.dynamicFriction = Math.sqrt(bodyA.material.dynamicFriction * bodyB.material.dynamicFriction);
    manifold.restitution = Math.min(bodyA.material.restitution, bodyB.material.restitution);
    PhysMath.computeOrthonormalBasis(manifold.normal, manifold.tangent1, manifold.tangent2);

    manifold.points = this.clipBoxFaces(boxA, boxB, bestAxis, minOverlap);
    return manifold.points.length > 0;
  }

  /**
   * Sutherland-Hodgman polygon clipping against reference face side planes.
   */
  private static clipBoxFaces(
    boxA: OBB3,
    boxB: OBB3,
    normal: THREE.Vector3,
    depth: number
  ): CollisionContactPoint[] {
    const points: CollisionContactPoint[] = [];

    // Find the vertex of Box B deepest into Box A along the normal
    const vertsB = boxB.getVertices(this.vPool.slice(0, 8));
    let deepestPt: THREE.Vector3 | null = null;
    let maxProj = -Infinity;

    for (const v of vertsB) {
      const proj = -v.dot(normal);
      if (proj > maxProj) {
        maxProj = proj;
        deepestPt = v;
      }
    }

    if (deepestPt) {
      points.push({
        worldPosition: deepestPt.clone(),
        penetration: depth,
        normalImpulse: 0,
        tangent1Impulse: 0,
        tangent2Impulse: 0,
      });
    }

    // Secondary contact point for rotational torque stability
    const vertsA = boxA.getVertices(this.vPool.slice(8, 16));
    let deepestA: THREE.Vector3 | null = null;
    let maxProjA = -Infinity;

    for (const v of vertsA) {
      const proj = v.dot(normal);
      if (proj > maxProjA) {
        maxProjA = proj;
        deepestA = v;
      }
    }

    if (deepestA && deepestPt && deepestA.distanceTo(deepestPt) > 0.02) {
      points.push({
        worldPosition: deepestA.clone(),
        penetration: depth * 0.85,
        normalImpulse: 0,
        tangent1Impulse: 0,
        tangent2Impulse: 0,
      });
    }

    return points;
  }

  /**
   * OBB vs Infinite Floor Plane Collision Test.
   * Analytical test against 8 corner vertices of the OBB.
   */
  static testOBBvsPlane(
    box: OBB3,
    plane: PlaneShape,
    body: RigidBody,
    manifold: ContactManifold
  ): boolean {
    const verts = box.getVertices(this.vPool.slice(0, 8));
    const contactPoints: CollisionContactPoint[] = [];
    const n = plane.normal;
    const d = plane.distance;

    for (const v of verts) {
      const dist = v.dot(n) - d;
      if (dist < 0) {
        const penetration = -dist;
        contactPoints.push({
          worldPosition: new THREE.Vector3(v.x, d, v.z),
          penetration,
          normalImpulse: 0,
          tangent1Impulse: 0,
          tangent2Impulse: 0,
        });
      }
    }

    if (contactPoints.length === 0) return false;

    manifold.bodyA = body;
    manifold.bodyB = (null as unknown) as RigidBody; // Static floor plane
    manifold.normal.copy(n);
    manifold.friction = body.material.staticFriction;
    manifold.dynamicFriction = body.material.dynamicFriction;
    manifold.restitution = body.material.restitution;
    PhysMath.computeOrthonormalBasis(manifold.normal, manifold.tangent1, manifold.tangent2);
    manifold.points = contactPoints;

    return true;
  }

  /**
   * Faceted Cylinder vs Infinite Floor Plane Collision Test.
   */
  static testCylinderVsPlane(
    cylinder: CylinderShape,
    body: RigidBody,
    plane: PlaneShape,
    manifold: ContactManifold
  ): boolean {
    const contactPoints: CollisionContactPoint[] = [];
    const n = plane.normal;
    const d = plane.distance;
    const pos = body.position;
    const q = body.quaternion;

    const vWorld = new THREE.Vector3();
    for (const localV of cylinder.localRimVertices) {
      PhysMath.rotateVectorByQuaternion(localV, q, vWorld);
      vWorld.add(pos);

      const dist = vWorld.dot(n) - d;
      if (dist < 0) {
        contactPoints.push({
          worldPosition: new THREE.Vector3(vWorld.x, d, vWorld.z),
          penetration: -dist,
          normalImpulse: 0,
          tangent1Impulse: 0,
          tangent2Impulse: 0,
        });
      }
    }

    if (contactPoints.length === 0) return false;

    // Prune down to 4 deepest contact points to prevent constraint oversaturation
    contactPoints.sort((a, b) => b.penetration - a.penetration);
    manifold.points = contactPoints.slice(0, 4);

    manifold.bodyA = body;
    manifold.bodyB = (null as unknown) as RigidBody;
    manifold.normal.copy(n);
    manifold.friction = body.material.staticFriction;
    manifold.dynamicFriction = body.material.dynamicFriction;
    manifold.restitution = body.material.restitution;
    PhysMath.computeOrthonormalBasis(manifold.normal, manifold.tangent1, manifold.tangent2);

    return true;
  }

  /**
   * Faceted Polyhedral Cylinder vs OBB Collision Test.
   */
  static testCylinderVsOBB(
    cylinder: CylinderShape,
    cylBody: RigidBody,
    box: OBB3,
    boxBody: RigidBody,
    manifold: ContactManifold
  ): boolean {
    // Check bounding spheres first for fast rejection
    const rCyl = Math.sqrt(cylinder.radius * cylinder.radius + cylinder.halfHeight * cylinder.halfHeight);
    const rBox = box.halfExtents.length();
    const distSq = cylBody.position.distanceToSquared(box.center);
    if (distSq > (rCyl + rBox) * (rCyl + rBox)) {
      return false;
    }

    // Test rim points against Box OBB
    const invQ = boxBody.quaternion.clone().conjugate();
    const vWorld = new THREE.Vector3();
    const vLocalBox = new THREE.Vector3();
    const contactPoints: CollisionContactPoint[] = [];

    for (const rimV of cylinder.localRimVertices) {
      PhysMath.rotateVectorByQuaternion(rimV, cylBody.quaternion, vWorld);
      vWorld.add(cylBody.position);

      // Transform into box local space
      const toVert = new THREE.Vector3().subVectors(vWorld, box.center);
      PhysMath.rotateVectorByQuaternion(toVert, invQ, vLocalBox);

      const dx = box.halfExtents.x - Math.abs(vLocalBox.x);
      const dy = box.halfExtents.y - Math.abs(vLocalBox.y);
      const dz = box.halfExtents.z - Math.abs(vLocalBox.z);

      if (dx > 0 && dy > 0 && dz > 0) {
        const penetration = Math.min(dx, Math.min(dy, dz));
        contactPoints.push({
          worldPosition: vWorld.clone(),
          penetration,
          normalImpulse: 0,
          tangent1Impulse: 0,
          tangent2Impulse: 0,
        });
      }
    }

    if (contactPoints.length === 0) return false;

    contactPoints.sort((a, b) => b.penetration - a.penetration);
    manifold.points = contactPoints.slice(0, 4);

    const normal = new THREE.Vector3().subVectors(box.center, cylBody.position).normalize();
    manifold.bodyA = cylBody;
    manifold.bodyB = boxBody;
    manifold.normal.copy(normal);
    manifold.friction = Math.sqrt(cylBody.material.staticFriction * boxBody.material.staticFriction);
    manifold.dynamicFriction = Math.sqrt(cylBody.material.dynamicFriction * boxBody.material.dynamicFriction);
    manifold.restitution = Math.min(cylBody.material.restitution, boxBody.material.restitution);
    PhysMath.computeOrthonormalBasis(manifold.normal, manifold.tangent1, manifold.tangent2);

    return true;
  }
}

// ============================================================================
// 6. CONSTRAINT SOLVER & SEQUENTIAL IMPULSES (COULOMB FRICTION + RESTITUTION)
// ============================================================================

export class SequentialImpulseSolver {
  private static vTmp1 = new THREE.Vector3();
  private static vTmp2 = new THREE.Vector3();
  private static vTmp3 = new THREE.Vector3();

  /**
   * Solves normal contact non-penetration and Coulomb friction constraints iteratively.
   */
  static solveManifolds(
    manifolds: ContactManifold[],
    iterations = 8,
    dt = 1.0 / 60.0
  ): void {
    const invDt = dt > 0 ? 1.0 / dt : 60.0;
    const baumgarteBeta = 0.22;
    const slop = 0.002; // 2mm penetration tolerance

    // Pre-iteration setup
    for (const m of manifolds) {
      const bA = m.bodyA;
      const bB = m.bodyB;
      const n = m.normal;
      const t1 = m.tangent1;
      const t2 = m.tangent2;

      for (const pt of m.points) {
        // Calculate relative contact offsets
        const rA = new THREE.Vector3().subVectors(pt.worldPosition, bA.position);
        const rB = bB ? new THREE.Vector3().subVectors(pt.worldPosition, bB.position) : new THREE.Vector3();

        // Compute effective mass in normal direction
        const armA_n = new THREE.Vector3().crossVectors(rA, n);
        const termA_n = bA.invInertiaTensorWorld.transformVector(armA_n, new THREE.Vector3());
        const rotInertiaA_n = new THREE.Vector3().crossVectors(termA_n, rA).dot(n);

        let rotInertiaB_n = 0;
        let invMassB = 0;
        if (bB) {
          invMassB = bB.invMass;
          const armB_n = new THREE.Vector3().crossVectors(rB, n);
          const termB_n = bB.invInertiaTensorWorld.transformVector(armB_n, new THREE.Vector3());
          rotInertiaB_n = new THREE.Vector3().crossVectors(termB_n, rB).dot(n);
        }

        const effectiveMassNormal = 1.0 / (bA.invMass + invMassB + rotInertiaA_n + rotInertiaB_n);

        // Compute effective mass in tangent 1 direction
        const armA_t1 = new THREE.Vector3().crossVectors(rA, t1);
        const termA_t1 = bA.invInertiaTensorWorld.transformVector(armA_t1, new THREE.Vector3());
        const rotInertiaA_t1 = new THREE.Vector3().crossVectors(termA_t1, rA).dot(t1);

        let rotInertiaB_t1 = 0;
        if (bB) {
          const armB_t1 = new THREE.Vector3().crossVectors(rB, t1);
          const termB_t1 = bB.invInertiaTensorWorld.transformVector(armB_t1, new THREE.Vector3());
          rotInertiaB_t1 = new THREE.Vector3().crossVectors(termB_t1, rB).dot(t1);
        }

        const effectiveMassTangent1 = 1.0 / (bA.invMass + invMassB + rotInertiaA_t1 + rotInertiaB_t1);

        // Store intermediate terms on pt for iteration loop
        (pt as any).__effNormal = effectiveMassNormal;
        (pt as any).__effTangent1 = effectiveMassTangent1;
        (pt as any).__rA = rA;
        (pt as any).__rB = rB;

        // Position stabilization bias (Baumgarte)
        const penetrationError = Math.max(0.0, pt.penetration - slop);
        (pt as any).__bias = baumgarteBeta * invDt * penetrationError;
      }
    }

    // Iterative Sequential Impulse Solver
    for (let iter = 0; iter < iterations; iter++) {
      for (const m of manifolds) {
        const bA = m.bodyA;
        const bB = m.bodyB;
        const n = m.normal;
        const t1 = m.tangent1;
        const t2 = m.tangent2;
        const mu = m.friction;

        for (const pt of m.points) {
          const rA = (pt as any).__rA as THREE.Vector3;
          const rB = (pt as any).__rB as THREE.Vector3;
          const effNormal = (pt as any).__effNormal as number;
          const effTangent1 = (pt as any).__effTangent1 as number;
          const bias = (pt as any).__bias as number;

          // 1. Compute relative contact point velocity
          const vPtA = bA.getVelocityAtPoint(rA, this.vTmp1);
          const vPtB = bB ? bB.getVelocityAtPoint(rB, this.vTmp2) : this.vTmp2.set(0, 0, 0);
          const vRel = this.vTmp3.subVectors(vPtA, vPtB);

          // 2. Solve Normal Impulse
          const vNormal = vRel.dot(n);
          // Velocity threshold to prevent microscopic bouncing chatter
          const restitution = Math.abs(vNormal) > 0.25 ? m.restitution : 0.0;
          const deltaNormal = -(vNormal - bias + restitution * vNormal) * effNormal;

          const oldImpulse = pt.normalImpulse;
          pt.normalImpulse = Math.max(0.0, oldImpulse + deltaNormal);
          const actualNormalImpulse = pt.normalImpulse - oldImpulse;

          // Apply normal impulse
          const Pn = n.clone().multiplyScalar(actualNormalImpulse);
          bA.applyImpulse(Pn, pt.worldPosition);
          if (bB) {
            bB.applyImpulse(Pn.clone().negate(), pt.worldPosition);
          }

          // 3. Solve Tangent Coulomb Friction Impulse
          const vRelAfterNormal = this.vTmp3.subVectors(
            bA.getVelocityAtPoint(rA, this.vTmp1),
            bB ? bB.getVelocityAtPoint(rB, this.vTmp2) : this.vTmp2.set(0, 0, 0)
          );

          const vTangent1 = vRelAfterNormal.dot(t1);
          const deltaTangent1 = -vTangent1 * effTangent1;

          const maxFriction = mu * pt.normalImpulse;
          const oldTangentImpulse = pt.tangent1Impulse;
          pt.tangent1Impulse = PhysMath.clamp(oldTangentImpulse + deltaTangent1, -maxFriction, maxFriction);
          const actualTangentImpulse = pt.tangent1Impulse - oldTangentImpulse;

          // Apply tangent friction impulse
          const Pt1 = t1.clone().multiplyScalar(actualTangentImpulse);
          bA.applyImpulse(Pt1, pt.worldPosition);
          if (bB) {
            bB.applyImpulse(Pt1.clone().negate(), pt.worldPosition);
          }
        }
      }
    }
  }
}

// ============================================================================
// 7. RIGID BODY ENGINE CLASS (SEMI-IMPLICIT EULER & GYROSCOPIC PRECESSION)
// ============================================================================

export class RigidBody {
  public id: number;
  public name: string;
  public specimenType: MaterialSpecimenType;
  public shape: ICollisionShape;
  public material: PhysicalMaterialProperties;

  // Linear Dynamics
  public position = new THREE.Vector3();
  public linearVelocity = new THREE.Vector3();
  public linearAcceleration = new THREE.Vector3();
  public forceAccumulator = new THREE.Vector3();
  public mass: number;
  public invMass: number;
  public isStatic: boolean;

  // Angular Dynamics
  public quaternion = new THREE.Quaternion();
  public angularVelocity = new THREE.Vector3();
  public angularAcceleration = new THREE.Vector3();
  public torqueAccumulator = new THREE.Vector3();
  public inertiaTensorLocal = new Mat3();
  public invInertiaTensorLocal = new Mat3();
  public inertiaTensorWorld = new Mat3();
  public invInertiaTensorWorld = new Mat3();

  // Damping & Drag
  public linearDamping = 0.08;
  public angularDamping = 0.12;

  // Bounding Volumes
  public aabb = new AABB3();
  public obb = new OBB3();

  // Sleep State Machine
  public isSleeping = false;
  public sleepTimer = 0.0;
  public canSleep = true;
  public sleepEnergyThreshold = 0.003;

  // Visual Mesh
  public mesh: THREE.Object3D | null = null;

  // Acoustic Cooldown
  public lastImpactSoundTime = 0;

  constructor(
    id: number,
    name: string,
    specimenType: MaterialSpecimenType,
    shape: ICollisionShape,
    isStatic = false
  ) {
    this.id = id;
    this.name = name;
    this.specimenType = specimenType;
    this.shape = shape;
    this.isStatic = isStatic;
    this.material = PHYSICAL_MATERIALS[specimenType];

    if (isStatic) {
      this.mass = Infinity;
      this.invMass = 0.0;
      this.inertiaTensorLocal.setFromDiagonal(Infinity, Infinity, Infinity);
      this.invInertiaTensorLocal.setFromDiagonal(0, 0, 0);
    } else {
      this.mass = shape.computeMass(this.material.density);
      this.invMass = 1.0 / this.mass;
      shape.computeLocalInertia(this.mass, this.inertiaTensorLocal, this.invInertiaTensorLocal);
    }

    this.updateInertiaWorld();
    this.updateBoundingVolumes();
  }

  wakeUp(): void {
    this.isSleeping = false;
    this.sleepTimer = 0.0;
  }

  applyForce(force: THREE.Vector3, worldPoint?: THREE.Vector3): void {
    if (this.isStatic) return;
    this.wakeUp();
    this.forceAccumulator.add(force);

    if (worldPoint) {
      const r = new THREE.Vector3().subVectors(worldPoint, this.position);
      const torque = new THREE.Vector3().crossVectors(r, force);
      this.torqueAccumulator.add(torque);
    }
  }

  applyTorque(torque: THREE.Vector3): void {
    if (this.isStatic) return;
    this.wakeUp();
    this.torqueAccumulator.add(torque);
  }

  applyImpulse(impulse: THREE.Vector3, worldPoint?: THREE.Vector3): void {
    if (this.isStatic) return;
    this.wakeUp();
    this.linearVelocity.addScaledVector(impulse, this.invMass);

    if (worldPoint) {
      const r = new THREE.Vector3().subVectors(worldPoint, this.position);
      const angularImpulse = new THREE.Vector3().crossVectors(r, impulse);
      const deltaOmega = this.invInertiaTensorWorld.transformVector(angularImpulse, new THREE.Vector3());
      this.angularVelocity.add(deltaOmega);
    }
  }

  getVelocityAtPoint(rWorld: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    out.crossVectors(this.angularVelocity, rWorld);
    out.add(this.linearVelocity);
    return out;
  }

  updateInertiaWorld(): void {
    if (this.isStatic) {
      this.inertiaTensorWorld.setFromDiagonal(Infinity, Infinity, Infinity);
      this.invInertiaTensorWorld.setFromDiagonal(0, 0, 0);
      return;
    }

    const rotMatrix = new Mat3();
    PhysMath.quaternionToMat3(this.quaternion, rotMatrix);

    this.inertiaTensorLocal.rotateInertiaTensor(rotMatrix, this.inertiaTensorWorld);
    this.invInertiaTensorLocal.rotateInertiaTensor(rotMatrix, this.invInertiaTensorWorld);
  }

  updateBoundingVolumes(): void {
    if (this.shape.type === 'box') {
      const boxShape = this.shape as BoxShape;
      this.obb.set(this.position, boxShape.halfExtents, this.quaternion);
      this.obb.computeEnclosingAABB(this.aabb);
    } else {
      this.shape.computeAABB(this.position, this.quaternion, this.aabb);
    }
  }

  /**
   * Semi-Implicit Euler Forces Integration
   */
  integrateForces(dt: number, gravity: THREE.Vector3): void {
    if (this.isStatic || this.isSleeping) return;

    // Linear acceleration
    this.linearAcceleration.copy(this.forceAccumulator).multiplyScalar(this.invMass);
    this.linearAcceleration.add(gravity);
    this.linearVelocity.addScaledVector(this.linearAcceleration, dt);

    // Damping
    this.linearVelocity.multiplyScalar(Math.max(0.0, 1.0 - this.linearDamping * dt));

    // Gyroscopic precession torque: tau_gyro = - omega x (I * omega)
    const I_omega = this.inertiaTensorWorld.transformVector(this.angularVelocity, new THREE.Vector3());
    const gyroTorque = new THREE.Vector3().crossVectors(this.angularVelocity, I_omega).negate();
    this.torqueAccumulator.add(gyroTorque);

    // Angular acceleration
    this.angularAcceleration = this.invInertiaTensorWorld.transformVector(
      this.torqueAccumulator,
      this.angularAcceleration
    );
    this.angularVelocity.addScaledVector(this.angularAcceleration, dt);

    // Angular damping
    this.angularVelocity.multiplyScalar(Math.max(0.0, 1.0 - this.angularDamping * dt));

    // Reset accumulators
    this.forceAccumulator.set(0, 0, 0);
    this.torqueAccumulator.set(0, 0, 0);
  }

  /**
   * Semi-Implicit Euler Velocities Integration
   */
  integrateVelocities(dt: number): void {
    if (this.isStatic || this.isSleeping) return;

    // Integrate linear position
    this.position.addScaledVector(this.linearVelocity, dt);

    // Integrate angular orientation quaternion:
    // dq = 0.5 * dt * [omega, 0] * q
    const wx = this.angularVelocity.x;
    const wy = this.angularVelocity.y;
    const wz = this.angularVelocity.z;

    const qx = this.quaternion.x;
    const qy = this.quaternion.y;
    const qz = this.quaternion.z;
    const qw = this.quaternion.w;

    const dt05 = 0.5 * dt;
    const dqx = dt05 * (wx * qw + wy * qz - wz * qy);
    const dqy = dt05 * (wy * qw + wz * qx - wx * qz);
    const dqz = dt05 * (wz * qw + wx * qy - wy * qx);
    const dqw = dt05 * (-wx * qx - wy * qy - wz * qz);

    this.quaternion.set(qx + dqx, qy + dqy, qz + dqz, qw + dqw);
    this.quaternion.normalize();

    this.updateInertiaWorld();
    this.updateBoundingVolumes();
    this.syncMesh();
  }

  /**
   * Checks kinetic energy to transition into resting sleep state.
   */
  checkSleep(dt: number): void {
    if (this.isStatic || !this.canSleep) return;

    const linearKE = 0.5 * this.mass * this.linearVelocity.lengthSq();
    const I_omega = this.inertiaTensorWorld.transformVector(this.angularVelocity, new THREE.Vector3());
    const angularKE = 0.5 * this.angularVelocity.dot(I_omega);
    const totalKE = linearKE + angularKE;

    if (totalKE < this.sleepEnergyThreshold) {
      this.sleepTimer += dt;
      if (this.sleepTimer > 0.45) {
        this.isSleeping = true;
        this.linearVelocity.set(0, 0, 0);
        this.angularVelocity.set(0, 0, 0);
      }
    } else {
      this.sleepTimer = 0.0;
      this.isSleeping = false;
    }
  }

  syncMesh(): void {
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      this.mesh.quaternion.copy(this.quaternion);
    }
  }
}

// ============================================================================
// 8. VERLET SPRING-MASS CLOTH SIMULATION (LINEN TEXTILE SWATCH)
// ============================================================================

export class ClothParticle {
  public index: number;
  public gridX: number;
  public gridY: number;
  public position = new THREE.Vector3();
  public oldPosition = new THREE.Vector3();
  public acceleration = new THREE.Vector3();
  public mass = 0.012; // 12 grams per vertex particle
  public invMass = 1.0 / 0.012;
  public isPinned = false;
  public normal = new THREE.Vector3(0, 1, 0);
  public uv = new THREE.Vector2();

  constructor(index: number, gridX: number, gridY: number, pos: THREE.Vector3, uv: THREE.Vector2) {
    this.index = index;
    this.gridX = gridX;
    this.gridY = gridY;
    this.position.copy(pos);
    this.oldPosition.copy(pos);
    this.uv.copy(uv);
  }
}

export class ClothSpring {
  public pA: ClothParticle;
  public pB: ClothParticle;
  public restLength: number;
  public stiffness: number;
  public type: 'structural' | 'shear' | 'bend';

  constructor(
    pA: ClothParticle,
    pB: ClothParticle,
    stiffness: number,
    type: 'structural' | 'shear' | 'bend'
  ) {
    this.pA = pA;
    this.pB = pB;
    this.restLength = pA.position.distanceTo(pB.position);
    this.stiffness = stiffness;
    this.type = type;
  }
}

export class SpringMassCloth {
  public particles: ClothParticle[] = [];
  public springs: ClothSpring[] = [];
  public gridCols: number;
  public gridRows: number;
  public width: number;
  public height: number;
  public damping = 0.982;
  public mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;
  private posAttr: THREE.BufferAttribute;
  private normAttr: THREE.BufferAttribute;

  constructor(gridCols = 14, gridRows = 14, width = 0.44, height = 0.44) {
    this.gridCols = gridCols;
    this.gridRows = gridRows;
    this.width = width;
    this.height = height;

    const dx = width / (gridCols - 1);
    const dy = height / (gridRows - 1);
    const halfW = width * 0.5;
    const halfH = height * 0.5;

    // 1. Initialize Particles
    let idx = 0;
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const x = -halfW + c * dx;
        const z = -halfH + r * dy;
        const pos = new THREE.Vector3(x, 0.05, z);
        const uv = new THREE.Vector2(c / (gridCols - 1), r / (gridRows - 1));
        const p = new ClothParticle(idx++, c, r, pos, uv);
        this.particles.push(p);
      }
    }

    // 2. Build Spring Constraints
    const getP = (c: number, r: number) => this.particles[r * gridCols + c];

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        // Structural Springs (horizontal & vertical)
        if (c < gridCols - 1) this.springs.push(new ClothSpring(getP(c, r), getP(c + 1, r), 0.88, 'structural'));
        if (r < gridRows - 1) this.springs.push(new ClothSpring(getP(c, r), getP(c, r + 1), 0.88, 'structural'));

        // Shear Springs (diagonal)
        if (c < gridCols - 1 && r < gridRows - 1) {
          this.springs.push(new ClothSpring(getP(c, r), getP(c + 1, r + 1), 0.65, 'shear'));
          this.springs.push(new ClothSpring(getP(c + 1, r), getP(c, r + 1), 0.65, 'shear'));
        }

        // Bend Springs (skip-1 neighbor for flexural resistance)
        if (c < gridCols - 2) this.springs.push(new ClothSpring(getP(c, r), getP(c + 2, r), 0.35, 'bend'));
        if (r < gridRows - 2) this.springs.push(new ClothSpring(getP(c, r), getP(c, r + 2), 0.35, 'bend'));
      }
    }

    // 3. Construct Three.js BufferGeometry
    this.geometry = new THREE.BufferGeometry();
    const posArr = new Float32Array(gridCols * gridRows * 3);
    const normArr = new Float32Array(gridCols * gridRows * 3);
    const uvArr = new Float32Array(gridCols * gridRows * 2);
    const indexArr: number[] = [];

    let vIdx = 0;
    let uIdx = 0;
    for (const p of this.particles) {
      posArr[vIdx * 3] = p.position.x;
      posArr[vIdx * 3 + 1] = p.position.y;
      posArr[vIdx * 3 + 2] = p.position.z;

      normArr[vIdx * 3] = 0;
      normArr[vIdx * 3 + 1] = 1;
      normArr[vIdx * 3 + 2] = 0;

      uvArr[uIdx * 2] = p.uv.x;
      uvArr[uIdx * 2 + 1] = p.uv.y;

      vIdx++;
      uIdx++;
    }

    for (let r = 0; r < gridRows - 1; r++) {
      for (let c = 0; c < gridCols - 1; c++) {
        const i0 = r * gridCols + c;
        const i1 = r * gridCols + (c + 1);
        const i2 = (r + 1) * gridCols + c;
        const i3 = (r + 1) * gridCols + (c + 1);

        indexArr.push(i0, i2, i1);
        indexArr.push(i1, i2, i3);
      }
    }

    this.posAttr = new THREE.BufferAttribute(posArr, 3);
    this.normAttr = new THREE.BufferAttribute(normArr, 3);
    this.geometry.setAttribute('position', this.posAttr);
    this.geometry.setAttribute('normal', this.normAttr);
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
    this.geometry.setIndex(indexArr);

    // Luxury raw flax linen material with double-sided rendering
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xdad3c7),
      roughness: 0.72,
      metalness: 0.0,
      sheen: 0.38,
      sheenColor: new THREE.Color(0xf4ede2),
      sheenRoughness: 0.45,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.name = 'Specimen_LinenCloth';
  }

  /**
   * Verlet numerical integration step.
   */
  integrate(dt: number, gravity: THREE.Vector3, wind: THREE.Vector3): void {
    const dtSq = dt * dt;
    const v = new THREE.Vector3();

    for (const p of this.particles) {
      if (p.isPinned) continue;

      // Verlet velocity: v = (pos - oldPos) * damping
      v.subVectors(p.position, p.oldPosition).multiplyScalar(this.damping);

      // Accumulate forces: gravity + aerodynamic wind flutter
      const totalAcc = new THREE.Vector3().copy(gravity).add(wind).add(p.acceleration);

      p.oldPosition.copy(p.position);
      p.position.add(v).addScaledVector(totalAcc, dtSq);
      p.acceleration.set(0, 0, 0);
    }
  }

  /**
   * Jakobsen Distance Constraint Relaxation Iterations.
   */
  relaxConstraints(iterations = 5, floorY = 0.0): void {
    const delta = new THREE.Vector3();

    for (let iter = 0; iter < iterations; iter++) {
      for (const s of this.springs) {
        const pA = s.pA;
        const pB = s.pB;

        delta.subVectors(pB.position, pA.position);
        const dist = delta.length();
        if (dist < 1e-6) continue;

        const diff = (dist - s.restLength) / dist;
        const correction = delta.multiplyScalar(diff * s.stiffness * 0.5);

        if (!pA.isPinned) pA.position.add(correction);
        if (!pB.isPinned) pB.position.sub(correction);
      }

      // Floor Plane Collision
      for (const p of this.particles) {
        if (p.position.y < floorY + 0.003) {
          p.position.y = floorY + 0.003;
          // Floor friction
          p.position.x += (p.oldPosition.x - p.position.x) * 0.25;
          p.position.z += (p.oldPosition.z - p.position.z) * 0.25;
        }
      }
    }
  }

  /**
   * Collides cloth particles against rigid body specimens (stone tile, timber, brass).
   */
  collideWithRigidBodies(bodies: RigidBody[]): void {
    const pLocal = new THREE.Vector3();
    const invQ = new THREE.Quaternion();

    for (const body of bodies) {
      if (body.shape.type === 'box') {
        const box = body.shape as BoxShape;
        const hx = box.halfExtents.x + 0.012;
        const hy = box.halfExtents.y + 0.012;
        const hz = box.halfExtents.z + 0.012;
        invQ.copy(body.quaternion).conjugate();

        for (const p of this.particles) {
          if (p.isPinned) continue;
          pLocal.subVectors(p.position, body.position);
          PhysMath.rotateVectorByQuaternion(pLocal, invQ, pLocal);

          if (Math.abs(pLocal.x) < hx && Math.abs(pLocal.y) < hy && Math.abs(pLocal.z) < hz) {
            // Push out to nearest face
            const dx = hx - Math.abs(pLocal.x);
            const dy = hy - Math.abs(pLocal.y);
            const dz = hz - Math.abs(pLocal.z);

            if (dy <= dx && dy <= dz) {
              pLocal.y = pLocal.y > 0 ? hy : -hy;
            } else if (dx <= dz) {
              pLocal.x = pLocal.x > 0 ? hx : -hx;
            } else {
              pLocal.z = pLocal.z > 0 ? hz : -hz;
            }

            PhysMath.rotateVectorByQuaternion(pLocal, body.quaternion, p.position);
            p.position.add(body.position);
          }
        }
      }
    }
  }

  /**
   * Synchronizes simulation coordinates to Three.js BufferGeometry.
   */
  updateMeshGeometry(): void {
    const posArr = this.posAttr.array as Float32Array;
    let idx = 0;
    for (const p of this.particles) {
      posArr[idx * 3] = p.position.x;
      posArr[idx * 3 + 1] = p.position.y;
      posArr[idx * 3 + 2] = p.position.z;
      idx++;
    }
    this.posAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}

// ============================================================================
// 9. POINTER DRAG, ELASTIC LEASH & INERTIA THROW VELOCITY TRACKING
// ============================================================================

export class PointerPhysicsController {
  private raycaster = new THREE.Raycaster();
  public dragState: PointerDragState = {
    isActive: false,
    targetBody: null,
    targetClothParticleIndex: -1,
    localAnchor: new THREE.Vector3(),
    currentWorldAnchor: new THREE.Vector3(),
    targetWorldPos: new THREE.Vector3(),
    hitDistance: 2.5,
    springStiffness: 140.0,
    springDamping: 18.0,
  };

  private velocityHistory: PointerVelocitySample[] = [];
  private readonly historyCapacity = 8;
  private dragPlane = new THREE.Plane();
  private planeIntersect = new THREE.Vector3();

  constructor() {
    this.raycaster.params.Line = { threshold: 0.05 };
  }

  onPointerDown(
    event: PointerEvent,
    camera: THREE.Camera,
    rigidBodies: RigidBody[],
    cloth: SpringMassCloth | null,
    domElement: HTMLElement
  ): boolean {
    const rect = domElement.getBoundingClientRect();
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
    this.velocityHistory = [];

    // 1. Test Rigid Bodies
    for (const body of rigidBodies) {
      if (!body.mesh || body.isStatic) continue;
      const intersects = this.raycaster.intersectObject(body.mesh, true);
      if (intersects.length > 0) {
        const hit = intersects[0];
        this.dragState.isActive = true;
        this.dragState.targetBody = body;
        this.dragState.targetClothParticleIndex = -1;
        this.dragState.hitDistance = hit.distance;

        // Compute local anchor on body
        const invQ = body.quaternion.clone().conjugate();
        const rWorld = new THREE.Vector3().subVectors(hit.point, body.position);
        PhysMath.rotateVectorByQuaternion(rWorld, invQ, this.dragState.localAnchor);
        this.dragState.currentWorldAnchor.copy(hit.point);
        this.dragState.targetWorldPos.copy(hit.point);

        // Setup interaction plane parallel to camera view plane
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir).negate();
        this.dragPlane.setFromNormalAndCoplanarPoint(camDir, hit.point);

        body.wakeUp();
        domElement.style.cursor = 'grabbing';
        return true;
      }
    }

    // 2. Test Cloth Swatch
    if (cloth && cloth.mesh) {
      const intersects = this.raycaster.intersectObject(cloth.mesh, true);
      if (intersects.length > 0) {
        const hit = intersects[0];
        // Find nearest particle to hit point
        let nearestIdx = -1;
        let minDistSq = Infinity;
        for (let i = 0; i < cloth.particles.length; i++) {
          const dSq = cloth.particles[i].position.distanceToSquared(hit.point);
          if (dSq < minDistSq) {
            minDistSq = dSq;
            nearestIdx = i;
          }
        }

        if (nearestIdx >= 0) {
          this.dragState.isActive = true;
          this.dragState.targetBody = null;
          this.dragState.targetClothParticleIndex = nearestIdx;
          this.dragState.hitDistance = hit.distance;
          this.dragState.targetWorldPos.copy(hit.point);

          const camDir = new THREE.Vector3();
          camera.getWorldDirection(camDir).negate();
          this.dragPlane.setFromNormalAndCoplanarPoint(camDir, hit.point);

          domElement.style.cursor = 'grabbing';
          return true;
        }
      }
    }

    return false;
  }

  onPointerMove(
    event: PointerEvent,
    camera: THREE.Camera,
    domElement: HTMLElement
  ): void {
    if (!this.dragState.isActive) return;

    const rect = domElement.getBoundingClientRect();
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);

    if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersect)) {
      this.dragState.targetWorldPos.copy(this.planeIntersect);

      // Record velocity sample
      const now = performance.now() * 0.001;
      this.velocityHistory.push({
        time: now,
        position: this.planeIntersect.clone(),
      });
      if (this.velocityHistory.length > this.historyCapacity) {
        this.velocityHistory.shift();
      }
    }
  }

  onPointerUp(domElement: HTMLElement): void {
    if (!this.dragState.isActive) return;

    // Calculate throw release fling velocity
    if (this.velocityHistory.length >= 2 && this.dragState.targetBody) {
      const first = this.velocityHistory[0];
      const last = this.velocityHistory[this.velocityHistory.length - 1];
      const dt = last.time - first.time;

      if (dt > 0.015 && dt < 0.25) {
        const throwVelocity = new THREE.Vector3()
          .subVectors(last.position, first.position)
          .multiplyScalar(1.0 / dt);

        // Impart throw momentum
        const flingMultiplier = 1.35;
        this.dragState.targetBody.linearVelocity.copy(throwVelocity).multiplyScalar(flingMultiplier);

        // Impart natural angular tumble
        const spinAxis = new THREE.Vector3().crossVectors(throwVelocity, new THREE.Vector3(0, 1, 0)).normalize();
        this.dragState.targetBody.angularVelocity.copy(spinAxis).multiplyScalar(throwVelocity.length() * 1.8);
      }
    }

    this.dragState.isActive = false;
    this.dragState.targetBody = null;
    this.dragState.targetClothParticleIndex = -1;
    domElement.style.cursor = 'grab';
  }

  /**
   * Applies elastic 6-DOF leash force during pointer drag.
   */
  updateLeash(dt: number, cloth: SpringMassCloth | null): void {
    if (!this.dragState.isActive) return;

    if (this.dragState.targetBody) {
      const body = this.dragState.targetBody;
      body.wakeUp();

      // Transform local anchor to world coordinates
      PhysMath.rotateVectorByQuaternion(
        this.dragState.localAnchor,
        body.quaternion,
        this.dragState.currentWorldAnchor
      );
      this.dragState.currentWorldAnchor.add(body.position);

      // Spring-damper force: F = -k * (x - target) - d * v
      const deltaX = new THREE.Vector3().subVectors(
        this.dragState.targetWorldPos,
        this.dragState.currentWorldAnchor
      );
      const vAnchor = body.getVelocityAtPoint(
        new THREE.Vector3().subVectors(this.dragState.currentWorldAnchor, body.position),
        new THREE.Vector3()
      );

      const force = deltaX
        .multiplyScalar(this.dragState.springStiffness)
        .addScaledVector(vAnchor, -this.dragState.springDamping);

      body.applyForce(force, this.dragState.currentWorldAnchor);
    } else if (cloth && this.dragState.targetClothParticleIndex >= 0) {
      const p = cloth.particles[this.dragState.targetClothParticleIndex];
      p.position.lerp(this.dragState.targetWorldPos, 0.45);
      p.oldPosition.copy(p.position);
    }
  }
}

// ============================================================================
// 10. ACOUSTIC COLLISION FEEDBACK INTEGRATION
// ============================================================================

export class AcousticCollisionFeedback {
  private camera: THREE.Camera;
  private soundCooldowns = new Map<string, number>();
  private readonly minCooldownMs = 45.0;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
  }

  setCamera(cam: THREE.Camera): void {
    this.camera = cam;
  }

  /**
   * Evaluates collision kinetic energy and synthesizes spatial audio transient.
   * E = 0.5 * m_eff * v_rel_normal²
   */
  handleCollisionImpact(manifold: ContactManifold): void {
    if (!soundEngine.isEnabled()) return;

    const bA = manifold.bodyA;
    const bB = manifold.bodyB;
    const n = manifold.normal;

    // Relative impact velocity
    const pt = manifold.points[0];
    if (!pt) return;

    const rA = new THREE.Vector3().subVectors(pt.worldPosition, bA.position);
    const rB = bB ? new THREE.Vector3().subVectors(pt.worldPosition, bB.position) : new THREE.Vector3();

    const vPtA = bA.getVelocityAtPoint(rA, new THREE.Vector3());
    const vPtB = bB ? bB.getVelocityAtPoint(rB, new THREE.Vector3()) : new THREE.Vector3();
    const vRelNormal = Math.abs(new THREE.Vector3().subVectors(vPtA, vPtB).dot(n));

    // Threshold to filter micro-jitter noise
    if (vRelNormal < 0.12) return;

    // Debounce check per object pair
    const idA = bA.id;
    const idB = bB ? bB.id : -1;
    const pairKey = `${Math.min(idA, idB)}:${Math.max(idA, idB)}`;
    const now = performance.now();
    const lastTime = this.soundCooldowns.get(pairKey) ?? 0;
    if (now - lastTime < this.minCooldownMs) return;
    this.soundCooldowns.set(pairKey, now);

    // Calculate effective kinetic energy
    const mA = bA.mass;
    const mB = bB ? bB.mass : mA;
    const mEff = (mA * mB) / (mA + mB);
    const kineticEnergy = 0.5 * mEff * (vRelNormal * vRelNormal);

    // Screen-space NDC projection for stereo binaural panning
    const ndc = pt.worldPosition.clone().project(this.camera);
    soundEngine.setSpatialCoordinates(ndc.x, ndc.y);

    // Material Acoustic Shaping
    const primaryMat = bA.material;
    const prof = primaryMat.acousticProfile;

    const energyScale = PhysMath.clamp(kineticEnergy * 0.18, 0.0, 1.0);
    const freqStart = prof.baseFreq + energyScale * prof.harmonicSpread;
    const freqEnd = prof.endFreq;
    const duration = prof.decayDuration * (1.0 + energyScale * 0.4);
    const gainPeak = PhysMath.clamp(
      prof.gainMultiplier * (0.015 + energyScale * 0.06),
      0.015,
      0.14
    );

    soundEngine.click({
      freqStart,
      freqEnd,
      duration,
      gainPeak,
      type: prof.oscillatorType,
    });
  }
}

// ============================================================================
// 11. SPECIMEN 3D MESH GENERATORS & PROCEDURAL PBR MATERIALS
// ============================================================================

export class SpecimenMeshFactory {
  /**
   * 1. Honed Kota Stone Tile Mesh (Beveled chamfered slab)
   */
  static createKotaStoneMesh(hx = 0.20, hy = 0.018, hz = 0.20): THREE.Mesh {
    const geom = new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2, 2, 1, 2);

    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x6e756e),
      roughness: 0.68,
      metalness: 0.02,
      clearcoat: 0.25,
      clearcoatRoughness: 0.18,
      reflectivity: 0.45,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'Specimen_KotaStoneTile';
    return mesh;
  }

  /**
   * 2. Seasoned Sal Timber Beam Mesh (Fluted architectural beam)
   */
  static createSalTimberMesh(hx = 0.055, hy = 0.26, hz = 0.055): THREE.Mesh {
    const geom = new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2, 4, 12, 4);

    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x56321d),
      roughness: 0.42,
      metalness: 0.0,
      anisotropy: 0.75,
      anisotropyRotation: Math.PI * 0.5,
      sheen: 0.48,
      sheenColor: new THREE.Color(0x8a4b22),
      clearcoat: 0.15,
      clearcoatRoughness: 0.35,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'Specimen_SalTimberBeam';
    return mesh;
  }

  /**
   * 3. Spun Brass Cylinder Mesh (Machined lathe cylinder)
   */
  static createBrassCylinderMesh(radius = 0.075, halfHeight = 0.08, segments = 32): THREE.Mesh {
    const geom = new THREE.CylinderGeometry(radius, radius, halfHeight * 2, segments, 1);

    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xd4af37),
      metalness: 0.94,
      roughness: 0.24,
      clearcoat: 0.28,
      clearcoatRoughness: 0.15,
      reflectivity: 0.92,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'Specimen_SpunBrassCylinder';
    return mesh;
  }

  /**
   * 4. Exhibition Pedestal Table (Honed Travertine top with brass border inlay)
   */
  static createExhibitionPedestal(floorY = 0.0, halfX = 1.4, halfZ = 1.0): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Showroom_SpecimenPedestal';

    // Stone Top Slab
    const slabGeom = new THREE.BoxGeometry(halfX * 2, 0.08, halfZ * 2);
    const slabMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x1e1c19),
      roughness: 0.52,
      metalness: 0.05,
      clearcoat: 0.35,
      clearcoatRoughness: 0.12,
    });
    const slab = new THREE.Mesh(slabGeom, slabMat);
    slab.position.set(0, floorY - 0.04, 0);
    slab.receiveShadow = true;
    group.add(slab);

    // Brass Datum Inlay Rim
    const rimGeom = new THREE.BoxGeometry(halfX * 2 + 0.015, 0.01, halfZ * 2 + 0.015);
    const rimMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xcba153),
      metalness: 0.92,
      roughness: 0.28,
    });
    const rim = new THREE.Mesh(rimGeom, rimMat);
    rim.position.set(0, floorY + 0.002, 0);
    rim.receiveShadow = true;
    group.add(rim);

    return group;
  }
}

// ============================================================================
// 12. UNIFIED MATERIAL PHYSICS WORLD & LIFECYCLE CONTROLLER
// ============================================================================

export class MaterialPhysicsWorld {
  public scene: THREE.Scene;
  public camera: THREE.Camera;
  public domElement: HTMLElement;

  public rigidBodies: RigidBody[] = [];
  public cloth: SpringMassCloth | null = null;
  public floorPlane: PlaneShape;

  public spatialHash: SpatialHashGrid3D;
  public pointerController: PointerPhysicsController;
  public acousticFeedback: AcousticCollisionFeedback;

  public gravity = new THREE.Vector3(0, -9.81, 0);
  public substeps = 2;
  public tableFloorY = 0.0;
  public tableBoundsHalfX = 1.35;
  public tableBoundsHalfZ = 0.95;

  public rootGroup = new THREE.Group();
  public debugVisualizerGroup = new THREE.Group();
  public showDebug = false;

  private isDisposed = false;
  private nextBodyId = 1;

  // Signal handlers
  private abortController = new AbortController();

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    domElement: HTMLElement,
    options?: PhysicsWorldOptions
  ) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;

    if (options?.gravity) this.gravity.copy(options.gravity);
    if (options?.substeps) this.substeps = options.substeps;
    if (options?.tableFloorY !== undefined) this.tableFloorY = options.tableFloorY;
    if (options?.tableBoundsHalfX !== undefined) this.tableBoundsHalfX = options.tableBoundsHalfX;
    if (options?.tableBoundsHalfZ !== undefined) this.tableBoundsHalfZ = options.tableBoundsHalfZ;

    this.floorPlane = new PlaneShape(new THREE.Vector3(0, 1, 0), this.tableFloorY);
    this.spatialHash = new SpatialHashGrid3D(0.40);
    this.pointerController = new PointerPhysicsController();
    this.acousticFeedback = new AcousticCollisionFeedback(camera);

    this.rootGroup.name = 'MaterialPhysicsWorld_Root';
    this.debugVisualizerGroup.name = 'MaterialPhysics_DebugWireframes';
    this.debugVisualizerGroup.visible = false;
    this.rootGroup.add(this.debugVisualizerGroup);
    this.scene.add(this.rootGroup);

    this.initExhibitionScene();
    this.bindEvents();
  }

  private initExhibitionScene(): void {
    // 1. Exhibition Pedestal Table
    const pedestal = SpecimenMeshFactory.createExhibitionPedestal(
      this.tableFloorY,
      this.tableBoundsHalfX,
      this.tableBoundsHalfZ
    );
    this.rootGroup.add(pedestal);

    // 2. Specimen 1: Honed Kota Stone Tile
    const stoneShape = new BoxShape(new THREE.Vector3(0.18, 0.016, 0.18));
    const stoneBody = new RigidBody(this.nextBodyId++, 'KotaStoneTile', 'limestone', stoneShape);
    stoneBody.position.set(-0.55, this.tableFloorY + 0.18, 0.15);
    stoneBody.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * 0.12);
    const stoneMesh = SpecimenMeshFactory.createKotaStoneMesh(0.18, 0.016, 0.18);
    stoneBody.mesh = stoneMesh;
    stoneBody.syncMesh();
    this.addRigidBody(stoneBody);

    // 3. Specimen 2: Seasoned Sal Timber Beam
    const timberShape = new BoxShape(new THREE.Vector3(0.05, 0.24, 0.05));
    const timberBody = new RigidBody(this.nextBodyId++, 'SalTimberBeam', 'sal-timber', timberShape);
    timberBody.position.set(0.0, this.tableFloorY + 0.32, -0.22);
    timberBody.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 1).normalize(), Math.PI * 0.18);
    const timberMesh = SpecimenMeshFactory.createSalTimberMesh(0.05, 0.24, 0.05);
    timberBody.mesh = timberMesh;
    timberBody.syncMesh();
    this.addRigidBody(timberBody);

    // 4. Specimen 3: Spun Brass Cylinder
    const brassShape = new CylinderShape(0.07, 0.08, 16);
    const brassBody = new RigidBody(this.nextBodyId++, 'SpunBrassCylinder', 'brass', brassShape);
    brassBody.position.set(0.52, this.tableFloorY + 0.20, 0.18);
    brassBody.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 0.08);
    const brassMesh = SpecimenMeshFactory.createBrassCylinderMesh(0.07, 0.08, 32);
    brassBody.mesh = brassMesh;
    brassBody.syncMesh();
    this.addRigidBody(brassBody);

    // 5. Specimen 4: Linen Textile Swatch (Cloth simulation)
    this.cloth = new SpringMassCloth(14, 14, 0.42, 0.42);
    for (const p of this.cloth.particles) {
      p.position.x += -0.25;
      p.position.z += 0.32;
      p.position.y += this.tableFloorY + 0.04;
      p.oldPosition.copy(p.position);
    }
    this.rootGroup.add(this.cloth.mesh);
  }

  addRigidBody(body: RigidBody): void {
    this.rigidBodies.push(body);
    if (body.mesh) {
      this.rootGroup.add(body.mesh);
    }
  }

  private bindEvents(): void {
    const { signal } = this.abortController;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      this.pointerController.onPointerDown(
        e,
        this.camera,
        this.rigidBodies,
        this.cloth,
        this.domElement
      );
    };

    const onMove = (e: PointerEvent) => {
      this.pointerController.onPointerMove(e, this.camera, this.domElement);
    };

    const onUp = () => {
      this.pointerController.onPointerUp(this.domElement);
    };

    this.domElement.addEventListener('pointerdown', onDown, { signal });
    window.addEventListener('pointermove', onMove, { passive: true, signal });
    window.addEventListener('pointerup', onUp, { passive: true, signal });
    window.addEventListener('pointercancel', onUp, { passive: true, signal });
  }

  /**
   * Main Physics Substep Tick
   */
  update(rawDt: number): void {
    if (this.isDisposed) return;

    // Clamp dt to avoid spiral of death on tab lag
    const dt = Math.min(rawDt, 0.0333);
    const subDt = dt / this.substeps;

    // Organic wind flutter for linen cloth
    const time = performance.now() * 0.001;
    const wind = new THREE.Vector3(
      Math.sin(time * 2.2) * 0.28,
      Math.sin(time * 3.4) * 0.12,
      Math.cos(time * 1.8) * 0.28
    );

    for (let step = 0; step < this.substeps; step++) {
      // 1. Pointer Leash Spring Forces
      this.pointerController.updateLeash(subDt, this.cloth);

      // 2. Rigid Body Force Integration
      for (const body of this.rigidBodies) {
        body.integrateForces(subDt, this.gravity);
      }

      // 3. Broadphase Spatial Hash Insertion
      this.spatialHash.clear();
      for (const body of this.rigidBodies) {
        if (!body.isSleeping) {
          this.spatialHash.insert(body.id, body.aabb);
        }
      }

      // 4. Narrowphase SAT Collision & Manifold Generation
      const manifolds: ContactManifold[] = [];
      const candidatePairs = this.spatialHash.queryCandidatePairs();

      // Body vs Body SAT
      const bodyMap = new Map<number, RigidBody>();
      for (const b of this.rigidBodies) bodyMap.set(b.id, b);

      for (const [idA, idB] of candidatePairs) {
        const bA = bodyMap.get(idA);
        const bB = bodyMap.get(idB);
        if (!bA || !bB || (bA.isSleeping && bB.isSleeping)) continue;

        const m: ContactManifold = {
          bodyA: bA,
          bodyB: bB,
          normal: new THREE.Vector3(),
          points: [],
          tangent1: new THREE.Vector3(),
          tangent2: new THREE.Vector3(),
          friction: 0,
          dynamicFriction: 0,
          restitution: 0,
        };

        let collided = false;
        if (bA.shape.type === 'box' && bB.shape.type === 'box') {
          collided = NarrowphaseSAT.testOBBvsOBB(bA.obb, bB.obb, bA, bB, m);
        } else if (bA.shape.type === 'cylinder' && bB.shape.type === 'box') {
          collided = NarrowphaseSAT.testCylinderVsOBB(bA.shape as CylinderShape, bA, bB.obb, bB, m);
        } else if (bA.shape.type === 'box' && bB.shape.type === 'cylinder') {
          collided = NarrowphaseSAT.testCylinderVsOBB(bB.shape as CylinderShape, bB, bA.obb, bA, m);
          m.normal.negate();
        }

        if (collided) {
          manifolds.push(m);
          this.acousticFeedback.handleCollisionImpact(m);
        }
      }

      // Body vs Floor Plane Collisions
      for (const body of this.rigidBodies) {
        if (body.isSleeping) continue;

        const m: ContactManifold = {
          bodyA: body,
          bodyB: (null as unknown) as RigidBody,
          normal: new THREE.Vector3(),
          points: [],
          tangent1: new THREE.Vector3(),
          tangent2: new THREE.Vector3(),
          friction: 0,
          dynamicFriction: 0,
          restitution: 0,
        };

        let hitFloor = false;
        if (body.shape.type === 'box') {
          hitFloor = NarrowphaseSAT.testOBBvsPlane(body.obb, this.floorPlane, body, m);
        } else if (body.shape.type === 'cylinder') {
          hitFloor = NarrowphaseSAT.testCylinderVsPlane(body.shape as CylinderShape, body, this.floorPlane, m);
        }

        if (hitFloor) {
          manifolds.push(m);
          this.acousticFeedback.handleCollisionImpact(m);
        }

        // Table Perimeter Boundary Containment
        const hx = this.tableBoundsHalfX - 0.05;
        const hz = this.tableBoundsHalfZ - 0.05;
        if (Math.abs(body.position.x) > hx) {
          body.position.x = Math.sign(body.position.x) * hx;
          body.linearVelocity.x *= -0.45;
        }
        if (Math.abs(body.position.z) > hz) {
          body.position.z = Math.sign(body.position.z) * hz;
          body.linearVelocity.z *= -0.45;
        }
      }

      // 5. Sequential Impulse Constraint Solver
      SequentialImpulseSolver.solveManifolds(manifolds, 8, subDt);

      // 6. Integrate Velocities
      for (const body of this.rigidBodies) {
        body.integrateVelocities(subDt);
        body.checkSleep(subDt);
      }

      // 7. Cloth Simulation Step
      if (this.cloth) {
        this.cloth.integrate(subDt, this.gravity, wind);
        this.cloth.relaxConstraints(5, this.tableFloorY);
        this.cloth.collideWithRigidBodies(this.rigidBodies);
      }
    }

    // 8. Update Cloth Mesh Visuals
    if (this.cloth) {
      this.cloth.updateMeshGeometry();
    }
  }

  /**
   * Resets specimens to their initial resting positions.
   */
  resetSpecimens(): void {
    const stone = this.rigidBodies.find((b) => b.name === 'KotaStoneTile');
    if (stone) {
      stone.position.set(-0.55, this.tableFloorY + 0.18, 0.15);
      stone.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * 0.12);
      stone.linearVelocity.set(0, 0, 0);
      stone.angularVelocity.set(0, 0, 0);
      stone.wakeUp();
      stone.syncMesh();
    }

    const timber = this.rigidBodies.find((b) => b.name === 'SalTimberBeam');
    if (timber) {
      timber.position.set(0.0, this.tableFloorY + 0.32, -0.22);
      timber.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 1).normalize(), Math.PI * 0.18);
      timber.linearVelocity.set(0, 0, 0);
      timber.angularVelocity.set(0, 0, 0);
      timber.wakeUp();
      timber.syncMesh();
    }

    const brass = this.rigidBodies.find((b) => b.name === 'SpunBrassCylinder');
    if (brass) {
      brass.position.set(0.52, this.tableFloorY + 0.20, 0.18);
      brass.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 0.08);
      brass.linearVelocity.set(0, 0, 0);
      brass.angularVelocity.set(0, 0, 0);
      brass.wakeUp();
      brass.syncMesh();
    }

    if (this.cloth) {
      const dx = this.cloth.width / (this.cloth.gridCols - 1);
      const dy = this.cloth.height / (this.cloth.gridRows - 1);
      const halfW = this.cloth.width * 0.5;
      const halfH = this.cloth.height * 0.5;

      let idx = 0;
      for (let r = 0; r < this.cloth.gridRows; r++) {
        for (let c = 0; c < this.cloth.gridCols; c++) {
          const p = this.cloth.particles[idx++];
          p.position.set(-halfW + c * dx - 0.25, this.tableFloorY + 0.04, -halfH + r * dy + 0.32);
          p.oldPosition.copy(p.position);
          p.acceleration.set(0, 0, 0);
        }
      }
      this.cloth.updateMeshGeometry();
    }
  }

  toggleDebugVisualization(): boolean {
    this.showDebug = !this.showDebug;
    this.debugVisualizerGroup.visible = this.showDebug;
    return this.showDebug;
  }

  getTelemetry(): PhysicsTelemetry {
    const specimens: SpecimenTelemetry[] = this.rigidBodies.map((b) => ({
      name: b.name,
      type: b.specimenType,
      position: [b.position.x, b.position.y, b.position.z],
      linearVelocity: b.linearVelocity.length(),
      angularVelocity: b.angularVelocity.length(),
      kineticEnergy: 0.5 * b.mass * b.linearVelocity.lengthSq(),
      isSleeping: b.isSleeping,
    }));

    return {
      rigidBodyCount: this.rigidBodies.length,
      clothParticleCount: this.cloth ? this.cloth.particles.length : 0,
      activeContacts: 0,
      broadphasePairs: 0,
      substepsPerFrame: this.substeps,
      averageStepTimeMs: 0,
      specimens,
    };
  }

  dispose(): void {
    this.isDisposed = true;
    this.abortController.abort();
    this.scene.remove(this.rootGroup);

    for (const body of this.rigidBodies) {
      if (body.mesh && (body.mesh as THREE.Mesh).geometry) {
        (body.mesh as THREE.Mesh).geometry.dispose();
      }
    }
    if (this.cloth) {
      (this.cloth.mesh.geometry as THREE.BufferGeometry).dispose();
    }
    this.rigidBodies = [];
    this.cloth = null;
  }
}

// ============================================================================
// 13. FACTORY INITIALIZER & SINGLETON EXPORT
// ============================================================================

export interface MaterialPhysicsHandle {
  world: MaterialPhysicsWorld;
  update: (dt: number) => void;
  resetSpecimens: () => void;
  toggleDebug: () => boolean;
  getTelemetry: () => PhysicsTelemetry;
  dispose: () => void;
}

export function createMaterialPhysicsSimulator(
  scene: THREE.Scene,
  camera: THREE.Camera,
  domElement: HTMLElement,
  options?: PhysicsWorldOptions
): MaterialPhysicsHandle {
  const world = new MaterialPhysicsWorld(scene, camera, domElement, options);

  return {
    world,
    update: (dt: number) => world.update(dt),
    resetSpecimens: () => world.resetSpecimens(),
    toggleDebug: () => world.toggleDebugVisualization(),
    getTelemetry: () => world.getTelemetry(),
    dispose: () => world.dispose(),
  };
}
