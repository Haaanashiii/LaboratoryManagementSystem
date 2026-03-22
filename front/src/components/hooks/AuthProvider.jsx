import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, clearStoredAuth, getStoredToken, isTokenExpired } from '@/api/apiClient';
import { AuthContext } from './authContext';

const PUBLIC_PATHS = new Set(['/', '/login', '/admin-login']);

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
    } catch {
      clearStoredAuth();
      setUser(null);
      setIsAuthenticated(false);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await api.auth.logout();
    } catch {
      // Client auth state should still be cleared if backend logout fails.
    }

    clearStoredAuth();
    setUser(null);
    setIsAuthenticated(false);

    // Full reload prevents bfcache/history from exposing stale protected UI.
    window.location.replace('/login');
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
