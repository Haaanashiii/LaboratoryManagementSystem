import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';

export default function EquipmentViewModal({
  equipment,
  open,
  onClose,
  onBorrow,
  primaryActionLabel,
  onPrimaryAction,
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Get all available images
  const allImages = (equipment?.images_urls && equipment.images_urls.length > 0 
    ? equipment.images_urls 
    : (equipment?.image_url ? [equipment.image_url] : [])) || [];
  
  const hasMultipleImages = allImages.length > 1;

  // Auto-advance slideshow
  useEffect(() => {
    if (!open || !hasMultipleImages || !equipment) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [open, hasMultipleImages, equipment, allImages.length]);

  if (!equipment) return null;

  const currentImage = allImages[currentImageIndex] || null;

  const goToPreviousImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const goToNextImage = () => {
    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const available = equipment.available_quantity ?? 0;
  const total = equipment.total_quantity ?? 1;
  const availPct = Math.max(0, Math.min(Math.round((available / total) * 100), 100));

  const availColor =
    available === 0 ? 'bg-red-400' :
    availPct <= 30   ? 'bg-amber-400' :
                       'bg-emerald-400';

  const availTextColor =
    available === 0 ? 'text-red-500' :
    availPct <= 30   ? 'text-amber-600' :
                       'text-emerald-600';

  const actionHandler = onPrimaryAction || onBorrow;
  const isBorrowAction = !onPrimaryAction && typeof onBorrow === 'function';
  const actionLabel = onPrimaryAction
    ? (primaryActionLabel || 'Take action')
    : 'Borrow';
  const availabilityLabel = available === 0
    ? 'Unavailable'
    : (isBorrowAction ? 'Ready to borrow' : 'Available');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[92vw] sm:w-[86vw] lg:w-[82vw] max-w-[76rem] gap-0 p-0 border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[88vh]">
        <div className="flex flex-col lg:flex-row h-full min-h-0">
          {/* Image Section */}
          <div className="w-full lg:w-[52%] relative flex-shrink-0 bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_35%,#f8fafc_100%)] border-b lg:border-b-0 lg:border-r border-slate-200">
            <div className="w-full h-[40vh] sm:h-[48vh] lg:h-[560px] flex items-center justify-center relative p-4 sm:p-6">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={equipment.name}
                  className="w-full h-full object-contain rounded-xl bg-white/65 shadow-sm"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center rounded-xl bg-white/70 border border-slate-200">
                  <Package className="w-24 h-24 text-slate-300" />
                </div>
              )}

              {/* Navigation arrows */}
              {hasMultipleImages && (
                <>
                  <button
                    onClick={goToPreviousImage}
                    className="absolute left-5 top-1/2 -translate-y-1/2 bg-slate-900/55 hover:bg-slate-900/75 text-white p-2 rounded-full transition-all"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goToNextImage}
                    className="absolute right-5 top-1/2 -translate-y-1/2 bg-slate-900/55 hover:bg-slate-900/75 text-white p-2 rounded-full transition-all"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Image counter */}
                  <div className="absolute bottom-5 right-5 bg-slate-900/70 text-white text-sm px-3 py-1 rounded-full font-medium">
                    {currentImageIndex + 1} / {allImages.length}
                  </div>
                </>
              )}

              {hasMultipleImages && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                  {allImages.map((_, index) => (
                    <span
                      key={index}
                      className={`h-1.5 rounded-full transition-all ${
                        index === currentImageIndex ? 'w-6 bg-slate-800/85' : 'w-2 bg-slate-400/55'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Category badge */}
              {equipment.category && (
                <span className="absolute top-5 left-5 text-xs font-semibold text-slate-700 bg-white/95 px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
                  {equipment.category}
                </span>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div className="w-full lg:w-[48%] min-h-0 flex flex-col bg-white">
            {/* Title and description */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-9">
              <div className="mb-6">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-2xl sm:text-[1.65rem] font-bold text-slate-900 leading-tight">
                    {equipment.name}
                  </h2>
                  <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${availTextColor} bg-slate-100`}>
                    {availabilityLabel}
                  </span>
                </div>
                {equipment.description && (
                  <p className="text-slate-600 text-sm leading-relaxed mt-3">
                    {equipment.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3.5 mb-6">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Units</p>
                  <p className="text-xl font-bold text-slate-900">{total}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Available</p>
                  <p className={`text-xl font-bold ${availTextColor}`}>{available}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {equipment.location && (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Location</p>
                    <p className="text-sm font-medium text-slate-900">{equipment.location}</p>
                  </div>
                )}

                {equipment.condition && (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Condition</p>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-block
                        ${equipment.condition === 'Excellent' ? 'bg-blue-100 text-blue-800' : ''}
                        ${equipment.condition === 'Good' ? 'bg-green-100 text-green-800' : ''}
                        ${equipment.condition === 'Fair' ? 'bg-amber-100 text-amber-800' : ''}
                        ${equipment.condition === 'Needs Maintenance' ? 'bg-red-100 text-red-800' : ''}
                        ${!['Excellent', 'Good', 'Fair', 'Needs Maintenance'].includes(equipment.condition) ? 'bg-slate-100 text-slate-700' : ''}
                      `}
                    >
                      {equipment.condition}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600">Availability</span>
                  <span className={`text-xs font-bold ${availTextColor}`}>
                    {available === 0 ? 'Out of stock' : `${availPct}%`}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${availColor}`}
                    style={{ width: `${availPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 p-4 sm:p-5 bg-white/95">
              <div className="flex flex-col-reverse sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Close
              </Button>
              {actionHandler && (
                <Button
                  onClick={() => {
                    actionHandler(equipment);
                    onClose();
                  }}
                  disabled={isBorrowAction && available === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {isBorrowAction && available === 0 ? 'Unavailable' : actionLabel}
                </Button>
              )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
