export interface NoteFolder {
  _id: string;
  firebase_uid: string;
  name: string;
  color?: string;
  created_at: string;
}

export interface Note {
  _id: string;
  firebase_uid: string;
  title: string;
  content_markdown: string;
  folder_id?: string | null;
  topic_slug?: string | null;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateNotePayload {
  title: string;
  content_markdown?: string;
  folder_id?: string | null;
  topic_slug?: string | null;
  tags?: string[];
}

export interface UpdateNotePayload {
  title?: string;
  content_markdown?: string;
  folder_id?: string | null;
  topic_slug?: string | null;
  tags?: string[];
}

export interface CreateFolderPayload {
  name: string;
  color?: string;
}

export interface NotesListResponse {
  data: Note[];
  meta: {
    total: number;
  };
  error?: string | null;
}

export interface FoldersListResponse {
  data: NoteFolder[];
  meta?: any;
  error?: string | null;
}

export interface UploadAttachmentResponse {
  data: {
    url: string;
    filename: string;
  };
  meta?: any;
  error?: string | null;
}

export interface AiNoteActionResponse {
  data: {
    action: 'summarize' | 'generate_quiz';
    result: string;
  };
  meta?: any;
  error?: string | null;
}
