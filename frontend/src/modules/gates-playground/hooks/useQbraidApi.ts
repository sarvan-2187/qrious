import { useCallback, useState } from 'react';
import { apiClient } from '../../../lib/apiClient';

export interface QbraidDevice {
  id: string;
  name: string;
  is_simulator: boolean;
  status: string;
}

export type QbraidJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface QbraidJob {
  id: string;
  device_id: string;
  shots: number;
  status: QbraidJobStatus;
  result: Record<string, number> | null;
  cost: number | null;
  estimated_cost: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export const useQbraidApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listDevices = useCallback(async (): Promise<QbraidDevice[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/v1/qbraid/devices');
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to load devices';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitJob = useCallback(async (qasm: string, deviceId: string, shots: number): Promise<QbraidJob> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/v1/qbraid/jobs', {
        qasm,
        device_id: deviceId,
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
  }, []);

  const getJobStatus = useCallback(async (jobId: string): Promise<QbraidJob> => {
    try {
      const response = await apiClient.get(`/api/v1/qbraid/jobs/${jobId}`);
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to check job status';
      setError(errorMsg);
      throw err;
    }
  }, []);

  return { listDevices, submitJob, getJobStatus, loading, error };
};
