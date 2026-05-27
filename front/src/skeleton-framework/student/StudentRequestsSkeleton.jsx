import React from 'react';
import { useTheme } from '@/components/hooks/ThemeContext';

const Shimmer = ({ className = '', isDark = false }) => (
  <div className={`animate-pulse rounded ${isDark ? 'bg-white/[0.08]' : 'bg-slate-200'} ${className}`} />
);

function RequestCardSkeleton({ isDark }) {
  return (
    <div className={`rounded-2xl border p-4 flex gap-4 ${isDark ? 'bg-[#0d0d14] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'}`}>
      <Shimmer isDark={isDark} className="h-12 w-12 rounded-xl flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Shimmer isDark={isDark} className="h-4 w-48" />
          <Shimmer isDark={isDark} className="h-5 w-20 rounded-full flex-shrink-0" />
        </div>
        <Shimmer isDark={isDark} className="h-3 w-32" />
        <div className="flex gap-3 mt-1">
          <Shimmer isDark={isDark} className="h-3 w-24" />
          <Shimmer isDark={isDark} className="h-3 w-20" />
        </div>
        {/* Progress tracker */}
        <div className="flex items-center gap-1 mt-2">
          {[1, 2, 3, 4].map((i) => (
            <React.Fragment key={i}>
              <Shimmer isDark={isDark} className="h-6 w-6 rounded-full" />
              {i < 4 && <Shimmer isDark={isDark} className="h-1 flex-1" />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StudentRequestsSkeleton() {
  const { isDark } = useTheme();

  return (
    <div className="w-full space-y-4 px-2 py-3">
      {/* Hero Banner */}
      <Shimmer isDark={isDark} className="h-32 w-full rounded-2xl" />

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[1, 2].map((i) => (
          <Shimmer key={i} isDark={isDark} className="h-9 w-28 rounded-xl flex-shrink-0" />
        ))}
      </div>

      {/* Request Cards */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => <RequestCardSkeleton key={i} isDark={isDark} />)}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <Shimmer isDark={isDark} className="h-8 w-8 rounded-lg" />
        {[1, 2, 3].map((i) => <Shimmer key={i} isDark={isDark} className="h-8 w-8 rounded-lg" />)}
        <Shimmer isDark={isDark} className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  );
}
