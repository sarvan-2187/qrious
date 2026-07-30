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
export interface DomainConfig {
  id: string;
  name: string;
  description: string;
  iconName: string;
  isLocked: boolean;
  requiredXp: number;
  requiredPretestScore?: number;
  prerequisiteDomainId?: string;
  prerequisiteDomainName?: string;
}

export const AVAILABLE_DOMAINS: DomainConfig[] = [
  {
    id: 'quantum-maths',
    name: 'Quantum Mathematics & Linear Algebra',
    description: 'Complex vector spaces, Dirac notation, Hilbert spaces, operators & tensor algebra.',
    iconName: 'Atom',
    isLocked: false,
    requiredXp: 0,
  },
  {
    id: 'quantum-physics',
    name: 'Quantum Physics & Wave Mechanics',
    description: 'Wave-particle duality, Schrödinger equation, Heisenberg uncertainty & spin-1/2.',
    iconName: 'Atom',
    isLocked: false,
    requiredXp: 0,
  },
  {
    id: 'quantum-computing',
    name: 'Quantum Computing & Algorithms',
    description: 'Qubits, quantum circuits, Grover, Shor & Variational algorithms.',
    iconName: 'Cpu',
    isLocked: false,
    requiredXp: 100,
    prerequisiteDomainId: 'quantum-maths',
    prerequisiteDomainName: 'Quantum Mathematics'
  },
  {
    id: 'quantum-communication',
    name: 'Quantum Communication & QKD',
    description: 'Bell States, Quantum Teleportation, BB84 QKD & Quantum Repeaters.',
    iconName: 'Shield',
    isLocked: false,
    requiredXp: 150,
    prerequisiteDomainId: 'quantum-physics',
    prerequisiteDomainName: 'Quantum Physics'
  },
  {
    id: 'quantum-machine-learning',
    name: 'Quantum Machine Learning',
    description: 'VQE, Quantum Neural Networks (QNN), QSVC & Quantum Born Machines.',
    iconName: 'Brain',
    isLocked: true,
    requiredXp: 300,
    requiredPretestScore: 75,
    prerequisiteDomainId: 'quantum-computing',
    prerequisiteDomainName: 'Quantum Computing'
  },
  {
    id: 'quantum-hardware',
    name: 'Quantum Hardware & Fault Tolerance',
    description: 'Transmon qubits, pulse shaping, Gottesman-Knill & 2D surface codes.',
    iconName: 'Layers',
    isLocked: true,
    requiredXp: 500,
    requiredPretestScore: 80,
    prerequisiteDomainId: 'quantum-computing',
    prerequisiteDomainName: 'Quantum Computing'
  }
];
