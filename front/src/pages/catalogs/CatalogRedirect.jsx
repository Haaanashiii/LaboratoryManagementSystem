import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/hooks/useAuth.js';
import { getCatalogRouteForRole } from '@/utils/roleCatalogRoutes';

export default function CatalogRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getCatalogRouteForRole(user?.role)} replace />;
}
