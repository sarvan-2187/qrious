import { auth } from '../firebase';

export type ResourceType = "video" | "ppt" | "notes" | "cheatsheet" | "interactive_lab";

export interface Resource {
  resource_id: string;
  resource_type: ResourceType;
  title: string;
  description: string;
  filename: string;
  uploaded_by: string;
  uploaded_at: string;
  status: "pending" | "confirmed";
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

export async function requestUploadUrl(params: {
  lesson_id: string;
  resource_type: ResourceType;
  title: string;
  description: string;
  filename: string;
  content_type: string;
}): Promise<{ upload_url: string; resource_id: string }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getApiUrl()}/api/lessons/${params.lesson_id}/resources/upload-url`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to request upload URL");
  }
  
  return response.json();
}

export async function confirmUpload(resourceId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getApiUrl()}/api/resources/${resourceId}/confirm`, {
    method: 'POST',
    headers,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to confirm upload");
  }
}

export async function getDownloadUrl(resourceId: string): Promise<{ download_url: string }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getApiUrl()}/api/resources/${resourceId}/download-url`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to get download URL");
  }
  
  return response.json();
}

export async function getViewUrl(resourceId: string): Promise<{ view_url: string }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getApiUrl()}/api/resources/${resourceId}/view-url`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to get view URL");
  }
  
  return response.json();
}

export async function getResource(resourceId: string): Promise<Resource> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getApiUrl()}/api/resources/${resourceId}`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to get resource");
  }
  
  return response.json();
}

export async function listResources(filters: {
  title?: string;
  resource_type?: ResourceType;
}): Promise<Resource[]> {
  const headers = await getAuthHeaders();
  const queryParams = new URLSearchParams();
  if (filters.title) queryParams.append('title', filters.title);
  if (filters.resource_type) queryParams.append('resource_type', filters.resource_type);
  
  const queryString = queryParams.toString();
  const url = `${getApiUrl()}/api/resources${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to list resources");
  }
  
  return response.json();
}

export async function deleteResource(resourceId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getApiUrl()}/api/resources/${resourceId}`, {
    method: 'DELETE',
    headers,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to delete resource");
  }
}
