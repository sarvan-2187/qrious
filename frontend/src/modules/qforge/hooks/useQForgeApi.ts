import { useState } from 'react';
import type { BuildGraphState } from './useBuildState';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

interface ValidateResponse {
  valid: boolean;
  messages: string[];
}

interface ScoreBreakdown {
  thermal: number;
  signalIntegrity: number;
  power: number;
  overall: number;
  warnings: string[];
  failures: string[];
}

export const useQForgeApi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateBuild = async (graph: BuildGraphState): Promise<ValidateResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/qforge/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graph),
      });
      if (!response.ok) throw new Error('Validation failed');
      return await response.json();
    } catch (err: any) {
      setError(err.message);
      return { valid: false, messages: [err.message] };
    } finally {
      setIsLoading(false);
    }
  };

  const scoreBuild = async (graph: BuildGraphState): Promise<ScoreBreakdown | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/qforge/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graph),
      });
      if (!response.ok) throw new Error('Scoring failed');
      return await response.json();
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const saveBuild = async (graph: BuildGraphState) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/qforge/builds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graph),
      });
      if (!response.ok) throw new Error('Failed to save build');
      return await response.json();
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    validateBuild,
    scoreBuild,
    saveBuild,
    isLoading,
    error,
  };
};
