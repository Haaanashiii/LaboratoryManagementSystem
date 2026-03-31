import React, { useState } from 'react';
import { CheckCircle, History, ClipboardList } from 'lucide-react';
import { useAuth } from '@/components/hooks/useAuth.js';
import EquipmentViewModal from '@/components/equipment/EquipmentViewModal';
import CatalogContent from './CatalogContent';
import CatalogRoleActions from './CatalogRoleActions';
import { useCatalogData } from './useCatalogData';

export default function AssistantCatalog() {
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
      title: 'Equipment prep',
      description: 'Prepare approved items for pickup.',
      href: '/equipment-prep',
      icon: CheckCircle,
      iconClass: 'bg-amber-50 text-amber-700',
    },
    {
      title: 'Returns desk',
      description: 'Confirm returns and record condition.',
      href: '/returns',
      icon: History,
      iconClass: 'bg-slate-100 text-slate-600',
    },
    {
      title: 'All requests',
      description: 'Watch items moving into preparation.',
      href: '/all-requests',
      icon: ClipboardList,
      iconClass: 'bg-indigo-50 text-indigo-600',
    },
  ];

  return (
    <>
      <CatalogContent
        header={{
          eyebrow: 'Equipment Catalog',
          title: 'Lab Assistant Catalog',
          description: 'Prepare equipment and manage returns with clarity.',
          badge: 'Assistant view',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        }}
        actions={(
          <CatalogRoleActions
            title="Operations tools"
            subtitle="Track preparation and returns without leaving the catalog."
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
