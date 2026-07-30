import { useCallback, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import type { Notebook, NotebookSessionResponse, NotebookSummary, QPilotRequest, QPilotResult } from '../types';

export const useQBookApi = () => {
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

  const listNotebooks = useCallback(() => run(async () => {
    const response = await apiClient.get<NotebookSummary[]>('/api/v1/qbook/notebooks');
    return response.data;
  }), [run]);

  const createNotebook = useCallback((title?: string) => run(async () => {
    const response = await apiClient.post<Notebook>('/api/v1/qbook/notebooks', {
      title: title || 'Untitled Notebook',
    });
    return response.data;
  }), [run]);

  const getNotebook = useCallback((id: string) => run(async () => {
    const response = await apiClient.get<Notebook>(`/api/v1/qbook/notebooks/${id}`);
    return response.data;
  }), [run]);

  const updateNotebook = useCallback(
    (id: string, updates: Partial<Pick<Notebook, 'title' | 'cells'>>) => run(async () => {
      const response = await apiClient.patch<Notebook>(`/api/v1/qbook/notebooks/${id}`, updates);
      return response.data;
    }),
    [run],
  );

  const deleteNotebook = useCallback((id: string) => run(async () => {
    await apiClient.delete(`/api/v1/qbook/notebooks/${id}`);
  }), [run]);

  const createSession = useCallback((id: string) => run(async () => {
    const response = await apiClient.post<NotebookSessionResponse>(`/api/v1/qbook/notebooks/${id}/session`);
    return response.data;
  }), [run]);

  const downloadBlob = (data: BlobPart, filename: string) => {
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const exportNotebook = useCallback((id: string, title: string) => run(async () => {
    const response = await apiClient.get(`/api/v1/qbook/notebooks/${id}/export`, { responseType: 'blob' });
    downloadBlob(response.data, `${title}.ipynb`);
  }), [run]);

  const exportNotebookPdf = useCallback((id: string, title: string) => run(async () => {
    const response = await apiClient.get(`/api/v1/qbook/notebooks/${id}/export/pdf`, { responseType: 'blob' });
    downloadBlob(response.data, `${title}.pdf`);
  }), [run]);

  const askQPilot = useCallback((notebookId: string, request: QPilotRequest) => run(async () => {
    const response = await apiClient.post<QPilotResult>(`/api/v1/qbook/notebooks/${notebookId}/qpilot`, request);
    return response.data;
  }), [run]);

  return {
    listNotebooks,
    createNotebook,
    getNotebook,
    updateNotebook,
    deleteNotebook,
    createSession,
    exportNotebook,
    exportNotebookPdf,
    askQPilot,
    loading,
    error,
  };
};
