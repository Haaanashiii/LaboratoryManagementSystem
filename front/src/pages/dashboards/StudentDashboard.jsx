import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import {
  Package, Clock, CheckCircle, ArrowRight,
  ChevronRight, ChevronLeft, RotateCcw, MoreHorizontal,
  Cpu, Zap, Wifi, Key, Activity, ClipboardList,
} from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';
import { CATALOG_ROUTES_BY_ROLE } from '@/utils/roleCatalogRoutes';
import { useTheme } from '@/components/hooks/ThemeContext';

// ── Category config: gradient + colored icon ──────────────────────────────────
const CATEGORY_CONFIG = {
  Cables:      { gradient: ['#3b0011', '#7f1d1d'], Icon: Zap,      iconColor: '#fca5a5' },
  Compute:     { gradient: ['#2d1000', '#9a3412'], Icon: Cpu,      iconColor: '#fb923c' },
  Tools:       { gradient: ['#2d1a00', '#92400e'], Icon: Key,      iconColor: '#fbbf24' },
  Networking:  { gradient: ['#0c1a2e', '#1e40af'], Icon: Wifi,     iconColor: '#93c5fd' },
  Electronics: { gradient: ['#1a0033', '#5b21b6'], Icon: Activity, iconColor: '#c4b5fd' },
  default:     { gradient: ['#1e293b', '#475569'], Icon: Package,   iconColor: '#94a3b8' },
};
const getCat = (cat) => CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.default;

// ── Status badge (dark-themed) ────────────────────────────────────────────────
const STATUS_STYLE = {
  pending_lecturer: { label: 'Pending Lecturer', dot: '#f59e0b', bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
  pending_head:     { label: 'Pending Head',     dot: '#f97316', bg: 'rgba(249,115,22,0.12)', text: '#fb923c', border: 'rgba(249,115,22,0.25)' },
  head_approved:    { label: 'Head Approved',    dot: '#22c55e', bg: 'rgba(34,197,94,0.12)',  text: '#4ade80', border: 'rgba(34,197,94,0.25)' },
  ready_pickup:     { label: 'Ready Pickup',     dot: '#22c55e', bg: 'rgba(34,197,94,0.12)',  text: '#4ade80', border: 'rgba(34,197,94,0.25)' },
  borrowed:         { label: 'Borrowed',         dot: '#a78bfa', bg: 'rgba(167,139,250,0.12)',text: '#c4b5fd', border: 'rgba(167,139,250,0.25)' },
  returned:         { label: 'Returned',         dot: '#64748b', bg: 'transparent',           text: '#94a3b8', border: 'transparent' },
  rejected:         { label: 'Rejected',         dot: '#ef4444', bg: 'rgba(239,68,68,0.12)',  text: '#f87171', border: 'rgba(239,68,68,0.25)' },
  approved:         { label: 'Approved',         dot: '#22c55e', bg: 'rgba(34,197,94,0.12)',  text: '#4ade80', border: 'rgba(34,197,94,0.25)' },
  pending:          { label: 'Pending',          dot: '#f59e0b', bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
};

const STATUS_T_KEY = {
  pending_lecturer: 'pendingLecturer',
  pending_head:     'pendinghead',
  head_approved:    'headapproved',
  ready_pickup:     'readypickup',
  borrowed:         'borrowed',
  returned:         'returned',
  rejected:         'rejected',
  approved:         'approved',
  pending:          'pending',
};

function DarkStatusBadge({ status, t }) {
  const s = STATUS_STYLE[status] || { label: status, dot: '#64748b', bg: 'transparent', text: '#94a3b8', border: 'transparent' };
  const label = t && STATUS_T_KEY[status] ? t(STATUS_T_KEY[status]) : (s.label || status);
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {label}
    </span>
  );
}

// ── Short display code for equipment card ─────────────────────────────────────
function equipCode(item) {
  if (item.serialNumber) return item.serialNumber.toUpperCase().slice(0, 12);
  if (item.model) return item.model.toUpperCase().slice(0, 12);
  return item.name
    .split(/[\s()/]+/).filter(Boolean)
    .map((w) => w.slice(0, 3).toUpperCase())
    .slice(0, 3)
    .join('-');
}

// ── Minimal sparkline SVG ─────────────────────────────────────────────────────
function Sparkline({ data, color = '#3b82f6' }) {
  const max = Math.max(...data, 1);
  const w = 100, h = 28;
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = h - 2 - (v / max) * (h - 6);
    return [x, y];
  });
  const polyPts = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaD = [
    `M 0,${h}`,
    ...points.map(([x, y]) => `L ${x.toFixed(1)},${y.toFixed(1)}`),
    `L ${w},${h} Z`,
  ].join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-7">
      <defs>
        <linearGradient id="spk-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#spk-fill)" />
      <polyline
        points={polyPts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1][0].toFixed(1)}
          cy={points[points.length - 1][1].toFixed(1)}
          r="2"
          fill={color}
        />
      )}
    </svg>
  );
}

// ── Animations ────────────────────────────────────────────────────────────────
const styles = `
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
  @keyframes sdSlide {
    from { opacity: 0; transform: translateX(16px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .sd-slide { animation: sdSlide 0.3s cubic-bezier(0.16,1,0.3,1) forwards; }
  .sd-num { font-family: 'JetBrains Mono', monospace; }
`;

const CARDS_PER_SLIDE = 3;

export default function StudentDashboard() {
  const navigate   = useNavigate();
  const { lang, t } = useLang();
  const { isDark } = useTheme();
  const catalogRoute = CATALOG_ROUTES_BY_ROLE.student;

  const [slide, setSlide] = useState(0);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['myRequests'],
    queryFn: () => api.entities.BorrowRequest.myRequests(),
    enabled: !!user,
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.entities.Equipment.list(),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? t('goodMorning') : h < 18 ? t('goodAfternoon') : t('goodEvening');
  };

  const todayLabel = () =>
    new Date()
      .toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
      .toUpperCase();

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const fmtReqId = (req) => {
    const id   = req._id || req.id || '';
    const year = req.createdAt ? new Date(req.createdAt).getFullYear() : new Date().getFullYear();
    const num  = id ? parseInt(id.slice(-4), 16) % 10000 : 0;
    return `REQ-${year}-${String(num).padStart(4, '0')}`;
  };

  // ── Data ───────────────────────────────────────────────────────────────────
  const firstName     = user?.name?.split(' ')[0] || 'Student';
  const activeEquip   = equipment.filter((e) => e.status !== 'retired');
  const availableCount  = activeEquip.filter((e) => (e.available_quantity ?? e.available ?? 0) > 0).length;
  const totalEquipCount = activeEquip.length;

  const pendingRequests  = myRequests.filter((r) => r.status === 'pending_lecturer' || r.status === 'pending_head');
  const approvedRequests = myRequests.filter((r) => r.status === 'head_approved' || r.status === 'ready_pickup');
  const borrowedItems    = myRequests.filter((r) => r.status === 'borrowed');

  // Pickup alert: ONLY ready_pickup (lab assistant has confirmed)
  const pickupRequest = myRequests.find((r) => r.status === 'ready_pickup') || null;

  // This semester
  const thisYear    = new Date().getFullYear();
  const semReqs     = myRequests.filter((r) => new Date(r.createdAt).getFullYear() === thisYear);
  const semTotal    = semReqs.length;
  const semApproved = semReqs.filter((r) =>
    ['head_approved', 'ready_pickup', 'borrowed', 'returned', 'approved'].includes(r.status)
  ).length;
  const semInUse    = semReqs.filter((r) => r.status === 'borrowed').length;
  const semReturned = semReqs.filter((r) => r.status === 'returned').length;
  const returnPct   = semTotal > 0 ? Math.round((semReturned / semTotal) * 100) : 0;
  const isTrusted   = returnPct >= 100 && semTotal > 0;

  // Equipment carousel
  const featuredEquip  = activeEquip.filter((e) => (e.available_quantity ?? e.available ?? 0) > 0).slice(0, 6);
  const totalSlides    = Math.ceil(featuredEquip.length / CARDS_PER_SLIDE);
  const visibleCards   = featuredEquip.slice(slide * CARDS_PER_SLIDE, (slide + 1) * CARDS_PER_SLIDE);

  const prevSlide = () => setSlide((s) => Math.max(0, s - 1));
  const nextSlide = () => setSlide((s) => Math.min(totalSlides - 1, s + 1));

  // Recent requests
  const recentRequests = [...myRequests]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  // Sparkline: monthly request counts (last 6 months)
  const sparkData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const m = d.getMonth(), y = d.getFullYear();
    return myRequests.filter((r) => {
      const rd = new Date(r.createdAt);
      return rd.getMonth() === m && rd.getFullYear() === y;
    }).length;
  });

  const monthLabels = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d.toLocaleString('en-US', { month: 'short' });
  });

  // All-time stats for profile card
  const allTimeTotal    = myRequests.length;
  const allTimeApproved = myRequests.filter((r) =>
    ['head_approved', 'ready_pickup', 'borrowed', 'returned', 'approved'].includes(r.status)
  ).length;
  const allTimeRate     = allTimeTotal > 0 ? Math.round((allTimeApproved / allTimeTotal) * 100) : 0;
  const allTimePending  = myRequests.filter((r) =>
    r.status === 'pending_lecturer' || r.status === 'pending_head'
  ).length;

  // Status summary (JSX with colored spans)
  const statusSummary = (() => {
    const hasPending  = pendingRequests.length > 0;
    const hasApproved = approvedRequests.length > 0;
    if (!hasPending && !hasApproved) return t('sdAllClear');
    return (
      <>
        {t('sdYouHave')}{' '}
        {hasPending && (
          <span style={{ color: '#f59e0b' }} className="font-medium">
            {pendingRequests.length} {pendingRequests.length !== 1 ? t('sdRequestPlural') : t('sdRequestSingular')} {t('sdAwaitingReview')}
          </span>
        )}
        {hasPending && hasApproved && ` ${t('sdAnd')} `}
        {hasApproved && (
          <span style={{ color: '#10b981' }} className="font-medium">
            {approvedRequests.length} {t('sdApprovedReadyPickup')}
          </span>
        )}
        .
      </>
    );
  })();

  // ── Theme tokens (glassmorphism) ───────────────────────────────────────────
  const surface  = isDark ? 'glass-dark' : 'glass-light';
  const txt      = isDark ? 'text-white' : 'text-slate-900';
  const txtsub   = isDark ? 'text-slate-400' : 'text-slate-500';
  const txtmuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const divider  = isDark ? 'border-white/[0.07]' : 'border-white/50';
  const rowHover = '';

  // ── Stat tiles ─────────────────────────────────────────────────────────────
  const statTiles = [
    {
      label: t('availableEquipment').toUpperCase(),
      sublabel: `${t('sdAcrossPrefix')} ${totalEquipCount} ${t('sdActiveItemsSuffix')}`,
      value: availableCount,
      Icon: Package,
      iconBg: 'rgba(59,130,246,0.13)',
      iconBorder: 'rgba(59,130,246,0.28)',
      iconColor: '#3b82f6',
      numColor: '#3b82f6',
      action: () => navigate(catalogRoute),
    },
    {
      label: t('activeRequests').toUpperCase(),
      sublabel: `${pendingRequests.length} ${t('sdPendingReviewSuffix')}`,
      value: pendingRequests.length,
      Icon: Clock,
      iconBg: 'rgba(245,158,11,0.13)',
      iconBorder: 'rgba(245,158,11,0.28)',
      iconColor: '#f59e0b',
      numColor: '#f59e0b',
      action: () => navigate('/requests'),
    },
    {
      label: t('readyForPickup').toUpperCase(),
      sublabel: t('sdHeadApprovedSub'),
      value: approvedRequests.length,
      Icon: CheckCircle,
      iconBg: 'rgba(16,185,129,0.13)',
      iconBorder: 'rgba(16,185,129,0.28)',
      iconColor: '#10b981',
      numColor: '#10b981',
      action: () => navigate('/requests'),
    },
    {
      label: t('sdCurrentlyInUse'),
      sublabel: t('sdReturnByDate'),
      value: borrowedItems.length,
      Icon: RotateCcw,
      iconBg: 'rgba(167,139,250,0.13)',
      iconBorder: 'rgba(167,139,250,0.28)',
      iconColor: '#a78bfa',
      numColor: '#a78bfa',
      action: () => navigate('/requests'),
    },
  ];

  return (
    <div className="space-y-4">
      <style>{styles}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className={`sd-fade sd-d1 rounded-2xl p-5 sm:p-6 ${surface}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className={`text-[10px] font-semibold tracking-widest uppercase mb-2 ${txtmuted}`}>
              {todayLabel()}
            </p>
            <h1 className={`text-2xl sm:text-3xl font-bold leading-tight ${txt}`}>
              {greeting()}, {firstName}.
            </h1>
            <p className={`text-sm mt-2 max-w-lg leading-relaxed ${txtsub}`}>{statusSummary}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate('/requests')}
              className={`text-sm font-medium px-4 py-2 rounded-xl border flex items-center gap-1.5 ${
                isDark
                  ? 'border-white/[0.15] text-slate-300'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              {t('sdViewRequests')}
            </button>
            <button
              onClick={() => navigate(catalogRoute)}
              className="text-sm font-medium px-4 py-2 rounded-xl bg-blue-600 text-white"
            >
              {t('sdBorrowEquipment')}
            </button>
          </div>
        </div>
      </div>

      {/* ── STAT TILES ─────────────────────────────────────────────────── */}
      <div className="sd-fade sd-d2 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statTiles.map((s) => (
          <button
            key={s.label}
            onClick={s.action}
            className={`rounded-2xl p-5 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${surface}`}
          >
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
          </button>
        ))}
      </div>

      {/* ── PICKUP ALERT — only when lab assistant confirmed ready_pickup ─ */}
      {pickupRequest && (
        <div
          className={`sd-fade sd-d3 rounded-2xl border p-4 flex items-start gap-4 ${
            isDark
              ? 'border-emerald-500/20 bg-emerald-500/[0.06]'
              : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 flex-shrink-0 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
              {t('sdReadyForPickupColon')}{' '}
              <span className="font-bold">{pickupRequest.equipment_name}</span> ×{pickupRequest.quantity}
              {'  '}
              <span className={`font-normal text-xs ${isDark ? 'text-emerald-400/60' : 'text-emerald-600/70'}`}>
                · {fmtReqId(pickupRequest)}
              </span>
            </p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-emerald-400/60' : 'text-emerald-600'}`}>
              {t('sdBringStudentId')}
            </p>
          </div>
          <button
            onClick={() => navigate('/requests')}
            className={`text-xs font-semibold whitespace-nowrap flex items-center gap-0.5 flex-shrink-0 ${
              isDark ? 'text-emerald-400' : 'text-emerald-700'
            }`}
          >
            {t('viewDetails')} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── FEATURED EQUIPMENT + SEMESTER STATS ────────────────────────── */}
      <div className="sd-fade sd-d4 grid grid-cols-1 md:grid-cols-3 gap-4 md:h-[400px]">

        {/* Left: Equipment carousel */}
        <div className={`md:col-span-2 flex flex-col rounded-2xl p-4 ${featuredEquip.length > 0 ? 'min-h-[260px] md:min-h-0' : ''} ${surface}`}>
          {/* Section header */}
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-sm font-semibold ${txt}`}>{t('sdFeaturedEquipment')}</h2>
            <div className="flex items-center gap-2">
              {/* Slide navigation */}
              {totalSlides > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={prevSlide}
                    disabled={slide === 0}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      slide === 0
                        ? isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                        : isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className={`text-[10px] font-semibold tabular-nums ${txtmuted}`}>
                    {slide + 1} / {totalSlides}
                  </span>
                  <button
                    onClick={nextSlide}
                    disabled={slide === totalSlides - 1}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      slide === totalSlides - 1
                        ? isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                        : isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <button
                onClick={() => navigate(catalogRoute)}
                className={`text-xs font-semibold flex items-center gap-1 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {t('seeAll')} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Cards fill remaining column height */}
          <div className="flex-1 min-h-0">
            {featuredEquip.length === 0 ? (
              <div
                className={`h-full rounded-2xl border border-dashed flex flex-col items-center justify-center ${
                  isDark ? 'border-white/[0.10]' : 'border-slate-200'
                }`}
              >
                <Package className={`w-8 h-8 mb-2 ${txtmuted}`} />
                <p className={`text-sm font-medium ${txtsub}`}>{t('sdNoEquipmentAvailable')}</p>
              </div>
            ) : (
              <div key={slide} className={`sd-slide grid gap-2 h-full ${
                visibleCards.length === 1 ? 'grid-cols-1' :
                visibleCards.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
              }`}>
                {visibleCards.map((item) => {
                  const cfg   = getCat(item.category);
                  const avail = item.available_quantity ?? item.available ?? 0;
                  const total = item.total_quantity ?? item.quantity ?? 0;
                  const image = item.images_urls?.[0] || item.image_url || item.image || null;
                  const code  = equipCode(item);

                  return (
                    <button
                      key={item._id || item.id}
                      onClick={() => navigate(catalogRoute)}
                      className={`text-left rounded-xl overflow-hidden w-full h-full flex flex-col focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark
                          ? 'border border-white/[0.16] bg-white/[0.04]'
                          : 'border border-black/[0.07] bg-white/70'
                      }`}
                    >
                      {/* Image / gradient area — fills card height */}
                      <div
                        className="relative flex-1 min-h-0 overflow-hidden"
                        style={{
                          background: image
                            ? undefined
                            : `linear-gradient(135deg, ${cfg.gradient[0]} 0%, ${cfg.gradient[1]} 100%)`,
                        }}
                      >
                        {image ? (
                          <img src={image} alt={item.name} className="w-full h-full object-cover" loading="eager" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{
                                background: `${cfg.iconColor}15`,
                                border: `1px solid ${cfg.iconColor}30`,
                              }}
                            >
                              <cfg.Icon className="w-5 h-5" style={{ color: cfg.iconColor }} />
                            </div>
                          </div>
                        )}

                        {/* Dots menu */}
                        <div
                          className="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center text-white/30 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </div>

                        {/* Equipment code */}
                        <span className={`absolute bottom-2.5 left-2.5 text-[10px] font-mono-jb ${
                          isDark ? 'text-white/30' : 'text-white/50'
                        }`}>
                          {code}
                        </span>
                      </div>

                      {/* Info footer — fixed height */}
                      <div className={`shrink-0 px-2.5 pt-2 pb-2.5 border-t ${divider}`}>
                        <div className="flex items-center justify-between mb-1">
                          {item.category && (
                            <span
                              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                                isDark ? 'bg-white/[0.07] text-slate-400' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {item.category}
                            </span>
                          )}
                          <span className={`text-[10px] font-semibold tabular-nums ${txtsub} ml-auto`}>
                            {avail}/{total}
                          </span>
                        </div>
                        <p className={`text-xs font-semibold line-clamp-1 ${txt}`}>{item.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Slide dots — outside fill area */}
          {totalSlides > 1 && (
            <div className="flex justify-center gap-1.5 mt-3 shrink-0">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === slide ? '20px' : '6px',
                    background: i === slide
                      ? '#3b82f6'
                      : isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right column: stacked cards */}
        <div className="flex flex-col gap-4 md:h-full">

        {/* This semester */}
        <div className={`rounded-2xl p-4 flex flex-col md:flex-1 ${surface}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-semibold ${txt}`}>{t('sdThisSemester')}</h3>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                isDark ? 'bg-white/[0.08] text-slate-400' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {thisYear}
            </span>
          </div>

          <div className="space-y-2.5 flex-1">
            {[
              { label: t('sdRequestsSubmitted'), value: semTotal,    color: '#3b82f6' },
              { label: t('approved'),           value: semApproved, color: '#22c55e' },
              { label: t('sdInUse'),            value: semInUse,    color: '#a78bfa' },
              { label: t('sdReturnedOnTime'),   value: semReturned, color: '#f59e0b' },
            ].map((row) => {
              const pct = semTotal > 0 ? (row.value / semTotal) * 100 : 0;
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${txtsub}`}>{row.label}</span>
                    <span className={`sd-num text-xs font-semibold tabular-nums`} style={{ color: row.color }}>
                      {row.value}
                    </span>
                  </div>
                  <div
                    className="h-[3px] w-full rounded-full overflow-hidden"
                    style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(pct, row.value > 0 ? 4 : 0)}%`,
                        background: row.color,
                        opacity: 0.85,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`mt-3 pt-3 border-t ${divider}`}>
            <p className={`text-[10px] mb-1.5 ${txtmuted}`}>{t('sdReturnPunctuality')}</p>
            <div className="flex items-end justify-between gap-2">
              <div>
                <span className={`sd-num text-xl font-bold ${txt}`}>{returnPct}%</span>
                <span className={`text-xs ml-1 tabular-nums ${txtmuted}`}>
                  {semReturned}/{semTotal}
                </span>
              </div>
              {isTrusted && (
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                  {t('sdTrustedBorrower')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Approval rate card */}
        <div className={`rounded-2xl p-4 ${surface}`}>
          <h3 className={`text-sm font-semibold mb-3 ${txt}`}>{t('sdMyProfile')}</h3>
          <div className="flex items-end gap-3 mb-3">
            <span className={`sd-num text-3xl font-bold leading-none tabular-nums ${txt}`}>
              {allTimeRate}%
            </span>
            <div className="mb-0.5">
              <p className={`text-xs font-medium ${txtsub}`}>{t('sdApprovalRate')}</p>
              <p className={`text-[10px] ${txtmuted}`}>{allTimeApproved} {t('ofLabel')} {allTimeTotal}</p>
            </div>
          </div>
          <div
            className="h-[3px] w-full rounded-full overflow-hidden mb-3"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${allTimeRate}%`, background: '#22c55e', opacity: 0.85 }}
            />
          </div>
          <div className={`flex justify-between text-center border-t pt-2.5 ${divider}`}>
            <div>
              <p className={`sd-num text-sm font-bold tabular-nums ${txt}`}>{allTimeTotal}</p>
              <p className={`text-[10px] ${txtmuted}`}>{t('total')}</p>
            </div>
            <div>
              <p className={`sd-num text-sm font-bold tabular-nums ${txt}`}>{allTimeApproved}</p>
              <p className={`text-[10px] ${txtmuted}`}>{t('approved')}</p>
            </div>
            <div>
              <p className={`sd-num text-sm font-bold tabular-nums ${txt}`}>{allTimePending}</p>
              <p className={`text-[10px] ${txtmuted}`}>{t('pending')}</p>
            </div>
          </div>
        </div>

        </div>{/* end right column */}
      </div>

      {/* ── RECENT REQUESTS TABLE ──────────────────────────────────────── */}
      <div className={`sd-fade sd-d5 !mt-4 md:!mt-16 rounded-2xl overflow-hidden ${surface}`}>
        <div className={`flex items-start justify-between px-6 py-4 border-b ${divider}`}>
          <div>
            <h2 className={`text-sm font-semibold ${txt}`}>{t('recentRequests')}</h2>
            <p className={`text-xs mt-0.5 ${txtmuted}`}>
              {t('lastLabel')} {Math.min(5, myRequests.length)} {t('ofLabel')} {myRequests.length}
            </p>
          </div>
          {myRequests.length > 0 && (
            <button
              onClick={() => navigate('/requests')}
              className={`text-xs font-semibold flex items-center gap-1 mt-0.5 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {t('seeAll')} <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {recentRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <Package className={`w-8 h-8 mb-3 ${txtmuted}`} />
            <p className={`text-sm font-medium ${txtsub}`}>{t('noRequestsYet')}</p>
            <p className={`text-xs mt-1 ${txtmuted}`}>{t('sdBrowseCatalogDesc')}</p>
            <button
              onClick={() => navigate(catalogRoute)}
              className="mt-3 text-sm text-blue-500 font-semibold flex items-center gap-1"
            >
              {t('sdBrowseEquipment')} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            {/* Column headers — desktop */}
            <div className={`hidden sm:flex items-center gap-4 px-6 py-2.5 border-b text-[10px] font-semibold uppercase tracking-widest ${txtmuted} ${divider}`}>
              <span className="w-[130px] shrink-0">{t('sdRequestCol')}</span>
              <span className="flex-1">{t('equipment')}</span>
              <span className="w-[52px] shrink-0">{t('qty')}</span>
              <span className="w-[80px] shrink-0">{t('borrowed')}</span>
              <span className="w-[150px] shrink-0">{t('status')}</span>
            </div>

            {recentRequests.map((req, idx) => (
              <div
                key={req.id || idx}
                className={`flex items-center gap-4 px-6 py-3.5 transition-colors ${rowHover} ${
                  idx < recentRequests.length - 1 ? `border-b ${divider}` : ''
                }`}
              >
                <span className={`hidden sm:block w-[130px] shrink-0 text-xs font-mono-jb ${txtmuted}`}>
                  {fmtReqId(req)}
                </span>
                <div className="flex-1 flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                    }}
                  >
                    {req.equipment_image_url ? (
                      <img src={req.equipment_image_url} alt={req.equipment_name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${txt}`}>{req.equipment_name}</p>
                    <p className={`sm:hidden text-xs ${txtmuted}`}>×{req.quantity} · {fmtDate(req.createdAt)}</p>
                  </div>
                </div>
                <span className={`hidden sm:block w-[52px] shrink-0 text-sm tabular-nums ${txtsub}`}>×{req.quantity}</span>
                <span className={`hidden sm:block w-[80px] shrink-0 text-sm ${txtsub}`}>{fmtDate(req.createdAt)}</span>
                <div className="shrink-0 sm:w-[150px]">
                  <DarkStatusBadge status={req.status} t={t} />
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
