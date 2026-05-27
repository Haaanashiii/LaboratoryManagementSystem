import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Package, ChevronLeft, ChevronRight, MapPin, ShieldCheck, X, ArrowRight, Clock } from 'lucide-react';
import { useTheme } from '@/components/hooks/ThemeContext';
import { useLang } from '@/components/i18n/LangContext';

const conditionDot = {
  Excellent: '#60a5fa',
  Good:      '#4ade80',
  Fair:      '#fbbf24',
  Poor:      '#f87171',
  Damaged:   '#f87171',
};

const modalStyles = `
  @keyframes evm-enter {
    from { opacity: 0; transform: scale(0.97) translateY(10px); }
    to   { opacity: 1; transform: scale(1)    translateY(0);    }
  }
  .evm-modal {
    animation: evm-enter 0.26s cubic-bezier(0.16,1,0.3,1) both;
  }
  .evm-img-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px);
    background-size: 28px 28px;
    pointer-events: none;
  }
  .evm-icon-box {
    padding: 1rem;
    border-radius: 16px;
    background: rgba(255,255,255,0.11);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.20);
    box-shadow: 0 4px 20px rgba(0,0,0,0.28);
  }
  .evm-cat-pill {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.04em;
    padding: 0.22rem 0.7rem;
    border-radius: 6px;
    background: rgba(0,0,0,0.42);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.16);
    color: #e2e8f0;
  }
  .evm-x-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.14);
    color: #e2e8f0;
    transition: background 0.18s ease;
    cursor: pointer;
  }
  .evm-x-btn:hover { background: rgba(0,0,0,0.68); }

  .evm-serial-tag {
    font-size: 9.5px;
    font-family: 'JetBrains Mono','Fira Code',ui-monospace,monospace;
    font-weight: 600;
    letter-spacing: 0.04em;
    padding: 0.18rem 0.55rem;
    border-radius: 5px;
    background: rgba(0,0,0,0.48);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,0.12);
    color: #94a3b8;
  }

  .evm-nav-btn {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.48);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,0.12);
    color: #e2e8f0;
    transition: background 0.18s ease;
    cursor: pointer;
  }
  .evm-nav-btn:hover { background: rgba(0,0,0,0.70); }

  .evm-avail-track {
    height: 6px;
    border-radius: 999px;
    overflow: hidden;
  }
  .evm-avail-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.65s cubic-bezier(0.25,1,0.5,1);
  }

  .evm-close-btn {
    height: 38px;
    padding: 0 18px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    transition: opacity 0.18s ease;
    cursor: pointer;
  }
  .evm-close-btn:hover { opacity: 0.75; }

  .evm-borrow-btn {
    height: 38px;
    padding: 0 18px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #fff;
    background: linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);
    border: none;
    cursor: pointer;
    transition: opacity 0.18s ease;
  }
  .evm-borrow-btn:hover:not(:disabled) { opacity: 0.88; }
  .evm-borrow-btn:disabled { opacity: 0.45; cursor: not-allowed; }
`;

export default function EquipmentViewModal({
  equipment,
  open,
  onClose,
  onBorrow,
  primaryActionLabel,
  onPrimaryAction,
  isPending = false,
  borrowState = 'none',
}) {
  const { isDark } = useTheme();
  const { t } = useLang();
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

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!equipment) return null;

  const currentImage = allImages[currentImageIndex] ?? null;
  const prev = () => setCurrentImageIndex((p) => (p === 0 ? allImages.length - 1 : p - 1));
  const next = () => setCurrentImageIndex((p) => (p === allImages.length - 1 ? 0 : p + 1));

  const available = equipment.available_quantity ?? 0;
  const total     = equipment.total_quantity ?? 1;
  const inUse     = Math.max(0, total - available);
  const availPct  = Math.max(0, Math.min(Math.round((available / (total || 1)) * 100), 100));

  const actionHandler  = onPrimaryAction || onBorrow;
  const isBorrowAction = !onPrimaryAction && typeof onBorrow === 'function';
  const actionLabel    = onPrimaryAction ? (primaryActionLabel || t('takeAction')) : t('viewAndBorrow');

  const effectiveBorrowState = borrowState === 'none' ? (isPending ? 'pending' : 'none') : borrowState;
  const hasActiveRequest = effectiveBorrowState !== 'none';

  const barColor =
    available === 0 ? '#ef4444' :
    availPct <= 30  ? '#f59e0b' :
                      '#22c55e';

  const availColor =
    available === 0 ? (isDark ? 'text-red-400'   : 'text-red-500') :
    availPct <= 30  ? (isDark ? 'text-amber-400' : 'text-amber-600') :
                      (isDark ? 'text-emerald-400' : 'text-emerald-600');

  /* theme tokens */
  const bg       = isDark ? 'rgba(14,14,22,0.96)'  : 'rgba(255,255,255,0.96)';
  const border   = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
  const divider  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const cardBg   = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const cardBdr  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const txt      = isDark ? '#e2e8f0' : '#0f172a';
  const txtsub   = isDark ? '#94a3b8' : '#475569';
  const txtmuted = isDark ? '#64748b' : '#94a3b8';
  const trackBg  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)';
  const closeBg  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const closeBdr = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';

  return (
    <>
      <style>{modalStyles}</style>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent
          hideCloseButton
          className="evm-modal w-[90vw] sm:w-[82vw] max-w-[520px] gap-0 p-0 overflow-hidden"
          style={{
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: '20px',
            boxShadow: isDark
              ? '0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.05)'
              : '0 20px 60px rgba(0,0,0,0.14)',
            maxHeight: 'min(88dvh,88vh)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* ── Image / placeholder area ──────────────────────────────── */}
          <div
            className="relative shrink-0 overflow-hidden"
            style={{
              aspectRatio: '16/9',
              background: 'linear-gradient(135deg, #0f3460 0%, #0e4d6d 55%, #0a2540 100%)',
            }}
          >
            {currentImage ? (
              <img
                src={currentImage}
                alt={equipment.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <div className="evm-img-grid" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="evm-icon-box">
                    <Package className="w-10 h-10 text-white/70" />
                  </div>
                </div>
              </>
            )}

            {/* Bottom gradient */}
            <div
              className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 100%)' }}
            />

            {/* Category pill — top left */}
            {equipment.category && (
              <span className="evm-cat-pill absolute top-3 left-3 z-10 flex items-center gap-1.5">
                {equipment.category}
              </span>
            )}

            {/* X close button — top right */}
            <button
              type="button"
              onClick={onClose}
              className="evm-x-btn absolute top-3 right-3 z-10"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>


            {/* Multi-image navigation */}
            {hasMultipleImages && (
              <>
                <button onClick={prev} aria-label={t('previousImage')} className="evm-nav-btn absolute left-3 top-1/2 -translate-y-1/2 z-10">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={next} aria-label={t('nextImage')} className="evm-nav-btn absolute right-3 top-1/2 -translate-y-1/2 z-10">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
                  {allImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIndex(i)}
                      aria-label={`Image ${i + 1}`}
                      className="rounded-full transition-all"
                      style={{
                        width: i === currentImageIndex ? '1.1rem' : '0.35rem',
                        height: '0.35rem',
                        background: i === currentImageIndex ? '#3b82f6' : 'rgba(148,163,184,0.45)',
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── Scrollable content — overlaps image with glass bg ────── */}
          <div
            className="flex flex-col flex-1 overflow-y-auto relative -mt-8 sm:-mt-10 rounded-t-2xl"
            style={{
              background: isDark
                ? 'rgba(14,14,22,0.82)'
                : 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              borderTop: isDark
                ? '1px solid rgba(255,255,255,0.18)'
                : '1px solid rgba(255,255,255,0.90)',
              borderLeft: `1px solid ${border}`,
              borderRight: `1px solid ${border}`,
              borderBottom: `1px solid ${border}`,
            }}
          >

            {/* Title + description */}
            <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2.5 sm:pb-3" style={{ borderBottom: `1px solid ${divider}` }}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-bold text-[18px] leading-snug" style={{ color: txt, fontFamily: "'Space Grotesk','Inter',sans-serif", letterSpacing: '-0.01em' }}>
                  {equipment.name}
                </h2>
                {equipment.serialNumber && (
                  <span
                    className="shrink-0 text-[9.5px] font-mono font-semibold px-2 py-0.5 rounded mt-0.5"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.09)'}`,
                      color: txtmuted,
                    }}
                  >
                    {equipment.serialNumber}
                  </span>
                )}
              </div>
              {equipment.description && (
                <p className="text-[12.5px] mt-1.5 leading-relaxed" style={{ color: txtsub }}>
                  {equipment.description}
                </p>
              )}
            </div>

            {/* Stats: TOTAL · AVAILABLE · IN USE */}
            <div
              className="grid grid-cols-3 px-3 sm:px-4 py-2.5 sm:py-3"
              style={{ borderBottom: `1px solid ${divider}` }}
            >
              {[
                { label: t('total'),          value: total,     accent: false },
                { label: t('availableLabel'), value: available, accent: true },
                { label: t('inUse'),          value: inUse,     accent: false },
              ].map(({ label, value, accent }, i) => (
                <div key={i} className="flex flex-col" style={{ borderRight: i < 2 ? `1px solid ${divider}` : 'none', paddingRight: i < 2 ? '1rem' : 0, paddingLeft: i > 0 ? '1rem' : 0 }}>
                  <span
                    className="text-[9px] font-bold uppercase tracking-[0.14em] mb-1"
                    style={{ color: txtmuted }}
                  >
                    {label}
                  </span>
                  <span
                    className={`text-[22px] font-bold leading-none tabular-nums ${accent ? availColor : ''}`}
                    style={accent ? {} : { color: txt, fontFamily: "'Space Grotesk','Poppins',sans-serif" }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Meta: LOCATION + CONDITION */}
            {(equipment.location || equipment.condition) && (
              <div
                className="grid grid-cols-2 gap-2 px-3 sm:px-4 py-2.5 sm:py-3"
                style={{ borderBottom: `1px solid ${divider}` }}
              >
                {equipment.location && (
                  <div
                    className="flex items-start gap-2 rounded-xl p-2.5"
                    style={{ background: cardBg, border: `1px solid ${cardBdr}` }}
                  >
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#3b82f6' }} />
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] mb-1" style={{ color: txtmuted }}>
                        {t('location')}
                      </p>
                      <p className="text-[12px] font-semibold leading-snug" style={{ color: txt }}>
                        {equipment.location}
                      </p>
                    </div>
                  </div>
                )}
                {equipment.condition && (
                  <div
                    className="flex items-start gap-2 rounded-xl p-2.5"
                    style={{ background: cardBg, border: `1px solid ${cardBdr}` }}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#8b5cf6' }} />
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] mb-1" style={{ color: txtmuted }}>
                        {t('condition')}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: conditionDot[equipment.condition] || '#94a3b8' }}
                        />
                        <span className="text-[12px] font-semibold" style={{ color: conditionDot[equipment.condition] || txtsub }}>
                          {equipment.condition}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Live availability */}
            <div className="px-3 sm:px-4 py-2.5 sm:py-3" style={{ borderBottom: `1px solid ${divider}` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold" style={{ color: txt }}>
                  {t('liveAvailability') || 'Live availability'}
                </span>
                <span
                  className="text-[13px] font-bold tabular-nums"
                  style={{ color: barColor }}
                >
                  {available === 0 ? '0%' : `${availPct}%`}
                </span>
              </div>
              <div className="evm-avail-track" style={{ background: trackBg }}>
                <div
                  className="evm-avail-fill"
                  style={{
                    width: `${availPct}%`,
                    background: barColor,
                    boxShadow: availPct > 0 ? `0 0 8px ${barColor}55` : 'none',
                  }}
                />
              </div>
              <p className="text-[11px] mt-2" style={{ color: txtmuted }}>
                {available} {t('unitsReady') || 'units ready'} · {inUse} {t('inUseByStudents') || 'in use by other students'}
              </p>
            </div>

            {/* Footer */}
            <div
              className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3"
            >
              {equipment.serialNumber ? (
                <span
                  className="text-[9.5px] font-mono font-semibold px-2 py-0.5 rounded shrink-0"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.09)'}`,
                    color: txtmuted,
                  }}
                >
                  {equipment.serialNumber}
                </span>
              ) : <span />}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="evm-close-btn"
                  style={{ background: closeBg, border: `1px solid ${closeBdr}`, color: txtsub }}
                >
                  {t('close') || 'Close'}
                </button>

                {actionHandler && (
                  hasActiveRequest ? (
                    <div
                      className="flex items-center gap-2 h-[38px] px-4 rounded-[10px] text-[12px] font-semibold shrink-0"
                      style={effectiveBorrowState === 'borrowed' ? {
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.12) 100%)',
                        border: '1px solid rgba(99,102,241,0.30)',
                        color: '#a5b4fc',
                        boxShadow: '0 0 12px rgba(99,102,241,0.15)',
                      } : {
                        background: 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(251,191,36,0.10) 100%)',
                        border: '1px solid rgba(245,158,11,0.35)',
                        color: '#fbbf24',
                        boxShadow: '0 0 12px rgba(245,158,11,0.15)',
                      }}
                    >
                      {effectiveBorrowState === 'borrowed' ? (
                        <Package className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                      )}
                      {effectiveBorrowState === 'borrowed' ? t('currentlyBorrowed') : t('borrowPending')}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { actionHandler(equipment); onClose(); }}
                      disabled={isBorrowAction && available === 0}
                      className="evm-borrow-btn shrink-0"
                    >
                      {isBorrowAction && available === 0 ? t('unavailable') : actionLabel}
                      {!(isBorrowAction && available === 0) && <ArrowRight className="w-3.5 h-3.5" />}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
