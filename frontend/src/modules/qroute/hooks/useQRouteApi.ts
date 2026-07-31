import { useCallback, useState } from 'react';
import { isAxiosError } from 'axios';
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
