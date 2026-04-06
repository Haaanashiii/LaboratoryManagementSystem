import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Search, History, Package, Calendar, CheckCircle, RotateCcw, AlertCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';
import { format } from 'date-fns';
import { useTheme } from '@/components/hooks/ThemeContext';

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

const STATUS_FILTERS = [
  { key: 'all',      label: 'All',       statuses: null },
  { key: 'pending',  label: 'Pending',   statuses: ['pending_lecturer', 'pending_head'] },
  { key: 'approved', label: 'Approved',  statuses: ['head_approved', 'ready_pickup'] },
  { key: 'borrowed', label: 'Borrowed',  statuses: ['borrowed'] },
  { key: 'returned', label: 'Returned',  statuses: ['returned'] },
  { key: 'rejected', label: 'Rejected',  statuses: ['rejected'] },
];

export default function ApprovalHistory() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const { isDark } = useTheme();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: requests = [], isLoading, isError, error } = useQuery({
    queryKey: ['myRequests'],
    queryFn: () => api.entities.BorrowRequest.myRequests(),
    enabled: !!user && user.role === 'student',
  });

  const activeFilter = STATUS_FILTERS.find(f => f.key === statusFilter) || STATUS_FILTERS[0];

  const filteredRequests = requests
    .filter(r => !activeFilter.statuses || activeFilter.statuses.includes(r.status))
    .filter(r =>
      r.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.borrower_name?.toLowerCase().includes(search.toLowerCase())
    );

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRequests = filteredRequests.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalCount    = requests.length;
  const returnedCount = requests.filter(r => r.status === 'returned').length;
  const pendingCount  = requests.filter(r => r.status === 'pending_lecturer' || r.status === 'pending_head').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 relative">
        <BanterLoader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border mx-2 ${isDark ? 'bg-[#0d0d14] border-white/[0.08]' : 'bg-white border-slate-200'}`}>
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
            <History className="w-6 h-6 text-red-500" />
          </div>
          <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Unable to load history</p>
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
            <p className="text-blue-200 text-[10px] font-semibold uppercase tracking-widest mb-1">Equipment Borrowing</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">My History</h1>
            <p className="text-blue-200 text-sm mt-1.5 max-w-sm">
              A full record of all your past and current equipment borrow requests.
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
            const count = f.statuses
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
            placeholder="Search equipment..."
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

      {/* ── CARDS LIST ──────────────────────────────────────────── */}
      <div className="hist-fade-up hist-fade-3 space-y-3">
        {filteredRequests.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed text-center ${
            isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/60'
          }`}>
            <History className={`w-10 h-10 mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            <p className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>No requests found</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              {search ? 'Try a different search term.' : 'Your request history will appear here.'}
            </p>
          </div>
        ) : (
          pagedRequests.map((request) => {
            const isRejected = request.status === 'rejected';
            const isReturned = request.status === 'returned';

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
                            Qty: {request.quantity}
                          </p>
                        </div>
                        <StatusBadge status={request.status} />
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
                            Return: {format(new Date(request.return_date), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>

                      {/* Remarks */}
                      {request.lecturer_remarks && (
                        <div className={`mt-3 rounded-xl px-3 py-2.5 text-xs flex items-start gap-2 ${
                          isDark ? 'bg-white/[0.04] text-slate-400' : 'bg-slate-50 text-slate-500 border border-slate-100'
                        }`}>
                          <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-400" />
                          <span><span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Remarks: </span>{request.lecturer_remarks}</span>
                        </div>
                      )}
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
    </div>
  );
}