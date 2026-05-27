export const CATALOG_ROUTES_BY_ROLE = {
  student: '/catalog/student',
  lecturer: '/inventory',
  head_of_lab: '/inventory',
  lab_assistant: '/inventory',
};

export const getCatalogRouteForRole = (role, fallback = '/dashboard') => (
  CATALOG_ROUTES_BY_ROLE[role] || fallback
);
