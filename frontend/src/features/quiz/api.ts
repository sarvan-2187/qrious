import { apiClient } from '@/lib/apiClient';
import type {
  QuizStartResponse,
  QuizSubmitPayload,
  QuizSubmitResponse,
  QuizReviewResponse,
  LeaderboardResponse
} from './types/quiz.types';

export const startQuizSession = async (
  topicSlug: string,
  difficulty?: string,
  count: number = 5
): Promise<QuizStartResponse> => {
  const params = new URLSearchParams();
  if (difficulty) params.append('difficulty', difficulty);
  params.append('count', count.toString());

  const response = await apiClient.get<QuizStartResponse>(
    `/api/v1/learning/quiz/topics/${topicSlug}/start?${params.toString()}`
  );
  return response.data;
};

export const submitQuizAttempt = async (
  payload: QuizSubmitPayload
): Promise<QuizSubmitResponse> => {
  const response = await apiClient.post<QuizSubmitResponse>(
    '/api/v1/learning/quiz/attempts',
    payload
  );
  return response.data;
};

export const fetchQuizReview = async (
  attemptId: string
): Promise<QuizReviewResponse> => {
  const response = await apiClient.get<QuizReviewResponse>(
    `/api/v1/learning/quiz/attempts/${attemptId}/review`
  );
  return response.data;
};

export const fetchQuizLeaderboard = async (
  topicSlug?: string
): Promise<LeaderboardResponse> => {
  const url = topicSlug
    ? `/api/v1/learning/quiz/leaderboard?topic=${topicSlug}`
    : '/api/v1/learning/quiz/leaderboard';
  const response = await apiClient.get<LeaderboardResponse>(url);
  return response.data;
};
