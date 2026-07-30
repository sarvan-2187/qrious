import { auth } from '../firebase';

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  order: number;
  resources?: any[];
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  order: number;
  lessons?: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  owner_uid: string;
  status: "draft" | "published";
  format?: "self_paced" | "cohort_based" | "recorded";
  category?: string;
  level?: string;
  duration?: string;
  tags?: string[];
  modules?: Module[];
  enrolled?: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

async function getToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("No user logged in");
  return await user.getIdToken();
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await getToken();
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const res = await fetch(`${API_URL}${url}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API Error: ${res.status}`);
  }
  return res.json();
}

export async function getCourse(courseId: string): Promise<Course> {
  return await fetchWithAuth(`/api/courses/${courseId}`);
}

export async function updateCourse(courseId: string, data: Partial<Pick<Course, "title" | "description" | "format">>): Promise<Course> {
  await fetchWithAuth(`/api/courses/${courseId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
  // The PATCH endpoint just returns {"message": "Course updated"}, so we fetch it again
  return getCourse(courseId);
}

export async function togglePublish(courseId: string): Promise<Course> {
  await fetchWithAuth(`/api/courses/${courseId}/publish`, {
    method: 'POST'
  });
  return getCourse(courseId);
}

// In the backend, modules are nested inside the course response.
// But for new modules created on the fly, we use the POST endpoint.
export async function createModule(courseId: string, title: string, order: number): Promise<Module> {
  const res = await fetchWithAuth(`/api/courses/${courseId}/modules`, {
    method: 'POST',
    body: JSON.stringify({ title, order })
  });
  return { id: res.id, course_id: courseId, title, order, lessons: [] };
}

export async function createLesson(moduleId: string, title: string, order: number): Promise<Lesson> {
  const res = await fetchWithAuth(`/api/modules/${moduleId}/lessons`, {
    method: 'POST',
    body: JSON.stringify({ title, order })
  });
  return { id: res.id, module_id: moduleId, title, order };
}

export async function getLesson(lessonId: string): Promise<Lesson> {
  return await fetchWithAuth(`/api/lessons/${lessonId}`);
}

export async function createCourse(title: string, description: string): Promise<Course> {
  const res = await fetchWithAuth(`/api/courses`, {
    method: 'POST',
    body: JSON.stringify({ title, description })
  });
  return { id: res.id, title, description, owner_uid: '', status: 'draft' };
}

export async function listEducatorCourses(): Promise<Course[]> {
  return await fetchWithAuth(`/api/educator/courses`);
}

export async function listPublishedCourses(): Promise<Course[]> {
  return await fetchWithAuth(`/api/courses`);
}

export async function listEnrolledCourses(): Promise<Course[]> {
  return await fetchWithAuth(`/api/student/enrollments`);
}

export async function enrollCourse(courseId: string): Promise<void> {
  await fetchWithAuth(`/api/courses/${courseId}/join`, {
    method: 'POST'
  });
}

export async function getCourseProgress(courseId: string): Promise<{ progress_percentage: number, completed: number, total: number }> {
  return await fetchWithAuth(`/api/courses/${courseId}/progress`);
}

export async function completeLesson(lessonId: string): Promise<void> {
  await fetchWithAuth(`/api/lessons/${lessonId}/complete`, {
    method: 'POST'
  });
}

export async function deleteCourse(courseId: string): Promise<void> {
  await fetchWithAuth(`/api/courses/${courseId}`, {
    method: 'DELETE'
  });
}

export async function updateModule(moduleId: string, data: { title?: string, order?: number }): Promise<Module> {
  return await fetchWithAuth(`/api/modules/${moduleId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteModule(moduleId: string): Promise<void> {
  await fetchWithAuth(`/api/modules/${moduleId}`, {
    method: 'DELETE'
  });
}

export async function updateLesson(lessonId: string, data: { title?: string, order?: number }): Promise<Lesson> {
  return await fetchWithAuth(`/api/lessons/${lessonId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteLesson(lessonId: string): Promise<void> {
  await fetchWithAuth(`/api/lessons/${lessonId}`, {
    method: 'DELETE'
  });
}
