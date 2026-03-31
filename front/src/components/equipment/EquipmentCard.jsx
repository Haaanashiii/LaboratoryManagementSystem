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
`;

export default function EquipmentCard({ equipment, onBorrow, onSelect, userRole }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
  const availPct = Math.round((available / total) * 100);

  const availColor =
    available === 0 ? 'bg-red-400' :
    availPct <= 30   ? 'bg-amber-400' :
                       'bg-emerald-400';

  const availTextColor =
    available === 0 ? 'text-red-500' :
    availPct <= 30   ? 'text-amber-600' :
                       'text-emerald-600';

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
