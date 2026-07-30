import { AnimatePresence, motion } from 'framer-motion';
import { Play, Pause, SkipForward, RotateCcw, X, Timer, Coffee, Moon } from 'lucide-react';
import { usePomodoro } from '../hooks/usePomodoro';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import type { PomodoroPhase } from '../types/pomodoro.types';
import { PHASE_DURATIONS, PHASE_LABELS } from '../types/pomodoro.types';

const PHASE_COLORS: Record<PomodoroPhase, { ring: string; glow: string; bg: string; text: string; dot: string }> = {
  work: {
    ring: '#a855f7',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.4)]',
    bg: 'from-violet-600/20 to-purple-700/10',
    text: 'text-violet-400',
    dot: 'bg-violet-500',
  },
  shortBreak: {
    ring: '#10b981',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.4)]',
    bg: 'from-emerald-600/20 to-teal-700/10',
    text: 'text-emerald-400',
    dot: 'bg-emerald-500',
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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function CircularProgress({ secondsLeft, phase }: { secondsLeft: number; phase: PomodoroPhase }) {
  const total = PHASE_DURATIONS[phase];
  const elapsed = total - secondsLeft;
  const pct = total > 0 ? elapsed / total : 0;

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);
  const color = PHASE_COLORS[phase].ring;

  return (
    <svg width="128" height="128" viewBox="0 0 128 128" className="rotate-[-90deg]">
      {/* Track */}
      <circle
        cx="64" cy="64" r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        className="text-white/10"
      />
      {/* Progress arc */}
      <circle
        cx="64" cy="64" r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        style={{ transition: 'stroke-dashoffset 0.9s linear' }}
      />
    </svg>
  );
}

export function PomodoroFAB() {
  const { state, dispatch } = usePomodoro();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const colors = PHASE_COLORS[state.phase];

  const minsLeft = Math.ceil(state.secondsLeft / 60);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {state.isPanelOpen && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className={cn(
              'w-72 rounded-2xl border p-5 backdrop-blur-xl font-sans',
              'bg-gradient-to-br',
              colors.bg,
              isDark
                ? 'border-white/10 bg-zinc-900/80 text-white'
                : 'border-zinc-200 bg-white/80 text-zinc-900',
              colors.glow
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-mono font-medium', colors.text)}>
                  {PHASE_LABELS[state.phase].toUpperCase()}
                </span>
                {state.isDndActive && (
                  <span className={cn(
                    'text-[10px] font-mono px-1.5 py-0.5 rounded-full',
                    isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'
                  )}>
                    DND ON
                  </span>
                )}
              </div>
              <button
                onClick={() => dispatch({ type: 'TOGGLE_PANEL' })}
                className={cn(
                  'rounded-full p-1 transition-colors',
                  isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                )}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Circular Timer */}
            <div className="flex flex-col items-center gap-1 mb-4">
              <div className="relative">
                <CircularProgress secondsLeft={state.secondsLeft} phase={state.phase} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn('text-3xl font-mono font-bold tracking-tight', isDark ? 'text-white' : 'text-zinc-900')}>
                    {formatTime(state.secondsLeft)}
                  </span>
                </div>
              </div>
            </div>

            {/* Phase Tabs */}
            <div className={cn(
              'flex rounded-xl p-1 mb-4 gap-1',
              isDark ? 'bg-white/5' : 'bg-zinc-100'
            )}>
              {(['work', 'shortBreak', 'longBreak'] as PomodoroPhase[]).map((p) => (
                <button
                  key={p}
                  onClick={() => dispatch({ type: 'SET_PHASE', payload: p })}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-mono transition-all',
                    state.phase === p
                      ? cn('shadow-sm', isDark ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-900')
                      : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'
                  )}
                >
                  {PHASE_ICONS[p]}
                  {p === 'work' ? 'Focus' : p === 'shortBreak' ? 'Short' : 'Long'}
                </button>
              ))}
            </div>

            {/* Session Dots */}
            <div className="flex items-center justify-center gap-2 mb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-2.5 h-2.5 rounded-full transition-all duration-300',
                    i < state.pomodoroCount
                      ? colors.dot
                      : isDark ? 'bg-white/15' : 'bg-zinc-200'
                  )}
                />
              ))}
              <span className={cn('text-[10px] font-mono ml-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                {state.pomodoroCount}/4
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => dispatch({ type: 'RESET' })}
                className={cn(
                  'p-2 rounded-full transition-all',
                  isDark ? 'hover:bg-white/10 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
                )}
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Play / Pause — main CTA */}
              <button
                onClick={() => dispatch({ type: 'TOGGLE_RUNNING' })}
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95',
                  'shadow-lg',
                  state.phase === 'work'
                    ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/30'
                    : state.phase === 'shortBreak'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/30'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30'
                )}
                title={state.isRunning ? 'Pause' : 'Start'}
              >
                {state.isRunning
                  ? <Pause className="w-5 h-5" />
                  : <Play className="w-5 h-5 translate-x-0.5" />
                }
              </button>

              <button
                onClick={() => dispatch({ type: 'SKIP' })}
                className={cn(
                  'p-2 rounded-full transition-all',
                  isDark ? 'hover:bg-white/10 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
                )}
                title="Skip to next phase"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* DND explanation */}
            {state.isDndActive && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn('text-[10px] font-mono text-center mt-3', isDark ? 'text-zinc-600' : 'text-zinc-400')}
              >
                🔕 Do Not Disturb is active — notifications suppressed
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Trigger Button */}
      <motion.button
        onClick={() => dispatch({ type: 'TOGGLE_PANEL' })}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        title={state.isRunning ? `${minsLeft}m left — ${PHASE_LABELS[state.phase]}` : 'Start Focus Session'}
        className={cn(
          'relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300',
          state.isRunning
            ? cn(
                'text-white',
                state.phase === 'work'
                  ? 'bg-violet-600 shadow-violet-500/40'
                  : state.phase === 'shortBreak'
                  ? 'bg-emerald-600 shadow-emerald-500/40'
                  : 'bg-blue-600 shadow-blue-500/40'
              )
            : isDark
            ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-white/10'
            : 'bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 border border-zinc-200'
        )}
      >
        {/* Pulse ring when running */}
        {state.isRunning && (
          <span
            className={cn(
              'absolute inset-0 rounded-full animate-ping opacity-30',
              state.phase === 'work' ? 'bg-violet-500' : state.phase === 'shortBreak' ? 'bg-emerald-500' : 'bg-blue-500'
            )}
          />
        )}

        {/* Icon */}
        {state.isRunning ? (
          <span className="text-base leading-none font-mono font-bold text-xs">
            {minsLeft}m
          </span>
        ) : (
          <Timer className="w-5 h-5" />
        )}

        {/* Active dot indicator */}
        {state.isRunning && (
          <span className={cn(
            'absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2',
            isDark ? 'border-zinc-950' : 'border-white',
            state.isDndActive ? 'bg-violet-400' : 'bg-emerald-400'
          )} />
        )}
      </motion.button>
    </div>
  );
}
