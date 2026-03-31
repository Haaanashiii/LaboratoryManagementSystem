import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function CatalogRoleActions({ title, subtitle, actions, variant = 'default' }) {
  if (!actions || actions.length === 0) {
    return null;
  }

  const isLecturer = variant === 'lecturer';
  const containerClass = isLecturer
    ? 'rounded-2xl border border-[var(--catalog-border)] bg-[rgba(17,17,24,0.92)] p-4 w-full shadow-[0_18px_45px_rgba(5,7,15,0.45)]'
    : 'rounded-xl border border-slate-200 bg-white/70 p-4';
  const kickerClass = isLecturer
    ? 'text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--catalog-dim)]'
    : 'text-xs font-semibold text-slate-400 uppercase tracking-widest';
  const subtitleClass = isLecturer
    ? 'text-sm text-[var(--catalog-text)] font-medium mt-1'
    : 'text-sm text-slate-600 font-medium mt-1';
  const countClass = isLecturer
    ? 'text-[11px] font-semibold text-[var(--catalog-muted)]'
    : 'text-[11px] font-semibold text-slate-400';
  const actionClass = isLecturer
    ? 'group rounded-xl border border-[var(--catalog-border)] bg-[rgba(26,26,36,0.85)] px-4 py-3 shadow-[0_12px_28px_rgba(5,7,15,0.35)] transition hover:-translate-y-0.5 hover:border-[var(--catalog-border-strong)]'
    : 'group rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md';
  const titleClass = isLecturer
    ? 'text-sm font-semibold text-[var(--catalog-text)]'
    : 'text-sm font-semibold text-slate-900';
  const descriptionClass = isLecturer
    ? 'text-xs text-[var(--catalog-muted)] mt-1'
    : 'text-xs text-slate-500 mt-1';
  const arrowClass = isLecturer
    ? 'h-4 w-4 text-[var(--catalog-dim)] transition group-hover:text-[var(--catalog-text)]'
    : 'h-4 w-4 text-slate-300 transition group-hover:text-blue-500';

  return (
    <div className={containerClass}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <p className={kickerClass}>{title}</p>
          {subtitle && (
            <p className={subtitleClass}>{subtitle}</p>
          )}
        </div>
        <span className={countClass}>{actions.length} actions</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.title}
            to={action.href}
            className={actionClass}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-lg p-2 ${action.iconClass || 'bg-slate-100 text-slate-600'}`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className={titleClass}>{action.title}</p>
                  <p className={descriptionClass}>{action.description}</p>
                </div>
              </div>
              <ArrowRight className={arrowClass} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
