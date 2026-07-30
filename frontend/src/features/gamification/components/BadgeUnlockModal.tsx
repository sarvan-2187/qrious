import React from 'react';
import type { Badge } from '../types/gamification.types';
import { FaTimes, FaTrophy, FaStar, FaBolt } from 'react-icons/fa';

interface BadgeUnlockModalProps {
  badge: Badge | null;
  onClose: () => void;
}

export const BadgeUnlockModal: React.FC<BadgeUnlockModalProps> = ({ badge, onClose }) => {
  if (!badge) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm font-sans animate-fade-in">
      <div className="relative w-full max-w-sm bg-zinc-950/95 border-2 border-amber-500/60 rounded-3xl p-6 text-center shadow-none animate-bounce-short text-white space-y-5">
        {/* Ambient Top Sparkles */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-3 text-amber-400 text-xl animate-pulse">
          <FaStar />
          <FaTrophy className="text-3xl text-amber-300" />
          <FaStar />
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200"
        >
          <FaTimes className="text-xs" />
        </button>

        <div className="pt-4 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold bg-amber-950/80 border border-amber-500/40 px-3 py-1 rounded-full">
            Achievement Unlocked!
          </span>
          <h3 className="text-xl text-slate-100 font-sans tracking-tight pt-3">{badge.title}</h3>
        </div>

        {/* Badge Icon Showcase */}
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500/20 via-emerald-600/30 to-emerald-700/30 border-2 border-amber-400/80 flex items-center justify-center text-4xl text-amber-300 mx-auto shadow-xl shadow-amber-500/20">
          <FaTrophy />
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-sans px-2">{badge.description}</p>

        {/* XP Bonus Pill */}
        <div className="inline-flex items-center gap-1.5 bg-amber-950/90 border border-amber-500/50 px-4 py-1.5 rounded-full text-xs font-mono font-bold text-amber-300">
          <FaBolt className="text-amber-400" /> +{badge.xp_bonus} Bonus XP Awarded!
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-95 text-slate-950 font-bold rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 transition-opacity"
        >
          Claim Achievement
        </button>
      </div>
    </div>
  );
};
