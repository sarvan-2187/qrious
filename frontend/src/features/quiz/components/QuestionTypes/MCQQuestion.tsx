import React from 'react';
import type { Question } from '../../types/quiz.types';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { FaCheck } from 'react-icons/fa';

interface MCQQuestionProps {
  question: Question;
  selectedAnswer: string | null;
  onSelect: (optionId: string) => void;
  disabled?: boolean;
}

export const MCQQuestion: React.FC<MCQQuestionProps> = ({
  question,
  selectedAnswer,
  onSelect,
  disabled
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="space-y-3 font-sans">
      {question.options.map((option, idx) => {
        const isSelected = selectedAnswer === option.id;
        const letter = String.fromCharCode(65 + idx); // A, B, C, D

        return (
          <div
            key={option.id}
            onClick={() => !disabled && onSelect(option.id)}
            className={cn(
              "p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 font-sans shadow-sm group",
              isSelected
                ? "bg-emerald-500/10 border-emerald-500 shadow-emerald-500/10"
                : isDark
                  ? "bg-black/60 border-white/10 text-zinc-300 hover:border-emerald-500/50 hover:bg-white/5"
                  : "bg-zinc-50 border-zinc-200 text-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-100",
              disabled && "opacity-80 cursor-not-allowed"
            )}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <span className={cn(
                "w-8 h-8 rounded-xl border flex items-center justify-center font-mono text-xs font-medium shrink-0 transition-colors",
                isSelected
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : isDark
                    ? "bg-black border-white/10 text-zinc-400 group-hover:text-white"
                    : "bg-white border-zinc-200 text-zinc-600 group-hover:text-zinc-900"
              )}>
                {letter}
              </span>
              <span className={cn(
                "text-sm font-medium leading-relaxed",
                isSelected ? "text-emerald-500 font-semibold" : isDark ? "text-zinc-200" : "text-zinc-800"
              )}>
                {option.text.replace(/^\([a-dA-D]\)\s*/, '').replace(/^[a-dA-D][\)\.]\s*/, '')}
              </span>
            </div>

            <div
              className={cn(
                "w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ml-2 transition-all",
                isSelected
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : isDark
                    ? "border-white/20 bg-black"
                    : "border-zinc-300 bg-white"
              )}
            >
              {isSelected && <FaCheck className="text-[10px]" />}
            </div>
          </div>
        );
      })}
    </div>
  );
};
