import { useCallback, useState } from 'react';
import { apiClient } from '../../../lib/apiClient';

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  simulation_result?: any;
}

export const useCodeExecutionApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeCode = useCallback(async (sourceCode: string): Promise<CodeExecutionResult> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/v1/code/execute', {
        source_code: sourceCode
      });
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Execution failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { executeCode, loading, error };
};
