import React, { useState } from 'react';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';
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

  const availTextColor =
    available === 0 ? 'text-red-500' :
    availPct <= 30   ? 'text-amber-600' :
                       'text-emerald-600';

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
        className="eq-card group flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all duration-250 hover:-translate-y-1 hover:shadow-lg hover:border-blue-200 cursor-pointer"
      >

        {/* Image area */}
        <div className="relative aspect-[16/10] bg-slate-50 overflow-hidden">
          {currentImage ? (
            <img
              src={currentImage}
              alt={equipment.name}
              className="eq-card-img w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-9 h-9 text-slate-200 transition-colors duration-200 group-hover:text-slate-300" />
            </div>
          )}

          {/* Navigation arrows - visible on hover when multiple images */}
          {hasMultipleImages && (
            <>
              <button
                onClick={goToPreviousImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                aria-label="Next image"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Image counter */}
              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full font-medium">
                {currentImageIndex + 1} / {allImages.length}
              </div>
            </>
          )}

          {/* Category pill — top right */}
          {equipment.category && (
            <span className="absolute top-2 left-2 text-[10px] font-medium text-slate-500 bg-white/90 backdrop-blur-sm border border-slate-100 px-2 py-0.5 rounded-full shadow-sm">
              {equipment.category}
            </span>
          )}

          {/* Slide-in top bar on hover */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-3 gap-1.5">
          <h3 className="font-semibold text-slate-800 text-[13px] leading-snug line-clamp-1">
            {equipment.name}
          </h3>

          {equipment.description && (
            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed flex-1">
              {equipment.description}
            </p>
          )}

          {/* Availability bar */}
          <div className="mt-auto pt-2.5 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Availability</span>
              <span className={`text-[11px] font-semibold ${availTextColor}`}>
                {available === 0 ? 'Out of stock' : `${available} / ${total}`}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`eq-availability-bar-fill h-full rounded-full ${availColor}`}
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
