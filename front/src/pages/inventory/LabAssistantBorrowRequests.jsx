/**
 * LabAssistantBorrowRequests
 * ──────────────────────────
 * Lab Assistant page: view all pending borrow requests, open each one,
 * and approve (+ generate PDF) or reject.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Package, Search, RefreshCw, Clock, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, Eye, FileText,
} from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/api/apiClient';
import { useAuth } from '@/components/hooks/useAuth.js';
import { useTheme } from '@/components/hooks/ThemeContext';
import BorrowRequestFormView from '@/components/BorrowRequestFormView';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (v) => {
  if (!v) return '—';
  try { return format(new Date(v), 'MMM d, yyyy'); } catch { return '—'; }
};

const STATUS_META = {
  pending:          { label: 'Pending',          color: '#F59E0B' },
  approved:         { label: 'Approved',         color: '#22C55E' },
  rejected:         { label: 'Rejected',         color: '#EF4444' },
  pending_lecturer: { label: 'Pending Lecturer', color: '#F59E0B' },
  pending_head:     { label: 'Pending Head',     color: '#F59E0B' },
};

const getStatusMeta = (s) => STATUS_META[s] || { label: s, color: '#64748B' };

const PAGE_SIZE = 10;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ isDark }) {
  return (
    <div className="space-y-3 p-5">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-xl animate-pulse"
          style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}
        />
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LabAssistantBorrowRequests() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();

  const [tab, setTab]           = useState('pending');   // 'pending' | 'all'
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState(null);        // request being viewed
  const [downloading, setDownloading] = useState(false);

  // ── Fetch all requests ─────────────────────────────────────────────────────
  const { data: allRequests = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['labBorrowRequests'],
    queryFn: () => api.entities.BorrowRequest.list(),
    staleTime: 30_000,
  });

  // ── Approve mutation ───────────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: (id) => api.entities.BorrowRequest.approve(id),
    onSuccess: (data) => {
      toast.success('Request approved successfully');
      queryClient.invalidateQueries({ queryKey: ['labBorrowRequests'] });
      // Refresh the selected request with latest data
      setSelected((prev) => (prev ? { ...prev, ...data } : prev));
    },
    onError: (err) => toast.error(err.message || 'Approval failed'),
  });

  // ── Reject mutation ────────────────────────────────────────────────────────
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => api.entities.BorrowRequest.reject(id, reason),
    onSuccess: (data) => {
      toast.success('Request rejected');
      queryClient.invalidateQueries({ queryKey: ['labBorrowRequests'] });
      setSelected((prev) => (prev ? { ...prev, ...data } : prev));
    },
    onError: (err) => toast.error(err.message || 'Rejection failed'),
  });

  // ── Filter / search / paginate ─────────────────────────────────────────────
  const filtered = allRequests.filter((r) => {
    const matchTab =
      tab === 'all' ||
      (tab === 'pending' && ['pending', 'pending_lecturer', 'pending_head'].includes(r.status));

    if (!matchTab) return false;
    if (!search) return true;

    const q = search.toLowerCase();
    return (
      (r.borrower_name || '').toLowerCase().includes(q) ||
      (r.equipment_name || '').toLowerCase().includes(q) ||
      (r.student_email || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pendingCount = allRequests.filter((r) =>
    ['pending', 'pending_lecturer', 'pending_head'].includes(r.status)
  ).length;

  // ── Handlers ──────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────

  const surface = isDark ? '#111118' : '#ffffff';
  const border  = isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0';
  const muted   = isDark ? '#475569' : '#94a3b8';
  const text    = isDark ? '#e2e8f0' : '#0f172a';

  return (
    <div className="space-y-4">

      {/* ── PAGE HEADER ──────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 shadow-xl"
        style={{ background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)' }}
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative">
          <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-1">Lab Assistant</p>
          <h1 className="text-2xl font-bold text-white">Borrow Requests</h1>
          <p className="text-blue-200 text-sm mt-1">Review and process pending borrow requests.</p>
        </div>
        {pendingCount > 0 && (
          <div className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/30">
            <Clock className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-[11px] font-bold text-amber-300">{pendingCount} pending</span>
          </div>
        )}
      </div>

      {/* ── CONTROLS ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Tabs */}
        <div
          className="flex rounded-xl overflow-hidden border"
          style={{ borderColor: border, background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc' }}
        >
          {[
            { key: 'pending', label: 'Pending', icon: Clock,        count: pendingCount },
            { key: 'all',     label: 'All',     icon: FileText,     count: allRequests.length },
          ].map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setPage(1); }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors cursor-pointer"
              style={{
                background: tab === key ? '#3B82F6' : 'transparent',
                color:      tab === key ? '#fff' : muted,
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              <span
                className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                style={{
                  background: tab === key ? 'rgba(255,255,255,0.2)' : (isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0'),
                  color:      tab === key ? '#fff' : muted,
                }}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: muted }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, equipment, email…"
            className="w-full h-10 pl-9 pr-4 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            style={{ background: surface, borderColor: border, color: text }}
          />
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer border"
          style={{ background: surface, borderColor: border, color: muted }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── REQUEST LIST ─────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: surface, borderColor: border }}
      >
        {isLoading ? (
          <Skeleton isDark={isDark} />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <XCircle className="w-10 h-10 text-red-500/60" />
            <p className="text-sm" style={{ color: muted }}>Failed to load requests.</p>
            <button onClick={() => refetch()} className="text-xs text-blue-400 underline cursor-pointer">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Package className="w-10 h-10" style={{ color: muted }} />
            <p className="text-sm font-medium" style={{ color: muted }}>No {tab === 'pending' ? 'pending ' : ''}requests found.</p>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div
              className="hidden sm:grid grid-cols-[2fr_2fr_1fr_1fr_1fr_80px] gap-3 px-5 py-3 text-[10px] font-bold uppercase tracking-widest border-b"
              style={{ color: muted, borderColor: border, background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}
            >
              <span>Borrower</span>
              <span>Equipment</span>
              <span>Qty</span>
              <span>Borrow Date</span>
              <span>Status</span>
              <span />
            </div>

            {/* Rows */}
            {paginated.map((r) => {
              const sm = getStatusMeta(r.status);
              return (
                <div
                  key={r._id || r.id}
                  className="flex flex-col sm:grid sm:grid-cols-[2fr_2fr_1fr_1fr_1fr_80px] gap-2 sm:gap-3 px-5 py-4 border-b last:border-b-0 cursor-pointer group transition-colors"
                  style={{ borderColor: border }}
                  onClick={() => setSelected(r)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: text }}>{r.borrower_name || '—'}</p>
                    <p className="text-[11px] truncate" style={{ color: muted }}>{r.student_email || '—'}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: text }}>{r.equipment_name || '—'}</p>
                    {r.serial_number && <p className="text-[11px] truncate" style={{ color: muted }}>S/N: {r.serial_number}</p>}
                  </div>
                  <p className="text-sm font-semibold tabular-nums" style={{ color: text }}>{r.quantity}</p>
                  <p className="text-sm" style={{ color: text }}>{fmtDate(r.borrow_date)}</p>
                  <div>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: sm.color + '18', color: sm.color, border: `1px solid ${sm.color}30` }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: sm.color }} />
                      {sm.label}
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelected(r); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
                      style={{ background: 'rgba(59,130,246,0.10)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.20)' }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── PAGINATION ───────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs" style={{ color: muted }}>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer disabled:opacity-40 transition-colors border"
              style={{ background: surface, borderColor: border, color: muted }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer disabled:opacity-40 transition-colors border"
              style={{ background: surface, borderColor: border, color: muted }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── REQUEST DETAIL MODAL ─────────────────────────────────────────── */}
      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null); }}>
        <DialogContent
          className={`p-0 gap-0 overflow-hidden rounded-2xl border ${isDark ? 'bg-[#0e0e16] border-white/[0.08]' : 'bg-white border-slate-200'}`}
          style={{
            width: '92vw',
            maxWidth: 540,
            maxHeight: '90dvh',
            padding: 0,
            boxShadow: isDark ? '0 32px 80px rgba(0,0,0,0.85)' : '0 24px 64px rgba(0,0,0,0.18)',
          }}
        >
          {/* Modal header */}
          <div
            className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b"
            style={{
              background:   isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
              borderColor: border,
            }}
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: muted }}>Borrow Request</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: text }}>
                {selected?.equipment_name || '—'}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer"
              style={{ background: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9' }}
            >
              <svg className="w-4 h-4" style={{ color: muted }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal body */}
          <div className="overflow-y-auto flex-1 min-h-0 px-5 py-4">
            {selected && (
              <BorrowRequestFormView
                request={selected}
                mode="approval"
                isDark={isDark}
                onApprove={handleApprove}
                onReject={handleReject}
                isApproving={approveMutation.isPending}
                isRejecting={rejectMutation.isPending}
                showDownload
                onDownloadPdf={handleDownloadPdf}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
