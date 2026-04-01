import React from 'react';
import { Package } from 'lucide-react';

export default function FeaturedEquipmentCard({ equipment, onClick, isDark = false }) {
  const image =
    (equipment?.images_urls && equipment.images_urls.length > 0 && equipment.images_urls[0]) ||
    equipment?.image_url ||
    null;

  const available = equipment?.available_quantity ?? equipment?.available ?? 0;
  const total = equipment?.total_quantity ?? equipment?.total ?? 0;

  const availPct = total > 0 ? Math.round((available / total) * 100) : 0;

  const barColor =
    available === 0 ? 'bg-red-400' : availPct <= 30 ? 'bg-amber-400' : 'bg-emerald-400';

  const availabilityText = available === 0 ? 'Out of stock' : `${available} available`;
  const availabilityColor =
    available === 0
      ? 'text-red-200'
      : available <= 3
        ? 'text-amber-200'
        : 'text-emerald-200';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left rounded-xl bg-transparent overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-400"
      style={{ border: isDark ? '1px solid #2a2a3a' : '1px solid #e2e8f0' }}
    >
      <div className="relative aspect-square bg-transparent">
        {image ? (
          <img
            src={image}
            alt={equipment?.name || 'Equipment'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-transparent">
            <Package className="w-9 h-9 text-slate-300" />
          </div>
        )}

        {/* Category pill — top left (match EquipmentCard design) */}
        {equipment?.category && (
          <span className="absolute top-2 left-2 text-[10px] font-medium text-slate-500 bg-white/90 backdrop-blur-sm border border-slate-100 px-2 py-0.5 rounded-full shadow-sm">
            {equipment.category}
          </span>
        )}

        {/* Bottom overlay: default dark gradient; hover becomes a white gradient rising from bottom */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-100 group-hover:opacity-0 transition-opacity duration-300" />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="relative">
            <p className="text-sm font-semibold text-white group-hover:text-slate-900 line-clamp-1 transition-colors duration-300">
              {equipment?.name || 'Unnamed equipment'}
            </p>
            <p className={`text-xs font-medium mt-1 ${availabilityColor} group-hover:text-slate-600 transition-colors duration-300`}>
              {availabilityText}
            </p>

            {/* Availability graph */}
            <div className="mt-2 h-1.5 w-full rounded-full bg-white/20 group-hover:bg-slate-200/80 overflow-hidden transition-colors duration-300">
              <div
                className={`h-full ${barColor} rounded-full transition-[width] duration-500`}
                style={{ width: `${availPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
