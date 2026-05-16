import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Package, CheckCircle, XCircle, Loader2, Search, ShieldCheck,
  ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, ArrowUp, ArrowDown,
  User, Clock, Calendar, Hash, Eye, Printer, ChevronRight as ArrowRight,
  BookOpen, MessageSquare
} from 'lucide-react';
import EquimonPageHeader from '@/components/ui/equimon/EquimonPageHeader';
import { format, differenceInDays } from 'date-fns';
import { useLang } from '@/components/i18n/LangContext';
import { HeadFinalApprovalSkeleton } from '@/skeleton-framework/head of lab';
import { printItsReceipt } from '@/utils/printItsReceipt';
import Swal from 'sweetalert2';

const PAGE_SIZE = 10;
const ACCENT = '#7c3aed';

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name[0].toUpperCase();
};

const shortReqId = (id, createdDate) => {
  const year = createdDate ? new Date(createdDate).getFullYear() : new Date().getFullYear();
  const suffix = id ? String(id).slice(-4).toUpperCase() : '????';
  return `REQ-${year}-${suffix}`;
};

const getUrgency = (borrowDate, createdDate) => {
  const now = new Date();
  if (borrowDate) {
    const daysUntilBorrow = differenceInDays(new Date(borrowDate), now);
    if (daysUntilBorrow <= 3) return 'urgent';
  }
  if (createdDate) {
    const daysPending = differenceInDays(now, new Date(createdDate));
    if (daysPending >= 3) return 'urgent';
  }
  return null;
};

export default function HeadApproval() {
  const { t } = useLang();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewingRequest, setViewingRequest] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [action, setAction] = useState(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateSort, setDateSort] = useState('desc');
  const [pdfLoadingId, setPdfLoadingId] = useState(null);

  const queryClient = useQueryClient();

  const hasExplicitTime = (v) => typeof v === 'string' && (v.includes('T') || v.includes(':'));
  const fmtDate = (v) => v ? format(new Date(v), hasExplicitTime(v) ? 'MMM d, yyyy' : 'MMM d, yyyy') : '—';
  const fmtDateTime = (v) => v ? format(new Date(v), 'EEE, MMM d · HH:mm') : '—';

  const getRequestTimestamp = (r) => new Date(
    r?.created_date || r?.createdAt || r?.updatedAt || r?.borrow_date || 0
  ).getTime();

  const { data: requests = [], isLoading, isError, error } = useQuery({
    queryKey: ['pendingHeadRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'pending_head' }),
  });

  const { data: allEquipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.entities.Equipment.list(),
    staleTime: 5 * 60 * 1000,
  });

  const equipmentMap = React.useMemo(() => {
    const map = {};
    allEquipment.forEach(eq => { map[eq.id] = eq; map[eq._id] = eq; });
    return map;
  }, [allEquipment]);

  const getEquipmentData = (request) => {
    const eqId = request?.equipment?._id || request?.equipment?.id || request?.equipment;
    return eqId ? equipmentMap[eqId] : null;
  };

  const getEquipmentImage = (request) => getEquipmentData(request)?.image_url || null;

  const actionMutation = useMutation({
    mutationFn: ({ id, action, remarks }) => api.entities.BorrowRequest.headAction(id, action, remarks),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pendingHeadRequests'] });
      queryClient.invalidateQueries({ queryKey: ['allRequests'] });
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      closeDialog();

      if (variables.action === 'approve') {
        Swal.fire({
          icon: 'success',
          title: 'Request Approved!',
          text: 'The borrow request has been given final approval. The lab assistant will now prepare the equipment.',
          confirmButtonColor: '#7c3aed',
          confirmButtonText: 'Got it',
          customClass: { popup: 'rounded-2xl font-sans' },
          timer: 4000,
          timerProgressBar: true,
        });
      } else {
        Swal.fire({
          icon: 'info',
          title: 'Request Rejected',
          text: 'The borrow request has been rejected and the borrower will be notified.',
          confirmButtonColor: '#64748b',
          confirmButtonText: 'OK',
          customClass: { popup: 'rounded-2xl font-sans' },
          timer: 4000,
          timerProgressBar: true,
        });
      }
    }
  });

  const openApproveDialog = (request) => { setSelectedRequest(request); setAction('approve'); setRemarks(''); };
  const openRejectDialog  = (request) => { setSelectedRequest(request); setAction('reject');  setRemarks(''); };
  const closeDialog = () => { setSelectedRequest(null); setAction(null); setRemarks(''); };
  const handleSubmit = () => actionMutation.mutate({ id: selectedRequest.id, action, remarks: remarks.trim() });

  const handlePreviewPdf = async (request) => {
    if (!request?.id) return;
    setPdfLoadingId(request.id);
    try {
      const blob = await api.entities.BorrowRequest.getPdfBlob(request.id, true);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      console.error('PDF preview failed:', err);
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handlePrint = (request) => {
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
  };

  const orderedRequests = [...requests].sort((a, b) => {
    const diff = getRequestTimestamp(a) - getRequestTimestamp(b);
    return dateSort === 'desc' ? -diff : diff;
  });

  const filteredRequests = orderedRequests.filter(r =>
    r.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.borrower_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (isLoading) return <HeadFinalApprovalSkeleton />;

  return (
    <div className="w-full space-y-4 px-2 py-2">

      <EquimonPageHeader
        accent={ACCENT}
        icon={ShieldCheck}
        title="Final Approvals"
        badgeCount={requests.length}
        badge="pending"
        sub="Review and action borrow requests forwarded by lecturers."
      />

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            <p className="text-sm font-semibold text-slate-800">Awaiting your final decision</p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-600">
              {filteredRequests.length}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs px-3 text-slate-600 border-slate-200"
            onClick={() => { setCurrentPage(1); setDateSort(s => s === 'desc' ? 'asc' : 'desc'); }}
          >
            {dateSort === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
            {dateSort === 'desc' ? 'Newest first' : 'Oldest first'}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search equipment or borrower..."
              value={search}
              onChange={(e) => { setCurrentPage(1); setSearch(e.target.value); }}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => paginatedRequests.forEach(r => handlePrint(r))}
            className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            Print queue
          </button>
        </div>
      </div>

      {/* ── Cards ── */}
      {isError ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-20">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <p className="text-sm font-medium text-slate-800">{t('unableLoadRequests')}</p>
          <p className="max-w-xs text-center text-xs text-slate-500">{error?.message || t('failedConnectServer')}</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-20">
          <CheckCircle className="w-8 h-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">{t('allCaughtUp')}</p>
          <p className="text-xs text-slate-400">
            {search ? 'No results match your search.' : t('noPendingRequestsRequireApproval')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedRequests.map((request) => {
            const img = getEquipmentImage(request);
            const eq  = getEquipmentData(request);
            const category = request.category || eq?.category;
            const urgency  = getUrgency(request.borrow_date, request.created_date || request.createdAt);
            const email    = request.student_email || request.borrower_email || '';
            const borrowDays = request.borrow_date && request.return_date
              ? differenceInDays(new Date(request.return_date), new Date(request.borrow_date))
              : null;

            return (
              <div
                key={request.id}
                className="relative overflow-hidden flex gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* ── Left accent stripe ── */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-r-sm"
                  style={{ background: urgency === 'urgent' ? '#ef4444' : ACCENT }}
                />

                {/* ── Equipment image ── */}
                <div className="w-16 h-[72px] rounded-xl bg-violet-50 border border-violet-100/80 flex items-center justify-center flex-shrink-0 overflow-hidden self-start mt-1">
                  {img ? (
                    <img src={img} alt={request.equipment_name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-7 h-7 text-violet-300" />
                  )}
                </div>

                {/* ── Main content ── */}
                <div className="flex-1 min-w-0">

                  {/* Tag row */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    {urgency === 'urgent' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                        Urgent
                      </span>
                    )}
                    {category && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                        {category}
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-500 font-mono border border-indigo-100/60">
                      {shortReqId(request.id, request.created_date || request.createdAt)}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                      ×{request.quantity}
                    </span>
                    {request.lecturer_remarks && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <MessageSquare className="w-2.5 h-2.5" />
                        Lecturer noted
                      </span>
                    )}
                  </div>

                  {/* Equipment name */}
                  <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                    {request.equipment_name}
                  </h3>

                  {/* Purpose or lecturer remarks */}
                  {request.lecturer_remarks ? (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed italic">
                      Lecturer: "{request.lecturer_remarks}"
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
                        {request.borrow_date ? fmtDate(request.borrow_date) : '—'}
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
                        {(request.created_date || request.createdAt) ? fmtDateTime(request.created_date || request.createdAt) : '—'}
                      </p>
                    </div>

                  </div>
                </div>

                {/* ── Right: action column ── */}
                <div className="flex flex-col items-stretch gap-1.5 w-40 flex-shrink-0 self-start">

                  {/* Awaiting You badge */}
                  <div className="flex justify-end mb-0.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                      Awaiting You
                    </span>
                  </div>

                  {/* Review & Decide */}
                  <button
                    type="button"
                    onClick={() => setViewingRequest(request)}
                    className="flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold text-white transition-colors w-full"
                    style={{ background: ACCENT }}
                    onMouseEnter={e => e.currentTarget.style.background = '#6d28d9'}
                    onMouseLeave={e => e.currentTarget.style.background = ACCENT}
                  >
                    Review &amp; Decide
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Approve + Reject */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => openApproveDialog(request)}
                      className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    >
                      <ThumbsUp className="w-3 h-3" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => openRejectDialog(request)}
                      className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      <ThumbsDown className="w-3 h-3" />
                      Reject
                    </button>
                  </div>

                  {/* Print details */}
                  <button
                    type="button"
                    onClick={() => handlePrint(request)}
                    disabled={pdfLoadingId === request.id}
                    className="flex items-center justify-center gap-1.5 h-7 rounded-lg text-[11px] text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
                  >
                    {pdfLoadingId === request.id
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

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-slate-500">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRequests.length)} of {filteredRequests.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="icon"
                className={`h-7 w-7 text-xs ${currentPage === page ? 'text-white' : ''}`}
                style={currentPage === page ? { background: ACCENT } : {}}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            <Button variant="outline" size="icon" className="h-7 w-7"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── View Request Detail Modal ── */}
      <Dialog open={!!viewingRequest} onOpenChange={() => setViewingRequest(null)}>
        <DialogContent className="sm:max-w-[620px] rounded-2xl bg-white text-slate-900 overflow-hidden p-0 gap-0 max-h-[88vh] flex flex-col">
          {(() => {
            const img = viewingRequest ? getEquipmentImage(viewingRequest) : null;
            return img ? (
              <div className="relative h-32 w-full overflow-hidden flex-shrink-0 bg-slate-800">
                <img src={img} alt={viewingRequest?.equipment_name} className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute top-3 right-3 rounded-full bg-black/30 backdrop-blur-sm px-2.5 py-0.5">
                  <span className="text-[10px] font-medium text-white/80 tracking-wide uppercase">Final Approval</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 pt-8">
                  <p className="text-lg font-bold text-white leading-snug">{viewingRequest?.equipment_name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-white">
                      <Hash className="h-2.5 w-2.5" />Qty {viewingRequest?.quantity}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-violet-400/90 px-2 py-0.5 text-[10px] font-semibold text-violet-900">
                      Pending Final Approval
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 px-6 py-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200">
                  <Package className="h-6 w-6 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Final Approval</p>
                  <p className="text-base font-bold text-slate-900 leading-tight truncate">{viewingRequest?.equipment_name}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Qty {viewingRequest?.quantity}</span>
                    <span className="text-slate-200">·</span>
                    <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-100 rounded-full px-2 py-0.5">Pending Final Approval</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogTitle className="sr-only">Borrow Request — {viewingRequest?.equipment_name}</DialogTitle>

          <div className="px-4 pt-3 pb-3 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Borrower</p>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100">
                      <User className="h-3.5 w-3.5 text-violet-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{viewingRequest?.borrower_name || '—'}</p>
                      {(viewingRequest?.student_email || viewingRequest?.borrower_email) && (
                        <p className="text-[10px] text-slate-400 truncate">
                          {viewingRequest.student_email || viewingRequest.borrower_email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Submitted</p>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100">
                      <Clock className="h-3.5 w-3.5 text-violet-500" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      {viewingRequest?.created_date ? format(new Date(viewingRequest.created_date), 'MMM d, yyyy') : '—'}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Borrow Period</p>
                  <div className="space-y-1.5">
                    <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                      <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">From</p>
                      <p className="text-sm font-semibold text-slate-800">{fmtDate(viewingRequest?.borrow_date)}</p>
                    </div>
                    <div className="flex justify-center"><div className="h-3 w-px bg-slate-200" /></div>
                    <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                      <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Until</p>
                      <p className="text-sm font-semibold text-slate-800">{fmtDate(viewingRequest?.return_date)}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 flex flex-col">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Purpose</p>
                  <p className="text-sm text-slate-700 leading-relaxed min-h-[48px]">
                    {viewingRequest?.purpose || <span className="italic text-slate-300">No purpose provided.</span>}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Equipment</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Name</span>
                      <span className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">{viewingRequest?.equipment_name || '—'}</span>
                    </div>
                    <div className="h-px bg-slate-100" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Quantity</span>
                      <span className="text-xs font-semibold text-slate-800">{viewingRequest?.quantity ?? '—'}</span>
                    </div>
                    {viewingRequest?.serial_number && (
                      <>
                        <div className="h-px bg-slate-100" />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">Serial</span>
                          <span className="text-xs font-semibold text-slate-800 font-mono">{viewingRequest.serial_number}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {viewingRequest?.lecturer_remarks && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-emerald-500 mb-1.5">Lecturer Remarks</p>
                    <p className="text-xs text-emerald-800 leading-relaxed">{viewingRequest.lecturer_remarks}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
            <Button variant="ghost" size="sm"
              className="h-9 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              onClick={() => setViewingRequest(null)}>
              Close
            </Button>
            <Button size="sm" variant="outline"
              className="h-9 rounded-xl text-xs font-semibold text-violet-600 border-violet-200 bg-violet-50 hover:bg-violet-100 hover:border-violet-300"
              disabled={pdfLoadingId === viewingRequest?.id}
              onClick={() => handlePreviewPdf(viewingRequest)}>
              <Eye className="h-3 w-3 mr-1.5" />
              {pdfLoadingId === viewingRequest?.id ? 'Loading…' : 'Preview PDF'}
            </Button>
            <Button size="sm" variant="outline"
              className="h-9 rounded-xl text-xs font-semibold text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300"
              onClick={() => { setViewingRequest(null); openRejectDialog(viewingRequest); }}>
              <ThumbsDown className="h-3 w-3 mr-1.5" />{t('reject')}
            </Button>
            <Button size="sm"
              className="h-9 rounded-xl text-xs font-semibold text-white shadow-sm"
              style={{ background: ACCENT }}
              onClick={() => { setViewingRequest(null); openApproveDialog(viewingRequest); }}>
              <ThumbsUp className="h-3 w-3 mr-1.5" />{t('approve')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Approve / Reject Dialog ── */}
      <Dialog open={!!selectedRequest} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white text-slate-900">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${action === 'approve' ? 'bg-violet-50' : 'bg-red-50'}`}>
                {action === 'approve'
                  ? <ThumbsUp className="h-4 w-4 text-violet-600" />
                  : <ThumbsDown className="h-4 w-4 text-red-500" />}
              </div>
              {action === 'approve' ? t('finalApproval') : t('rejectRequest')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-500 leading-relaxed">
              {action === 'approve'
                ? <>Give final approval for <span className="font-medium text-slate-700">{selectedRequest?.borrower_name}</span>'s request for <span className="font-medium text-slate-700">{selectedRequest?.equipment_name}</span>. The lab assistant will prepare the equipment.</>
                : <>Reject <span className="font-medium text-slate-700">{selectedRequest?.borrower_name}</span>'s request for <span className="font-medium text-slate-700">{selectedRequest?.equipment_name}</span>. The borrower will be notified.</>
              }
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                {t('remarks')}
                <span className="ml-1 text-slate-400 text-[10px] font-normal">(optional)</span>
              </Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={action === 'approve' ? t('optionalAddNotes') : t('provideRejectionReason')}
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" size="sm" onClick={closeDialog} className="text-xs">{t('cancel')}</Button>
            <Button
              size="sm" onClick={handleSubmit} disabled={actionMutation.isPending}
              className={`text-xs text-white ${action === 'approve' ? '' : 'bg-red-500 hover:bg-red-600'}`}
              style={action === 'approve' ? { background: ACCENT } : {}}>
              {actionMutation.isPending
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{t('processing')}</>
                : action === 'approve' ? t('approveRequest') : t('rejectRequest')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
