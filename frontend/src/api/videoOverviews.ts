import { auth } from '../firebase';

export type VideoOverviewStatus =
  | 'queued'
  | 'scripting'
  | 'narrating'
  | 'rendering'
  | 'assembling'
  | 'uploading'
  | 'ready'
  | 'failed';

export type VideoTemplate = 'minimal_dark' | 'bold_gradient' | 'academic_light';
export type VoiceGender = 'male' | 'female';

export interface SlideScript {
  title: string;
  bullets: string[];
  narration: string;
}

export interface VideoOverview {
  id: string;
  lesson_id: string | null;
  prompt: string;
  status: VideoOverviewStatus;
  error: string | null;
  resource_id: string | null;
  slide_script: SlideScript[] | null;
  template: VideoTemplate;
  voice: VoiceGender;
  created_at: string;
  updated_at: string;
}

const getApiUrl = () => import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const getAuthHeaders = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User is not authenticated");
  }
  const token = await user.getIdToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export async function requestVideoOverview(params: {
  lessonId: string;
  prompt: string;
  sourceResourceId?: string;
  template?: VideoTemplate;
  voice?: VoiceGender;
}): Promise<{ video_overview_id: string }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getApiUrl()}/api/lessons/${params.lessonId}/video-overviews`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: params.prompt,
      source_resource_id: params.sourceResourceId ?? null,
      template: params.template,
      voice: params.voice,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to start video overview generation");
  }

  return response.json();
}

export async function getVideoOverviewStatus(videoOverviewId: string): Promise<VideoOverview> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getApiUrl()}/api/video-overviews/${videoOverviewId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to get video overview status");
  }

  return response.json();
}

export async function listVideoOverviews(lessonId: string): Promise<VideoOverview[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getApiUrl()}/api/lessons/${lessonId}/video-overviews`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to list video overviews");
  }

  return response.json();
}

// Standalone (not lesson-scoped) generation — the student-facing chat tab.
export async function requestStandaloneVideoOverview(
  prompt: string,
  options?: { template?: VideoTemplate; voice?: VoiceGender }
): Promise<{ video_overview_id: string }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getApiUrl()}/api/video-overviews`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      source_resource_id: null,
      template: options?.template,
      voice: options?.voice,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to start video overview generation");
  }

  return response.json();
}

export async function listMyVideoOverviews(): Promise<VideoOverview[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getApiUrl()}/api/video-overviews`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to load video overview history");
  }

  return response.json();
}

export async function getVideoOverviewViewUrl(videoOverviewId: string): Promise<{ download_url: string }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getApiUrl()}/api/video-overviews/${videoOverviewId}/view-url`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to load video");
  }

  const data = await response.json();
  return { download_url: data.view_url };
}
