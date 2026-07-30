import { auth } from '../firebase';

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

export interface LiveSession {
  id: string;
  course_id: string;
  title: string;
  scheduled_at: string;
  status: "scheduled" | "live" | "ended" | "recording_processing" | "recording_ready";
  room_name: string;
  created_by: string;
  started_at?: string;
  ended_at?: string;
  recording_b2_key?: string;
}

export async function createLiveSession(courseId: string, title: string, scheduledAt: string): Promise<{session_id: string}> {
  return await fetchWithAuth(`/api/courses/${courseId}/live-sessions`, {
    method: 'POST',
    body: JSON.stringify({ title, scheduled_at: scheduledAt })
  });
}

export async function listLiveSessions(courseId: string): Promise<LiveSession[]> {
  return await fetchWithAuth(`/api/courses/${courseId}/live-sessions`);
}

export async function startLiveSession(sessionId: string): Promise<{livekit_url: string, token: string, is_educator: boolean}> {
  return await fetchWithAuth(`/api/live-sessions/${sessionId}/start`, { method: 'POST' });
}

export async function joinLiveSession(sessionId: string): Promise<{livekit_url: string, token: string, is_educator: boolean}> {
  return await fetchWithAuth(`/api/live-sessions/${sessionId}/join`, { method: 'POST' });
}

export async function endLiveSession(sessionId: string): Promise<{status: string}> {
  return await fetchWithAuth(`/api/live-sessions/${sessionId}/end`, { method: 'POST' });
}

export async function grantPublishPermission(sessionId: string, identity: string): Promise<{status: string}> {
  return await fetchWithAuth(`/api/live-sessions/${sessionId}/participants/${identity}/permissions`, { 
    method: 'POST',
    body: JSON.stringify({ can_publish: true })
  });
}

export async function revokePublishPermission(sessionId: string, identity: string): Promise<{status: string}> {
  return await fetchWithAuth(`/api/live-sessions/${sessionId}/participants/${identity}/permissions`, { 
    method: 'POST',
    body: JSON.stringify({ can_publish: false })
  });
}

export async function updateAllPermissions(sessionId: string, canPublish: boolean): Promise<{status: string}> {
  return await fetchWithAuth(`/api/live-sessions/${sessionId}/permissions/all`, { 
    method: 'POST',
    body: JSON.stringify({ can_publish: canPublish })
  });
}

export async function getLiveSessionDownloadUrl(sessionId: string): Promise<{download_url: string}> {
  return await fetchWithAuth(`/api/live-sessions/${sessionId}/download-url`);
}
