import React from 'react';
import { Badge } from './badge';
import { useLang } from '@/components/i18n/LangContext';

const STATUS_COLORS = {
  pending_lecturer: 'bg-yellow-100 text-yellow-800',
  pending_head:     'bg-orange-100 text-orange-800',
  head_approved:    'bg-blue-100 text-blue-800',
  approved:         'bg-green-100 text-green-800',
  rejected:         'bg-red-100 text-red-800',
  ready_pickup:     'bg-blue-100 text-blue-800',
  borrowed:         'bg-purple-100 text-purple-800',
  returned:         'bg-slate-100 text-slate-800',
};

const STATUS_KEYS = {
  pending_lecturer: 'pendingLecturer',
  pending_head:     'pendingHead',
  head_approved:    'headapproved',
  approved:         'approved',
  rejected:         'rejected',
  ready_pickup:     'readyPickup',
  borrowed:         'borrowed',
  returned:         'returned',
};

export default function StatusBadge({ status }) {
  const { t } = useLang();
  const color = STATUS_COLORS[status] || 'bg-slate-100 text-slate-800';
  const label = status ? t(STATUS_KEYS[status] || status) : status;

  return (
    <Badge className={color}>
      {label}
    </Badge>
  );
}
