import React, { useState, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import type { BuildGraphState } from '../hooks/useBuildState';

interface QubitCalibrationModalProps {
  buildGraph: BuildGraphState;
  onClose: () => void;
}

export const QubitCalibrationModal: React.FC<QubitCalibrationModalProps> = ({ buildGraph, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'spectroscopy' | 'rabi' | 't1_t2'>('spectroscopy');
  
  // Interactive Sliders State
  const [driveFrequencyGhz, setDriveFrequencyGhz] = useState(5.2);
  const [pulseDurationNs, setPulseDurationNs] = useState(40);
  const [measurementTimeUs, setMeasurementTimeUs] = useState(50);

  // Compute simulated T1 and T2 coherence times based on build graph components
  const { t1Us, t2Us, f01Ghz } = useMemo(() => {
    const hasIrFilter = buildGraph.placedComponents.some(c => c.componentId === 'ir_filter');
    const totalAtten = buildGraph.placedComponents.reduce((sum, c) => sum + (c.componentId.includes('20db') ? 20 : c.componentId.includes('10db') ? 10 : c.componentId.includes('6db') ? 6 : 0), 0);
    
    // Base T1: 45 us. If IR filter missing or attenuation < 50 dB, T1 degrades
    let calculatedT1 = 45;
    if (!hasIrFilter) calculatedT1 *= 0.35; // Infrared photon dephaser penalty
    if (totalAtten < 50) calculatedT1 *= (totalAtten / 62);
    
    const calculatedT2 = Math.min(calculatedT1 * 1.5, calculatedT1 * (totalAtten / 62));
    return {
      t1Us: Math.max(5, Math.round(calculatedT1)),
      t2Us: Math.max(3, Math.round(calculatedT2)),
      f01Ghz: 5.185
    };
  }, [buildGraph]);

  // Generate SVG path data for Spectroscopy curve (Lorentzian dip)
  const specSvgPoints = useMemo(() => {
    const points: string[] = [];
    for (let f = 4.8; f <= 5.5; f += 0.01) {
      const x = ((f - 4.8) / (5.5 - 4.8)) * 500;
      const lorentzian = 1 - 0.7 * (0.005 / (Math.pow(f - f01Ghz, 2) + 0.005));
      const y = 180 - lorentzian * 140;
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  }, [f01Ghz]);

  // Generate SVG path data for Rabi Oscillations (Sinusoidal curve)
  const rabiSvgPoints = useMemo(() => {
    const points: string[] = [];
    for (let t = 0; t <= 100; t += 1) {
      const x = (t / 100) * 500;
      // Rabi frequency omega = 2pi * 0.025
      const probExcited = 0.5 * (1 - Math.cos(2 * Math.PI * 0.02 * t));
      const y = 180 - probExcited * 140;
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  }, []);

  // Generate SVG path data for T1 Relaxation & T2 Ramsey Decay Curves
  const { t1SvgPoints, t2SvgPoints } = useMemo(() => {
    const p1: string[] = [];
    const p2: string[] = [];
    for (let t = 0; t <= 120; t += 1) {
      const x = (t / 120) * 500;
      const decayT1 = Math.exp(-t / t1Us);
      const decayT2 = Math.exp(-t / t2Us) * Math.cos(2 * Math.PI * 0.1 * t);
      
      const y1 = 180 - decayT1 * 140;
      const y2 = 180 - (decayT2 * 0.5 + 0.5) * 140;
      p1.push(`${x},${y1}`);
      p2.push(`${x},${y2}`);
    }
    return { t1SvgPoints: p1.join(' '), t2SvgPoints: p2.join(' ') };
  }, [t1Us, t2Us]);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6 z-50 overflow-y-auto font-sans">
      <div className={cn(
        "w-full max-w-4xl border rounded-2xl p-6 relative shadow-2xl transition-colors duration-300",
        isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
      )}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <span>🔬</span> Phase 2: Qubit Calibration & Spectroscopy Lab
            </h2>
            <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-zinc-600")}>
              Characterize resonance frequency, Rabi drive pulses, and $T_1 / T_2$ coherence decay curves.
            </p>
          </div>
          <button 
            onClick={onClose}
            className={cn("text-lg font-bold hover:opacity-70 px-2 py-1", isDark ? "text-zinc-400" : "text-zinc-500")}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={cn("flex gap-2 p-1 border rounded-xl mb-6", isDark ? "bg-zinc-900 border-zinc-800" : "bg-zinc-100 border-zinc-200")}>
          <button
            onClick={() => setActiveTab('spectroscopy')}
            className={cn(
              "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
              activeTab === 'spectroscopy'
                ? "bg-emerald-600 text-white shadow-sm"
                : (isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-600 hover:text-zinc-900")
            )}
          >
            1. Qubit Spectroscopy (Frequency Scan)
          </button>
          <button
            onClick={() => setActiveTab('rabi')}
            className={cn(
              "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
              activeTab === 'rabi'
                ? "bg-emerald-600 text-white shadow-sm"
                : (isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-600 hover:text-zinc-900")
            )}
          >
            2. Rabi Oscillations (Drive Amplitude)
          </button>
          <button
            onClick={() => setActiveTab('t1_t2')}
            className={cn(
              "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
              activeTab === 't1_t2'
                ? "bg-emerald-600 text-white shadow-sm"
                : (isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-600 hover:text-zinc-900")
            )}
          >
            3. $T_1$ & $T_2$ Coherence Measurement
          </button>
        </div>

        {/* Plot Display Canvas */}
        <div className={cn("p-4 border rounded-xl mb-6 relative", isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              {activeTab === 'spectroscopy' && `Resonance Dip: f01 = ${f01Ghz} GHz`}
              {activeTab === 'rabi' && `Rabi Oscillation (pi-pulse = ${pulseDurationNs} ns)`}
              {activeTab === 't1_t2' && `Coherence Times: T1 = ${t1Us} µs | T2 = ${t2Us} µs`}
            </span>
            <span className={cn("text-[10px] font-mono", isDark ? "text-zinc-500" : "text-zinc-400")}>Simulated Hardware Telemetry</span>
          </div>

          <svg className="w-full h-52 bg-zinc-950 rounded-lg p-2 overflow-visible" viewBox="0 0 500 200">
            {/* Gridlines */}
            {[40, 80, 120, 160].map(y => (
              <line key={y} x1="0" y1={y} x2="500" y2={y} stroke="#27272a" strokeDasharray="3,3" />
            ))}

            {/* Spectroscopy Plot */}
            {activeTab === 'spectroscopy' && (
              <>
                <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={specSvgPoints} />
                <line x1={((f01Ghz - 4.8) / (5.5 - 4.8)) * 500} y1="0" x2={((f01Ghz - 4.8) / (5.5 - 4.8)) * 500} y2="200" stroke="#f59e0b" strokeDasharray="4,4" />
              </>
            )}

            {/* Rabi Plot */}
            {activeTab === 'rabi' && (
              <polyline fill="none" stroke="#3b82f6" strokeWidth="2.5" points={rabiSvgPoints} />
            )}

            {/* T1 & T2 Decay Plot */}
            {activeTab === 't1_t2' && (
              <>
                <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={t1SvgPoints} />
                <polyline fill="none" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="2,2" points={t2SvgPoints} />
              </>
            )}
          </svg>

          {/* Legend */}
          <div className="flex gap-4 text-[11px] mt-2 justify-center font-mono">
            {activeTab === 'spectroscopy' && <span className="text-emerald-400">─ Transmission S21 (dB)</span>}
            {activeTab === 'rabi' && <span className="text-blue-400">─ P(|1⟩) Population</span>}
            {activeTab === 't1_t2' && (
              <>
                <span className="text-emerald-400">─ T1 Energy Relaxation (T1 = {t1Us} µs)</span>
                <span className="text-purple-400">┈ T2 Ramsey Dephasing (T2 = {t2Us} µs)</span>
              </>
            )}
          </div>
        </div>

        {/* Sliders & Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className={cn("block mb-1 font-semibold", isDark ? "text-zinc-300" : "text-zinc-700")}>
              Microwave Drive Frequency: <span className="text-emerald-500 font-mono">{driveFrequencyGhz} GHz</span>
            </label>
            <input 
              type="range" 
              min="4.8" 
              max="5.5" 
              step="0.01"
              value={driveFrequencyGhz} 
              onChange={e => setDriveFrequencyGhz(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <label className={cn("block mb-1 font-semibold", isDark ? "text-zinc-300" : "text-zinc-700")}>
              Control Pulse Duration: <span className="text-blue-500 font-mono">{pulseDurationNs} ns</span>
            </label>
            <input 
              type="range" 
              min="10" 
              max="100" 
              step="1"
              value={pulseDurationNs} 
              onChange={e => setPulseDurationNs(parseInt(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
