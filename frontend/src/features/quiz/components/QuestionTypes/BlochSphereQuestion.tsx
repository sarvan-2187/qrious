import React from 'react';
import type { Question } from '../../types/quiz.types';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface BlochSphereQuestionProps {
  question: Question;
  selectedAnswer: string | null;
  onSelect: (optionId: string) => void;
  disabled?: boolean;
}

export const BlochSphereQuestion: React.FC<BlochSphereQuestionProps> = ({
  question,
  selectedAnswer,
  onSelect,
  disabled
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="space-y-4 font-sans">
      <div className={cn(
        "p-4 rounded-2xl border text-xs font-mono text-emerald-500 shadow-sm",
        isDark ? "bg-black/80 border-white/10" : "bg-zinc-50 border-zinc-200"
      )}>
        [Bloch Sphere Visual Locator]
        <div className={cn("mt-2 font-sans text-xs", isDark ? "text-zinc-400" : "text-zinc-600")}>
          Select the correct state vector orientation $(\theta, \phi)$ corresponding to the state prompt.
        </div>
      </div>

      <div className="space-y-3">
        {question.options.map((option) => {
          const isSelected = selectedAnswer === option.id;
          return (
            <div
              key={option.id}
              onClick={() => !disabled && onSelect(option.id)}
              className={cn(
                "p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between font-sans shadow-sm group",
                isSelected
                  ? "bg-emerald-500/10 border-emerald-500 shadow-emerald-500/10"
                  : isDark
                    ? "bg-black/60 border-white/10 text-zinc-300 hover:border-emerald-500/50 hover:bg-white/5"
                    : "bg-zinc-50 border-zinc-200 text-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-100",
                disabled && "opacity-80 cursor-not-allowed"
              )}
            >
              <span className={cn(
                "text-sm font-medium leading-relaxed",
                isSelected ? "text-emerald-500 font-semibold" : isDark ? "text-zinc-200" : "text-zinc-800"
              )}>
                {option.text}
              </span>
              <div
                className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-3 transition-all",
                  isSelected
                    ? "border-emerald-500 bg-emerald-500"
                    : isDark
                      ? "border-white/20 bg-black"
                      : "border-zinc-300 bg-white"
                )}
              >
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

