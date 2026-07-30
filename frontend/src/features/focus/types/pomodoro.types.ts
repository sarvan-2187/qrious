export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

export interface PomodoroState {
  phase: PomodoroPhase;
  secondsLeft: number;
  isRunning: boolean;
  isPanelOpen: boolean;
  pomodoroCount: number; // completed work sessions in current cycle (0-3)
  totalCompleted: number; // all-time completed sessions this session
  isDndActive: boolean; // true when timer is running in work phase
}

export type PomodoroAction =
  | { type: 'TICK' }
  | { type: 'TOGGLE_RUNNING' }
  | { type: 'TOGGLE_PANEL' }
  | { type: 'SET_PHASE'; payload: PomodoroPhase }
  | { type: 'SKIP' }
  | { type: 'RESET' }
  | { type: 'COMPLETE_SESSION' };

export interface PomodoroContextValue {
  state: PomodoroState;
  dispatch: React.Dispatch<PomodoroAction>;
}

export const PHASE_DURATIONS: Record<PomodoroPhase, number> = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export const PHASE_LABELS: Record<PomodoroPhase, string> = {
  work: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};
