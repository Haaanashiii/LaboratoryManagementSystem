import React from 'react';

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

function InventoryTableRowSkeleton() {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      {/* Image + name + ID */}
      <td className="py-3 pl-4 pr-2">
        <div className="flex items-center gap-3">
          <Shimmer className="h-10 w-10 flex-shrink-0 rounded-xl" />
          <div className="flex flex-col gap-1.5">
            <Shimmer className="h-3 w-36" />
            <Shimmer className="h-2.5 w-20" />
          </div>
        </div>
      </td>
      {/* Category */}
      <td className="px-2 py-3">
        <Shimmer className="h-5 w-24 rounded-full" />
      </td>
      {/* Quantity */}
      <td className="px-2 py-3">
        <Shimmer className="h-3 w-10" />
      </td>
      {/* Condition */}
      <td className="px-2 py-3">
        <Shimmer className="h-5 w-16 rounded-full" />
      </td>
      {/* Last updated */}
      <td className="px-2 py-3">
        <Shimmer className="h-3 w-24" />
      </td>
      {/* Actions */}
      <td className="py-3 pr-4 pl-2">
        <div className="flex items-center gap-2">
          <Shimmer className="h-7 w-7 rounded-md" />
          <Shimmer className="h-7 w-7 rounded-md" />
        </div>
      </td>
    </tr>
  );
}

export default function InventorySkeleton() {
  return (
    <div className="flex flex-col gap-5 p-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Shimmer className="h-6 w-36" />
          <Shimmer className="h-3.5 w-56" />
        </div>
        <Shimmer className="h-9 w-36 rounded-lg" />
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        {[80, 80, 88, 88, 72, 64, 56, 72].map((w, i) => (
          <Shimmer key={i} className="h-8 rounded-full" style={{ width: `${w}px` }} />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <Shimmer className="h-9 w-56 rounded-lg" />
          <div className="ml-auto flex items-center gap-2">
            <Shimmer className="h-3.5 w-32" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Equipment', 'Category', 'Qty', 'Condition', 'Last Updated', 'Actions'].map((col) => (
                  <th key={col} className="py-3 px-4 text-left">
                    <Shimmer className="h-3 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <InventoryTableRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <Shimmer className="h-3.5 w-44" />
          <div className="flex items-center gap-2">
            <Shimmer className="h-8 w-8 rounded-lg" />
            {[1, 2, 3].map((i) => (
              <Shimmer key={i} className="h-8 w-8 rounded-lg" />
            ))}
            <Shimmer className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
