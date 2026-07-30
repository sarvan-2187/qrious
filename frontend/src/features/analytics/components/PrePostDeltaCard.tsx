import React from 'react';
import type { PrePostDeltaInfo } from '../types/analytics.types';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { FaGraduationCap, FaCheckCircle } from 'react-icons/fa';

interface PrePostDeltaCardProps {
  deltaInfo: PrePostDeltaInfo;
}

export const PrePostDeltaCard: React.FC<PrePostDeltaCardProps> = ({ deltaInfo }) => {
  const { theme } = useTheme();

  const {
    pre_score_pct,
    post_score_pct,
    delta_pct,
    confidence_pct = 92,
    performance_classification = 'Excellent Progress',
    academic_recommendation = 'Your performance demonstrates improved conceptual understanding of Quantum Algorithms. Continue practicing advanced applications to consolidate mastery.'
  } = deltaInfo;

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
        {/* Card Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm",
              theme === 'dark' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"
            )}>
              <FaGraduationCap className="text-lg" />
            </div>
            <div>
              <h3 className="text-xl font-medium tracking-tight">Learning Assessment Report</h3>
              <p className={cn("text-xs mt-0.5", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
                Measurable learning gain between initial baseline and current post-assessment
              </p>
            </div>
          </div>

          <span className={cn(
            "px-3 py-1 rounded-full text-xs font-medium border font-sans",
            performance_classification === 'Excellent Progress' || performance_classification === 'Consistent Improvement'
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
          )}>
            {performance_classification}
          </span>
        </div>

        {/* Structured 4-Tile Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className={cn("p-4 rounded-2xl border flex flex-col justify-center text-center", theme === 'dark' ? "bg-zinc-900/40 border-white/10" : "bg-zinc-50 border-zinc-200")}>
            <span className={cn("text-xs font-mono uppercase", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
              Baseline Assessment
            </span>
            <span className="text-2xl font-extrabold font-mono text-foreground mt-1">
              {pre_score_pct !== null ? `${pre_score_pct}%` : 'N/A'}
            </span>
          </div>

          <div className={cn("p-4 rounded-2xl border flex flex-col justify-center text-center", theme === 'dark' ? "bg-zinc-900/40 border-white/10" : "bg-zinc-50 border-zinc-200")}>
            <span className={cn("text-xs font-mono uppercase", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
              Current Assessment
            </span>
            <span className="text-2xl font-extrabold font-mono text-emerald-500 mt-1">
              {post_score_pct !== null ? `${post_score_pct}%` : 'N/A'}
            </span>
          </div>

          <div className={cn("p-4 rounded-2xl border flex flex-col justify-center text-center", theme === 'dark' ? "bg-zinc-900/40 border-white/10" : "bg-zinc-50 border-zinc-200")}>
            <span className={cn("text-xs font-mono uppercase", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
              Learning Gain
            </span>
            <span className={cn(
              "text-2xl font-extrabold font-mono mt-1",
              delta_pct && delta_pct >= 0 ? "text-emerald-500" : "text-amber-500"
            )}>
              {delta_pct !== null ? `${delta_pct >= 0 ? '+' : ''}${delta_pct}%` : 'N/A'}
            </span>
          </div>

          <div className={cn("p-4 rounded-2xl border flex flex-col justify-center text-center", theme === 'dark' ? "bg-zinc-900/40 border-white/10" : "bg-zinc-50 border-zinc-200")}>
            <span className={cn("text-xs font-mono uppercase", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
              Confidence Level
            </span>
            <span className="text-2xl font-extrabold font-mono text-foreground mt-1">
              {confidence_pct}%
            </span>
          </div>
        </div>

        {/* Academic Recommendation Box */}
        <div className={cn(
          "p-4 rounded-2xl border text-sm leading-relaxed flex items-start gap-3",
          theme === 'dark' ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-200" : "bg-emerald-50/70 border-emerald-200 text-emerald-900"
        )}>
          <FaCheckCircle className="text-emerald-500 shrink-0 mt-0.5 text-base" />
          <div>
            <div className="font-semibold text-xs uppercase tracking-wider font-mono mb-1 text-emerald-600 dark:text-emerald-400">
              Academic Recommendation
            </div>
            <p className="text-xs sm:text-sm font-sans">{academic_recommendation}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
