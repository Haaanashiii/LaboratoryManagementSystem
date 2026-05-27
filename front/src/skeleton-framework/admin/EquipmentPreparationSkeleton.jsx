import React from 'react';

const Shimmer = ({ className = '', style }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} style={style} />
);

function PrepTableRowSkeleton() {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      {/* Equipment */}
      <td className="py-3 pl-4 pr-2">
        <Shimmer className="h-3 w-36" />
      </td>
      {/* Borrower */}
      <td className="px-2 py-3">
        <Shimmer className="h-3 w-24" />
      </td>
      {/* Qty */}
      <td className="px-2 py-3">
        <Shimmer className="h-3 w-8" />
      </td>
      {/* Borrow Date */}
      <td className="px-2 py-3">
        <Shimmer className="h-3 w-24" />
      </td>
      {/* Status badge */}
      <td className="px-2 py-3">
        <Shimmer className="h-5 w-28 rounded-full" />
      </td>
      {/* Action button */}
      <td className="py-3 pr-4 pl-2 text-right">
        <div className="flex justify-end">
          <Shimmer className="h-7 w-24 rounded-md" />
        </div>
      </td>
    </tr>
  );
}

export default function EquipmentPreparationSkeleton() {
  return (
    <div className="w-full space-y-4 px-2 py-2">

      {/* Hero Banner */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <Shimmer className="h-12 w-12 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Shimmer className="h-2.5 w-40" />
            <Shimmer className="h-5 w-52" />
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3">
            <Shimmer className="h-9 w-9 rounded-lg" />
            <div className="flex flex-col gap-1.5">
              <Shimmer className="h-2.5 w-20" />
              <Shimmer className="h-5 w-8" />
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-none">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Shimmer className="h-3 w-28" />
            <Shimmer className="h-5 w-8 rounded-full" />
          </div>
          <Shimmer className="h-8 w-56 rounded-lg" />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {['Equipment', 'Borrower', 'Qty', 'Borrow Date', 'Status', ''].map((col, i) => (
                  <th key={i} className="px-4 py-3 text-left">
                    <Shimmer className="h-3 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <PrepTableRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
