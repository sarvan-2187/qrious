import { useState, useCallback } from 'react';
import { apiClient } from '../../../lib/apiClient';

export interface CircuitContext {
  qasm: string;
  qubits: number;
  cbits: number;
  gateCount: number;
  selectedGate?: string | null;
  executionResult?: any;
  executionError?: string | null;
  loadedAlgorithm?: string | null;
}

export const useAiTutorApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askAi = useCallback(async (question: string, circuit_context?: CircuitContext) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/v1/ai/ask', {
        question,
        circuit_context
      });
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'AI request failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const explainCircuit = useCallback(async (circuit_context: CircuitContext) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/v1/ai/explain-circuit', { circuit_context });
      return response.data.explanation;
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to explain circuit');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const optimizeCircuit = useCallback(async (circuit_context: CircuitContext) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/v1/ai/optimize', { circuit_context });
      return response.data.suggestions;
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to optimize circuit');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const detectMistakes = useCallback(async (circuit_context: CircuitContext) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/v1/ai/detect-mistakes', { circuit_context });
      return response.data.issues;
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to detect mistakes');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { askAi, explainCircuit, optimizeCircuit, detectMistakes, loading, error };
};
