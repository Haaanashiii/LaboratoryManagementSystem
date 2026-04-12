import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/hooks/useAuth.js';
import { getCatalogRouteForRole } from '@/utils/roleCatalogRoutes';

export default function RoleRoute({ allowedRoles }) {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const isAllowed = Array.isArray(allowedRoles) && allowedRoles.includes(user?.role);

  if (!isAllowed) {
    return <Navigate to={getCatalogRouteForRole(user?.role)} replace />;
  }

  return <Outlet />;
}
