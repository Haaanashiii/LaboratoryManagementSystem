import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function EquimonActionPanel({ accent, items = [] }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-[16px] font-extrabold text-slate-900">Today's Action Items</h3>
          <p className="text-[12px] text-slate-500">Sorted by priority — handle these first.</p>
        </div>
        <span
          className="text-[12px] font-bold px-3 py-1 rounded-full"
          style={{ background: `${accent}18`, color: accent }}
        >
          {items.length} items
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {items.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-[13px]">
            Nothing pressing right now — you're all caught up.
          </div>
        ) : (
          items.map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              className="w-full px-5 py-3 flex items-start gap-3 text-left hover:bg-slate-50 transition-colors"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${item.color}18`, color: item.color }}
              >
                <item.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-slate-900">{item.title}</div>
                <div className="text-[12px] text-slate-500 truncate">{item.desc}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-2" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
