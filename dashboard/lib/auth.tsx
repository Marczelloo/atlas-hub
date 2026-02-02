'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, inviteKey: string) => Promise<void>;
  setup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Check if we're in demo mode by looking at URL params
function checkDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const demoParam = params.get('demo');
  return demoParam === 'true' || demoParam === '1';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    // Skip auth check in demo mode
    if (checkDemoMode()) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${GATEWAY_URL}/auth/me`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${GATEWAY_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(error.message || 'Login failed');
    }

    const data = await res.json();
    setUser(data.data.user);
  };

  const register = async (email: string, password: string, inviteKey: string) => {
    const res = await fetch(`${GATEWAY_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, inviteKey }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Registration failed' }));
      throw new Error(error.message || 'Registration failed');
    }

    const data = await res.json();
    setUser(data.data.user);
  };

  const setup = async (email: string, password: string) => {
    const res = await fetch(`${GATEWAY_URL}/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Setup failed' }));
      throw new Error(error.message || 'Setup failed');
    }

    const data = await res.json();
    setUser(data.data.user);
  };

  const logout = async () => {
    await fetch(`${GATEWAY_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        login,
        register,
        setup,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
