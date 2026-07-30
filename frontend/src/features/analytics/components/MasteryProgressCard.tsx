import React from 'react';
import type { MasteryProgressInfo } from '../types/analytics.types';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface MasteryProgressCardProps {
  progress: MasteryProgressInfo;
}

export const MasteryProgressCard: React.FC<MasteryProgressCardProps> = ({ progress }) => {
  const { theme } = useTheme();

  const {
    overall_mastery_pct = 82,
    status_label = 'Strong Understanding',
    mastered_count = 12,
    review_needed_count = 3,
    advanced_remaining_count = 2
  } = progress;

  return (
    <motion.div
      className={cn(
        "p-8 rounded-[2rem] border overflow-hidden shadow-sm flex flex-col justify-between h-full font-sans transition-all duration-300",
        theme === 'dark' ? "bg-zinc-950/50 border-white/10" : "bg-white border-zinc-200"
      )}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-medium tracking-tight">Overall Mastery Progress</h3>
            <p className={cn("text-xs mt-0.5", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
              Continuous learning progression model across course curriculum
            </p>
          </div>

          <span className="text-xs font-medium px-3 py-1 rounded-full border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            {status_label}
          </span>
        </div>

        {/* Continuous Progress Bar */}
        <div className="mb-6 space-y-2">
          <div className="flex justify-between items-center text-sm font-mono font-bold">
            <span>CURRICULUM MASTERY</span>
            <span className="text-emerald-500 text-lg">{overall_mastery_pct}%</span>
          </div>

          <div className="w-full bg-secondary h-4 rounded-full overflow-hidden p-0.5 border border-border/40">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${Math.min(overall_mastery_pct, 100)}%` }}
            />
          </div>
        </div>

        {/* 3 Sub-Counters Below */}
        <div className="grid grid-cols-3 gap-4 font-mono text-center pt-2">
          <div className={cn("p-4 rounded-2xl border", theme === 'dark' ? "bg-zinc-900/40 border-white/10" : "bg-zinc-50 border-zinc-200")}>
            <span className={cn("text-xs uppercase block", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
              Mastered Concepts
            </span>
            <span className="text-2xl font-extrabold text-emerald-500 mt-1 block">
              {mastered_count}
            </span>
          </div>

          <div className={cn("p-4 rounded-2xl border", theme === 'dark' ? "bg-zinc-900/40 border-white/10" : "bg-zinc-50 border-zinc-200")}>
            <span className={cn("text-xs uppercase block", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
              Review Needed
            </span>
            <span className="text-2xl font-extrabold text-amber-500 mt-1 block">
              {review_needed_count}
            </span>
          </div>

          <div className={cn("p-4 rounded-2xl border", theme === 'dark' ? "bg-zinc-900/40 border-white/10" : "bg-zinc-50 border-zinc-200")}>
            <span className={cn("text-xs uppercase block", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
              Advanced Remaining
            </span>
            <span className="text-2xl font-extrabold text-foreground mt-1 block">
              {advanced_remaining_count}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
