/**
 * Authentication context for global auth state
 * Optimized for fast startup - loads user data in background
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from '../services/auth';
import { BACKEND_URL } from '../config/api';
import { loadDataInBackground, preloadWithTimeout } from '../utils/startupOptimization';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName: string,
    role: 'patient' | 'doctor' | 'admin',
    extras?: {
      mobile?: string;
      dob?: string;
      gender?: string;
      height_cm?: number;
      weight_kg?: number;
      bmi?: number;
      address?: string;
      pincode?: string;
    }
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('[Auth] Initializing auth context');
    // Hide splash and unblock UI ASAP
    setIsLoading(false);

    // Load user in background (non-blocking)
    loadDataInBackground(() => loadUserFromCache());
  }, []);

  // Fast: Load user from local storage immediately
  const loadUserFromCache = async () => {
    try {
      console.log('[Auth] Loading user from cache');
      const currentUser = await authService.getCurrentUser();
      const isAuth = await authService.isAuthenticated();

      console.log('[Auth] Cache loaded - isAuth:', isAuth, 'user:', currentUser?.email);
      if (isAuth && currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }

      // Verify with backend in background
      loadDataInBackground(() => verifyUserWithBackend());
    } catch (error) {
      console.error('[Auth] Error loading cached user:', error);
      setUser(null);
    }
  };

  // Background: Verify token with backend (non-blocking, with timeout)
  const verifyUserWithBackend = async () => {
    try {
      const isAuth = await authService.isAuthenticated();
      if (!isAuth) return;

      const token = await authService.getAccessToken();
      if (!token) return;

      // Use timeout to prevent hanging on slow networks
      const userData = await preloadWithTimeout(
        () => fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }).then(r => r.ok ? r.json() : null),
        3000 // 3 second timeout
      );

      if (userData) {
        setUser(userData as unknown as User);
      } else if (!userData) {
        // Token might be invalid, but don't logout yet (user is already viewing content)
        console.warn('Token verification failed, but staying logged in');
      }
    } catch (error) {
      console.warn('Background token verification failed:', error);
      // Don't logout on background verification failure
    }
  };

  const login = async (email: string, password: string) => {
    const authData = await authService.login(email, password);
    setUser(authData.user);
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    role: 'patient' | 'doctor' | 'admin',
    extras?: {
      mobile?: string;
      dob?: string;
      gender?: string;
      height_cm?: number;
      weight_kg?: number;
      bmi?: number;
      address?: string;
      pincode?: string;
    }
  ) => {
    const authData = await authService.register(email, password, fullName, role, extras);
    setUser(authData.user);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
