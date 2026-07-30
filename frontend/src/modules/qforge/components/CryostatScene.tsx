import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '@/context/ThemeContext';
import type { BuildGraphState, PlacedComponent } from '../hooks/useBuildState';
import { COMPONENTS } from '../constants/components';
import type { ComponentKind } from '../constants/components';
import type { StageId } from '../constants/stages';

const STAGE_Y_MAP: Record<StageId, number> = {
  '300K': 4.5,
  '50K': 3.2,
  '4K': 1.9,
  'still': 0.6,
  'coldplate': -0.7,
  'mxc': -2.0,
};

const STAGE_RADIUS_MAP: Record<StageId, number> = {
  '300K': 3.2,
  '50K': 2.9,
  '4K': 2.6,
  'still': 2.3,
  'coldplate': 2.0,
  'mxc': 1.7,
};

// Radial positions for coaxial lines (Drive, Readout, Flux/DC)
const LINE_OFFSET_X = {
  drive: -1.1,
  readout: 1.1,
  flux: 0.0,
};
const LINE_OFFSET_Z = {
  drive: 0.3,
  readout: 0.3,
  flux: -1.0,
};

/** Satin Gold & Satin Silver Radial Top Texture Generators */
function createSatinRadialDiscTexture(stage: StageId): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);

  if (stage === '300K') {
    gradient.addColorStop(0.00, '#FFFFFF');
    gradient.addColorStop(0.60, '#E5E7EB');
    gradient.addColorStop(1.00, '#9CA3AF');
  } else {
    gradient.addColorStop(0.00, '#FFE885');
    gradient.addColorStop(0.70, '#F0C435');
    gradient.addColorStop(1.00, '#D4A017');
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/** Satin Rim Edge (Lip) Texture Generators */
function createSatinRimLipTexture(stage: StageId): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, 256);

  if (stage === '300K') {
    gradient.addColorStop(0.0, '#F3F4F6');
    gradient.addColorStop(1.0, '#9CA3AF');
  } else {
    gradient.addColorStop(0.0, '#FFE885');
    gradient.addColorStop(0.5, '#D4A017');
    gradient.addColorStop(1.0, '#B8860B');
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/** Support Rods Symmetric Cylindrical Gradient Generator */
function createSatinRodTexture(isSilver: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 256, 0);

  if (isSilver) {
    gradient.addColorStop(0.00, '#6B7280');
    gradient.addColorStop(0.50, '#E5E7EB');
    gradient.addColorStop(1.00, '#6B7280');
  } else {
    gradient.addColorStop(0.00, '#B8860B');
    gradient.addColorStop(0.50, '#F0C435');
    gradient.addColorStop(1.00, '#B8860B');
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/** Soft Contact Ambient Occlusion Shadow Texture */
function createSoftAOShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0.0, 'rgba(45, 25, 0, 0.20)');
  gradient.addColorStop(0.7, 'rgba(45, 25, 0, 0.05)');
  gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

interface StagePlateProps {
  stageId: StageId;
  position: [number, number, number];
  name: string;
  temp: string;
  radius: number;
  count: number;
  isDark: boolean;
}

const StagePlate: React.FC<StagePlateProps> = ({ 
  stageId,
  position, 
  name, 
  temp, 
  radius, 
  count,
  isDark
}) => {
  const topDiscTexture = useMemo(() => createSatinRadialDiscTexture(stageId), [stageId]);
  const rimLipTexture = useMemo(() => createSatinRimLipTexture(stageId), [stageId]);
  const shadowTexture = useMemo(() => createSoftAOShadowTexture(), []);

  const isSilver = stageId === '300K';

  return (
    <group position={position}>
      {/* Top Disc Face (Satin Radial Gradient) */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial 
          color={isSilver ? '#D1D5DB' : '#F0C435'}
          map={topDiscTexture} 
          metalness={isSilver ? 0.80 : 0.85} 
          roughness={isSilver ? 0.30 : 0.35} 
        />
      </mesh>
      
      {/* 3D Disc Rim Lip Edge */}
      <mesh receiveShadow castShadow>
        <cylinderGeometry args={[radius, radius, 0.12, 64, 1, true]} />
        <meshStandardMaterial 
          color={isSilver ? '#D1D5DB' : '#F0C435'}
          map={rimLipTexture} 
          metalness={isSilver ? 0.80 : 0.85} 
          roughness={isSilver ? 0.30 : 0.35} 
        />
      </mesh>

      {/* Bottom Face of Disc */}
      <mesh position={[0, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow castShadow>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial 
          color={isSilver ? '#D1D5DB' : '#F0C435'}
          map={rimLipTexture} 
          metalness={isSilver ? 0.80 : 0.85} 
          roughness={isSilver ? 0.30 : 0.35} 
        />
      </mesh>

      {/* Gold Thermal Anchor Flanges for Coax Cables */}
      <group position={[LINE_OFFSET_X.drive, 0, LINE_OFFSET_Z.drive]}>
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.05, 24]} />
          <meshStandardMaterial color="#D4A017" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      <group position={[LINE_OFFSET_X.readout, 0, LINE_OFFSET_Z.readout]}>
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.05, 24]} />
          <meshStandardMaterial color="#D4A017" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      <group position={[LINE_OFFSET_X.flux, 0, LINE_OFFSET_Z.flux]}>
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.05, 24]} />
          <meshStandardMaterial color="#B8860B" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* Soft Contact Ambient Occlusion Shadow */}
      <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[radius * 2.1, radius * 2.1]} />
        <meshBasicMaterial 
          map={shadowTexture} 
          transparent={true} 
          depthWrite={false}
        />
      </mesh>
      
      {/* Stage Label */}
      <Text
        position={[radius + 0.5, 0, 0]}
        fontSize={0.26}
        color={count > 0 ? (isDark ? "#34d399" : "#059669") : (isDark ? "#e4e4e7" : "#3f3f46")}
        anchorX="left"
        anchorY="middle"
      >
        {`${name} (${temp}) ${count > 0 ? `[${count} components]` : ''}`}
      </Text>
    </group>
  );
};

interface SupportRodsProps {
  topY: number;
  bottomY: number;
  radius: number;
  isTopStage: boolean;
}

const SupportRods: React.FC<SupportRodsProps> = ({ topY, bottomY, radius, isTopStage }) => {
  const height = topY - bottomY;
  const posY = (topY + bottomY) / 2;
  const rodDist = radius * 0.78;
  const rodRadius = 0.065;

  const rodTexture = useMemo(() => createSatinRodTexture(isTopStage), [isTopStage]);
  const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

  return (
    <group position={[0, posY, 0]}>
      {angles.map((angle, idx) => (
        <mesh key={idx} position={[Math.cos(angle) * rodDist, 0, Math.sin(angle) * rodDist]} castShadow>
          <cylinderGeometry args={[rodRadius, rodRadius, height, 24]} />
          <meshStandardMaterial 
            color={isTopStage ? '#D1D5DB' : '#F0C435'}
            map={rodTexture} 
            metalness={isTopStage ? 0.80 : 0.85} 
            roughness={isTopStage ? 0.30 : 0.35} 
          />
        </mesh>
      ))}
    </group>
  );
};

/** Continuous Vertical Coaxial Cable Harnesses connecting stages */
interface ContinuousCoaxCablesProps {
  topY: number;
  bottomY: number;
}

const ContinuousCoaxCables: React.FC<ContinuousCoaxCablesProps> = ({ topY, bottomY }) => {
  const height = topY - bottomY;
  const posY = (topY + bottomY) / 2;
  const wireRadius = 0.035;

  return (
    <group position={[0, posY, 0]}>
      {/* Drive Line Coax (Blue / Silver Metallic Cable) */}
      <mesh position={[LINE_OFFSET_X.drive, 0, LINE_OFFSET_Z.drive]} castShadow>
        <cylinderGeometry args={[wireRadius, wireRadius, height, 16]} />
        <meshStandardMaterial color="#0284c7" metalness={0.75} roughness={0.25} />
      </mesh>

      {/* Readout Line Coax (Gold / Silver Metallic Cable) */}
      <mesh position={[LINE_OFFSET_X.readout, 0, LINE_OFFSET_Z.readout]} castShadow>
        <cylinderGeometry args={[wireRadius, wireRadius, height, 16]} />
        <meshStandardMaterial color="#eab308" metalness={0.85} roughness={0.20} />
      </mesh>

      {/* Flux / DC Line Coax (Copper Cable) */}
      <mesh position={[LINE_OFFSET_X.flux, 0, LINE_OFFSET_Z.flux]} castShadow>
        <cylinderGeometry args={[wireRadius * 0.8, wireRadius * 0.8, height, 16]} />
        <meshStandardMaterial color="#b45309" metalness={0.80} roughness={0.30} />
      </mesh>
    </group>
  );
};

/** 3D Geometries for Components fitted inline with coax lines */
const ComponentGeometry: React.FC<{ kind: ComponentKind; isDrive: boolean }> = ({ kind, isDrive }) => {
  switch (kind) {
    case 'attenuator':
      return (
        <group>
          {/* Attenuator Hexagonal/Cylindrical Body */}
          <mesh castShadow>
            <cylinderGeometry args={[0.11, 0.11, 0.42, 24]} />
            <meshStandardMaterial color="#F0C435" metalness={0.85} roughness={0.35} />
          </mesh>
          {/* Gold Thermal Anchor Ring */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.14, 24]} />
            <meshStandardMaterial color="#D4A017" metalness={0.90} roughness={0.20} />
          </mesh>
          {/* Top SMA Connector */}
          <mesh position={[0, 0.26, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.1, 16]} />
            <meshStandardMaterial color="#D1D5DB" metalness={0.85} roughness={0.25} />
          </mesh>
          {/* Bottom SMA Connector */}
          <mesh position={[0, -0.26, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.1, 16]} />
            <meshStandardMaterial color="#D1D5DB" metalness={0.85} roughness={0.25} />
          </mesh>
        </group>
      );

    case 'twpa':
      return (
        <group>
          <mesh castShadow>
            <boxGeometry args={[0.55, 0.28, 0.45]} />
            <meshStandardMaterial color="#F0C435" metalness={0.85} roughness={0.35} />
          </mesh>
          <mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, 0.12, 16]} />
            <meshStandardMaterial color="#D1D5DB" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[-0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, 0.12, 16]} />
            <meshStandardMaterial color="#D1D5DB" metalness={0.85} roughness={0.25} />
          </mesh>
        </group>
      );

    case 'hemt':
      return (
        <group>
          <mesh castShadow>
            <boxGeometry args={[0.5, 0.32, 0.38]} />
            <meshStandardMaterial color="#D1D5DB" metalness={0.80} roughness={0.30} />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <boxGeometry args={[0.42, 0.05, 0.32]} />
            <meshStandardMaterial color="#6B7280" metalness={0.80} roughness={0.30} />
          </mesh>
          <mesh position={[-0.28, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, 0.1, 16]} />
            <meshStandardMaterial color="#F0C435" metalness={0.85} roughness={0.35} />
          </mesh>
          <mesh position={[0.28, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, 0.1, 16]} />
            <meshStandardMaterial color="#F0C435" metalness={0.85} roughness={0.35} />
          </mesh>
        </group>
      );

    case 'circulator':
      return (
        <group>
          <mesh castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.25, 3]} />
            <meshStandardMaterial color="#D4A017" metalness={0.85} roughness={0.35} />
          </mesh>
          {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((angle, i) => (
            <mesh 
              key={i} 
              position={[Math.cos(angle) * 0.25, 0, Math.sin(angle) * 0.25]}
              rotation={[0, -angle, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.05, 0.05, 0.1, 12]} />
              <meshStandardMaterial color="#D1D5DB" metalness={0.85} roughness={0.25} />
            </mesh>
          ))}
        </group>
      );

    case 'filter':
      return (
        <group>
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.45, 24]} />
            <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.05, 24]} />
            <meshStandardMaterial color="#F0C435" metalness={0.85} roughness={0.35} />
          </mesh>
          <mesh position={[0, -0.1, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.05, 24]} />
            <meshStandardMaterial color="#F0C435" metalness={0.85} roughness={0.35} />
          </mesh>
        </group>
      );

    default:
      return (
        <mesh castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.35, 16]} />
          <meshStandardMaterial color={isDrive ? '#10b981' : '#3b82f6'} metalness={0.8} roughness={0.3} />
        </mesh>
      );
  }
};

interface ComponentMeshProps {
  component: PlacedComponent;
  index: number;
  totalAtStage: number;
  stageY: number;
  isDark: boolean;
  onSelect?: () => void;
}

const ComponentMesh: React.FC<ComponentMeshProps> = ({ 
  component, 
  stageY, 
  isDark,
  onSelect,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const spec = COMPONENTS.find(c => c.id === component.componentId);

  const isDrive = component.line === 'drive';
  const lineX = isDrive ? LINE_OFFSET_X.drive : LINE_OFFSET_X.readout;
  const lineZ = isDrive ? LINE_OFFSET_Z.drive : LINE_OFFSET_Z.readout;
  
  // Position inline vertically along the coax cable line
  const targetX = lineX;
  const targetZ = lineZ;
  const targetY = stageY + 0.35;

  const [currentY] = useState(stageY + 2.5);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, delta * 5);
      if (Math.abs(groupRef.current.position.y - targetY) > 0.05) {
        groupRef.current.rotation.y += delta * 3;
      } else {
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, delta * 5);
      }
    }
  });

  const kind = spec?.kind || 'attenuator';

  return (
    <group 
      ref={groupRef} 
      position={[targetX, currentY, targetZ]} 
      onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
      className="cursor-pointer"
    >
      <ComponentGeometry kind={kind} isDrive={isDrive} />

      {/* Gold Thermal Mount Anchor Base */}
      <mesh position={[0, -0.24, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.04, 24]} />
        <meshStandardMaterial color="#F0C435" metalness={0.85} roughness={0.35} />
      </mesh>

      <Text
        position={[0.3, 0.2, 0]}
        fontSize={0.16}
        color={isDark ? "#ffffff" : "#09090b"}
        anchorX="left"
        anchorY="middle"
      >
        {spec?.name || component.componentId}
      </Text>
    </group>
  );
};

interface CryostatSceneProps {
  buildGraph: BuildGraphState;
  onRemove: (id: string) => void;
  onSelectComponent?: (componentId: string) => void;
  isExploded?: boolean;
  isVacuumSealed?: boolean;
}

export const CryostatScene: React.FC<CryostatSceneProps> = ({ 
  buildGraph, 
  onRemove,
  onSelectComponent,
  isExploded = false,
  isVacuumSealed = false
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const multiplier = isExploded ? 1.85 : 1.0;

  const componentsByStage = buildGraph.placedComponents.reduce((acc, comp) => {
    acc[comp.stageId] = acc[comp.stageId] || [];
    acc[comp.stageId].push(comp);
    return acc;
  }, {} as Record<string, PlacedComponent[]>);

  const stagesKeys: StageId[] = ['300K', '50K', '4K', 'still', 'coldplate', 'mxc'];

  return (
    <div className="w-full h-full">
      <Canvas shadows camera={{ position: [11, 4.5, 11], fov: 45 }}>
        <color attach="background" args={[isDark ? '#09090b' : '#f8fafc']} />
        
        {/* Studio Omnidirectional Lighting Setup */}
        <ambientLight intensity={1.8} />
        <hemisphereLight skyColor="#ffffff" groundColor="#f0c435" intensity={1.2} />
        
        <directionalLight position={[10, 10, 10]} intensity={0.9} color="#ffffff" />
        <directionalLight position={[-10, 10, -10]} intensity={0.9} color="#ffffff" />
        <directionalLight position={[10, -10, -10]} intensity={0.9} color="#ffffff" />
        <directionalLight position={[-10, -10, 10]} intensity={0.9} color="#ffffff" />

        <Environment preset="city" environmentIntensity={0.6} />

        <OrbitControls 
          target={[0, 1.2 * multiplier, 0]}
          enablePan={true}
          minDistance={4}
          maxDistance={30}
          maxPolarAngle={Math.PI / 1.3}
        />

        <group position={[0, 0, 0]}>
          {/* Support Rods & Continuous Coaxial Lines */}
          {stagesKeys.slice(0, -1).map((stage, i) => {
            const nextStage = stagesKeys[i + 1];
            return (
              <React.Fragment key={`harness-${stage}`}>
                <SupportRods 
                  topY={STAGE_Y_MAP[stage] * multiplier}
                  bottomY={STAGE_Y_MAP[nextStage] * multiplier}
                  radius={STAGE_RADIUS_MAP[nextStage]}
                  isTopStage={stage === '300K'}
                />
                <ContinuousCoaxCables 
                  topY={STAGE_Y_MAP[stage] * multiplier}
                  bottomY={STAGE_Y_MAP[nextStage] * multiplier}
                />
              </React.Fragment>
            );
          })}

          {/* Hyper-Realistic Satin Gold & Silver Stage Plates */}
          {stagesKeys.map(stage => (
            <StagePlate 
              key={stage}
              stageId={stage}
              position={[0, STAGE_Y_MAP[stage] * multiplier, 0]}
              name={stage === '300K' ? '300K Room Temp' : `${stage.toUpperCase()} Stage`}
              temp={stage === '300K' ? '300 K' : stage === '50K' ? '50 K' : stage === '4K' ? '4 K' : stage === 'still' ? '700 mK' : stage === 'coldplate' ? '100 mK' : '10 mK'}
              radius={STAGE_RADIUS_MAP[stage]}
              count={componentsByStage[stage]?.length || 0}
              isDark={isDark}
            />
          ))}

          {/* QPU Package Enclosure suspended under MXC Stage */}
          <group position={[0, -2.7 * multiplier, 0]}>
            {/* Outer Copper Enclosure Bracket */}
            <mesh castShadow>
              <boxGeometry args={[1.4, 0.45, 1.4]} />
              <meshStandardMaterial color="#B8860B" metalness={0.90} roughness={0.25} />
            </mesh>
            {/* Inner Shielded Transmon Chip Holder */}
            <mesh position={[0, -0.26, 0]}>
              <boxGeometry args={[1.0, 0.12, 1.0]} />
              <meshStandardMaterial color="#38bdf8" metalness={0.80} roughness={0.30} emissive="#0284c7" emissiveIntensity={0.5} />
            </mesh>
            {/* Coax Input/Output Launcher Connector Blocks */}
            <mesh position={[LINE_OFFSET_X.drive, 0.25, LINE_OFFSET_Z.drive]}>
              <cylinderGeometry args={[0.08, 0.08, 0.12, 16]} />
              <meshStandardMaterial color="#D1D5DB" metalness={0.85} roughness={0.25} />
            </mesh>
            <mesh position={[LINE_OFFSET_X.readout, 0.25, LINE_OFFSET_Z.readout]}>
              <cylinderGeometry args={[0.08, 0.08, 0.12, 16]} />
              <meshStandardMaterial color="#D1D5DB" metalness={0.85} roughness={0.25} />
            </mesh>

            <Text
              position={[0, -0.55, 0]}
              fontSize={0.22}
              color={isDark ? "#facc15" : "#d97706"}
              anchorX="center"
              anchorY="top"
            >
              Contralto-A QPU (17 Qubits)
            </Text>
          </group>

          {/* Installed Components Inline along Coaxial Cable Lines */}
          {buildGraph.placedComponents.map((comp) => {
            const stageY = (STAGE_Y_MAP[comp.stageId] ?? 0) * multiplier;
            const stageComponents = componentsByStage[comp.stageId] || [];
            const idx = stageComponents.findIndex(c => c.id === comp.id);

            return (
              <ComponentMesh
                key={comp.id}
                component={comp}
                index={idx}
                totalAtStage={stageComponents.length}
                stageY={stageY}
                isDark={isDark}
                onSelect={() => onSelectComponent?.(comp.componentId)}
              />
            );
          })}
        </group>
      </Canvas>
    </div>
  );
};

export default CryostatScene;
