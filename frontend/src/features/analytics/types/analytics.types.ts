export type ConceptMasteryStatus = 'needs_attention' | 'review' | 'strong' | 'mastered';

export interface ConceptMasteryItem {
  concept: string;
  topic_slug: string;
  total_questions: number;
  correct_questions: number;
  accuracy_pct: number;
  status: ConceptMasteryStatus;
}

export interface AccuracyTrendItem {
  session_type: string;
  title: string;
  score_pct: number;
  taken_at: string;
}

export interface AccuracyTrendSummary {
  best_score: number;
  lowest_score: number;
  trend_summary: string;
}

export interface HeatmapDayItem {
  date: string; // YYYY-MM-DD
  count: number;
  xp_gained: number;
}

export interface StudyHabitAnalytics {
  study_days: number;
  total_xp: number;
  daily_sessions: number;
  longest_streak: number;
  current_streak: number;
  most_active_week: string;
  avg_study_time_mins: number;
}

export interface PrePostDeltaInfo {
  pre_score_pct: number | null;
  post_score_pct: number | null;
  delta_pct: number | null;
  confidence_pct: number;
  performance_classification: 'Excellent Progress' | 'Consistent Improvement' | 'Stable Performance' | 'Needs Reinforcement';
  academic_recommendation: string;
  improvement_text: string;
}

export interface PersonalizedInsight {
  type: 'strength' | 'improvement' | 'recommendation';
  title: string;
  description: string;
}

export interface MasteryProgressInfo {
  overall_mastery_pct: number;
  status_label: string;
  mastered_count: number;
  review_needed_count: number;
  advanced_remaining_count: number;
}

export interface LearningSummaryReport {
  overall_accuracy_pct: number;
  learning_gain_text: string;
  strongest_area: string;
  focus_area: string;
  study_consistency: string;
  recommendation_text: string;
}

export interface AnalyticsDashboardData {
  concept_mastery_matrix: ConceptMasteryItem[];
  weak_concepts: ConceptMasteryItem[];
  pre_post_delta: PrePostDeltaInfo;
  accuracy_trend: AccuracyTrendItem[];
  accuracy_trend_summary: AccuracyTrendSummary;
  heatmap_days: HeatmapDayItem[];
  study_habit_analytics: StudyHabitAnalytics;
  personalized_insights: PersonalizedInsight[];
  mastery_progress: MasteryProgressInfo;
  learning_summary: LearningSummaryReport;
  total_questions_attempted: number;
  total_correct: number;
  overall_accuracy_pct: number;
  total_assessments_completed: number;
  current_streak: number;
}

export interface AssessmentQuestion {
  _id: string;
  type: string;
  topic_slug: string;
  concept?: string;
  difficulty: string;
  prompt: string;
  options?: Array<{ id: string; text: string; image_url?: string }>;
  time_limit_seconds?: number;
  xp_reward?: number;
}

export interface AssessmentStartResponse {
  assessment_id: string;
  type: 'pre' | 'post';
  questions: AssessmentQuestion[];
  total_questions: number;
  estimated_minutes: number;
}

export interface GradedAnswer {
  question_id: string;
  concept: string;
  topic_slug: string;
  selected: any;
  correct: boolean;
  xp_earned: number;
  time_taken_s: number;
  explanation?: string;
}

export interface AssessmentSubmitResponse {
  assessment_id: string;
  type: 'pre' | 'post';
  score_pct: number;
  total_correct: number;
  total_questions: number;
  xp_earned: number;
  graded_answers: GradedAnswer[];
}
