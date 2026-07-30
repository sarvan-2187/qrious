import React, { useState } from 'react';
import type { XpSummary } from '../types/gamification.types';
import { FaBolt, FaCalendarDay, FaChevronRight } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { DailyXpModal } from './DailyXpModal';

interface XPBarProps {
  xpSummary: XpSummary | null;
  loading?: boolean;
}

export const XPBar: React.FC<XPBarProps> = ({ xpSummary, loading = false }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (loading || !xpSummary) {
    return (
      <div className={cn(
        "p-6 rounded-[2rem] border animate-pulse flex items-center justify-between shadow-sm",
        isDark ? "bg-zinc-950/50 border-white/10" : "bg-white border-zinc-200"
      )}>
        <div className={cn("h-6 w-32 rounded-full", isDark ? "bg-white/10" : "bg-zinc-200")} />
        <div className={cn("h-4 w-48 rounded-full", isDark ? "bg-white/5" : "bg-zinc-100")} />
      </div>
    );
  }

  const { level, rank_title, xp_total, current_level_xp, next_level_target_xp, progress_pct, daily_xp_today } = xpSummary;

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className={cn(
          "p-6 md:p-8 rounded-[2rem] border overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative font-sans cursor-pointer group flex flex-col justify-between hover:scale-[1.015]",
          isDark
            ? "bg-zinc-950/50 border-white/10 hover:border-white/20 hover:bg-zinc-900/30 text-white"
            : "bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900"
        )}
        title="Click to view Daily XP & Activity Ledger"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          {/* Level Rank Badge */}
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl border flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105 font-mono text-base font-medium",
              isDark ? "bg-black border-white/10 text-emerald-500" : "bg-zinc-50 border-zinc-200 text-emerald-600"
            )}>
              {level}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className={cn(
                  "text-lg font-sans tracking-tight transition-colors flex items-center gap-1.5 font-normal",
                  isDark ? "group-hover:text-zinc-200" : "group-hover:text-zinc-900"
                )}>
                  {rank_title}
                  <FaChevronRight className="text-xs opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400" />
                </h3>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full border text-[10px] font-mono uppercase font-medium",
                  isDark
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
                )}>
                  Level {level}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-0.5">
                <span className={cn("text-xs font-mono", isDark ? "text-zinc-400" : "text-zinc-600")}>
                  Lifetime: <span className="text-emerald-500 font-medium">{xp_total} XP</span>
                </span>

                {daily_xp_today !== undefined && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                    <FaCalendarDay className="text-[10px]" /> +{daily_xp_today} XP Today
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Level Stats */}
          <div className={cn(
            "flex items-center gap-3 text-xs font-mono px-4 py-2.5 rounded-2xl border shadow-sm transition-all",
            isDark 
              ? "bg-black border-white/10 text-zinc-300 group-hover:border-white/20" 
              : "bg-zinc-50 border-zinc-200 text-zinc-700 group-hover:border-zinc-300"
          )}>
            <div className="flex items-center gap-1.5">
              <FaBolt className="text-emerald-500" />
              <span>{current_level_xp} / {next_level_target_xp} XP</span>
            </div>
            <span className={isDark ? "text-zinc-700" : "text-zinc-300"}>|</span>
            <span className="text-emerald-500 font-medium">{progress_pct}% to Level {level + 1}</span>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div
          className={cn(
            "relative w-full h-3 rounded-full overflow-hidden border p-0.5",
            isDark ? "bg-black border-white/10" : "bg-zinc-100 border-zinc-200"
          )}
          role="progressbar"
          aria-valuenow={progress_pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${progress_pct}%` }}
          />
        </div>
      </div>

      <DailyXpModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        xpSummary={xpSummary}
      />
    </>
  );
};
