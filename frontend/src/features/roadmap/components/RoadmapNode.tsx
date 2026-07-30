import React from 'react';
import type { RoadmapTopic } from '../types/roadmap.types';
import { FaPlay, FaLock, FaStar, FaCrown } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface RoadmapNodeProps {
  topic: RoadmapTopic;
  onSelectTopic: (topic: RoadmapTopic) => void;
  isCurrentFocus?: boolean;
  x: number; // horizontal offset in px from center
  y: number; // vertical px position
}

export const RoadmapNode: React.FC<RoadmapNodeProps> = ({
  topic,
  onSelectTopic,
  isCurrentFocus,
  x,
  y,
}) => {
  const { title, order_index, user_status, progress_pct } = topic;
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getNodeStyle = () => {
    switch (user_status) {
      case 'completed':
        return {
          btn: "bg-emerald-500 border-b-6 border-emerald-700 hover:bg-emerald-600 text-white shadow-emerald-500/30",
          numberClass: "text-white text-2xl font-bold font-mono",
          badge: <FaCrown className="text-amber-300 text-sm drop-shadow" />
        };
      case 'in_progress':
        return {
          btn: "bg-emerald-500 border-b-6 border-emerald-700 hover:bg-emerald-600 text-white shadow-emerald-500/50 ring-4 ring-emerald-500/40",
          numberClass: "text-white text-2xl font-bold font-mono",
          badge: <FaPlay className="text-white text-xs ml-0.5" />
        };
      case 'unlocked':
        return {
          btn: isDark
            ? "bg-zinc-900 border-b-6 border-zinc-700 text-emerald-400 hover:border-emerald-500 hover:text-emerald-300 shadow-sm"
            : "bg-white border-b-6 border-zinc-300 text-zinc-800 hover:border-emerald-500 shadow-sm",
          numberClass: isDark ? "text-emerald-400 text-2xl font-bold font-mono" : "text-zinc-900 text-2xl font-bold font-mono",
          badge: <FaPlay className="text-emerald-500 text-xs ml-0.5" />
        };
      case 'locked':
      default:
        return {
          btn: isDark
            ? "bg-zinc-950/80 border-b-6 border-zinc-800/80 text-zinc-600 shadow-none cursor-not-allowed"
            : "bg-zinc-100 border-b-6 border-zinc-200 text-zinc-400 shadow-none cursor-not-allowed",
          numberClass: "text-zinc-500 text-xl font-bold font-mono",
          badge: <FaLock className="text-zinc-500 text-xs" />
        };
    }
  };

  const style = getNodeStyle();

  return (
    <div
      className="absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 z-20 group"
      style={{
        left: `calc(50% + ${x}px)`,
        top: `${y}px`
      }}
    >
      {/* Active Focus Beacon Banner */}
      {(user_status === 'in_progress' || isCurrentFocus) && (
        <motion.div
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: [0, -6, 0], opacity: 1 }}
          transition={{
            y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
            opacity: { duration: 0.3 }
          }}
          className="absolute -top-14 z-30 flex flex-col items-center pointer-events-none shrink-0"
        >
          <div className="px-3 py-1 rounded-full bg-emerald-500 text-white font-mono text-[11px] font-medium shadow-md flex items-center gap-1.5">
            <span>Stage Focus</span>
          </div>
          <div className="w-0 h-0 border-x-5 border-x-transparent border-t-5 border-t-emerald-500 -mt-0.5" />
        </motion.div>
      )}

      {/* Pulsing Aura for active nodes */}
      {user_status === 'in_progress' && (
        <div className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-emerald-500/20 animate-ping pointer-events-none" />
      )}

      {/* 3D Circular Level Button (Saga Map Node) */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95, y: 3 }}
        onClick={() => onSelectTopic(topic)}
        className={cn(
          "w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center relative transition-all duration-200 cursor-pointer select-none shrink-0",
          style.btn
        )}
      >
        {/* Crown / Status Badge Header */}
        <div className={cn(
          "absolute -top-2 flex items-center justify-center w-6 h-6 rounded-full shadow-sm backdrop-blur-sm",
          isDark ? "bg-black/80 border border-white/20" : "bg-zinc-800 border border-zinc-700 text-white"
        )}>
          {style.badge}
        </div>

        {/* Large Prominent Level Number (1, 2, 3, ...) */}
        <span className={style.numberClass}>
          {order_index}
        </span>

        {/* Progress pill for in_progress */}
        {user_status === 'in_progress' && (
          <div className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-black text-emerald-400 font-mono text-[9px] font-medium border border-emerald-500/40 shadow">
            {progress_pct}%
          </div>
        )}
      </motion.button>

      {/* Star Rating Badge underneath completed levels */}
      {user_status === 'completed' && (
        <div className="flex items-center gap-1 text-amber-400 text-xs mt-1.5 animate-fade-in drop-shadow-sm">
          <FaStar />
          <FaStar />
          <FaStar />
        </div>
      )}

      {/* Stage Title Pill centered below button */}
      <div
        onClick={() => onSelectTopic(topic)}
        className={cn(
          "mt-2 px-3.5 py-1.5 rounded-2xl border text-center cursor-pointer transition-all duration-200 max-w-[180px] backdrop-blur-md shadow-sm hover:scale-105 select-none",
          user_status === 'locked' ? "opacity-60" : "opacity-100",
          isDark
            ? "bg-zinc-950/90 border-white/10 text-white hover:border-emerald-500/50"
            : "bg-white/95 border-zinc-200 text-zinc-900 hover:border-emerald-500/30"
        )}
      >
        <span className="font-sans text-xs font-medium block truncate">
          {title}
        </span>
      </div>
    </div>
  );
};
