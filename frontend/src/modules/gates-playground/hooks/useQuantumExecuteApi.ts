import { useCallback, useState } from 'react';
import { apiClient } from '../../../lib/apiClient';
import type { Language } from '../components/LanguageSelector';

// ── Shared ────────────────────────────────────────────────────────────────────

interface ExecuteResults {
  counts: Record<string, number>;
  statevector: number[] | null;
  executionTime: number;
}

export interface QuantumExecuteResponse {
  success: boolean;
  results?: ExecuteResults;
  error?: string;
  errorLine?: number | null;
}

export interface DebugStep {
  step: number;
  line: number;
  operation: string;
  state: number[];
  gates: string[];
  timestamp: number;
}

export interface QuantumDebugResponse {
  success: boolean;
  trace?: DebugStep[];
  circuitDiagram?: string | null;
  error?: string;
  errorLine?: number | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useQuantumExecuteApi = () => {
  const [executeResult, setExecuteResult] = useState<QuantumExecuteResponse | null>(null);
  const [debugTrace, setDebugTrace] = useState<QuantumDebugResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeQuantum = useCallback(
    async (language: Language, code: string, shots = 1024): Promise<QuantumExecuteResponse> => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.post<QuantumExecuteResponse>('/api/quantum/execute', {
          language,
          code,
          options: { shots },
        });
        setExecuteResult(response.data);
        return response.data;
      } catch (err: any) {
        // 400 responses carry the error body; surface it cleanly
        const data: QuantumExecuteResponse = err.response?.data ?? {
          success: false,
          error: err.message ?? 'Execution failed',
        };
        setExecuteResult(data);
        setError(data.error ?? null);
        return data;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const debugQuantum = useCallback(
    async (language: Language, code: string, breakpoints: number[] = []): Promise<QuantumDebugResponse> => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.post<QuantumDebugResponse>('/api/quantum/debug', {
          language,
          code,
          breakpoints,
        });
        setDebugTrace(response.data);
        return response.data;
      } catch (err: any) {
        const data: QuantumDebugResponse = err.response?.data ?? {
          success: false,
          error: err.message ?? 'Debug failed',
        };
        setDebugTrace(data);
        setError(data.error ?? null);
        return data;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const clearResults = useCallback(() => {
    setExecuteResult(null);
    setDebugTrace(null);
    setError(null);
  }, []);

  return { executeQuantum, debugQuantum, executeResult, debugTrace, loading, error, clearResults };
};
