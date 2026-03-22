import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/components/hooks/useAuth.js';

const ADMIN_ACCESS_ROLES = ['lecturer', 'head_of_lab', 'lab_assistant', 'admin'];

export default function AdminRoute() {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();
  const isAllowed = !!user && ADMIN_ACCESS_ROLES.includes(user.role);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-sm">
        Verifying your session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
