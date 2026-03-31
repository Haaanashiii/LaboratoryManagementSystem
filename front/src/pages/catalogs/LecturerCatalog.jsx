import React, { useState } from 'react';
import { CheckSquare, History, BarChart3 } from 'lucide-react';
import { useAuth } from '@/components/hooks/useAuth.js';
import EquipmentViewModal from '@/components/equipment/EquipmentViewModal';
import CatalogContent from './CatalogContent';
import CatalogRoleActions from './CatalogRoleActions';
import { useCatalogData } from './useCatalogData';

export default function LecturerCatalog() {
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
      title: 'Pending approvals',
      description: 'Review new requests waiting for your decision.',
      href: '/lecturer-approvals',
      icon: CheckSquare,
      iconClass: 'bg-blue-500/10 text-blue-200 border border-blue-500/30',
    },
    {
      title: 'Approval history',
      description: 'Track past approvals and remarks.',
      href: '/approval-history',
      icon: History,
      iconClass: 'bg-slate-500/10 text-slate-200 border border-slate-500/30',
    },
    {
      title: 'All requests',
      description: 'Scan request trends across your classes.',
      href: '/all-approval-history',
      icon: BarChart3,
      iconClass: 'bg-indigo-500/10 text-indigo-200 border border-indigo-500/30',
    },
  ];

  return (
    <>
      <CatalogContent
        header={{
          eyebrow: 'Lecturer operations',
          title: 'Session Readiness Catalog',
          description: 'Track availability, validate quantities, and keep class requests on schedule.',
          badge: 'Lecturer view',
          badgeClass: 'bg-blue-500/10 text-blue-200 border-blue-500/30',
        }}
        actions={(
          <CatalogRoleActions
            title="Approval tools"
            subtitle="Stay ahead of class requests and approvals in one hub."
            actions={actions}
            variant="lecturer"
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
        variant="lecturer"
      />

      <EquipmentViewModal
        equipment={viewedEquipment}
        open={!!viewedEquipment}
        onClose={() => setViewedEquipment(null)}
      />
    </>
  );
}
