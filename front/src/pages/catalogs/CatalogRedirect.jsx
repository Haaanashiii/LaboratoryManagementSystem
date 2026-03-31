import { Navigate } from 'react-router-dom';
import BanterLoader from '@/components/ui/BanterLoader';
import { useAuth } from '@/components/hooks/useAuth.js';
import { getCatalogRouteForRole } from '@/utils/roleCatalogRoutes';

export default function CatalogRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <BanterLoader />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getCatalogRouteForRole(user?.role)} replace />;
}
