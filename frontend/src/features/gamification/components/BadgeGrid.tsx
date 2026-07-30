import React, { useState } from 'react';
import type { Badge } from '../types/gamification.types';
import {
  FaFlag, FaGraduationCap, FaCrown, FaQuestionCircle, FaStar,
  FaCheckDouble, FaPen, FaBook, FaLayerGroup, FaBrain,
  FaFire, FaBolt, FaTrophy, FaRocket, FaGem, FaLock, FaPuzzlePiece,
  FaCompass, FaAtom, FaAward, FaFilePdf, FaBookOpen
} from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface BadgeGridProps {
  badges: Badge[];
  loading?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FaFlag, FaGraduationCap, FaCrown, FaQuestionCircle, FaStar,
  FaCheckDouble, FaPen, FaBook, FaLayerGroup, FaBrain,
  FaFire, FaBolt, FaTrophy, FaRocket, FaGem, FaPuzzlePiece,
  FaCompass, FaAtom, FaAward, FaFilePdf, FaBookOpen
};

export const BadgeGrid: React.FC<BadgeGridProps> = ({ badges, loading = false }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const { theme } = useTheme();

  const categories = ['all', 'roadmap', 'quiz', 'notes', 'flashcards', 'streak', 'level', 'puzzle'];

  const filteredBadges = badges.filter((b) => {
    if (activeCategory === 'all') return true;
    return b.category === activeCategory;
  });

  const unlockedCount = badges.filter((b) => b.is_unlocked).length;

  return (
    <div className={cn(
      "p-8 rounded-[2rem] border shadow-sm transition-all duration-300 font-sans space-y-6 flex flex-col justify-between hover:scale-[1.01]",
      theme === 'dark'
        ? "bg-zinc-950/50 border-white/10 hover:border-white/20 hover:bg-zinc-900/30 text-white"
        : "bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900"
    )}>
      {/* Category Filter Pills & Header */}
      <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6", theme === 'dark' ? "border-white/10" : "border-zinc-200")}>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-xl font-sans tracking-tight">Achievement Badges</h3>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-mono font-medium">
              {unlockedCount} / {badges.length} Unlocked
            </span>
          </div>
          <p className={cn("text-xs", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
            Complete quantum learning milestones to collect badges and earn bonus XP!
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-medium font-sans capitalize transition-colors",
                activeCategory === cat
                  ? "bg-emerald-500 text-white shadow-sm"
                  : theme === 'dark'
                    ? "bg-white/10 text-zinc-400 hover:text-white"
                    : "bg-zinc-100 text-zinc-600 hover:text-zinc-900"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-40 rounded-[2rem] border animate-pulse p-6",
                theme === 'dark' ? "bg-white/5 border-white/10" : "bg-zinc-100 border-zinc-200"
              )}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          {filteredBadges.map((badge) => {
            const IconComp = ICON_MAP[badge.icon] || FaTrophy;
            const isUnlocked = badge.is_unlocked;

            return (
              <motion.div
                key={badge.badge_id || badge._id}
                className={cn(
                  "p-6 rounded-[2rem] border flex flex-col items-center text-center justify-between gap-3 relative transition-all duration-300 group hover:scale-105",
                  isUnlocked
                    ? theme === 'dark'
                      ? "bg-black/60 border-emerald-500/40 hover:border-white/20 hover:bg-zinc-900/30"
                      : "bg-white border-emerald-500/30 hover:border-zinc-300 shadow-sm"
                    : theme === 'dark'
                      ? "bg-zinc-950/30 border-white/5 opacity-50"
                      : "bg-zinc-50 border-zinc-200 opacity-60"
                )}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Icon badge §1.5 */}
                <div className={cn(
                  "w-12 h-12 rounded-2xl border flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105",
                  isUnlocked
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                    : theme === 'dark'
                      ? "bg-black border-white/10 text-zinc-600"
                      : "bg-zinc-100 border-zinc-200 text-zinc-400"
                )}>
                  {isUnlocked ? <IconComp className="w-6 h-6" /> : <FaLock className="w-5 h-5" />}
                </div>

                <div>
                  <h4 className="text-xs font-sans tracking-tight mb-1">{badge.title}</h4>
                  <p className={cn("text-[11px] line-clamp-2 leading-relaxed", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
                    {badge.description}
                  </p>
                </div>

                <div className="flex items-center justify-between w-full text-[10px] font-mono">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full border uppercase font-medium text-[9px]",
                    badge.rarity === 'legendary'
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-500"
                      : badge.rarity === 'epic'
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                        : badge.rarity === 'rare'
                          ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                          : "bg-slate-500/10 border-slate-500/40 text-slate-400"
                  )}>
                    {badge.rarity}
                  </span>
                  <span className="flex items-center gap-0.5 text-emerald-500 font-medium">
                    <FaBolt className="text-[10px]" /> +{badge.xp_bonus} XP
                  </span>
                </div>
              </motion.div>

            );
          })}
        </div>
      )}
    </div>
  );
};
