import axios from 'axios';
import { getAuth } from 'firebase/auth';
// Assuming firebase app is initialized in firebase.ts and imported/used.
// This is a generic axios wrapper to attach tokens.

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const apiClient = axios.create({
  baseURL: API_URL,
});

// Request interceptor to attach Firebase token if user is logged in
apiClient.interceptors.request.use(
  async (config) => {
    const auth = getAuth();
    try {
      if (typeof auth.authStateReady === 'function') {
        await auth.authStateReady();
      }
    } catch {
      // Fall through if auth state check throws or times out
    }
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
