import { useCallback, useState } from 'react';
import { apiClient } from '../../../lib/apiClient';
import type { GateInstance } from '../hooks/useCircuitState';

export interface BlochVector {
  x: number;
  y: number;
  z: number;
}

export interface DebugStep {
  step_index: number;
  gate_applied?: GateInstance;
  statevector: { real: number; imag: number }[];
  density_matrix: { real: number; imag: number }[][];
  per_qubit_bloch_vectors: Record<string, BlochVector>;
  probabilities: Record<string, number>;
}

export const useDebugStepApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDebugSteps = useCallback(async (circuitId?: string, numQubits?: number, numCbits?: number, gates?: GateInstance[]): Promise<DebugStep[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/v1/debug/steps', {
        circuit_id: circuitId,
        num_qubits: numQubits,
        num_cbits: numCbits,
        gates: gates
      });
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Debug calculation failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchDebugSteps, loading, error };
};
