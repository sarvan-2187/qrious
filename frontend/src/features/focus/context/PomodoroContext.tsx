import { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { PomodoroState, PomodoroAction, PomodoroContextValue, PomodoroPhase } from '../types/pomodoro.types';
import { PHASE_DURATIONS } from '../types/pomodoro.types';

const initialState: PomodoroState = {
  phase: 'work',
  secondsLeft: PHASE_DURATIONS.work,
  isRunning: false,
  isPanelOpen: false,
  pomodoroCount: 0,
  totalCompleted: 0,
  penaltyActive: false,
  penaltySecondsLost: 0,
};

function getNextPhase(phase: PomodoroPhase, pomodoroCount: number): PomodoroPhase {
  if (phase !== 'work') return 'work';
  return (pomodoroCount + 1) % 4 === 0 ? 'longBreak' : 'shortBreak';
}

function pomodoroReducer(state: PomodoroState, action: PomodoroAction): PomodoroState {
  switch (action.type) {
    case 'TICK': {
      if (!state.isRunning || state.secondsLeft <= 0) return state;
      const next = state.secondsLeft - 1;
      if (next <= 0) return { ...state, secondsLeft: 0 };
      return { ...state, secondsLeft: next };
    }

    case 'COMPLETE_SESSION': {
      const isWorkPhase = state.phase === 'work';
      const newCount = isWorkPhase ? state.pomodoroCount + 1 : state.pomodoroCount;
      const nextPhase = getNextPhase(state.phase, state.pomodoroCount);
      const newTotal = isWorkPhase ? state.totalCompleted + 1 : state.totalCompleted;
      return {
        ...state,
        phase: nextPhase,
        secondsLeft: PHASE_DURATIONS[nextPhase],
        isRunning: true,
        pomodoroCount: newCount % 4,
        totalCompleted: newTotal,
      };
    }

    case 'TOGGLE_RUNNING':
      return { ...state, isRunning: !state.isRunning };

    case 'TOGGLE_PANEL':
      return { ...state, isPanelOpen: !state.isPanelOpen };

    case 'SET_PHASE':
      return {
        ...state,
        phase: action.payload,
        secondsLeft: PHASE_DURATIONS[action.payload],
        isRunning: false,
      };

    case 'SKIP': {
      const nextPhase = getNextPhase(state.phase, state.pomodoroCount);
      const newCount = state.phase === 'work' ? (state.pomodoroCount + 1) % 4 : state.pomodoroCount;
      const newTotal = state.phase === 'work' ? state.totalCompleted + 1 : state.totalCompleted;
      return {
        ...state,
        phase: nextPhase,
        secondsLeft: PHASE_DURATIONS[nextPhase],
        isRunning: false,
        pomodoroCount: newCount,
        totalCompleted: newTotal,
      };
    }

    case 'RESET':
      return {
        ...state,
        secondsLeft: PHASE_DURATIONS[state.phase],
        isRunning: false,
      };

    // ── Penalty: user escaped fullscreen mid-session ──────────────────────
    case 'APPLY_PENALTY':
      return {
        ...state,
        phase: 'work',
        secondsLeft: PHASE_DURATIONS.work, // reset to full 25 min
        isRunning: false,
        isPanelOpen: true,                 // force-open so they see the penalty
        penaltyActive: true,
        penaltySecondsLost: action.payload.secondsCompleted,
      };

    case 'CLEAR_PENALTY':
      return { ...state, penaltyActive: false, penaltySecondsLost: 0 };

    default:
      return state;
  }
}

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(pomodoroReducer, initialState);
  const completedRef = useRef(false);
  // Ref so fullscreenchange handler always reads the latest lock state
  const isLockedRef = useRef(false);
  // Ref for current secondsLeft so penalty payload is accurate
  const secondsLeftRef = useRef(PHASE_DURATIONS.work);

  isLockedRef.current = state.isRunning && state.phase === 'work';
  secondsLeftRef.current = state.secondsLeft;

  // ── Tick ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!state.isRunning) return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(id);
  }, [state.isRunning]);

  // ── Session completion ───────────────────────────────────────────────────
  useEffect(() => {
    if (state.secondsLeft === 0 && state.isRunning && !completedRef.current) {
      completedRef.current = true;
      if (state.phase === 'work') {
        window.dispatchEvent(new CustomEvent('pomodoro_completed', {
          detail: { totalCompleted: state.totalCompleted + 1 },
        }));
      }
      dispatch({ type: 'COMPLETE_SESSION' });
      playCompletionChime();
    }
    if (state.secondsLeft > 0) {
      completedRef.current = false;
    }
  }, [state.secondsLeft, state.isRunning, state.phase, state.totalCompleted]);

  // ── Fullscreen: enter on work start, exit on pause/break ────────────────
  useEffect(() => {
    const shouldBeFullscreen = state.isRunning && state.phase === 'work';
    if (shouldBeFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (!shouldBeFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [state.isRunning, state.phase]);

  // ── Penalty guard ────────────────────────────────────────────────────────
  // If the user exits fullscreen by any means (Escape, F11, browser button)
  // WHILE a work session is actively running → apply penalty.
  // Normal exits (Pause/Skip/Reset via UI) change state FIRST so
  // isLockedRef.current is already false when fullscreenchange fires → no penalty.
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && isLockedRef.current) {
        const secondsCompleted = PHASE_DURATIONS.work - secondsLeftRef.current;
        dispatch({ type: 'APPLY_PENALTY', payload: { secondsCompleted } });
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  return (
    <PomodoroContext.Provider value={{ state, dispatch }}>
      {children}
    </PomodoroContext.Provider>
  );
}

function playCompletionChime() {
  try {
    const ctx = new AudioContext();
    const frequencies = [523.25, 659.25, 783.99];
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.2;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  } catch { /* silent */ }
}

export function usePomodoroContext(): PomodoroContextValue {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error('usePomodoroContext must be used inside PomodoroProvider');
  return ctx;
}
