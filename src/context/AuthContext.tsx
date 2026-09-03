import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, getStoredToken, setStoredToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  dbConnected: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { name: string; email: string; password: string; confirmPassword: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await api.auth.me();
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        if (res.data.token) {
          setStoredToken(res.data.token);
        }
        if (res.data.databaseConnected !== undefined) {
          setDbConnected(res.data.databaseConnected);
        }
      } else {
        // If /me fails and we don't have a valid session, clean up
        if (!res.success && res.error?.code === 'UNAUTHORIZED') {
          setStoredToken(null);
        }
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
    // Also ping system status once
    api.system.status().then((res) => {
      if (res.success && res.data?.database) {
        setDbConnected(res.data.database.connected);
      }
    }).catch(() => {
      setDbConnected(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    if (res.success && res.data?.user) {
      if (res.data.token) {
        setStoredToken(res.data.token);
      }
      setUser(res.data.user);
      setDbConnected(true);
      return { success: true };
    }
    return {
      success: false,
      error: res.error?.message || 'Login failed. Please check your credentials.',
    };
  };

  const register = async (data: { name: string; email: string; password: string; confirmPassword: string }) => {
    const res = await api.auth.register(data);
    if (res.success && res.data?.user) {
      if (res.data.token) {
        setStoredToken(res.data.token);
      }
      setUser(res.data.user);
      setDbConnected(true);
      return { success: true };
    }
    return {
      success: false,
      error: res.error?.message || 'Registration failed.',
    };
  };

  const logout = async () => {
    setStoredToken(null);
    try {
      await api.auth.logout();
    } catch {
      // ignore
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        dbConnected,
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
