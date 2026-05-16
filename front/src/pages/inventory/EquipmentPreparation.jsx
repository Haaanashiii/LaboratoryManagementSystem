import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Package, CheckCircle, Loader2, Search, ClipboardList,
  User, Calendar, MapPin, Printer, Hash, ChevronLeft, ChevronRight, Eye,
} from 'lucide-react';
import { EquipmentPreparationSkeleton } from '@/skeleton-framework/admin';
import { format } from 'date-fns';
import { useLang } from '@/components/i18n/LangContext';
import { useAuth } from '@/components/hooks/useAuth.js';
import EquimonPageHeader from '@/components/ui/equimon/EquimonPageHeader';
import LoanSlip from '@/components/ui/LoanSlip';

const PAGE_ACCENT = '#0d9488';
const PAGE_SIZE = 3;

const SECTION_CONFIG = [
  {
    key: 'all', label: 'All',
    tint: '#f8fafc', fg: '#334155', circleBg: '#94a3b8',
    iconColor: '#334155', countColor: '#0f172a',
    activeBorder: 'border-slate-400', icon: ClipboardList,
    stripeColor: '#64748b',
  },
  {
    key: 'prepare', label: 'Needs Preparation',
    tint: '#f5f3ff', fg: '#7c3aed', circleBg: '#a78bfa',
    iconColor: '#7c3aed', countColor: '#6d28d9',
    activeBorder: 'border-violet-400', icon: Package,
    stripeColor: '#7c3aed',
    badge: { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe', dot: '#a78bfa', label: 'Needs Preparation' },
  },
  {
    key: 'release', label: 'Ready for Pickup',
    tint: '#f0fdf4', fg: '#16a34a', circleBg: '#22c55e',
    iconColor: '#16a34a', countColor: '#15803d',
    activeBorder: 'border-emerald-400', icon: CheckCircle,
    stripeColor: '#16a34a',
    badge: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', dot: '#22c55e', label: 'Ready for Pickup' },
  },
];

const shortReqId = (id, createdDate) => {
  const year = createdDate ? new Date(createdDate).getFullYear() : new Date().getFullYear();
  const suffix = id ? String(id).slice(-4).toUpperCase() : '????';
  return `REQ-${year}-${suffix}`;
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name[0].toUpperCase();
};

export default function EquipmentPrep() {
  const { t } = useLang();
  const { user } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [dialogAction, setDialogAction] = useState(null);
  const [viewRequest, setViewRequest] = useState(null);
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState('all');
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: approvedRequests = [], isLoading: loadingApproved, isError: errorApproved, error: errorMsgApproved } = useQuery({
    queryKey: ['approvedRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'head_approved' }, '-created_date'),
  });

  const { data: readyRequests = [], isLoading: loadingReady, isError: errorReady, error: errorMsgReady } = useQuery({
    queryKey: ['readyRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'ready_pickup' }, '-created_date'),
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

  const resolveImageUrl = (request) => {
    const eqId = request?.equipment?._id || request?.equipment?.id || request?.equipment;
    const eq = eqId ? equipmentMap[eqId] : null;
    return eq?.image_url || eq?.images_urls?.[0]
      || request?.equipment_image_url
      || request?.equipment?.image_url
      || null;
  };

  const prepareMutation = useMutation({
    mutationFn: (id) => api.entities.BorrowRequest.prepare(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvedRequests'] });
      queryClient.invalidateQueries({ queryKey: ['readyRequests'] });
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      closeDialog();
    },
  });

  const releaseMutation = useMutation({
    mutationFn: (id) => api.entities.BorrowRequest.release(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readyRequests'] });
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      closeDialog();
    },
  });

  const openPrepareDialog = (request) => { setSelectedRequest(request); setDialogAction('prepare'); };
  const openReleaseDialog = (request) => { setSelectedRequest(request); setDialogAction('release'); };
  const closeDialog = () => { setSelectedRequest(null); setDialogAction(null); };

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

  const handleConfirm = () => {
    if (dialogAction === 'prepare') prepareMutation.mutate(selectedRequest.id);
    else releaseMutation.mutate(selectedRequest.id);
  };

  const isPending = prepareMutation.isPending || releaseMutation.isPending;
  const isLoading = loadingApproved || loadingReady;
  const isError = errorApproved || errorReady;
  const error = errorMsgApproved || errorMsgReady;

  const allRequests = [
    ...approvedRequests.map(r => ({ ...r, _section: 'prepare' })),
    ...readyRequests.map(r => ({ ...r, _section: 'release' })),
  ];

  const sectionCounts = {
    all: allRequests.length,
    prepare: approvedRequests.length,
    release: readyRequests.length,
  };

  const filtered = (activeSection === 'all' ? allRequests : allRequests.filter(r => r._section === activeSection))
    .filter(r =>
      !search ||
      r.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.borrower_name?.toLowerCase().includes(search.toLowerCase())
    );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSectionChange = (key) => { setActiveSection(key); setCurrentPage(1); };
  const handleSearch = (val) => { setSearch(val); setCurrentPage(1); };

  if (isLoading) return <EquipmentPreparationSkeleton />;

  return (
    <div className="w-full space-y-4 px-2 py-2">

      <EquimonPageHeader
        accent={PAGE_ACCENT}
        icon={CheckCircle}
        title="Equipment Preparation"
        badgeCount={sectionCounts.prepare}
        badge="to prep"
        sub="Prepare approved equipment, run safety checks, and hand off to students."
      />

      {/* ── Status filter cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {SECTION_CONFIG.map((cfg) => {
          const isActive = activeSection === cfg.key;
          const CfgIcon = cfg.icon;
          return (
            <button
              key={cfg.key}
              type="button"
              onClick={() => handleSectionChange(activeSection === cfg.key && cfg.key !== 'all' ? 'all' : cfg.key)}
              className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 shadow-sm hover:-translate-y-0.5 hover:shadow-md ${
                isActive ? `${cfg.activeBorder} shadow-md` : 'hover:border-slate-300'
              }`}
              style={{ background: cfg.tint, borderColor: isActive ? undefined : `${cfg.fg}33` }}
            >
              <div className="absolute -right-5 -bottom-5 w-24 h-24 rounded-full opacity-20" style={{ background: cfg.circleBg }} />
              {isActive && <span className="absolute top-3 right-3 w-2 h-2 rounded-full" style={{ background: cfg.fg }} />}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 bg-white/80 shadow-sm" style={{ color: cfg.iconColor }}>
                <CfgIcon className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{cfg.label}</p>
              <p className="text-2xl font-bold leading-none" style={{ color: cfg.countColor }}>{sectionCounts[cfg.key] ?? 0}</p>
            </button>
          );
        })}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search equipment or borrower..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors shrink-0"
        >
          <Printer className="w-3.5 h-3.5" />
          Print queue
        </button>
      </div>

      {/* ── Cards ── */}
      {isError ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-20">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <Package className="h-5 w-5 text-red-400" />
          </div>
          <p className="text-sm font-medium text-slate-800">Unable to load equipment requests</p>
          <p className="max-w-xs text-center text-xs text-slate-500">{error?.message || 'Failed to connect to the server.'}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-20">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
            <Package className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">No equipment to prepare</p>
          <p className="text-xs text-slate-400">All equipment has been prepared and distributed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map(request => {
            const cfg = SECTION_CONFIG.find(c => c.key === request._section) || SECTION_CONFIG[0];
            const bdg = cfg.badge;
            const email = request.student_email || request.borrower_email || '';
            const category = request.category || request.equipment_category;
            const imgUrl = resolveImageUrl(request);

            return (
              <div
                key={request.id}
                className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Colored left border stripe */}
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-sm" style={{ background: cfg.stripeColor }} />

                <div className="flex gap-4 px-5 py-4">
                  {/* Equipment thumbnail */}
                  <div
                    className="w-[72px] h-[72px] rounded-xl flex items-center justify-center flex-shrink-0 self-start mt-1 border overflow-hidden"
                    style={{ background: `${cfg.fg}15`, borderColor: `${cfg.fg}25` }}
                  >
                    {imgUrl ? (
                      <img src={imgUrl} alt={request.equipment_name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-7 h-7" style={{ color: `${cfg.fg}99` }} />
                    )}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">

                    {/* Tag row */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      {bdg && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                          style={{ background: bdg.bg, color: bdg.text, borderColor: bdg.border }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: bdg.dot }} />
                          {bdg.label}
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
                    </div>

                    {/* Equipment name + qty */}
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-[15px] font-bold text-slate-900 leading-snug">{request.equipment_name}</h3>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${cfg.fg}15`, color: cfg.fg }}
                      >
                        ×{request.quantity}
                      </span>
                    </div>

                    {/* Meta columns */}
                    <div className="flex flex-wrap items-start gap-x-8 gap-y-2">

                      {/* BORROWER */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <User className="w-3 h-3 text-slate-300" />
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Borrower</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                            style={{ background: cfg.stripeColor }}
                          >
                            {getInitials(request.borrower_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-slate-700 leading-none">{request.borrower_name || '—'}</p>
                            {email && <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]">{email}</p>}
                          </div>
                        </div>
                      </div>

                      {/* PICKUP */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <Calendar className="w-3 h-3 text-slate-300" />
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Pickup</span>
                        </div>
                        <p className="text-[12px] font-semibold text-slate-700 leading-none">
                          {request.borrow_date ? format(new Date(request.borrow_date), 'MMM d, yyyy') : '—'}
                        </p>
                        {request.return_date && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Return by {format(new Date(request.return_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>

                      {/* PICKUP LOCATION */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <MapPin className="w-3 h-3 text-slate-300" />
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Pickup Location</span>
                        </div>
                        <p className="text-[12px] font-semibold text-slate-700 leading-none">Lab E101 · Pickup Bin A</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Open 9:00 – 16:00</p>
                      </div>

                    </div>
                  </div>

                  {/* Right column: action buttons */}
                  <div className="flex flex-col gap-2 w-36 flex-shrink-0 self-start">
                    {request._section === 'prepare' ? (
                      <button
                        onClick={() => openPrepareDialog(request)}
                        disabled={isPending}
                        className="flex items-center justify-center gap-1.5 h-9 rounded-xl text-[12px] font-bold text-white transition-opacity disabled:opacity-50"
                        style={{ background: cfg.stripeColor }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Mark as Ready
                      </button>
                    ) : (
                      <button
                        onClick={() => openReleaseDialog(request)}
                        disabled={isPending}
                        className="flex items-center justify-center gap-1.5 h-9 rounded-xl text-[12px] font-bold text-white transition-opacity disabled:opacity-50"
                        style={{ background: cfg.stripeColor }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Confirm Pickup
                      </button>
                    )}
                    <button
                      onClick={() => setViewRequest({ ...request, _resolvedImageUrl: resolveImageUrl(request), assistant_name: request.released_by?.name || request.prepared_by?.name || request.assistant_name || user?.name })}
                      className="flex items-center justify-center gap-1.5 h-9 rounded-xl text-[12px] font-bold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Form
                    </button>
                    <button
                      onClick={() => handlePreviewPdf(request)}
                      disabled={pdfLoadingId === request.id}
                      className="flex items-center justify-center gap-1.5 h-7 rounded-lg text-[11px] text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                    >
                      {pdfLoadingId === request.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Printer className="w-3 h-3" />
                      }
                      Print slip
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between px-1 pb-2">
          <p className="text-xs text-slate-400">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} request{filtered.length !== 1 ? 's' : ''}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold border transition-colors"
                  style={currentPage === page
                    ? { background: '#7c3aed', color: '#fff', borderColor: '#7c3aed' }
                    : { background: '#fff', color: '#475569', borderColor: '#e2e8f0' }
                  }
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Loan Slip Modal ── */}
      <Dialog open={!!viewRequest} onOpenChange={v => { if (!v) setViewRequest(null); }}>
        <DialogContent
          className="p-0 gap-0 rounded-2xl border border-slate-200 bg-white flex flex-col"
          style={{ width: '92vw', maxWidth: 580, maxHeight: '90dvh', padding: 0 }}
        >
          <div className="overflow-y-auto flex-1 min-h-0 px-5 py-5">
            {viewRequest && (
              <LoanSlip
                request={viewRequest}
                imageUrl={viewRequest._resolvedImageUrl}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Action Dialog ── */}
      <Dialog open={!!selectedRequest} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white text-slate-900">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${dialogAction === 'prepare' ? 'bg-violet-50' : 'bg-emerald-50'}`}>
                <CheckCircle className={`h-4 w-4 ${dialogAction === 'prepare' ? 'text-violet-600' : 'text-emerald-600'}`} />
              </div>
              {dialogAction === 'prepare' ? t('markEquipmentReady') : t('confirmPickup')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('equipment')}</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedRequest?.equipment_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('borrower')}</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedRequest?.borrower_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Hash className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('quantity')}</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedRequest?.quantity}</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              {dialogAction === 'prepare' ? t('reserveEquipmentMessage') : t('confirmPickupMessage')}
            </p>
          </div>
          <DialogFooter className="gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" size="sm" onClick={closeDialog} className="text-xs">{t('cancel')}</Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isPending}
              className={`text-xs text-white ${dialogAction === 'prepare' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {isPending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{t('processing')}</>
              ) : dialogAction === 'prepare' ? t('markAsReady') : t('confirmPickup')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
