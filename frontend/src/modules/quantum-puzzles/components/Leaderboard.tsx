import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { FaFire, FaUser, FaTrophy } from 'react-icons/fa';
import { apiClient } from '@/lib/apiClient';
import { motion } from 'framer-motion';

interface LeaderboardUser {
  rank: number;
  firebase_uid: string;
  display_name: string;
  xp_total: number;
  daily_solves_count: number;
  combined_score: number;
}

export const Leaderboard: React.FC = () => {
  const { theme } = useTheme();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEducator, setIsEducator] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(4);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const response = await apiClient.get<{ data: LeaderboardUser[]; meta?: { is_educator?: boolean } }>('/api/v1/learning/puzzles/leaderboard');
        if (response.data?.meta?.is_educator) {
          setIsEducator(true);
          return;
        }
        if (response.data && Array.isArray(response.data.data)) {
          setUsers(response.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
        setError("Could not load rankings");
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  if (isEducator) {
    return null;
  }

  if (loading) {
    return (
      <div className={cn(
        "p-8 rounded-[2rem] border shadow-md hover:shadow-lg transition-all duration-300 font-sans flex flex-col gap-6 relative hover:scale-[1.01] h-full min-h-[365px]",
        theme === 'dark'
          ? "bg-zinc-950/50 border-white/10 hover:border-white/20 hover:bg-zinc-900/30"
          : "bg-white border-zinc-200 hover:border-zinc-300"
      )}>
        <div className={cn(
          "pb-4 border-b flex items-center justify-between gap-4",
          theme === 'dark' ? "border-white/10" : "border-zinc-200"
        )}>
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-xl font-medium tracking-tight text-foreground flex items-center gap-2">Leaderboard</h3>
              <p className={cn("text-xs mt-0.5", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")}>
                Top learners ranked by XP & daily solves
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          <p className="text-xs text-muted-foreground font-mono">Loading Leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error || users.length === 0) {
    return (
      <div className={cn(
        "p-8 rounded-[2rem] border shadow-md hover:shadow-lg transition-all duration-300 font-sans flex flex-col gap-6 relative hover:scale-[1.01] h-full min-h-[365px]",
        theme === 'dark'
          ? "bg-zinc-950/50 border-white/10 hover:border-white/20 hover:bg-zinc-900/30"
          : "bg-white border-zinc-200 hover:border-zinc-300"
      )}>
        <div className={cn(
          "pb-4 border-b flex items-center justify-between gap-4",
          theme === 'dark' ? "border-white/10" : "border-zinc-200"
        )}>
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-xl font-medium tracking-tight text-foreground flex items-center gap-2">Leaderboard</h3>
              <p className={cn("text-xs mt-0.5", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")}>
                Top learners ranked by XP & daily solves
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <FaTrophy className="w-10 h-10 text-zinc-600 mb-2" />
          <p className="text-sm font-medium">No rankings yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Be the first to complete a daily challenge!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "p-8 rounded-[2rem] border shadow-md hover:shadow-lg transition-all duration-300 font-sans flex flex-col gap-6 relative hover:scale-[1.01] h-full lg:min-h-[365px]",
      theme === 'dark'
        ? "bg-zinc-950/50 border-white/10 hover:border-white/20 hover:bg-zinc-900/30"
        : "bg-white border-zinc-200 hover:border-zinc-300"
    )}>
      <div className={cn(
        "pb-4 border-b flex items-center justify-between gap-4",
        theme === 'dark' ? "border-white/10" : "border-zinc-200"
      )}>
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-xl font-medium tracking-tight text-foreground flex items-center gap-2">Leaderboard</h3>
            <p className={cn("text-xs mt-0.5", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")}>
              Top learners ranked by XP & daily solves
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
        {users.slice(0, displayLimit).map((user, idx) => {
          const rankColors = 
            user.rank === 1 ? "text-yellow-400" :
            user.rank === 2 ? "text-zinc-300" :
            user.rank === 3 ? "text-amber-600" : "text-zinc-500";

          return (
            <motion.div
              key={user.firebase_uid}
              className={cn(
                "flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300",
                theme === 'dark' 
                  ? "bg-zinc-900/40 border-white/5 hover:border-emerald-500/20" 
                  : "bg-zinc-50/50 border-zinc-100 hover:border-emerald-500/10"
              )}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: Math.min(idx * 0.05, 0.4) }}
            >
              {/* Left side: Rank and Name */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-7 flex justify-center items-center shrink-0">
                  <span className={cn("font-mono text-xs font-medium", rankColors)}>
                    #{user.rank}
                  </span>
                </div>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs border shrink-0",
                    theme === 'dark' ? "bg-zinc-800/80 border-white/5 text-zinc-300" : "bg-zinc-100 border-zinc-200 text-zinc-600"
                  )}>
                    <FaUser className="w-3 h-3" />
                  </div>
                  <span className="text-xs font-sans font-medium tracking-tight truncate block">
                    {user.display_name}
                  </span>
                </div>
              </div>

              {/* Right side: XP, Solves, Score */}
              <div className="flex items-center gap-4 shrink-0 pl-3">
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[10px] font-mono font-medium text-emerald-500">
                    {user.xp_total} XP
                  </span>
                  <span className="text-[9px] font-mono text-orange-500 flex items-center gap-0.5">
                    <FaFire className="w-2.5 h-2.5 shrink-0" /> {user.daily_solves_count} solves
                  </span>
                </div>
                
                {/* Combined Score Indicator */}
                <div className={cn(
                  "px-2.5 py-1 rounded-lg border font-mono text-xs font-medium shadow-sm min-w-[45px] text-center",
                  theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-zinc-100 border-zinc-200 text-zinc-900"
                )}>
                  {user.combined_score}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {users.length > 4 && (
        <div className="flex justify-center items-center pt-2.5 border-t border-zinc-200/50 dark:border-white/5 shrink-0 mt-auto">
          {displayLimit < users.length ? (
            <button
              onClick={() => setDisplayLimit(prev => Math.min(prev + 4, users.length))}
              className="text-xs text-emerald-500 hover:text-emerald-400 font-medium transition-colors focus:outline-none"
            >
              Show More
            </button>
          ) : (
            <button
              onClick={() => setDisplayLimit(4)}
              className="text-xs text-emerald-500 hover:text-emerald-400 font-medium transition-colors focus:outline-none"
            >
              Show Less
            </button>
          )}
        </div>
      )}
    </div>
  );
};
