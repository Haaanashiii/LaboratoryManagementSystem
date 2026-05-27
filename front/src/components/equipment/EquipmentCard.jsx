import React, { useState } from 'react';
import { Package, ChevronLeft, ChevronRight, MoreHorizontal, Clock, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/components/hooks/ThemeContext';
import { useLang } from '@/components/i18n/LangContext';
import './ViewBorrowButton.css';

const cardStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

  /* ── Glass card (student default) ───────────────── */
  .eq-glass-card {
    border-radius: 18px;
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
    cursor: pointer;
    transition: transform 0.28s cubic-bezier(0.16,1,0.3,1), box-shadow 0.28s ease, border-color 0.28s ease;
    position: relative;
  }

  .eq-glass-card.eq-gd {
    background: rgba(255,255,255,0.06);
    backdrop-filter: blur(24px) saturate(140%);
    -webkit-backdrop-filter: blur(24px) saturate(140%);
    border: 1px solid rgba(255,255,255,0.10);
    box-shadow: 0 8px 32px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.06);
  }

  .eq-glass-card.eq-gl {
    background: rgba(255,255,255,0.55);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.78);
    box-shadow: 0 4px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.92);
  }

  .eq-glass-card:hover {
    transform: translateY(-3px);
  }

  .eq-glass-card.eq-gd:hover {
    border-color: rgba(59,130,246,0.32);
    box-shadow: 0 14px 44px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.08);
  }

  .eq-glass-card.eq-gl:hover {
    border-color: rgba(59,130,246,0.28);
    box-shadow: 0 10px 36px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.95);
  }

  /* ── Image area ──────────────────────────────────── */
  .eq-card-img {
    transition: transform 0.4s ease;
  }
  .eq-glass-card:hover .eq-card-img {
    transform: scale(1.03);
  }

  .eq-img-placeholder {
    background: linear-gradient(135deg, #0f3460 0%, #0e4d6d 55%, #0a2540 100%);
  }

  .eq-img-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
    background-size: 28px 28px;
    pointer-events: none;
  }

  .eq-icon-box {
    padding: 0.85rem;
    border-radius: 14px;
    background: rgba(255,255,255,0.12);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.22);
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  }

  /* ── Category pill (image overlay) ──────────────── */
  .eq-cat-pill {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    padding: 0.22rem 0.65rem;
    border-radius: 6px;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.18);
    color: #e2e8f0;
    white-space: nowrap;
  }

  /* ── Image navigation buttons ───────────────────── */
  .eq-nav-btn {
    background: rgba(0,0,0,0.50);
    color: #e2e8f0;
    backdrop-filter: blur(4px);
    transition: background 0.2s ease, opacity 0.2s ease;
  }
  .eq-nav-btn:hover { background: rgba(0,0,0,0.72); }

  /* ── Code tag ───────────────────────────────────── */
  .eq-code-tag {
    font-size: 11px;
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    font-weight: 600;
    padding: 0.22rem 0.55rem;
    border-radius: 5px;
    letter-spacing: 0.04em;
  }

  .eq-code-tag.eq-code-dark {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.10);
    color: #94a3b8;
  }

  .eq-code-tag.eq-code-light {
    background: rgba(0,0,0,0.05);
    border: 1px solid rgba(0,0,0,0.08);
    color: #64748b;
  }

  /* ── Availability bar ───────────────────────────── */
  .eq-avail-track {
    height: 5px;
    border-radius: 999px;
    overflow: hidden;
  }

  .eq-avail-track.eq-track-dark { background: rgba(148,163,184,0.14); }
  .eq-avail-track.eq-track-light { background: rgba(0,0,0,0.10); }

  .eq-avail-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.55s cubic-bezier(0.25,1,0.5,1);
  }

  /* learn-more-card-btn light-mode overrides for glass card */
  .eq-glass-card.eq-gl button.learn-more-card-btn .circle {
    background: #1e40af;
  }
  .eq-glass-card.eq-gl button.learn-more-card-btn .button-text {
    color: #1e293b;
    font-weight: 700;
  }
  .eq-glass-card.eq-gl button.learn-more-card-btn:hover:not(:disabled) .button-text {
    color: #fff;
  }

  /* ── Pill tags (availability status) ────────────── */
  .eq-pill {
    font-size: 11px;
    font-weight: 700;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    border: 1px solid transparent;
  }
  .eq-pill-ok      { color: #86efac; background: rgba(34,197,94,0.18);   border-color: rgba(34,197,94,0.40);  }
  .eq-pill-warning { color: #fde68a; background: rgba(245,158,11,0.18); border-color: rgba(245,158,11,0.45); }
  .eq-pill-danger  { color: #fecaca; background: rgba(239,68,68,0.18);  border-color: rgba(239,68,68,0.45);  }

  /* ── Lecturer card (unchanged) ───────────────────── */
  .eq-card--lecturer {
    background: var(--catalog-surface, #111118);
    border: 1px solid var(--catalog-border, #2a2a3a);
    border-radius: 18px;
    box-shadow: 0 18px 40px rgba(6,8,18,0.35);
    transition: transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
  }
  .eq-card--lecturer:hover {
    transform: translateY(-6px);
    border-color: var(--catalog-border-strong, #3a3a5a);
    box-shadow: 0 24px 60px rgba(6,8,18,0.45);
  }
  .eq-card--lecturer .eq-card-title  { font-family: var(--font-display, 'Space Grotesk', sans-serif); color: var(--catalog-text, #e2e8f0); }
  .eq-card--lecturer .eq-card-desc   { color: var(--catalog-muted, #94a3b8); }
  .eq-card--lecturer .eq-card-meta   { color: var(--catalog-dim, #64748b); }
  .eq-card--lecturer .eq-stat        { background: var(--catalog-surface-2, #1a1a24); border: 1px solid var(--catalog-border, #2a2a3a); border-radius: 14px; padding: 0.75rem; }
  .eq-card--lecturer .eq-stat-label  { font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--catalog-dim, #64748b); font-weight: 700; }
  .eq-card--lecturer .eq-stat-value  { font-size: 22px; font-weight: 700; color: var(--catalog-text, #e2e8f0); margin-top: 0.4rem; }
  .eq-card--lecturer .eq-stat-hint   { font-size: 12px; color: var(--catalog-muted, #94a3b8); margin-top: 0.35rem; }
  .eq-card--lecturer .eq-action-btn  { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 13px; font-weight: 600; padding: 0.45rem 0.9rem; border-radius: 999px; border: 1px solid rgba(59,130,246,0.45); color: var(--catalog-text, #e2e8f0); background: rgba(59,130,246,0.15); transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease; }
  .eq-card--lecturer .eq-action-btn:hover { transform: translateY(-1px); border-color: rgba(59,130,246,0.65); box-shadow: 0 10px 20px rgba(6,8,18,0.4); }
  .eq-card--lecturer .eq-action-secondary { border-color: rgba(34,197,94,0.5); background: rgba(34,197,94,0.15); }
  .eq-card--lecturer .eq-action-meta { font-size: 12px; color: var(--catalog-dim, #64748b); }
  .eq-card--lecturer .eq-chip { font-size: 11px; font-weight: 600; color: var(--catalog-text, #e2e8f0); background: rgba(17,17,24,0.8); border: 1px solid var(--catalog-border, #2a2a3a); padding: 0.25rem 0.6rem; border-radius: 999px; }
  .eq-card--lecturer .eq-image-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,10,15,0.05), rgba(10,10,15,0.8)); pointer-events: none; }
  .eq-availability-track { height: 6px; border-radius: 999px; background: rgba(148,163,184,0.18); flex: 1; overflow: hidden; }
  .eq-availability-fill  { height: 100%; border-radius: 999px; transition: width 0.5s ease; }
  .eq-nav-btn-lec { background: rgba(15,18,30,0.6); color: #e2e8f0; }
`;

export default function EquipmentCard({ equipment, onBorrow, onSelect, userRole, isPending = false, borrowState = 'none', variant = 'default' }) {
  const { isDark } = useTheme();
  const { t } = useLang();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const isLecturer = variant === 'lecturer';

  const effectiveBorrowState = borrowState === 'none' ? (isPending ? 'pending' : 'none') : borrowState;
  // for_replacement is informational only — student can still borrow the equipment again
  const hasActiveRequest = effectiveBorrowState !== 'none' && effectiveBorrowState !== 'for_replacement';

  const handleClick = () => {
    if (onSelect) onSelect(equipment);
    else if (onBorrow && !hasActiveRequest) onBorrow(equipment);
  };

  const handleViewAndBorrowClick = (e) => {
    e.stopPropagation();
    if (hasActiveRequest) return;
    if (onBorrow) onBorrow(equipment);
    else if (onSelect) onSelect(equipment);
  };

  const allImages = equipment.images_urls && equipment.images_urls.length > 0
    ? equipment.images_urls
    : (equipment.image_url ? [equipment.image_url] : []);

  const hasMultipleImages = allImages.length > 1;
  const currentImage = allImages[currentImageIndex] || null;

  const goToPreviousImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const goToNextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const canBorrow = !userRole || userRole === 'student';
  const available = equipment.available_quantity ?? 0;
  const total = equipment.total_quantity ?? 1;
  const safeTotal = total > 0 ? total : 1;
  const availPct = Math.max(0, Math.min(Math.round((available / safeTotal) * 100), 100));

  const availColor =
    available === 0 ? 'bg-red-400' :
    availPct <= 30  ? 'bg-amber-400' :
                      'bg-emerald-400';

  const availTextColor = isDark
    ? (available === 0 ? 'text-red-400' : availPct <= 30 ? 'text-amber-400' : 'text-emerald-400')
    : (available === 0 ? 'text-red-500' : availPct <= 30 ? 'text-amber-600' : 'text-emerald-600');

  const availabilityLabel =
    available === 0 ? t('unavailable') :
    availPct <= 30  ? t('lowStock') :
                      t('ready');
  const availabilityTone =
    available === 0 ? 'eq-pill-danger' :
    availPct <= 30  ? 'eq-pill-warning' :
                      'eq-pill-ok';

  const txt      = isDark ? 'text-white'     : 'text-slate-900';
  const txtsub   = isDark ? 'text-slate-400' : 'text-slate-500';
  const txtmuted = isDark ? 'text-slate-500' : 'text-slate-400';

  // ── Lecturer variant (unchanged) ─────────────────────────────────────────
  if (isLecturer) {
    return (
      <>
        <style>{cardStyles}</style>
        <div onClick={handleClick} className="eq-card--lecturer group flex flex-col overflow-hidden cursor-pointer">
          <div className="relative aspect-[16/10] overflow-hidden bg-[var(--catalog-surface-2,#1a1a24)]">
            {currentImage ? (
              <img src={currentImage} alt={equipment.name} className="eq-card-img w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-9 h-9 text-slate-600" />
              </div>
            )}
            <div className="eq-image-overlay" />
            {hasMultipleImages && (
              <>
                <button onClick={goToPreviousImage} className="eq-nav-btn-lec absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10" aria-label={t('previousImage')}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={goToNextImage} className="eq-nav-btn-lec absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10" aria-label={t('nextImage')}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
            {equipment.category && <span className="eq-chip absolute top-2 left-2">{equipment.category}</span>}
            <div className="absolute bottom-3 left-3 right-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="eq-card-meta text-[11px]">{t('availability')}</span>
                <span className={`eq-pill ${availabilityTone}`}>{availabilityLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="eq-availability-track">
                  <div className={`eq-availability-fill ${availabilityTone}`} style={{ width: `${availPct}%` }} />
                </div>
                <span className="eq-card-meta text-[11px]">{available} / {total}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4">
            <h3 className="eq-card-title text-[14px] font-semibold leading-snug line-clamp-1">{equipment.name}</h3>
            {equipment.description && <p className="eq-card-desc text-[12px] line-clamp-2 leading-relaxed">{equipment.description}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="eq-stat">
                <p className="eq-stat-label">{t('availableNow')}</p>
                <p className="eq-stat-value">{available}</p>
                <p className="eq-stat-hint">{t('checkQtyBeforeExperiments')}</p>
              </div>
              <div className="eq-stat">
                <p className="eq-stat-label">{t('totalUnits')}</p>
                <p className="eq-stat-value">{total}</p>
                <p className="eq-stat-hint">{t('verifyForLabSessions')}</p>
              </div>
            </div>
            {effectiveBorrowState === 'for_replacement' && (
              <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)' }}>
                <AlertTriangle style={{ width: 10, height: 10, color: '#ef4444', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#ef4444', letterSpacing: '0.06em' }}>Pending Replacement</span>
              </div>
            )}
            <div className="mt-auto flex items-center justify-between gap-2">
              <button onClick={handleClick} className="eq-action-btn" type="button">{t('viewDetails')}</button>
              {onBorrow && !hasActiveRequest ? (
                <button onClick={handleViewAndBorrowClick} className="eq-action-btn eq-action-secondary" type="button">{t('requestForClass')}</button>
              ) : hasActiveRequest ? (
                <div
                  className="flex items-center gap-1.5 text-base font-bold px-2.5 py-1 rounded-lg"
                  style={effectiveBorrowState === 'borrowed' ? {
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.12) 100%)',
                    border: '1px solid rgba(99,102,241,0.30)',
                    color: '#a5b4fc',
                  } : effectiveBorrowState === 'for_replacement' ? {
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(248,113,113,0.10) 100%)',
                    border: '1px solid rgba(239,68,68,0.35)',
                    color: '#fca5a5',
                  } : {
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(251,191,36,0.10) 100%)',
                    border: '1px solid rgba(245,158,11,0.35)',
                    color: '#fbbf24',
                  }}
                >
                  {effectiveBorrowState === 'borrowed'
                    ? <Package className="w-3 h-3 shrink-0" />
                    : effectiveBorrowState === 'for_replacement'
                    ? <AlertTriangle className="w-3 h-3 shrink-0" />
                    : <Clock className="w-3 h-3 shrink-0" />
                  }
                  {effectiveBorrowState === 'borrowed'
                    ? t('currentlyBorrowed')
                    : effectiveBorrowState === 'for_replacement'
                    ? 'For Replacement'
                    : t('pendingRequests')}
                </div>
              ) : (
                <span className="eq-action-meta">{t('requestForClassInApprovals')}</span>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Student / default variant (glassmorphic redesign) ────────────────────
  return (
    <>
      <style>{cardStyles}</style>
      <div
        onClick={handleClick}
        className={`eq-glass-card group min-w-[200px] ${isDark ? 'eq-gd' : 'eq-gl'}`}
      >
        {/* ── Image / placeholder ──────────────────────────── */}
        <div className="relative overflow-hidden shrink-0" style={{ aspectRatio: '4/3' }}>
          {currentImage ? (
            <img
              src={currentImage}
              alt={equipment.name}
              className="eq-card-img w-full h-full object-cover"
            />
          ) : (
            <div className="eq-img-placeholder w-full h-full relative flex items-center justify-center">
              <div className="eq-img-grid" />
              <div className="eq-icon-box relative z-10">
                <Package className="w-9 h-9 text-white/75" />
              </div>
            </div>
          )}

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />

          {/* Category pill */}
          {equipment.category && (
            <span className="eq-cat-pill absolute top-3 left-3 z-10">
              {equipment.category}
            </span>
          )}

          {/* Multi-image navigation */}
          {hasMultipleImages && (
            <>
              <button
                onClick={goToPreviousImage}
                className="eq-nav-btn absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 z-10"
                aria-label={t('previousImage')}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToNextImage}
                className="eq-nav-btn absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 z-10"
                aria-label={t('nextImage')}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute top-2 right-2 z-10 text-[10px] font-medium text-white px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(4px)' }}>
                {currentImageIndex + 1} / {allImages.length}
              </div>
            </>
          )}
        </div>

        {/* ── Content ─────────────────────────────────────── */}
        <div className="flex flex-col flex-1 px-4 pt-3 pb-4 gap-2.5">

          {/* Code tag + dots */}
          <div className="flex items-center justify-between min-h-[22px]">
            {equipment.serialNumber ? (
              <span className={`eq-code-tag ${isDark ? 'eq-code-dark' : 'eq-code-light'}`}>
                {equipment.serialNumber}
              </span>
            ) : (
              <span />
            )}
            <MoreHorizontal className={`w-4 h-4 shrink-0 ${isDark ? 'text-white/20' : 'text-slate-300'}`} />
          </div>

          {/* Title + description */}
          <div className="flex-1">
            <h3 className={`font-bold text-[17px] leading-snug line-clamp-2 ${txt}`} style={{ fontFamily: "'Space Grotesk','Inter',sans-serif" }}>
              {equipment.name}
            </h3>
            {equipment.description && (
              <p className={`text-[13px] mt-1 line-clamp-2 leading-relaxed ${txtsub}`}>
                {equipment.description}
              </p>
            )}
          </div>

          {/* Stats: TOTAL · AVAILABLE · LOCATION */}
          <div className="flex items-end justify-between mt-0.5">
            <div className="flex gap-5">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-0.5 ${txtmuted}`}>
                  {t('total')}
                </p>
                <p className={`text-[22px] font-bold leading-none tabular-nums ${txt}`} style={{ fontFamily: "'Space Grotesk','Poppins',sans-serif" }}>
                  {total}
                </p>
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-0.5 ${txtmuted}`}>
                  {t('availableLabel')}
                </p>
                <p className={`text-[22px] font-bold leading-none tabular-nums ${availTextColor}`} style={{ fontFamily: "'Space Grotesk','Poppins',sans-serif" }}>
                  {available}
                </p>
              </div>
            </div>
            {equipment.location && (
              <div className="text-right">
                <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-0.5 ${txtmuted}`}>
                  Location
                </p>
                <p className={`text-[12px] font-medium leading-tight max-w-[90px] truncate ${txtsub}`} style={{ fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>
                  {equipment.location}
                </p>
              </div>
            )}
          </div>

          {/* Availability bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={`text-[12px] ${txtsub}`}>{t('availability')}</span>
              <span className={`text-[12px] font-bold tabular-nums ${availTextColor}`}>
                {available === 0 ? t('outOfStock') : `${availPct}%`}
              </span>
            </div>
            <div className={`eq-avail-track ${isDark ? 'eq-track-dark' : 'eq-track-light'}`}>
              <div className={`eq-avail-fill ${availColor}`} style={{ width: `${availPct}%` }} />
            </div>
          </div>

          {/* For Replacement notice */}
          {effectiveBorrowState === 'for_replacement' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <AlertTriangle className="w-3 h-3 shrink-0" style={{ color: '#f87171' }} />
              <span className="text-[11px] font-semibold" style={{ color: '#f87171' }}>Pending Replacement — Borrow Again Allowed</span>
            </div>
          )}

          {/* CTA */}
          {canBorrow && (
            <div className="mt-auto pt-0.5">
              {hasActiveRequest ? (
                <div
                  className="w-full flex items-center justify-center gap-2 rounded-xl text-base font-bold cursor-not-allowed"
                  style={effectiveBorrowState === 'borrowed' ? {
                    height: 40,
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.12) 100%)',
                    border: '1px solid rgba(99,102,241,0.30)',
                    color: '#a5b4fc',
                    boxShadow: '0 0 12px rgba(99,102,241,0.12)',
                  } : effectiveBorrowState === 'for_replacement' ? {
                    height: 40,
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(248,113,113,0.10) 100%)',
                    border: '1px solid rgba(239,68,68,0.35)',
                    color: '#fca5a5',
                    boxShadow: '0 0 12px rgba(239,68,68,0.12)',
                  } : {
                    height: 40,
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(251,191,36,0.10) 100%)',
                    border: '1px solid rgba(245,158,11,0.35)',
                    color: '#fbbf24',
                    boxShadow: '0 0 12px rgba(245,158,11,0.12)',
                  }}
                >
                  {effectiveBorrowState === 'borrowed'
                    ? <Package className="w-3.5 h-3.5 shrink-0" />
                    : effectiveBorrowState === 'for_replacement'
                    ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    : <Clock className="w-3.5 h-3.5 shrink-0" />
                  }
                  {effectiveBorrowState === 'borrowed'
                    ? t('currentlyBorrowed')
                    : effectiveBorrowState === 'for_replacement'
                    ? 'For Replacement'
                    : t('borrowPending')}
                </div>
              ) : (
                <button
                  onClick={handleViewAndBorrowClick}
                  disabled={available === 0}
                  className="learn-more-card-btn w-full"
                >
                  <span className="circle" aria-hidden="true">
                    <span className="icon arrow"></span>
                  </span>
                  <span className="button-text">{t('viewAndBorrow')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
