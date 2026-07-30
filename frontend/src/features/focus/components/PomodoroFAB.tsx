import { AnimatePresence, motion } from 'framer-motion';
import { Play, Pause, SkipForward, RotateCcw, X, Timer, Coffee, Moon, AlertTriangle } from 'lucide-react';
import { usePomodoro } from '../hooks/usePomodoro';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';
import type { PomodoroPhase } from '../types/pomodoro.types';
import { PHASE_DURATIONS, PHASE_LABELS } from '../types/pomodoro.types';

// ── Work phase is now GREEN ──────────────────────────────────────────────────
const PHASE_COLORS: Record<PomodoroPhase, { ring: string; glow: string; bg: string; text: string; dot: string }> = {
  work: {
    ring: '#10b981',
    glow: 'shadow-[0_0_24px_rgba(16,185,129,0.45)]',
    bg: 'from-emerald-600/20 to-teal-700/10',
    text: 'text-emerald-400',
    dot: 'bg-emerald-500',
  },
  shortBreak: {
    ring: '#f59e0b',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.4)]',
    bg: 'from-amber-600/20 to-orange-700/10',
    text: 'text-amber-400',
    dot: 'bg-amber-500',
  },
  longBreak: {
    ring: '#3b82f6',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]',
    bg: 'from-blue-600/20 to-indigo-700/10',
    text: 'text-blue-400',
    dot: 'bg-blue-500',
  },
};

const PHASE_ICONS: Record<PomodoroPhase, React.ReactNode> = {
  work: <Timer className="w-3 h-3" />,
  shortBreak: <Coffee className="w-3 h-3" />,
  longBreak: <Moon className="w-3 h-3" />,
};

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function CircularProgress({ secondsLeft, phase, size = 128 }: {
  secondsLeft: number;
  phase: PomodoroPhase;
  size?: number;
}) {
  const total = PHASE_DURATIONS[phase];
  const elapsed = total - secondsLeft;
  const pct = total > 0 ? elapsed / total : 0;
  const radius = (size / 2) - 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);
  const color = PHASE_COLORS[phase].ring;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-white/10" />
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
        style={{ transition: 'stroke-dashoffset 0.9s linear' }} />
    </svg>
  );
}

// ── Penalty Overlay — compact global banner ──────────────────────────────
function PenaltyOverlay({ secondsLost, isDark, onDismiss }: {
  secondsLost: number;
  isDark: boolean;
  onDismiss: () => void;
}) {
  const minsLost = Math.floor(secondsLost / 60);
  const secsLost = secondsLost % 60;

  return (
    <motion.div
      key="penalty-toast"
      initial={{ opacity: 0, y: -16, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: -16, x: '-50%' }}
      className={cn(
        'fixed top-6 left-1/2 z-[9999] w-full max-w-sm mx-4 rounded-2xl border px-5 py-4 flex items-center gap-3 shadow-2xl backdrop-blur-md',
        isDark ? 'bg-red-950/90 border-red-500/30 text-white' : 'bg-red-50/95 border-red-200 text-zinc-900'
      )}
    >
      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-500">Session abandoned</p>
        <p className={cn('text-xs mt-0.5', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
          {minsLost}m {secsLost}s of progress lost · XP forfeited
        </p>
      </div>
      <button onClick={onDismiss}
        className={cn('text-xs font-mono underline underline-offset-2 shrink-0 transition-colors', isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-700')}>
        dismiss
      </button>
    </motion.div>
  );
}

// ── Global Penalty Toast ───────────────────────────
export function PomodoroFAB() {
  const { state, dispatch } = usePomodoro();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <AnimatePresence>
      {state.penaltyActive && (
        <PenaltyOverlay
          key="penalty"
          isDark={isDark}
          secondsLost={state.penaltySecondsLost}
          onDismiss={() => dispatch({ type: 'CLEAR_PENALTY' })}
        />
      )}
    </AnimatePresence>
  );
}
