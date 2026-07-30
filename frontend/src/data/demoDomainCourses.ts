export interface DemoCourse {
  id: string;
  title: string;
  category: 'CS' | 'Civil' | 'Mechanical' | 'Electrical' | 'Hardware';
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  modulesCount: number;
  duration: string;
  tags: string[];
}

export const DEMO_COURSES: DemoCourse[] = [];
