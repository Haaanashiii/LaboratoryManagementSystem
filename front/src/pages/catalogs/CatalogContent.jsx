import React from 'react';
import EquipmentCard from '@/components/equipment/EquipmentCard';
import { Input } from '@/components/ui/input';
import { Search, SlidersHorizontal, Package } from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';

const catalogStyles = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .catalog-fade-up {
    opacity: 0;
    animation: fadeUp 0.38s ease forwards;
  }
  .catalog-fade-up-1 { animation-delay: 0.04s; }
  .catalog-fade-up-2 { animation-delay: 0.10s; }
  .catalog-fade-up-3 { animation-delay: 0.16s; }
  .catalog-fade-up-4 { animation-delay: 0.22s; }

  @keyframes cardIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .card-in {
    opacity: 0;
    animation: cardIn 0.32s ease forwards;
  }

  .catalog-shell--lecturer {
    --catalog-bg: #0a0a0f;
    --catalog-surface: #111118;
    --catalog-surface-2: #1a1a24;
    --catalog-border: #2a2a3a;
    --catalog-border-strong: #3a3a5a;
    --catalog-text: #e2e8f0;
    --catalog-muted: #94a3b8;
    --catalog-dim: #64748b;
    --catalog-accent: #3b82f6;
    --catalog-accent-2: #22c55e;
    --catalog-warning: #f59e0b;
    --catalog-danger: #ef4444;
    --font-display: 'Space Grotesk', 'DM Sans', sans-serif;
    --font-body: 'DM Sans', 'Space Grotesk', sans-serif;
    position: relative;
    border-radius: 24px;
    border: 1px solid var(--catalog-border);
    background:
      radial-gradient(1200px 600px at 6% -10%, rgba(59, 130, 246, 0.18), transparent 60%),
      radial-gradient(900px 520px at 94% 0%, rgba(34, 197, 94, 0.16), transparent 62%),
      linear-gradient(180deg, rgba(26, 26, 36, 0.95), rgba(10, 10, 15, 0.98));
    color: var(--catalog-text);
    overflow: hidden;
  }

  .catalog-grid-glow {
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(circle at 20% 0%, rgba(59, 130, 246, 0.14), transparent 55%),
      radial-gradient(circle at 85% 12%, rgba(34, 197, 94, 0.12), transparent 52%),
      linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
    background-size: 100% 100%, 100% 100%, 32px 32px, 32px 32px;
    opacity: 0.45;
    pointer-events: none;
  }

  .catalog-shell-inner {
    position: relative;
    z-index: 1;
    padding: 1.5rem;
    font-family: var(--font-body);
  }

  .catalog-panel {
    background: rgba(17, 17, 24, 0.9);
    border: 1px solid var(--catalog-border);
    border-radius: 18px;
    padding: 1rem;
    box-shadow: 0 20px 45px rgba(5, 7, 15, 0.45);
  }

  .catalog-kicker {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.32em;
    color: var(--catalog-dim);
    margin-bottom: 0.4rem;
  }

  .catalog-title {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 700;
    color: var(--catalog-text);
  }

  .catalog-subtitle {
    font-size: 14px;
    color: var(--catalog-muted);
    margin-top: 0.5rem;
    max-width: 520px;
  }

  .catalog-count-badge {
    font-size: 11px;
    font-weight: 600;
    color: var(--catalog-muted);
    padding: 0.45rem 0.75rem;
    border-radius: 10px;
    border: 1px solid var(--catalog-border);
    background: rgba(17, 17, 24, 0.7);
  }

  .catalog-section-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.24em;
    color: var(--catalog-dim);
  }

  .catalog-section-meta {
    font-size: 11px;
    font-weight: 600;
    color: var(--catalog-muted);
  }

  .catalog-mission-card {
    display: flex;
    gap: 0.75rem;
    border-radius: 14px;
    border: 1px solid var(--catalog-border);
    background: rgba(26, 26, 36, 0.8);
    padding: 0.85rem;
  }

  .catalog-mission-index {
    height: 32px;
    width: 32px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 700;
    color: var(--catalog-text);
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.35);
  }

  .catalog-mission-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--catalog-text);
  }

  .catalog-mission-text {
    font-size: 12px;
    color: var(--catalog-muted);
    margin-top: 0.25rem;
  }

  .catalog-actions {
    display: flex;
    height: 100%;
  }
`;

export default function CatalogContent({
  header,
  actions,
  search,
  onSearchChange,
  groupByCategory,
  onToggleGroupBy,
  filteredEquipment,
  groupedEquipment,
  groupedCategories,
  isLoading,
  isError,
  error,
  userRole,
  onSelect,
  onBorrow,
  variant = 'default',
}) {
  const isLecturer = variant === 'lecturer';
  const {
    eyebrow = 'Equipment Catalog',
    title = 'Equipment Catalog',
    description = 'Browse available laboratory equipment.',
    badge,
    badgeClass = 'bg-blue-50 text-blue-700 border-blue-200',
  } = header || {};

  const itemCount = filteredEquipment?.length || 0;
  const missionSteps = [
    {
      title: 'View available equipment',
      description: 'Open item details to confirm availability and specs.',
    },
    {
      title: 'Check quantity before experiments',
      description: 'Use the availability meter to avoid shortages.',
    },
    {
      title: 'Request equipment for classes',
      description: 'Coordinate class requests using the approval tools.',
    },
    {
      title: 'Verify equipment for lab sessions',
      description: 'Validate readiness before each session begins.',
    },
  ];

  const wrapperClass = isLecturer
    ? 'w-full catalog-shell catalog-shell--lecturer'
    : 'w-full space-y-5 py-4 px-4';
  const innerClass = isLecturer ? 'catalog-shell-inner space-y-6' : 'space-y-5';
  const headerClass = isLecturer
    ? 'catalog-fade-up catalog-fade-up-1 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 pb-6 border-b border-[var(--catalog-border)]'
    : 'catalog-fade-up catalog-fade-up-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200';
  const eyebrowClass = isLecturer
    ? 'catalog-kicker'
    : 'text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1';
  const titleClass = isLecturer
    ? 'catalog-title'
    : 'text-2xl font-bold text-slate-900';
  const descriptionClass = isLecturer
    ? 'catalog-subtitle'
    : 'text-sm text-slate-500 mt-1.5 font-medium';
  const countClass = isLecturer
    ? 'catalog-count-badge'
    : 'text-xs text-slate-400 font-semibold shrink-0 px-3 py-1.5 rounded-lg bg-slate-50';
  const searchInputClass = isLecturer
    ? 'pl-9 rounded-lg bg-[var(--catalog-surface)] border-[var(--catalog-border)] text-[var(--catalog-text)] placeholder:text-[var(--catalog-dim)] focus:border-[var(--catalog-accent)] focus:ring-[var(--catalog-accent)] ring-offset-[var(--catalog-bg)] font-medium'
    : 'pl-9 bg-white border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400 transition-colors font-medium';
  const searchIconClass = isLecturer
    ? 'text-[var(--catalog-muted)]'
    : 'text-slate-400';
  const toggleBaseClass = isLecturer
    ? 'inline-flex items-center gap-2 text-xs font-semibold px-3 h-9 rounded-lg border transition-colors border-[var(--catalog-border)] bg-[var(--catalog-surface)] text-[var(--catalog-muted)] hover:text-[var(--catalog-text)] hover:border-[var(--catalog-border-strong)]'
    : 'inline-flex items-center gap-2 text-xs font-semibold px-3 h-9 rounded-lg border transition-colors';
  const toggleActiveClass = isLecturer
    ? 'bg-[rgba(59,130,246,0.16)] text-[var(--catalog-text)] border-[rgba(59,130,246,0.35)]'
    : 'bg-blue-50 text-blue-700 border-blue-200';
  const toggleInactiveClass = isLecturer
    ? ''
    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50';
  const emptyStateClass = isLecturer
    ? 'flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-[var(--catalog-border)] bg-[rgba(17,17,24,0.6)] text-center'
    : 'flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center';
  const emptyIconWrapClass = isLecturer
    ? 'w-12 h-12 rounded-xl bg-[rgba(26,26,36,0.9)] flex items-center justify-center mb-3 border border-[var(--catalog-border)]'
    : 'w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3 border border-slate-200';
  const errorIconWrapClass = isLecturer
    ? 'w-12 h-12 rounded-xl bg-[rgba(239,68,68,0.1)] flex items-center justify-center mb-3 border border-[rgba(239,68,68,0.4)]'
    : 'w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3 border border-red-100';

  return (
    <div className={wrapperClass}>
      <style>{catalogStyles}</style>
      {isLecturer && <div className="catalog-grid-glow" aria-hidden="true" />}
      <div className={innerClass}>

      {/* Header */}
      <div className={headerClass}>
        <div>
          <p className={eyebrowClass}>{eyebrow}</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={titleClass}>{title}</h1>
            {badge && (
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${badgeClass}`}>
                {badge}
              </span>
            )}
          </div>
          <p className={descriptionClass}>{description}</p>
        </div>
        {!isLoading && !isError && (
          <span className={countClass}>
            {itemCount} item{itemCount !== 1 ? 's' : ''} found
          </span>
        )}
      </div>

      {isLecturer ? (
        <div className="catalog-fade-up catalog-fade-up-2 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="catalog-panel">
            <div className="flex items-center justify-between mb-3">
              <p className="catalog-section-title">Session readiness workflow</p>
              <span className="catalog-section-meta">4 focus areas</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {missionSteps.map((step, index) => (
                <div key={step.title} className="catalog-mission-card">
                  <div className="catalog-mission-index">{index + 1}</div>
                  <div>
                    <p className="catalog-mission-title">{step.title}</p>
                    <p className="catalog-mission-text">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {actions && (
            <div className="catalog-actions">
              {actions}
            </div>
          )}
        </div>
      ) : (
        actions && (
          <div className="catalog-fade-up catalog-fade-up-2">
            {actions}
          </div>
        )
      )}

      {/* Search and Filter */}
      <div className="catalog-fade-up catalog-fade-up-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${searchIconClass}`} />
          <Input
            placeholder="Search by name or description..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className={searchInputClass}
          />
        </div>
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2">
          <button
            type="button"
            onClick={onToggleGroupBy}
            className={
              `${toggleBaseClass} ` +
              (groupByCategory
                ? toggleActiveClass
                : toggleInactiveClass)
            }
            aria-pressed={groupByCategory}
            title={groupByCategory ? 'Click to show all items' : 'Click to group by category'}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{groupByCategory ? 'Grouped by category' : 'All items'}</span>
          </button>
        </div>
      </div>

      {/* Equipment Grid */}
      <div className="catalog-fade-up catalog-fade-up-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <BanterLoader />
          </div>
        ) : isError ? (
          <div className={emptyStateClass}>
            <div className={errorIconWrapClass}>
              <Package className={isLecturer ? 'w-6 h-6 text-red-300' : 'w-6 h-6 text-red-400'} />
            </div>
            <p className={isLecturer ? 'text-sm font-semibold text-slate-100' : 'text-sm font-semibold text-slate-700'}>Unable to load equipment</p>
            <p className={isLecturer ? 'text-xs text-slate-400 mt-1.5 max-w-xs font-medium' : 'text-xs text-slate-500 mt-1.5 max-w-xs font-medium'}>
              {error?.message || 'Failed to connect to the server. Please check your connection and try again.'}
            </p>
          </div>
        ) : itemCount === 0 ? (
          <div className={emptyStateClass}>
            <div className={emptyIconWrapClass}>
              <Package className={isLecturer ? 'w-6 h-6 text-slate-500' : 'w-6 h-6 text-slate-400'} />
            </div>
            <p className={isLecturer ? 'text-sm font-semibold text-slate-100' : 'text-sm font-semibold text-slate-700'}>No equipment found</p>
            <p className={isLecturer ? 'text-xs text-slate-400 mt-1.5 font-medium' : 'text-xs text-slate-500 mt-1.5 font-medium'}>Try adjusting your search or filter.</p>
          </div>
        ) : (
          groupByCategory ? (
            <div className="space-y-8">
              {groupedCategories.map((cat, sectionIndex) => (
                <section key={cat} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className={isLecturer ? 'text-sm font-bold text-slate-100' : 'text-sm font-bold text-slate-900'}>{cat}</h2>
                    <span className={isLecturer ? 'text-xs font-semibold text-slate-400' : 'text-xs font-semibold text-slate-400'}>
                      {groupedEquipment[cat].length} item{groupedEquipment[cat].length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                    {groupedEquipment[cat].map((item, index) => (
                      <div
                        key={item.id}
                        className="card-in"
                        style={{ animationDelay: `${0.05 + (sectionIndex * 10 + index) * 0.03}s` }}
                      >
                        <EquipmentCard
                          equipment={item}
                          onSelect={onSelect}
                          onBorrow={onBorrow}
                          userRole={userRole}
                          variant={variant}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {filteredEquipment.map((item, index) => (
                <div
                  key={item.id}
                  className="card-in"
                  style={{ animationDelay: `${0.05 + index * 0.03}s` }}
                >
                  <EquipmentCard
                    equipment={item}
                    onSelect={onSelect}
                    onBorrow={onBorrow}
                    userRole={userRole}
                    variant={variant}
                  />
                </div>
              ))}
            </div>
          )
        )}
      </div>
      </div>
    </div>
  );
}
