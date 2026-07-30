import React from 'react';
import type { Question } from '../../types/quiz.types';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface TrueFalseQuestionProps {
  question: Question;
  selectedAnswer: string | null;
  onSelect: (val: string) => void;
  disabled?: boolean;
}

export const TrueFalseQuestion: React.FC<TrueFalseQuestionProps> = ({
  selectedAnswer,
  onSelect,
  disabled
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="grid grid-cols-2 gap-4 font-sans my-4">
      {['true', 'false'].map((val) => {
        const isSelected = selectedAnswer?.toLowerCase() === val;
        const label = val === 'true' ? 'True' : 'False';
        return (
          <button
            key={val}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(val)}
            className={cn(
              "p-6 rounded-2xl border text-center text-lg font-medium transition-all duration-200 shadow-sm",
              isSelected
                ? val === 'true'
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 font-semibold"
                  : "bg-rose-500/10 border-rose-500 text-rose-500 font-semibold"
                : isDark
                  ? "bg-black/60 border-white/10 text-zinc-300 hover:border-emerald-500/50 hover:bg-white/5"
                  : "bg-zinc-50 border-zinc-200 text-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-100",
              disabled && "opacity-80 cursor-not-allowed"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

