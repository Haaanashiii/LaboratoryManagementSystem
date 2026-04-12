import React from 'react';

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

function TableRowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3"><Shimmer className="h-4 w-36" /></td>
      <td className="px-4 py-3"><Shimmer className="h-4 w-24" /></td>
      <td className="px-4 py-3"><Shimmer className="h-5 w-20 rounded-full" /></td>
      <td className="px-4 py-3"><Shimmer className="h-4 w-20" /></td>
      <td className="px-4 py-3"><Shimmer className="h-4 w-20" /></td>
      <td className="px-4 py-3"><Shimmer className="h-8 w-8 rounded-lg" /></td>
    </tr>
  );
}

export default function StudentApprovalHistorySkeleton() {
  return (
    <div className="w-full space-y-4 px-2 py-3">
      {/* Hero Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <Shimmer className="h-12 w-12 rounded-xl flex-shrink-0" />
          <div className="flex flex-col gap-2">
            <Shimmer className="h-4 w-44" />
            <Shimmer className="h-3 w-60" />
          </div>
        </div>
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Shimmer className="h-6 w-8 rounded" />
              <Shimmer className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4].map((i) => (
          <Shimmer key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>

      {/* Search + Date filter */}
      <div className="flex gap-2">
        <Shimmer className="h-9 flex-1 rounded-xl" />
        <Shimmer className="h-9 w-36 rounded-xl" />
        <Shimmer className="h-9 w-36 rounded-xl" />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Equipment', 'Quantity', 'Status', 'Borrow Date', 'Return Date', ''].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <Shimmer className="h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => <TableRowSkeleton key={i} />)}
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
