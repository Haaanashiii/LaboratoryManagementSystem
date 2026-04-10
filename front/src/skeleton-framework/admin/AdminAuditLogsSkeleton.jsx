import React from 'react';

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

function AuditTableRowSkeleton() {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      {/* Timestamp */}
      <td className="py-3 pl-4 pr-2">
        <div className="flex flex-col gap-1.5">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-2.5 w-14" />
        </div>
      </td>
      {/* User */}
      <td className="px-2 py-3">
        <div className="flex items-center gap-2">
          <Shimmer className="h-7 w-7 flex-shrink-0 rounded-full" />
          <div className="flex flex-col gap-1">
            <Shimmer className="h-3 w-28" />
            <Shimmer className="h-2.5 w-36" />
          </div>
        </div>
      </td>
      {/* Action badge */}
      <td className="px-2 py-3">
        <Shimmer className="h-5 w-28 rounded-full" />
      </td>
      {/* IP address */}
      <td className="py-3 pr-4 pl-2">
        <Shimmer className="h-3 w-24" />
      </td>
    </tr>
  );
}

export default function AdminAuditLogsSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Shimmer className="h-6 w-36" />
          <Shimmer className="h-3.5 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="h-9 w-24 rounded-lg" />
          <Shimmer className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Action filter pills */}
      <div className="flex flex-wrap gap-2">
        {[72, 88, 80, 96, 64, 72, 100].map((w, i) => (
          <Shimmer key={i} className="h-8 rounded-full" style={{ width: `${w}px` }} />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar: search + date range */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <Shimmer className="h-9 w-52 rounded-lg" />
          <Shimmer className="h-9 w-36 rounded-lg" />
          <Shimmer className="h-9 w-36 rounded-lg" />
          <Shimmer className="h-9 w-20 rounded-lg" />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Timestamp', 'User', 'Action', 'IP Address'].map((col) => (
                  <th key={col} className="py-3 px-4 text-left">
                    <Shimmer className="h-3 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 15 }).map((_, i) => (
                <AuditTableRowSkeleton key={i} />
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
