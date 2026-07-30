import { useCallback } from 'react';
import { apiClient } from '../../../lib/apiClient';
import type { GateInstance } from './useCircuitState';

export const useCircuitApi = () => {
  const saveCircuit = useCallback(async (name: string, numQubits: number, gates: GateInstance[]) => {
    try {
      const response = await apiClient.post('/api/v1/circuits', {
        name,
        num_qubits: numQubits,
        gates
      });
      return response.data;
    } catch (error) {
      console.error('Failed to save circuit', error);
      throw error;
    }
  }, []);

  const loadCircuit = useCallback(async (id: string) => {
    try {
      const response = await apiClient.get(`/api/v1/circuits/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to load circuit', error);
      throw error;
    }
  }, []);

  const listCircuits = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/v1/circuits');
      return response.data;
    } catch (error) {
      console.error('Failed to list circuits', error);
      throw error;
    }
  }, []);

  return { saveCircuit, loadCircuit, listCircuits };
};
