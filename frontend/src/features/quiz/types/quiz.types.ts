export type QuestionType =
  | 'mcq'
  | 'multi_correct'
  | 'true_false'
  | 'match'
  | 'fill_blank'
  | 'arrange_steps'
  | 'circuit_prediction'
  | 'bloch_sphere'
  | 'image_based';

export type DifficultyTier = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  id: string;
  text: string;
  image_url?: string;
}

export interface Question {
  _id: string;
  type: QuestionType;
  topic_slug: string;
  concept: string;
  difficulty: DifficultyTier;
  tags: string[];
  prompt: string;
  options: QuestionOption[];
  xp_reward: number;
  time_limit_seconds: number;
  correct_answer?: any; // Only present in review mode payloads
  explanation?: string; // Only present in review mode payloads
}

export interface QuizStartResponse {
  data: {
    topic_slug: string;
    questions: Question[];
    total_questions: number;
  };
  meta: any | null;
  error: { code: string; message: string } | null;
}

export interface QuizAnswerInput {
  question_id: string;
  selected: any;
  time_taken_s: number;
}

export interface QuizSubmitPayload {
  topic_slug: string;
  answers: QuizAnswerInput[];
  mode?: 'practice' | 'assessment' | 'retake';
}

export interface QuizSubmissionResult {
  attempt_id: string;
  topic_slug: string;
  score: number;
  max_score: number;
  score_pct: number;
  xp_earned: number;
  user_xp_total: number;
  user_level: number;
  submitted_at: string;
}

export interface QuizSubmitResponse {
  data: QuizSubmissionResult;
  meta: any | null;
  error: { code: string; message: string } | null;
}

export interface ReviewItem {
  question_id: string;
  prompt: string;
  type: QuestionType;
  difficulty: DifficultyTier;
  options: QuestionOption[];
  selected_answer: any;
  correct_answer: any;
  is_correct: boolean;
  xp_earned: number;
  explanation: string;
  time_taken_s: number;
}

export interface QuizReviewData {
  _id: string;
  firebase_uid: string;
  topic_slug: string;
  score: number;
  max_score: number;
  score_pct: number;
  xp_earned: number;
  started_at: string;
  submitted_at: string;
  mode: string;
  review_items: ReviewItem[];
}

export interface QuizReviewResponse {
  data: QuizReviewData;
  meta: any | null;
  error: { code: string; message: string } | null;
}

export interface LeaderboardEntry {
  rank: number;
  firebase_uid: string;
  display_name: string;
  total_score: number;
  total_xp: number;
  attempts_count: number;
  avg_score_pct: number;
}

export interface LeaderboardResponse {
  data: LeaderboardEntry[];
  meta: any | null;
  error: { code: string; message: string } | null;
}
