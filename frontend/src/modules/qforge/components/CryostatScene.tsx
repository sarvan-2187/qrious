import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import type { BuildGraphState } from '../hooks/useBuildState';

interface StagePlateProps {
  position: [number, number, number];
  name: string;
  temp: string;
  radius?: number;
  color?: string;
}

const StagePlate: React.FC<StagePlateProps> = ({ 
  position, 
  name, 
  temp, 
  radius = 2.5, 
  color = '#d4af37' 
}) => {
  return (
    <group position={position}>
      {/* The plate itself */}
      <mesh receiveShadow castShadow>
        <cylinderGeometry args={[radius, radius, 0.1, 32]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Label */}
      <Text
        position={[radius + 0.5, 0, 0]}
        fontSize={0.25}
        color="#a1a1aa"
        anchorX="left"
        anchorY="middle"
      >
        {`${name} (${temp})`}
      </Text>
    </group>
  );
};

interface CryostatSceneProps {
  buildGraph: BuildGraphState;
  onRemove: (id: string) => void;
}

export const CryostatScene: React.FC<CryostatSceneProps> = ({ buildGraph, onRemove }) => {
  return (
    <div className="w-full h-full">
      <Canvas shadows camera={{ position: [8, 4, 8], fov: 45 }}>
        <color attach="background" args={['#09090b']} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
        <pointLight position={[-5, 5, -5]} intensity={0.5} />
        
        <OrbitControls 
          enablePan={false}
          minDistance={5}
          maxDistance={15}
          maxPolarAngle={Math.PI / 1.5}
        />

        {/* Stacked stages */}
        <group position={[0, -2, 0]}>
          <StagePlate position={[0, 4, 0]} name="300K Stage" temp="300 K" radius={3} color="#e5e7eb" />
          <StagePlate position={[0, 3, 0]} name="50K Stage" temp="50 K" radius={2.8} />
          <StagePlate position={[0, 2, 0]} name="4K Stage" temp="4 K" radius={2.6} />
          <StagePlate position={[0, 1, 0]} name="Still" temp="700 mK" radius={2.4} />
          <StagePlate position={[0, 0, 0]} name="Cold Plate" temp="100 mK" radius={2.2} />
          <StagePlate position={[0, -1, 0]} name="Mixing Chamber" temp="10 mK" radius={2.0} color="#b87333" />
          
          {/* Central post/support connecting plates */}
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 5, 16]} />
            <meshStandardMaterial color="#71717a" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      </Canvas>
    </div>
  );
};
