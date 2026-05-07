import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Package, Calendar, CheckCircle, RotateCcw, BookOpen, ChevronRight, AlertCircle,
  X, History, ChevronLeft, FilePlus2, UserCheck, BadgeCheck, PackageCheck, Laptop,
  Tag, Hash, GraduationCap, CalendarPlus, Clock, CheckCheck
} from 'lucide-react';
import { format, isToday } from 'date-fns';
import { useTheme } from '@/components/hooks/ThemeContext';
import { StudentRequestsSkeleton } from '@/skeleton-framework/student';
import { useLang } from '@/components/i18n/LangContext';

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
  .req-dark .req-hero-banner {
    background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 45%, #3730a3 100%) !important;
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

  /* ── NEW MODAL STYLES ── */
  @keyframes modalSlideIn {
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
  }
  .req-modal-panel {
    animation: modalSlideIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards;
  }

  .req-img-banner {
    position: relative;
    overflow: hidden;
    height: 180px;
    border-radius: 16px 16px 0 0;
    background: #0d1117;
  }
  .req-img-banner img {
    width: 100%; height: 100%; object-fit: cover;
    transition: transform 0.4s ease;
  }
  .req-img-banner:hover img { transform: scale(1.03); }

  /* diagonal scanline overlay */
  .req-img-banner::before {
    content: '';
    position: absolute; inset: 0; z-index: 1;
    background: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 3px,
      rgba(0,0,0,0.04) 3px,
      rgba(0,0,0,0.04) 4px
    );
    pointer-events: none;
  }
  /* bottom gradient fade */
  .req-img-banner::after {
    content: '';
    position: absolute; bottom: 0; left: 0; right: 0; z-index: 2;
    height: 80px;
    background: linear-gradient(to top, rgba(0,0,0,0.75), transparent);
    pointer-events: none;
  }
  .req-img-placeholder {
    width: 100%; height: 100%;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 8px;
    background: repeating-linear-gradient(
      135deg,
      #0d0d14 0px, #0d0d14 20px,
      #111118 20px, #111118 40px
    );
  }
  .req-img-placeholder-light {
    background: repeating-linear-gradient(
      135deg,
      #f1f5f9 0px, #f1f5f9 20px,
      #e2e8f0 20px, #e2e8f0 40px
    );
  }

  /* Journey timeline */
  .journey-line {
    position: absolute; left: 15px; top: 20px; bottom: 0;
    width: 2px;
    background: linear-gradient(to bottom, #3b82f6, transparent);
  }
  .journey-line-done {
    background: linear-gradient(to bottom, #22c55e, #3b82f6);
  }

  @keyframes stepPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
    50%      { box-shadow: 0 0 0 6px rgba(99,102,241,0); }
  }
  .step-current { animation: stepPulse 2s ease-in-out infinite; }

  @keyframes imgFade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .req-img-fade { animation: imgFade 0.3s ease forwards; }

  .req-img-nav {
    position: absolute; z-index: 10; top: 50%; transform: translateY(-50%);
    width: 28px; height: 28px; border-radius: 50%;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
    border: 1px solid rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: background 0.2s ease;
    color: white;
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

  /* Glowing status chip */
  .status-glow-pending { box-shadow: 0 0 12px rgba(234,179,8,0.4); }
  .status-glow-approved { box-shadow: 0 0 12px rgba(59,130,246,0.4); }
  .status-glow-borrowed { box-shadow: 0 0 12px rgba(168,85,247,0.4); }
  .status-glow-returned { box-shadow: 0 0 12px rgba(34,197,94,0.4); }
  .status-glow-rejected { box-shadow: 0 0 12px rgba(239,68,68,0.4); }
`;


const journeySteps = [
  { key: 'pending_lecturer', labelKey: 'requestSubmitted',        Icon: FilePlus2    },
  { key: 'pending_head',     labelKey: 'journeyLecturerApproved', Icon: UserCheck    },
  { key: 'head_approved',    labelKey: 'journeyHeadApproved',     Icon: BadgeCheck   },
  { key: 'ready_pickup',     labelKey: 'readyForPickup',          Icon: PackageCheck },
  { key: 'borrowed',         labelKey: 'journeyInUse',            Icon: Laptop       },
  { key: 'returned',         labelKey: 'returned',                Icon: RotateCcw    },
];

const ACTIVE_PAGE_SIZE = 5;
const HISTORY_PAGE_SIZE = 10;

const HISTORY_FILTERS = [
  { key: 'all',      labelKey: 'all',      statuses: null },
  { key: 'pending',  labelKey: 'pending',  statuses: ['pending_lecturer', 'pending_head'] },
  { key: 'approved', labelKey: 'approved', statuses: ['head_approved', 'ready_pickup'] },
  { key: 'borrowed', labelKey: 'borrowed', statuses: ['borrowed'] },
  { key: 'returned', labelKey: 'returned', statuses: ['returned'] },
  { key: 'rejected', labelKey: 'rejected', statuses: ['rejected'] },
];

export default function MyRequests() {
  const [filter, setFilter] = useState('active');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activePage, setActivePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [extDate, setExtDate] = useState('');
  const [extReason, setExtReason] = useState('');
  const { isDark } = useTheme();
  const { t } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: requests = [], isLoading, isError, error } = useQuery({
    queryKey: ['myRequests'],
    queryFn: () => api.entities.BorrowRequest.myRequests(),
    enabled: !!user
  });

  const extensionMutation = useMutation({
    mutationFn: ({ id, requested_date, reason }) =>
      api.entities.BorrowRequest.requestExtension(id, { requested_date, reason }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['myRequests'] });
      setSelectedRequest(prev => prev ? { ...prev, extension_request: updated.extension_request } : prev);
      setShowExtensionForm(false);
      setExtDate('');
      setExtReason('');
    },
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
    const index = journeySteps.findIndex((step) => step.key === status);
    return index >= 0 ? index + 1 : 1;
  };

  const getStatusGlowClass = (status) => {
    if (['pending_lecturer', 'pending_head'].includes(status)) return 'status-glow-pending';
    if (['head_approved', 'ready_pickup'].includes(status)) return 'status-glow-approved';
    if (status === 'borrowed') return 'status-glow-borrowed';
    if (status === 'returned') return 'status-glow-returned';
    if (status === 'rejected') return 'status-glow-rejected';
    return '';
  };

  const renderProgressTracker = (request) => {
    if (request.status === 'rejected') {
      return (
        <div className={`mt-4 rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${isDark ? 'border-red-900/50 bg-red-950/40 text-red-400' : 'border-red-100 bg-red-50 text-red-700'}`}>
          <X className="w-4 h-4 flex-shrink-0" />
          {t('requestWasRejected')}
        </div>
      );
    }

    const currentStep = getStatusStep(request.status);
    const progress = (currentStep / journeySteps.length) * 100;

    return (
      <div className={`mt-4 rounded-xl border p-4 ${isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-slate-100 bg-slate-50'}`}>
        <div className="mb-3 flex items-center justify-between">
          <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t('progress')}</p>
          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('step')} {currentStep} {t('ofLabel')} {journeySteps.length}</p>
        </div>
        <div className={`relative mb-4 h-1.5 w-full overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {journeySteps.map((step, index) => {
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
                }`}>{t(step.labelKey)}</span>
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
                {t('qty')}: {request.quantity}
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

  if (isLoading) return <StudentRequestsSkeleton />;

  if (isError) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border mx-2 ${isDark ? 'bg-[#0d0d14] border-white/[0.08]' : 'bg-white border-slate-200'}`}>
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6 text-red-500" />
          </div>
          <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{t('unableLoadRequests')}</p>
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
    { key: 'active',  label: t('active'),     count: activeCount },
    { key: 'history', label: t('allHistory'), count: requests.length },
  ];

  return (
    <div className={`space-y-5 ${isDark ? 'req-dark' : ''}`}>
      <style>{pageStyles}</style>

      {/* ── HERO BANNER ─────────────────────────────────────────── */}
      <div className="req-fade-up req-fade-1 req-hero-banner relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-6 shadow-xl">
        <div className="req-orb   absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="req-orb-2 absolute -bottom-14 -left-8  w-44 h-44 rounded-full bg-indigo-400/20 pointer-events-none" />
        <div className="absolute top-4 right-28 w-2.5 h-2.5 rounded-full bg-white/30 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-blue-200 text-[10px] font-semibold uppercase tracking-widest mb-1">{t('equipmentBorrowing')}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{t('myRequestsTitle')}</h1>
            <p className="text-blue-200 text-sm mt-1.5 max-w-sm">
              {t('myRequestsHeroDesc')}
            </p>
          </div>

          {/* Quick stat pills */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: t('active'),   value: activeCount,   textColor: isDark ? 'text-blue-400' : 'text-white' },
              { label: t('returned'), value: returnedCount, textColor: isDark ? 'text-emerald-400' : 'text-white' },
              { label: t('rejected'), value: rejectedCount, textColor: isDark ? 'text-red-400' : 'text-white' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl px-3 py-2 text-center min-w-[60px] border shadow-sm ${isDark ? 'bg-[#0d0d14] border-white/[0.08]' : 'bg-white/20 backdrop-blur-sm border-white/20'}`}>
                <p className={`text-lg font-black leading-none ${s.textColor}`}>{s.value}</p>
                <p className={`text-[9px] font-semibold uppercase tracking-wide mt-0.5 ${isDark ? 'text-slate-500' : 'text-blue-200'}`}>{s.label}</p>
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
              onClick={() => { setFilter(tab.key); setActivePage(1); setHistoryPage(1); setHistoryFilter('all'); }}
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
                  {t(hf.labelKey)}
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
            <p className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t('noMatchingRequests')}</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{t('tryDifferentFilter')}</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed text-center ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/60'}`}>
            <BookOpen className={`w-10 h-10 mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            <p className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t('noRequestsFound')}</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              {filter === 'active' ? t('noActiveRequests') : t('noRequestHistory')}
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
                  {t('showing')} {(safePage - 1) * HISTORY_PAGE_SIZE + 1}–{Math.min(safePage * HISTORY_PAGE_SIZE, allHistorySorted.length)} {t('ofLabel')} {allHistorySorted.length}
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
        ) : (() => {
          const activeTotal = filteredRequests.length;
          const activeTotalPages = Math.max(1, Math.ceil(activeTotal / ACTIVE_PAGE_SIZE));
          const safeActivePage = Math.min(activePage, activeTotalPages);
          const pagedActive = filteredRequests.slice((safeActivePage - 1) * ACTIVE_PAGE_SIZE, safeActivePage * ACTIVE_PAGE_SIZE);
          return (
            <div className="space-y-3">
              {pagedActive.map(renderRequestCard)}
              {activeTotalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {t('showing')} {(safeActivePage - 1) * ACTIVE_PAGE_SIZE + 1}–{Math.min(safeActivePage * ACTIVE_PAGE_SIZE, activeTotal)} {t('ofLabel')} {activeTotal}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setActivePage(p => Math.max(1, p - 1))}
                      disabled={safeActivePage === 1}
                      className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
                        safeActivePage === 1
                          ? isDark ? 'border-white/[0.06] text-slate-700 cursor-not-allowed' : 'border-slate-200 text-slate-300 cursor-not-allowed'
                          : isDark ? 'border-white/[0.10] text-slate-300 hover:bg-white/[0.06]' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: activeTotalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setActivePage(page)}
                        className={`flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-semibold transition-colors ${
                          page === safeActivePage
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : isDark ? 'border-white/[0.10] text-slate-400 hover:bg-white/[0.06]' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setActivePage(p => Math.min(activeTotalPages, p + 1))}
                      disabled={safeActivePage === activeTotalPages}
                      className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
                        safeActivePage === activeTotalPages
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
          );
        })()}
      </div>

      {/* ── REQUEST DETAILS DIALOG ──────────────────────────────── */}
      <Dialog open={!!selectedRequest} onOpenChange={() => { setSelectedRequest(null); setModalImageIndex(0); }}>
        <DialogContent className={`p-0 overflow-hidden sm:max-w-xl rounded-2xl shadow-2xl border-0 req-modal-panel ${isDark ? 'bg-[#0d0d14] text-slate-200' : 'bg-white text-slate-900'}`}>
          {selectedRequest && (() => {
            const images = selectedRequest.equipment_images_urls || [];
            const hasImages = images.length > 0;
            const currentImg = hasImages ? images[modalImageIndex] : null;
            const currentStep = selectedRequest.status !== 'rejected' ? getStatusStep(selectedRequest.status) : 0;

            return (
              <>
                {/* ── IMAGE BANNER ── */}
                <div className="req-img-banner">
                  {hasImages ? (
                    <>
                      <img
                        key={currentImg}
                        src={currentImg}
                        alt={selectedRequest.equipment_name}
                        className="req-img-fade"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
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
                      <span className={`text-xs font-medium ${isDark ? 'text-slate-700' : 'text-slate-400'}`}>{t('noImage')}</span>
                    </div>
                  )}

                  {/* Floating name + status over the banner */}
                  <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-4 flex items-end justify-between">
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${hasImages ? 'text-blue-300' : isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                        {t('equipment')}
                      </p>
                      <h2 className={`text-lg font-black leading-tight drop-shadow-md ${hasImages ? 'text-white' : isDark ? 'text-slate-200' : 'text-slate-800'}`}>
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
                        : ['head_approved','ready_pickup'].includes(selectedRequest.status)
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                        : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                    }`}>
                      {selectedRequest.status.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>

                {/* ── BODY (no scroll) ── */}
                <div>

                  {/* ── META PILLS + PURPOSE ROW ── */}
                  <div className={`px-5 py-3 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {[
                        { Icon: Hash,     text: `Qty: ${selectedRequest.quantity}` },
                        { Icon: Calendar, text: format(new Date(selectedRequest.borrow_date), 'MMM d') + ' → ' + format(new Date(selectedRequest.return_date), 'MMM d, yyyy') },
                      ].map(({ Icon, text }) => (
                        <span key={text} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                          <Icon className="w-3 h-3 opacity-60" />{text}
                        </span>
                      ))}
                      {selectedRequest.equipment?.category && (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                          <Tag className="w-3 h-3 opacity-60" />{selectedRequest.equipment.category}
                        </span>
                      )}
                    </div>
                    {selectedRequest.purpose && (
                      <p className={`text-xs leading-relaxed line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span className={`font-bold mr-1.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{t('purpose')}:</span>{selectedRequest.purpose}
                      </p>
                    )}
                    {/* Assigned lecturer badge */}
                    {(selectedRequest.lecturer?.name || selectedRequest.lecturer_email) && (
                      <div className={`mt-1 flex items-center gap-2 rounded-lg px-3 py-2 border ${
                        isDark ? 'bg-indigo-950/30 border-indigo-900/40' : 'bg-indigo-50 border-indigo-100'
                      }`}>
                        <GraduationCap className={`w-3.5 h-3.5 flex-shrink-0 ${
                          isDark ? 'text-indigo-400' : 'text-indigo-500'
                        }`} />
                        <div className="min-w-0">
                          <p className={`text-[9px] font-bold uppercase tracking-widest ${
                            isDark ? 'text-indigo-600' : 'text-indigo-400'
                          }`}>{t('assignedLecturer')}</p>
                          <p className={`text-xs font-semibold truncate ${
                            isDark ? 'text-indigo-300' : 'text-indigo-700'
                          }`}>
                            {selectedRequest.lecturer?.name || selectedRequest.lecturer_email}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── HORIZONTAL JOURNEY STEPPER ── */}
                  <div className={`px-5 pt-3 pb-3 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{t('requestJourney')}</p>

                    {selectedRequest.status === 'rejected' ? (
                      <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${
                        isDark ? 'bg-red-950/30 border-red-900/40' : 'bg-red-50 border-red-100'
                      }`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isDark ? 'bg-red-900/60 text-red-400' : 'bg-red-100 text-red-600'
                        }`}>
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
                          const stepNum = index + 1;
                          const isDone = currentStep > stepNum;
                          const isCurrent = currentStep === stepNum;
                          const isLast = index === journeySteps.length - 1;
                          const { Icon } = step;
                          return (
                            <div key={step.key} className="flex-1 flex flex-col items-center relative">
                              {/* Connector left */}
                              {index > 0 && (
                                <div className={`absolute left-0 right-1/2 top-[14px] h-px ${
                                  isDone || isCurrent
                                    ? isDone ? 'bg-emerald-500/70' : 'bg-indigo-500/50'
                                    : isDark ? 'bg-white/[0.08]' : 'bg-slate-200'
                                }`} />
                              )}
                              {/* Connector right */}
                              {!isLast && (
                                <div className={`absolute left-1/2 right-0 top-[14px] h-px ${
                                  isDone ? 'bg-emerald-500/70' : isDark ? 'bg-white/[0.08]' : 'bg-slate-200'
                                }`} />
                              )}
                              {/* Step dot */}
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 transition-all duration-300 ${
                                isDone
                                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                                  : isCurrent
                                  ? 'bg-indigo-600 text-white step-current'
                                  : isDark
                                  ? 'bg-[#1a1a24] text-slate-600 border border-white/[0.08]'
                                  : 'bg-slate-100 text-slate-300 border border-slate-200'
                              }`}>
                                {isDone
                                  ? <CheckCircle className="w-3.5 h-3.5" />
                                  : <Icon className={`w-3 h-3 ${isCurrent ? '' : 'opacity-40'}`} />
                                }
                              </div>
                              {/* Label */}
                              <p className={`text-[9px] font-semibold text-center mt-1.5 leading-tight px-0.5 ${
                                isDone
                                  ? isDark ? 'text-emerald-500' : 'text-emerald-600'
                                  : isCurrent
                                  ? isDark ? 'text-indigo-300' : 'text-indigo-600'
                                  : isDark ? 'text-slate-700' : 'text-slate-300'
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

                  {/* ── REJECTION REASON ONLY ── */}
                  {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason && (
                    <div className={`px-5 py-3 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <AlertCircle className={`w-3 h-3 ${isDark ? 'text-red-500' : 'text-red-400'}`} />
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{t('rejectionDetails')}</p>
                      </div>
                      <div className={`rounded-xl px-3 py-2.5 ${isDark ? 'bg-red-950/30 border border-red-900/40' : 'bg-red-50 border border-red-100'}`}>
                        <p className={`text-xs leading-relaxed ${isDark ? 'text-red-300' : 'text-red-700'}`}>{selectedRequest.rejection_reason}</p>
                      </div>
                    </div>
                  )}

                  {/* ── EXTENSION REQUEST ── */}
                  {selectedRequest.status === 'borrowed' && (() => {
                    const ext = selectedRequest.extension_request;
                    const isPending  = ext?.status === 'pending';
                    const isApproved = ext?.status === 'approved';
                    const isRejected = ext?.status === 'rejected';

                    return (
                      <div className={`px-5 py-3 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                        <div className="flex items-center gap-2 mb-2.5">
                          <CalendarPlus className={`w-3.5 h-3.5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{t('returnDateExtension')}</p>
                        </div>

                        {/* Status badges for existing extension */}
                        {isPending && (
                          <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 mb-2 ${isDark ? 'bg-yellow-950/30 border border-yellow-900/40' : 'bg-yellow-50 border border-yellow-100'}`}>
                            <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                            <div>
                              <p className={`text-xs font-semibold ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>{t('extensionPending')}</p>
                              <p className={`text-[10px] ${isDark ? 'text-yellow-600' : 'text-yellow-500'}`}>{t('requestedUntil')} {format(new Date(ext.requested_date), 'MMM d, yyyy')}</p>
                            </div>
                          </div>
                        )}
                        {isApproved && (
                          <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 mb-2 ${isDark ? 'bg-emerald-950/30 border border-emerald-900/40' : 'bg-emerald-50 border border-emerald-100'}`}>
                            <CheckCheck className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                            <div>
                              <p className={`text-xs font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{t('extensionApproved')}</p>
                              <p className={`text-[10px] ${isDark ? 'text-emerald-600' : 'text-emerald-500'}`}>{t('newReturnDate')}: {format(new Date(ext.requested_date), 'MMM d, yyyy')}</p>
                            </div>
                          </div>
                        )}
                        {isRejected && (
                          <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 mb-2 ${isDark ? 'bg-red-950/30 border border-red-900/40' : 'bg-red-50 border border-red-100'}`}>
                            <X className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                            <div>
                              <p className={`text-xs font-semibold ${isDark ? 'text-red-300' : 'text-red-700'}`}>{t('extensionRejected')}</p>
                              {ext.review_note && <p className={`text-[10px] ${isDark ? 'text-red-600' : 'text-red-500'}`}>{ext.review_note}</p>}
                            </div>
                          </div>
                        )}

                        {/* Extension form */}
                        {showExtensionForm && !isPending ? (
                          <div className={`rounded-xl border p-3 ${isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-slate-50 border-slate-200'}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('newReturnDate')}</p>
                            <input
                              type="date"
                              value={extDate}
                              min={format(new Date(selectedRequest.return_date), 'yyyy-MM-dd')}
                              onChange={e => setExtDate(e.target.value)}
                              className={`w-full rounded-lg px-3 py-2 text-sm border mb-2 outline-none focus:ring-2 focus:ring-violet-500/50 ${
                                isDark
                                  ? 'bg-[#111118] border-white/[0.10] text-slate-200'
                                  : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            />
                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('reasonOptional')}</p>
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
                              <p className="text-xs text-red-500 mb-2">{extensionMutation.error?.message || t('failedToSubmit')}</p>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  if (!extDate) return;
                                  extensionMutation.mutate({ id: selectedRequest._id || selectedRequest.id, requested_date: extDate, reason: extReason });
                                }}
                                disabled={!extDate || extensionMutation.isPending}
                                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white transition-colors"
                              >
                                {extensionMutation.isPending ? t('submitting') : t('submitRequest')}
                              </button>
                              <button
                                onClick={() => { setShowExtensionForm(false); setExtDate(''); setExtReason(''); }}
                                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${isDark ? 'bg-white/[0.06] hover:bg-white/[0.10] text-slate-400' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'}`}
                              >
                                {t('cancel')}
                              </button>
                            </div>
                          </div>
                        ) : !isPending ? (
                          <button
                            onClick={() => setShowExtensionForm(true)}
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

                  {/* ── CLOSE / BORROW AGAIN ── */}
                  <div className={`px-5 py-3 flex flex-col gap-2`}>
                    {selectedRequest.status === 'returned' && (
                      <button
                        onClick={() => {
                          setSelectedRequest(null);
                          setModalImageIndex(0);
                          navigate('/catalog/student');
                        }}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        {t('borrowAgain')}
                      </button>
                    )}
                    <button
                      onClick={() => { setSelectedRequest(null); setModalImageIndex(0); setShowExtensionForm(false); setExtDate(''); setExtReason(''); }}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
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