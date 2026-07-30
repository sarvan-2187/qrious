import React, { useState, useEffect } from 'react';
import type { Question } from '../../types/quiz.types';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface MatchQuestionProps {
  question: Question;
  selectedAnswer: Record<string, string> | null;
  onSelect: (matches: Record<string, string>) => void;
  disabled?: boolean;
}

export const MatchQuestion: React.FC<MatchQuestionProps> = ({
  question,
  selectedAnswer,
  onSelect,
  disabled
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [pairs, setPairs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedAnswer) {
      setPairs(selectedAnswer);
    } else {
      setPairs({});
    }
  }, [selectedAnswer]);

  const handleMatchChange = (leftItemText: string, rightVal: string) => {
    if (disabled) return;
    const updated = { ...pairs, [leftItemText]: rightVal };
    setPairs(updated);
    onSelect(updated);
  };

  // Unique options
  const leftItems = question.options.map(o => o.text);
  const rightOptions = Array.from(new Set(
    question.correct_answer ? Object.values(question.correct_answer) : [
      "Creates equal superposition",
      "Bit-flip (NOT gate)",
      "Phase-flip (|1> -> -|1>)",
      "Flips target qubit if control is |1>"
    ]
  ));

  return (
    <div className="space-y-4 font-sans">
      <div className="text-xs text-emerald-500 font-mono mb-2 font-medium">
        Match each item on the left with its corresponding property:
      </div>
      {leftItems.map((leftText) => (
        <div
          key={leftText}
          className={cn(
            "p-4 border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-sans shadow-sm",
            isDark ? "bg-black/60 border-white/10" : "bg-zinc-50 border-zinc-200"
          )}
        >
          <span className={cn("font-medium text-sm", isDark ? "text-zinc-200" : "text-zinc-800")}>{leftText}</span>
          <select
            disabled={disabled}
            value={pairs[leftText] || ''}
            onChange={(e) => handleMatchChange(leftText, e.target.value)}
            className={cn(
              "w-full sm:w-64 border rounded-xl p-2.5 text-xs outline-none font-sans transition-colors",
              isDark
                ? "bg-black border-white/10 text-zinc-200 focus:border-emerald-500"
                : "bg-white border-zinc-200 text-zinc-800 focus:border-emerald-500"
            )}
          >
            <option value="">-- Select Match --</option>
            {rightOptions.map((opt: any) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
};

