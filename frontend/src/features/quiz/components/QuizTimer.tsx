import React, { useEffect, useState, useRef } from 'react';
import { FaClock, FaPause, FaPlay, FaPlus, FaInfinity } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface QuizTimerProps {
  totalSeconds: number;
  onTimeUp?: () => void;
  isPaused?: boolean;
  isUntimed?: boolean;
  onToggleUntimed?: () => void;
}

export const QuizTimer: React.FC<QuizTimerProps> = ({
  totalSeconds,
  onTimeUp,
  isPaused = false,
  isUntimed = false,
  onToggleUntimed,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [manualPause, setManualPause] = useState(false);
  const hasTriggeredRef = useRef(false);
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  });

  useEffect(() => {
    setSecondsLeft(totalSeconds);
    hasTriggeredRef.current = false;
  }, [totalSeconds]);

  const effectivePaused = isPaused || manualPause;

  useEffect(() => {
    if (isUntimed || effectivePaused || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isUntimed, effectivePaused, secondsLeft]);

  useEffect(() => {
    if (!isUntimed && secondsLeft === 0 && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      if (onTimeUpRef.current) {
        onTimeUpRef.current();
      }
    }
  }, [secondsLeft, isUntimed]);

  const handleAddExtraTime = () => {
    setSecondsLeft((prev) => prev + 60);
    hasTriggeredRef.current = false;
  };

  if (isUntimed) {
    return (
      <div className="flex items-center gap-2 font-mono">
        <button
          type="button"
          onClick={onToggleUntimed}
          title="Click to switch to Timed Mode"
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium shadow-sm transition-all hover:scale-105",
            isDark
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
              : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
          )}
        >
          <FaInfinity className="text-xs text-emerald-500" />
          <span>Untimed Mode</span>
        </button>
      </div>
    );
  }

  const minutes = Math.floor(secondsLeft / 60);
  const remainderSeconds = secondsLeft % 60;
  const timeStr = `${minutes}:${remainderSeconds.toString().padStart(2, '0')}`;

  const pct = Math.max(0, (secondsLeft / totalSeconds) * 100);
  const isUrgent = secondsLeft < 30 && secondsLeft > 0;
  const isTimeUp = secondsLeft <= 0;

  return (
    <div className="flex items-center gap-2 font-mono">
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium shadow-sm transition-colors",
          isTimeUp
            ? "bg-amber-500/10 border-amber-500/50 text-amber-500 animate-pulse"
            : isUrgent
              ? "bg-red-500/10 border-red-500/50 text-red-500 animate-pulse"
              : isDark
                ? "bg-black border-white/10 text-emerald-400"
                : "bg-zinc-50 border-zinc-200 text-emerald-600"
        )}
      >
        <FaClock className={cn("text-xs", isTimeUp ? "text-amber-500" : isUrgent ? "text-red-500" : "text-emerald-500")} />
        <span>{isTimeUp ? "Time's Up!" : timeStr}</span>
      </div>

      <div className={cn("w-16 sm:w-20 h-2 rounded-full overflow-hidden border hidden sm:block", isDark ? "bg-black border-white/10" : "bg-zinc-100 border-zinc-200")}>
        <div
          className={cn("h-full transition-all duration-300 rounded-full", isUrgent ? "bg-red-500" : isTimeUp ? "bg-amber-500" : "bg-emerald-500")}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Timer Controls: Pause/Play & Add Time */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setManualPause(!manualPause)}
          title={manualPause ? "Resume Timer" : "Pause Timer"}
          className={cn(
            "p-1.5 rounded-lg border text-xs transition-colors",
            isDark ? "bg-zinc-900 border-white/10 hover:bg-zinc-800 text-zinc-300" : "bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-700"
          )}
        >
          {manualPause ? <FaPlay className="text-[10px] text-emerald-400" /> : <FaPause className="text-[10px]" />}
        </button>

        <button
          type="button"
          onClick={handleAddExtraTime}
          title="Add +1 Minute"
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-mono transition-colors",
            isDark ? "bg-zinc-900 border-white/10 hover:bg-zinc-800 text-emerald-400" : "bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-emerald-600"
          )}
        >
          <FaPlus className="text-[9px]" />
          <span>1m</span>
        </button>
      </div>
    </div>
  );
};

