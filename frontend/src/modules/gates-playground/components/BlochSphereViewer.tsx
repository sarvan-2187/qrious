import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { BlochVector } from '../hooks/useDebugStepApi';

interface BlochSphereViewerProps {
  vector: BlochVector;
  qubitIndex: string;
}

const BlochArrow = ({ vector }: { vector: BlochVector }) => {
  // Qiskit Z -> Three Y
  // Qiskit X -> Three X
  // Qiskit Y -> Three -Z
  const endPoint = new THREE.Vector3(vector.x, vector.z, -vector.y);
  const origin = new THREE.Vector3(0, 0, 0);
  
  // Handle the zero vector case (e.g. completely mixed state)
  if (endPoint.length() < 0.001) {
    return <mesh position={[0,0,0]}><sphereGeometry args={[0.05, 16, 16]}/><meshBasicMaterial color="#ff007a"/></mesh>;
  }
  
  const dir = endPoint.clone().normalize();
  const length = endPoint.length();
  
  return (
    <arrowHelper args={[dir, origin, length, 0xff007a, 0.2, 0.1]} />
  );
};

export const BlochSphereViewer: React.FC<BlochSphereViewerProps> = ({ vector, qubitIndex }) => {
  return (
    <div className="w-full h-64 relative overflow-hidden">
      {/* Qubit Badge */}
      <div className="absolute top-2 left-2 z-10 text-emerald-400 font-mono text-xs font-bold bg-slate-900/90 border border-emerald-500/30 px-2.5 py-1 rounded-lg backdrop-blur-md shadow-sm">
        q[{qubitIndex}]
      </div>
      
      {/* Coordinates Pill Badge - Crisp High Contrast Text */}
      <div className="absolute bottom-2 left-2 z-10 text-white font-mono text-[11px] font-semibold bg-slate-900/90 border border-slate-700/60 px-3 py-1 rounded-lg backdrop-blur-md shadow-sm">
        X: <span className="text-emerald-400 font-bold">{vector.x.toFixed(2)}</span> | Y: <span className="text-emerald-400 font-bold">{vector.y.toFixed(2)}</span> | Z: <span className="text-emerald-400 font-bold">{vector.z.toFixed(2)}</span>
      </div>

      <Canvas camera={{ position: [1.8, 1.8, 1.8], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        
        {/* Wireframe Sphere */}
        <Sphere args={[1, 32, 32]}>
          <meshBasicMaterial wireframe color="#475569" transparent opacity={0.15} />
        </Sphere>
        
        {/* Equator */}
        <Line points={Array.from({length: 65}).map((_, i) => {
          const theta = (i / 64) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta));
        })} color="#64748b" lineWidth={1} transparent opacity={0.5} />
        
        {/* Axes */}
        <Line points={[[-1.2, 0, 0], [1.2, 0, 0]]} color="#ef4444" lineWidth={1} transparent opacity={0.4} />
        <Text position={[1.4, 0, 0]} color="#ef4444" fontSize={0.15}>+X</Text>
        
        <Line points={[[0, 0, -1.2], [0, 0, 1.2]]} color="#22c55e" lineWidth={1} transparent opacity={0.4} />
        <Text position={[0, 0, -1.4]} color="#22c55e" fontSize={0.15}>+Y</Text>
        
        <Line points={[[0, -1.2, 0], [0, 1.2, 0]]} color="#3b82f6" lineWidth={1} transparent opacity={0.4} />
        <Text position={[0, 1.4, 0]} color="#3b82f6" fontSize={0.15}>|0⟩</Text>
        <Text position={[0, -1.4, 0]} color="#3b82f6" fontSize={0.15}>|1⟩</Text>
        
        <BlochArrow vector={vector} />
        
        <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
      </Canvas>
    </div>
  );
};
