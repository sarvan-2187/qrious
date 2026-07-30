import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface AssemblyStepperProps {
  progress: number;
  currentStep: string;
}

export const AssemblyStepper: React.FC<AssemblyStepperProps> = ({ progress, currentStep }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="w-full">
      <div className={cn("flex justify-between text-xs mb-1 font-medium", isDark ? "text-zinc-400" : "text-zinc-600")}>
        <span>Assembly Progress</span>
        <span className="capitalize">{currentStep.replace('_', ' ')}</span>
      </div>
      <div className={cn("w-full rounded-full h-2.5", isDark ? "bg-zinc-800" : "bg-zinc-200")}>
        <div 
          className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};
