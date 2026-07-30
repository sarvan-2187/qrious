from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class AssessmentStartRequest(BaseModel):
    difficulty: Optional[str] = Field(None, description="easy | medium | hard")
    count: int = Field(10, ge=1, le=25, description="Number of questions in assessment")

class AssessmentAnswerInput(BaseModel):
    question_id: str
    selected: Any
    time_taken_s: Optional[int] = 0

class AssessmentSubmitRequest(BaseModel):
    answers: List[AssessmentAnswerInput]

class ConceptMasteryItem(BaseModel):
    concept: str
    topic_slug: str
    total_questions: int
    correct_questions: int
    accuracy_pct: float
    status: str  # 'needs_attention' | 'review' | 'strong' | 'mastered'

class AccuracyTrendItem(BaseModel):
    session_type: str  # 'quiz' | 'assessment'
    title: str
    score_pct: float
    taken_at: str

class HeatmapDayItem(BaseModel):
    date: str  # YYYY-MM-DD
    count: int
    xp_gained: int

class StudyHabitAnalytics(BaseModel):
    study_days: int
    total_xp: int
    daily_sessions: int
    longest_streak: int
    current_streak: int
    most_active_week: str
    avg_study_time_mins: int

class PrePostDeltaInfo(BaseModel):
    pre_score_pct: Optional[float] = None
    post_score_pct: Optional[float] = None
    delta_pct: Optional[float] = None
    confidence_pct: int = 85
    performance_classification: str  # 'Excellent Progress' | 'Consistent Improvement' | 'Stable Performance' | 'Needs Reinforcement'
    academic_recommendation: str
    improvement_text: str

class PersonalizedInsight(BaseModel):
    type: str  # 'strength' | 'improvement' | 'recommendation'
    title: str
    description: str

class MasteryProgressInfo(BaseModel):
    overall_mastery_pct: float
    status_label: str
    mastered_count: int
    review_needed_count: int
    advanced_remaining_count: int

class LearningSummaryReport(BaseModel):
    overall_accuracy_pct: float
    learning_gain_text: str
    strongest_area: str
    focus_area: str
    study_consistency: str
    recommendation_text: str

class AnalyticsDashboardResponse(BaseModel):
    concept_mastery_matrix: List[ConceptMasteryItem]
    weak_concepts: List[ConceptMasteryItem]  # Backward compatibility
    pre_post_delta: PrePostDeltaInfo
    accuracy_trend: List[AccuracyTrendItem]
    accuracy_trend_summary: Dict[str, Any]  # best_score, lowest_score, trend_summary
    heatmap_days: List[HeatmapDayItem]
    study_habit_analytics: StudyHabitAnalytics
    personalized_insights: List[PersonalizedInsight]
    mastery_progress: MasteryProgressInfo
    learning_summary: LearningSummaryReport
    total_questions_attempted: int
    total_correct: int
    overall_accuracy_pct: float
    total_assessments_completed: int
    current_streak: int
