import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';

export default function EquipmentViewModal({ equipment, open, onClose, onBorrow }) {
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl gap-0 p-0 border-0 overflow-hidden max-h-[80vh]">
        <div className="flex flex-col lg:flex-row h-full">
          {/* Image Section */}
          <div className="w-[500px] bg-slate-50 relative flex-shrink-0">
            <div className="w-[500px] h-[500px] flex items-center justify-center relative">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={equipment.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-24 h-24 text-slate-300" />
                </div>
              )}

              {/* Navigation arrows */}
              {hasMultipleImages && (
                <>
                  <button
                    onClick={goToPreviousImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goToNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Image counter */}
                  <div className="absolute bottom-3 right-3 bg-black/60 text-white text-sm px-3 py-1 rounded-full font-medium">
                    {currentImageIndex + 1} / {allImages.length}
                  </div>
                </>
              )}

              {/* Category badge */}
              {equipment.category && (
                <span className="absolute top-3 left-3 text-xs font-semibold text-slate-700 bg-white/95 px-3 py-1.5 rounded-full shadow-sm">
                  {equipment.category}
                </span>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div className="w-full lg:w-2/5 p-8 lg:p-12 flex flex-col overflow-y-auto bg-white">
            {/* Title and description */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {equipment.name}
              </h2>
              {equipment.description && (
                <p className="text-slate-600 text-sm leading-relaxed">
                  {equipment.description}
                </p>
              )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-200">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Total</p>
                <p className="text-xl font-bold text-slate-900">{total}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Available</p>
                <p className={`text-xl font-bold ${availTextColor}`}>
                  {available}
                </p>
              </div>
              {equipment.location && (
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Location</p>
                  <p className="text-sm font-medium text-slate-900">{equipment.location}</p>
                </div>
              )}
              {equipment.condition && (
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Condition</p>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-block
                    ${equipment.condition === 'Excellent' ? 'bg-blue-100 text-blue-800' : ''}
                    ${equipment.condition === 'Good' ? 'bg-green-100 text-green-800' : ''}
                    ${equipment.condition === 'Fair' ? 'bg-amber-100 text-amber-800' : ''}
                    ${equipment.condition === 'Needs Maintenance' ? 'bg-red-100 text-red-800' : ''}
                  `}>
                    {equipment.condition}
                  </span>
                </div>
              )}
            </div>

            {/* Availability bar */}
            <div className="mb-6">
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

            {/* Action buttons */}
            <div className="flex gap-3 mt-auto">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  onBorrow(equipment);
                  onClose();
                }}
                disabled={available === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {available === 0 ? 'Unavailable' : 'Borrow'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
