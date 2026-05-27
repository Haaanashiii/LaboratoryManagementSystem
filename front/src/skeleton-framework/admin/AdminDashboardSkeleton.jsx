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

function AreaChartSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Shimmer className="h-4 w-40" />
          <Shimmer className="h-3 w-56" />
        </div>
        <Shimmer className="h-8 w-28 rounded-lg" />
      </div>
      {/* Legend */}
      <div className="mb-4 flex gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Shimmer className="h-2 w-2 rounded-full" />
            <Shimmer className="h-3 w-14" />
          </div>
        ))}
      </div>
      {/* Chart body */}
      <div className="relative h-48 w-full overflow-hidden rounded-xl bg-slate-100">
        <div className="animate-pulse h-full w-full bg-gradient-to-b from-slate-200 via-slate-100 to-slate-50 rounded-xl" />
        {/* fake y-axis ticks */}
        <div className="absolute inset-y-0 left-0 flex flex-col justify-between py-2 pl-1">
          {[1, 2, 3, 4].map((i) => (
            <Shimmer key={i} className="h-2.5 w-6" />
          ))}
        </div>
      </div>
    </div>
  );
}

function PieChartSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2">
        <Shimmer className="h-4 w-36" />
        <Shimmer className="h-3 w-48" />
      </div>
      <div className="flex items-center justify-around">
        {/* Fake donut ring */}
        <div className="relative flex items-center justify-center">
          <div className="h-32 w-32 animate-pulse rounded-full border-[18px] border-slate-200 bg-white" />
          <div className="absolute h-32 w-32 animate-pulse rounded-full border-[18px] border-t-slate-300 border-r-blue-200 border-b-emerald-200 border-l-amber-200" />
          <div className="absolute flex flex-col items-center">
            <Shimmer className="h-5 w-10 rounded" />
            <Shimmer className="mt-1 h-2.5 w-12" />
          </div>
        </div>
        {/* Legend */}
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Shimmer className="h-2.5 w-2.5 rounded-full" />
              <Shimmer className="h-3 w-20" />
              <Shimmer className="ml-1 h-3 w-6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RecentActivitiesRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <Shimmer className="h-9 w-9 flex-shrink-0 rounded-full" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Shimmer className="h-3 w-48" />
        <Shimmer className="h-2.5 w-32" />
      </div>
      <Shimmer className="h-5 w-20 rounded-full flex-shrink-0" />
    </div>
  );
}

export default function AdminDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Shimmer className="h-6 w-52" />
          <Shimmer className="h-3.5 w-40" />
        </div>
        <Shimmer className="h-9 w-32 rounded-lg" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AreaChartSkeleton />
        </div>
        <PieChartSkeleton />
      </div>

      {/* Recent requests + quick actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent requests */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <Shimmer className="h-4 w-36" />
            <Shimmer className="h-7 w-20 rounded-lg" />
          </div>
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map((i) => <RecentActivitiesRowSkeleton key={i} />)}
          </div>
        </div>

        {/* Quick actions / role distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <Shimmer className="h-4 w-36" />
            <Shimmer className="h-7 w-20 rounded-lg" />
          </div>
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                <div className="flex items-center gap-3">
                  <Shimmer className="h-8 w-8 rounded-lg" />
                  <div className="flex flex-col gap-1.5">
                    <Shimmer className="h-3 w-24" />
                    <Shimmer className="h-2.5 w-16" />
                  </div>
                </div>
                <Shimmer className="h-6 w-12 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
