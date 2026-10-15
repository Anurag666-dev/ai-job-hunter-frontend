
// so to communicate with the backend

import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import { jwtDecode } from 'jwt-decode';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:1776/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: attach token + check expiry ─────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');

    if (token) {
      // Check expiry before every request
      try {
        const decoded = jwtDecode<{ session_exp: number }>(token);
        const now = Date.now() / 1000;

        if (decoded.session_exp && decoded.session_exp <= now) {
          // Token expired — logout and redirect
          useAuthStore.getState().logout();
          return Promise.reject(new axios.Cancel('Token expired'));
        }

        config.headers.Authorization = `Bearer ${token}`;
      } catch {
        // Malformed token — logout
        useAuthStore.getState().logout();
        return Promise.reject(new axios.Cancel('Invalid token'));
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: handle 401 globally ────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);