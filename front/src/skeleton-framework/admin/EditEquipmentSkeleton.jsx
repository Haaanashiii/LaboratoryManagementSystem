import React from 'react';

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

function SectionSkeleton({ titleWidth = 'w-36', descWidth = 'w-52', children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-start gap-4 border-b border-slate-100 px-8 py-6">
        <Shimmer className="h-10 w-10 rounded-xl flex-shrink-0" />
        <div className="flex flex-col gap-2">
          <Shimmer className={`h-3.5 ${titleWidth}`} />
          <Shimmer className={`h-3 ${descWidth}`} />
        </div>
      </div>
      <div className="px-8 py-7 space-y-4">{children}</div>
    </div>
  );
}

function FieldSkeleton({ labelWidth = 'w-24', inputHeight = 'h-10' }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Shimmer className={`h-3.5 ${labelWidth}`} />
      <Shimmer className={`${inputHeight} w-full rounded-xl`} />
    </div>
  );
}

export default function EditEquipmentSkeleton() {
  return (
    <div className="mx-auto max-w-3xl w-full space-y-4 px-4 py-6">
      {/* Back Button + Title */}
      <div className="flex items-center gap-3">
        <Shimmer className="h-9 w-9 rounded-xl flex-shrink-0" />
        <div className="flex flex-col gap-1.5">
          <Shimmer className="h-5 w-52" />
          <Shimmer className="h-3 w-64" />
        </div>
      </div>

      {/* Basic Info Section */}
      <SectionSkeleton titleWidth="w-24" descWidth="w-56">
        <FieldSkeleton labelWidth="w-16" />
        <FieldSkeleton labelWidth="w-24" inputHeight="h-24" />
        <div className="grid grid-cols-2 gap-4">
          <FieldSkeleton labelWidth="w-28" />
          <FieldSkeleton labelWidth="w-32" />
        </div>
      </SectionSkeleton>

      {/* Category Section */}
      <SectionSkeleton titleWidth="w-20" descWidth="w-48">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Shimmer key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </SectionSkeleton>

      {/* Condition Section */}
      <SectionSkeleton titleWidth="w-20" descWidth="w-44">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Shimmer key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </SectionSkeleton>

      {/* Images Section */}
      <SectionSkeleton titleWidth="w-16" descWidth="w-52">
        {/* Existing images */}
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="relative">
              <Shimmer className="h-20 w-20 rounded-xl" />
              <Shimmer className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full" />
            </div>
          ))}
        </div>
        <Shimmer className="h-32 w-full rounded-2xl border-2 border-dashed border-slate-200 mt-3" />
        <div className="flex gap-2 mt-3">
          <Shimmer className="h-9 flex-1 rounded-xl" />
          <Shimmer className="h-9 w-24 rounded-xl" />
        </div>
      </SectionSkeleton>

      {/* Location & Tags Section */}
      <SectionSkeleton titleWidth="w-32" descWidth="w-48">
        <FieldSkeleton labelWidth="w-20" />
        <FieldSkeleton labelWidth="w-10" />
      </SectionSkeleton>

      {/* Footer Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Shimmer className="h-10 w-24 rounded-xl" />
        <Shimmer className="h-10 w-36 rounded-xl" />
      </div>
    </div>
  );
}
