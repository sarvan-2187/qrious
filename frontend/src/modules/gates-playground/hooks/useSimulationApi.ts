import { useCallback, useState } from 'react';
import { apiClient } from '../../../lib/apiClient';
import type { GateInstance } from './useCircuitState';

export const useSimulationApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const simulate = useCallback(async (numQubits: number, numCbits: number, gates: GateInstance[], shots: number = 1024) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/v1/simulate', {
        num_qubits: numQubits,
        num_cbits: numCbits,
        gates,
        shots
      });
      setResult(response.data);
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Simulation failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const simulateDebug = useCallback(async (numQubits: number, numCbits: number, gates: GateInstance[]) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/v1/debug/steps', {
        num_qubits: numQubits,
        num_cbits: numCbits,
        gates
      });
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Debug simulation failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { simulate, simulateDebug, clearResult, result, loading, error };
};
