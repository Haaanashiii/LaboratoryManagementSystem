import React from 'react';

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

function RequestTableRowSkeleton() {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      {/* Equipment */}
      <td className="py-3 pl-4 pr-2">
        <div className="flex items-center gap-3">
          <Shimmer className="h-9 w-9 flex-shrink-0 rounded-xl" />
          <div className="flex flex-col gap-1.5">
            <Shimmer className="h-3 w-32" />
            <Shimmer className="h-2.5 w-20" />
          </div>
        </div>
      </td>
      {/* Borrower */}
      <td className="px-2 py-3">
        <div className="flex flex-col gap-1.5">
          <Shimmer className="h-3 w-28" />
          <Shimmer className="h-2.5 w-36" />
        </div>
      </td>
      {/* Status badge */}
      <td className="px-2 py-3">
        <Shimmer className="h-5 w-28 rounded-full" />
      </td>
      {/* Borrow date */}
      <td className="px-2 py-3">
        <Shimmer className="h-3 w-24" />
      </td>
      {/* Return date */}
      <td className="px-2 py-3">
        <Shimmer className="h-3 w-24" />
      </td>
      {/* Actions */}
      <td className="py-3 pr-4 pl-2">
        <Shimmer className="h-7 w-16 rounded-md" />
      </td>
    </tr>
  );
}

export default function AllRequestsSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Shimmer className="h-6 w-36" />
          <Shimmer className="h-3.5 w-64" />
        </div>
        <Shimmer className="h-9 w-28 rounded-lg" />
      </div>

      {/* Status filter pills with counts */}
      <div className="flex flex-wrap gap-2">
        {[64, 88, 88, 80, 80].map((w, i) => (
          <Shimmer key={i} className="h-8 rounded-full" style={{ width: `${w}px` }} />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <Shimmer className="h-9 w-56 rounded-lg" />
          <div className="ml-auto flex items-center gap-2">
            <Shimmer className="h-3.5 w-44" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Equipment', 'Borrower', 'Status', 'Borrow Date', 'Return Date', 'Actions'].map((col) => (
                  <th key={col} className="py-3 px-4 text-left">
                    <Shimmer className="h-3 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <RequestTableRowSkeleton key={i} />
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
