import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Line, Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { FaInfoCircle, FaEllipsisV } from 'react-icons/fa';
import type { GateInstance } from '../hooks/useCircuitState';
import { getGateMatrix, transformMatrixBasis, complexMag, complexPhase } from '../utils/gateMatrices';
import { GATE_CATEGORIES } from './GateTray';

interface GateInspectorPopupProps {
  gate: GateInstance;
  onClose: () => void;
  updateGate: (id: string, updates: Partial<GateInstance>) => void;
  removeGate: (id: string) => void;
  position: { top: number; left: number };
}

// Sub-component for Bloch Sphere rendering
const BlochSphere: React.FC<{ blochVector: { x: number; y: number; z: number } | null }> = ({ blochVector }) => {
  const arrowRef = useRef<THREE.Group>(null);
  
  const axes = [
    { points: [new THREE.Vector3(-1.2, 0, 0), new THREE.Vector3(1.2, 0, 0)], color: 'gray', label: '|x>', pos: [1.3, 0, 0] },
    { points: [new THREE.Vector3(0, -1.2, 0), new THREE.Vector3(0, 1.2, 0)], color: 'gray', label: '|0>', pos: [0, 1.3, 0] },
    { points: [new THREE.Vector3(0, 0, -1.2), new THREE.Vector3(0, 0, 1.2)], color: 'gray', label: '|y>', pos: [0, 0, 1.3] },
  ];

  const targetVector = useMemo(() => {
    if (!blochVector) return new THREE.Vector3(0, 1, 0); 
    return new THREE.Vector3(blochVector.x, blochVector.z, blochVector.y);
  }, [blochVector]);

  useFrame(() => {
    if (arrowRef.current) {
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), targetVector.clone().normalize());
      arrowRef.current.quaternion.slerp(targetQuat, 0.1);
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <OrbitControls enableZoom={false} autoRotate={false} />
      
      <Sphere args={[1, 32, 32]}>
        <meshPhysicalMaterial 
          color="#A0A6B2" 
          transparent={true} 
          opacity={0.1} 
          roughness={0.1}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </Sphere>

      <Line points={Array.from({ length: 65 }).map((_, i) => {
        const angle = (i / 64) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      })} color="#2A2D34" lineWidth={1} />

      {axes.map((axis, i) => (
        <group key={i}>
          <Line points={axis.points} color={axis.color} lineWidth={1} dashed dashScale={10} dashSize={0.1} />
        </group>
      ))}

      <Text position={[0, 1.2, 0]} color="#F3F4F6" fontSize={0.15}>|0&gt;</Text>
      <Text position={[0, -1.2, 0]} color="#F3F4F6" fontSize={0.15}>|1&gt;</Text>
      <Text position={[1.2, 0, 0]} color="#F3F4F6" fontSize={0.15}>|x&gt;</Text>
      <Text position={[0, 0, 1.2]} color="#F3F4F6" fontSize={0.15}>|y&gt;</Text>

      <group ref={arrowRef}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
          <meshBasicMaterial color="#b45c8e" />
        </mesh>
        <mesh position={[0, 1, 0]}>
          <coneGeometry args={[0.06, 0.2, 8]} />
          <meshBasicMaterial color="#b45c8e" />
        </mesh>
      </group>
    </>
  );
};

export const GateInspectorPopup: React.FC<GateInspectorPopupProps> = ({ gate, onClose, updateGate, removeGate, position }) => {
  const rawMatrix = getGateMatrix(gate.name, gate.params);
  
  const [activeBasis, setActiveBasis] = useState<string>('01');
  const [showInfo, setShowInfo] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{r: number, c: number} | null>(null);

  const matrix = useMemo(() => transformMatrixBasis(rawMatrix, activeBasis), [rawMatrix, activeBasis]);

  const getLabels = (basis: string) => {
    if (basis === '+-') return ['+', '-'];
    if (basis === '+i-i') return ['+i', '-i'];
    return ['0', '1'];
  };
  
  const generateLabels = (n: number, base: string[]): string[] => {
    if (n === 1) return base;
    const prev = generateLabels(n - 1, base);
    return base.flatMap(b => prev.map(p => b + p));
  };
  
  const nQubits = Math.max(1, Math.log2(matrix.length));
  const labels = generateLabels(nQubits, getLabels(activeBasis));

  const allAvailableGates = useMemo(() => {
    return GATE_CATEGORIES.flatMap(cat => cat.gates);
  }, []);

  const [showOutput, setShowOutput] = useState(false);

  useEffect(() => {
    const handleOutsideClick = () => {
      setShowInfo(false);
      setShowMenu(false);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const blochVector = useMemo(() => {
    if (matrix.length > 2) return {x:0, y:0, z:1}; 
    const colIndex = hoveredCell ? hoveredCell.c : 0;
    
    let state01: [number, number][] = [[1,0], [0,0]];
    if (activeBasis === '01') {
      state01 = colIndex === 0 ? [[1,0], [0,0]] : [[0,0], [1,0]];
    } else if (activeBasis === '+-') {
      const invSq2 = 1/Math.sqrt(2);
      state01 = colIndex === 0 ? [[invSq2,0], [invSq2,0]] : [[invSq2,0], [-invSq2,0]];
    } else if (activeBasis === '+i-i') {
      const invSq2 = 1/Math.sqrt(2);
      state01 = colIndex === 0 ? [[invSq2,0], [0,invSq2]] : [[invSq2,0], [0,-invSq2]];
    }

    if (showOutput) {
      const out0 = [
        rawMatrix[0][0][0]*state01[0][0] - rawMatrix[0][0][1]*state01[0][1] + rawMatrix[0][1][0]*state01[1][0] - rawMatrix[0][1][1]*state01[1][1],
        rawMatrix[0][0][0]*state01[0][1] + rawMatrix[0][0][1]*state01[0][0] + rawMatrix[0][1][0]*state01[1][1] + rawMatrix[0][1][1]*state01[1][0]
      ];
      const out1 = [
        rawMatrix[1][0][0]*state01[0][0] - rawMatrix[1][0][1]*state01[0][1] + rawMatrix[1][1][0]*state01[1][0] - rawMatrix[1][1][1]*state01[1][1],
        rawMatrix[1][0][0]*state01[0][1] + rawMatrix[1][0][1]*state01[0][0] + rawMatrix[1][1][0]*state01[1][1] + rawMatrix[1][1][1]*state01[1][0]
      ];
      state01 = [out0, out1] as any;
    }

    const a = state01[0];
    const b = state01[1];
    const a_mag2 = a[0]*a[0] + a[1]*a[1];
    const b_mag2 = b[0]*b[0] + b[1]*b[1];
    const x = 2 * (a[0]*b[0] + a[1]*b[1]);
    const y = 2 * (a[0]*b[1] - a[1]*b[0]);
    const z = a_mag2 - b_mag2;

    return {x, y, z};
  }, [hoveredCell, activeBasis, rawMatrix, showOutput, matrix]);

  const isParametric = ['RX', 'RY', 'RZ', 'P', 'U', 'CP'].includes(gate.name);
  const angleStr = gate.params && gate.params.length > 0 ? gate.params[0].toString() : '1.5708';

  const handleGateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newName = e.target.value;
    updateGate(gate.id, { name: newName });
  };

  const handleParamChange = (val: string) => {
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      updateGate(gate.id, { params: [parsed] });
    }
  };

  return createPortal(
    <div 
      className="fixed z-[9999] bg-qp-card border border-qp-border rounded-xl shadow-2xl flex flex-col font-sans overflow-hidden text-qp-text"
      style={{
        width: 600,
        top: Math.max(10, Math.min(position.top, window.innerHeight - 450)),
        left: position.left > window.innerWidth / 2 ? position.left - 620 : position.left + 20,
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="bg-qp-secondary p-3 flex justify-between items-center border-b border-qp-border">
        <select 
          className="bg-qp-bg border border-qp-border rounded px-3 py-1.5 text-sm font-semibold outline-none focus:border-qp-text"
          value={gate.name}
          onChange={handleGateChange}
        >
          {allAvailableGates.map(g => (
            <option key={g.name} value={g.name}>{g.label} Gate</option>
          ))}
        </select>
        <div className="flex gap-4 text-qp-text-muted relative">
          <button 
            className={`transition ${showInfo ? 'text-qp-text' : 'hover:text-qp-text'}`} 
            title="Info"
            onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); setShowMenu(false); }}
          >
            <FaInfoCircle />
          </button>
          <button 
            className={`transition ${showMenu ? 'text-qp-text' : 'hover:text-qp-text'}`} 
            title="More"
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); setShowInfo(false); }}
          >
            <FaEllipsisV />
          </button>
          
          {showInfo && (
            <div className="absolute top-8 right-12 w-64 bg-qp-secondary border border-qp-border rounded shadow-lg p-3 text-sm text-qp-text z-50" onClick={e => e.stopPropagation()}>
              <h4 className="font-bold mb-1 border-b border-qp-border pb-1">{gate.name} Gate</h4>
              <p className="text-qp-text-muted text-xs mt-1">This gate operates on qubit {gate.target}. {gate.control !== undefined ? `It is controlled by qubit ${gate.control}.` : 'It is a single-qubit gate.'}</p>
            </div>
          )}

          {showMenu && (
            <div className="absolute top-8 right-6 w-32 bg-qp-secondary border border-qp-border rounded shadow-lg p-1 text-sm text-qp-text z-50" onClick={e => e.stopPropagation()}>
              <button className="w-full text-left px-3 py-1.5 hover:bg-qp-hover rounded transition" onClick={() => {
                if (gate.params) {
                  updateGate(gate.id, { params: [0] });
                }
                setShowMenu(false);
              }}>Reset Params</button>
            </div>
          )}

          <button className="hover:text-red-500 transition font-bold" title="Delete Gate" onClick={() => { removeGate(gate.id); onClose(); }}>Delete</button>
          <button className="text-xl leading-none hover:text-qp-text transition" onClick={onClose}>&times;</button>
        </div>
      </div>

      <div className="flex p-4 border-b border-qp-border">
        <div className="flex-1 flex flex-col items-center border-r border-qp-border">
          <h4 className="text-sm font-semibold mb-3">Change Basis</h4>
          <div className="flex gap-2">
            {['01', '+-', '+i-i'].map(basis => (
              <button 
                key={basis}
                className={`px-3 py-1 border rounded text-sm transition-colors ${activeBasis === basis ? 'bg-qp-hover border-qp-text text-qp-text shadow-inner' : 'bg-qp-bg border-qp-border text-qp-text-muted hover:bg-qp-hover'}`}
                onClick={() => setActiveBasis(basis)}
              >
                {basis}
              </button>
            ))}
          </div>
        </div>
        
        {isParametric && (
          <div className="flex-1 flex flex-col items-center border-r border-qp-border">
            <h4 className="text-sm font-semibold mb-3">Phase Angle</h4>
            <input 
              type="number"
              step="any"
              className="w-24 px-2 py-1 bg-qp-bg border border-qp-border rounded text-center text-sm focus:border-qp-text outline-none"
              value={angleStr}
              onChange={(e) => handleParamChange(e.target.value)}
            />
          </div>
        )}
        
        {!isParametric && (
          <>
            <div className="flex-1 flex flex-col items-center border-r border-qp-border">
              <h4 className="text-sm font-semibold mb-3">Amplitude</h4>
              <div className="h-14 flex flex-col items-center justify-start">
              {hoveredCell ? (
                <>
                  <div 
                    className="w-8 h-8 rounded-full bg-qp-text"
                    style={{ transform: `scale(${complexMag(matrix[hoveredCell.r][hoveredCell.c])})` }}
                  ></div>
                  <div className="text-xs text-qp-text-muted mt-2 font-mono">{complexMag(matrix[hoveredCell.r][hoveredCell.c]).toFixed(3)}</div>
                </>
              ) : (
                <div className="w-8 h-8 rounded-full border-[6px] border-qp-border bg-qp-text opacity-10 mt-1"></div>
              )}
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <h4 className="text-sm font-semibold mb-3">Phase</h4>
              <div className="h-14 flex flex-col items-center justify-start">
              {hoveredCell ? (
                <>
                  <div className="relative w-8 h-8 rounded-full bg-qp-secondary overflow-hidden shrink-0"
                       style={{
                         background: `conic-gradient(from 90deg, #f43f5e, #eab308, #84cc16, #06b6d4, #3b82f6, #d946ef, #f43f5e)`
                       }}>
                    <div 
                       className="absolute w-[2px] h-[50%] bg-qp-text origin-bottom left-[15px] top-0 shadow-[0_0_2px_black]"
                       style={{ transform: `rotate(${complexPhase(matrix[hoveredCell.r][hoveredCell.c]) + Math.PI/2}rad)` }}
                    ></div>
                  </div>
                  <div className="text-xs text-qp-text-muted mt-2 font-mono">{(complexPhase(matrix[hoveredCell.r][hoveredCell.c]) / Math.PI).toFixed(2)}π</div>
                </>
              ) : (
                 <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 via-emerald-500 to-sky-500 opacity-20 mix-blend-screen shrink-0 mt-1"></div>
              )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex h-[250px]">
        <div className="flex-1 p-4 flex flex-col border-r border-qp-border relative bg-qp-card">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] text-qp-text-muted font-bold uppercase tracking-widest">Input</div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-qp-text-muted font-bold uppercase tracking-widest">Output</div>
          
          <div className="flex-1 flex items-center justify-center pl-4 pt-4">
            <div className="grid gap-0 border border-qp-border bg-qp-bg" style={{ gridTemplateColumns: `auto repeat(${matrix[0].length}, 1fr)` }}>
              <div className="w-6 h-6 border-b border-r border-qp-border bg-qp-secondary"></div>
              {labels.map((l, i) => (
                <div key={`col-${i}`} className="w-12 h-6 flex items-center justify-center text-xs text-qp-text-muted font-mono border-b border-qp-border bg-qp-secondary">{l}</div>
              ))}
              
              {matrix.map((row, r) => (
                <React.Fragment key={`row-${r}`}>
                  <div className="w-6 h-12 flex items-center justify-center text-xs text-qp-text-muted font-mono border-r border-qp-border bg-qp-secondary">{labels[r]}</div>
                  {row.map((val, c) => {
                    const magnitude = complexMag(val);
                    const phase = complexPhase(val);
                    const hue = (phase * 180 / Math.PI) + 210;
                    return (
                      <div 
                        key={`${r}-${c}`} 
                        className={`w-12 h-12 border border-qp-border flex items-center justify-center bg-qp-bg/50 transition cursor-pointer ${hoveredCell?.r === r && hoveredCell?.c === c ? 'bg-qp-hover' : 'hover:bg-qp-secondary'}`}
                        onMouseEnter={() => { setHoveredCell({r, c}); setShowOutput(true); }}
                        onMouseLeave={() => { setHoveredCell(null); setShowOutput(false); }}
                      >
                        {magnitude > 0.01 && (
                          <div 
                            className="rounded-full shadow-sm"
                            style={{ 
                              width: `${magnitude * 36}px`, 
                              height: `${magnitude * 36}px`,
                              backgroundColor: `hsl(${hue}, 70%, 50%)`
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 bg-qp-bg relative">
          <div className="absolute top-2 left-2 z-10 text-[10px] text-qp-text-muted font-mono uppercase tracking-widest bg-qp-secondary/80 px-2 py-1 rounded">
             {showOutput ? "Output State" : "Input State"}
          </div>
          <Canvas camera={{ position: [1.8, 1.8, 1.8] }}>
            <BlochSphere blochVector={blochVector} />
          </Canvas>
        </div>
      </div>
    </div>,
    document.body
  );
};
