import React from 'react';
import { format } from 'date-fns';

export default function EquimonPageHeader({ accent, icon: Icon, title, badgeCount, badge, sub, sideLabel }) {
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/70 shadow-sm">
      <div className="px-7 py-5 flex items-center gap-5">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{
            background: `linear-gradient(135deg, ${accent}22 0%, ${accent}11 100%)`,
            border: `1px solid ${accent}33`,
          }}
        >
          <Icon className="w-7 h-7" style={{ color: accent }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold tracking-[1.5px] text-slate-400 uppercase">{today}</div>
          <h1 className="text-[24px] font-extrabold text-slate-900 leading-tight flex items-center gap-3 flex-wrap">
            {title}
            {badgeCount != null && (
              <span
                className="text-[13px] font-semibold px-3 py-1 rounded-full"
                style={{ background: `${accent}18`, color: accent }}
              >
                {badgeCount} {badge}
              </span>
            )}
          </h1>
          {sub && <p className="text-[13px] text-slate-500 mt-1">{sub}</p>}
        </div>
        {sideLabel && (
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <span className="text-[13px] text-slate-500">Today's load</span>
            <span className="px-3 py-1.5 rounded-lg text-[13px] font-bold text-white" style={{ background: accent }}>
              {sideLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
