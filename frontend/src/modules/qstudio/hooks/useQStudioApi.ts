import { useCallback, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import type {
  FlashcardReviewResult,
  Output,
  OutputType,
  RagMessage,
  RagQueryResponse,
  Source,
  SourceRagStatusOut,
  SourceUploadUrlResponse,
  StudySpace,
  StudySpaceSummary,
} from '../types';

export interface AudioOutputUrlResponse {
  audio_url: string;
}

export interface SlidesOutputUrlsResponse {
  image_urls: string[];
  pdf_url: string;
}

export interface AnimationOutputUrlResponse {
  video_url: string;
  thumbnail_url: string | null;
}

export const useQStudioApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || 'Request failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Study Spaces ---

  const listStudySpaces = useCallback(() => run(async () => {
    const response = await apiClient.get<StudySpaceSummary[]>('/api/v1/qstudio/study-spaces');
    return response.data;
  }), [run]);

  const createStudySpace = useCallback((title?: string) => run(async () => {
    const response = await apiClient.post<StudySpace>('/api/v1/qstudio/study-spaces', {
      title: title || 'Untitled Study Space',
    });
    return response.data;
  }), [run]);

  const getStudySpace = useCallback((id: string) => run(async () => {
    const response = await apiClient.get<StudySpace>(`/api/v1/qstudio/study-spaces/${id}`);
    return response.data;
  }), [run]);

  const renameStudySpace = useCallback((id: string, title: string) => run(async () => {
    const response = await apiClient.patch<StudySpace>(`/api/v1/qstudio/study-spaces/${id}`, { title });
    return response.data;
  }), [run]);

  const deleteStudySpace = useCallback((id: string) => run(async () => {
    await apiClient.delete(`/api/v1/qstudio/study-spaces/${id}`);
  }), [run]);

  // --- Sources ---

  const listSources = useCallback((studySpaceId: string) => run(async () => {
    const response = await apiClient.get<Source[]>(`/api/v1/qstudio/study-spaces/${studySpaceId}/sources`);
    return response.data;
  }), [run]);

  const addTextSource = useCallback((studySpaceId: string, text: string) => run(async () => {
    const response = await apiClient.post<Source>(`/api/v1/qstudio/study-spaces/${studySpaceId}/sources`, {
      kind: 'text',
      text,
    });
    return response.data;
  }), [run]);

  const uploadPdfSource = useCallback((studySpaceId: string, file: File) => run(async () => {
    const urlResponse = await apiClient.post<SourceUploadUrlResponse>(
      `/api/v1/qstudio/study-spaces/${studySpaceId}/sources/upload-url`,
      {
        kind: 'pdf',
        filename: file.name,
        content_type: file.type || 'application/pdf',
        size_bytes: file.size,
      },
    );
    const { upload_url, source_id } = urlResponse.data;

    await fetch(upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/pdf' },
      body: file,
    });

    const confirmResponse = await apiClient.post<Source>(`/api/v1/qstudio/sources/${source_id}/confirm`);
    return confirmResponse.data;
  }), [run]);

  const deleteSource = useCallback((sourceId: string) => run(async () => {
    await apiClient.delete(`/api/v1/qstudio/sources/${sourceId}`);
  }), [run]);

  // --- Outputs ---

  const listOutputs = useCallback((studySpaceId: string) => run(async () => {
    const response = await apiClient.get<Output[]>(`/api/v1/qstudio/study-spaces/${studySpaceId}/outputs`);
    return response.data;
  }), [run]);

  const generateOutput = useCallback(
    (studySpaceId: string, type: OutputType, params: Record<string, unknown> = {}) => run(async () => {
      const response = await apiClient.post<Output>(`/api/v1/qstudio/study-spaces/${studySpaceId}/outputs`, {
        type,
        params,
      });
      return response.data;
    }),
    [run],
  );

  const getOutput = useCallback((outputId: string) => run(async () => {
    const response = await apiClient.get<Output>(`/api/v1/qstudio/outputs/${outputId}`);
    return response.data;
  }), [run]);

  const getAudioOutputUrl = useCallback((outputId: string) => run(async () => {
    const response = await apiClient.get<AudioOutputUrlResponse>(`/api/v1/qstudio/outputs/${outputId}/audio-url`);
    return response.data;
  }), [run]);

  const getSlidesOutputUrls = useCallback((outputId: string) => run(async () => {
    const response = await apiClient.get<SlidesOutputUrlsResponse>(`/api/v1/qstudio/outputs/${outputId}/slides-urls`);
    return response.data;
  }), [run]);

  const getAnimationOutputUrl = useCallback((outputId: string) => run(async () => {
    const response = await apiClient.get<AnimationOutputUrlResponse>(`/api/v1/qstudio/outputs/${outputId}/animation-url`);
    return response.data;
  }), [run]);

  const deleteOutput = useCallback((outputId: string) => run(async () => {
    await apiClient.delete(`/api/v1/qstudio/outputs/${outputId}`);
  }), [run]);

  const reviewFlashcard = useCallback(
    (outputId: string, cardId: string, recallRating: 1 | 2 | 3 | 4) => run(async () => {
      const response = await apiClient.post<FlashcardReviewResult>(
        `/api/v1/qstudio/outputs/${outputId}/flashcards/${cardId}/review`,
        { recall_rating: recallRating },
      );
      return response.data;
    }),
    [run],
  );

  // --- Source-grounded Q&A (RAG) ---

  const askQuestion = useCallback(
    (studySpaceId: string, question: string, sourceIds?: string[]) => run(async () => {
      const response = await apiClient.post<RagQueryResponse>(
        `/api/v1/qstudio/study-spaces/${studySpaceId}/qa`,
        { question, source_ids: sourceIds ?? null },
      );
      return response.data;
    }),
    [run],
  );

  const listQaMessages = useCallback((studySpaceId: string) => run(async () => {
    const response = await apiClient.get<RagMessage[]>(`/api/v1/qstudio/study-spaces/${studySpaceId}/qa/messages`);
    return response.data;
  }), [run]);

  const clearQaMessages = useCallback((studySpaceId: string) => run(async () => {
    await apiClient.delete(`/api/v1/qstudio/study-spaces/${studySpaceId}/qa/messages`);
  }), [run]);

  const getSourceRagStatus = useCallback((sourceId: string) => run(async () => {
    const response = await apiClient.get<SourceRagStatusOut>(`/api/v1/qstudio/sources/${sourceId}/rag-status`);
    return response.data;
  }), [run]);

  const reindexSource = useCallback((sourceId: string) => run(async () => {
    const response = await apiClient.post<SourceRagStatusOut>(`/api/v1/qstudio/sources/${sourceId}/reindex`);
    return response.data;
  }), [run]);

  return {
    listStudySpaces,
    createStudySpace,
    getStudySpace,
    renameStudySpace,
    deleteStudySpace,
    listSources,
    addTextSource,
    uploadPdfSource,
    deleteSource,
    listOutputs,
    generateOutput,
    getOutput,
    getAudioOutputUrl,
    getSlidesOutputUrls,
    getAnimationOutputUrl,
    deleteOutput,
    reviewFlashcard,
    askQuestion,
    listQaMessages,
    clearQaMessages,
    getSourceRagStatus,
    reindexSource,
    loading,
    error,
  };
};
