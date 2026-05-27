import React from 'react';

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

function SummaryCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <Shimmer className="h-3.5 w-28" />
        <Shimmer className="h-8 w-8 rounded-lg" />
      </div>
      <Shimmer className="h-9 w-20 rounded-lg" />
      <Shimmer className="h-3 w-32" />
    </div>
  );
}

function ReportTableRowSkeleton() {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-3 pl-4 pr-2">
        <div className="flex items-center gap-3">
          <Shimmer className="h-8 w-8 flex-shrink-0 rounded-lg" />
          <div className="flex flex-col gap-1.5">
            <Shimmer className="h-3 w-36" />
            <Shimmer className="h-2.5 w-24" />
          </div>
        </div>
      </td>
      <td className="px-2 py-3"><Shimmer className="h-3 w-20" /></td>
      <td className="px-2 py-3"><Shimmer className="h-3 w-24" /></td>
      <td className="px-2 py-3"><Shimmer className="h-5 w-16 rounded-full" /></td>
      <td className="py-3 pr-4 pl-2"><Shimmer className="h-3 w-20" /></td>
    </tr>
  );
}

export default function ReportsSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Shimmer className="h-6 w-32" />
          <Shimmer className="h-3.5 w-56" />
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="h-9 w-28 rounded-lg" />
          <Shimmer className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Filters: report type + date range */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1.5">
          <Shimmer className="h-3 w-20" />
          <div className="flex gap-2">
            <Shimmer className="h-9 w-20 rounded-lg" />
            <Shimmer className="h-9 w-24 rounded-lg" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-9 w-36 rounded-lg" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Shimmer className="h-3 w-16" />
          <Shimmer className="h-9 w-36 rounded-lg" />
        </div>
        <Shimmer className="h-9 w-24 rounded-lg self-end" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <SummaryCardSkeleton key={i} />)}
      </div>

      {/* Results table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <Shimmer className="h-4 w-44" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Equipment', 'Borrower', 'Borrow Date', 'Condition', 'Return Date'].map((col) => (
                  <th key={col} className="py-3 px-4 text-left">
                    <Shimmer className="h-3 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <ReportTableRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
