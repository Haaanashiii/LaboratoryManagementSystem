import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';

export const useCatalogData = ({ includeInactive = false } = {}) => {
  const [search, setSearch] = useState('');
  const [groupByCategory, setGroupByCategory] = useState(true);

  const { data: equipment = [], isLoading, isError, error } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.entities.Equipment.list(),
  });

  const normalizedSearch = search.trim().toLowerCase();

  const filteredEquipment = useMemo(() => (
    equipment.filter((item) => {
      const name = (item.name || '').toLowerCase();
      const description = (item.description || '').toLowerCase();
      const matchesSearch = !normalizedSearch
        || name.includes(normalizedSearch)
        || description.includes(normalizedSearch);
      const isActive = includeInactive ? true : item.is_active !== false;
      const isPublished = item.isPublished !== false;
      return matchesSearch && isActive && isPublished;
    })
  ), [equipment, includeInactive, normalizedSearch]);

  const groupedEquipment = useMemo(() => (
    filteredEquipment.reduce((acc, item) => {
      const key = item.category || 'Other';
      const currentGroup = acc[key] || [];
      return {
        ...acc,
        [key]: [...currentGroup, item],
      };
    }, {})
  ), [filteredEquipment]);

  const groupedCategories = useMemo(() => (
    Object.keys(groupedEquipment).sort((a, b) => a.localeCompare(b))
  ), [groupedEquipment]);

  return {
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
  };
};
