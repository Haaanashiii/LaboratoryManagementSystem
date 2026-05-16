import React from 'react';
import { format } from 'date-fns';

export default function EquimonGreetingHeader({ accent, name, greeting, icon: Icon, labLoad }) {
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');
  const firstName = name?.split(' ')[0] || name || 'User';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/70 shadow-sm">
      <div className="absolute -right-12 -top-16 w-72 h-72 rounded-full opacity-[0.09]" style={{ background: accent }} />
      <div className="absolute right-32 top-2 w-24 h-24 rounded-full opacity-[0.06]" style={{ background: accent }} />
      <div className="relative px-7 py-6 flex items-center gap-5">
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
          <h1 className="text-[28px] font-extrabold text-slate-900 leading-tight">
            {greeting},{' '}
            <span style={{ color: accent }}>{firstName}</span>
          </h1>
          <p className="text-[14px] text-slate-500 mt-1">Here's what's happening across the lab today.</p>
        </div>
        {labLoad != null && (
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-[11px] font-bold tracking-[1.2px] uppercase text-slate-400">Current Lab Load</div>
              <div className="text-[20px] font-extrabold text-slate-900">
                {labLoad}
                <span className="text-[14px] text-slate-400 font-semibold">% utilized</span>
              </div>
            </div>
            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${labLoad}%`, background: `linear-gradient(90deg, ${accent}, ${accent}cc)` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
