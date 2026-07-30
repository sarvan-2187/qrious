import * as THREE from 'three';
import { ALL_DOMAINS, domainHex } from './domainMapper';
import type { Domain } from './domainMapper';

// ─── Scene constants ─────────────────────────────────────────────────────────
export const SPHERE_RADIUS = 4.5;
// Sphere is 4.5 across the radius, plus ~1.1 for each node's glow halo and the
// label sitting above it — 13 cropped labels against the canvas edge, 15.5 leaves
// margin on every side.
export const CAMERA_ORBIT_DISTANCE = 15.5;
export const CAMERA_FOCUS_DISTANCE = 8.5;
export const DOMAIN_NODE_RADIUS = 0.30;
export const ALGO_NODE_RADIUS = 0.16;

// Entry animation phase end-times in seconds
export const PHASE_PARTICLES_END = 1.8;   // particles finish converging
export const PHASE_NODES_END = 2.6;       // domain nodes fully visible
export const PHASE_LINES_END = 3.2;       // constellation lines drawn
export const PHASE_LABELS_END = 3.8;      // labels faded in
export const PHASE_INTERACTIVE = 3.8;     // interaction unlocked

// ─── Types ───────────────────────────────────────────────────────────────────
export interface DomainNodeData {
  domain: Domain;
  position: THREE.Vector3;
  color: string;
  index: number;
}

// ─── Fibonacci sphere distribution ───────────────────────────────────────────
// Places n points uniformly on a sphere using the golden angle method.
export function computeDomainPositions(isDark = true): DomainNodeData[] {
  const n = ALL_DOMAINS.length;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5°

  return ALL_DOMAINS.map((domain, i) => {
    const y = 1 - (i / (n - 1)) * 2;          // y from +1 to -1
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;

    const position = new THREE.Vector3(x, y, z)
      .normalize()
      .multiplyScalar(SPHERE_RADIUS);

    return {
      domain,
      position: position.clone(),
      color: domainHex(domain, isDark),
      index: i,
    };
  });
}

// ─── Algorithm ring layout ────────────────────────────────────────────────────
// Places algorithm nodes in concentric rings in the plane perpendicular to
// the domain direction. Camera looks along the domain direction when focused,
// so algorithms appear as a clean ring around the domain node.
export function computeAlgorithmPositions(
  domainPosition: THREE.Vector3,
  count: number
): THREE.Vector3[] {
  const normal = domainPosition.clone().normalize();

  // Build an orthonormal basis perpendicular to the domain normal
  const worldUp = Math.abs(normal.y) < 0.95
    ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1, 0, 0);
  const right = new THREE.Vector3().crossVectors(normal, worldUp).normalize();
  const upPerp = new THREE.Vector3().crossVectors(right, normal).normalize();

  const positions: THREE.Vector3[] = [];

  // Distribute into 1-3 rings
  const ringConfig =
    count <= 7  ? [{ n: count,                r: 1.9  }] :
    count <= 14 ? [{ n: Math.ceil(count*0.42), r: 1.6 },
                   { n: Math.floor(count*0.58), r: 3.0 }] :
                  [{ n: Math.ceil(count*0.25), r: 1.4 },
                   { n: Math.ceil(count*0.42), r: 2.6 },
                   { n: count - Math.ceil(count*0.25) - Math.ceil(count*0.42), r: 3.6 }];

  ringConfig.forEach(({ n: ringCount, r }, ringIdx) => {
    for (let i = 0; i < ringCount; i++) {
      // Stagger alternate rings by half a slot for visual spacing
      const phaseOffset = ringIdx % 2 === 1 ? Math.PI / ringCount : 0;
      const angle = (i / ringCount) * Math.PI * 2 + phaseOffset;
      positions.push(
        domainPosition.clone()
          .addScaledVector(right, Math.cos(angle) * r)
          .addScaledVector(upPerp, Math.sin(angle) * r)
      );
    }
  });

  return positions;
}

// ─── Quadratic bezier for constellation lines ─────────────────────────────────
// The midpoint is pushed slightly outward so the line arcs above the sphere.
export function buildBezierPoints(
  a: THREE.Vector3,
  b: THREE.Vector3,
  segments = 28
): Float32Array {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  // Push outward: the further apart the nodes, the more pronounced the arc
  const midLen = mid.length();
  mid.normalize().multiplyScalar(midLen + 0.8 + a.distanceTo(b) * 0.08);

  const positions = new Float32Array((segments + 1) * 3);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    positions[i * 3]     = mt*mt*a.x + 2*mt*t*mid.x + t*t*b.x;
    positions[i * 3 + 1] = mt*mt*a.y + 2*mt*t*mid.y + t*t*b.y;
    positions[i * 3 + 2] = mt*mt*a.z + 2*mt*t*mid.z + t*t*b.z;
  }
  return positions;
}

// ─── Connection graph (nearest-neighbor pairs, deduped) ─────────────────────
export interface ConnectionPair {
  a: number;
  b: number;
  points: Float32Array;
}

export function computeConnectionPairs(domainNodes: DomainNodeData[]): ConnectionPair[] {
  const n = domainNodes.length;
  const pairs: Array<{ a: number; b: number; dist: number }> = [];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      pairs.push({ a: i, b: j, dist: domainNodes[i].position.distanceTo(domainNodes[j].position) });
    }
  }
  pairs.sort((a, b) => a.dist - b.dist);

  // Take the 18 shortest connections for a clean constellation look
  return pairs.slice(0, 18).map(({ a, b }) => ({
    a, b,
    points: buildBezierPoints(domainNodes[a].position, domainNodes[b].position),
  }));
}
