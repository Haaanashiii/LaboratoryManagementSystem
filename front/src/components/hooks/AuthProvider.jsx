import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, clearStoredAuth, getStoredToken, getStoredUser, isTokenExpired } from '@/api/apiClient';
import { AuthContext } from './authContext';

const PUBLIC_PATHS = new Set(['/', '/login', '/maintenance', '/admin-login', '/secure-admin-portal-9f3Xk']);

const isPublicPath = (pathname) => PUBLIC_PATHS.has(pathname);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const token = getStoredToken();

    if (!token || isTokenExpired(token)) {
      clearStoredAuth();
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return null;
    }

    try {
      const currentUser = await api.auth.me();
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      return currentUser;
    } catch (err) {
      if (err?.status === 401) {
        // Server explicitly rejected the session — clear everything and force re-login.
        clearStoredAuth();
        setUser(null);
        setIsAuthenticated(false);
      } else {
        // Network error, 429, 500, etc. — don't wipe the token; fall back to cached user data
        // so the user isn't logged out just because the backend was momentarily unreachable.
        const raw = getStoredUser();
        if (raw) {
          try {
            const cached = JSON.parse(raw);
            setUser(cached);
            setIsAuthenticated(true);
          } catch {
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // Clear client state even if backend logout fails.
    }

    clearStoredAuth();
    setUser(null);
    setIsAuthenticated(false);
    // ProtectedRoute will redirect to /login via React Router — no page reload needed.
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const handlePageShow = (event) => {
      if (!event.persisted) {
        return;
      }

      const token = getStoredToken();
      const hasValidToken = !!token && !isTokenExpired(token);

      if (!hasValidToken) {
        clearStoredAuth();
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);

        if (!isPublicPath(window.location.pathname)) {
          window.location.replace('/login');
        }
        return;
      }

      setIsLoading(true);
      refreshSession();
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [refreshSession]);

  const value = useMemo(() => ({
    user,
    isAuthenticated,
    isLoading,
    refreshSession,
    logout,
  }), [user, isAuthenticated, isLoading, refreshSession, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
