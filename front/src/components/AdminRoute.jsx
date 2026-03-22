import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { getStoredToken, isTokenExpired } from '@/api/apiClient';

const ADMIN_ACCESS_ROLES = ['lecturer', 'head_of_lab', 'lab_assistant', 'admin'];

export default function AdminRoute() {
  const location = useLocation();
  const token = getStoredToken();
  const hasValidToken = !!token && !isTokenExpired(token);

  if (!hasValidToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const stored = localStorage.getItem('currentUser');
  let user = null;

  try {
    user = stored ? JSON.parse(stored) : null;
  } catch {
    user = null;
  }

  // Keep admin-facing routes inaccessible for student accounts.
  if (!user || !ADMIN_ACCESS_ROLES.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
