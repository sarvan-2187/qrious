import React, { useMemo } from 'react';
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
    title: "Cold Plate IR Protection & Purcell Filter",
    stageId: "coldplate",
    recommendedComponent: "Purcell Filter",
    componentIdMatch: "purcell_filter",
    line: "drive",
    explanation: "Install a Purcell Filter at the Cold Plate (100 mK) to prevent qubit spontaneous emission decay.",
    isComplete: (graph) => graph.placedComponents.some(c => c.stageId === 'coldplate')
  },
  {
    stepNum: 5,
    title: "MXC Stage 20 dB Attenuator",
    stageId: "mxc",
    recommendedComponent: "20 dB Attenuator",
    componentIdMatch: "attenuator_20db",
    line: "drive",
    explanation: "Install a 20 dB Attenuator at the MXC stage (10 mK) to complete the 62 dB total drive attenuation budget (20+6+6+10+20 dB).",
    isComplete: (graph) => graph.placedComponents.some(c => c.stageId === 'mxc' && c.componentId.includes('20db'))
  },
  {
    stepNum: 6,
    title: "MXC Stage TWPA Amplification",
    stageId: "mxc",
    recommendedComponent: "TWPA",
    componentIdMatch: "twpa",
    line: "readout",
    explanation: "Install a TWPA (Traveling-Wave Parametric Amplifier) at the MXC stage (10 mK) directly above the QPU for quantum-limited readout.",
    isComplete: (graph) => graph.placedComponents.some(c => c.stageId === 'mxc' && c.componentId === 'twpa')
  },
  {
    stepNum: 7,
    title: "Cooldown & System Evaluation",
    stageId: "mxc",
    recommendedComponent: "Cooldown & Evaluate",
    componentIdMatch: "cooldown",
    line: "drive",
    explanation: "All core components installed! Click '⚡ Cooldown & Evaluate' in the header toolbar to execute thermal and signal integrity evaluation.",
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

  // Check if last placed component violates the active step recommendation
  const lastPlaced = buildGraph.placedComponents[buildGraph.placedComponents.length - 1];
  const errorInfo = useMemo(() => {
    if (!lastPlaced || activeStepIndex === -1) return null;

    // Ignore lastPlaced if it belongs to an already completed step
    const completedSteps = GUIDED_STEPS.slice(0, activeStepIndex);
    const belongsToCompletedStep = completedSteps.some(s => s.stageId === lastPlaced.stageId);
    if (belongsToCompletedStep) {
      return null;
    }
    
    const spec = COMPONENTS.find(c => c.id === lastPlaced.componentId);
    const specName = spec?.name || lastPlaced.componentId;

    // Error Condition 1: Placed on wrong stage
    if (lastPlaced.stageId !== currentStep.stageId && stepNumber < 7) {
      return {
        message: `Step Mismatch: You placed ${specName} on ${lastPlaced.stageId.toUpperCase()} Stage, but Step ${stepNumber} requires placing ${currentStep.recommendedComponent} on ${currentStep.stageId.toUpperCase()} Stage.`
      };
    }

    return null;
  }, [lastPlaced, currentStep, activeStepIndex, stepNumber]);

  const isError = Boolean(errorInfo);

  return (
    <div className={cn(
      "w-full border-b p-4 shadow-lg transition-colors duration-300 relative font-sans",
      isError 
        ? "bg-red-950/90 border-red-500 text-red-100 animate-pulse"
        : (isDark ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-100" : "bg-emerald-50 border-emerald-200 text-emerald-900")
    )}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className={cn(
            "w-9 h-9 rounded-full font-bold flex items-center justify-center text-sm shrink-0 shadow-sm",
            isError ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
          )}>
            {isError ? '⚠️' : stepNumber}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs font-mono font-bold uppercase tracking-wider",
                isError ? "text-red-300" : "text-emerald-600 dark:text-emerald-400"
              )}>
                {isError ? `Step ${stepNumber} Warning: Mismatch Detected` : `Step ${stepNumber} of 7: ${currentStep.title}`}
              </span>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded font-mono font-bold text-white",
                isError ? "bg-red-700" : "bg-emerald-700"
              )}>
                {isError ? 'ERR' : `Target: ${currentStep.stageId.toUpperCase()}`}
              </span>
            </div>

            <p className="text-xs mt-1 leading-relaxed font-medium">
              {isError ? (
                <span className="text-red-200 font-semibold">{errorInfo?.message}</span>
              ) : (
                <span>👉 <span className="font-semibold">{currentStep.explanation}</span></span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isError && onUndo && (
            <button 
              onClick={onUndo}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <span>↩</span> Revert Error (Undo)
            </button>
          )}

          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-mono opacity-70 block">Target Action</span>
            <span className={cn("text-xs font-bold", isError ? "text-red-300" : "text-emerald-600 dark:text-emerald-300")}>
              Install {currentStep.recommendedComponent}
            </span>
          </div>

          <button 
            onClick={onClose}
            className={cn("px-2.5 py-1 text-xs font-bold rounded hover:opacity-70", isError ? "text-red-300" : (isDark ? "text-emerald-400" : "text-emerald-700"))}
          >
            Exit Guided Mode ✕
          </button>
        </div>
      </div>
    </div>
  );
};
