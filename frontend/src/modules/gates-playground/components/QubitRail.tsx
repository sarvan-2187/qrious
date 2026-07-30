import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { GateInstance } from '../hooks/useCircuitState';
import { GATE_CATEGORIES } from './GateTray';
import { GateInspectorPopup } from './GateInspectorPopup';

interface QubitRailProps {
  qubitIndex: number;
  qubits: number;
  steps: number;
  gates: GateInstance[];
  updateGate: (id: string, updates: Partial<GateInstance>) => void;
  removeGate: (id: string) => void;
  expandMacroGate?: (id: string) => void;
  editingGateId: string | null;
  setEditingGateId: (id: string | null) => void;
  readOnly?: boolean;
  selectedGateToPlace?: string | null;
  onPlaceGate?: (name: string, qubitIndex: number, stepIndex: number) => void;
}

export const ROW_SPACING_PX = 48; // h-10 (40px) + mb-2 (8px)

export const QubitRail: React.FC<QubitRailProps> = ({ 
  qubitIndex, steps, gates, updateGate, removeGate, expandMacroGate, 
  editingGateId, setEditingGateId, readOnly = false,
  selectedGateToPlace, onPlaceGate
}) => {
  const [clickPos, setClickPos] = useState({ top: 0, left: 0 });

  const handleGateClick = (gate: GateInstance, e: React.MouseEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    if (editingGateId === gate.id) {
      setEditingGateId(null);
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setClickPos({ top: rect.bottom + 10, left: rect.left });
      setEditingGateId(gate.id);
    }
  };

  return (
    <div className="flex items-center mb-2 relative h-10 w-full" onClick={() => setEditingGateId(null)}>
      <div className="w-14 h-8 flex items-center justify-center rounded-md font-mono text-xs shadow-sm z-10 shrink-0 bg-qp-secondary text-qp-text-muted border border-qp-border">
        q[{qubitIndex}]
      </div>
      <div className="flex-1 relative flex items-center ml-4 h-full">
        {/* The horizontal rail line */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-qp-border opacity-80 z-0"></div>
        {Array.from({ length: steps }).map((_, stepIndex) => {
          const { setNodeRef, isOver } = useDroppable({
            id: `droppable-${qubitIndex}-${stepIndex}`,
            data: { qubitIndex, stepIndex }
          });
          
          const gateAtThisStep = gates.find(g => (g.target === qubitIndex || g.control === qubitIndex) && g.step === stepIndex);
          
          let gateStyle = "bg-[#4b80b5] text-qp-text";
          let gateLabel = "";
          const isParametric = gateAtThisStep ? ['RX', 'RY', 'RZ', 'P', 'U', 'CP'].includes(gateAtThisStep.name) : false;

          if (gateAtThisStep) {
            gateLabel = gateAtThisStep.name;
            for (const cat of GATE_CATEGORIES) {
              const found = cat.gates.find(g => g.name === gateAtThisStep.name);
              if (found) {
                gateStyle = found.color;
                gateLabel = found.label;
                break;
              }
            }

            // Target overrides
            if (gateAtThisStep.target === qubitIndex) {
              if (gateAtThisStep.name === 'CNOT') {
                gateLabel = "+";
                gateStyle = "bg-[#539b7d] text-qp-text !rounded-full !w-10 !h-10 text-2xl font-normal";
              }
            }

            // Control overrides
            if (gateAtThisStep.control === qubitIndex && gateAtThisStep.name !== 'SWAP') {
              gateStyle = "bg-[#539b7d] text-qp-text";
              gateLabel = "●"; // control dot
            }
            
            // SWAP overrides (applies to both target and control)
            if (gateAtThisStep.name === 'SWAP') {
              gateLabel = "✖";
              gateStyle = "text-[#539b7d] !bg-transparent text-2xl !shadow-none";
            }
          }

          // Calculate bridge line if this is the top-most qubit of a multi-qubit gate
          let bridgeLine = null;
          if (gateAtThisStep && gateAtThisStep.control !== undefined) {
            const topQubit = Math.min(gateAtThisStep.target, gateAtThisStep.control);
            const bottomQubit = Math.max(gateAtThisStep.target, gateAtThisStep.control);
            if (qubitIndex === topQubit) {
              const distance = bottomQubit - topQubit;
              bridgeLine = (
                <div 
                  className="absolute left-1/2 w-[2px] bg-[#539b7d] z-10"
                  style={{ 
                    top: '50%', 
                    height: `${distance * ROW_SPACING_PX}px`,
                    transform: 'translateX(-50%)'
                  }}
                />
              );
            }
          }

          return (
            <div
              key={stepIndex}
              ref={setNodeRef}
              className={`w-12 h-10 flex items-center justify-center -mb-[1px] z-10 transition-colors ${isOver ? 'bg-qp-hover rounded-lg' : ''} ${selectedGateToPlace && !gateAtThisStep && !readOnly ? 'cursor-pointer hover:bg-qp-hover/50 hover:border-emerald-500/30 border border-transparent rounded-lg' : ''} relative mx-1`}
              onClick={() => {
                if (selectedGateToPlace && !gateAtThisStep && !readOnly) {
                  onPlaceGate?.(selectedGateToPlace, qubitIndex, stepIndex);
                }
              }}
            >
              {bridgeLine}
              {gateAtThisStep && (
                <div 
                  className={`group/gate min-w-[48px] h-10 flex items-center justify-center font-semibold text-sm rounded z-20 ${readOnly ? 'cursor-default' : 'cursor-pointer hover:brightness-110'} ${gateStyle} ${gateLabel === '●' ? 'rounded-full !w-6 !h-6 !min-w-0 shadow-none' : ''}`}
                  onClick={(e) => handleGateClick(gateAtThisStep, e)}
                  onDoubleClick={(e) => {
                    if (readOnly) return;
                    e.stopPropagation();
                    if (expandMacroGate && (gateAtThisStep.name === 'QFT' || gateAtThisStep.name === 'IQFT')) {
                      expandMacroGate(gateAtThisStep.id);
                    }
                  }}
                >
                  {gateLabel}
                  {/* Custom Tooltip */}
                  <div className="pointer-events-none opacity-0 group-hover/gate:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-md shadow-lg whitespace-nowrap z-50">
                    <div className="font-bold">{gateAtThisStep.name} Gate</div>
                    {isParametric && gateAtThisStep.params && (
                      <div className="text-slate-300">Phase: {gateAtThisStep.params[0]}</div>
                    )}
                    {/* Tooltip arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-slate-800"></div>
                  </div>
                </div>
              )}

              {editingGateId === gateAtThisStep?.id && gateAtThisStep.target === qubitIndex && (
                <GateInspectorPopup 
                  gate={gateAtThisStep}
                  onClose={() => setEditingGateId(null)}
                  updateGate={updateGate}
                  removeGate={removeGate}
                  position={clickPos}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
