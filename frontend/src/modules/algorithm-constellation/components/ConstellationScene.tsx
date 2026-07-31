// ─────────────────────────────────────────────────────────────────────────────
// ConstellationScene.tsx — React Three Fiber 3D scene for Algorithm Constellation
//
// Interaction model:
//   • Globe view: 10 domain nodes on a slowly rotating 3D sphere
//   • Domain click: camera flies to domain, algorithm ring expands
//   • Algorithm click: opens side panel (parent callback)
//   • Background click: deselect, camera returns to orbit
//
// Animation phases (seconds from canvas mount):
//   0 → 1.8  : Particles stream from dark space to domain positions
//   1.8 → 2.6: Domain nodes materialise (scale 0 → 1)
//   2.6 → 3.2: Constellation lines draw in (opacity 0 → 1)
//   3.2 → 3.8: Labels fade in
//   3.8+      : Interaction unlocked, globe auto-rotates
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef, useEffect, useMemo, memo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import type { AlgorithmSummary } from '../../algorithm-explorer/hooks/useAlgorithmApi';
import {
  computeDomainPositions,
  computeAlgorithmPositions,
  computeConnectionPairs,
  SPHERE_RADIUS,
  CAMERA_ORBIT_DISTANCE,
  CAMERA_FOCUS_DISTANCE,
  DOMAIN_NODE_RADIUS,
  ALGO_NODE_RADIUS,
  PHASE_PARTICLES_END,
  PHASE_NODES_END,
  PHASE_LINES_END,
  PHASE_LABELS_END,
  PHASE_INTERACTIVE,
} from '../utils/sphereLayout';
import type { DomainNodeData, ConnectionPair } from '../utils/sphereLayout';
import { getAlgorithmDomain, domainHex } from '../utils/domainMapper';
import type { Domain } from '../utils/domainMapper';
import { getExploredSlugs } from '../hooks/useConstellationState';
// drei's <Text> renders through troika, which never sees the page's CSS — without
// an explicit font it falls back to troika's own default, which is why the labels
// were not Satoshi like the rest of the UI. troika reads .woff directly, and
// Satoshi isn't an npm/fontsource package (it's Fontshare-hosted), so the file
// is vendored locally instead of imported from node_modules like Geist Sans was.
import satoshiUrl from '../../../assets/fonts/satoshi-medium.woff';

// Labels live in 3D space, so perspective made near domains render huge and far
// ones tiny. Scaling by camera distance keeps every label the same size on screen.
function screenConstantScale(distance: number): number {
  return Math.min(1.5, Math.max(0.55, distance / CAMERA_ORBIT_DISTANCE));
}

// Nodes on the far side of the globe project on top of near ones, which is what
// made the labels collide into unreadable overlaps. Fade a label out as its node
// rotates behind the sphere: 1 when facing the camera, 0 when directly behind.
function facingCamera(nodeDistance: number, centerDistance: number): number {
  return smoothstep((centerDistance - nodeDistance) / SPHERE_RADIUS + 0.5);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConstellationSceneProps {
  algorithms: AlgorithmSummary[];
  selectedDomain: Domain | null;
  selectedSlug: string | null;
  isDark: boolean;
  onSelectDomain: (domain: Domain | null) => void;
  onSelectAlgorithm: (slug: string | null) => void;
  onInteractive: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

// ─── Particle entrance animation ─────────────────────────────────────────────
// Implemented fully imperatively (scene.add/remove) so the Float32Array
// position buffer can be mutated every frame without React reconciliation cost.

const PARTICLES_PER_DOMAIN = 18;

function ParticleEntrance({ domainNodes, isDark }: { domainNodes: DomainNodeData[]; isDark: boolean }) {
  const { scene } = useThree();

  useEffect(() => {
    const COUNT = domainNodes.length * PARTICLES_PER_DOMAIN;
    const starts = new Float32Array(COUNT * 3);
    const ends   = new Float32Array(COUNT * 3);
    const pos    = new Float32Array(COUNT * 3);

    domainNodes.forEach((dn, di) => {
      for (let pi = 0; pi < PARTICLES_PER_DOMAIN; pi++) {
        const idx = (di * PARTICLES_PER_DOMAIN + pi) * 3;
        // Random point on large sphere (r = 16-22)
        const phi   = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const r     = 16 + Math.random() * 6;
        starts[idx]     = r * Math.sin(phi) * Math.cos(theta);
        starts[idx + 1] = r * Math.cos(phi);
        starts[idx + 2] = r * Math.sin(phi) * Math.sin(theta);
        // End: scatter near domain node
        ends[idx]     = dn.position.x + (Math.random() - 0.5) * 0.5;
        ends[idx + 1] = dn.position.y + (Math.random() - 0.5) * 0.5;
        ends[idx + 2] = dn.position.z + (Math.random() - 0.5) * 0.5;
        // Initialise at start
        pos[idx] = starts[idx]; pos[idx+1] = starts[idx+1]; pos[idx+2] = starts[idx+2];
      }
    });

    const geom = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(pos, 3);
    geom.setAttribute('position', attr);

    const mat = new THREE.PointsMaterial({
      size: 0.065,
      // Additive blending resolves to white on a light background — the entry
      // animation was invisible in light mode. Use normal blending there.
      color: new THREE.Color(isDark ? '#34d399' : '#047857'),
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geom, mat);
    scene.add(points);

    // Advance position in RAF loop external to R3F useFrame
    // (we DO use useFrame via closure capture below)
    const onFrame = (elapsed: number) => {
      const t = Math.min(1, elapsed / PHASE_PARTICLES_END);
      const eased = smoothstep(t);
      for (let i = 0; i < COUNT * 3; i++) {
        pos[i] = starts[i] + (ends[i] - starts[i]) * eased;
      }
      attr.needsUpdate = true;
      // Fade out as particles arrive
      mat.opacity = t > 0.6 ? Math.max(0, 1 - (t - 0.6) / 0.4) : 1;
    };

    // We can't easily call onFrame from R3F's loop here (effect scope),
    // so we register a custom RAF loop that piggybacks on Three.js clock.
    let rafId = 0;
    const clock = new THREE.Clock(true);
    const tick = () => {
      onFrame(clock.getElapsedTime());
      rafId = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(rafId);
      scene.remove(points);
      geom.dispose();
      mat.dispose();
    };
  }, [scene, domainNodes, isDark]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ─── Constellation lines ──────────────────────────────────────────────────────

interface ConstellationLinesProps {
  pairs: ConnectionPair[];
  isDark: boolean;
}

const ConstellationLines = memo(function ConstellationLines({ pairs, isDark }: ConstellationLinesProps) {
  // Each line is a separate <line> primitive with a pre-computed bezier position buffer
  const items = useMemo(() =>
    pairs.map((pair, i) => ({
      key: i,
      points: pair.points,
    })),
    [pairs]
  );

  const matsRef = useRef<THREE.LineBasicMaterial[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const opacity = smoothstep((t - PHASE_LINES_END + 0.6) / 0.6);
    matsRef.current.forEach(m => { m.opacity = opacity * 0.22; });
  });

  return (
    <group>
      {items.map(({ key, points }) => {
        const mat = new THREE.LineBasicMaterial({
          color: isDark ? '#818cf8' : '#4338ca',
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        matsRef.current[key] = mat;
        return (
          <line key={key}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[points, 3]}
              />
            </bufferGeometry>
            <primitive object={mat} attach="material" />
          </line>
        );
      })}
    </group>
  );
});

// ─── Domain node ─────────────────────────────────────────────────────────────

interface DomainNodeProps {
  data: DomainNodeData;
  isSelected: boolean;
  hasDomainSelected: boolean;
  isDark: boolean;
  onSelect: (domain: Domain) => void;
}

const DomainNode = memo(function DomainNode({ data, isSelected, hasDomainSelected, isDark, onSelect }: DomainNodeProps) {
  const meshRef  = useRef<THREE.Mesh>(null!);
  const glowRef  = useRef<THREE.Mesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const labelRef = useRef<any>(null!); // drei Text

  const hex = data.color;
  const color = useMemo(() => new THREE.Color(hex), [hex]);

  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();

    // ── Entry scale animation ──
    const entryProgress = smoothstep((t - PHASE_PARTICLES_END) / (PHASE_NODES_END - PHASE_PARTICLES_END));
    if (groupRef.current) groupRef.current.scale.setScalar(entryProgress);

    // ── Opacity: dim non-selected domains when one is selected ──
    const baseOpacity = hasDomainSelected && !isSelected ? 0.08 : 1;
    const mat = meshRef.current?.material as THREE.MeshStandardMaterial;
    if (mat) {
      mat.opacity = baseOpacity;
      mat.emissiveIntensity = isSelected
        ? 1.4 + Math.sin(t * 3.5) * 0.4
        : 0.7;
    }
    const glowMat = glowRef.current?.material as THREE.MeshBasicMaterial;
    if (glowMat) glowMat.opacity = 0.12 * baseOpacity;

    // ── Label opacity + constant on-screen size ──
    if (labelRef.current) {
      const labelProgress = smoothstep((t - PHASE_LABELS_END + 0.5) / 0.5);
      const nodeDist = camera.position.distanceTo(data.position);
      // Selected domain keeps its label legible even when it swings behind.
      const facing = isSelected ? 1 : facingCamera(nodeDist, camera.position.length());
      labelRef.current.fillOpacity = labelProgress * baseOpacity * facing;
      labelRef.current.outlineOpacity = (isDark ? 0.75 : 0.9) * facing;
      labelRef.current.scale.setScalar(screenConstantScale(nodeDist));
    }
  });

  return (
    <group
      ref={groupRef}
      position={data.position}
      onClick={(e) => { e.stopPropagation(); onSelect(data.domain); }}
      onPointerEnter={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        const mat = meshRef.current?.material as THREE.MeshStandardMaterial;
        if (mat) mat.emissiveIntensity = 2;
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Outer glow halo */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[DOMAIN_NODE_RADIUS * 2.4, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Core sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[DOMAIN_NODE_RADIUS, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.7}
          roughness={0.3}
          metalness={0.6}
          transparent
          opacity={1}
        />
      </mesh>

      {/* Domain-colored point light for local atmosphere */}
      <pointLight
        color={color}
        intensity={isSelected ? 6 : 2}
        distance={5}
        decay={2}
      />

      {/* Billboard label */}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <Text
          ref={labelRef}
          font={satoshiUrl}
          position={[0, DOMAIN_NODE_RADIUS * 3.2 + 0.18, 0]}
          fontSize={0.26}
          letterSpacing={-0.01}
          anchorX="center"
          anchorY="middle"
          fillOpacity={0}
          color={isDark ? '#f4f4f5' : '#18181b'}
          outlineWidth={0.026}
          outlineColor={isDark ? '#09090b' : '#ffffff'}
          outlineOpacity={isDark ? 0.75 : 0.9}
        >
          {data.domain}
        </Text>
      </Billboard>
    </group>
  );
});

// ─── Algorithm node ────────────────────────────────────────────────────────

interface AlgorithmNodeProps {
  alg: AlgorithmSummary;
  position: THREE.Vector3;
  isSelected: boolean;
  isExplored: boolean;
  expansionProgress: number;
  isDark: boolean;
  onSelect: (slug: string) => void;
}

const AlgorithmNode = memo(function AlgorithmNode({
  alg, position, isSelected, isExplored, expansionProgress, isDark, onSelect,
}: AlgorithmNodeProps) {
  const domain = getAlgorithmDomain(alg.category ?? '', alg.name);
  // Explored accent needs a darker cyan on light bg — #22d3ee washes out on zinc-50.
  const hex = isExplored ? (isDark ? '#22d3ee' : '#0891b2') : domainHex(domain, isDark);
  const color = useMemo(() => new THREE.Color(hex), [hex]);
  const isComingSoon = alg.status === 'coming_soon';
  const effectiveOpacity = isComingSoon ? expansionProgress * 0.35 : expansionProgress;
  const meshRef = useRef<THREE.Mesh>(null!);
  const labelRef = useRef<any>(null!);

  useFrame(({ clock, camera }) => {
    if (labelRef.current) {
      labelRef.current.scale.setScalar(
        screenConstantScale(camera.position.distanceTo(position))
      );
    }
    const mat = meshRef.current?.material as THREE.MeshStandardMaterial;
    if (!mat) return;
    mat.emissiveIntensity = isSelected ? 1.6 + Math.sin(clock.getElapsedTime() * 4) * 0.4 : 0.5;
    mat.opacity = effectiveOpacity;
  });

  return (
    <group
      position={position}
      onClick={(e) => { e.stopPropagation(); if (!isComingSoon) onSelect(alg.slug); }}
      onPointerEnter={(e) => { e.stopPropagation(); if (!isComingSoon) document.body.style.cursor = 'pointer'; }}
      onPointerLeave={(e) => { e.stopPropagation(); document.body.style.cursor = 'auto'; }}
    >
      {/* Selection ring (always camera-facing via parent billboard) */}
      {isSelected && (
        <mesh>
          <torusGeometry args={[ALGO_NODE_RADIUS * 1.9, 0.025, 8, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}

      {/* Core sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[ALGO_NODE_RADIUS, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.5}
          metalness={0.5}
          transparent
          opacity={effectiveOpacity}
        />
      </mesh>

      {/* Label */}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <Text
          ref={labelRef}
          font={satoshiUrl}
          position={[0, ALGO_NODE_RADIUS + 0.26, 0]}
          fontSize={0.17}
          letterSpacing={-0.01}
          lineHeight={1.25}
          anchorX="center"
          anchorY="bottom"
          textAlign="center"
          fillOpacity={effectiveOpacity * (isComingSoon ? 0.5 : 1)}
          color={isComingSoon ? (isDark ? '#71717a' : '#a1a1aa') : (isDark ? '#e4e4e7' : '#27272a')}
          outlineWidth={0.018}
          outlineColor={isDark ? '#09090b' : '#ffffff'}
          outlineOpacity={isDark ? 0.7 : 0.9}
          maxWidth={2.8}
        >
          {alg.name.length > 22 ? alg.name.slice(0, 20) + '…' : alg.name}
        </Text>
      </Billboard>
    </group>
  );
});

// ─── Algorithm cluster (expands when domain is selected) ──────────────────────

interface AlgorithmClusterProps {
  algorithms: AlgorithmSummary[];
  domainNode: DomainNodeData;
  selectedSlug: string | null;
  isDark: boolean;
  onSelectAlgorithm: (slug: string | null) => void;
}

function AlgorithmCluster({ algorithms, domainNode, selectedSlug, isDark, onSelectAlgorithm }: AlgorithmClusterProps) {
  const explored = useMemo(() => getExploredSlugs(), []); // stable per-mount

  const positions = useMemo(
    () => computeAlgorithmPositions(domainNode.position, algorithms.length),
    [domainNode.position, algorithms.length]
  );

  const expansionRef = useRef(0);
  const lineGroupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    // Expand from 0 to 1 over 0.6 seconds after domain selected
    // (time since mount = cluster is only mounted after domain selected)
    const t = Math.min(1, clock.getElapsedTime() / 0.6);
    expansionRef.current = smoothstep(t);
    if (lineGroupRef.current) lineGroupRef.current.children.forEach(c => {
      const mat = (c as THREE.Line).material as THREE.LineBasicMaterial;
      if (mat) mat.opacity = expansionRef.current * 0.25;
    });
  });

  // Spoke lines from domain to algorithm
  const spokeData = useMemo(() => {
    return positions.map((pos) => {
      const arr = new Float32Array(6);
      arr[0] = domainNode.position.x; arr[1] = domainNode.position.y; arr[2] = domainNode.position.z;
      arr[3] = pos.x; arr[4] = pos.y; arr[5] = pos.z;
      return arr;
    });
  }, [positions, domainNode.position]);

  return (
    <group>
      {/* Spokes */}
      <group ref={lineGroupRef}>
        {spokeData.map((arr, i) => (
          <line key={i}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[arr, 3]} count={2} />
            </bufferGeometry>
            <lineBasicMaterial color={isDark ? '#52525b' : '#71717a'} transparent opacity={0} depthWrite={false} />
          </line>
        ))}
      </group>

      {/* Algorithm nodes */}
      {algorithms.map((alg, i) => (
        <AlgorithmNode
          key={alg.slug}
          alg={alg}
          position={positions[i]}
          isSelected={alg.slug === selectedSlug}
          isExplored={explored.has(alg.slug)}
          expansionProgress={expansionRef.current}
          isDark={isDark}
          onSelect={onSelectAlgorithm}
        />
      ))}
    </group>
  );
}

// ─── Scene controller (camera + interaction) ──────────────────────────────────

interface SceneControllerProps {
  selectedDomain: Domain | null;
  domainNodes: DomainNodeData[];
  onSelectDomain: (domain: Domain | null) => void;
  onInteractive: () => void;
}

function SceneController({
  selectedDomain,
  domainNodes,
  onSelectDomain,
  onInteractive,
}: SceneControllerProps) {
  const { camera, gl } = useThree();
  const interactiveCalled = useRef(false);

  // Camera spherical state (all refs — zero React re-renders)
  const cs = useRef({
    theta: 0.5,        // azimuth
    phi:   1.2,        // polar (0 = north, π = south)
    radius: CAMERA_ORBIT_DISTANCE,
    velT: 0,
    velP: 0,
    autoRotate: false, // starts false; enabled after PHASE_INTERACTIVE
  });

  // Focus state when domain is selected
  const focus = useRef({
    active: false,
    theta: 0,
    phi: 0,
    radius: CAMERA_FOCUS_DISTANCE,
    lookAtGoal: new THREE.Vector3(),
  });

  const lookAt = useRef(new THREE.Vector3()); // current lerped lookAt target

  // ── Update focus target when selectedDomain changes ──
  useEffect(() => {
    if (selectedDomain) {
      const dn = domainNodes.find(d => d.domain === selectedDomain);
      if (!dn) return;

      const dir = dn.position.clone().normalize();
      const targetPhi   = Math.acos(Math.max(-1, Math.min(1, dir.y)));
      const rawTheta    = Math.atan2(dir.x, dir.z);

      // Shortest angular path
      let dTheta = rawTheta - cs.current.theta;
      while (dTheta >  Math.PI) dTheta -= Math.PI * 2;
      while (dTheta < -Math.PI) dTheta += Math.PI * 2;

      focus.current = {
        active: true,
        theta: cs.current.theta + dTheta,
        phi: targetPhi,
        radius: CAMERA_FOCUS_DISTANCE,
        lookAtGoal: dn.position.clone(),
      };
      cs.current.autoRotate = false;
    } else {
      focus.current.active = false;
      focus.current.lookAtGoal.set(0, 0, 0);
      // Resume auto-rotate after brief pause
      setTimeout(() => { cs.current.autoRotate = interactiveCalled.current; }, 800);
    }
  }, [selectedDomain, domainNodes]);

  // ── Canvas pointer & wheel events ──
  useEffect(() => {
    const canvas = gl.domElement;
    let isDown = false;
    let lastX = 0, lastY = 0;
    let autoRotateTimeout = 0;

    const startAutoRotateTimer = () => {
      clearTimeout(autoRotateTimeout);
      autoRotateTimeout = window.setTimeout(() => {
        if (!focus.current.active) cs.current.autoRotate = interactiveCalled.current;
      }, 3000);
    };

    const onDown = (e: PointerEvent) => {
      isDown = true;
      lastX = e.clientX;
      lastY = e.clientY;
      cs.current.autoRotate = false;
      clearTimeout(autoRotateTimeout);
    };

    const onMove = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (!focus.current.active) {
        cs.current.velT += dx * 0.005;
        cs.current.velP += dy * 0.004;
      }
    };

    const onUp = () => {
      if (!isDown) return;
      isDown = false;
      startAutoRotateTimer();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * 0.008;
      if (focus.current.active) {
        focus.current.radius = Math.max(4.5, Math.min(13, focus.current.radius + delta));
      } else {
        cs.current.radius = Math.max(8, Math.min(20, cs.current.radius + delta));
      }
    };

    // Click on canvas background to deselect
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName.toLowerCase() === 'canvas') {
        onSelectDomain(null);
      }
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('click', onClick);

    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('click', onClick);
      clearTimeout(autoRotateTimeout);
    };
  }, [gl, onSelectDomain]);

  // ── Per-frame camera update ──
  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    // Fire onInteractive once
    if (!interactiveCalled.current && t >= PHASE_INTERACTIVE) {
      interactiveCalled.current = true;
      cs.current.autoRotate = true;
      onInteractive();
    }

    const c  = cs.current;
    const f  = focus.current;

    // Friction
    c.velT *= 0.88;
    c.velP *= 0.88;

    if (f.active) {
      // Smooth fly-to: lerp spherical coords toward focus target
      const lerpSpeed = Math.min(1, delta * 4.5);
      c.theta  += (f.theta - c.theta) * lerpSpeed;
      c.phi    += (f.phi   - c.phi)   * lerpSpeed;
      c.radius += (f.radius - c.radius) * lerpSpeed;
      lookAt.current.lerp(f.lookAtGoal, lerpSpeed);
    } else {
      // Apply drag velocity
      c.theta += c.velT;
      c.phi    = Math.max(0.2, Math.min(Math.PI - 0.2, c.phi + c.velP));
      // Auto-rotate
      if (c.autoRotate) c.theta += 0.0011;
      // Drift radius back to orbit distance
      c.radius += (CAMERA_ORBIT_DISTANCE - c.radius) * Math.min(1, delta * 1.5);
      // Drift lookAt back to origin
      lookAt.current.lerp(new THREE.Vector3(0, 0, 0), Math.min(1, delta * 5));
    }

    // Apply to camera
    camera.position.set(
      c.radius * Math.sin(c.phi) * Math.sin(c.theta),
      c.radius * Math.cos(c.phi),
      c.radius * Math.sin(c.phi) * Math.cos(c.theta),
    );
    camera.lookAt(lookAt.current);
  });

  return null;
}

// ─── Ambient lighting ─────────────────────────────────────────────────────────

function Lights({ isDark }: { isDark: boolean }) {
  return (
    <>
      <ambientLight intensity={isDark ? 0.25 : 0.6} color="#ffffff" />
      <directionalLight position={[5, 10, 5]} intensity={0.4} color="#ffffff" />
      <pointLight position={[0, 0, 0]} intensity={0.15} distance={20} color="#818cf8" />
    </>
  );
}

// ─── Root scene graph ─────────────────────────────────────────────────────────

function SceneGraph({
  algorithms,
  selectedDomain,
  selectedSlug,
  isDark,
  onSelectDomain,
  onSelectAlgorithm,
  onInteractive,
}: ConstellationSceneProps) {
  const domainNodes = useMemo(() => computeDomainPositions(isDark), [isDark]);
  const connectionPairs = useMemo(() => computeConnectionPairs(domainNodes), [domainNodes]);

  // Algorithms for the selected domain
  const domainAlgorithms = useMemo((): AlgorithmSummary[] => {
    if (!selectedDomain) return [];
    return algorithms.filter(
      a => getAlgorithmDomain(a.category ?? '', a.name) === selectedDomain
    );
  }, [algorithms, selectedDomain]);

  const selectedDomainNode = useMemo(
    () => domainNodes.find(d => d.domain === selectedDomain) ?? null,
    [domainNodes, selectedDomain]
  );

  return (
    <>
      <Lights isDark={isDark} />
      <SceneController
        selectedDomain={selectedDomain}
        domainNodes={domainNodes}
        onSelectDomain={onSelectDomain}
        onInteractive={onInteractive}
      />
      <ParticleEntrance domainNodes={domainNodes} isDark={isDark} />
      <ConstellationLines pairs={connectionPairs} isDark={isDark} />

      {/* Domain nodes */}
      {domainNodes.map(dn => (
        <DomainNode
          key={dn.domain}
          data={dn}
          isSelected={dn.domain === selectedDomain}
          hasDomainSelected={selectedDomain !== null}
          isDark={isDark}
          onSelect={onSelectDomain}
        />
      ))}

      {/* Algorithm cluster — only visible when a domain is selected */}
      {selectedDomain && selectedDomainNode && domainAlgorithms.length > 0 && (
        <AlgorithmCluster
          key={selectedDomain} // remount when domain changes to reset expansion animation
          algorithms={domainAlgorithms}
          domainNode={selectedDomainNode}
          selectedSlug={selectedSlug}
          isDark={isDark}
          onSelectAlgorithm={onSelectAlgorithm}
        />
      )}
    </>
  );
}

// ─── Exported Canvas wrapper ───────────────────────────────────────────────────

export function ConstellationScene(props: ConstellationSceneProps) {
  return (
    <Canvas
      camera={{ fov: 58, near: 0.1, far: 200, position: [0, 0, CAMERA_ORBIT_DISTANCE] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent', display: 'block', width: '100%', height: '100%' }}
      dpr={[1, 1.5]}
    >
      <Suspense fallback={null}>
        <SceneGraph {...props} />
      </Suspense>
    </Canvas>
  );
}
