import React, { useState } from 'react';
import { FaCheckCircle, FaLightbulb, FaRedo, FaTrophy } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { useQStudioApi } from '../hooks/useQStudioApi';
import type { FlashcardsResult } from '../types';

interface FlashcardsReviewerProps {
  outputId: string;
  result: FlashcardsResult;
}

export const FlashcardsReviewer: React.FC<FlashcardsReviewerProps> = ({ outputId, result }) => {
  const { theme } = useTheme();
  const { reviewFlashcard } = useQStudioApi();
  const cards = result.cards;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const currentCard = cards[currentIndex];

  const handleReview = async (rating: 1 | 2 | 3 | 4) => {
    if (!currentCard || submitting) return;
    setSubmitting(true);
    try {
      const res = await reviewFlashcard(outputId, currentCard.id, rating);
      setSessionXp((prev) => prev + (res.xp_awarded || 0));
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (cards.length === 0) {
    return (
      <div className="py-12 text-center space-y-3">
        <FaLightbulb className="text-zinc-500 text-3xl mx-auto" />
        <p className={cn("text-sm", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>No flashcards in this deck.</p>
      </div>
    );
  }

  if (currentIndex >= cards.length) {
    return (
      <div className="py-10 text-center space-y-4">
        <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 text-2xl mx-auto shadow-sm">
          <FaCheckCircle />
        </div>
        <h3 className="text-lg font-semibold tracking-tight">Deck complete!</h3>
        <p className={cn("text-xs max-w-xs mx-auto", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
          Reviewed all {cards.length} cards. Total XP earned: <strong>+{sessionXp} XP</strong>
        </p>
        <button
          onClick={() => { setCurrentIndex(0); setIsFlipped(false); }}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-medium inline-flex items-center gap-2 transition-colors",
            theme === 'dark' ? "bg-white/10 text-zinc-300 hover:text-white" : "bg-zinc-100 text-zinc-700 hover:text-zinc-900",
          )}
        >
          <FaRedo /> Restart deck
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className={theme === 'dark' ? "text-zinc-400" : "text-zinc-600"}>
          Card {currentIndex + 1} of {cards.length}
        </span>
        {sessionXp > 0 && (
          <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[11px] font-mono font-bold rounded-full flex items-center gap-1">
            <FaTrophy /> +{sessionXp} XP
          </span>
        )}
      </div>

      {/* 3D Flip Card Container */}
      <div 
        className="w-full h-[220px] sm:h-[240px] [perspective:1000px] cursor-pointer my-2"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div 
          className={cn(
            "relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]",
            isFlipped && "[transform:rotateY(180deg)]"
          )}
        >
          {/* FRONT FACE */}
          <div 
            className={cn(
              "absolute inset-0 w-full h-full [backface-visibility:hidden] [-webkit-backface-visibility:hidden] p-6 rounded-2xl border flex flex-col justify-between shadow-md transition-colors select-none",
              theme === 'dark' 
                ? "bg-zinc-950 border-white/10 text-white hover:border-emerald-500/50" 
                : "bg-white border-zinc-200 text-zinc-900 hover:border-emerald-500/50"
            )}
          >
            <div className="flex items-center justify-between text-[10px] font-mono uppercase">
              <span className="text-emerald-500 font-bold">Question</span>
              <span className={cn(theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Tap to Flip ↻</span>
            </div>

            <div className="text-center py-4 flex-1 flex items-center justify-center">
              <p className="text-base font-sans leading-relaxed font-medium">
                {currentCard.front}
              </p>
            </div>

            <div className={cn("text-right text-[10px] font-mono", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
              Tap card to reveal answer
            </div>
          </div>

          {/* BACK FACE */}
          <div 
            className={cn(
              "absolute inset-0 w-full h-full [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)] p-6 rounded-2xl border flex flex-col justify-between shadow-md transition-colors select-none",
              theme === 'dark' 
                ? "bg-black border-emerald-500/50 text-white shadow-emerald-500/10" 
                : "bg-zinc-50 border-emerald-500/40 text-zinc-900 shadow-emerald-500/10"
            )}
          >
            <div className="flex items-center justify-between text-[10px] font-mono uppercase">
              <span className="text-emerald-500 font-bold">Answer / Explanation</span>
              <span className={cn(theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>Flipped ↻</span>
            </div>

            <div className="text-center py-4 flex-1 flex items-center justify-center">
              <p className={cn("text-base font-sans leading-relaxed font-medium", theme === 'dark' ? "text-emerald-300" : "text-emerald-700")}>
                {currentCard.back}
              </p>
            </div>

            <div className={cn("text-right text-[10px] font-mono", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
              Ready to rate recall below
            </div>
          </div>
        </div>
      </div>

      {isFlipped ? (
        <div className="space-y-2">
          <span className={cn("block text-center text-[10px] font-mono uppercase tracking-wider", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
            Rate your recall:
          </span>
          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => handleReview(1)} disabled={submitting} className="py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50">
              Again
            </button>
            <button onClick={() => handleReview(2)} disabled={submitting} className="py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-semibold hover:bg-amber-500/20 transition-colors disabled:opacity-50">
              Hard
            </button>
            <button onClick={() => handleReview(3)} disabled={submitting} className="py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-500 text-xs font-semibold hover:bg-blue-500/20 transition-colors disabled:opacity-50">
              Good
            </button>
            <button onClick={() => handleReview(4)} disabled={submitting} className="py-2.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 shadow">
              Easy
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsFlipped(true)}
          className="w-full py-2.5 bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 font-medium text-xs transition-colors"
        >
          Reveal answer
        </button>
      )}
    </div>
  );
};
