import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/components/hooks/useAuth.js';

const ADMIN_ACCESS_ROLES = ['lecturer', 'head_of_lab', 'lab_assistant', 'admin'];

export default function AdminRoute() {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();
  const isAllowed = !!user && ADMIN_ACCESS_ROLES.includes(user.role);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
        <div className="h-16 w-16 animate-spin rounded-full border-[6px] border-blue-900 border-t-blue-500" />
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
