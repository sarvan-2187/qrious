import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { BlochVector, TrajectoryPoint } from '../types/quantum';

interface BlochSphere3DProps {
  blochVec: BlochVector;
  targetBlochVec?: BlochVector;
  trajectories: TrajectoryPoint[];
  spinColor?: string;
  traceColor?: string;
  topStateText?: string;
  bottomStateText?: string;
  historyLength?: number;
  className?: string;
  isRecordingGif?: boolean;
  isDark?: boolean;
  onGifFrame?: (canvas: HTMLCanvasElement) => void;
  onGifComplete?: () => void;
}

// ─── Smooth arrow: cylinder shaft + cone tip, rendered from origin → tip ─────
function StateArrow({
  blochVec,
  color,
  isTarget = false
}: {
  blochVec: BlochVector;
  color: string;
  isTarget?: boolean;
}) {
  const targetRef = useRef(new THREE.Vector3(blochVec.u, blochVec.w, blochVec.v));
  const smoothed = useRef(new THREE.Vector3(blochVec.u, blochVec.w, blochVec.v));

  const coneRef = useRef<THREE.Mesh>(null!);
  const shaftRef = useRef<THREE.Mesh>(null!);

  const CONE_H = 0.2;
  const SHAFT_R = 0.022;

  useFrame((_, dt) => {
    targetRef.current.set(blochVec.u, blochVec.w, blochVec.v);
    smoothed.current.lerp(targetRef.current, Math.min(1, dt * 9));

    const tip = smoothed.current;
    const len = tip.length();
    if (len < 0.001) return;
    const dir = tip.clone().normalize();

    const shaftEnd = tip.clone().sub(dir.clone().multiplyScalar(CONE_H * 0.55));
    const shaftLen = shaftEnd.length();
    const shaftMid = shaftEnd.clone().multiplyScalar(0.5);

    if (shaftRef.current) {
      shaftRef.current.position.copy(shaftMid);
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      shaftRef.current.quaternion.copy(quat);
      shaftRef.current.scale.set(1, shaftLen, 1);
    }

    if (coneRef.current) {
      coneRef.current.position.copy(tip.clone().sub(dir.clone().multiplyScalar(CONE_H * 0.5)));
      const up2 = new THREE.Vector3(0, 1, 0);
      coneRef.current.quaternion.setFromUnitVectors(up2, dir);
    }
  });

  return (
    <>
      <mesh ref={shaftRef}>
        <cylinderGeometry args={[SHAFT_R, SHAFT_R, 1, 12]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.1} 
          metalness={0.4} 
          emissive={color} 
          emissiveIntensity={0.2} 
          transparent={isTarget}
          opacity={isTarget ? 0.4 : 1}
        />
      </mesh>
      <mesh ref={coneRef}>
        <coneGeometry args={[0.058, CONE_H, 20]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.05} 
          metalness={0.5} 
          emissive={color} 
          emissiveIntensity={0.35}
          transparent={isTarget}
          opacity={isTarget ? 0.4 : 1}
        />
      </mesh>
    </>
  );
}

// ─── Main scene ───────────────────────────────────────────────────────────────
function SphereScene({
  blochVec,
  targetBlochVec,
  trajectories,
  spinColor = '#3b82f6',
  traceColor = '#1d4ed8',
  topStateText = '|0⟩',
  bottomStateText = '|1⟩',
  historyLength = 10,
  isRecordingGif,
  isDark,
  onGifFrame,
  onGifComplete
}: {
  blochVec: BlochVector;
  targetBlochVec?: BlochVector;
  trajectories: TrajectoryPoint[];
  spinColor?: string;
  traceColor?: string;
  topStateText?: string;
  bottomStateText?: string;
  historyLength?: number;
  isRecordingGif?: boolean;
  isDark?: boolean;
  onGifFrame?: (canvas: HTMLCanvasElement) => void;
  onGifComplete?: () => void;
}) {
  const { gl, scene, camera } = useThree();
  const N = 96;

  const lastFrameTime = useRef(0);

  useFrame((state) => {
    if (isRecordingGif && onGifFrame) {
      const now = state.clock.elapsedTime;
      // Capture at ~20 FPS (every 0.05 seconds) to prevent massive memory usage
      if (now - lastFrameTime.current >= 0.05) {
        gl.render(scene, camera);
        onGifFrame(gl.domElement);
        lastFrameTime.current = now;
      }
    }
  });

  const gridLines = useMemo(() => {
    const lines: { pts: [number, number, number][]; key: string; isEquator: boolean }[] = [];

    for (const latDeg of [-60, -30, 0, 30, 60]) {
      const latRad = (latDeg * Math.PI) / 180;
      const r = Math.cos(latRad);
      const y = Math.sin(latRad);
      const ring: [number, number, number][] = [];
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * Math.PI * 2;
        ring.push([r * Math.cos(t), y, r * Math.sin(t)]);
      }
      lines.push({ pts: ring, key: `lat${latDeg}`, isEquator: latDeg === 0 });
    }

    for (let deg = 0; deg < 180; deg += 30) {
      const phi = (deg * Math.PI) / 180;
      const mer: [number, number, number][] = [];
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * Math.PI * 2;
        mer.push([Math.sin(t) * Math.cos(phi), Math.cos(t), Math.sin(t) * Math.sin(phi)]);
      }
      lines.push({ pts: mer, key: `lon${deg}`, isEquator: false });
    }

    return lines;
  }, []);

  const activeTrajectories = useMemo(() => {
    return trajectories.slice(-historyLength).map((traj, idx) => ({
      id: idx,
      pts: traj.x.map((_, i): [number, number, number] => [traj.x[i], traj.z[i], traj.y[i]]),
      color: traj.color || traceColor
    }));
  }, [trajectories, historyLength, traceColor]);

  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight position={[3, 6, 4]} intensity={0.6} />
      <pointLight position={[-5, 4, -5]} intensity={0.2} color="#a5b4fc" />

      {/* Sphere shell */}
      <mesh>
        <sphereGeometry args={[1, 72, 72]} />
        <meshPhysicalMaterial
          color="#c8d8ee"
          transparent
          opacity={0.11}
          roughness={0.04}
          clearcoat={1}
          clearcoatRoughness={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Grid lines */}
      {gridLines.map(({ pts, key, isEquator }) => (
        <Line
          key={key}
          points={pts}
          color={isEquator ? '#7a8fb5' : '#8a9db8'}
          lineWidth={isEquator ? 1.1 : 0.65}
          transparent
          opacity={isEquator ? 0.7 : 0.42}
        />
      ))}

      {/* Axes */}
      <Line points={[[0, -1.22, 0], [0, 1.22, 0]]} color="#64748b" lineWidth={1.0} />
      <Line points={[[-1.22, 0, 0], [1.22, 0, 0]]} color="#64748b" lineWidth={1.0} />
      <Line points={[[0, 0, -1.22], [0, 0, 1.22]]} color="#64748b" lineWidth={1.0} />

      {/* ── Labels — plain bold text, NO glow, theme-aware via Tailwind ── */}
      <Text position={[0, 1.46, 0]} color={isDark ? '#ffffff' : '#000000'} fontSize={0.16} anchorX="center" anchorY="middle" material-type="MeshBasicMaterial">
        {topStateText}
      </Text>

      <Text position={[0, -1.46, 0]} color={isDark ? '#ffffff' : '#000000'} fontSize={0.16} anchorX="center" anchorY="middle" material-type="MeshBasicMaterial">
        {bottomStateText}
      </Text>

      <Text position={[1.38, 0.06, 0]} color={isDark ? '#e2e8f0' : '#334155'} fontSize={0.12} anchorX="center" anchorY="middle" material-type="MeshBasicMaterial">
        x
      </Text>

      <Text position={[0, 0.06, 1.38]} color={isDark ? '#e2e8f0' : '#334155'} fontSize={0.12} anchorX="center" anchorY="middle" material-type="MeshBasicMaterial">
        y
      </Text>

      {/* Trajectories */}
      {activeTrajectories.map((t) => (
        <Line key={t.id} points={t.pts} color={t.color} lineWidth={3.0} transparent opacity={0.88} />
      ))}

      {/* Arrow */}
      {targetBlochVec && (
        <StateArrow blochVec={targetBlochVec} color="#10b981" isTarget />
      )}
      <StateArrow blochVec={blochVec} color={spinColor} />

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={1.8}
        maxDistance={4.5}
        rotateSpeed={0.72}
        zoomSpeed={0.8}
      />
    </>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
export const BlochSphere3D: React.FC<BlochSphere3DProps> = ({
  blochVec,
  targetBlochVec,
  trajectories,
  spinColor = '#3b82f6',
  traceColor = '#1d4ed8',
  topStateText = '|0⟩',
  bottomStateText = '|1⟩',
  historyLength = 10,
  isRecordingGif,
  isDark,
  onGifFrame,
  onGifComplete,
  className = ''
}) => {
  return (
    <div className={`w-full h-full min-h-[400px] relative overflow-hidden ${className}`}>
      <Canvas
        camera={{ position: [2.1, 1.55, 2.1], fov: 40 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      >
        <SphereScene
          blochVec={blochVec}
          targetBlochVec={targetBlochVec}
          trajectories={trajectories}
          spinColor={spinColor}
          traceColor={traceColor}
          topStateText={topStateText}
          bottomStateText={bottomStateText}
          historyLength={historyLength}
          isRecordingGif={isRecordingGif}
          isDark={isDark}
          onGifFrame={onGifFrame}
          onGifComplete={onGifComplete}
        />
      </Canvas>
    </div>
  );
};
