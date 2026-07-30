import React from 'react';
import { Cpu, Shield, Sliders, Play, X } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface QForgeOnboardingModalProps {
  onStart: () => void;
  onClose: () => void;
}

export const QForgeOnboardingModal: React.FC<QForgeOnboardingModalProps> = ({
  onStart,
  onClose
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-50 overflow-y-auto font-sans">
      <div className={cn(
        "w-full max-w-2xl border rounded-2xl p-6 shadow-2xl relative transition-colors duration-300",
        isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
      )}>
        <button
          onClick={onClose}
          className={cn("absolute top-4 right-4 p-1 rounded hover:opacity-70 text-zinc-400 cursor-pointer")}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Welcome Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-mono uppercase tracking-wider text-zinc-100">Quantum Processor Assembly</h2>
            <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-zinc-600")}>
              Master cryogenic signal chain design and microwave engineering to protect qubits from thermal noise.
            </p>
          </div>
        </div>

        {/* Cryostat Temperature Zones Infographic */}
        <div className={cn(
          "p-4 rounded-xl border mb-6 relative overflow-hidden",
          isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"
        )}>
          <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 mb-3">
            Cryogenic Thermal Gradient Zones
          </h3>

          <div className="grid grid-cols-6 gap-1.5 text-center text-[10px] font-mono mb-3">
            <div className="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              300 K<br/><span className="text-[9px] font-normal text-zinc-400">Room</span>
            </div>
            <div className="p-2 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              50 K<br/><span className="text-[9px] font-normal text-zinc-400">Shield</span>
            </div>
            <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              4 K<br/><span className="text-[9px] font-normal text-zinc-400">HEMT</span>
            </div>
            <div className="p-2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
              700 mK<br/><span className="text-[9px] font-normal text-zinc-400">Still</span>
            </div>
            <div className="p-2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              100 mK<br/><span className="text-[9px] font-normal text-zinc-400">Cold Plate</span>
            </div>
            <div className="p-2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              10 mK<br/><span className="text-[9px] font-normal text-zinc-400">MXC QPU</span>
            </div>
          </div>

          <p className={cn("text-xs leading-relaxed", isDark ? "text-zinc-300" : "text-zinc-700")}>
            Superconducting qubits operate at <strong>10 millikelvin (-273.14 °C)</strong>. Each stage progressively attenuates thermal microwave noise coming from 300K room-temperature control electronics.
          </p>
        </div>

        {/* 3 Steps Overview */}
        <div className="grid grid-cols-3 gap-3 text-xs mb-6 font-sans">
          <div className={cn("p-3 rounded-lg border", isDark ? "bg-zinc-900/40 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
            <span className="text-emerald-400 font-medium block mb-1">1. Hardware Assembly</span>
            <span className={cn("text-[11px]", isDark ? "text-zinc-400" : "text-zinc-600")}>
              Place attenuators, HEMTs, TWPAs, and Purcell filters along microwave lines.
            </span>
          </div>
          <div className={cn("p-3 rounded-lg border", isDark ? "bg-zinc-900/40 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
            <span className="text-sky-400 font-medium block mb-1">2. Spectroscopy & Calibration</span>
            <span className={cn("text-[11px]", isDark ? "text-zinc-400" : "text-zinc-600")}>
              Run Lorentzian frequency sweeps and Rabi pulse sequences to tune qubit control.
            </span>
          </div>
          <div className={cn("p-3 rounded-lg border", isDark ? "bg-zinc-900/40 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
            <span className="text-purple-400 font-medium block mb-1">3. Surface Code Simulation</span>
            <span className={cn("text-[11px]", isDark ? "text-zinc-400" : "text-zinc-600")}>
              Test 2D topological surface code fault tolerance and hardware fault injection.
            </span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className={cn("px-4 py-2 text-xs font-medium rounded-md hover:opacity-70 cursor-pointer", isDark ? "text-zinc-400" : "text-zinc-600")}
          >
            Skip Intro
          </button>
          <button
            onClick={() => { onStart(); onClose(); }}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-md shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" /> Start Guided Tour
          </button>
        </div>
      </div>
    </div>
  );
};
