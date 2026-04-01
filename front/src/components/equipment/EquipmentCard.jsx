import React, { useState } from 'react';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '@/components/hooks/ThemeContext';
import './ViewBorrowButton.css';

const cardStyles = `
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }

  .eq-card-img {
    transition: transform 0.35s ease;
  } 
  .eq-card:hover .eq-card-img {
    transform: scale(1.04);
  }

  .eq-availability-bar-fill {
    transition: width 0.6s cubic-bezier(0.25, 1, 0.5, 1);
  }

  .eq-card--lecturer {
    background: var(--catalog-surface, #111118);
    border: 1px solid var(--catalog-border, #2a2a3a);
    border-radius: 18px;
    box-shadow: 0 18px 40px rgba(6, 8, 18, 0.35);
    transition: transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
  }

  .eq-card--lecturer:hover {
    transform: translateY(-6px);
    border-color: var(--catalog-border-strong, #3a3a5a);
    box-shadow: 0 24px 60px rgba(6, 8, 18, 0.45);
  }

  .eq-card--lecturer .eq-card-title {
    font-family: var(--font-display, 'Space Grotesk', sans-serif);
    color: var(--catalog-text, #e2e8f0);
  }

  .eq-card--lecturer .eq-card-desc {
    color: var(--catalog-muted, #94a3b8);
  }

  .eq-card--lecturer .eq-card-meta {
    color: var(--catalog-dim, #64748b);
  }

  .eq-card--lecturer .eq-stat {
    background: var(--catalog-surface-2, #1a1a24);
    border: 1px solid var(--catalog-border, #2a2a3a);
    border-radius: 14px;
    padding: 0.75rem;
  }

  .eq-card--lecturer .eq-stat-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--catalog-dim, #64748b);
    font-weight: 700;
  }

  .eq-card--lecturer .eq-stat-value {
    font-size: 20px;
    font-weight: 700;
    color: var(--catalog-text, #e2e8f0);
    margin-top: 0.4rem;
  }

  .eq-card--lecturer .eq-stat-hint {
    font-size: 11px;
    color: var(--catalog-muted, #94a3b8);
    margin-top: 0.35rem;
  }

  .eq-card--lecturer .eq-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 12px;
    font-weight: 600;
    padding: 0.45rem 0.9rem;
    border-radius: 999px;
    border: 1px solid rgba(59, 130, 246, 0.45);
    color: var(--catalog-text, #e2e8f0);
    background: rgba(59, 130, 246, 0.15);
    transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
  }

  .eq-card--lecturer .eq-action-btn:hover {
    transform: translateY(-1px);
    border-color: rgba(59, 130, 246, 0.65);
    box-shadow: 0 10px 20px rgba(6, 8, 18, 0.4);
  }

  .eq-card--lecturer .eq-action-secondary {
    border-color: rgba(34, 197, 94, 0.5);
    background: rgba(34, 197, 94, 0.15);
  }

  /* ── Default (Student) card — dark ── */
  .eq-card {
    --eq-bg: #111118;
    --eq-surface: #1a1a24;
    --eq-border: #2a2a3a;
    --eq-border-hover: #3b82f6;
    --eq-text: #e2e8f0;
    --eq-muted: #94a3b8;
    --eq-dim: #64748b;
    background: var(--eq-bg);
    border: 1px solid var(--eq-border);
    border-radius: 18px;
    box-shadow: 0 8px 32px rgba(4, 6, 15, 0.4), 0 1px 0 rgba(255,255,255,0.04) inset;
    transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  /* ── Default (Student) card — light ── */
  .eq-card--light {
    --eq-bg: #ffffff;
    --eq-surface: #f8fafc;
    --eq-border: #e2e8f0;
    --eq-border-hover: #3b82f6;
    --eq-text: #1e293b;
    --eq-muted: #475569;
    --eq-dim: #64748b;
    background: var(--eq-bg);
    border-color: var(--eq-border);
    box-shadow: none;
  }

  .eq-card--light:hover {
    border-color: rgba(59,130,246,0.5);
    box-shadow: none;
  }

  .eq-card--light::before {
    background: linear-gradient(135deg, rgba(59,130,246,0.04) 0%, transparent 55%);
  }

  .eq-card--light .eq-img-wrap {
    background: linear-gradient(160deg, #f1f5f9 0%, #e2e8f0 100%);
  }

  .eq-card--light .eq-cat-tag {
    background: rgba(255,255,255,0.85);
    border-color: rgba(148,163,184,0.35);
    color: #64748b;
  }

  .eq-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(135deg, rgba(59,130,246,0.06) 0%, transparent 55%);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .eq-card:hover::before {
    opacity: 1;
  }

  .eq-card:hover {
    transform: translateY(-5px);
    border-color: rgba(59,130,246,0.5);
    box-shadow: 0 20px 50px rgba(4, 6, 15, 0.55), 0 0 0 1px rgba(59,130,246,0.18);
  }

  .eq-card .eq-card-name {
    font-family: 'Space Grotesk', 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: var(--eq-text);
    line-height: 1.3;
  }

  .eq-card .eq-card-desc {
    font-size: 11.5px;
    color: var(--eq-muted);
    line-height: 1.65;
  }

  .eq-card .eq-img-wrap {
    background: linear-gradient(160deg, #1a1a2e 0%, #13131e 100%);
    position: relative;
    overflow: hidden;
  }

  .eq-card .eq-cat-tag {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 0.22rem 0.65rem;
    border-radius: 999px;
    background: rgba(10, 10, 20, 0.75);
    border: 1px solid rgba(148,163,184,0.22);
    color: var(--eq-muted);
    backdrop-filter: blur(4px);
  }

  .eq-card .eq-avail-track {
    height: 5px;
    background: rgba(148,163,184,0.15);
    border-radius: 999px;
    overflow: hidden;
  }

  .eq-card .eq-avail-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.55s cubic-bezier(0.25,1,0.5,1);
  }

  .eq-card .eq-avail-label {
    font-size: 11px;
    color: var(--eq-dim);
  }

  .eq-card .eq-qty-row {
    display: flex;
    gap: 0.5rem;
  }

  .eq-card .eq-qty-chip {
    flex: 1;
    background: var(--eq-surface);
    border: 1px solid var(--eq-border);
    border-radius: 12px;
    padding: 0.5rem 0.6rem;
    text-align: center;
  }

  .eq-card .eq-qty-chip-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--eq-dim);
    margin-bottom: 0.2rem;
  }

  .eq-card .eq-qty-chip-value {
    font-size: 18px;
    font-weight: 800;
    color: var(--eq-text);
    line-height: 1;
  }

  .eq-card--lecturer .eq-action-meta {
    font-size: 11px;
    color: var(--catalog-dim, #64748b);
  }

  .eq-card--lecturer .eq-chip {
    font-size: 10px;
    font-weight: 600;
    color: var(--catalog-text, #e2e8f0);
    background: rgba(17, 17, 24, 0.8);
    border: 1px solid var(--catalog-border, #2a2a3a);
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
  }

  .eq-pill {
    font-size: 10px;
    font-weight: 700;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    border: 1px solid transparent;
  }

  .eq-pill-ok {
    color: #86efac;
    background: rgba(34, 197, 94, 0.18);
    border-color: rgba(34, 197, 94, 0.4);
  }

  .eq-pill-warning {
    color: #fde68a;
    background: rgba(245, 158, 11, 0.18);
    border-color: rgba(245, 158, 11, 0.45);
  }

  .eq-pill-danger {
    color: #fecaca;
    background: rgba(239, 68, 68, 0.18);
    border-color: rgba(239, 68, 68, 0.45);
  }

  .eq-availability-track {
    height: 6px;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.18);
    flex: 1;
    overflow: hidden;
  }

  .eq-availability-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.5s ease;
  }

  .eq-nav-btn {
    background: rgba(15, 18, 30, 0.6);
    color: #e2e8f0;
  }

  .eq-image-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(10, 10, 15, 0.05), rgba(10, 10, 15, 0.8));
    pointer-events: none;
  }
`;

export default function EquipmentCard({ equipment, onBorrow, onSelect, userRole, variant = 'default' }) {
  const { isDark } = useTheme();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const isLecturer = variant === 'lecturer';

  const handleClick = () => {
    if (onSelect) onSelect(equipment);
    else if (onBorrow) onBorrow(equipment);
  };

  const handleViewAndBorrowClick = (e) => {
    e.stopPropagation();
    if (onBorrow) onBorrow(equipment);
    else if (onSelect) onSelect(equipment);
  };

  // Get all available images
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
    availPct <= 30   ? 'bg-amber-400' :
                       'bg-emerald-400';

  const availTextColor = isDark
    ? (available === 0 ? 'text-red-400' : availPct <= 30 ? 'text-amber-400' : 'text-emerald-400')
    : (available === 0 ? 'text-red-500' : availPct <= 30 ? 'text-amber-600' : 'text-emerald-600');

  const availabilityLabel =
    available === 0 ? 'Unavailable' :
    availPct <= 30   ? 'Low stock' :
                       'Ready';
  const availabilityTone =
    available === 0 ? 'eq-pill-danger' :
    availPct <= 30   ? 'eq-pill-warning' :
                       'eq-pill-ok';

  const handleViewClick = (event) => {
    event.stopPropagation();
    handleClick();
  };

  if (isLecturer) {
    return (
      <>
        <style>{cardStyles}</style>
        <div
          onClick={handleClick}
          className="eq-card--lecturer group flex flex-col overflow-hidden cursor-pointer"
        >
          <div className="relative aspect-[16/10] overflow-hidden bg-[var(--catalog-surface-2,#1a1a24)]">
            {currentImage ? (
              <img
                src={currentImage}
                alt={equipment.name}
                className="eq-card-img w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-9 h-9 text-slate-600" />
              </div>
            )}

            <div className="eq-image-overlay" />

            {hasMultipleImages && (
              <>
                <button
                  onClick={goToPreviousImage}
                  className="eq-nav-btn absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToNextImage}
                  className="eq-nav-btn absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {equipment.category && (
              <span className="eq-chip absolute top-2 left-2">
                {equipment.category}
              </span>
            )}

            <div className="absolute bottom-3 left-3 right-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="eq-card-meta text-[11px]">Availability</span>
                <span className={`eq-pill ${availabilityTone}`}>{availabilityLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="eq-availability-track">
                  <div
                    className={`eq-availability-fill ${availabilityTone}`}
                    style={{ width: `${availPct}%` }}
                  />
                </div>
                <span className="eq-card-meta text-[11px]">
                  {available} / {total}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 p-4">
            <h3 className="eq-card-title text-[14px] font-semibold leading-snug line-clamp-1">
              {equipment.name}
            </h3>

            {equipment.description && (
              <p className="eq-card-desc text-[12px] line-clamp-2 leading-relaxed">
                {equipment.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="eq-stat">
                <p className="eq-stat-label">Available now</p>
                <p className="eq-stat-value">{available}</p>
                <p className="eq-stat-hint">Check quantity before experiments</p>
              </div>
              <div className="eq-stat">
                <p className="eq-stat-label">Total units</p>
                <p className="eq-stat-value">{total}</p>
                <p className="eq-stat-hint">Verify for lab sessions</p>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between gap-2">
              <button
                onClick={handleViewClick}
                className="eq-action-btn"
                type="button"
              >
                View details
              </button>
              {onBorrow ? (
                <button
                  onClick={handleViewAndBorrowClick}
                  className="eq-action-btn eq-action-secondary"
                  type="button"
                >
                  Request for class
                </button>
              ) : (
                <span className="eq-action-meta">Request for class in approvals</span>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{cardStyles}</style>
      <div
        onClick={handleClick}
        className={`eq-card${isDark ? '' : ' eq-card--light'} group flex flex-col cursor-pointer`}
      >
        {/* Image area */}
        <div className="eq-img-wrap relative aspect-[16/10]">
          {currentImage ? (
            <img
              src={currentImage}
              alt={equipment.name}
              className="eq-card-img w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-10 h-10 text-slate-700" />
            </div>
          )}

          {/* Gradient overlay — lightened in light mode */}
          <div className={`absolute inset-0 pointer-events-none ${isDark ? 'bg-gradient-to-t from-black/60 via-transparent to-transparent' : 'bg-gradient-to-t from-black/20 via-transparent to-transparent'}`} />

          {/* Navigation arrows */}
          {hasMultipleImages && (
            <>
              <button
                onClick={goToPreviousImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/55 hover:bg-black/75 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/55 hover:bg-black/75 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                aria-label="Next image"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                {currentImageIndex + 1} / {allImages.length}
              </div>
            </>
          )}

          {/* Category pill */}
          {equipment.category && (
            <span className="eq-cat-tag absolute top-2 left-2">
              {equipment.category}
            </span>
          )}

          {/* Accent top bar */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-350 origin-left" />
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-4 gap-3">
          {/* Title + description */}
          <div>
            <h3 className="eq-card-name line-clamp-1 mb-1">{equipment.name}</h3>
            {equipment.description && (
              <p className="eq-card-desc line-clamp-2">{equipment.description}</p>
            )}
          </div>

          {/* Quantity chips */}
          <div className="eq-qty-row">
            <div className="eq-qty-chip">
              <p className="eq-qty-chip-label">Total</p>
              <p className="eq-qty-chip-value">{total}</p>
            </div>
            <div className="eq-qty-chip">
              <p className="eq-qty-chip-label">Available</p>
              <p className={`eq-qty-chip-value ${availTextColor}`}>{available}</p>
            </div>
          </div>

          {/* Availability bar */}
          <div className="mt-auto space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="eq-avail-label">Availability</span>
              <span className={`text-[11px] font-bold ${availTextColor}`}>
                {available === 0 ? 'Out of stock' : `${availPct}%`}
              </span>
            </div>
            <div className="eq-avail-track">
              <div
                className={`eq-avail-fill ${availColor}`}
                style={{ width: `${availPct}%` }}
              />
            </div>
          </div>

          {/* Borrow button */}
          {canBorrow && (
            <button
              onClick={handleViewAndBorrowClick}
              disabled={available === 0}
              className="learn-more-card-btn mt-1 w-full"
            >
              <span className="circle" aria-hidden="true">
                <span className="icon arrow"></span>
              </span>
              <span className="button-text">View & Borrow</span>
            </button>
          )}
          
        </div>
      </div>
    </>
  );
}
