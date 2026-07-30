import React from 'react';
import { Check, Info } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

export interface LearningLevel {
  id: number;
  name: string;
  subtitle: string;
  milestone: string;
  nextAction: string;
  whyItMatters: string;
  successCriteria: string;
}

export const LEVEL_DATA: Record<number, LearningLevel> = {
  1: {
    id: 1,
    name: "Level 1: Fundamentals",
    subtitle: "Understanding Quantum Cooling & Noise",
    milestone: "Thermal Isolation & 50K Shielding",
    nextAction: "Place a 20 dB Attenuator on the 50K stage",
    whyItMatters: "Attenuators absorb 300K thermal photons before they can reach delicate qubits.",
    successCriteria: "Thermal load at 50K stage reduced by 40%."
  },
  2: {
    id: 2,
    name: "Level 2: Design",
    subtitle: "Complete Staged Signal Chain",
    milestone: "Staged Attenuation & HEMT Amplification",
    nextAction: "Install HEMT Amplifier at 4K & Attenuators at Still/Cold Plate",
    whyItMatters: "Staged attenuation reduces thermal noise step by step from 300K down to 10mK.",
    successCriteria: "Drive line attenuation reaches ~62 dB target budget."
  },
  3: {
    id: 3,
    name: "Level 3: Optimization",
    subtitle: "Quantum Efficiency & Noise Protection",
    milestone: "Purcell Filtering & Quantum-Limited Readout",
    nextAction: "Add Purcell Filter at Cold Plate & TWPA Amplifier at MXC",
    whyItMatters: "Purcell filters act like noise-canceling headphones, preventing qubit photon decay.",
    successCriteria: "Signal Integrity > 90/100 and T1 dephasing lifetime maximized."
  },
  4: {
    id: 4,
    name: "Level 4: Mastery",
    subtitle: "Fault Diagnosis & Topological Error Correction",
    milestone: "Fault Injection & Surface Code Resilience",
    nextAction: "Simulate Surface Code d=5 and resolve Cryostat Faults",
    whyItMatters: "Fault-tolerant surface codes allow quantum algorithms to run continuously despite noise.",
    successCriteria: "Logical error rate PL < 10^-5 with active fault mitigation."
  }
};

interface LearningProgressionBarProps {
  currentLevel: number;
  onSelectLevel?: (level: number) => void;
}

export const LearningProgressionBar: React.FC<LearningProgressionBarProps> = ({
  currentLevel,
  onSelectLevel
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const activeLevelData = LEVEL_DATA[currentLevel] || LEVEL_DATA[1];

  return (
    <div className={cn(
      "w-full border-b px-4 py-2.5 transition-colors duration-300 font-sans",
      isDark ? "bg-zinc-950/60 border-zinc-800/80 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
    )}>
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        {/* Level Progression Indicator */}
        <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
          {[1, 2, 3, 4].map(level => {
            const isCompleted = level < currentLevel;
            const isCurrent = level === currentLevel;
            const data = LEVEL_DATA[level];

            return (
              <button
                key={level}
                onClick={() => onSelectLevel?.(level)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1 rounded-md border text-xs font-medium transition-all shrink-0 cursor-pointer",
                  isCurrent 
                    ? "bg-emerald-600 border-emerald-500 text-white shadow-sm"
                    : isCompleted
                      ? (isDark ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-700")
                      : (isDark ? "bg-zinc-900/50 border-zinc-800 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-500")
                )}
              >
                <span className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono",
                  isCurrent ? "bg-white text-emerald-700 font-bold" : isCompleted ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-300"
                )}>
                  {isCompleted ? <Check className="w-3 h-3" /> : level}
                </span>
                <span>{data.name.split(':')[1]}</span>
              </button>
            );
          })}
        </div>

        {/* Current Active Milestone Guidance */}
        <div className="flex-1 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-500 shrink-0">
              {activeLevelData.name}
            </span>
            <span className={cn("text-[11px] font-medium truncate", isDark ? "text-zinc-300" : "text-zinc-700")}>
              <span className="text-zinc-500">Next:</span> {activeLevelData.nextAction}
            </span>
          </div>

          <div className={cn(
            "px-3 py-1 rounded-md border text-[11px] max-w-md hidden xl:flex items-center gap-1.5 shrink-0",
            isDark ? "bg-zinc-900/80 border-zinc-800 text-zinc-300" : "bg-zinc-50 border-zinc-200 text-zinc-600"
          )}>
            <Info className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">{activeLevelData.whyItMatters}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
