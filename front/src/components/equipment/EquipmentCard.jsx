import React from 'react';
import { Button } from '../ui/button';
import { Package } from 'lucide-react';

export default function EquipmentCard({ equipment, onBorrow, onSelect, userRole }) {
  const handleClick = () => {
    if (onBorrow) onBorrow(equipment);
    else if (onSelect) onSelect(equipment);
  };

  // Only students can borrow equipment
  const canBorrow = userRole === 'student';

  const available = equipment.available_quantity ?? 0;
  const total = equipment.total_quantity ?? 0;

  return (
    <div className="border border-slate-200 rounded-lg hover:border-slate-400 transition-colors overflow-hidden flex flex-col bg-white">
      {/* Image / icon area */}
      <div className="aspect-video bg-slate-100 flex items-center justify-center overflow-hidden">
        {equipment.image_url ? (
          <img
            src={equipment.image_url}
            alt={equipment.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="w-10 h-10 text-slate-300" />
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-medium text-slate-900 leading-tight text-sm">{equipment.name}</h3>
          {equipment.category && (
            <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
              {equipment.category}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 line-clamp-2 flex-1 mt-1">{equipment.description}</p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            <span className={available > 0 ? 'font-semibold text-slate-800' : 'font-semibold text-red-500'}>
              {available}
            </span>
            /{total} available
          </span>
          {canBorrow && (
            <Button
              size="sm"
              onClick={handleClick}
              disabled={available === 0}
              className="h-7 text-xs bg-slate-900 hover:bg-slate-700 text-white disabled:opacity-40"
            >
              Borrow
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
