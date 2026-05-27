import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Package, Calendar, CheckCircle, RotateCcw, BookOpen, ChevronRight, AlertCircle,
  X, History, ChevronLeft, FilePlus2, UserCheck, BadgeCheck, PackageCheck, Laptop,
  Tag, Hash, GraduationCap, CalendarPlus, Clock, CheckCheck, ArrowRight, FileText,
} from 'lucide-react';
import { format, isToday } from 'date-fns';
import { useTheme } from '@/components/hooks/ThemeContext';
import { StudentRequestsSkeleton } from '@/skeleton-framework/student';
import { useLang } from '@/components/i18n/LangContext';
import { CATALOG_ROUTES_BY_ROLE } from '@/utils/roleCatalogRoutes';

// ── Status badge (dashboard-aligned) ─────────────────────────────────────────
const STATUS_STYLE = {
  pending_lecturer: { dot: '#f59e0b', bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
  pending_head:     { dot: '#f97316', bg: 'rgba(249,115,22,0.12)', text: '#fb923c', border: 'rgba(249,115,22,0.25)' },
  head_approved:    { dot: '#22c55e', bg: 'rgba(34,197,94,0.12)',  text: '#4ade80', border: 'rgba(34,197,94,0.25)'  },
  ready_pickup:     { dot: '#22c55e', bg: 'rgba(34,197,94,0.12)',  text: '#4ade80', border: 'rgba(34,197,94,0.25)'  },
  borrowed:         { dot: '#a78bfa', bg: 'rgba(167,139,250,0.12)',text: '#c4b5fd', border: 'rgba(167,139,250,0.25)' },
  returned:         { dot: '#64748b', bg: 'transparent',           text: '#94a3b8', border: 'transparent'           },
  rejected:         { dot: '#ef4444', bg: 'rgba(239,68,68,0.12)',  text: '#f87171', border: 'rgba(239,68,68,0.25)'  },
  approved:         { dot: '#22c55e', bg: 'rgba(34,197,94,0.12)',  text: '#4ade80', border: 'rgba(34,197,94,0.25)'  },
  pending:          { dot: '#f59e0b', bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
};

const STATUS_LABEL_KEYS = {
  pending_lecturer: 'pendingLecturer',
  pending_head:     'pendingHead',
  head_approved:    'headapproved',
  ready_pickup:     'readyPickup',
  borrowed:         'borrowed',
  returned:         'returned',
  rejected:         'rejected',
  approved:         'approved',
  pending:          'pending',
};

function DarkStatusBadge({ status }) {
  const { t } = useLang();
  const s = STATUS_STYLE[status] || { dot: '#64748b', bg: 'transparent', text: '#94a3b8', border: 'transparent' };
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {t(STATUS_LABEL_KEYS[status] || status)}
    </span>
  );
}

// ── Journey steps ─────────────────────────────────────────────────────────────
const journeySteps = [
  { key: 'pending_lecturer', labelKey: 'requestSubmitted',        Icon: FilePlus2    },
  { key: 'pending_head',     labelKey: 'journeyLecturerApproved', Icon: UserCheck    },
  { key: 'head_approved',    labelKey: 'journeyHeadApproved',     Icon: BadgeCheck   },
  { key: 'ready_pickup',     labelKey: 'readyForPickup',          Icon: PackageCheck },
  { key: 'borrowed',         labelKey: 'journeyInUse',            Icon: Laptop       },
  { key: 'returned',         labelKey: 'returned',                Icon: RotateCcw    },
];

const ACTIVE_PAGE_SIZE  = 5;
const HISTORY_PAGE_SIZE = 10;

const EquipmentThumb = ({ url, name, className = 'w-full h-full object-cover', fallbackClass = 'w-5 h-5', fallbackColor }) => {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <Package className={fallbackClass} style={fallbackColor ? { color: fallbackColor } : undefined} />;
  return <img src={url} alt={name} className={className} onError={() => setFailed(true)} />;
};

const HISTORY_FILTERS = [
  { key: 'all',      labelKey: 'all',      statuses: null },
  { key: 'pending',  labelKey: 'pending',  statuses: ['pending_lecturer', 'pending_head'] },
  { key: 'approved', labelKey: 'approved', statuses: ['head_approved', 'ready_pickup'] },
  { key: 'borrowed', labelKey: 'borrowed', statuses: ['borrowed'] },
  { key: 'returned', labelKey: 'returned', statuses: ['returned'] },
  { key: 'rejected', labelKey: 'rejected', statuses: ['rejected'] },
];

// ── Styles ────────────────────────────────────────────────────────────────────
const pageStyles = `
  @keyframes sdFadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .sd-fade { opacity: 0; animation: sdFadeUp 0.45s cubic-bezier(0.16,1,0.3,1) forwards; }
  .sd-d1 { animation-delay: 0.04s; }
  .sd-d2 { animation-delay: 0.10s; }
  .sd-d3 { animation-delay: 0.16s; }
  .sd-d4 { animation-delay: 0.22s; }
  .sd-d5 { animation-delay: 0.28s; }
  .sd-num { font-family: 'JetBrains Mono', monospace; }

  .req-card {
    transition: box-shadow 0.2s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
  }
  .req-card:hover { transform: translateY(-2px); }

  @keyframes modalSlideIn {
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  .req-modal-panel { animation: modalSlideIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards; }

  .req-img-banner {
    position: relative; overflow: hidden;
    height: 140px; border-radius: 16px 16px 0 0; background: #0d1117;
  }
  .req-img-banner img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
  .req-img-banner:hover img { transform: scale(1.03); }
  .req-img-banner::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0; z-index: 2;
    height: 80px; background: linear-gradient(to top, rgba(0,0,0,0.75), transparent);
    pointer-events: none;
  }
  .req-img-placeholder {
    width: 100%; height: 100%; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 8px;
    background: repeating-linear-gradient(135deg,#0d0d14 0px,#0d0d14 20px,#111118 20px,#111118 40px);
  }
  .req-img-placeholder-light {
    background: repeating-linear-gradient(135deg,#f1f5f9 0px,#f1f5f9 20px,#e2e8f0 20px,#e2e8f0 40px);
  }
  .req-img-nav {
    position: absolute; z-index: 10; top: 50%; transform: translateY(-50%);
    width: 28px; height: 28px; border-radius: 50%;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
    border: 1px solid rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: background 0.2s ease; color: white;
  }
  .req-img-nav:hover { background: rgba(0,0,0,0.75); }
  .req-img-dots {
    position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
    z-index: 10; display: flex; gap: 4px;
  }
  .req-img-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: rgba(255,255,255,0.4); transition: background 0.2s, width 0.2s;
  }
  .req-img-dot.active { background: white; width: 10px; border-radius: 3px; }

  .status-glow-pending  { box-shadow: 0 0 12px rgba(234,179,8,0.4); }
  .status-glow-approved { box-shadow: 0 0 12px rgba(59,130,246,0.4); }
  .status-glow-borrowed { box-shadow: 0 0 12px rgba(168,85,247,0.4); }
  .status-glow-returned { box-shadow: 0 0 12px rgba(34,197,94,0.4); }
  .status-glow-rejected { box-shadow: 0 0 12px rgba(239,68,68,0.4); }

  @keyframes stepPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
    50%      { box-shadow: 0 0 0 6px rgba(99,102,241,0); }
  }
  .step-current { animation: stepPulse 2s ease-in-out infinite; }

  @keyframes imgFade { from { opacity: 0; } to { opacity: 1; } }
  .req-img-fade { animation: imgFade 0.3s ease forwards; }

  .tab-pill {
    font-size: 0.8125rem; font-weight: 600;
    padding: 0.45rem 1.1rem; border-radius: 999px;
    cursor: pointer; border: none; background: transparent; outline: none;
    transition: color 0.2s ease;
  }
  .tab-pill.active-light  { background: white; color: #1e3a5f; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .tab-pill.active-dark   { background: rgba(255,255,255,0.10); color: #e2e8f0; }
  .tab-pill.inactive-light { color: #64748b; }
  .tab-pill.inactive-dark  { color: #475569; }
`;

export default function MyRequests() {
  const [filter, setFilter]                     = useState('active');
  const [selectedRequest, setSelectedRequest]   = useState(null);
  const [activePage, setActivePage]             = useState(1);
  const [historyPage, setHistoryPage]           = useState(1);
  const [historyFilter, setHistoryFilter]       = useState('all');
  const [modalImageIndex, setModalImageIndex]   = useState(0);
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [extDate, setExtDate]                   = useState('');
  const [extReason, setExtReason]               = useState('');

  useEffect(() => {
    document.body.style.overflow = selectedRequest ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedRequest]);

  const { isDark }    = useTheme();
  const { t }         = useLang();
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const catalogRoute  = CATALOG_ROUTES_BY_ROLE.student;

  // ── Theme tokens (mirrors dashboard) ──────────────────────────────────────
  const surface  = isDark ? 'glass-dark' : 'glass-light';
  const txt      = isDark ? 'text-white' : 'text-slate-900';
  const txtsub   = isDark ? 'text-slate-400' : 'text-slate-500';
  const txtmuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const divider  = isDark ? 'border-white/[0.07]' : 'border-white/50';

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: requests = [], isLoading, isError, error } = useQuery({
    queryKey: ['myRequests'],
    queryFn: () => api.entities.BorrowRequest.myRequests(),
    enabled: !!user,
  });

  // ── Mutation ──────────────────────────────────────────────────────────────
  const extensionMutation = useMutation({
    mutationFn: ({ id, requested_date, reason }) =>
      api.entities.BorrowRequest.requestExtension(id, { requested_date, reason }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['myRequests'] });
      setSelectedRequest(prev =>
        prev ? { ...prev, extension_request: updated.extension_request } : prev
      );
      setShowExtensionForm(false);
      setExtDate('');
      setExtReason('');
    },
  });

  const defaultExtDate = (returnDate) => {
    const today     = new Date().toISOString().slice(0, 10);
    const returnMin = new Date(returnDate).toISOString().slice(0, 10);
    return today > returnMin ? today : returnMin;
  };

  const getHistoryTimestamp = (req) =>
    req.actual_return_date || req.rejected_at || req.released_at ||
    req.updatedAt || req.created_date || req.createdAt || req.borrow_date;

  const fmtReqId = (req) => {
    const id   = req._id || req.id || '';
    const year = req.createdAt ? new Date(req.createdAt).getFullYear() : new Date().getFullYear();
    const num  = id ? parseInt(id.slice(-4), 16) % 10000 : 0;
    return `REQ-${year}-${String(num).padStart(4, '0')}`;
  };

  const getStatusStep = (status) => {
    const idx = journeySteps.findIndex(s => s.key === status);
    return idx >= 0 ? idx + 1 : 1;
  };

  const getStatusGlowClass = (status) => {
    if (['pending_lecturer', 'pending_head'].includes(status)) return 'status-glow-pending';
    if (['head_approved', 'ready_pickup'].includes(status))    return 'status-glow-approved';
    if (status === 'borrowed') return 'status-glow-borrowed';
    if (status === 'returned') return 'status-glow-returned';
    if (status === 'rejected') return 'status-glow-rejected';
    return '';
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setModalImageIndex(0);
    setShowExtensionForm(false);
    setExtDate('');
    setExtReason('');
  };

  // ── Early returns ─────────────────────────────────────────────────────────
  if (isLoading) return <StudentRequestsSkeleton />;

  if (isError) return (
    <div className={`flex flex-col items-center justify-center py-20 rounded-2xl ${surface}`}>
      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
        <Package className="w-6 h-6 text-red-500" />
      </div>
      <p className={`text-sm font-medium ${txt}`}>{t('unableLoadRequests')}</p>
      <p className={`text-xs mt-1 max-w-sm text-center ${txtsub}`}>
        {error?.message || t('failedToConnect')}
      </p>
    </div>
  );

  // ── Computed values ───────────────────────────────────────────────────────
  const activeCount   = requests.filter(r => !['returned', 'rejected'].includes(r.status)).length;
  const pendingCount  = requests.filter(r => ['pending_lecturer', 'pending_head'].includes(r.status)).length;
  const borrowedCount = requests.filter(r => r.status === 'borrowed').length;
  const returnedCount = requests.filter(r => r.status === 'returned').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const filteredRequests = requests
    .filter(r => filter === 'active' ? !['returned', 'rejected'].includes(r.status) : true)
    .sort((a, b) =>
      filter !== 'history' ? 0 :
      new Date(getHistoryTimestamp(b)).getTime() - new Date(getHistoryTimestamp(a)).getTime()
    );

  const activeHistoryFilter = HISTORY_FILTERS.find(f => f.key === historyFilter) || HISTORY_FILTERS[0];
  const allHistorySorted    = filter === 'history'
    ? filteredRequests.filter(r =>
        !activeHistoryFilter.statuses || activeHistoryFilter.statuses.includes(r.status)
      )
    : [];
  const historyTotalPages = Math.max(1, Math.ceil(allHistorySorted.length / HISTORY_PAGE_SIZE));
  const safePage          = Math.min(historyPage, historyTotalPages);
  const pagedHistory      = allHistorySorted.slice(
    (safePage - 1) * HISTORY_PAGE_SIZE, safePage * HISTORY_PAGE_SIZE
  );

  const historyGroups = filter === 'history'
    ? pagedHistory.reduce((acc, req) => {
        const ts    = getHistoryTimestamp(req);
        const key   = format(new Date(ts), 'yyyy-MM-dd');
        const title = isToday(new Date(ts))
          ? `Today - ${format(new Date(ts), 'EEEE, MMMM d, yyyy')}`
          : format(new Date(ts), 'EEEE, MMMM d, yyyy');
        if (!acc[key]) acc[key] = { key, title, requests: [] };
        acc[key].requests.push(req);
        return acc;
      }, {})
    : {};

  const activeTotalPages = Math.max(1, Math.ceil(filteredRequests.length / ACTIVE_PAGE_SIZE));
  const safeActivePage   = Math.min(activePage, activeTotalPages);
  const pagedActive      = filteredRequests.slice(
    (safeActivePage - 1) * ACTIVE_PAGE_SIZE, safeActivePage * ACTIVE_PAGE_SIZE
  );

  const tabs = [
    { key: 'active',  label: t('active'),     count: activeCount },
    { key: 'history', label: t('allHistory'), count: requests.length },
  ];

  // ── Stat tiles (same pattern as dashboard) ────────────────────────────────
  const statTiles = [
    {
      label: t('srActiveRequests'), sublabel: `${pendingCount} ${t('sdPendingReviewSuffix')}`,
      value: activeCount,   Icon: FileText,    numColor: '#3b82f6',
      iconBg: 'rgba(59,130,246,0.13)',  iconBorder: 'rgba(59,130,246,0.28)',  iconColor: '#3b82f6',
    },
    {
      label: t('srPendingReviewLabel'), sublabel: t('srAwaitingApproval'),
      value: pendingCount,  Icon: Clock,       numColor: '#f59e0b',
      iconBg: 'rgba(245,158,11,0.13)', iconBorder: 'rgba(245,158,11,0.28)', iconColor: '#f59e0b',
    },
    {
      label: t('srInUseLabel'),         sublabel: t('sdReturnByDate'),
      value: borrowedCount, Icon: RotateCcw,   numColor: '#a78bfa',
      iconBg: 'rgba(167,139,250,0.13)',iconBorder: 'rgba(167,139,250,0.28)',iconColor: '#a78bfa',
    },
    {
      label: t('rejected'),              sublabel: `${returnedCount} ${t('returned')}`,
      value: rejectedCount, Icon: AlertCircle, numColor: '#ef4444',
      iconBg: 'rgba(239,68,68,0.13)',  iconBorder: 'rgba(239,68,68,0.28)',  iconColor: '#ef4444',
    },
  ];

  // ── Pagination bar ────────────────────────────────────────────────────────
  const PaginationBar = ({ page, totalPages, onPage, total, pageSize }) => (
    <div className="flex items-center justify-between pt-2">
      <p className={`text-xs ${txtmuted}`}>
        {t('showing')} {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} {t('ofLabel')} {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
            page === 1
              ? isDark ? 'border-white/[0.06] text-slate-700 cursor-not-allowed' : 'border-slate-200 text-slate-300 cursor-not-allowed'
              : isDark ? 'border-white/[0.10] text-slate-300 hover:bg-white/[0.06]' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            onClick={() => onPage(() => p)}
            className={`flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-semibold transition-colors ${
              p === page
                ? 'bg-blue-600 border-blue-600 text-white'
                : isDark ? 'border-white/[0.10] text-slate-400 hover:bg-white/[0.06]' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
            page === totalPages
              ? isDark ? 'border-white/[0.06] text-slate-700 cursor-not-allowed' : 'border-slate-200 text-slate-300 cursor-not-allowed'
              : isDark ? 'border-white/[0.10] text-slate-300 hover:bg-white/[0.06]' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // ── Progress tracker ──────────────────────────────────────────────────────
  const renderProgressTracker = (request) => {
    if (request.status === 'rejected') {
      return (
        <div className={`mt-3 rounded-xl border px-3 py-2 text-xs flex items-center gap-2 ${
          isDark ? 'border-red-900/40 bg-red-950/20 text-red-400' : 'border-red-100 bg-red-50 text-red-700'
        }`}>
          <X className="w-3.5 h-3.5 flex-shrink-0" />
          {t('requestWasRejected')}
        </div>
      );
    }

    const currentStep = getStatusStep(request.status);
    const progress    = (currentStep / journeySteps.length) * 100;

    return (
      <div className={`mt-3 rounded-xl border p-3 ${isDark ? 'border-white/[0.07] bg-white/[0.03]' : 'border-slate-100 bg-slate-50/80'}`}>
        <div className="mb-2 flex items-center justify-between">
          <p className={`text-[10px] font-semibold uppercase tracking-widest ${txtmuted}`}>{t('progress')}</p>
          <p className={`text-[10px] ${txtmuted}`}>{t('step')} {currentStep} {t('ofLabel')} {journeySteps.length}</p>
        </div>
        <div className={`relative mb-3 h-1.5 w-full overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-1.5 md:grid-cols-6">
          {journeySteps.map((step, index) => {
            const stepNum   = index + 1;
            const isDone    = currentStep > stepNum;
            const isCurrent = currentStep === stepNum;
            return (
              <div key={step.key} className="flex flex-col items-center gap-1 text-center">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                  isDone    ? 'bg-blue-600 text-white' :
                  isCurrent ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20' :
                  isDark    ? 'bg-white/[0.06] text-slate-600' : 'bg-slate-200 text-slate-400'
                }`}>
                  {isDone
                    ? <CheckCircle className="w-3 h-3" />
                    : <step.Icon className={`w-3 h-3 ${!isCurrent ? 'opacity-40' : ''}`} />
                  }
                </div>
                <span className={`text-[9px] leading-tight ${
                  isDone || isCurrent
                    ? isDark ? 'text-slate-300' : 'text-slate-700'
                    : isDark ? 'text-slate-600' : 'text-slate-400'
                }`}>{t(step.labelKey)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Request card ──────────────────────────────────────────────────────────
  const renderRequestCard = (request) => {
    const accentColor = STATUS_STYLE[request.status]?.dot || '#64748b';

    return (
      <div
        key={request.id || request._id}
        onClick={() => setSelectedRequest(request)}
        className={`req-card relative rounded-2xl cursor-pointer overflow-hidden ${surface}`}
      >
        {/* Status accent bar */}
        <div
          className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full"
          style={{ background: accentColor }}
        />

        <div className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            {/* Left: thumbnail + info */}
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center ${
                isDark ? 'border border-white/[0.08] bg-white/[0.04]' : 'border border-slate-200/60 bg-slate-50'
              }`}>
                <EquipmentThumb url={request.equipment_image_url} name={request.equipment_name} fallbackColor={accentColor} />
              </div>

              <div className="min-w-0">
                <p className={`text-[10px] font-mono font-semibold tracking-wide mb-0.5 sd-num ${txtmuted}`}>
                  {fmtReqId(request)}
                </p>
                <h3 className={`font-semibold text-sm truncate max-w-[200px] sm:max-w-[280px] ${txt}`}>
                  {request.equipment_name}
                </h3>
                <div className={`flex items-center gap-1.5 mt-1 text-xs flex-wrap ${txtsub}`}>
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  <span>
                    {format(new Date(request.borrow_date), 'MMM d')} – {format(new Date(request.return_date), 'MMM d, yyyy')}
                  </span>
                  <span className={`${txtmuted}`}>· ×{request.quantity}</span>
                </div>
              </div>
            </div>

            {/* Right: status badge + chevron */}
            <div className="flex items-center gap-2 sm:flex-col sm:items-end flex-shrink-0">
              <DarkStatusBadge status={request.status} />
              <ChevronRight className={`w-4 h-4 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            </div>
          </div>

          {renderProgressTracker(request)}

          {/* Extension shortcut (borrowed only) */}
          {request.status === 'borrowed' && (() => {
            const ext        = request.extension_request;
            const isPending  = ext?.status === 'pending'  && !!ext?.requested_date;
            const isApproved = ext?.status === 'approved' && !!ext?.requested_date;

            if (isPending) return (
              <div
                onClick={e => e.stopPropagation()}
                className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 border ${
                  isDark ? 'bg-yellow-950/20 border-yellow-900/30' : 'bg-yellow-50 border-yellow-100'
                }`}
              >
                <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <p className={`text-xs font-semibold ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>
                  {t('extensionPending')}
                </p>
                <span className={`ml-auto text-[10px] ${isDark ? 'text-yellow-600' : 'text-yellow-500'}`}>
                  {format(new Date(ext.requested_date), 'MMM d, yyyy')}
                </span>
              </div>
            );

            if (isApproved) return (
              <div
                onClick={e => e.stopPropagation()}
                className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 border ${
                  isDark ? 'bg-emerald-950/20 border-emerald-900/30' : 'bg-emerald-50 border-emerald-100'
                }`}
              >
                <CheckCheck className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <p className={`text-xs font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                  {t('extensionApproved')}
                </p>
                <span className={`ml-auto text-[10px] font-medium ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`}>
                  {format(new Date(ext.requested_date), 'MMM d, yyyy')}
                </span>
              </div>
            );

            return (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setSelectedRequest(request);
                  setExtDate(defaultExtDate(request.return_date));
                  setShowExtensionForm(true);
                }}
                className={`mt-3 w-full py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                  isDark
                    ? 'border-violet-700/50 text-violet-400 hover:bg-violet-900/20'
                    : 'border-violet-200 text-violet-600 hover:bg-violet-50'
                }`}
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                {t('requestExtensionButton')}
              </button>
            );
          })()}
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <style>{pageStyles}</style>

      {/* ── HEADER (mirrors dashboard header) ─────────────────────────── */}
      <div className={`sd-fade sd-d1 rounded-2xl p-5 sm:p-6 ${surface}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className={`text-[10px] font-semibold tracking-widest uppercase mb-2 ${txtmuted}`}>
              {t('srEquipmentBorrowing')}
            </p>
            <h1 className={`text-2xl sm:text-3xl font-bold leading-tight ${txt}`}>
              {t('myRequestsTitle')}
            </h1>
            <p className={`text-sm mt-2 max-w-lg leading-relaxed ${txtsub}`}>
              {t('myRequestsHeroDesc')}
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-3 sm:mt-1">
            {/* Quick stat pills (ACTIVE / RETURNED / REJECTED) */}
            <div className="flex gap-2">
              {[
                { label: t('active'),   value: activeCount,   numColor: isDark ? '#e2e8f0' : '#1e40af' },
                { label: t('returned'), value: returnedCount, numColor: '#22c55e' },
                { label: t('rejected'), value: rejectedCount, numColor: '#ef4444' },
              ].map(s => (
                <div
                  key={s.label}
                  className={`rounded-xl px-3.5 py-2.5 text-center min-w-[64px] border ${
                    isDark
                      ? 'bg-black/50 border-white/[0.09]'
                      : 'bg-white/70 border-slate-200'
                  }`}
                >
                  <p className={`text-[9px] font-semibold uppercase tracking-widest ${txtmuted}`}>
                    {s.label}
                  </p>
                  <p className="sd-num text-[22px] font-black leading-tight mt-0.5" style={{ color: s.numColor }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── STAT TILES (identical pattern to dashboard) ─────────────────── */}
      <div className="sd-fade sd-d2 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statTiles.map(s => (
          <div key={s.label} className={`rounded-2xl p-5 ${surface}`}>
            <div className="flex items-start justify-between mb-4">
              <p className={`text-[10px] font-semibold uppercase tracking-widest leading-snug pr-2 ${txtsub}`}>
                {s.label}
              </p>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: s.iconBg, border: `1px solid ${s.iconBorder}` }}
              >
                <s.Icon className="w-4 h-4" style={{ color: s.iconColor }} />
              </div>
            </div>
            <p className="sd-num text-3xl font-bold tabular-nums leading-none mb-2" style={{ color: s.numColor }}>
              {s.value}
            </p>
            <p className={`text-xs leading-snug ${txtmuted}`}>{s.sublabel}</p>
          </div>
        ))}
      </div>

      {/* ── TABS ────────────────────────────────────────────────────────── */}
      <div className="sd-fade sd-d3">
        <div className={`inline-flex gap-1 p-1 rounded-xl ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setFilter(tab.key); setActivePage(1); setHistoryPage(1); setHistoryFilter('all'); }}
              className={`tab-pill ${
                filter === tab.key
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

      {/* ── CONTENT ─────────────────────────────────────────────────────── */}
      <div className="sd-fade sd-d4 space-y-3">

        {/* History filter chips */}
        {filter === 'history' && (
          <div className="flex flex-wrap gap-2">
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
                  {t(hf.labelKey)}
                  <span className={`inline-flex items-center justify-center rounded-full text-[9px] font-bold min-w-[16px] h-4 px-1 ${
                    isActive ? 'bg-white/20 text-white' : isDark ? 'bg-white/10 text-slate-500' : 'bg-slate-100 text-slate-500'
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Empty states */}
        {(filter === 'history' ? allHistorySorted : filteredRequests).length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed text-center ${
            isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/60'
          }`}>
            {filter === 'history'
              ? <History className={`w-10 h-10 mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
              : <BookOpen className={`w-10 h-10 mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            }
            <p className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {filter === 'history' && historyFilter !== 'all' ? t('noMatchingRequests') :
               filter === 'active' ? t('noRequestsFound') : t('noRequestHistory')}
            </p>
            <p className={`text-xs mt-1 ${txtmuted}`}>
              {filter === 'active' ? t('noActiveRequests') : t('tryDifferentFilter')}
            </p>
            {filter === 'active' && (
              <button
                onClick={() => navigate(catalogRoute)}
                className="mt-3 text-sm text-blue-500 font-semibold flex items-center gap-1"
              >
                {t('sdBrowseEquipment')} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        ) : filter === 'history' ? (
          <div className="space-y-6">
            {Object.values(historyGroups).map(group => (
              <div key={group.key} className="space-y-3">
                <div className="flex items-center gap-2">
                  <History className={`w-3.5 h-3.5 ${txtmuted}`} />
                  <h3 className={`text-xs font-semibold uppercase tracking-widest ${txtmuted}`}>
                    {group.title}
                  </h3>
                </div>
                <div className="space-y-3">
                  {group.requests.map(renderRequestCard)}
                </div>
              </div>
            ))}
            {historyTotalPages > 1 && (
              <PaginationBar
                page={safePage} totalPages={historyTotalPages} onPage={setHistoryPage}
                total={allHistorySorted.length} pageSize={HISTORY_PAGE_SIZE}
              />
            )}
          </div>

        ) : (
          <div className="space-y-3">
            {pagedActive.map(renderRequestCard)}
            {activeTotalPages > 1 && (
              <PaginationBar
                page={safeActivePage} totalPages={activeTotalPages} onPage={setActivePage}
                total={filteredRequests.length} pageSize={ACTIVE_PAGE_SIZE}
              />
            )}
          </div>
        )}
      </div>

      {/* ── REQUEST DETAILS DIALOG ──────────────────────────────────────── */}
      <Dialog open={!!selectedRequest} onOpenChange={closeModal}>
        <DialogContent
          className={`p-0 overflow-hidden sm:max-w-xl rounded-2xl shadow-2xl border-0 req-modal-panel ${isDark ? 'text-slate-200' : 'text-slate-900'}`}
          style={isDark ? {
            background: 'rgba(13,13,20,0.97)',
            backdropFilter: 'blur(32px) saturate(140%)',
            WebkitBackdropFilter: 'blur(32px) saturate(140%)',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
          } : {
            background: 'rgba(255,255,255,0.93)',
            backdropFilter: 'blur(32px) saturate(160%)',
            WebkitBackdropFilter: 'blur(32px) saturate(160%)',
            border: '1px solid rgba(255,255,255,0.85)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.95)',
          }}
        >
          {selectedRequest && (() => {
            const images      = selectedRequest.equipment_images_urls || [];
            const hasImages   = images.length > 0;
            const currentImg  = hasImages ? images[modalImageIndex] : null;
            const currentStep = selectedRequest.status !== 'rejected' ? getStatusStep(selectedRequest.status) : 0;

            return (
              <>
                {/* ── IMAGE BANNER ─────────────────────────────────────── */}
                <div className="req-img-banner">
                  {hasImages ? (
                    <>
                      <img
                        key={currentImg}
                        src={currentImg}
                        alt={selectedRequest.equipment_name}
                        className="req-img-fade"
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                      {images.length > 1 && (
                        <>
                          <button
                            className="req-img-nav"
                            style={{ left: 8 }}
                            onClick={() => setModalImageIndex(i => (i === 0 ? images.length - 1 : i - 1))}
                            aria-label="Previous image"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="req-img-nav"
                            style={{ right: 8 }}
                            onClick={() => setModalImageIndex(i => (i === images.length - 1 ? 0 : i + 1))}
                            aria-label="Next image"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <div className="req-img-dots">
                            {images.map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setModalImageIndex(i)}
                                className={`req-img-dot ${i === modalImageIndex ? 'active' : ''}`}
                                aria-label={`Image ${i + 1}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className={`req-img-placeholder ${isDark ? '' : 'req-img-placeholder-light'}`}>
                      <Package className={`w-10 h-10 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
                      <span className={`text-xs font-medium ${isDark ? 'text-slate-700' : 'text-slate-400'}`}>
                        {t('noImage')}
                      </span>
                    </div>
                  )}

                  {/* Floating name + status over banner */}
                  <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-3 flex items-end justify-between">
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${hasImages ? 'text-blue-300' : isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                        {t('equipment')}
                      </p>
                      <h2 className={`text-base font-black leading-tight drop-shadow-md ${hasImages ? 'text-white' : isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {selectedRequest.equipment_name}
                      </h2>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider border backdrop-blur-sm ${getStatusGlowClass(selectedRequest.status)} ${
                      selectedRequest.status === 'rejected'
                        ? 'bg-red-500/20 border-red-500/50 text-red-300'
                        : selectedRequest.status === 'returned'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : selectedRequest.status === 'borrowed'
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                        : ['head_approved', 'ready_pickup'].includes(selectedRequest.status)
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                        : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                    }`}>
                      {selectedRequest.status.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>

                {/* ── SCROLLABLE BODY ───────────────────────────────────── */}
                <div className="overflow-y-auto max-h-[calc(100vh-180px)] sm:max-h-[calc(90vh-150px)]">

                  {/* Meta pills + purpose */}
                  <div className={`px-5 py-2 border-b ${divider}`}>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {[
                        { Icon: Hash,     text: `Qty: ${selectedRequest.quantity}` },
                        { Icon: Calendar, text: format(new Date(selectedRequest.borrow_date), 'MMM d') + ' → ' + format(new Date(selectedRequest.return_date), 'MMM d, yyyy') },
                      ].map(({ Icon, text }) => (
                        <span key={text} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
                          isDark ? 'bg-white/[0.04] border-white/[0.08] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                          <Icon className="w-3 h-3 opacity-60" />{text}
                        </span>
                      ))}
                      {selectedRequest.equipment?.category && (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
                          isDark ? 'bg-white/[0.04] border-white/[0.08] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                          <Tag className="w-3 h-3 opacity-60" />{selectedRequest.equipment.category}
                        </span>
                      )}
                    </div>
                    {selectedRequest.purpose && (
                      <p className={`text-xs leading-relaxed line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span className={`font-bold mr-1.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{t('purpose')}:</span>
                        {selectedRequest.purpose}
                      </p>
                    )}
                    {(selectedRequest.lecturer?.name || selectedRequest.lecturer_email) && (
                      <div className={`mt-1.5 flex items-center gap-2 rounded-lg px-3 py-1.5 border ${
                        isDark ? 'bg-indigo-950/30 border-indigo-900/40' : 'bg-indigo-50 border-indigo-100'
                      }`}>
                        <GraduationCap className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
                        <div className="min-w-0">
                          <p className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-indigo-600' : 'text-indigo-400'}`}>
                            {t('assignedLecturer')}
                          </p>
                          <p className={`text-xs font-semibold truncate ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                            {selectedRequest.lecturer?.name || selectedRequest.lecturer_email}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Journey stepper */}
                  <div className={`px-5 pt-2.5 pb-2.5 border-b ${divider}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                      {t('requestJourney')}
                    </p>
                    {selectedRequest.status === 'rejected' ? (
                      <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${isDark ? 'bg-red-950/30 border-red-900/40' : 'bg-red-50 border-red-100'}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-red-900/60 text-red-400' : 'bg-red-100 text-red-600'}`}>
                          <X className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isDark ? 'text-red-400' : 'text-red-700'}`}>{t('requestRejectedTitle')}</p>
                          <p className={`text-[10px] ${isDark ? 'text-red-600' : 'text-red-500'}`}>{t('requestNotApproved')}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start">
                        {journeySteps.map((step, index) => {
                          const stepNum   = index + 1;
                          const isDone    = currentStep > stepNum;
                          const isCurrent = currentStep === stepNum;
                          const isLast    = index === journeySteps.length - 1;
                          const { Icon } = step;
                          return (
                            <div key={step.key} className="flex-1 flex flex-col items-center relative">
                              {index > 0 && (
                                <div className={`absolute left-0 right-1/2 top-[14px] h-px ${
                                  isDone || isCurrent
                                    ? isDone ? 'bg-emerald-500/70' : 'bg-indigo-500/50'
                                    : isDark ? 'bg-white/[0.08]' : 'bg-slate-200'
                                }`} />
                              )}
                              {!isLast && (
                                <div className={`absolute left-1/2 right-0 top-[14px] h-px ${
                                  isDone ? 'bg-emerald-500/70' : isDark ? 'bg-white/[0.08]' : 'bg-slate-200'
                                }`} />
                              )}
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 transition-all duration-300 ${
                                isDone    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' :
                                isCurrent ? 'bg-indigo-600 text-white step-current' :
                                isDark    ? 'bg-[#1a1a24] text-slate-600 border border-white/[0.08]' :
                                            'bg-slate-100 text-slate-300 border border-slate-200'
                              }`}>
                                {isDone
                                  ? <CheckCircle className="w-3.5 h-3.5" />
                                  : <Icon className={`w-3 h-3 ${isCurrent ? '' : 'opacity-40'}`} />
                                }
                              </div>
                              <p className={`text-[9px] font-semibold text-center mt-1 leading-tight px-0.5 ${
                                isDone    ? isDark ? 'text-emerald-500' : 'text-emerald-600' :
                                isCurrent ? isDark ? 'text-indigo-300' : 'text-indigo-600' :
                                isDark    ? 'text-slate-700' : 'text-slate-300'
                              }`}>{t(step.labelKey)}</p>
                              {isCurrent && (
                                <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse mt-0.5" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Rejection reason */}
                  {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason && (
                    <div className={`px-5 py-2 border-b ${divider}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <AlertCircle className={`w-3 h-3 ${isDark ? 'text-red-500' : 'text-red-400'}`} />
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                          {t('rejectionDetails')}
                        </p>
                      </div>
                      <div className={`rounded-xl px-3 py-2.5 border ${isDark ? 'bg-red-950/30 border-red-900/40' : 'bg-red-50 border-red-100'}`}>
                        <p className={`text-xs leading-relaxed ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                          {selectedRequest.rejection_reason}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Extension section */}
                  {selectedRequest.status === 'borrowed' && (() => {
                    const ext        = selectedRequest.extension_request;
                    const isPending  = ext?.status === 'pending'  && !!ext?.requested_date;
                    const isApproved = ext?.status === 'approved' && !!ext?.requested_date;
                    const isRejected = ext?.status === 'rejected' && !!ext?.requested_date;

                    return (
                      <div className={`px-5 py-2 border-b ${divider}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <CalendarPlus className={`w-3.5 h-3.5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                            {t('returnDateExtension')}
                          </p>
                        </div>

                        {isPending && (
                          <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2 mb-1.5 border ${isDark ? 'bg-yellow-950/30 border-yellow-900/40' : 'bg-yellow-50 border-yellow-100'}`}>
                            <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                            <div>
                              <p className={`text-xs font-semibold ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>{t('extensionPending')}</p>
                              <p className={`text-[10px] ${isDark ? 'text-yellow-600' : 'text-yellow-500'}`}>
                                {t('requestedUntil')} {format(new Date(ext.requested_date), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                        )}
                        {isApproved && (
                          <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2 mb-1.5 border ${isDark ? 'bg-emerald-950/30 border-emerald-900/40' : 'bg-emerald-50 border-emerald-100'}`}>
                            <CheckCheck className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                            <div>
                              <p className={`text-xs font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{t('extensionApproved')}</p>
                              <p className={`text-[10px] ${isDark ? 'text-emerald-600' : 'text-emerald-500'}`}>
                                {t('newReturnDate')}: {format(new Date(ext.requested_date), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                        )}
                        {isRejected && (
                          <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2 mb-1.5 border ${isDark ? 'bg-red-950/30 border-red-900/40' : 'bg-red-50 border-red-100'}`}>
                            <X className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                            <div>
                              <p className={`text-xs font-semibold ${isDark ? 'text-red-300' : 'text-red-700'}`}>{t('extensionRejected')}</p>
                              {ext.review_note && (
                                <p className={`text-[10px] ${isDark ? 'text-red-600' : 'text-red-500'}`}>{ext.review_note}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {showExtensionForm && !isPending ? (
                          <div className={`rounded-xl border p-2.5 ${isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-slate-50 border-slate-200'}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              {t('newReturnDate')}
                            </p>
                            <input
                              type="date"
                              value={extDate}
                              min={(() => {
                                const today     = new Date().toISOString().slice(0, 10);
                                const returnMin = format(new Date(selectedRequest.return_date), 'yyyy-MM-dd');
                                return today > returnMin ? today : returnMin;
                              })()}
                              onChange={e => {
                                const val       = e.target.value;
                                const today     = new Date().toISOString().slice(0, 10);
                                const returnMin = format(new Date(selectedRequest.return_date), 'yyyy-MM-dd');
                                const minDate   = today > returnMin ? today : returnMin;
                                setExtDate(val < minDate ? minDate : val);
                              }}
                              className={`w-full rounded-lg px-3 py-2 text-sm border mb-2 outline-none focus:ring-2 focus:ring-violet-500/50 ${
                                isDark ? 'bg-[#111118] border-white/[0.10] text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            />
                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              {t('reasonOptional')}
                            </p>
                            <textarea
                              rows={2}
                              value={extReason}
                              onChange={e => setExtReason(e.target.value)}
                              placeholder={t('whyNeedMoreTime')}
                              className={`w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-2 focus:ring-violet-500/50 resize-none mb-3 ${
                                isDark
                                  ? 'bg-[#111118] border-white/[0.10] text-slate-200 placeholder:text-slate-600'
                                  : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400'
                              }`}
                            />
                            {extensionMutation.isError && (
                              <p className="text-xs text-red-500 mb-2">
                                {extensionMutation.error?.message || t('failedToSubmit')}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  if (!extDate) return;
                                  extensionMutation.mutate({
                                    id: selectedRequest._id || selectedRequest.id,
                                    requested_date: extDate,
                                    reason: extReason,
                                  });
                                }}
                                disabled={!extDate || extensionMutation.isPending}
                                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white transition-colors"
                              >
                                {extensionMutation.isPending ? t('submitting') : t('submitRequest')}
                              </button>
                              <button
                                onClick={() => { setShowExtensionForm(false); setExtDate(''); setExtReason(''); }}
                                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                                  isDark ? 'bg-white/[0.06] hover:bg-white/[0.10] text-slate-400' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                                }`}
                              >
                                {t('cancel')}
                              </button>
                            </div>
                          </div>
                        ) : !isPending ? (
                          <button
                            onClick={() => { setExtDate(defaultExtDate(selectedRequest.return_date)); setShowExtensionForm(true); }}
                            className={`w-full py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                              isDark
                                ? 'border-violet-700/50 text-violet-400 hover:bg-violet-900/20'
                                : 'border-violet-200 text-violet-600 hover:bg-violet-50'
                            }`}
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                            {t('requestExtensionButton')}
                          </button>
                        ) : null}
                      </div>
                    );
                  })()}

                  {/* Footer actions */}
                  <div className="px-5 py-2.5 flex flex-col gap-1.5">
                    {selectedRequest.status === 'returned' && (
                      <button
                        onClick={() => { closeModal(); navigate(catalogRoute); }}
                        className="w-full py-2 rounded-xl text-sm font-semibold transition-colors bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        {t('borrowAgain')}
                      </button>
                    )}
                    <button
                      onClick={closeModal}
                      className={`w-full py-2 rounded-xl text-sm font-semibold transition-colors ${
                        isDark ? 'bg-white/[0.06] hover:bg-white/[0.10] text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {t('close')}
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
