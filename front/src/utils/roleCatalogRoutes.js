export const CATALOG_ROUTES_BY_ROLE = {
  student: '/catalog/student',
  lecturer: '/catalog/lecturer',
  head_of_lab: '/catalog/head-of-lab',
  lab_assistant: '/catalog/lab-assistant',
};

export const getCatalogRouteForRole = (role, fallback = '/dashboard') => (
  CATALOG_ROUTES_BY_ROLE[role] || fallback
);
