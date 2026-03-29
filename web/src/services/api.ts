/**
 * API client for backend
 */
import { authService } from './auth';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';

export const api = {
  async get(endpoint: string) {
    return authService.authenticatedFetch(`${BACKEND_URL}${endpoint}`);
  },

  async post(endpoint: string, data?: any) {
    return authService.authenticatedFetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  async put(endpoint: string, data?: any) {
    return authService.authenticatedFetch(`${BACKEND_URL}${endpoint}`, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  async delete(endpoint: string) {
    return authService.authenticatedFetch(`${BACKEND_URL}${endpoint}`, {
      method: 'DELETE',
    });
  },
};
