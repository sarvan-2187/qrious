import { apiClient } from '@/lib/apiClient';
import type { RoadmapResponse, TopicDetailResponse, TopicCompleteResponse, Flashcard, RoadmapTopic, RecommendPathResponse } from './types/roadmap.types';

export const fetchRoadmap = async (domain?: string): Promise<RoadmapResponse> => {
  const response = await apiClient.get<RoadmapResponse>('/api/v1/learning/roadmap', {
    params: domain ? { domain } : {}
  });
  return response.data;
};

export const fetchTopicDetail = async (slug: string): Promise<TopicDetailResponse> => {
  const response = await apiClient.get<TopicDetailResponse>(`/api/v1/learning/roadmap/${slug}`);
  return response.data;
};

export const startTopic = async (slug: string): Promise<TopicDetailResponse> => {
  const response = await apiClient.post<TopicDetailResponse>(`/api/v1/learning/roadmap/${slug}/start`);
  return response.data;
};

export const updateTopicProgress = async (
  slug: string,
  timeSpentSeconds: number,
  progressPct: number
): Promise<{ data: { topic: RoadmapTopic; progress_pct: number; time_spent_seconds: number; xp_awarded: number } }> => {
  const response = await apiClient.post(`/api/v1/learning/roadmap/${slug}/progress`, {
    time_spent_seconds: timeSpentSeconds,
    progress_pct: progressPct
  });
  return response.data;
};

export const completeTopic = async (slug: string): Promise<TopicCompleteResponse> => {
  const response = await apiClient.post<TopicCompleteResponse>(`/api/v1/learning/roadmap/${slug}/complete`);
  return response.data;
};

export const recommendPath = async (maxTimeMinutes: number): Promise<RecommendPathResponse> => {
  const response = await apiClient.post<RecommendPathResponse>('/api/v1/quantum-optimizer/recommend-path', {
    max_time_minutes: maxTimeMinutes
  });
  return response.data;
};

export const fetchFlashcardsByCategory = async (category: string): Promise<{ data: Flashcard[] }> => {
  const response = await apiClient.get<{ data: Flashcard[] }>('/api/v1/learning/flashcards', {
    params: { category }
  });
  return response.data;
};

export const submitFlashcardReview = async (id: string, quality: number): Promise<{ data: { xp_gained: number; xp_awarded: number } }> => {
  const resultStr = quality >= 3 ? 'remembered' : 'forgotten';
  const response = await apiClient.post<{ data: { xp_gained: number; xp_awarded: number } }>(`/api/v1/learning/flashcards/${id}/review`, {
    recall_rating: quality,
    quality: quality,
    result: resultStr
  });
  return response.data;
};
