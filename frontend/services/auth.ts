/**
 * Authentication service
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config/api';

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

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';

export const authService = {
  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    fullName: string,
    role: 'patient' | 'doctor' | 'admin',
    extras?: {
      mobile?: string;
      dob?: string;           // YYYY-MM-DD
      gender?: string;
      height_cm?: number;
      weight_kg?: number;
      bmi?: number;
      address?: string;
      pincode?: string;
    }
  ): Promise<AuthResponse> {
    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        role,
        ...(extras?.mobile ? { mobile: extras.mobile } : {}),
        ...(extras?.dob ? { dob: extras.dob } : {}),
        ...(extras?.gender ? { gender: extras.gender } : {}),
        ...(typeof extras?.height_cm === 'number' ? { height_cm: extras.height_cm } : {}),
        ...(typeof extras?.weight_kg === 'number' ? { weight_kg: extras.weight_kg } : {}),
        ...(typeof extras?.bmi === 'number' ? { bmi: extras.bmi } : {}),
        ...(extras?.address ? { address: extras.address } : {}),
        ...(extras?.pincode ? { pincode: extras.pincode } : {}),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    const data: AuthResponse = await response.json();
    await this.saveTokens(data);
    return data;
  },

  /**
   * Login with email and password
   */
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
    await this.saveTokens(data);
    return data;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const token = await this.getAccessToken();
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
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
    }
  },

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },

  /**
   * Get access token
   */
  async getAccessToken(): Promise<string | null> {
    return await AsyncStorage.getItem(TOKEN_KEY);
  },

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
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
        await this.logout();
        return null;
      }

      const data = await response.json();
      await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
      return data.access_token;
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.logout();
      return null;
    }
  },

  /**
   * Save tokens and user data
   */
  async saveTokens(authData: AuthResponse): Promise<void> {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, authData.access_token],
      [REFRESH_TOKEN_KEY, authData.refresh_token],
      [USER_KEY, JSON.stringify(authData.user)],
    ]);
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  },

  /**
   * Make authenticated API request
   */
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAccessToken();
    
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // If token expired, try to refresh
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
