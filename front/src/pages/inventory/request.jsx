import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Package, Calendar, Clock, CheckCircle, RotateCcw, BookOpen, ChevronRight, AlertCircle, X, History, ChevronLeft } from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';
import { format, isToday } from 'date-fns';
import { useTheme } from '@/components/hooks/ThemeContext';

const pageStyles = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .req-fade-up { opacity: 0; animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
  .req-fade-1  { animation-delay: 0.04s; }
  .req-fade-2  { animation-delay: 0.10s; }
  .req-fade-3  { animation-delay: 0.16s; }

  .req-card {
    transition: box-shadow 0.2s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1), border-color 0.2s ease;
  }
  .req-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px -8px rgba(0,0,0,0.10);
  }
  .req-dark .req-card:hover {
    box-shadow: 0 8px 24px -8px rgba(0,0,0,0.40);
  }

  @keyframes heroGlow {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50%       { opacity: 1;   transform: scale(1.08); }
  }
  .req-orb   { animation: heroGlow 6s ease-in-out infinite; }
  .req-orb-2 { animation: heroGlow 8s ease-in-out infinite reverse; }

  .tab-pill {
    position: relative;
    transition: color 0.2s ease;
    font-size: 0.8125rem;
    font-weight: 600;
    padding: 0.45rem 1.1rem;
    border-radius: 999px;
    cursor: pointer;
    border: none;
    background: transparent;
    outline: none;
  }
  .tab-pill.active-light { background: white; color: #1e3a5f; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .tab-pill.active-dark  { background: rgba(255,255,255,0.10); color: #e2e8f0; }
  .tab-pill.inactive-light { color: #64748b; }
  .tab-pill.inactive-dark  { color: #475569; }
  .tab-pill:focus-visible { box-shadow: 0 0 0 2px #3b82f6; }
`;


const trackerSteps = [
  { key: 'pending_lecturer', label: 'Lecturer' },
  { key: 'pending_head', label: 'Head' },
  { key: 'head_approved', label: 'Approved' },
  { key: 'ready_pickup', label: 'Ready' },
  { key: 'borrowed', label: 'Borrowed' },
  { key: 'returned', label: 'Returned' },
];

const HISTORY_PAGE_SIZE = 10;

const HISTORY_FILTERS = [
  { key: 'all',      label: 'All',       statuses: null },
  { key: 'pending',  label: 'Pending',   statuses: ['pending_lecturer', 'pending_head'] },
  { key: 'approved', label: 'Approved',  statuses: ['head_approved', 'ready_pickup'] },
  { key: 'borrowed', label: 'Borrowed',  statuses: ['borrowed'] },
  { key: 'returned', label: 'Returned',  statuses: ['returned'] },
  { key: 'rejected', label: 'Rejected',  statuses: ['rejected'] },
];

export default function MyRequests() {
  const [filter, setFilter] = useState('active');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFilter, setHistoryFilter] = useState('all');
  const { isDark } = useTheme();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: requests = [], isLoading, isError, error } = useQuery({
    queryKey: ['myRequests'],
    queryFn: () => api.entities.BorrowRequest.myRequests(),
    enabled: !!user
  });

  const getHistoryTimestamp = (request) => {
    return (
      request.actual_return_date ||
      request.rejected_at ||
      request.released_at ||
      request.updatedAt ||
      request.created_date ||
      request.createdAt ||
      request.borrow_date
    );
  };

  const filteredRequests = requests
    .filter(r => {
      if (filter === 'active') return !['returned', 'rejected'].includes(r.status);
      if (filter === 'history') return true;
      return true;
    })
    .sort((a, b) => {
      if (filter !== 'history') return 0;

      const aTime = new Date(getHistoryTimestamp(a)).getTime();
      const bTime = new Date(getHistoryTimestamp(b)).getTime();
      return bTime - aTime;
    });

  const getHistoryDateHeader = (timestamp) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return `Today - ${format(date, 'EEEE, MMMM d, yyyy')}`;
    }

    return format(date, 'EEEE, MMMM d, yyyy');
  };

  const activeHistoryFilter = HISTORY_FILTERS.find(f => f.key === historyFilter) || HISTORY_FILTERS[0];
  const allHistorySorted = filter === 'history'
    ? filteredRequests.filter(r =>
        !activeHistoryFilter.statuses || activeHistoryFilter.statuses.includes(r.status)
      )
    : [];
  const historyTotalPages = Math.max(1, Math.ceil(allHistorySorted.length / HISTORY_PAGE_SIZE));
  const safePage = Math.min(historyPage, historyTotalPages);
  const pagedHistory = allHistorySorted.slice((safePage - 1) * HISTORY_PAGE_SIZE, safePage * HISTORY_PAGE_SIZE);

  const historyGroups = filter === 'history'
    ? pagedHistory.reduce((groups, request) => {
        const timestamp = getHistoryTimestamp(request);
        const key = format(new Date(timestamp), 'yyyy-MM-dd');

        if (!groups[key]) {
          groups[key] = {
            key,
            title: getHistoryDateHeader(timestamp),
            requests: []
          };
        }

        groups[key].requests.push(request);
        return groups;
      }, {})
    : {};

  const getStatusStep = (status) => {
    const index = trackerSteps.findIndex((step) => step.key === status);
    return index >= 0 ? index + 1 : 1;
  };

  const renderProgressTracker = (request) => {
    if (request.status === 'rejected') {
      return (
        <div className={`mt-4 rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${isDark ? 'border-red-900/50 bg-red-950/40 text-red-400' : 'border-red-100 bg-red-50 text-red-700'}`}>
          <X className="w-4 h-4 flex-shrink-0" />
          Request was rejected.
        </div>
      );
    }

    const currentStep = getStatusStep(request.status);
    const progress = (currentStep / trackerSteps.length) * 100;

    return (
      <div className={`mt-4 rounded-xl border p-4 ${isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-slate-100 bg-slate-50'}`}>
        <div className="mb-3 flex items-center justify-between">
          <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Progress</p>
          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Step {currentStep} of {trackerSteps.length}</p>
        </div>
        <div className={`relative mb-4 h-1.5 w-full overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {trackerSteps.map((step, index) => {
            const stepNumber = index + 1;
            const isDone = currentStep > stepNumber;
            const isCurrent = currentStep === stepNumber;
            return (
              <div key={step.key} className="flex flex-col items-center gap-1 text-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    isDone
                      ? 'bg-blue-600 text-white'
                      : isCurrent
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20'
                      : isDark ? 'bg-white/10 text-slate-500' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {stepNumber}
                </div>
                <span className={`text-[10px] ${
                  isDone || isCurrent
                    ? isDark ? 'text-slate-300' : 'text-slate-700'
                    : isDark ? 'text-slate-600' : 'text-slate-400'
                }`}>{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderRequestCard = (request) => (
    <div
      key={request.id}
      className={`req-card rounded-2xl border cursor-pointer ${isDark
        ? 'bg-[#0d0d14] border-white/[0.08] hover:border-white/[0.16]'
        : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
      onClick={() => setSelectedRequest(request)}
    >
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            {/* Icon accent */}
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              request.status === 'rejected'
                ? 'bg-red-500/10'
                : request.status === 'returned'
                ? 'bg-emerald-500/10'
                : 'bg-blue-500/10'
            }`}>
              {request.status === 'rejected'
                ? <AlertCircle className={`w-5 h-5 text-red-500`} />
                : request.status === 'returned'
                ? <CheckCircle className={`w-5 h-5 text-emerald-500`} />
                : <Package className={`w-5 h-5 text-blue-500`} />
              }
            </div>

            <div>
              <h3 className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {request.equipment_name}
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Qty: {request.quantity}
              </p>
              <div className={`flex items-center gap-1.5 mt-2 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {format(new Date(request.borrow_date), 'MMM d')} – {format(new Date(request.return_date), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:flex-col sm:items-end">
            <StatusBadge status={request.status} />
            <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
          </div>
        </div>

        {renderProgressTracker(request)}
      </div>
    </div>
  );

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
            <Package className="w-6 h-6 text-red-500" />
          </div>
          <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Unable to load your requests</p>
          <p className={`text-xs max-w-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            {error?.message || 'Failed to connect to the server. Please check your connection and try again.'}
          </p>
        </div>
      </div>
    );
  }

  /* ─────────── Summary counts ─────────── */
  const activeCount   = requests.filter(r => !['returned','rejected'].includes(r.status)).length;
  const returnedCount = requests.filter(r => r.status === 'returned').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const tabs = [
    { key: 'active',   label: 'Active',   count: activeCount },
    { key: 'history',  label: 'All History', count: requests.length },
  ];

  return (
    <div className={`space-y-5 ${isDark ? 'req-dark' : ''}`}>
      <style>{pageStyles}</style>

      {/* ── HERO BANNER ─────────────────────────────────────────── */}
      <div className="req-fade-up req-fade-1 relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-6 shadow-xl">
        <div className="req-orb   absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="req-orb-2 absolute -bottom-14 -left-8  w-44 h-44 rounded-full bg-indigo-400/20 pointer-events-none" />
        <div className="absolute top-4 right-28 w-2.5 h-2.5 rounded-full bg-white/30 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-blue-200 text-[10px] font-semibold uppercase tracking-widest mb-1">Equipment Borrowing</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">My Requests</h1>
            <p className="text-blue-200 text-sm mt-1.5 max-w-sm">
              Track and manage all your equipment borrow requests in one place.
            </p>
          </div>

          {/* Quick stat pills */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Active',   value: activeCount,   color: 'bg-white/20' },
              { label: 'Returned', value: returnedCount,  color: 'bg-emerald-400/20' },
              { label: 'Rejected', value: rejectedCount,  color: 'bg-red-400/20' },
            ].map(s => (
              <div key={s.label} className={`${s.color} backdrop-blur-sm rounded-xl px-3 py-2 text-center min-w-[60px] border border-white/20`}>
                <p className="text-lg font-black text-white leading-none">{s.value}</p>
                <p className="text-[9px] text-blue-200 font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TABS ────────────────────────────────────────────────── */}
      <div className="req-fade-up req-fade-2">
        <div className={`inline-flex gap-1 p-1 rounded-xl ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setFilter(tab.key); setHistoryPage(1); setHistoryFilter('all'); }}
              className={`tab-pill ${filter === tab.key
                ? isDark ? 'active-dark' : 'active-light'
                : isDark ? 'inactive-dark' : 'inactive-light'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-bold w-4 h-4 ${
                filter === tab.key
                  ? isDark ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                  : isDark ? 'bg-white/10 text-slate-500' : 'bg-slate-200 text-slate-500'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────── */}
      <div className="req-fade-up req-fade-3">
        {/* ── HISTORY FILTER CHIPS ── */}
        {filter === 'history' && (
          <div className="flex flex-wrap gap-2 mb-4">
            {HISTORY_FILTERS.map(hf => {
              const count = hf.statuses
                ? requests.filter(r => hf.statuses.includes(r.status)).length
                : requests.length;
              const isActive = historyFilter === hf.key;
              return (
                <button
                  key={hf.key}
                  onClick={() => { setHistoryFilter(hf.key); setHistoryPage(1); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    isActive
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : isDark
                        ? 'border-white/[0.10] text-slate-400 bg-white/[0.04] hover:bg-white/[0.08]'
                        : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'
                  }`}
                >
                  {hf.label}
                  <span className={`inline-flex items-center justify-center rounded-full text-[9px] font-bold min-w-[16px] h-4 px-1 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : isDark ? 'bg-white/10 text-slate-500' : 'bg-slate-100 text-slate-500'
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {allHistorySorted.length === 0 && filter === 'history' ? (
          <div className={`flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed text-center ${
            isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/60'
          }`}>
            <History className={`w-10 h-10 mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            <p className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>No matching requests</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Try a different filter above.</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed text-center ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/60'}`}>
            <BookOpen className={`w-10 h-10 mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            <p className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>No requests found</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              {filter === 'active' ? 'You have no active borrow requests.' : 'No request history yet.'}
            </p>
          </div>
        ) : filter === 'history' ? (
          <div className="space-y-6">
            {Object.values(historyGroups).map((group) => (
              <div key={group.key} className="space-y-3">
                <div className="flex items-center gap-2">
                  <History className={`w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <h3 className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{group.title}</h3>
                </div>
                <div className="space-y-3">
                  {group.requests.map(renderRequestCard)}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {historyTotalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Showing {(safePage - 1) * HISTORY_PAGE_SIZE + 1}–{Math.min(safePage * HISTORY_PAGE_SIZE, allHistorySorted.length)} of {allHistorySorted.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
                      safePage === 1
                        ? isDark ? 'border-white/[0.06] text-slate-700 cursor-not-allowed' : 'border-slate-200 text-slate-300 cursor-not-allowed'
                        : isDark ? 'border-white/[0.10] text-slate-300 hover:bg-white/[0.06]' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: historyTotalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setHistoryPage(page)}
                      className={`flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-semibold transition-colors ${
                        page === safePage
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : isDark ? 'border-white/[0.10] text-slate-400 hover:bg-white/[0.06]' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                    disabled={safePage === historyTotalPages}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
                      safePage === historyTotalPages
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
        ) : (
          <div className="space-y-3">
            {filteredRequests.map(renderRequestCard)}
          </div>
        )}
      </div>

      {/* ── REQUEST DETAILS DIALOG ──────────────────────────────── */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className={`sm:max-w-lg rounded-2xl shadow-2xl ${isDark ? 'bg-[#111118] border-white/10 text-slate-200' : 'bg-white border-slate-200 text-slate-900'}`}>
          <DialogHeader>
            <DialogTitle className={`text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Request Details
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-1 mt-2">
              {/* Equipment info row */}
              <div className={`flex items-center gap-3 p-4 rounded-xl ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{selectedRequest.equipment_name}</p>
                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Quantity: {selectedRequest.quantity}</p>
                </div>
                <div className="ml-auto">
                  <StatusBadge status={selectedRequest.status} />
                </div>
              </div>

              {/* Key-value pairs */}
              {[
                { label: 'Borrow Date', value: format(new Date(selectedRequest.borrow_date), 'MMM d, yyyy') },
                { label: 'Return Date', value: format(new Date(selectedRequest.return_date), 'MMM d, yyyy') },
              ].map(row => (
                <div key={row.label} className={`flex items-center justify-between px-4 py-3 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50/60'}`}>
                  <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{row.label}</span>
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{row.value}</span>
                </div>
              ))}

              {/* Purpose */}
              {selectedRequest.purpose && (
                <div className={`px-4 py-3 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50/60'}`}>
                  <p className={`text-xs mb-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Purpose</p>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{selectedRequest.purpose}</p>
                </div>
              )}

              {/* Remarks */}
              {selectedRequest.lecturer_remarks && (
                <div className={`px-4 py-3 rounded-xl border ${isDark ? 'bg-amber-950/20 border-amber-900/30' : 'bg-amber-50 border-amber-100'}`}>
                  <p className={`text-xs mb-1 font-semibold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Lecturer Remarks</p>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>{selectedRequest.lecturer_remarks}</p>
                </div>
              )}

              {selectedRequest.head_remarks && (
                <div className={`px-4 py-3 rounded-xl border ${isDark ? 'bg-blue-950/20 border-blue-900/30' : 'bg-blue-50 border-blue-100'}`}>
                  <p className={`text-xs mb-1 font-semibold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Head of Lab Remarks</p>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>{selectedRequest.head_remarks}</p>
                </div>
              )}

              {/* Progress tracker inside dialog */}
              {renderProgressTracker(selectedRequest)}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}