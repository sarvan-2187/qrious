import { useCallback, useState } from 'react';
import { apiClient } from '../../../lib/apiClient';
import type { GateInstance } from './useCircuitState';

export interface QasmImportResult {
  gates: GateInstance[];
  numQubits: number;
  numCbits: number;
}

export const useQasmApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportQasm = useCallback(async (gates: GateInstance[], numQubits: number, numCbits: number, language: string = 'openqasm2'): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/v1/qasm/export', {
        gates,
        num_qubits: numQubits,
        num_cbits: numCbits,
        language,
      });
      return response.data.qasm;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'QASM export failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const importQasm = useCallback(async (qasm: string, language: string = 'openqasm2'): Promise<QasmImportResult> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/v1/qasm/import', { qasm, language });
      return {
        gates: response.data.gates,
        numQubits: response.data.num_qubits,
        numCbits: response.data.num_cbits,
      };
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'QASM import failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { exportQasm, importQasm, loading, error };
};
