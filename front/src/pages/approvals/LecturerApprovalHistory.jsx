import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Input } from "@/components/ui/input";
import {
  Search, History, CheckCircle, XCircle, Package, LayoutList,
  User, Clock, Calendar, BookOpen, Printer, Loader2,
  ThumbsUp, RotateCcw
} from 'lucide-react';
import EquimonPageHeader from '@/components/ui/equimon/EquimonPageHeader';
import { format, differenceInDays } from 'date-fns';
import { LecturerApprovalHistorySkeleton } from '@/skeleton-framework/lecturer';
import { printItsReceipt } from '@/utils/printItsReceipt';

const ACCENT = '#2563eb';

const STATUS_FILTERS = [
  {
    key: 'all', label: 'All', statuses: null,
    icon: LayoutList,
    tint: '#f8fafc', fg: '#334155',
    iconColor: '#334155', iconBg: '#e2e8f0',
    countColor: '#0f172a', circleBg: '#94a3b8',
    activeBorder: 'border-slate-400',
  },
  {
    key: 'forwarded', label: 'Forwarded', statuses: ['pending_head', 'head_approved', 'ready_pickup', 'borrowed', 'returned'],
    icon: ThumbsUp,
    tint: '#f0fdf4', fg: '#16a34a',
    iconColor: '#16a34a', iconBg: '#dcfce7',
    countColor: '#15803d', circleBg: '#22c55e',
    activeBorder: 'border-emerald-400',
  },
  {
    key: 'rejected', label: 'Rejected', statuses: ['rejected'],
    icon: XCircle,
    tint: '#fef2f2', fg: '#dc2626',
    iconColor: '#dc2626', iconBg: '#fee2e2',
    countColor: '#b91c1c', circleBg: '#ef4444',
    activeBorder: 'border-red-400',
  },
  {
    key: 'returned', label: 'Returned', statuses: ['returned'],
    icon: RotateCcw,
    tint: '#eff6ff', fg: '#2563eb',
    iconColor: '#2563eb', iconBg: '#dbeafe',
    countColor: '#1d4ed8', circleBg: '#3b82f6',
    activeBorder: 'border-blue-400',
  },
];

const FORWARDED_STATUSES = new Set(['pending_head', 'head_approved', 'ready_pickup', 'borrowed', 'returned']);

const STATUS_LABEL = {
  pending_head:   'Pending Head',
  head_approved:  'Head Approved',
  ready_pickup:   'Ready for Pickup',
  borrowed:       'Borrowed',
  returned:       'Returned',
  rejected:       'Rejected',
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name[0].toUpperCase();
};

const shortReqId = (id, createdDate) => {
  const year = createdDate ? new Date(createdDate).getFullYear() : new Date().getFullYear();
  const suffix = id ? String(id).slice(-4).toUpperCase() : '????';
  return `REQ-${year}-${suffix}`;
};

export default function LecturerApprovalHistory() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [printingId, setPrintingId]   = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: allEquipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.entities.Equipment.list(),
    staleTime: 5 * 60 * 1000,
  });

  const equipmentMap = useMemo(() => {
    const map = {};
    allEquipment.forEach(eq => { map[eq.id] = eq; map[eq._id] = eq; });
    return map;
  }, [allEquipment]);

  const getEquipmentData = (request) => {
    const eqId = request?.equipment?._id || request?.equipment?.id || request?.equipment;
    return eqId ? equipmentMap[eqId] : null;
  };
  const getEquipmentImage = (request) => {
    const eq = getEquipmentData(request);
    return eq?.images_urls?.[0] || eq?.image_url || null;
  };

  const { data: requests = [], isLoading, isError, error } = useQuery({
    queryKey: ['lecturerApprovalHistory', user?.email],
    queryFn: () => api.entities.BorrowRequest.filter({ history: 'true' }, '-created_date'),
    enabled: !!user?.email,
  });

  const activeFilter = STATUS_FILTERS.find(f => f.key === statusFilter) ?? STATUS_FILTERS[0];

  const filteredRequests = requests
    .filter(r => !activeFilter.statuses || activeFilter.statuses.includes(r.status))
    .filter(r =>
      r.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.borrower_name?.toLowerCase().includes(search.toLowerCase())
    );

  const getCount = (filter) =>
    filter.statuses ? requests.filter(r => filter.statuses.includes(r.status)).length : requests.length;

  const fmtDate = (v) => v ? format(new Date(v), 'MMM d, yyyy') : '—';
  const fmtDateTime = (v) => v ? format(new Date(v), 'EEE, MMM d · HH:mm') : '—';

  const handlePrint = (request) => {
    setPrintingId(request.id);
    try {
      printItsReceipt({
        id: request.id,
        equipment_name: request.equipment_name,
        category: request.category || getEquipmentData(request)?.category,
        quantity: request.quantity,
        borrower_name: request.borrower_name,
        student_email: request.student_email || request.borrower_email,
        department: request.department,
        lecturer_name: request.lecturer_name || '',
        purpose: request.purpose,
        created_date: request.created_date || request.createdAt,
        borrow_date: request.borrow_date,
        return_date: request.return_date,
        status: request.status,
        lecturer_approved_at: request.lecturer_approved_at,
        head_approved_at: request.head_approved_at,
        lecturer_remarks: request.lecturer_remarks,
      });
    } finally {
      setPrintingId(null);
    }
  };

  if (isLoading) return <LecturerApprovalHistorySkeleton />;

  return (
    <div className="w-full space-y-4 px-2 py-2">

      <EquimonPageHeader
        accent={ACCENT}
        icon={History}
        title="Approval History"
        badgeCount={filteredRequests.length}
        badge="records"
        sub="All requests you have previously actioned."
      />

      {/* ── Status filter cards ── */}
      <div className="grid grid-cols-4 gap-3">
        {STATUS_FILTERS.map((filter) => {
          const count = getCount(filter);
          const isActive = statusFilter === filter.key;
          const FilterIcon = filter.icon;
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => setStatusFilter(statusFilter === filter.key ? 'all' : filter.key)}
              className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 shadow-sm hover:-translate-y-0.5 hover:shadow-md ${
                isActive ? `${filter.activeBorder} shadow-md` : 'hover:border-slate-300'
              }`}
              style={{
                background: filter.tint,
                borderColor: isActive ? undefined : `${filter.fg}33`,
              }}
            >
              {/* Decorative background circle */}
              <div
                className="absolute -right-5 -bottom-5 w-24 h-24 rounded-full opacity-20"
                style={{ background: filter.circleBg }}
              />

              {/* Active dot */}
              {isActive && (
                <span className="absolute top-3 right-3 w-2 h-2 rounded-full" style={{ background: filter.fg }} />
              )}

              {/* Icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 bg-white/80 shadow-sm"
                style={{ color: filter.iconColor }}
              >
                <FilterIcon className="w-4 h-4" />
              </div>

              {/* Label */}
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                {filter.label}
              </p>

              {/* Count */}
              <p className="text-2xl font-bold leading-none" style={{ color: filter.countColor }}>
                {count}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {activeFilter.key !== 'all' && (
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: activeFilter.dot }} />
          )}
          <p className="text-sm font-semibold text-slate-800">{activeFilter.label}</p>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-600">
            {filteredRequests.length}
          </span>
          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
            >
              clear
            </button>
          )}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search equipment or borrower..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* ── Cards ── */}
      {isError ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-20">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <History className="h-5 w-5 text-red-400" />
          </div>
          <p className="text-sm font-medium text-slate-800">Unable to load history</p>
          <p className="max-w-xs text-center text-xs text-slate-500">
            {error?.message || 'Failed to connect to the server.'}
          </p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-20">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
            {requests.length === 0
              ? <Package className="h-4 w-4 text-slate-400" />
              : <History className="h-4 w-4 text-slate-400" />
            }
          </div>
          <p className="text-sm text-slate-500">{requests.length === 0 ? 'No reviews yet' : 'No results found'}</p>
          <p className="text-xs text-slate-400">
            {requests.length === 0 ? 'Requests you review will appear here.' : 'Try a different filter or search term.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => {
            const img = getEquipmentImage(request);
            const eq  = getEquipmentData(request);
            const category   = request.category || eq?.category;
            const email      = request.student_email || request.borrower_email || '';
            const isForwarded = FORWARDED_STATUSES.has(request.status);
            const borrowDays = request.borrow_date && request.return_date
              ? differenceInDays(new Date(request.return_date), new Date(request.borrow_date))
              : null;
            const decisionDate = request.lecturer_approved_at || request.lecturer_actioned_at;

            return (
              <div
                key={request.id}
                className="relative overflow-hidden flex gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-sm" style={{ background: isForwarded ? '#16a34a' : '#dc2626' }} />
                {/* ── Equipment image ── */}
                <div className="w-16 h-[72px] rounded-xl bg-amber-50 border border-amber-100/80 flex items-center justify-center flex-shrink-0 overflow-hidden self-start mt-1">
                  {img ? (
                    <img src={img} alt={request.equipment_name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-7 h-7 text-amber-300" />
                  )}
                </div>

                {/* ── Main content ── */}
                <div className="flex-1 min-w-0">

                  {/* Tag row */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    {category && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                        {category}
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-500 font-mono border border-indigo-100/60">
                      {shortReqId(request.id, request.created_date || request.createdAt)}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      ×{request.quantity}
                    </span>
                  </div>

                  {/* Equipment name */}
                  <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                    {request.equipment_name}
                  </h3>

                  {/* Remarks (if any) */}
                  {request.lecturer_remarks ? (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed italic">
                      "{request.lecturer_remarks}"
                    </p>
                  ) : request.purpose ? (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {request.purpose}
                    </p>
                  ) : null}

                  {/* Metadata row — labeled columns */}
                  <div className="flex flex-wrap items-start gap-x-6 gap-y-2 mt-3 pt-3 border-t border-slate-100">

                    {/* BORROWER */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 mb-1.5">
                        <User className="w-3 h-3 text-slate-300" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Borrower</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-white"
                          style={{ background: ACCENT }}
                        >
                          {getInitials(request.borrower_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-slate-700 leading-none">{request.borrower_name || '—'}</p>
                          {email && <p className="text-[10px] text-slate-400 leading-none mt-0.5 truncate max-w-[130px]">{email}</p>}
                        </div>
                      </div>
                    </div>

                    {/* COURSE */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 mb-1.5">
                        <BookOpen className="w-3 h-3 text-slate-300" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Course</span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-700 leading-none truncate max-w-[130px]">
                        {request.course || request.subject || request.course_code || '—'}
                      </p>
                      {request.department && (
                        <p className="text-[10px] text-slate-400 leading-none mt-0.5">{request.department}</p>
                      )}
                    </div>

                    {/* PERIOD */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 mb-1.5">
                        <Calendar className="w-3 h-3 text-slate-300" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Period</span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-700 leading-none">
                        {fmtDate(request.borrow_date)}
                      </p>
                      {request.return_date && (
                        <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                          →{fmtDate(request.return_date)}{borrowDays !== null ? ` (${borrowDays}d)` : ''}
                        </p>
                      )}
                    </div>

                    {/* SUBMITTED */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 mb-1.5">
                        <Clock className="w-3 h-3 text-slate-300" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Submitted</span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-700 leading-none">
                        {fmtDateTime(request.created_date || request.createdAt)}
                      </p>
                    </div>

                  </div>
                </div>

                {/* ── Right: decision column ── */}
                <div className="flex flex-col items-stretch gap-1.5 w-40 flex-shrink-0 self-start">

                  {/* Your decision badge */}
                  <div className="flex justify-end mb-0.5">
                    {isForwarded ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                        Forwarded
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                        Rejected
                      </span>
                    )}
                  </div>

                  {/* Overall status */}
                  <div
                    className="flex items-center justify-center h-9 rounded-xl text-xs font-bold border"
                    style={isForwarded
                      ? { background: 'rgba(34,197,94,0.07)', color: '#15803d', borderColor: 'rgba(34,197,94,0.2)' }
                      : { background: 'rgba(239,68,68,0.07)',  color: '#b91c1c', borderColor: 'rgba(239,68,68,0.2)' }
                    }
                  >
                    {STATUS_LABEL[request.status] || request.status}
                  </div>

                  {/* Decision date */}
                  {decisionDate && (
                    <p className="text-[10px] text-slate-400 text-center leading-snug">
                      {format(new Date(decisionDate), 'MMM d, yyyy · HH:mm')}
                    </p>
                  )}

                  {/* Print details */}
                  <button
                    type="button"
                    onClick={() => handlePrint(request)}
                    disabled={printingId === request.id}
                    className="flex items-center justify-center gap-1.5 h-7 rounded-lg text-[11px] text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40 mt-1"
                  >
                    {printingId === request.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Printer className="w-3 h-3" />
                    }
                    Print details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record count footer */}
      {filteredRequests.length > 0 && (
        <p className="text-xs text-slate-400 text-center pb-2">
          Showing {filteredRequests.length} of {requests.length} record{requests.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
