import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Package, ChevronLeft, ChevronRight, MapPin, Layers, BoxSelect } from 'lucide-react';
import { useTheme } from '@/components/hooks/ThemeContext';

/* ─── tiny helpers ────────────────────────────────────────────── */
const conditionMeta = {
  Excellent: {
    dark:  { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.30)',  text: '#93c5fd' },
    light: { bg: '#eff6ff',                border: '#bfdbfe',                text: '#1d4ed8' },
  },
  Good: {
    dark:  { bg: 'rgba(34,197,94,0.13)',   border: 'rgba(34,197,94,0.25)',   text: '#86efac' },
    light: { bg: '#f0fdf4',               border: '#bbf7d0',                text: '#15803d' },
  },
  Fair: {
    dark:  { bg: 'rgba(245,158,11,0.13)',  border: 'rgba(245,158,11,0.25)', text: '#fcd34d' },
    light: { bg: '#fffbeb',               border: '#fde68a',                text: '#b45309' },
  },
  Poor: {
    dark:  { bg: 'rgba(239,68,68,0.13)',   border: 'rgba(239,68,68,0.25)',   text: '#fca5a5' },
    light: { bg: '#fef2f2',               border: '#fecaca',                text: '#b91c1c' },
  },
};

function conditionStyle(condition, isDark) {
  const meta = conditionMeta[condition] || conditionMeta.Poor;
  const t = isDark ? meta.dark : meta.light;
  return { background: t.bg, border: `1px solid ${t.border}`, color: t.text };
}

/* ─── component ───────────────────────────────────────────────── */
export default function EquipmentViewModal({
  equipment,
  open,
  onClose,
  onBorrow,
  primaryActionLabel,
  onPrimaryAction,
  isPending = false,
}) {
  const { isDark } = useTheme();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const allImages =
    (equipment?.images_urls?.length > 0
      ? equipment.images_urls
      : equipment?.image_url
      ? [equipment.image_url]
      : []) ?? [];

  const hasMultipleImages = allImages.length > 1;

  useEffect(() => {
    if (!open || !hasMultipleImages || !equipment) return;
    const id = setInterval(() => {
      setCurrentImageIndex((p) => (p === allImages.length - 1 ? 0 : p + 1));
    }, 3200);
    return () => clearInterval(id);
  }, [open, hasMultipleImages, equipment, allImages.length]);

  useEffect(() => {
    if (open) setCurrentImageIndex(0);
  }, [open, equipment]);

  if (!equipment) return null;

  const currentImage = allImages[currentImageIndex] ?? null;
  const prev = () => setCurrentImageIndex((p) => (p === 0 ? allImages.length - 1 : p - 1));
  const next = () => setCurrentImageIndex((p) => (p === allImages.length - 1 ? 0 : p + 1));

  const available = equipment.available_quantity ?? 0;
  const total     = equipment.total_quantity ?? 1;
  const availPct  = Math.max(0, Math.min(Math.round((available / total) * 100), 100));

  const actionHandler   = onPrimaryAction || onBorrow;
  const isBorrowAction  = !onPrimaryAction && typeof onBorrow === 'function';
  const actionLabel     = onPrimaryAction ? (primaryActionLabel || 'Take action') : 'Borrow';

  const stockColor =
    available === 0  ? { dark: '#f87171', light: '#dc2626' } :
    availPct <= 30   ? { dark: '#fbbf24', light: '#d97706' } :
                       { dark: '#34d399', light: '#059669' };

  const barBg =
    available === 0  ? '#ef4444' :
    availPct <= 30   ? '#f59e0b' :
                       '#22c55e';

  const stockLabel =
    available === 0  ? 'Out of stock' :
    isPending        ? 'Borrow pending' :
    isBorrowAction   ? 'Available to borrow' :
                       'In stock';

  /* theme tokens */
  const T = isDark ? {
    modalBg:       '#0e0e16',
    heroBg:        'linear-gradient(160deg,#0d1117 0%,#0e0e16 100%)',
    heroOverlay:   'linear-gradient(to top, rgba(14,14,22,0.92) 0%, transparent 55%)',
    detailBg:      '#111118',
    divider:       'rgba(255,255,255,0.07)',
    cardBg:        'rgba(255,255,255,0.04)',
    cardBorder:    'rgba(255,255,255,0.08)',
    label:         '#64748b',
    value:         '#e2e8f0',
    muted:         '#94a3b8',
    stockDot:      stockColor.dark,
    stockLabel:    stockColor.dark,
    barTrack:      'rgba(255,255,255,0.08)',
    closeBtnBg:    'rgba(255,255,255,0.05)',
    closeBtnBor:   'rgba(255,255,255,0.10)',
    closeBtnText:  '#94a3b8',
    ctaDisBg:      'rgba(255,255,255,0.05)',
    ctaDisBor:     'rgba(255,255,255,0.08)',
    ctaDisText:    '#475569',
    modalBorder:   'rgba(255,255,255,0.08)',
    shadow:        '0 32px 80px rgba(0,0,0,0.8)',
    navBg:         'rgba(14,14,22,0.70)',
    navBorder:     'rgba(255,255,255,0.12)',
    navColor:      '#e2e8f0',
    catBg:         'rgba(59,130,246,0.14)',
    catBorder:     'rgba(59,130,246,0.28)',
    catColor:      '#93c5fd',
    counterBg:     'rgba(14,14,22,0.75)',
    counterBor:    'rgba(255,255,255,0.08)',
    counterText:   '#94a3b8',
  } : {
    modalBg:       '#ffffff',
    heroBg:        'linear-gradient(160deg,#f0f4ff 0%,#f8fafc 100%)',
    heroOverlay:   'linear-gradient(to top, rgba(248,250,252,0.92) 0%, transparent 55%)',
    detailBg:      '#ffffff',
    divider:       '#e2e8f0',
    cardBg:        '#f8fafc',
    cardBorder:    '#e2e8f0',
    label:         '#94a3b8',
    value:         '#0f172a',
    muted:         '#64748b',
    stockDot:      stockColor.light,
    stockLabel:    stockColor.light,
    barTrack:      '#e2e8f0',
    closeBtnBg:    '#f1f5f9',
    closeBtnBor:   '#e2e8f0',
    closeBtnText:  '#64748b',
    ctaDisBg:      '#f1f5f9',
    ctaDisBor:     '#e2e8f0',
    ctaDisText:    '#94a3b8',
    modalBorder:   '#e2e8f0',
    shadow:        '0 20px 60px rgba(0,0,0,0.12)',
    navBg:         'rgba(255,255,255,0.85)',
    navBorder:     'rgba(0,0,0,0.09)',
    navColor:      '#334155',
    catBg:         'rgba(59,130,246,0.09)',
    catBorder:     'rgba(59,130,246,0.22)',
    catColor:      '#2563eb',
    counterBg:     'rgba(255,255,255,0.88)',
    counterBor:    'rgba(0,0,0,0.07)',
    counterText:   '#64748b',
  };

  return (
    <>
      <style>{`
        @keyframes evm-enter {
          from { opacity: 0; transform: scale(0.96) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="w-[96vw] sm:w-[88vw] max-w-[520px] gap-0 p-0 overflow-hidden"
        style={{
          background: T.modalBg,
          border: `1px solid ${T.modalBorder}`,
          borderRadius: '18px',
          boxShadow: T.shadow,
          maxHeight: '86vh',
          animation: 'evm-enter 0.28s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        {/* ── Hero image ─────────────────────────────────────── */}
        <div
          className="relative w-full overflow-hidden"
          style={{ height: 'clamp(140px, 24vh, 200px)', background: T.heroBg }}
        >
          {currentImage ? (
            <img
              src={currentImage}
              alt={equipment.name}
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center' }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <Package className="w-16 h-16" style={{ color: isDark ? 'rgba(148,163,184,0.25)' : 'rgba(148,163,184,0.45)' }} />
              <span className="text-xs font-medium" style={{ color: T.label }}>No image</span>
            </div>
          )}

          {/* gradient fade into detail panel */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: T.heroOverlay }} />

          {/* category badge */}
          {equipment.category && (
            <span
              className="absolute top-3 left-3 text-[11px] font-semibold px-3 py-1 rounded-full"
              style={{ background: T.catBg, border: `1px solid ${T.catBorder}`, color: T.catColor, backdropFilter: 'blur(6px)' }}
            >
              {equipment.category}
            </span>
          )}

          {/* nav arrows */}
          {hasMultipleImages && (
            <>
              <button onClick={prev} aria-label="Previous image"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-90"
                style={{ background: T.navBg, border: `1px solid ${T.navBorder}`, color: T.navColor, backdropFilter: 'blur(8px)' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={next} aria-label="Next image"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-90"
                style={{ background: T.navBg, border: `1px solid ${T.navBorder}`, color: T.navColor, backdropFilter: 'blur(8px)' }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* dot indicators + counter */}
          {hasMultipleImages && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              {allImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImageIndex(i)}
                  aria-label={`Go to image ${i + 1}`}
                  className="rounded-full transition-all"
                  style={{
                    width: i === currentImageIndex ? '1.25rem' : '0.4rem',
                    height: '0.4rem',
                    background: i === currentImageIndex ? '#3b82f6' : 'rgba(148,163,184,0.45)',
                  }}
                />
              ))}
            </div>
          )}

          {hasMultipleImages && (
            <span
              className="absolute bottom-3 right-3 text-[11px] font-medium px-2.5 py-0.5 rounded-full"
              style={{ background: T.counterBg, border: `1px solid ${T.counterBor}`, color: T.counterText, backdropFilter: 'blur(6px)' }}
            >
              {currentImageIndex + 1} / {allImages.length}
            </span>
          )}
        </div>

        {/* ── Detail panel ────────────────────────────────────── */}
        <div
          className="overflow-y-auto"
          style={{
            background: T.detailBg,
            maxHeight: 'calc(86vh - clamp(140px, 24vh, 200px))',
          }}
        >
          {/* name + stock status */}
          <div className="px-4 pt-3.5 pb-3" style={{ borderBottom: `1px solid ${T.divider}` }}>
            <div className="flex items-start justify-between gap-4">
              <h2
                className="text-base sm:text-lg font-bold leading-snug"
                style={{ color: T.value, letterSpacing: '-0.02em' }}
              >
                {equipment.name}
              </h2>
              <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: T.stockDot, boxShadow: `0 0 6px ${T.stockDot}` }}
                />
                <span className="text-xs font-semibold" style={{ color: T.stockLabel }}>
                  {stockLabel}
                </span>
              </div>
            </div>
            {equipment.description && (
              <p className="text-sm leading-relaxed mt-2" style={{ color: T.muted }}>
                {equipment.description}
              </p>
            )}
          </div>

          {/* stats row */}
          <div className="grid grid-cols-3 divide-x px-0" style={{ borderBottom: `1px solid ${T.divider}`, '--tw-divide-opacity': 1 }}>
            {[
              { label: 'Total', value: total },
              { label: 'Available', value: available, accent: true },
              { label: 'In Use', value: total - available },
            ].map(({ label, value, accent }) => (
              <div key={label} className="flex flex-col items-center py-2.5 gap-0.5" style={{ borderRight: `1px solid ${T.divider}` }}>
                <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: T.label }}>{label}</span>
                <span
                  className="text-lg font-bold tabular-nums"
                  style={{ color: accent ? T.stockLabel : T.value }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* meta fields */}
          <div className="px-4 py-3 space-y-3">
            {(equipment.location || equipment.condition) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {equipment.location && (
                  <div
                    className="flex items-start gap-2.5 rounded-lg p-2.5"
                    style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}
                  >
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#3b82f6' }} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: T.label }}>Location</p>
                      <p className="text-sm font-medium truncate" style={{ color: T.value }}>{equipment.location}</p>
                    </div>
                  </div>
                )}
                {equipment.condition && (
                  <div
                    className="flex items-start gap-2.5 rounded-lg p-2.5"
                    style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}
                  >
                    <Layers className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#8b5cf6' }} />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: T.label }}>Condition</p>
                      <span
                        className="text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block"
                        style={conditionStyle(equipment.condition, isDark)}
                      >
                        {equipment.condition}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* availability bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.label }}>Availability</span>
                <span className="text-xs font-bold tabular-nums" style={{ color: T.stockLabel }}>
                  {available === 0 ? '0%' : `${availPct}%`}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: T.barTrack }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${availPct}%`, background: barBg, boxShadow: availPct > 0 ? `0 0 8px ${barBg}60` : 'none' }}
                />
              </div>
            </div>
          </div>

          {/* action footer */}
          <div
            className="px-4 pb-4 pt-2 flex flex-col sm:flex-row gap-2"
            style={{ borderTop: `1px solid ${T.divider}` }}
          >
            {actionHandler && (
              <button
                onClick={() => { if (!isPending) { actionHandler(equipment); onClose(); } }}
                disabled={isPending || (isBorrowAction && available === 0)}
                className="flex-1 h-9 px-4 rounded-lg font-semibold text-xs transition-all"
                style={
                  isPending
                    ? { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.28)', color: '#f59e0b', cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }
                    : isBorrowAction && available === 0
                    ? { background: T.ctaDisBg, border: `1px solid ${T.ctaDisBor}`, color: T.ctaDisText, cursor: 'not-allowed' }
                    : { background: '#3b82f6', color: '#fff', border: 'none', boxShadow: '0 4px 20px rgba(59,130,246,0.40)' }
                }
              >
                {isPending ? (
                  <><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />Borrow Pending</>
                ) : isBorrowAction && available === 0 ? 'Unavailable' : actionLabel}
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none sm:w-auto h-9 px-4 rounded-lg font-semibold text-xs transition-all"
              style={{ background: T.closeBtnBg, border: `1px solid ${T.closeBtnBor}`, color: T.closeBtnText }}
            >
              Dismiss
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
