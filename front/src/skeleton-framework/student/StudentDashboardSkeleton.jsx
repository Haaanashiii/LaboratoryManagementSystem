import React from 'react';

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

function StatTileSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Shimmer className="h-3.5 w-24" />
        <Shimmer className="h-8 w-8 rounded-xl flex-shrink-0" />
      </div>
      <Shimmer className="h-8 w-14 rounded-lg" />
      <Shimmer className="h-3 w-32" />
    </div>
  );
}

function BentoActionSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Shimmer className="h-10 w-10 rounded-xl flex-shrink-0" />
        <div className="flex flex-col gap-2">
          <Shimmer className="h-3.5 w-28" />
          <Shimmer className="h-3 w-40" />
        </div>
      </div>
      <Shimmer className="h-5 w-5 rounded-full flex-shrink-0" />
    </div>
  );
}

function RequestRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 last:border-0">
      <Shimmer className="h-8 w-8 rounded-lg flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <Shimmer className="h-3.5 w-48" />
        <Shimmer className="h-3 w-32" />
      </div>
      <Shimmer className="h-5 w-20 rounded-full" />
      <Shimmer className="h-5 w-5 rounded-full flex-shrink-0" />
    </div>
  );
}

export default function StudentDashboardSkeleton() {
  return (
    <div className="w-full space-y-5 px-2 py-3">
      {/* Hero Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <Shimmer className="h-12 w-12 rounded-xl flex-shrink-0" />
          <div className="flex flex-col gap-2">
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-5 w-48" />
            <Shimmer className="h-3 w-32" />
          </div>
        </div>
        <Shimmer className="h-9 w-32 rounded-lg" />
      </div>

      {/* Stat Tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <StatTileSkeleton key={i} />)}
      </div>

      {/* Bento Actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[1, 2].map((i) => <BentoActionSkeleton key={i} />)}
      </div>

      {/* Recent Requests */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex flex-col gap-2">
            <Shimmer className="h-4 w-36" />
            <Shimmer className="h-3 w-52" />
          </div>
          <Shimmer className="h-8 w-24 rounded-lg" />
        </div>
        {[1, 2, 3, 4].map((i) => <RequestRowSkeleton key={i} />)}
      </div>

      {/* Featured Equipment */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <Shimmer className="h-4 w-40" />
          <Shimmer className="h-8 w-20 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
              <Shimmer className="h-28 w-full rounded-none" />
              <div className="p-3 flex flex-col gap-1.5">
                <Shimmer className="h-3.5 w-full" />
                <Shimmer className="h-3 w-2/3" />
                <Shimmer className="h-5 w-16 rounded-full mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
