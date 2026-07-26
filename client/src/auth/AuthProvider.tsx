import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { ApiError, apiRequest } from '../lib/apiClient';

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  /** True until the first GET /api/auth/me finishes. */
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  register: (input: { name: string; email: string; password: string }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Holds the current user for the whole application.
 *
 * The session itself lives in an HTTP-only cookie the browser attaches
 * automatically, so restoring a session on page load simply means asking the
 * server "who am I?" once.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    apiRequest<{ user: User }>('/auth/me')
      .then((data) => {
        if (active) setUser(data.user ?? null);
      })
      .catch(() => {
        // No valid session. Staying logged out is the expected outcome here.
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const submit = useCallback(async (path: string, body: unknown) => {
    setError(null);

    try {
      const data = await apiRequest<{ user: User }>(path, { method: 'POST', body });
      setUser(data.user);
    } catch (caught) {
      const message =
        caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.';
      setError(message);
      throw caught;
    }
  }, []);

  const register = useCallback(
    (input: { name: string; email: string; password: string }) =>
      submit('/auth/register', input),
    [submit],
  );

  const login = useCallback(
    (input: { email: string; password: string }) => submit('/auth/login', input),
    [submit],
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      // Even a failed request must not leave a stale user on screen.
      setUser(null);
      setError(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      error,
      register,
      login,
      logout,
    }),
    [user, isLoading, error, register, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }

  return context;
}
