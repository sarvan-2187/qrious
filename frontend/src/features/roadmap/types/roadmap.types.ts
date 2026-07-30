export type TopicStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';

export interface VideoRef {
  title: string;
  url: string;
  source: string;
}

export interface MaterialRef {
  title: string;
  url: string;
  type: string;
  file_size?: string;
}

export interface ContentRefs {
  lesson_ids: string[];
  quiz_topic_tag: string;
  flashcard_category: string;
  videos?: VideoRef[];
  materials?: MaterialRef[];
}

export type DomainCategory = 'all' | 'quantum-mechanics' | 'quantum-computing' | 'quantum-communication' | 'quantum-machine-learning' | 'quantum-hardware';

export interface RoadmapTopic {
  _id?: string;
  slug: string;
  title: string;
  order_index: number;
  domain?: string;
  prerequisites: string[];
  estimated_minutes: number;
  description: string;
  content_refs: ContentRefs;
  user_status: TopicStatus;
  progress_pct: number;
  started_at?: string;
  completed_at?: string;
}

export interface Flashcard {
  _id: string;
  category: string;
  question: string;
  answer: string;
  front?: string;
  back?: string;
  image_url?: string;
  difficulty?: string;
}

export interface RoadmapResponse {
  data: RoadmapTopic[];
  meta: any | null;
  error: { code: string; message: string } | null;
}

export interface TopicDetailResponse {
  data: RoadmapTopic;
  meta: any | null;
  error: { code: string; message: string } | null;
}

export interface TopicCompleteResponse {
  data: {
    topic: RoadmapTopic;
    newly_unlocked: string[];
  };
  meta: any | null;
  error: { code: string; message: string } | null;
}
