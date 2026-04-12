import React from 'react';

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

function EquipmentCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <Shimmer className="h-36 w-full rounded-none" />
      <div className="p-4 flex flex-col gap-2">
        <Shimmer className="h-4 w-3/4" />
        <Shimmer className="h-3 w-1/2" />
        <div className="flex items-center gap-2 mt-1">
          <Shimmer className="h-5 w-16 rounded-full" />
          <Shimmer className="h-5 w-14 rounded-full" />
        </div>
        <Shimmer className="h-8 w-full rounded-lg mt-1" />
      </div>
    </div>
  );
}

export default function StudentCatalogSkeleton() {
  return (
    <div className="w-full space-y-4 px-2 py-3">
      {/* Search + Filter Bar */}
      <div className="flex gap-2">
        <Shimmer className="h-10 flex-1 rounded-xl" />
        <Shimmer className="h-10 w-10 rounded-xl flex-shrink-0" />
      </div>

      {/* Category Filter Chips */}
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Shimmer key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <Shimmer className="h-3.5 w-32" />
        <Shimmer className="h-3.5 w-20" />
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <EquipmentCardSkeleton key={i} />)}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <Shimmer className="h-8 w-8 rounded-lg" />
        {[1, 2, 3].map((i) => <Shimmer key={i} className="h-8 w-8 rounded-lg" />)}
        <Shimmer className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  );
}
