import React from 'react';
import { FaPlay, FaPause, FaStepBackward, FaStepForward } from 'react-icons/fa';

interface TimelineScrubberProps {
  currentStep: number;
  totalSteps: number;
  onStepChange: (step: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  currentStep,
  totalSteps,
  onStepChange,
  isPlaying,
  onTogglePlay
}) => {

  return (
    <div className="flex items-center gap-6 p-4 rounded-2xl border shadow-sm transition-colors bg-qp-card border-qp-border">
      <div className="flex gap-2">
        <button 
          onClick={() => onStepChange(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="p-2.5 rounded-lg transition-colors flex items-center justify-center border bg-qp-secondary hover:bg-qp-hover text-qp-text-muted hover:text-qp-text border-qp-border disabled:opacity-30"
        >
          <FaStepBackward className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={onTogglePlay}
          className="w-12 flex items-center justify-center rounded-lg bg-emerald-500 text-qp-bg hover:bg-emerald-400 transition-colors shadow-sm"
        >
          {isPlaying ? <FaPause className="w-3.5 h-3.5" /> : <FaPlay className="w-3.5 h-3.5 ml-1" />}
        </button>
        <button 
          onClick={() => onStepChange(Math.min(totalSteps, currentStep + 1))}
          disabled={currentStep === totalSteps}
          className="p-2.5 rounded-lg transition-colors flex items-center justify-center border bg-qp-secondary hover:bg-qp-hover text-qp-text-muted hover:text-qp-text border-qp-border disabled:opacity-30"
        >
          <FaStepForward className="w-3.5 h-3.5" />
        </button>
      </div>
      
      <div className="flex-1 flex items-center gap-4 border-l border-qp-border pl-6">
        <span className="text-xs font-mono w-16 text-right text-qp-text-muted">Step {currentStep}</span>
        <input 
          type="range" 
          min={0} 
          max={totalSteps} 
          value={currentStep}
          onChange={(e) => onStepChange(parseInt(e.target.value))}
          className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-500 outline-none transition-colors bg-qp-secondary hover:bg-qp-hover"
        />
        <span className="text-xs font-mono w-16 text-qp-text-muted">of {totalSteps}</span>
      </div>
    </div>
  );
};
