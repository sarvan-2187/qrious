import { useCallback, useState } from 'react';
import { apiClient } from '../../../lib/apiClient';

export interface QRouteProvider {
  id: string;
  display_name: string;
  is_configured: boolean;
}

export type Modality = 'superconducting' | 'trapped-ion' | 'aggregator';

export interface QRouteDevice {
  id: string;
  name: string;
  provider: string;
  modality: Modality;
  is_simulator: boolean;
  status: string;
}

export type QRouteJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface QRouteJob {
  id: string;
  provider: string;
  device_id: string;
  shots: number;
  qasm: string | null;
  status: QRouteJobStatus;
  result: Record<string, number> | null;
  cost: number | null;
  estimated_cost: number | null;
  error_message: string | null;
  status_detail: string | null;
  created_at: string;
  updated_at: string;
}

export interface QCompareDivergence {
  bitstring: string;
  ideal_probability: number;
  real_probability: number;
  delta: number;
}

export interface QCompareReport {
  id: string;
  job_id: string;
  provider: string;
  device_id: string;
  shots: number;
  ideal_counts: Record<string, number>;
  real_counts: Record<string, number>;
  total_variation_distance: number;
  top_divergences: QCompareDivergence[];
  summary: string;
  likely_causes: string[];
  // Empty string on reports generated before this shipped — treat as "unavailable."
  simple_explanation: string;
  created_at: string;
  audio_output_id: string | null;
  animation_output_id: string | null;
}

export const useQRouteApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listProviders = useCallback(async (): Promise<QRouteProvider[]> => {
    try {
      const response = await apiClient.get('/api/v1/qroute/providers');
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load providers');
      throw err;
    }
  }, []);

  const listDevices = useCallback(async (provider?: string): Promise<QRouteDevice[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/v1/qroute/devices', {
        params: provider ? { provider } : undefined,
      });
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to load devices';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitJob = useCallback(
    async (provider: string, deviceId: string, qasm: string, shots: number): Promise<QRouteJob> => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.post('/api/v1/qroute/jobs', {
          provider,
          device_id: deviceId,
          qasm,
          shots,
        });
        return response.data;
      } catch (err: any) {
        const errorMsg = err.response?.data?.detail || err.message || 'Job submission failed';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getJobStatus = useCallback(async (jobId: string): Promise<QRouteJob> => {
    try {
      const response = await apiClient.get(`/api/v1/qroute/jobs/${jobId}`);
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to check job status';
      setError(errorMsg);
      throw err;
    }
  }, []);

  const listJobs = useCallback(async (): Promise<QRouteJob[]> => {
    try {
      const response = await apiClient.get('/api/v1/qroute/jobs');
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to load jobs';
      setError(errorMsg);
      throw err;
    }
  }, []);

  const runQCompare = useCallback(async (jobId: string): Promise<QCompareReport> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post(`/api/v1/qroute/jobs/${jobId}/compare`);
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to generate qCompare report';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getQCompare = useCallback(async (jobId: string): Promise<QCompareReport | null> => {
    try {
      const response = await apiClient.get(`/api/v1/qroute/jobs/${jobId}/compare`);
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  }, []);

  const runQCompareAudio = useCallback(async (jobId: string): Promise<QCompareReport> => {
    try {
      const response = await apiClient.post(`/api/v1/qroute/jobs/${jobId}/compare/audio`);
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to start audio generation';
      setError(errorMsg);
      throw err;
    }
  }, []);

  const runQCompareAnimation = useCallback(async (jobId: string, theme: string): Promise<QCompareReport> => {
    try {
      const response = await apiClient.post(`/api/v1/qroute/jobs/${jobId}/compare/animation`, { theme });
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to start animation generation';
      setError(errorMsg);
      throw err;
    }
  }, []);

  return {
    listProviders, listDevices, submitJob, getJobStatus, listJobs,
    runQCompare, getQCompare, runQCompareAudio, runQCompareAnimation,
    loading, error,
  };
};
