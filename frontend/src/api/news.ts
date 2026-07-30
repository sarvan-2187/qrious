export interface QuantumNewsArticle {
  id: string;
  source: 'arxiv' | 'qiskit' | 'physorg' | string;
  category: 'hardware' | 'software' | 'research' | 'breakthrough' | string;
  title: string;
  url: string;
  published_at: string;
  fetched_at: string;
  raw_summary: string;
  audience_tags?: string[];
  image_url?: string;
}

export async function fetchQuantumNews(category?: string, limit: number = 50, forceRefresh: boolean = false): Promise<QuantumNewsArticle[]> {
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
  let query = `?limit=${limit}`;
  if (category && category !== 'all') {
    query += `&category=${encodeURIComponent(category)}`;
  }
  if (forceRefresh) {
    query += `&force_refresh=true`;
  }
  const response = await fetch(`${API_URL}/api/news/quantum${query}`);
  if (!response.ok) {
    throw new Error('Failed to fetch quantum news');
  }
  return response.json();
}

export async function forceSyncQuantumNews(): Promise<{ message: string; stats: any }> {
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
  const response = await fetch(`${API_URL}/api/news/quantum/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    throw new Error('Failed to trigger quantum news sync');
  }
  return response.json();
}
