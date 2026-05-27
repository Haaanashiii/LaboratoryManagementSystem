import React from 'react';

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

function TableRowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3"><Shimmer className="h-4 w-36" /></td>
      <td className="px-4 py-3"><Shimmer className="h-4 w-20" /></td>
      <td className="px-4 py-3"><Shimmer className="h-5 w-20 rounded-full" /></td>
      <td className="px-4 py-3"><Shimmer className="h-4 w-24" /></td>
      <td className="px-4 py-3"><Shimmer className="h-4 w-24" /></td>
      <td className="px-4 py-3"><Shimmer className="h-8 w-20 rounded-lg" /></td>
    </tr>
  );
}

export default function AssistantReturnsSkeleton() {
  return (
    <div className="w-full space-y-4 px-2 py-3">
      {/* Card Header */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Shimmer className="h-8 w-8 rounded-xl flex-shrink-0" />
            <div className="flex flex-col gap-1.5">
              <Shimmer className="h-4 w-36" />
              <Shimmer className="h-3 w-48" />
            </div>
          </div>
          {/* Search */}
          <Shimmer className="h-8 w-48 rounded-lg" />
        </div>

        {/* Section Tabs */}
        <div className="flex gap-2 px-4 py-3 border-b border-slate-100">
          {[1, 2, 3].map((i) => <Shimmer key={i} className="h-7 w-24 rounded-lg" />)}
        </div>

        {/* Table */}
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Borrower', 'Equipment', 'Status', 'Due Date', 'Borrowed', 'Action'].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <Shimmer className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6].map((i) => <TableRowSkeleton key={i} />)}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <Shimmer className="h-3.5 w-32" />
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => <Shimmer key={i} className="h-7 w-7 rounded-lg" />)}
          </div>
        </div>
      </div>
    </div>
  );
}
