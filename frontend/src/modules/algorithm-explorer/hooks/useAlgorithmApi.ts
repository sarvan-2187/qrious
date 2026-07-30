import { useState, useCallback } from 'react';
import { apiClient } from '../../../lib/apiClient';

export interface QuickInfo {
  difficulty: string;
  category: string;
  quantumAdvantage: string;
  mainConcepts: string[];
  prerequisites: string[];
  circuitType: string;
  hardwareSuitability: string;
  outputType: string;
  relatedAlgorithms: string[];
}

export interface AlgorithmContent {
  overview: string;
  whyNeeded: string;
  classicalIntuition: string;
  quantumIdea: string;
  conceptsUsed: string;
  inputsOutputs: string;
  stepByStep: string;
  circuitExplanation: string;
  mathematicalExplanation: string;
  workedExample: string;
  measurement: string;
  complexity: string;
  speedupSource: string;
  realWorldAnalogy: string;
  applications: string;
  advantages: string;
  limitations: string;
  hardwareRequirements: string;
  relatedAlgorithmsDetail: string;
  tryItYourself: string;
}

export interface AlgorithmBase {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  level: number;
  status?: string;
  quickInfo: QuickInfo;
  content: AlgorithmContent;
  example_circuit?: {
    num_qubits: number;
    num_cbits: number;
    gates: any[];
  };
}

export interface AlgorithmSummary {
  slug: string;
  name: string;
  shortDescription: string;
  difficulty: string;
  category: string;
  learningLevel: number;
  status?: string;
}

export const useAlgorithmApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listAlgorithms = useCallback(async (): Promise<AlgorithmSummary[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/v1/algorithms');
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch algorithms');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAlgorithm = useCallback(async (slug: string): Promise<AlgorithmBase> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/api/v1/algorithms/${slug}`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch algorithm details');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const runAlgorithm = useCallback(async (slug: string): Promise<any> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post(`/api/v1/algorithms/${slug}/run`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Simulation failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { listAlgorithms, getAlgorithm, runAlgorithm, loading, error };
};
