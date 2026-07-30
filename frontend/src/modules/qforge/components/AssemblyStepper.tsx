import React from 'react';

interface AssemblyStepperProps {
  progress: number;
  currentStep: string;
}

export const AssemblyStepper: React.FC<AssemblyStepperProps> = ({ progress, currentStep }) => {
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-zinc-400 mb-1">
        <span>Assembly Progress</span>
        <span className="capitalize">{currentStep.replace('_', ' ')}</span>
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-2.5">
        <div 
          className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};
