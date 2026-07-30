import React, { useState, useEffect } from 'react';
import { fetchFlashcardsByCategory, submitFlashcardReview } from '../api';
import type { Flashcard } from '../types/roadmap.types';
import { FaLayerGroup, FaTimes, FaTrophy, FaLightbulb, FaCheckCircle, FaRedo } from 'react-icons/fa';
import { toast } from 'sonner';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface TopicFlashcardsModalProps {
  category: string;
  topicTitle: string;
  onClose: () => void;
}

export const TopicFlashcardsModal: React.FC<TopicFlashcardsModalProps> = ({
  category,
  topicTitle,
  onClose
}) => {
  const { theme } = useTheme();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadCards() {
      try {
        setLoading(true);
        const res = await fetchFlashcardsByCategory(category);
        setCards(res.data || []);
      } catch (err: any) {
        toast.error('Failed to load flashcards deck.');
      } finally {
        setLoading(false);
      }
    }
    loadCards();
  }, [category]);

  const currentCard = cards[currentIndex];

  const handleReview = async (quality: number) => {
    if (!currentCard || submitting) return;

    try {
      setSubmitting(true);
      const res = await submitFlashcardReview(currentCard._id, quality);
      const gained = res.data?.xp_gained ?? res.data?.xp_awarded ?? 5;
      if (gained > 0) {
        setSessionXp(prev => prev + gained);
        window.dispatchEvent(new CustomEvent('xp_updated'));
      }
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);

    } catch (err: any) {
      toast.error('Failed to record card review.');
    } finally {
      setSubmitting(false);
    }
  };


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm font-sans animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full max-w-xl border rounded-[2rem] p-6 sm:p-8 shadow-none flex flex-col justify-between min-h-[500px] font-sans cursor-default",
          theme === 'dark' ? "bg-zinc-950/95 border-white/10 text-white" : "bg-white/95 border-zinc-200 text-zinc-900"
        )}
      >
        {/* Header */}
        <div className={cn("flex items-center justify-between pb-4 border-b", theme === 'dark' ? "border-white/10" : "border-zinc-200")}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-2xl border flex items-center justify-center text-lg",
              theme === 'dark' ? "bg-black border-white/10 text-emerald-400" : "bg-zinc-50 border-zinc-200 text-emerald-600"
            )}>
              <FaLayerGroup />
            </div>
            <div>
              <h3 className="text-lg font-sans tracking-tight">{topicTitle} Flashcards</h3>
              <span className="text-[10px] font-mono text-emerald-500 uppercase">SM-2 Spaced Repetition</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {sessionXp > 0 && (
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-mono font-bold rounded-full flex items-center gap-1">
                <FaTrophy className="text-emerald-500" /> +{sessionXp} XP
              </span>
            )}
            <button
              onClick={onClose}
              className={cn(
                "w-9 h-9 rounded-full border flex items-center justify-center transition-colors",
                theme === 'dark' ? "bg-black border-white/10 text-zinc-400 hover:text-white" : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900"
              )}
            >
              <FaTimes className="text-sm" />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className={cn("text-xs font-mono animate-pulse", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>Loading quantum flashcards deck...</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <FaLightbulb className="text-zinc-500 text-4xl mx-auto" />
            <h4 className="text-lg font-bold">No Flashcards Available</h4>
            <p className={cn("text-xs max-w-xs mx-auto", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
              No flashcards found for category "{category}". Complete quizzes and notes to generate decks!
            </p>
          </div>
        ) : currentIndex >= cards.length ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 text-3xl mx-auto shadow-sm">
              <FaCheckCircle />
            </div>
            <h3 className="text-xl font-extrabold tracking-tight">Deck Complete!</h3>
            <p className={cn("text-xs max-w-xs mx-auto", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
              Great work! You reviewed all {cards.length} cards in this deck. Total XP earned: <strong>+{sessionXp} XP</strong>
            </p>
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors",
                  theme === 'dark' ? "bg-white/10 text-zinc-300 hover:text-white" : "bg-zinc-100 text-zinc-700 hover:text-zinc-900"
                )}
              >
                <FaRedo /> Restart Deck
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 font-medium text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-6">
            {/* Card Progress */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className={theme === 'dark' ? "text-zinc-400" : "text-zinc-600"}>Card {currentIndex + 1} of {cards.length}</span>
              <div className={cn("w-32 rounded-full h-1.5 overflow-hidden", theme === 'dark' ? "bg-white/10" : "bg-zinc-200")}>
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
                />
              </div>
            </div>

            {/* 3D Flip Card Container */}
            <div 
              className="w-full h-[240px] sm:h-[260px] [perspective:1000px] cursor-pointer my-2"
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
                      {currentCard.question || currentCard.front || ''}
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
                      {currentCard.answer || currentCard.back || ''}
                    </p>
                  </div>

                  <div className={cn("text-right text-[10px] font-mono", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
                    Ready to rate retention below
                  </div>
                </div>
              </div>
            </div>

            {/* Quality Rating Buttons (SM-2) */}
            {isFlipped ? (
              <div className="space-y-2">
                <span className={cn("block text-center text-[10px] font-mono uppercase tracking-wider", theme === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
                  Rate your recall memory:
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleReview(1)}
                    disabled={submitting}
                    className="py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold hover:bg-red-500/20 transition-colors"
                  >
                    1 - Again
                  </button>
                  <button
                    onClick={() => handleReview(3)}
                    disabled={submitting}
                    className="py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-semibold hover:bg-amber-500/20 transition-colors"
                  >
                    3 - Hard
                  </button>
                  <button
                    onClick={() => handleReview(4)}
                    disabled={submitting}
                    className="py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-500 text-xs font-semibold hover:bg-blue-500/20 transition-colors"
                  >
                    4 - Good
                  </button>
                  <button
                    onClick={() => handleReview(5)}
                    disabled={submitting}
                    className="py-2.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors shadow"
                  >
                    5 - Easy (+XP)
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsFlipped(true)}
                className="w-full py-2.5 bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 font-medium text-xs transition-colors"
              >
                Reveal Answer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
