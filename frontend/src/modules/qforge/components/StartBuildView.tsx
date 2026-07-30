import React from 'react';
import { Compass, Sliders, Trophy, Cpu, Thermometer, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { QPU_CATALOG } from '../data/qpuCatalog';
import { CRYOSTAT_CATALOG } from '../data/cryostatCatalog';
import type { QForgeMode } from './ModeSelectorBar';

interface StartBuildViewProps {
  currentMode: QForgeMode;
  onSelectMode: (mode: QForgeMode) => void;
  selectedQpuId: string;
  onSelectQpuId: (id: string) => void;
  selectedCryostatId: string;
  onSelectCryostatId: (id: string) => void;
  onStartBuild: () => void;
}

export const StartBuildView: React.FC<StartBuildViewProps> = ({
  currentMode,
  onSelectMode,
  selectedQpuId,
  onSelectQpuId,
  selectedCryostatId,
  onSelectCryostatId,
  onStartBuild
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const modes = [
    {
      id: 'guided' as QForgeMode,
      title: 'Guided Tour',
      desc: 'Begin learning step by step',
      duration: '15 min',
      difficulty: 'Beginner',
      icon: Compass,
      recommended: true
    },
    {
      id: 'free' as QForgeMode,
      title: 'Free Design',
      desc: 'Build anything from scratch',
      duration: 'Unlimited',
      difficulty: 'Advanced',
      icon: Sliders,
      recommended: false
    },
    {
      id: 'challenge' as QForgeMode,
      title: 'Challenge',
      desc: 'Timed engineering scenarios',
      duration: '30 min',
      difficulty: 'Expert',
      icon: Trophy,
      recommended: false
    }
  ];

  const selectedQpu = QPU_CATALOG.find(q => q.id === selectedQpuId);
  const selectedCryo = CRYOSTAT_CATALOG.find(c => c.id === selectedCryostatId);

  return (
    <div className={cn(
      "flex-1 overflow-y-auto p-8 font-sans transition-colors duration-300",
      isDark ? "bg-zinc-950 text-zinc-100" : "bg-zinc-100 text-zinc-900"
    )}>
      <div className="max-w-4xl mx-auto space-y-12 pb-16">
        
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">New Simulation Build</h1>
          <p className={cn("text-base", isDark ? "text-zinc-400" : "text-zinc-600")}>
            Configure your workspace and select a simulation experience.
          </p>
        </div>

        {/* Mode Selection */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-xs text-white">1</span>
            Choose Experience
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {modes.map(mode => {
              const Icon = mode.icon;
              const isSelected = currentMode === mode.id;
              
              return (
                <button
                  key={mode.id}
                  onClick={() => onSelectMode(mode.id)}
                  className={cn(
                    "text-left p-5 rounded-xl border-2 transition-all cursor-pointer group relative overflow-hidden",
                    isSelected 
                      ? "border-emerald-500 bg-emerald-500/5" 
                      : (isDark ? "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700" : "border-zinc-200 bg-white hover:border-zinc-300")
                  )}
                >
                  {mode.recommended && (
                    <div className="absolute top-3 right-3 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      Recommended
                    </div>
                  )}
                  <Icon className={cn("w-7 h-7 mb-4", isSelected ? "text-emerald-500" : (isDark ? "text-zinc-400 group-hover:text-zinc-300" : "text-zinc-500"))} />
                  <h3 className="font-semibold text-base mb-1">{mode.title}</h3>
                  <p className={cn("text-xs mb-4", isDark ? "text-zinc-400" : "text-zinc-500")}>{mode.desc}</p>
                  
                  <div className={cn("flex items-center gap-3 text-[11px] font-mono", isDark ? "text-zinc-500" : "text-zinc-400")}>
                    <span>{mode.duration}</span>
                    <span className="w-1 h-1 rounded-full bg-current opacity-50" />
                    <span>{mode.difficulty}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Build Configuration */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-xs text-white">2</span>
            Hardware Configuration
          </h2>
          <div className={cn(
            "p-6 rounded-xl border flex flex-col md:flex-row gap-6 items-start md:items-center",
            isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200"
          )}>
            <div className="flex-1 w-full">
              <label className={cn("text-xs uppercase tracking-wider font-semibold mb-2 block", isDark ? "text-zinc-400" : "text-zinc-500")}>
                Quantum Processor
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <select 
                  value={selectedQpuId}
                  onChange={e => onSelectQpuId(e.target.value)}
                  className={cn(
                    "w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none appearance-none font-medium",
                    isDark ? "bg-zinc-950 border-zinc-700 text-zinc-200 focus:border-emerald-500" : "bg-zinc-50 border-zinc-300 text-zinc-800 focus:border-emerald-500"
                  )}
                >
                  {QPU_CATALOG.map(q => (
                    <option key={q.id} value={q.id}>{q.name} ({q.qubits} Qubits)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 w-full">
              <label className={cn("text-xs uppercase tracking-wider font-semibold mb-2 block", isDark ? "text-zinc-400" : "text-zinc-500")}>
                Cryostat Platform
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  <Thermometer className="w-4 h-4" />
                </div>
                <select 
                  value={selectedCryostatId}
                  onChange={e => onSelectCryostatId(e.target.value)}
                  className={cn(
                    "w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none appearance-none font-medium",
                    isDark ? "bg-zinc-950 border-zinc-700 text-zinc-200 focus:border-emerald-500" : "bg-zinc-50 border-zinc-300 text-zinc-800 focus:border-emerald-500"
                  )}
                >
                  {CRYOSTAT_CATALOG.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className={cn(
              "hidden md:block w-px h-12",
              isDark ? "bg-zinc-800" : "bg-zinc-200"
            )} />

            <div className="flex-1 w-full">
               <div className={cn("text-[11px] font-mono leading-relaxed", isDark ? "text-zinc-400" : "text-zinc-500")}>
                 <div><span className="font-semibold">Target Coherence:</span> ~80 µs</div>
                 <div><span className="font-semibold">Cooling Power:</span> {selectedCryo?.coolingPowerMxcUw} µW</div>
                 <div><span className="font-semibold">Plate Diameter:</span> {selectedCryo?.plateDiameterMm} mm</div>
               </div>
            </div>
          </div>
        </section>

        {/* Start Build Card */}
        <section>
          <div className={cn(
            "p-8 rounded-2xl border text-center flex flex-col items-center",
            isDark ? "bg-zinc-900/40 border-zinc-800" : "bg-white border-zinc-200"
          )}>
            <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-6", isDark ? "bg-zinc-950 border border-zinc-800 text-zinc-300" : "bg-zinc-100 border border-zinc-200 text-zinc-700")}>
              Configuration Summary
            </div>
            
            <h3 className="text-xl font-medium mb-2">
              Ready to initialize <span className="font-semibold text-emerald-500">{selectedQpu?.name}</span> in <span className="font-semibold text-emerald-500">{selectedCryo?.name}</span>
            </h3>
            
            <p className={cn("text-sm max-w-lg mb-8", isDark ? "text-zinc-400" : "text-zinc-500")}>
              {currentMode === 'guided' 
                ? "You will be guided through a step-by-step assembly process to properly thermalize lines and protect qubits." 
                : "You will enter a free-form workspace. Assemble and test components without constraints."}
            </p>

            <button
              onClick={onStartBuild}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer hover:-translate-y-0.5"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Simulator Build</span>
            </button>
          </div>
        </section>

      </div>
    </div>
  );
};
