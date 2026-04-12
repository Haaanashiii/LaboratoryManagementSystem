import React from 'react';

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Shimmer className="h-3.5 w-28" />
          <Shimmer className="h-8 w-16 rounded-lg" />
        </div>
        <Shimmer className="h-10 w-10 rounded-xl flex-shrink-0" />
      </div>
      <Shimmer className="h-3 w-36" />
    </div>
  );
}

function AreaChartSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Shimmer className="h-4 w-44" />
          <Shimmer className="h-3 w-60" />
        </div>
        <Shimmer className="h-8 w-28 rounded-lg" />
      </div>
      {/* Legend */}
      <div className="mb-4 flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Shimmer className="h-2 w-2 rounded-full" />
            <Shimmer className="h-3 w-14" />
          </div>
        ))}
      </div>
      {/* Chart Body */}
      <div className="relative h-48 w-full overflow-hidden rounded-xl bg-slate-100">
        <div className="animate-pulse h-full w-full bg-gradient-to-b from-slate-200 via-slate-100 to-slate-50 rounded-xl" />
        <div className="absolute inset-y-0 left-0 flex flex-col justify-between py-2 pl-1">
          {[1, 2, 3, 4].map((i) => <Shimmer key={i} className="h-2.5 w-6" />)}
        </div>
      </div>
      {/* X-axis */}
      <div className="mt-2 flex justify-between px-2">
        {[1, 2, 3, 4, 5, 6].map((i) => <Shimmer key={i} className="h-2.5 w-8" />)}
      </div>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3"><Shimmer className="h-4 w-36" /></td>
      <td className="px-4 py-3"><Shimmer className="h-4 w-20" /></td>
      <td className="px-4 py-3"><Shimmer className="h-5 w-24 rounded-full" /></td>
      <td className="px-4 py-3"><Shimmer className="h-4 w-24" /></td>
    </tr>
  );
}

export default function LecturerDashboardSkeleton() {
  return (
    <div className="w-full space-y-5 px-2 py-3">
      {/* Hero Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <Shimmer className="h-12 w-12 rounded-xl flex-shrink-0" />
          <div className="flex flex-col gap-2">
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-5 w-52" />
            <Shimmer className="h-3 w-36" />
          </div>
        </div>
        <Shimmer className="h-9 w-28 rounded-lg" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
      </div>

      {/* Activity Chart */}
      <AreaChartSkeleton />

      {/* Recent Requests Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex flex-col gap-2">
            <Shimmer className="h-4 w-40" />
            <Shimmer className="h-3 w-56" />
          </div>
          <Shimmer className="h-8 w-24 rounded-lg" />
        </div>
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              {[1, 2, 3, 4].map((i) => (
                <th key={i} className="px-4 py-3"><Shimmer className="h-3 w-20" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => <TableRowSkeleton key={i} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
