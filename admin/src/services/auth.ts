/**
 * Authentication service for web dashboard
 */
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'patient' | 'doctor' | 'admin';
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data: AuthResponse = await response.json();
    this.saveTokens(data);
    return data;
  },

  async logout(): Promise<void> {
    try {
      const token = this.getAccessToken();
      if (token) {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  },

  getCurrentUser(): User | null {
    try {
      const userData = localStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },

  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        return null;
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        this.logout();
        return null;
      }

      const data = await response.json();
      localStorage.setItem(TOKEN_KEY, data.access_token);
      return data.access_token;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logout();
      return null;
    }
  },

  saveTokens(authData: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, authData.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, authData.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(authData.user));
  },

  async isAuthenticated(): Promise<boolean> {
    const token = this.getAccessToken();
    return !!token;
  },

  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getAccessToken();
    
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    let response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      const newToken = await this.refreshToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, {
          ...options,
          headers,
        });
      } else {
        throw new Error('Authentication required');
      }
    }

    return response;
  },
};
