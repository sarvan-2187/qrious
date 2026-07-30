import React, { useState } from 'react';
import type { GateMatchTask } from '../data/puzzles';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';

interface MatchTheGateProps {
  tasks: GateMatchTask[];
  onComplete: () => void;
}

export const MatchTheGate: React.FC<MatchTheGateProps> = ({ tasks, onComplete }) => {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  
  if (!tasks || tasks.length === 0) return null;
  const currentTask = tasks[currentIndex];

  const handleSelect = (option: string) => {
    setSelected(option);
    const correctVal = currentTask.correctAnswer || currentTask.gateName;
    if (option === correctVal) {
      setTimeout(() => {
        if (currentIndex < tasks.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setSelected(null);
        } else {
          onComplete();
        }
      }, 800);
    } else {
      setTimeout(() => setSelected(null), 1000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-8">
      <div className={cn(
        "max-w-2xl w-full p-12 rounded-[2rem] border flex flex-col gap-10 shadow-lg",
        theme === 'dark' ? "bg-zinc-950/80 border-white/10" : "bg-white border-zinc-200"
      )}>
        <h3 className={cn("text-3xl text-center font-sans tracking-tight", theme === 'dark' ? "text-white" : "text-zinc-900")}>
          {currentTask.question}
        </h3>
        
        <div className="grid grid-cols-2 gap-6">
          {currentTask.options.map(opt => {
            const isSelected = selected === opt;
            const correctVal = currentTask.correctAnswer || currentTask.gateName;
            const isCorrect = isSelected && opt === correctVal;
            const isWrong = isSelected && opt !== correctVal;
            
            return (
              <button
                key={opt}
                onClick={() => !selected && handleSelect(opt)}
                disabled={!!selected}
                className={cn(
                  "p-8 rounded-2xl border-2 text-3xl font-medium font-mono transition-all",
                  theme === 'dark' ? "bg-zinc-900 text-white border-zinc-800" : "bg-zinc-50 text-zinc-900 border-zinc-200",
                  !selected && (theme === 'dark' ? "hover:border-emerald-500/50 hover:bg-zinc-800" : "hover:border-emerald-500/50 hover:bg-zinc-100"),
                  isCorrect && "border-emerald-500 bg-emerald-500/20 text-emerald-500",
                  isWrong && "border-red-500 bg-red-500/20 text-red-500"
                )}
              >
                {opt}
              </button>
            )
          })}
        </div>
        <div className="flex justify-center items-center gap-2 mt-4">
          {tasks.map((_, idx) => (
             <div 
               key={idx} 
               className={cn(
                 "w-2 h-2 rounded-full transition-colors", 
                 idx === currentIndex ? "bg-emerald-500" : (idx < currentIndex ? "bg-emerald-500/30" : "bg-zinc-500/30")
               )} 
             />
          ))}
        </div>
      </div>
    </div>
  );
};
