import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

export interface HardwareFault {
  id: string;
  name: string;
  category: 'thermal' | 'rf' | 'cryogenic';
  description: string;
  symptom: string;
}

export const HARDWARE_FAULTS: HardwareFault[] = [
  {
    id: "blocked_pulse_tube",
    name: "Blocked Pulse Tube Compressor",
    category: "thermal",
    description: "Oil contamination in the 1st stage pulse tube motor causes degraded heat lift.",
    symptom: "4K stage warms to 14.5 K; thermal noise rises across drive line."
  },
  {
    id: "ir_leakage",
    name: "Infrared Radiation Shield Gap",
    category: "rf",
    description: "Missing thermal gasket on the 50K shield allows stray 300K blackbody photons to reach MXC.",
    symptom: "Qubit T1 coherence drops by 65% due to stray photon dephasing."
  },
  {
    id: "untorqued_connector",
    name: "Un-torqued SMA Connector at MXC",
    category: "rf",
    description: "Loose coaxial SMA coupling at the mixing chamber stage creates impedance mismatch.",
    symptom: "15 dB signal reflection loss on readout line; high S11 return loss."
  },
  {
    id: "he3_contamination",
    name: "Contaminated He-3/He-4 Gas Mixture",
    category: "cryogenic",
    description: "Air or moisture in the circulation loop reduces cooling power at the Still and MXC.",
    symptom: "MXC base temperature rises from 10 mK to 110 mK."
  }
];

interface FaultInjectionDrawerProps {
  activeFaults: string[];
  onToggleFault: (faultId: string) => void;
  onClose: () => void;
}

export const FaultInjectionDrawer: React.FC<FaultInjectionDrawerProps> = ({ 
  activeFaults, 
  onToggleFault, 
  onClose 
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={cn(
      "absolute inset-y-0 right-0 w-84 border-l p-6 shadow-2xl flex flex-col z-50 transition-colors duration-300",
      isDark ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
    )}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
            <span>⚠</span> Fault Injection Lab
          </h2>
          <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-zinc-600")}>
            Simulate real hardware failures and diagnose thermal/coherence impacts.
          </p>
        </div>
        <button onClick={onClose} className={cn("hover:opacity-70 font-bold", isDark ? "text-zinc-400" : "text-zinc-500")}>
          ✕
        </button>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
        {HARDWARE_FAULTS.map(fault => {
          const isActive = activeFaults.includes(fault.id);

          return (
            <div 
              key={fault.id}
              onClick={() => onToggleFault(fault.id)}
              className={cn(
                "p-3.5 border rounded-xl cursor-pointer transition-all shadow-sm",
                isActive 
                  ? "bg-amber-950/30 border-amber-500/80 text-amber-200" 
                  : (isDark ? "bg-zinc-950 border-zinc-800 hover:border-zinc-700" : "bg-zinc-50 border-zinc-200 hover:border-zinc-300")
              )}
            >
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-xs font-semibold">{fault.name}</h3>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase",
                  isActive ? "bg-amber-500 text-black" : (isDark ? "bg-zinc-800 text-zinc-400" : "bg-zinc-200 text-zinc-600")
                )}>
                  {isActive ? 'Active' : 'Normal'}
                </span>
              </div>
              <p className={cn("text-[11px] mt-1", isDark ? "text-zinc-400" : "text-zinc-600")}>{fault.description}</p>
              
              <div className="mt-2 text-[10px] p-2 bg-black/30 rounded border border-amber-500/20 font-mono text-amber-400">
                ⚡ Symptom: {fault.symptom}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
