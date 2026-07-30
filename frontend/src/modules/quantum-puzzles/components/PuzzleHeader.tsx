import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { FaFire, FaStar, FaArrowLeft, FaArrowRight } from 'react-icons/fa';

interface PuzzleHeaderProps {
  level: number;
  totalLevels: number;
  prompt: string;
  tier: string;
  streak?: number;
  stars?: number;
  onBack?: () => void;
  isSuccess?: boolean;
  onNext?: () => void;
}

export const PuzzleHeader: React.FC<PuzzleHeaderProps> = ({ 
  level, 
  totalLevels, 
  prompt, 
  tier, 
  streak = 0, 
  stars = 0, 
  onBack,
  isSuccess = false,
  onNext
}) => {
  const { theme } = useTheme();

  return (
    <div className={cn(
      "w-full px-6 py-4 flex items-center justify-between border-b transition-colors duration-300 shrink-0",
      theme === 'dark' ? "bg-zinc-950/50 border-white/10" : "bg-white border-zinc-200"
    )}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="flex items-center justify-center p-1.5 -ml-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              title="Back to Levels"
            >
              <FaArrowLeft className="w-4 h-4" />
            </button>
          )}
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full uppercase tracking-wider",
            theme === 'dark' ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700"
          )}>
            {tier}
          </span>
          <span className={cn("text-sm font-medium", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
            Puzzle {level} of {totalLevels}
          </span>
        </div>
        <h2 className={cn("text-xl font-sans tracking-tight mt-1 font-medium", theme === 'dark' ? "text-white" : "text-zinc-900")}>
          {prompt}
        </h2>
      </div>

      <div className="flex items-center gap-6">
        {isSuccess && onNext && (
          <button 
            onClick={onNext}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-xs rounded-lg transition-colors shadow-md active:scale-95 animate-in fade-in duration-300"
          >
            Next Puzzle <FaArrowRight className="w-3 h-3" />
          </button>
        )}
        <div className="flex items-center gap-1">
          {[1, 2, 3].map(i => (
            <FaStar 
              key={i} 
              className={cn(
                "w-5 h-5", 
                i <= stars ? "text-yellow-400" : (theme === 'dark' ? "text-zinc-700" : "text-zinc-200")
              )} 
            />
          ))}
        </div>
        
        {streak > 0 && (
          <div className="flex items-center gap-2 text-orange-500 bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20">
            <FaFire className="w-4 h-4" />
            <span className="font-medium text-sm">{streak} days</span>
          </div>
        )}
      </div>
    </div>
  );
};
