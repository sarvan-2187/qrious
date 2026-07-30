export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

export interface PomodoroState {
  phase: PomodoroPhase;
  secondsLeft: number;
  isRunning: boolean;
  isPanelOpen: boolean;
  pomodoroCount: number;      // completed work sessions in current cycle (0-3)
  totalCompleted: number;     // all-time completed sessions this session
  penaltyActive: boolean;     // true when user abandoned by leaving fullscreen
  penaltySecondsLost: number; // how many seconds they had completed before bailing
}

export type PomodoroAction =
  | { type: 'TICK' }
  | { type: 'TOGGLE_RUNNING' }
  | { type: 'TOGGLE_PANEL' }
  | { type: 'SET_PHASE'; payload: PomodoroPhase }
  | { type: 'SKIP' }
  | { type: 'RESET' }
  | { type: 'COMPLETE_SESSION' }
  | { type: 'APPLY_PENALTY'; payload: { secondsCompleted: number } }
  | { type: 'CLEAR_PENALTY' };


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
