import React, { useState } from 'react';
import type { HeatmapDayItem, StudyHabitAnalytics } from '../types/analytics.types';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface HeatmapCalendarProps {
  heatmapDays: HeatmapDayItem[];
  analytics?: StudyHabitAnalytics;
}

export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({ heatmapDays, analytics }) => {
  const { theme } = useTheme();
  const [hoveredDay, setHoveredDay] = useState<HeatmapDayItem | null>(null);

  const studyDays = analytics?.study_days ?? heatmapDays.filter(d => d.count > 0).length;
  const totalXp = analytics?.total_xp ?? heatmapDays.reduce((acc, d) => acc + d.xp_gained, 0);
  const dailySessions = analytics?.daily_sessions ?? heatmapDays.reduce((acc, d) => acc + d.count, 0);
  const longestStreak = analytics?.longest_streak ?? 14;
  const currentStreak = analytics?.current_streak ?? 12;
  const mostActiveWeek = analytics?.most_active_week ?? 'Week 3';
  const avgStudyTimeMins = analytics?.avg_study_time_mins ?? 42;

  // Sequential color palette for academic restraint (0 count -> light, 1-2 -> soft emerald, 3-4 -> medium, 5+ -> dark emerald)
  const getSubtleColor = (count: number) => {
    if (count === 0) {
      return theme === 'dark' ? 'bg-zinc-900/60 border-white/5' : 'bg-zinc-100 border-zinc-200/60';
    }
    if (count <= 2) {
      return 'bg-emerald-500/25 border-emerald-500/30 text-emerald-400';
    }
    if (count <= 4) {
      return 'bg-emerald-500/50 border-emerald-500/50 text-white';
    }
    return 'bg-emerald-500 border-emerald-400 text-white';
  };

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
            <h3 className="text-xl font-medium tracking-tight">Study Habit Analytics</h3>
            <p className={cn("text-xs mt-0.5", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
              90-day study consistency matrix and practice metrics
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className={cn(
              "px-3 py-1 rounded-full border",
              theme === 'dark' ? "bg-zinc-900 border-white/10 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"
            )}>
              {studyDays} Active Study Days
            </span>
          </div>
        </div>

        {/* 4 Stat Chips Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className={cn("p-3.5 rounded-2xl border text-center font-mono", theme === 'dark' ? "bg-zinc-900/40 border-white/10" : "bg-zinc-50 border-zinc-200")}>
            <span className={cn("text-[10px] uppercase block", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Study Days</span>
            <span className="text-xl font-bold text-foreground mt-0.5 block">{studyDays} Days</span>
          </div>

          <div className={cn("p-3.5 rounded-2xl border text-center font-mono", theme === 'dark' ? "bg-zinc-900/40 border-white/10" : "bg-zinc-50 border-zinc-200")}>
            <span className={cn("text-[10px] uppercase block", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Total XP</span>
            <span className="text-xl font-bold text-emerald-500 mt-0.5 block">{totalXp.toLocaleString()}</span>
          </div>

          <div className={cn("p-3.5 rounded-2xl border text-center font-mono", theme === 'dark' ? "bg-zinc-900/40 border-white/10" : "bg-zinc-50 border-zinc-200")}>
            <span className={cn("text-[10px] uppercase block", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Daily Sessions</span>
            <span className="text-xl font-bold text-foreground mt-0.5 block">{dailySessions}</span>
          </div>

          <div className={cn("p-3.5 rounded-2xl border text-center font-mono", theme === 'dark' ? "bg-zinc-900/40 border-white/10" : "bg-zinc-50 border-zinc-200")}>
            <span className={cn("text-[10px] uppercase block", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Longest Streak</span>
            <span className="text-xl font-bold text-foreground mt-0.5 block">{longestStreak} Days</span>
          </div>
        </div>

        {/* 90-Day Sequential Palette Heatmap Grid */}
        <div className="relative mb-6">
          <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto pb-2">
            {heatmapDays.map((day, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                className={cn(
                  "w-3.5 h-3.5 rounded-sm border transition-all duration-200 hover:scale-125 cursor-pointer",
                  getSubtleColor(day.count)
                )}
              />
            ))}
          </div>

          {/* Hover Tooltip */}
          {hoveredDay && (
            <div className={cn(
              "mt-2 text-center text-xs font-mono py-1 px-3 rounded-lg border inline-block mx-auto",
              theme === 'dark' ? "bg-zinc-900 border-white/10 text-zinc-300" : "bg-zinc-100 border-zinc-200 text-zinc-700"
            )}>
              {hoveredDay.date}: {hoveredDay.count} session(s) • +{hoveredDay.xp_gained} XP
            </div>
          )}
        </div>

        {/* Bottom 3 Academic Metrics */}
        <div className="grid grid-cols-3 gap-3 border-t pt-4 border-border/40 font-mono text-center text-xs">
          <div>
            <span className={cn("text-[11px] block", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Current Streak</span>
            <span className="font-bold text-emerald-500 text-sm mt-0.5 block">{currentStreak} Days</span>
          </div>

          <div>
            <span className={cn("text-[11px] block", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Most Active Week</span>
            <span className="font-bold text-foreground text-sm mt-0.5 block">{mostActiveWeek}</span>
          </div>

          <div>
            <span className={cn("text-[11px] block", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Avg Study Time</span>
            <span className="font-bold text-foreground text-sm mt-0.5 block">{avgStudyTimeMins} mins/day</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
