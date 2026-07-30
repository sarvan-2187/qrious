import { apiClient } from '@/lib/apiClient';
import type { XpSummary, XpHistoryItem, Badge, StreakStatus } from './types/gamification.types';

export async function fetchXpSummary(): Promise<XpSummary> {
  const response = await apiClient.get<{ data: XpSummary }>('/api/v1/learning/xp/summary');
  return response.data.data;
}

export async function fetchXpHistory(limit = 20): Promise<XpHistoryItem[]> {
  const response = await apiClient.get<{ data: XpHistoryItem[] }>('/api/v1/learning/xp/history', {
    params: { limit }
  });
  return response.data.data || [];
}

export async function fetchBadgesCatalog(): Promise<Badge[]> {
  const response = await apiClient.get<{ data: Badge[] }>('/api/v1/learning/badges');
  return response.data.data || [];
}

export async function fetchUnlockedBadges(): Promise<Badge[]> {
  const response = await apiClient.get<{ data: Badge[] }>('/api/v1/learning/badges/unlocked');
  return response.data.data || [];
}

export async function checkNewBadges(): Promise<Badge[]> {
  const response = await apiClient.post<{ data: Badge[] }>('/api/v1/learning/badges/check');
  return response.data.data || [];
}

export async function fetchStreakStatus(): Promise<StreakStatus> {
  const response = await apiClient.get<{ data: StreakStatus }>('/api/v1/learning/streak');
  return response.data.data;
}

export async function consumeStreakFreezeToken(): Promise<{ success: boolean; freeze_tokens_remaining: number }> {
  const response = await apiClient.post<{ data: { success: boolean; freeze_tokens_remaining: number } }>(
    '/api/v1/learning/streak/freeze/consume'
  );
  return response.data.data;
}
