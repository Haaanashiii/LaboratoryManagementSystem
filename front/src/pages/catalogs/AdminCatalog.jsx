import React, { useState } from 'react';
import { BarChart3, ClipboardList, Package, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '@/components/hooks/useAuth.js';
import EquipmentViewModal from '@/components/equipment/EquipmentViewModal';
import CatalogContent from './CatalogContent';
import CatalogRoleActions from './CatalogRoleActions';
import { useCatalogData } from './useCatalogData';

export default function AdminCatalog() {
  const { user } = useAuth();
  const [viewedEquipment, setViewedEquipment] = useState(null);
  const {
    search,
    setSearch,
    groupByCategory,
    setGroupByCategory,
    filteredEquipment,
    groupedEquipment,
    groupedCategories,
    isLoading,
    isError,
    error,
  } = useCatalogData({ includeInactive: true });

  const actions = [
    {
      title: 'Inventory management',
      description: 'Create, edit, or retire equipment records.',
      href: '/inventory',
      icon: Package,
      iconClass: 'bg-red-50 text-red-600',
    },
    {
      title: 'User management',
      description: 'Assign roles and control access.',
      href: '/users',
      icon: Users,
      iconClass: 'bg-slate-100 text-slate-600',
    },
    {
      title: 'Audit logs',
      description: 'Review activity across the system.',
      href: '/admin-audit-logs',
      icon: ShieldCheck,
      iconClass: 'bg-amber-50 text-amber-700',
    },
    {
      title: 'All requests',
      description: 'Monitor the full request pipeline.',
      href: '/all-requests',
      icon: BarChart3,
      iconClass: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Operations history',
      description: 'Follow request outcomes and status shifts.',
      href: '/all-approval-history',
      icon: ClipboardList,
      iconClass: 'bg-blue-50 text-blue-600',
    },
  ];

  return (
    <>
      <CatalogContent
        header={{
          eyebrow: 'Equipment Catalog',
          title: 'Admin Catalog',
          description: 'Full inventory visibility, including inactive items.',
          badge: 'Admin view',
          badgeClass: 'bg-red-50 text-red-700 border-red-200',
        }}
        actions={(
          <CatalogRoleActions
            title="System controls"
            subtitle="Jump straight into management tools and oversight views."
            actions={actions}
          />
        )}
        search={search}
        onSearchChange={setSearch}
        groupByCategory={groupByCategory}
        onToggleGroupBy={() => setGroupByCategory((prev) => !prev)}
        filteredEquipment={filteredEquipment}
        groupedEquipment={groupedEquipment}
        groupedCategories={groupedCategories}
        isLoading={isLoading}
        isError={isError}
        error={error}
        userRole={user?.role}
        onSelect={setViewedEquipment}
      />

      <EquipmentViewModal
        equipment={viewedEquipment}
        open={!!viewedEquipment}
        onClose={() => setViewedEquipment(null)}
      />
    </>
  );
}
