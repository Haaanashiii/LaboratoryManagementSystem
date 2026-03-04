import React from 'react';
import { Badge } from './badge';

const statusConfig = {
  pending_lecturer: { label: 'Pending Lecturer', color: 'bg-yellow-100 text-yellow-800' },
  pending_head: { label: 'Pending Head', color: 'bg-orange-100 text-orange-800' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  ready_pickup: { label: 'Ready for Pickup', color: 'bg-blue-100 text-blue-800' },
  borrowed: { label: 'Borrowed', color: 'bg-purple-100 text-purple-800' },
  returned: { label: 'Returned', color: 'bg-slate-100 text-slate-800' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, color: 'bg-slate-100 text-slate-800' };
  
  return (
    <Badge className={config.color}>
      {config.label}
    </Badge>
  );
}
