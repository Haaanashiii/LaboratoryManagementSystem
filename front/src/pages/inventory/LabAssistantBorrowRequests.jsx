import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Package, Search, RefreshCw, Clock, FileText,
  ChevronLeft, ChevronRight, User, Calendar, Eye, XCircle, LayoutList,
} from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/api/apiClient';
import { useAuth } from '@/components/hooks/useAuth.js';
import { useTheme } from '@/components/hooks/ThemeContext';
import LoanSlip from '@/components/ui/LoanSlip';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import EquimonPageHeader from '@/components/ui/equimon/EquimonPageHeader';

const ACCENT = '#0d9488';
const PAGE_SIZE = 5;

const fmtDate = (v) => {
  if (!v) return '—';
  try { return format(new Date(v), 'MMM d, yyyy'); } catch { return '—'; }
};

const shortReqId = (id, createdDate) => {
  const year = createdDate ? new Date(createdDate).getFullYear() : new Date().getFullYear();
  const suffix = id ? String(id || '').slice(-4).toUpperCase() : '????';
  return `REQ-${year}-${suffix}`;
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name[0].toUpperCase();
};

const STATUS_CFG = {
  pending:          { label: 'Pending',          stripe: '#f59e0b', bg: '#fffbeb', text: '#b45309', border: '#fde68a', dot: '#f59e0b' },
  pending_lecturer: { label: 'Pending Lecturer', stripe: '#f59e0b', bg: '#fffbeb', text: '#b45309', border: '#fde68a', dot: '#f59e0b' },
  pending_head:     { label: 'Pending Head',     stripe: '#f59e0b', bg: '#fffbeb', text: '#b45309', border: '#fde68a', dot: '#f59e0b' },
  approved:         { label: 'Approved',         stripe: '#16a34a', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#22c55e' },
  rejected:         { label: 'Rejected',         stripe: '#ef4444', bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', dot: '#ef4444' },
  head_approved:    { label: 'Head Approved',    stripe: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' },
  ready_pickup:     { label: 'Ready for Pickup', stripe: '#8b5cf6', bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe', dot: '#8b5cf6' },
  borrowed:         { label: 'Borrowed',         stripe: '#06b6d4', bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc', dot: '#06b6d4' },
  returned:         { label: 'Returned',         stripe: '#64748b', bg: '#f8fafc', text: '#475569', border: '#e2e8f0', dot: '#64748b' },
};

const getStatusCfg = (s) => STATUS_CFG[s] || { label: s, stripe: '#64748b', bg: '#f8fafc', text: '#475569', border: '#e2e8f0', dot: '#64748b' };

const TAB_CFG = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'all',     label: 'All',     icon: LayoutList },
];

export default function LabAssistantBorrowRequests() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();

  const [tab, setTab]           = useState('pending');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const { data: allRequests = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['labBorrowRequests'],
    queryFn: () => api.entities.BorrowRequest.list(),
    staleTime: 30_000,
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

  const approveMutation = useMutation({
    mutationFn: (id) => api.entities.BorrowRequest.approve(id),
    onSuccess: (data) => {
      toast.success('Request approved successfully');
      queryClient.invalidateQueries({ queryKey: ['labBorrowRequests'] });
      setSelected((prev) => (prev ? { ...prev, ...data } : prev));
    },
    onError: (err) => toast.error(err.message || 'Approval failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => api.entities.BorrowRequest.reject(id, reason),
    onSuccess: (data) => {
      toast.success('Request rejected');
      queryClient.invalidateQueries({ queryKey: ['labBorrowRequests'] });
      setSelected((prev) => (prev ? { ...prev, ...data } : prev));
    },
    onError: (err) => toast.error(err.message || 'Rejection failed'),
  });

  const handleApprove = () => {
    if (!selected) return;
    approveMutation.mutate(selected._id || selected.id);
  };

  const handleReject = (reason) => {
    if (!selected) return;
    rejectMutation.mutate({ id: selected._id || selected.id, reason });
  };

  const handleDownloadPdf = async () => {
    if (!selected) return;
    setDownloading(true);
    try {
      await api.entities.BorrowRequest.downloadPdf(selected._id || selected.id);
    } catch (err) {
      toast.error(err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const PENDING_STATUSES = ['pending', 'pending_lecturer', 'pending_head'];

  const filtered = allRequests.filter((r) => {
    const matchTab = tab === 'all' || (tab === 'pending' && PENDING_STATUSES.includes(r.status));
    if (!matchTab) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.borrower_name || '').toLowerCase().includes(q) ||
      (r.equipment_name || '').toLowerCase().includes(q) ||
      (r.student_email || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pendingCount = allRequests.filter(r => PENDING_STATUSES.includes(r.status)).length;
  const tabCount = { pending: pendingCount, all: allRequests.length };

  const handleTabChange = (key) => { setTab(key); setPage(1); };
  const handleSearch = (val) => { setSearch(val); setPage(1); };

  return (
    <div className="w-full space-y-4 px-2 py-2">

      <EquimonPageHeader
        accent={ACCENT}
        icon={FileText}
        title="Borrow Requests"
        badgeCount={pendingCount}
        badge="pending"
        sub="Review and process borrow requests from students."
      />

      {/* ── Controls ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          {TAB_CFG.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors cursor-pointer"
              style={{
                background: tab === key ? ACCENT : 'transparent',
                color:      tab === key ? '#fff' : '#94a3b8',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              <span
                className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                style={{
                  background: tab === key ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                  color:      tab === key ? '#fff' : '#94a3b8',
                }}
              >
                {tabCount[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name, equipment, email…"
            className="h-10 pl-9 text-sm focus:ring-2 focus:ring-teal-500/30"
          />
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Cards ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-20">
          <XCircle className="w-10 h-10 text-red-400" />
          <p className="text-sm text-slate-500">Failed to load requests.</p>
          <button onClick={() => refetch()} className="text-xs text-teal-600 underline">Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-20">
          <Package className="w-10 h-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            No {tab === 'pending' ? 'pending ' : ''}requests found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((r) => {
            const id = r._id || r.id;
            const sc = getStatusCfg(r.status);
            const email = r.student_email || r.borrower_email || '';
            const category = r.category || r.equipment_category;
            const imgUrl = resolveImageUrl(r);

            return (
              <div
                key={id}
                className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelected({ ...r, _resolvedImageUrl: resolveImageUrl(r), assistant_name: r.released_by?.name || r.prepared_by?.name || r.assistant_name || user?.name })}
              >
                {/* Left stripe */}
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-sm" style={{ background: sc.stripe }} />

                <div className="flex gap-4 px-5 py-4">
                  {/* Thumbnail */}
                  <div
                    className="w-[60px] h-[60px] rounded-xl flex items-center justify-center flex-shrink-0 self-center border overflow-hidden"
                    style={{ background: `${sc.stripe}15`, borderColor: `${sc.stripe}30` }}
                  >
                    {imgUrl ? (
                      <img src={imgUrl} alt={r.equipment_name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6" style={{ color: `${sc.stripe}99` }} />
                    )}
                  </div>

                  {/* Main */}
                  <div className="flex-1 min-w-0">
                    {/* Tag row */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                        style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sc.dot }} />
                        {sc.label}
                      </span>
                      {category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                          {category}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-500 font-mono border border-indigo-100/60">
                        {shortReqId(id, r.created_date || r.createdAt)}
                      </span>
                    </div>

                    {/* Equipment name + qty */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-[14px] font-bold text-slate-900 leading-snug">{r.equipment_name || '—'}</h3>
                      {r.quantity != null && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          ×{r.quantity}
                        </span>
                      )}
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                      {/* Borrower */}
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                          style={{ background: sc.stripe }}
                        >
                          {getInitials(r.borrower_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-slate-700 leading-none">{r.borrower_name || '—'}</p>
                          {email && <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{email}</p>}
                        </div>
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Calendar className="w-3 h-3 text-slate-300" />
                        {fmtDate(r.borrow_date)}
                        {r.return_date && <span className="text-slate-400">→ {fmtDate(r.return_date)}</span>}
                      </div>
                    </div>
                  </div>

                  {/* View button */}
                  <div className="flex items-center self-center flex-shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); setSelected({ ...r, _resolvedImageUrl: resolveImageUrl(r), assistant_name: r.released_by?.name || r.prepared_by?.name || r.assistant_name || user?.name }); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                      style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
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
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold border transition-colors"
                  style={page === pg
                    ? { background: ACCENT, color: '#fff', borderColor: ACCENT }
                    : { background: '#fff', color: '#475569', borderColor: '#e2e8f0' }
                  }
                >
                  {pg}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Loan Slip Modal ── */}
      <Dialog open={!!selected} onOpenChange={v => { if (!v) setSelected(null); }}>
        <DialogContent
          className="p-0 gap-0 rounded-2xl border border-slate-200 bg-white flex flex-col"
          style={{ width: '92vw', maxWidth: 580, maxHeight: '90dvh', padding: 0 }}
        >
          <div className="overflow-y-auto flex-1 min-h-0 px-5 py-5">
            {selected && (
              <LoanSlip
                request={selected}
                imageUrl={selected._resolvedImageUrl}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
