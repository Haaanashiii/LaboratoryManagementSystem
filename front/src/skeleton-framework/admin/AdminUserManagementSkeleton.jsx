import React from 'react';

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

function RolePillSkeleton({ wide = false }) {
  return (
    <Shimmer className={`h-8 rounded-full ${wide ? 'w-28' : 'w-20'}`} />
  );
}

function UserTableRowSkeleton() {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      {/* Avatar + name + email */}
      <td className="py-3 pl-4 pr-2">
        <div className="flex items-center gap-3">
          <Shimmer className="h-9 w-9 flex-shrink-0 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Shimmer className="h-3 w-28" />
            <Shimmer className="h-2.5 w-40" />
          </div>
        </div>
      </td>
      {/* Role badge */}
      <td className="px-2 py-3">
        <Shimmer className="h-5 w-24 rounded-full" />
      </td>
      {/* Status */}
      <td className="px-2 py-3">
        <Shimmer className="h-5 w-16 rounded-full" />
      </td>
      {/* Date joined */}
      <td className="px-2 py-3">
        <Shimmer className="h-3 w-24" />
      </td>
      {/* Actions */}
      <td className="py-3 pr-4 pl-2">
        <div className="flex items-center gap-2">
          <Shimmer className="h-7 w-7 rounded-md" />
          <Shimmer className="h-7 w-7 rounded-md" />
          <Shimmer className="h-7 w-7 rounded-md" />
        </div>
      </td>
    </tr>
  );
}

export default function AdminUserManagementSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Shimmer className="h-6 w-44" />
          <Shimmer className="h-3.5 w-60" />
        </div>
        <Shimmer className="h-9 w-28 rounded-lg" />
      </div>

      {/* Summary stat pills */}
      <div className="flex flex-wrap gap-2">
        {[80, 56, 56, 64, 56, 52].map((w, i) => (
          <Shimmer key={i} className={`h-8 rounded-full`} style={{ width: `${w}px` }} />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar: search + filter + add button */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <Shimmer className="h-9 w-56 rounded-lg" />
          <Shimmer className="h-9 w-36 rounded-lg" />
          <div className="ml-auto">
            <Shimmer className="h-9 w-28 rounded-lg" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['User', 'Role', 'Status', 'Joined', 'Actions'].map((col) => (
                  <th key={col} className="py-3 px-4 text-left">
                    <Shimmer className="h-3 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <UserTableRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <Shimmer className="h-3.5 w-36" />
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
