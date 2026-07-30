import React, { useMemo } from 'react';
import { Compass, CheckCircle2, ChevronRight, X, Clock } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import type { BuildGraphState } from '../hooks/useBuildState';
import { COMPONENTS } from '../constants/components';

interface GuidedAssemblyAssistantProps {
  buildGraph: BuildGraphState;
  onUndo?: () => void;
  onClose: () => void;
}

interface StepInstruction {
  stepNum: number;
  title: string;
  stageId: string;
  recommendedComponent: string;
  componentIdMatch: string;
  line: 'drive' | 'readout';
  explanation: string;
  isComplete: (graph: BuildGraphState) => boolean;
}

export const GUIDED_STEPS: StepInstruction[] = [
  {
    stepNum: 1,
    title: "50K Stage Drive Attenuation",
    stageId: "50K",
    recommendedComponent: "20 dB Attenuator",
    componentIdMatch: "attenuator_20db",
    line: "drive",
    explanation: "Install a 20 dB Attenuator at the 50K stage on the Drive Line to absorb room-temperature thermal noise.",
    isComplete: (graph) => graph.placedComponents.some(c => c.stageId === '50K' && c.componentId.includes('20db'))
  },
  {
    stepNum: 2,
    title: "4K Stage HEMT Amplification",
    stageId: "4K",
    recommendedComponent: "HEMT Amplifier",
    componentIdMatch: "hemt",
    line: "readout",
    explanation: "Install a HEMT Low-Noise Amplifier at the 4K stage on the Readout Line for first-stage amplification.",
    isComplete: (graph) => graph.placedComponents.some(c => c.stageId === '4K' && c.componentId === 'hemt')
  },
  {
    stepNum: 3,
    title: "Still Stage Thermal Anchor",
    stageId: "still",
    recommendedComponent: "6 dB Attenuator",
    componentIdMatch: "attenuator_6db",
    line: "drive",
    explanation: "Install a 6 dB Attenuator at the Still stage (700 mK) to anchor coax cable temperature.",
    isComplete: (graph) => graph.placedComponents.some(c => c.stageId === 'still')
  },
  {
    stepNum: 4,
    title: "Cold Plate IR Protection",
    stageId: "coldplate",
    recommendedComponent: "Purcell Filter",
    componentIdMatch: "purcell_filter",
    line: "drive",
    explanation: "Install a Purcell Filter at the Cold Plate (100 mK) to prevent qubit spontaneous emission decay.",
    isComplete: (graph) => graph.placedComponents.some(c => c.stageId === 'coldplate')
  },
  {
    stepNum: 5,
    title: "MXC Stage Attenuation",
    stageId: "mxc",
    recommendedComponent: "20 dB Attenuator",
    componentIdMatch: "attenuator_20db",
    line: "drive",
    explanation: "Install a 20 dB Attenuator at the MXC stage (10 mK) to complete the 62 dB total drive attenuation budget.",
    isComplete: (graph) => graph.placedComponents.some(c => c.stageId === 'mxc' && c.componentId.includes('20db'))
  },
  {
    stepNum: 6,
    title: "MXC Stage TWPA",
    stageId: "mxc",
    recommendedComponent: "TWPA",
    componentIdMatch: "twpa",
    line: "readout",
    explanation: "Install a TWPA at the MXC stage (10 mK) directly above the QPU for quantum-limited readout.",
    isComplete: (graph) => graph.placedComponents.some(c => c.stageId === 'mxc' && c.componentId === 'twpa')
  },
  {
    stepNum: 7,
    title: "System Evaluation",
    stageId: "mxc",
    recommendedComponent: "Cooldown & Evaluate",
    componentIdMatch: "cooldown",
    line: "drive",
    explanation: "All core components installed! Click 'Evaluate' in the header toolbar to execute thermal and signal evaluation.",
    isComplete: (graph) => graph.placedComponents.length >= 6
  }
];

export const GuidedAssemblyAssistant: React.FC<GuidedAssemblyAssistantProps> = ({
  buildGraph,
  onUndo,
  onClose
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const activeStepIndex = GUIDED_STEPS.findIndex(s => !s.isComplete(buildGraph));
  const currentStep = activeStepIndex === -1 ? GUIDED_STEPS[GUIDED_STEPS.length - 1] : GUIDED_STEPS[activeStepIndex];
  const stepNumber = activeStepIndex === -1 ? 7 : activeStepIndex + 1;
  const isAllComplete = activeStepIndex === -1;

  return (
    <div className={cn("p-4 flex flex-col font-sans", isDark ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-900")}>
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
          <Compass className="w-4 h-4" /> Guided Tour
        </h2>
        <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300 rounded" title="Exit Tour">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Breadcrumb Navigation */}
      <div className={cn("flex flex-wrap items-center gap-1 text-[10px] font-mono mb-4", isDark ? "text-zinc-500" : "text-zinc-400")}>
        <span>Assembly</span>
        <ChevronRight className="w-3 h-3" />
        <span>{currentStep.stageId.toUpperCase()} Stage</span>
        <ChevronRight className="w-3 h-3" />
        <span className={cn(isDark ? "text-zinc-300" : "text-zinc-700")}>Step {stepNumber}</span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] mb-1.5 font-medium">
          <span className={isDark ? "text-zinc-400" : "text-zinc-500"}>Progress {stepNumber}/7</span>
          <span className="text-emerald-500 flex items-center gap-1"><Clock className="w-3 h-3" /> ~{8 - stepNumber} min</span>
        </div>
        <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${(stepNumber / 7) * 100}%` }}></div>
        </div>
      </div>

      {/* Sticky Task Tracker Card */}
      <div className={cn(
        "p-3 rounded-md border",
        isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"
      )}>
        <h3 className={cn("text-xs font-semibold mb-2 flex justify-between items-center", isAllComplete ? "text-emerald-500" : (isDark ? "text-zinc-200" : "text-zinc-800"))}>
          {currentStep.title}
          {isAllComplete && <CheckCircle2 className="w-4 h-4" />}
        </h3>
        <p className={cn("text-[11px] leading-relaxed mb-3", isDark ? "text-zinc-400" : "text-zinc-600")}>
          {currentStep.explanation}
        </p>

        <div className={cn("flex justify-between items-center pt-2 border-t", isDark ? "border-zinc-800" : "border-zinc-200")}>
          <div className="text-[10px] font-mono text-zinc-500">Reward: <span className="text-emerald-400">+25 XP</span></div>
          {onUndo && (
            <button 
              onClick={onUndo}
              className="text-[10px] uppercase font-semibold text-zinc-500 hover:text-zinc-300"
            >
              Undo Last Action
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
