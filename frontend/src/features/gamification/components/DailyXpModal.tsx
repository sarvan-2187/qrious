import React, { useState, useEffect } from 'react';
import type { XpSummary, XpHistoryItem } from '../types/gamification.types';
import { fetchXpHistory, fetchXpSummary } from '../api';
import { FaBolt, FaTimes, FaTrophy, FaCalendarDay, FaHistory, FaLayerGroup, FaQuestionCircle, FaRoute, FaFire } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface DailyXpModalProps {
  isOpen: boolean;
  onClose: () => void;
  xpSummary?: XpSummary | null;
}

export const DailyXpModal: React.FC<DailyXpModalProps> = ({ isOpen, onClose, xpSummary: initialSummary }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [summary, setSummary] = useState<XpSummary | null>(initialSummary || null);
  const [history, setHistory] = useState<XpHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    if (initialSummary) {
      setSummary(initialSummary);
    }

    async function loadData() {
      try {
        setLoading(true);
        const [sumRes, histRes] = await Promise.all([
          fetchXpSummary(),
          fetchXpHistory(25)
        ]);
        if (sumRes) setSummary(sumRes);
        if (histRes) setHistory(histRes);
      } catch (err) {
        console.error("Failed to load XP modal data", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isOpen, initialSummary]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const dailyXp = summary?.daily_xp_today ?? 0;
  const dailyGoal = summary?.daily_goal_xp ?? 50;
  const dailyGoalPct = Math.min(100, Math.round((dailyXp / dailyGoal) * 100));

  const getSourceDetails = (source: string) => {
    switch (source.toLowerCase()) {
      case 'flashcard':
        return { label: 'Flashcard Review', icon: <FaLayerGroup className="text-emerald-500" /> };
      case 'quiz':
        return { label: 'Quiz Assessment', icon: <FaQuestionCircle className="text-emerald-500" /> };
      case 'roadmap':
        return { label: 'Roadmap Stage', icon: <FaRoute className="text-emerald-500" /> };
      case 'streak_bonus':
      case 'streak':
        return { label: 'Daily Streak Bonus', icon: <FaFire className="text-emerald-500" /> };
      case 'badge':
        return { label: 'Badge Achievement', icon: <FaTrophy className="text-emerald-500" /> };
      default:
        return { label: 'Quantum Activity', icon: <FaBolt className="text-emerald-500" /> };
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in font-sans cursor-pointer"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={cn(
            "relative w-full max-w-xl border rounded-[2rem] p-6 sm:p-8 shadow-none flex flex-col justify-between max-h-[85vh] overflow-hidden font-sans cursor-default",
            isDark ? "bg-zinc-950/95 border-white/10 text-white" : "bg-white/95 border-zinc-200 text-zinc-900"
          )}
        >
          {/* Top Header */}
          <div className={cn("flex items-center justify-between pb-4 border-b shrink-0", isDark ? "border-white/10" : "border-zinc-200")}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-2xl border flex items-center justify-center text-emerald-500 text-lg shadow-sm",
                isDark ? "bg-black border-white/10" : "bg-zinc-50 border-zinc-200"
              )}>
                <FaBolt />
              </div>
              <div>
                <h3 className="text-xl font-sans tracking-tight font-normal leading-tight">Daily XP Breakdown</h3>
                <span className="text-[11px] font-mono text-emerald-500">Real-time Quantum XP Ledger</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className={cn(
                "w-9 h-9 rounded-full border flex items-center justify-center transition-colors",
                isDark ? "bg-black border-white/10 text-zinc-400 hover:text-white" : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900"
              )}
            >
              <FaTimes className="text-sm" />
            </button>
          </div>

          {/* Daily Goal Card */}
          <div className="py-6 space-y-4 overflow-y-auto pr-1 flex-1">
            <div className={cn(
              "p-5 rounded-2xl border flex flex-col gap-3 relative overflow-hidden shadow-sm",
              isDark ? "bg-black/60 border-white/10" : "bg-zinc-50 border-zinc-200"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaCalendarDay className="text-emerald-500 text-sm" />
                  <span className="text-xs font-mono font-medium uppercase tracking-wider">Today's Progress</span>
                </div>
                <span className="text-xs font-mono text-emerald-500 font-medium">{dailyGoalPct}% Goal Met</span>
              </div>

              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-sans font-normal tracking-tight">
                  <span className="text-emerald-500">{dailyXp}</span>
                  <span className={cn("text-sm font-mono ml-1", isDark ? "text-zinc-500" : "text-zinc-400")}>/ {dailyGoal} XP</span>
                </div>
                <span className={cn("text-xs font-mono", isDark ? "text-zinc-400" : "text-zinc-600")}>
                  {dailyXp >= dailyGoal ? "Daily Goal Achieved! 🎉" : `${dailyGoal - dailyXp} XP to daily goal`}
                </span>
              </div>

              <div className={cn("w-full h-2 rounded-full overflow-hidden p-0.5 border", isDark ? "bg-black border-white/10" : "bg-zinc-200 border-zinc-300")}>
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${dailyGoalPct}%` }}
                />
              </div>
            </div>

            {/* Activity History Ledger */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaHistory className="text-emerald-500 text-xs" />
                  <h4 className="text-xs font-mono uppercase tracking-wider font-medium">Recent Activity Ledger</h4>
                </div>
                <span className={cn("text-[11px] font-mono", isDark ? "text-zinc-400" : "text-zinc-600")}>Last 25 Events</span>
              </div>

              {loading ? (
                <div className="space-y-2 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={cn("h-14 rounded-2xl animate-pulse", isDark ? "bg-white/5" : "bg-zinc-100")} />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className={cn("text-center py-8 text-xs font-mono rounded-2xl border", isDark ? "border-white/5 text-zinc-500" : "border-zinc-200 text-zinc-400")}>
                  No recent XP activities logged today.
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => {
                    const src = getSourceDetails(item.source);
                    return (
                      <div
                        key={item._id}
                        className={cn(
                          "p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-all duration-200 hover:border-emerald-500/50",
                          isDark ? "bg-zinc-950/70 border-white/10" : "bg-white border-zinc-200"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-9 h-9 rounded-xl border flex items-center justify-center text-sm shrink-0",
                            isDark ? "bg-black border-white/10" : "bg-zinc-50 border-zinc-200"
                          )}>
                            {src.icon}
                          </div>

                          <div className="min-w-0">
                            <span className="font-sans font-medium text-sm block truncate">{src.label}</span>
                            <span className="text-[10px] font-mono text-zinc-400 block">{formatDate(item.created_at)}</span>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-mono font-medium text-xs shrink-0">
                          +{item.amount} XP
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={cn("pt-4 border-t shrink-0 flex items-center justify-end", isDark ? "border-white/10" : "border-zinc-200")}>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 font-medium text-xs transition-colors"
            >
              Close Ledger
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
