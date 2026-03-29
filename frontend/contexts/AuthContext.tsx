/**
 * Authentication context for global auth state
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from '../services/auth';

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
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      const isAuth = await authService.isAuthenticated();
      
      if (isAuth && currentUser) {
        // Verify token is still valid by fetching user info
        try {
          const token = await authService.getAccessToken();
          const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001'}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            // Token invalid, clear user
            await authService.logout();
            setUser(null);
          }
        } catch (error) {
          console.error('Error verifying user:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
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
