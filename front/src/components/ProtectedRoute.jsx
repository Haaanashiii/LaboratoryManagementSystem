import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { clearStoredAuth, getStoredToken, isTokenExpired } from '@/api/apiClient';

export default function ProtectedRoute() {
  const location = useLocation();
  const token = getStoredToken();
  const hasValidToken = !!token && !isTokenExpired(token);
  const storedUser = localStorage.getItem('currentUser');

  let hasStoredUser = false;
  if (storedUser) {
    try {
      const parsedUser = JSON.parse(storedUser);
      hasStoredUser = !!parsedUser && typeof parsedUser === 'object';
    } catch {
      hasStoredUser = false;
    }
  }

  const hasValidSession = hasValidToken && hasStoredUser;

  useEffect(() => {
    if (!hasValidSession) {
      clearStoredAuth();
    }
  }, [hasValidSession]);

  // Block protected content when token/user session is missing or invalid.
  if (!hasValidSession) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
