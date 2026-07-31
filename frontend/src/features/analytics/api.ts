import { apiClient } from '@/lib/apiClient';
import type {
  AssessmentStartResponse,
  AssessmentSubmitResponse,
  AnalyticsDashboardData
} from './types/analytics.types';

export async function startAssessment(type: 'pre' | 'post', count = 10, difficulty?: string, topicSlug?: string) {
  const params = new URLSearchParams();
  params.append('count', count.toString());
  if (difficulty) params.append('difficulty', difficulty);
  if (topicSlug) params.append('topic_slug', topicSlug);

  const res = await apiClient.post(`/api/v1/learning/assessments/${type}/start?${params.toString()}`);
  return res.data as { data: AssessmentStartResponse };
}

export async function submitAssessment(assessmentId: string, answers: Array<{ question_id: string; selected: any; time_taken_s?: number }>) {
  const res = await apiClient.post(`/api/v1/learning/assessments/${assessmentId}/submit`, { answers });
  return res.data as { data: AssessmentSubmitResponse };
}

export async function fetchAnalyticsDashboard(roadmapId?: string) {
  const tzOffset = new Date().getTimezoneOffset();
  const params = new URLSearchParams();
  params.append('tz_offset', tzOffset.toString());
  if (roadmapId && roadmapId !== 'all') {
    params.append('roadmap_id', roadmapId);
  }
  const res = await apiClient.get(`/api/v1/learning/analytics/dashboard?${params.toString()}`);
  return res.data as { data: AnalyticsDashboardData };
}

export async function sendAnalyticsReportEmail() {
  const res = await apiClient.post('/api/v1/learning/analytics/email-report');
  return res.data as { data: { message: string; to_email: string } };
}
