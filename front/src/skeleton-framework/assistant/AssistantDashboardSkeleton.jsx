import React from 'react';

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

function StatCardSkeleton() {
  return (
    <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

function ActivityRowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3"><Shimmer className="h-4 w-36" /></td>
      <td className="px-4 py-3"><Shimmer className="h-5 w-28 rounded-full" /></td>
      <td className="px-4 py-3"><Shimmer className="h-4 w-20" /></td>
      <td className="px-4 py-3"><Shimmer className="h-4 w-24" /></td>
      <td className="px-4 py-3"><Shimmer className="h-8 w-8 rounded-lg" /></td>
    </tr>
  );
}

export default function AssistantDashboardSkeleton() {
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
        <div className="flex gap-2">
          <Shimmer className="h-9 w-28 rounded-lg" />
          <Shimmer className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-3">
            <Shimmer className="h-10 w-10 rounded-xl flex-shrink-0" />
            <div className="flex flex-col gap-1.5">
              <Shimmer className="h-3.5 w-28" />
              <Shimmer className="h-3 w-36" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity Table */}
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
              {[1, 2, 3, 4, 5].map((i) => (
                <th key={i} className="px-4 py-3"><Shimmer className="h-3 w-16" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => <ActivityRowSkeleton key={i} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
