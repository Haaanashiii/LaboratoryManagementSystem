import React from 'react';

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

function SettingsRowSkeleton() {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3">
        <Shimmer className="h-8 w-8 rounded-xl flex-shrink-0" />
        <div className="flex flex-col gap-1.5">
          <Shimmer className="h-3.5 w-32" />
          <Shimmer className="h-3 w-48" />
        </div>
      </div>
      <Shimmer className="h-5 w-5 rounded-full flex-shrink-0" />
    </div>
  );
}

export default function StudentSettingsSkeleton() {
  return (
    <div className="w-full space-y-4 px-2 py-3">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 px-6 py-8 shadow-sm">
        <div className="flex items-center gap-5">
          <Shimmer className="h-16 w-16 rounded-2xl flex-shrink-0" />
          <div className="flex flex-col gap-2">
            <Shimmer className="h-5 w-40" />
            <Shimmer className="h-3.5 w-48" />
            <Shimmer className="h-5 w-20 rounded-full mt-1" />
          </div>
        </div>
        <Shimmer className="absolute right-6 top-6 h-8 w-24 rounded-lg" />
      </div>

      {/* Preferences Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <Shimmer className="h-3.5 w-24 rounded" />
        </div>
        {[1, 2, 3].map((i) => <SettingsRowSkeleton key={i} />)}
      </div>

      {/* Account Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <Shimmer className="h-3.5 w-20 rounded" />
        </div>
        {[1, 2].map((i) => <SettingsRowSkeleton key={i} />)}
      </div>

      {/* Sign Out Button */}
      <Shimmer className="h-11 w-full rounded-2xl" />
    </div>
  );
}
