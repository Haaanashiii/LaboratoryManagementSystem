import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Package } from 'lucide-react';

export default function EquipmentCard({ equipment, onSelect }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            {equipment.image_url ? (
              <img src={equipment.image_url} alt={equipment.name} className="w-full h-full object-cover rounded-lg" />
            ) : (
              <Package className="w-8 h-8 text-blue-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{equipment.name}</h3>
            <p className="text-sm text-slate-600 line-clamp-2">{equipment.description}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-slate-500">
                Available: {equipment.available_quantity}/{equipment.total_quantity}
              </span>
              <Button
                size="sm"
                onClick={() => onSelect(equipment)}
                disabled={equipment.available_quantity === 0}
                className="bg-blue-600 hover:bg-blue-500"
              >
                Borrow
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
