import React from 'react';

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

function RequestCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex gap-4">
      <Shimmer className="h-12 w-12 rounded-xl flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Shimmer className="h-4 w-48" />
          <Shimmer className="h-5 w-20 rounded-full flex-shrink-0" />
        </div>
        <Shimmer className="h-3 w-32" />
        <div className="flex gap-3 mt-1">
          <Shimmer className="h-3 w-24" />
          <Shimmer className="h-3 w-20" />
        </div>
        {/* Progress tracker */}
        <div className="flex items-center gap-1 mt-2">
          {[1, 2, 3, 4].map((i) => (
            <React.Fragment key={i}>
              <Shimmer className="h-6 w-6 rounded-full" />
              {i < 4 && <Shimmer className="h-1 flex-1" />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StudentRequestsSkeleton() {
  return (
    <div className="w-full space-y-4 px-2 py-3">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { w: 'w-16' },
          { w: 'w-14' },
          { w: 'w-20' },
        ].map((item, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-2">
            <Shimmer className="h-3.5 w-20" />
            <Shimmer className={`h-8 ${item.w} rounded-lg`} />
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[1, 2, 3, 4].map((i) => (
          <Shimmer key={i} className="h-8 w-24 rounded-lg flex-shrink-0" />
        ))}
      </div>

      {/* Request Cards */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => <RequestCardSkeleton key={i} />)}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <Shimmer className="h-8 w-8 rounded-lg" />
        {[1, 2, 3].map((i) => <Shimmer key={i} className="h-8 w-8 rounded-lg" />)}
        <Shimmer className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  );
}
