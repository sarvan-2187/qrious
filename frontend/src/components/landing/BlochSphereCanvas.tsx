import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sphere, Line, Preload, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function BlochSphereInner({ color = '#34D399', wireframeOpacity = 0.2 }) {
  const groupRef = useRef<THREE.Group>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  const { gl } = useThree();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0 }
    );
    observer.observe(gl.domElement);
    return () => observer.disconnect();
  }, [gl.domElement]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current && !reducedMotion && isVisible) {
      groupRef.current.rotation.y += delta * 0.15;
      groupRef.current.rotation.z += delta * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main sphere wireframe */}
      <Sphere args={[2, 32, 32]}>
        <meshBasicMaterial 
          color={color} 
          wireframe 
          transparent 
          opacity={wireframeOpacity} 
        />
      </Sphere>
      
      {/* Equator */}
      <Sphere args={[2.01, 32, 2]} rotation={[Math.PI / 2, 0, 0]}>
         <meshBasicMaterial 
          color={color} 
          wireframe 
          transparent 
          opacity={wireframeOpacity * 2} 
        />
      </Sphere>

      {/* Axis Z (vertical) */}
      <Line 
        points={[new THREE.Vector3(0, -2.5, 0), new THREE.Vector3(0, 2.5, 0)]}
        color={color}
        lineWidth={1}
        transparent
        opacity={0.5}
      />
      {/* State Vector */}
      <Line 
        points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.4, 1.4, 0)]}
        color="#ffffff"
        lineWidth={2}
      />
      <mesh position={[1.4, 1.4, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

interface BlochSphereCanvasProps {
  color?: string;
  wireframeOpacity?: number;
}

export default function BlochSphereCanvas({ color, wireframeOpacity }: BlochSphereCanvasProps) {
  return (
    <div className="w-full h-full pointer-events-none absolute inset-0 z-0">
      <Canvas 
        camera={{ position: [0, 0, 6], fov: 45 }} 
        dpr={[1, 1.5]}
        gl={{ preserveDrawingBuffer: false, powerPreference: 'low-power' }}
      >
        <ambientLight intensity={0.5} />
        <BlochSphereInner color={color} wireframeOpacity={wireframeOpacity} />
        <Preload all />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
      </Canvas>
    </div>
  );
}
