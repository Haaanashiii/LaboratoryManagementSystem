import React from 'react';

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

function PasswordFieldSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <Shimmer className="h-3 w-28" />
      <Shimmer className="h-10 w-full rounded-lg" />
    </div>
  );
}

function SecurityTabSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {/* Last changed info */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <Shimmer className="h-4 w-4 rounded-full flex-shrink-0" />
        <Shimmer className="h-3 w-64" />
      </div>

      {/* Password requirement checklist */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <Shimmer className="mb-3 h-3 w-40" />
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Shimmer className="h-3.5 w-3.5 flex-shrink-0 rounded-full" />
              <Shimmer className="h-3 w-36" />
            </div>
          ))}
        </div>
      </div>

      {/* Password fields */}
      <PasswordFieldSkeleton />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PasswordFieldSkeleton />
        <PasswordFieldSkeleton />
      </div>

      {/* Save button */}
      <Shimmer className="h-10 w-36 rounded-lg self-end" />
    </div>
  );
}

function SidebarTabSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Info banner */}
      <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
        <Shimmer className="h-4 w-4 flex-shrink-0 rounded-full bg-amber-200" />
        <Shimmer className="h-3 w-72 bg-amber-200" />
      </div>

      {/* Sidebar item list (drag-and-drop list) */}
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            {/* drag handle */}
            <Shimmer className="h-5 w-4 flex-shrink-0 rounded" />
            {/* Icon */}
            <Shimmer className="h-8 w-8 flex-shrink-0 rounded-lg" />
            {/* Label */}
            <Shimmer className="h-3 flex-1 max-w-[120px]" />
            {/* href chip */}
            <Shimmer className="h-5 w-28 rounded-full ml-auto" />
          </div>
        ))}
      </div>

      {/* Reset + Save buttons */}
      <div className="flex items-center justify-end gap-2">
        <Shimmer className="h-9 w-24 rounded-lg" />
        <Shimmer className="h-9 w-28 rounded-lg" />
      </div>
    </div>
  );
}

export default function AdminSettingsSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-6">

      {/* Page header */}
      <div className="flex flex-col gap-2">
        <Shimmer className="h-6 w-40" />
        <Shimmer className="h-3.5 w-64" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {[
          { w: 'w-28', active: true },
          { w: 'w-24', active: false },
        ].map(({ w, active }, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 rounded-t-lg px-4 py-2.5 ${
              active ? 'border-b-2 border-slate-400' : ''
            }`}
          >
            <Shimmer className="h-4 w-4 rounded-md" />
            <Shimmer className={`h-3 ${w}`} />
          </div>
        ))}
      </div>

      {/* Tab content card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <SecurityTabSkeleton />
      </div>
    </div>
  );
}
