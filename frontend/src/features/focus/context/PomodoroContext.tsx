import { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { PomodoroState, PomodoroAction, PomodoroContextValue, PomodoroPhase } from '../types/pomodoro.types';
import { PHASE_DURATIONS } from '../types/pomodoro.types';

const DND_CLASS = 'pomodoro-dnd-active';

const initialState: PomodoroState = {
  phase: 'work',
  secondsLeft: PHASE_DURATIONS.work,
  isRunning: false,
  isPanelOpen: false,
  pomodoroCount: 0,
  totalCompleted: 0,
  isDndActive: false,
};

function getNextPhase(phase: PomodoroPhase, pomodoroCount: number): PomodoroPhase {
  if (phase !== 'work') return 'work';
  // After 4 work sessions → long break, otherwise short break
  return (pomodoroCount + 1) % 4 === 0 ? 'longBreak' : 'shortBreak';
}

function pomodoroReducer(state: PomodoroState, action: PomodoroAction): PomodoroState {
  switch (action.type) {
    case 'TICK': {
      if (!state.isRunning || state.secondsLeft <= 0) return state;
      const next = state.secondsLeft - 1;
      if (next <= 0) {
        // Session just completed — dispatch COMPLETE_SESSION asynchronously
        return { ...state, secondsLeft: 0 };
      }
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
        isRunning: true, // auto-start next phase
        pomodoroCount: newCount % 4, // cycle 0-3
        totalCompleted: newTotal,
        isDndActive: nextPhase === 'work', // DND only during work phases
      };
    }

    case 'TOGGLE_RUNNING': {
      const nowRunning = !state.isRunning;
      return {
        ...state,
        isRunning: nowRunning,
        isDndActive: nowRunning && state.phase === 'work',
      };
    }

    case 'TOGGLE_PANEL':
      return { ...state, isPanelOpen: !state.isPanelOpen };

    case 'SET_PHASE':
      return {
        ...state,
        phase: action.payload,
        secondsLeft: PHASE_DURATIONS[action.payload],
        isRunning: false,
        isDndActive: false,
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
        isDndActive: false,
      };
    }

    case 'RESET':
      return {
        ...state,
        secondsLeft: PHASE_DURATIONS[state.phase],
        isRunning: false,
        isDndActive: false,
      };

    default:
      return state;
  }
}

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(pomodoroReducer, initialState);
  const completedRef = useRef(false);

  // Tick every second
  useEffect(() => {
    if (!state.isRunning) return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(id);
  }, [state.isRunning]);

  // Detect session completion (secondsLeft hits 0)
  useEffect(() => {
    if (state.secondsLeft === 0 && state.isRunning && !completedRef.current) {
      completedRef.current = true;
      // Fire event for XP hooks
      if (state.phase === 'work') {
        window.dispatchEvent(new CustomEvent('pomodoro_completed', {
          detail: { totalCompleted: state.totalCompleted + 1 },
        }));
      }
      dispatch({ type: 'COMPLETE_SESSION' });
      // Play a subtle chime via the Web Audio API
      playCompletionChime();
    }
    if (state.secondsLeft > 0) {
      completedRef.current = false;
    }
  }, [state.secondsLeft, state.isRunning, state.phase, state.totalCompleted]);

  // DND — toggle `pomodoro-dnd-active` class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (state.isDndActive) {
      root.classList.add(DND_CLASS);
    } else {
      root.classList.remove(DND_CLASS);
    }
    return () => root.classList.remove(DND_CLASS);
  }, [state.isDndActive]);

  return (
    <PomodoroContext.Provider value={{ state, dispatch }}>
      {children}
    </PomodoroContext.Provider>
  );
}

// Subtle Web Audio chime (no external files needed)
function playCompletionChime() {
  try {
    const ctx = new AudioContext();
    const frequencies = [523.25, 659.25, 783.99]; // C5 E5 G5
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
  } catch {
    // AudioContext not available — silent fail
  }
}

export function usePomodoroContext(): PomodoroContextValue {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error('usePomodoroContext must be used inside PomodoroProvider');
  return ctx;
}
