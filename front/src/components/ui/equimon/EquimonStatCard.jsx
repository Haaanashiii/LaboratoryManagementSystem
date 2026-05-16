import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export default function EquimonStatCard({ tint, fg, icon: Icon, label, value, sub, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer w-full"
      style={{ background: tint, borderColor: `${fg}33` }}
    >
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-30" style={{ background: `${fg}1A` }} />
      {badge != null && (
        <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white">
          {badge} late
        </span>
      )}
      <div className="relative flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl bg-white/80 flex items-center justify-center shadow-sm" style={{ color: fg }}>
          <Icon className="w-5 h-5" />
        </div>
        <ArrowUpRight className="w-4 h-4 opacity-60" style={{ color: fg }} />
      </div>
      <div className="relative">
        <div className="text-[34px] font-extrabold leading-none" style={{ color: fg }}>{value}</div>
        <div className="text-[14px] font-bold text-slate-800 mt-2">{label}</div>
        <div className="text-[12px] text-slate-500 mt-0.5">{sub}</div>
      </div>
    </button>
  );
}
