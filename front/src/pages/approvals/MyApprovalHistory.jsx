import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Search, History, Package, Calendar, CheckCircle, RotateCcw, AlertCircle, Clock, ChevronLeft, ChevronRight, Loader2, Eye, Download } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { StudentApprovalHistorySkeleton } from '@/skeleton-framework/student';
import { useTheme } from '@/components/hooks/ThemeContext';
import { useLang } from '@/components/i18n/LangContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const pageStyles = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .hist-fade-up { opacity: 0; animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
  .hist-fade-1  { animation-delay: 0.04s; }
  .hist-fade-2  { animation-delay: 0.10s; }
  .hist-fade-3  { animation-delay: 0.16s; }

  .hist-card {
    transition: box-shadow 0.2s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1), border-color 0.2s ease;
  }
  .hist-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px -8px rgba(0,0,0,0.10);
  }
  .hist-dark .hist-card:hover {
    box-shadow: 0 8px 24px -8px rgba(0,0,0,0.40);
  }
  .hist-dark .hist-hero {
    background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 45%, #3730a3 100%) !important;
  }

  @keyframes heroGlow {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50%       { opacity: 1;   transform: scale(1.08); }
  }
  .hist-orb   { animation: heroGlow 6s ease-in-out infinite; }
  .hist-orb-2 { animation: heroGlow 8s ease-in-out infinite reverse; }

  .hist-chip {
    position: relative;
    transition: color 0.2s ease;
    font-size: 0.8125rem;
    font-weight: 600;
    padding: 0.4rem 1rem;
    border-radius: 999px;
    cursor: pointer;
    border: none;
    background: transparent;
    outline: none;
  }
  .hist-chip.active-light  { background: white; color: #1e3a5f; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .hist-chip.active-dark   { background: rgba(255,255,255,0.10); color: #e2e8f0; }
  .hist-chip.inactive-light { color: #64748b; }
  .hist-chip.inactive-dark  { color: #475569; }
`;

const PAGE_SIZE = 10;
const RECENT_WINDOW_DAYS = 30;
const RECENTLY_BORROWED_STATUSES = ['borrowed', 'returned'];
const ACTIVE_BLOCKING_STATUSES = ['pending_lecturer', 'pending_head', 'head_approved', 'ready_pickup', 'borrowed'];
const PENDING_STAGE_LABELS = {
  pending_lecturer: 'Pending lecturer approval',
  pending_head: 'Pending head approval',
  head_approved: 'Approved and waiting for release',
  ready_pickup: 'Ready for pickup',
  borrowed: 'Currently borrowed',
};

const STATUS_FILTERS = [
  { key: 'all',      label: 'All',       statuses: null },
  { key: 'pending',  label: 'Pending',   statuses: ['pending_lecturer', 'pending_head'] },
  { key: 'approved', label: 'Approved',  statuses: ['head_approved', 'ready_pickup'] },
  { key: 'borrowed', label: 'Borrowed',  statuses: ['borrowed'] },
  { key: 'returned', label: 'Returned',  statuses: ['returned'] },
  { key: 'rejected', label: 'Rejected',  statuses: ['rejected'] },
  { key: 'recently_borrowed', label: 'Recently Borrowed', statuses: RECENTLY_BORROWED_STATUSES },
];

const getEquipmentId = (request) => {
  if (!request) return null;
  if (typeof request.equipment === 'string') return request.equipment;
  return request.equipment?._id || request.equipment?.id || null;
};

const getDefaultBorrowAgainForm = (request) => ({
  quantity: String(request?.quantity || 1),
  purpose: '',
  borrow_date: format(new Date(), 'yyyy-MM-dd'),
  return_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
  lecturer_id: request?.lecturer?._id || request?.lecturer?.id || '',
  agree_policy: false,
});

const getRequestTimestamp = (request) => {
  return new Date(
    request?.updatedAt ||
    request?.created_date ||
    request?.createdAt ||
    request?.borrow_date ||
    0
  ).getTime();
};

const isRecentlyBorrowed = (request) => {
  if (!RECENTLY_BORROWED_STATUSES.includes(request?.status)) {
    return false;
  }

  const requestDate = new Date(request?.borrow_date || request?.created_date || request?.createdAt || 0);
  if (Number.isNaN(requestDate.getTime())) {
    return false;
  }

  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - RECENT_WINDOW_DAYS);
  return requestDate >= cutoff;
};

export default function ApprovalHistory() {
  const { t } = useLang();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [borrowAgainMessage, setBorrowAgainMessage] = useState(null);
  const [confirmBorrowAgainRequest, setConfirmBorrowAgainRequest] = useState(null);
  const [borrowAgainForm, setBorrowAgainForm] = useState(getDefaultBorrowAgainForm(null));
  const [borrowAgainQuantityNotice, setBorrowAgainQuantityNotice] = useState('');
  const [borrowAgainLecturerNotice, setBorrowAgainLecturerNotice] = useState('');
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const { isDark } = useTheme();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: requests = [], isLoading, isError, error } = useQuery({
    queryKey: ['myRequests'],
    queryFn: () => api.entities.BorrowRequest.myRequests(),
    enabled: !!user && user.role === 'student',
  });

  const { data: equipmentList = [] } = useQuery({
    queryKey: ['equipmentListForBorrowAgain'],
    queryFn: () => api.entities.Equipment.list(),
    enabled: !!user && user.role === 'student',
  });

  const {
    data: lecturers = [],
    isLoading: lecturersLoading,
    isError: lecturersError,
  } = useQuery({
    queryKey: ['lecturerList'],
    queryFn: () => api.entities.User.byRole('lecturer'),
    enabled: !!user && user.role === 'student',
  });

  const equipmentById = new Map(
    equipmentList
      .filter((item) => item?.id)
      .map((item) => [String(item.id), item])
  );

  const hasLecturers = lecturers.length > 0;

  const activeRequestByEquipment = requests.reduce((acc, request) => {
    if (!ACTIVE_BLOCKING_STATUSES.includes(request.status)) {
      return acc;
    }

    const equipmentId = getEquipmentId(request);
    if (!equipmentId) {
      return acc;
    }

    const key = String(equipmentId);
    const existing = acc.get(key);
    if (!existing || getRequestTimestamp(request) > getRequestTimestamp(existing)) {
      acc.set(key, request);
    }
    return acc;
  }, new Map());

  const borrowAgainMutation = useMutation({
    mutationFn: ({ request, formData }) => {
      const equipmentId = getEquipmentId(request);
      if (!equipmentId) {
        throw new Error('Unable to identify equipment for this request.');
      }

      const activeRequest = activeRequestByEquipment.get(String(equipmentId));
      if (activeRequest && activeRequest.id !== request.id) {
        throw new Error('This equipment already has an active request. Please check your pending requests.');
      }

      const parsedQuantity = Number.parseInt(String(formData.quantity), 10);
      if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
        throw new Error('Please enter a valid quantity (minimum 1).');
      }

      if (!formData.purpose?.trim()) {
        throw new Error('Purpose is required.');
      }

      if (!formData.lecturer_id) {
        throw new Error('Please select a lecturer for approval.');
      }

      if (!formData.agree_policy) {
        throw new Error('You must agree to the replacement policy before submitting.');
      }

      return api.entities.BorrowRequest.create({
        equipment: equipmentId,
        quantity: parsedQuantity,
        purpose: formData.purpose.trim(),
        borrow_date: formData.borrow_date,
        return_date: formData.return_date,
        agree_policy: formData.agree_policy,
        lecturer_id: formData.lecturer_id,
      });
    },
    onSuccess: () => {
      setBorrowAgainMessage({ type: 'success', text: 'Borrow request submitted. You can track it in Pending.' });
      queryClient.invalidateQueries({ queryKey: ['myRequests'] });
      setStatusFilter('pending');
      setPage(1);
    },
    onError: (mutationError) => {
      setBorrowAgainMessage({
        type: 'error',
        text: mutationError?.message || 'Failed to submit borrow request. Please try again.',
      });
    },
  });

  const handlePdf = async (requestId, borrowerName, mode) => {
    setPdfLoadingId(`${requestId}-${mode}`);
    try {
      const blob = await api.entities.BorrowRequest.getPdfBlob(requestId, mode === 'preview');
      const url = URL.createObjectURL(blob);
      if (mode === 'preview') {
        window.open(url, '_blank');
      } else {
        const safeName = (borrowerName || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
        const dateStr = new Date().toISOString().slice(0, 10);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BorrowRequest_${safeName}_${dateStr}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      console.error('PDF failed:', err);
    } finally {
      setPdfLoadingId(null);
    }
  };

  const activeFilter = STATUS_FILTERS.find(f => f.key === statusFilter) || STATUS_FILTERS[0];

  let filteredRequests = requests
    .filter(r => {
      if (statusFilter === 'recently_borrowed') {
        return isRecentlyBorrowed(r);
      }
      return !activeFilter.statuses || activeFilter.statuses.includes(r.status);
    })
    .filter(r =>
      r.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.borrower_name?.toLowerCase().includes(search.toLowerCase())
    );

  if (statusFilter === 'recently_borrowed') {
    filteredRequests = [...filteredRequests].sort((a, b) => {
      const firstDate = new Date(a.borrow_date || a.created_date || a.createdAt || 0).getTime();
      const secondDate = new Date(b.borrow_date || b.created_date || b.createdAt || 0).getTime();
      return secondDate - firstDate;
    });
  }

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRequests = filteredRequests.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalCount    = requests.length;
  const returnedCount = requests.filter(r => r.status === 'returned').length;
  const pendingCount  = requests.filter(r => r.status === 'pending_lecturer' || r.status === 'pending_head').length;

  if (isLoading) return <StudentApprovalHistorySkeleton />;

  if (isError) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border mx-2 ${isDark ? 'bg-[#0d0d14] border-white/[0.08]' : 'bg-white border-slate-200'}`}>
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
            <History className="w-6 h-6 text-red-500" />
          </div>
          <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{t('unableLoadHistory')}</p>
          <p className={`text-xs max-w-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            {error?.message || 'Failed to connect to the server. Please check your connection and try again.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-5 ${isDark ? 'hist-dark' : ''}`}>
      <style>{pageStyles}</style>

      {/* ── HERO BANNER ─────────────────────────────────────────── */}
      <div className="hist-fade-up hist-fade-1 hist-hero relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-6 shadow-xl">
        <div className="hist-orb   absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="hist-orb-2 absolute -bottom-14 -left-8  w-44 h-44 rounded-full bg-indigo-400/20 pointer-events-none" />
        <div className="absolute top-4 right-28 w-2.5 h-2.5 rounded-full bg-white/30 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-blue-200 text-[10px] font-semibold uppercase tracking-widest mb-1">{t('equipmentBorrowing')}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{t('myHistory')}</h1>
            <p className="text-blue-200 text-sm mt-1.5 max-w-sm">
              {t('myHistoryDesc')}
            </p>
          </div>

          {/* Quick stat pills */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Total',    value: totalCount },
              { label: 'Returned', value: returnedCount },
              { label: 'Pending',  value: pendingCount },
            ].map(s => (
              <div key={s.label} className={`rounded-xl px-3 py-2 text-center min-w-[60px] border shadow-sm ${isDark ? 'bg-[#0d0d14] border-white/[0.08]' : 'bg-white/20 backdrop-blur-sm border-white/20'}`}>
                <p className="text-lg font-black leading-none text-white">{s.value}</p>
                <p className={`text-[9px] font-semibold uppercase tracking-wide mt-0.5 ${isDark ? 'text-slate-500' : 'text-blue-200'}`}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FILTERS + SEARCH ────────────────────────────────────── */}
      <div className="hist-fade-up hist-fade-2 flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Status chip filters */}
        <div className={`inline-flex gap-1 p-1 rounded-xl flex-shrink-0 ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
          {STATUS_FILTERS.map(f => {
            const count = f.key === 'recently_borrowed'
              ? requests.filter(isRecentlyBorrowed).length
              : f.statuses
                ? requests.filter(r => f.statuses.includes(r.status)).length
                : requests.length;
            return (
              <button
                key={f.key}
                onClick={() => { setStatusFilter(f.key); setPage(1); }}
                className={`hist-chip ${statusFilter === f.key
                  ? isDark ? 'active-dark' : 'active-light'
                  : isDark ? 'inactive-dark' : 'inactive-light'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-bold w-4 h-4 ${
                  statusFilter === f.key
                    ? isDark ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                    : isDark ? 'bg-white/10 text-slate-500' : 'bg-slate-200 text-slate-500'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <input
            type="text"
            placeholder={t('searchEquipment')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={`w-full pl-9 pr-4 py-2 text-sm rounded-xl border outline-none transition-colors ${
              isDark
                ? 'bg-white/[0.06] border-white/[0.08] text-slate-200 placeholder-slate-600 focus:border-blue-500/50'
                : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-400'
            }`}
          />
        </div>
      </div>

      {borrowAgainMessage && (
        <div className={`hist-fade-up rounded-xl border px-3 py-2 text-sm ${
          borrowAgainMessage.type === 'success'
            ? isDark
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : isDark
              ? 'border-red-500/30 bg-red-500/10 text-red-300'
              : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {borrowAgainMessage.text}
        </div>
      )}

      {/* ── CARDS LIST ──────────────────────────────────────────── */}
      <div className="hist-fade-up hist-fade-3 space-y-3">
        {filteredRequests.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed text-center ${
            isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/60'
          }`}>
            <History className={`w-10 h-10 mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            <p className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t('noRequestsFound')}</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              {search ? t('tryDifferentFilterOrSearch') : t('approvalHistoryEmptyHint')}
            </p>
          </div>
        ) : (
          pagedRequests.map((request) => {
            const isRejected = request.status === 'rejected';
            const isReturned = request.status === 'returned';
            const returnTiming = request.return_timing || (request.returned_early ? 'early' : null);
            const equipmentId = getEquipmentId(request);
            const activeRequest = equipmentId ? activeRequestByEquipment.get(String(equipmentId)) : null;
            const hasBlockingActiveRequest = !!activeRequest && activeRequest.id !== request.id;
            const pendingSignalText = hasBlockingActiveRequest
              ? PENDING_STAGE_LABELS[activeRequest.status] || 'Pending'
              : null;
            const canBorrowAgain = RECENTLY_BORROWED_STATUSES.includes(request.status) && !!equipmentId;
            const isBorrowAgainLoading = borrowAgainMutation.isPending && borrowAgainMutation.variables?.request?.id === request.id;

            return (
              <div
                key={request.id}
                className={`hist-card rounded-2xl border ${
                  isDark
                    ? 'bg-[#0d0d14] border-white/[0.08] hover:border-white/[0.16]'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Icon accent */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isRejected
                        ? 'bg-red-500/10'
                        : isReturned
                        ? 'bg-emerald-500/10'
                        : 'bg-blue-500/10'
                    }`}>
                      {isRejected
                        ? <AlertCircle className="w-5 h-5 text-red-500" />
                        : isReturned
                        ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                        : <Package className="w-5 h-5 text-blue-500" />
                      }
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <h3 className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {request.equipment_name}
                          </h3>
                          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {t('qty')}: {request.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={request.status} />
                          {isReturned && returnTiming === 'early' && (
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${isDark ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                              Returned Early
                            </span>
                          )}
                          {isReturned && returnTiming === 'late' && (
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${isDark ? 'border-red-500/40 bg-red-500/15 text-red-300' : 'border-red-200 bg-red-50 text-red-700'}`}>
                              Returned Late
                            </span>
                          )}
                          {isReturned && returnTiming === 'on_time' && (
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${isDark ? 'border-blue-500/40 bg-blue-500/15 text-blue-300' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                              Returned On Time
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Date + remarks row */}
                      <div className={`mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {request.borrow_date && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(request.borrow_date), 'MMM d, yyyy')}
                          </span>
                        )}
                        {request.return_date && (
                          <span className="flex items-center gap-1.5">
                            <RotateCcw className="w-3.5 h-3.5" />
                            {t('returns')}: {format(new Date(request.return_date), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>

                      {/* Remarks */}
                      {request.lecturer_remarks && (
                        <div className={`mt-3 rounded-xl px-3 py-2.5 text-xs flex items-start gap-2 ${
                          isDark ? 'bg-white/[0.04] text-slate-400' : 'bg-slate-50 text-slate-500 border border-slate-100'
                        }`}>
                          <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-400" />
                          <span><span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{t('remarks')}: </span>{request.lecturer_remarks}</span>
                        </div>
                      )}

                      {isRejected && request.rejection_reason && (
                        <div className={`mt-3 rounded-xl px-3 py-2.5 text-xs flex items-start gap-2 ${
                          isDark ? 'bg-red-950/40 text-red-300 border border-red-900/40' : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span><span className="font-semibold">Rejection reason: </span>{request.rejection_reason}</span>
                        </div>
                      )}

                      {hasBlockingActiveRequest && (
                        <div className={`mt-3 rounded-xl px-3 py-2.5 text-xs flex items-start gap-2 ${
                          isDark ? 'bg-amber-500/10 text-amber-200 border border-amber-500/30' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span>
                            Active request in progress: <span className="font-semibold">{pendingSignalText}</span>. Borrow again is disabled until this one is completed or rejected.
                          </span>
                        </div>
                      )}

                      {/* ── Card action strip: PDF + Borrow Again ── */}
                      <div className={`mt-3 pt-3 border-t flex items-center justify-between gap-2 flex-wrap ${
                        isDark ? 'border-white/[0.06]' : 'border-slate-100'
                      }`}>
                        {/* PDF buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePdf(request.id, request.borrower_name, 'preview')}
                            disabled={!!pdfLoadingId}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                              isDark
                                ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20'
                                : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100'
                            }`}
                          >
                            {pdfLoadingId === `${request.id}-preview` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                            Preview PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePdf(request.id, request.borrower_name, 'download')}
                            disabled={!!pdfLoadingId}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                              isDark
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {pdfLoadingId === `${request.id}-download` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            Download PDF
                          </button>
                        </div>

                        {/* Borrow Again */}
                        {canBorrowAgain && (
                          <button
                            type="button"
                            onClick={() => {
                              setBorrowAgainMessage(null);
                              setConfirmBorrowAgainRequest(request);
                              setBorrowAgainForm(getDefaultBorrowAgainForm(request));
                              setBorrowAgainQuantityNotice('');
                              setBorrowAgainLecturerNotice('');
                            }}
                            disabled={borrowAgainMutation.isPending || hasBlockingActiveRequest}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                              isDark
                                ? 'bg-blue-600 text-white hover:bg-blue-500'
                                : 'bg-slate-900 text-white hover:bg-blue-600'
                            }`}
                          >
                            {isBorrowAgainLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                            {isBorrowAgainLoading ? t('submitting') : t('borrowAgain')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredRequests.length)} of {filteredRequests.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
                  safePage === 1
                    ? isDark ? 'border-white/[0.06] text-slate-700 cursor-not-allowed' : 'border-slate-200 text-slate-300 cursor-not-allowed'
                    : isDark ? 'border-white/[0.10] text-slate-300 hover:bg-white/[0.06]' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-semibold transition-colors ${
                    p === safePage
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : isDark ? 'border-white/[0.10] text-slate-400 hover:bg-white/[0.06]' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
                  safePage === totalPages
                    ? isDark ? 'border-white/[0.06] text-slate-700 cursor-not-allowed' : 'border-slate-200 text-slate-300 cursor-not-allowed'
                    : isDark ? 'border-white/[0.10] text-slate-300 hover:bg-white/[0.06]' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={!!confirmBorrowAgainRequest}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmBorrowAgainRequest(null);
            setBorrowAgainForm(getDefaultBorrowAgainForm(null));
            setBorrowAgainQuantityNotice('');
            setBorrowAgainLecturerNotice('');
          }
        }}
      >
        <AlertDialogContent className={isDark ? 'bg-[#111118] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}>
          <AlertDialogHeader>
            <AlertDialogTitle>Borrow Again</AlertDialogTitle>
            <AlertDialogDescription className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              Are you sure you want to borrow {confirmBorrowAgainRequest?.equipment_name || 'this equipment'} again?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className={`text-[11px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Quantity
              </Label>
              <Input
                type="number"
                min="1"
                inputMode="numeric"
                value={borrowAgainForm.quantity}
                onChange={(e) => {
                  const nextQuantity = e.target.value;
                  setBorrowAgainForm((prev) => ({ ...prev, quantity: nextQuantity }));

                  if (!confirmBorrowAgainRequest) {
                    return;
                  }

                  const equipmentId = getEquipmentId(confirmBorrowAgainRequest);
                  const availableQty = Number(equipmentById.get(String(equipmentId))?.available_quantity ?? 0);
                  const parsedQuantity = Number.parseInt(nextQuantity, 10);

                  if (nextQuantity === '') {
                    setBorrowAgainQuantityNotice('Please enter a quantity.');
                    return;
                  }

                  if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
                    setBorrowAgainQuantityNotice('Please enter a valid quantity (minimum 1).');
                    return;
                  }

                  if (availableQty > 0 && parsedQuantity > availableQty) {
                    setBorrowAgainQuantityNotice(`Quantity exceeded. Only ${availableQty} item${availableQty === 1 ? '' : 's'} available.`);
                    return;
                  }

                  setBorrowAgainQuantityNotice('');
                }}
                className={`rounded-md text-sm ${isDark ? 'bg-white/5 border-white/10 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}
              />
              {borrowAgainQuantityNotice && (
                <p className="text-[11px] text-red-500">{borrowAgainQuantityNotice}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className={`text-[11px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Borrow Date
                </Label>
                <Input
                  type="date"
                  value={borrowAgainForm.borrow_date}
                  onChange={(e) => setBorrowAgainForm((prev) => ({ ...prev, borrow_date: e.target.value }))}
                  className={`rounded-md text-sm ${isDark ? 'bg-white/5 border-white/10 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}
                  style={isDark ? { colorScheme: 'dark' } : { colorScheme: 'light' }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={`text-[11px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Return Date
                </Label>
                <Input
                  type="date"
                  value={borrowAgainForm.return_date}
                  onChange={(e) => setBorrowAgainForm((prev) => ({ ...prev, return_date: e.target.value }))}
                  className={`rounded-md text-sm ${isDark ? 'bg-white/5 border-white/10 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}
                  style={isDark ? { colorScheme: 'dark' } : { colorScheme: 'light' }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={`text-[11px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Purpose
              </Label>
              <Textarea
                value={borrowAgainForm.purpose}
                onChange={(e) => setBorrowAgainForm((prev) => ({ ...prev, purpose: e.target.value }))}
                placeholder="Briefly explain why you need this equipment..."
                rows={3}
                className={`rounded-md text-sm resize-none ${isDark ? 'bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400'}`}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={`text-[11px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Approving Lecturer
              </Label>
              <select
                value={borrowAgainForm.lecturer_id}
                onChange={(e) => {
                  setBorrowAgainLecturerNotice('');
                  setBorrowAgainForm((prev) => ({ ...prev, lecturer_id: e.target.value }));
                }}
                disabled={lecturersLoading || !hasLecturers}
                className={`h-9 w-full rounded-md border text-sm ${isDark ? 'bg-white/5 border-white/10 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} ${lecturersLoading || !hasLecturers ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <option value="" disabled>
                  {lecturersLoading ? 'Loading lecturers...' : 'Select a lecturer'}
                </option>
                {lecturers.map((lecturer) => (
                  <option key={lecturer.id} value={lecturer.id}>
                    {lecturer.name} ({lecturer.email})
                  </option>
                ))}
              </select>
              {lecturersError && (
                <p className="text-[11px] text-red-500">Unable to load lecturers. Please refresh and try again.</p>
              )}
              {!lecturersError && !lecturersLoading && !hasLecturers && (
                <p className="text-[11px] text-red-500">No lecturers are available for approval.</p>
              )}
              {borrowAgainLecturerNotice && (
                <p className="text-[11px] text-red-500">{borrowAgainLecturerNotice}</p>
              )}
            </div>

            <label className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
              isDark ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}>
              <input
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5"
                checked={borrowAgainForm.agree_policy}
                onChange={(e) => setBorrowAgainForm((prev) => ({ ...prev, agree_policy: e.target.checked }))}
              />
              <span>
                Damaged or lost items must be replaced by the borrower. I understand and accept this responsibility.
              </span>
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmBorrowAgainRequest(null);
                setBorrowAgainForm(getDefaultBorrowAgainForm(null));
                setBorrowAgainQuantityNotice('');
                setBorrowAgainLecturerNotice('');
              }}
              className={isDark ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10' : ''}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmBorrowAgainRequest) {
                  return;
                }
                const requestToSubmit = confirmBorrowAgainRequest;
                const parsedQuantity = Number.parseInt(String(borrowAgainForm.quantity), 10);
                if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
                  setBorrowAgainMessage({ type: 'error', text: 'Please enter a valid quantity.' });
                  return;
                }

                if (!borrowAgainForm.purpose.trim()) {
                  setBorrowAgainMessage({ type: 'error', text: 'Purpose is required.' });
                  return;
                }

                if (!borrowAgainForm.lecturer_id) {
                  setBorrowAgainLecturerNotice('Please select a lecturer for approval.');
                  return;
                }

                if (!borrowAgainForm.agree_policy) {
                  setBorrowAgainMessage({ type: 'error', text: 'Please agree to the replacement policy before submitting.' });
                  return;
                }

                if (borrowAgainForm.return_date <= borrowAgainForm.borrow_date) {
                  setBorrowAgainMessage({ type: 'error', text: 'Return date must be after borrow date.' });
                  return;
                }

                setConfirmBorrowAgainRequest(null);
                setBorrowAgainMessage(null);
                setBorrowAgainForm(getDefaultBorrowAgainForm(null));
                setBorrowAgainQuantityNotice('');
                setBorrowAgainLecturerNotice('');
                borrowAgainMutation.mutate({ request: requestToSubmit, formData: borrowAgainForm });
              }}
              disabled={borrowAgainMutation.isPending || lecturersLoading || lecturersError || !borrowAgainForm.purpose.trim() || !borrowAgainForm.agree_policy || !borrowAgainForm.lecturer_id || !hasLecturers}
              className="inline-flex items-center gap-1.5"
            >
              {borrowAgainMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {borrowAgainMutation.isPending ? t('submitting') : 'Submit Request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}