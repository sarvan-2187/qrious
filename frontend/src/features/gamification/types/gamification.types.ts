export interface XpSummary {
  level: number;
  rank_title: string;
  xp_total: number;
  current_level_xp: number;
  next_level_target_xp: number;
  progress_pct: number;
  daily_xp_today?: number;
  daily_goal_xp?: number;
}

export interface XpHistoryItem {
  _id: string;
  firebase_uid: string;
  source: string;
  amount: number;
  idempotent_key?: string;
  created_at: string;
}

export interface Badge {
  _id: string;
  badge_id: string;
  title: string;
  description: string;
  icon: string;
  category: 'roadmap' | 'quiz' | 'notes' | 'flashcards' | 'streak' | 'level';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xp_bonus: number;
  is_unlocked: boolean;
  unlocked_at?: string | null;
}

export interface StreakStatus {
  current_streak: number;
  max_streak: number;
  freeze_tokens: number;
  last_activity_date?: string | null;
  history_dates: string[];
}
