import React, { useState } from 'react';
import type { StreakStatus } from '../types/gamification.types';
import { consumeStreakFreezeToken } from '../api';
import { FaFire, FaCheck } from 'react-icons/fa';
import { toast } from 'sonner';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface StreakCalendarProps {
  streakStatus: StreakStatus | null;
  loading?: boolean;
  onRefresh?: () => void;
}

export const StreakCalendar: React.FC<StreakCalendarProps> = ({
  streakStatus,
  loading = false,
  onRefresh
}) => {
  const [isConsuming, setIsConsuming] = useState(false);
  const { theme } = useTheme();

  if (loading || !streakStatus) {
    return (
      <div className={cn(
        "p-8 rounded-[2rem] border animate-pulse space-y-4 shadow-sm",
        theme === 'dark' ? "bg-zinc-950/50 border-white/10" : "bg-white border-zinc-200"
      )}>
        <div className={cn("h-6 w-36 rounded-full", theme === 'dark' ? "bg-white/10" : "bg-zinc-200")} />
        <div className={cn("h-20 rounded-2xl", theme === 'dark' ? "bg-white/5" : "bg-zinc-100")} />
      </div>
    );
  }

  const { current_streak, max_streak, freeze_tokens, history_dates } = streakStatus;

  const handleUseFreeze = async () => {
    if (freeze_tokens <= 0 || isConsuming) return;

    try {
      setIsConsuming(true);
      const res = await consumeStreakFreezeToken();
      if (res.success) {
        toast.success("Streak freeze token applied! Your streak is protected.", { icon: "🛡️" });
        if (onRefresh) onRefresh();
      } else {
        toast.error("Failed to use freeze token.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error applying streak freeze token.");
    } finally {
      setIsConsuming(false);
    }
  };

  // Generate recent 7 days timeline
  const today = new Date();
  const recentDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    const isCompleted = history_dates.includes(dateStr);
    return { dateStr, dayLabel, isCompleted };
  });

  return (
    <div className={cn(
      "p-8 rounded-[2rem] border shadow-sm transition-all duration-300 font-sans space-y-6 flex flex-col justify-between h-full hover:scale-[1.015]",
      theme === 'dark'
        ? "bg-zinc-950/50 border-white/10 hover:border-white/20 hover:bg-zinc-900/30 text-white"
        : "bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900"
    )}>
      {/* Header */}
      <div className={cn("flex items-center justify-between border-b pb-4", theme === 'dark' ? "border-white/10" : "border-zinc-200")}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-2xl border flex items-center justify-center shadow-sm",
            theme === 'dark' ? "bg-black border-white/10 text-emerald-400" : "bg-zinc-50 border-zinc-200 text-emerald-600"
          )}>
            <FaFire className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-sans tracking-tight">Learning Streak</h3>
            <span className={cn("text-xs", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
              Complete daily quantum tasks to build your streak!
            </span>
          </div>
        </div>

        {/* Max Streak pill */}
        <div className="text-right">
          <span className={cn("block text-[10px] font-mono uppercase", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Personal Best</span>
          <span className="text-xs font-mono font-bold text-emerald-500">{max_streak} Days</span>
        </div>
      </div>

      {/* Streak Counter Bar */}
      <div className={cn(
        "flex items-center justify-between p-4 rounded-2xl border",
        theme === 'dark' ? "bg-black border-white/10" : "bg-zinc-50 border-zinc-200"
      )}>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-extrabold font-mono text-emerald-500">{current_streak}</span>
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider">Day Streak</span>
            <span className={cn("text-[10px] font-mono", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>Active Daily Learner</span>
          </div>
        </div>

        {/* Freeze Token Status */}
        <button
          onClick={handleUseFreeze}
          disabled={freeze_tokens <= 0 || isConsuming}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-medium font-sans flex items-center gap-2 transition-colors disabled:opacity-50",
            freeze_tokens > 0
              ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow"
              : theme === 'dark'
                ? "bg-white/10 text-zinc-500 cursor-not-allowed"
                : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
          )}
        >
          <span>{freeze_tokens} Freeze Token{freeze_tokens === 1 ? '' : 's'}</span>
        </button>
      </div>

      {/* 7-Day Timeline Dots */}
      <div className="grid grid-cols-7 gap-2 text-center pt-2">
        {recentDays.map((d) => (
          <div key={d.dateStr} className="flex flex-col items-center gap-2">
            <span className={cn("text-[10px] font-mono uppercase", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
              {d.dayLabel}
            </span>
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all border",
                d.isCompleted
                  ? "bg-emerald-500 border-emerald-400 text-white shadow-sm"
                  : theme === 'dark'
                    ? "bg-black border-white/10 text-zinc-600"
                    : "bg-zinc-100 border-zinc-200 text-zinc-400"
              )}
            >
              {d.isCompleted ? <FaCheck className="text-xs" /> : '•'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
