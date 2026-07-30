import React, { useState, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import type { BuildGraphState } from '../hooks/useBuildState';

interface QecSurfaceCodeModalProps {
  buildGraph: BuildGraphState;
  onClose: () => void;
}

export const QecSurfaceCodeModal: React.FC<QecSurfaceCodeModalProps> = ({ buildGraph, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [codeDistance, setCodeDistance] = useState<3 | 5>(3);
  const [physicalErrorRatePct, setPhysicalErrorRatePct] = useState<number>(0.8);

  const thresholdPct = 1.0; // 1% Fault-tolerance threshold for Surface Code

  // Compute Logical Error Rate: P_L = C * (p / p_th)^((d+1)/2)
  const { logicalErrorRatePct, status, isSuppressed } = useMemo(() => {
    const p = physicalErrorRatePct / 100;
    const pTh = thresholdPct / 100;
    const exponent = (codeDistance + 1) / 2;
    
    const pLogical = 0.03 * Math.pow(p / pTh, exponent);
    const pLogicalPct = Math.min(100, Math.max(0.0001, pLogical * 100));

    const suppressed = physicalErrorRatePct < thresholdPct;
    return {
      logicalErrorRatePct: pLogicalPct,
      status: suppressed 
        ? "Fault-Tolerant Regime: Error rate drops exponentially with distance d" 
        : "Above Threshold: Error rate increases with distance d",
      isSuppressed: suppressed
    };
  }, [codeDistance, physicalErrorRatePct]);

  // Generate grid points for d x d surface code lattice
  const gridCells = useMemo(() => {
    const cells = [];
    const size = codeDistance * 2 - 1;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const isDataQubit = (r % 2 === 0 && c % 2 === 0);
        const isXStabilizer = (r % 2 === 0 && c % 2 === 1);
        const isZStabilizer = (r % 2 === 1 && c % 2 === 0);
        
        if (isDataQubit || isXStabilizer || isZStabilizer) {
          cells.push({
            r, c,
            type: isDataQubit ? 'data' : isXStabilizer ? 'X' : 'Z'
          });
        }
      }
    }
    return cells;
  }, [codeDistance]);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6 z-50 overflow-y-auto font-sans">
      <div className={cn(
        "w-full max-w-4xl border rounded-2xl p-6 relative shadow-2xl transition-colors duration-300",
        isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
      )}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-sky-500 flex items-center gap-2">
              <span>🛡</span> Phase 3: Quantum Error Correction (QEC) Surface Code Lab
            </h2>
            <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-zinc-600")}>
              Simulate 2D Surface Code distance ($d={codeDistance}$) topological error suppression and syndrome detection.
            </p>
          </div>
          <button onClick={onClose} className={cn("text-lg font-bold hover:opacity-70 px-2 py-1", isDark ? "text-zinc-400" : "text-zinc-500")}>
            ✕
          </button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={cn("p-4 border rounded-xl", isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
            <span className={cn("text-[10px] font-mono font-semibold uppercase", isDark ? "text-zinc-400" : "text-zinc-500")}>Surface Code Distance</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold text-sky-500">d = {codeDistance}</span>
              <div className="flex gap-1">
                <button 
                  onClick={() => setCodeDistance(3)}
                  className={cn("px-2.5 py-1 text-xs rounded font-mono font-bold", codeDistance === 3 ? "bg-sky-600 text-white" : "bg-zinc-800 text-zinc-400")}
                >
                  d=3 (17Q)
                </button>
                <button 
                  onClick={() => setCodeDistance(5)}
                  className={cn("px-2.5 py-1 text-xs rounded font-mono font-bold", codeDistance === 5 ? "bg-sky-600 text-white" : "bg-zinc-800 text-zinc-400")}
                >
                  d=5 (49Q)
                </button>
              </div>
            </div>
          </div>

          <div className={cn("p-4 border rounded-xl", isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
            <span className={cn("text-[10px] font-mono font-semibold uppercase", isDark ? "text-zinc-400" : "text-zinc-500")}>Physical Error Rate ($p$)</span>
            <div className="mt-1">
              <span className={cn("text-xl font-bold font-mono", physicalErrorRatePct < thresholdPct ? "text-emerald-500" : "text-red-500")}>
                {physicalErrorRatePct.toFixed(2)}%
              </span>
              <span className="text-xs text-zinc-500 ml-2">(Threshold: 1.0%)</span>
            </div>
          </div>

          <div className={cn("p-4 border rounded-xl", isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
            <span className={cn("text-[10px] font-mono font-semibold uppercase", isDark ? "text-zinc-400" : "text-zinc-500")}>Logical Error Rate ($P_L$)</span>
            <div className="mt-1">
              <span className={cn("text-xl font-bold font-mono", isSuppressed ? "text-emerald-400" : "text-red-400")}>
                {logicalErrorRatePct < 0.001 ? '< 0.001%' : `${logicalErrorRatePct.toFixed(3)}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Grid & Telemetry */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Surface Code Lattice Visualizer */}
          <div className={cn("p-4 border rounded-xl flex flex-col items-center justify-center min-h-[260px]", isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
            <span className="text-xs font-mono text-sky-400 font-semibold mb-3">2D Topological Surface Code Lattice</span>
            
            <div 
              className="grid gap-2 p-4 bg-zinc-900 border border-zinc-800 rounded-xl"
              style={{ gridTemplateColumns: `repeat(${codeDistance * 2 - 1}, minmax(0, 1fr))` }}
            >
              {gridCells.map((cell, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold font-mono transition-transform hover:scale-110 cursor-pointer shadow-sm",
                    cell.type === 'data' && "bg-emerald-600 text-white ring-2 ring-emerald-400/50",
                    cell.type === 'X' && "bg-blue-600 text-white rounded-md",
                    cell.type === 'Z' && "bg-purple-600 text-white rounded-md"
                  )}
                  title={cell.type === 'data' ? 'Data Qubit' : cell.type === 'X' ? 'X Stabilizer (Bit-flip syndrome)' : 'Z Stabilizer (Phase-flip syndrome)'}
                >
                  {cell.type === 'data' ? '•' : cell.type}
                </div>
              ))}
            </div>

            <div className="flex gap-4 text-[10px] font-mono mt-3 text-zinc-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Data Qubits</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" /> X-Stabilizers (Bit)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-purple-500 inline-block" /> Z-Stabilizers (Phase)</span>
            </div>
          </div>

          {/* Fault Tolerance & Threshold Control */}
          <div className="space-y-4 text-xs">
            <div className={cn("p-4 border rounded-xl", isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
              <label className={cn("block mb-2 font-semibold", isDark ? "text-zinc-300" : "text-zinc-700")}>
                Physical Gate & Measurement Error Rate: <span className="text-sky-400 font-mono font-bold">{physicalErrorRatePct.toFixed(2)}%</span>
              </label>
              <input 
                type="range" 
                min="0.1" 
                max="3.0" 
                step="0.05"
                value={physicalErrorRatePct} 
                onChange={e => setPhysicalErrorRatePct(parseFloat(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              
              <div className="mt-3 p-3 bg-black/40 border border-zinc-800 rounded-lg text-[11px] font-mono leading-relaxed">
                <span className={isSuppressed ? "text-emerald-400" : "text-red-400"}>
                  ⚡ Status: {status}
                </span>
              </div>
            </div>

            <div className={cn("p-4 border rounded-xl text-xs space-y-1.5 font-mono text-zinc-400", isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
              <div>• Physical Qubits Required: <span className="text-sky-400 font-bold">{2 * Math.pow(codeDistance, 2) - 1}</span></div>
              <div>• Fault-Tolerance Threshold: <span className="text-amber-400 font-bold">1.0%</span></div>
              <div>• Error Scaling Formula: <span className="text-purple-400">P_L ∝ (p_phys / p_th)^((d+1)/2)</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
