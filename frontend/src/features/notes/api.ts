import { apiClient } from '@/lib/apiClient';
import type {
  Note,
  NoteFolder,
  NotesListResponse,
  FoldersListResponse,
  CreateNotePayload,
  UpdateNotePayload,
  CreateFolderPayload,
  UploadAttachmentResponse,
  AiNoteActionResponse
} from './types/note.types';

export const fetchFolders = async (): Promise<FoldersListResponse> => {
  const res = await apiClient.get<FoldersListResponse>('/api/v1/learning/notes/folders');
  return res.data;
};

export const createFolder = async (payload: CreateFolderPayload): Promise<{ data: NoteFolder }> => {
  const res = await apiClient.post<{ data: NoteFolder }>('/api/v1/learning/notes/folders', payload);
  return res.data;
};

export const deleteFolder = async (folderId: string): Promise<{ data: { success: boolean } }> => {
  const res = await apiClient.delete<{ data: { success: boolean } }>(`/api/v1/learning/notes/folders/${folderId}`);
  return res.data;
};

export const fetchNotes = async (
  folderId?: string,
  topicSlug?: string,
  search?: string
): Promise<NotesListResponse> => {
  const params: Record<string, any> = {};
  if (folderId) params.folder_id = folderId;
  if (topicSlug) params.topic_slug = topicSlug;
  if (search) params.search = search;

  const res = await apiClient.get<NotesListResponse>('/api/v1/learning/notes', { params });
  return res.data;
};

export const fetchNoteById = async (noteId: string): Promise<{ data: Note }> => {
  const res = await apiClient.get<{ data: Note }>(`/api/v1/learning/notes/${noteId}`);
  return res.data;
};

export const createNote = async (payload: CreateNotePayload): Promise<{ data: Note }> => {
  const res = await apiClient.post<{ data: Note }>('/api/v1/learning/notes', payload);
  return res.data;
};

export const updateNote = async (noteId: string, payload: UpdateNotePayload): Promise<{ data: Note }> => {
  const res = await apiClient.put<{ data: Note }>(`/api/v1/learning/notes/${noteId}`, payload);
  return res.data;
};

export const deleteNote = async (noteId: string): Promise<{ data: { success: boolean } }> => {
  const res = await apiClient.delete<{ data: { success: boolean } }>(`/api/v1/learning/notes/${noteId}`);
  return res.data;
};

export const uploadAttachment = async (file: File): Promise<UploadAttachmentResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiClient.post<UploadAttachmentResponse>('/api/v1/learning/notes/upload-attachment', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const runAiNoteAction = async (
  noteId: string,
  action: 'summarize' | 'generate_quiz'
): Promise<AiNoteActionResponse> => {
  const res = await apiClient.post<AiNoteActionResponse>(`/api/v1/learning/notes/${noteId}/ai-action`, { action });
  return res.data;
};
