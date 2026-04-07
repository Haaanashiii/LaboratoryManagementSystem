import React, { useState } from 'react';
import { CheckCircle, History, Package } from 'lucide-react';
import { useAuth } from '@/components/hooks/useAuth.js';
import EquipmentViewModal from '@/components/equipment/EquipmentViewModal';
import CatalogContent from './CatalogContent';
import CatalogRoleActions from './CatalogRoleActions';
import { useCatalogData } from './useCatalogData';

export default function HeadCatalog() {
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
  } = useCatalogData();

  const actions = [
    {
      title: 'Final approvals',
      description: 'Handle requests waiting for final sign-off.',
      href: '/head-approvals',
      icon: CheckCircle,
      iconClass: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'Inventory overview',
      description: 'Track stock levels and equipment readiness.',
      href: '/inventory',
      icon: Package,
      iconClass: 'bg-slate-100 text-slate-600',
    },
    {
      title: 'Approval history',
      description: 'Review outcomes across the lab pipeline.',
      href: '/head-approval-history',
      icon: History,
      iconClass: 'bg-indigo-50 text-indigo-600',
    },
  ];

  return (
    <>
      <CatalogContent
        header={{
          eyebrow: 'Equipment Catalog',
          title: 'Lab Head Catalog',
          description: 'Oversee availability and final approvals in one view.',
          badge: 'Head of lab view',
          badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        }}
        actions={(
          <CatalogRoleActions
            title="Leadership tools"
            subtitle="Monitor approvals and stock readiness before each release."
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
