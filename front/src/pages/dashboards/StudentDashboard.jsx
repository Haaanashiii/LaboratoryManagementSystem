import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Package, FileText, Clock, CheckCircle, ArrowRight, BookOpen, TrendingUp, Zap, Star, Layers, Box } from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';
import StatusBadge from '@/components/ui/StatusBadge';
import FeaturedEquipmentCard from '@/components/equipment/FeaturedEquipmentCard';
import { CATALOG_ROUTES_BY_ROLE } from '@/utils/roleCatalogRoutes';
import { useTheme } from '@/components/hooks/ThemeContext';

const dashboardStyles = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up { opacity: 0; animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
  .fade-up-1 { animation-delay: 0.04s; }
  .fade-up-2 { animation-delay: 0.12s; }
  .fade-up-3 { animation-delay: 0.20s; }
  .fade-up-4 { animation-delay: 0.28s; }
  .fade-up-5 { animation-delay: 0.36s; }
  .fade-up-6 { animation-delay: 0.44s; }

  @keyframes countUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .stat-num {
    opacity: 0;
    animation: countUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards;
    animation-delay: 0.4s;
  }

  @keyframes heroGlow {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50%       { opacity: 1;   transform: scale(1.08); }
  }
  .hero-orb {
    animation: heroGlow 6s ease-in-out infinite;
    will-change: transform, opacity;
  }
  .hero-orb-2 {
    animation: heroGlow 8s ease-in-out infinite reverse;
    will-change: transform, opacity;
  }

  @keyframes waveHand {
    0%   { transform: rotate(0deg);   }
    10%  { transform: rotate(14deg);  }
    20%  { transform: rotate(-8deg);  }
    30%  { transform: rotate(14deg);  }
    40%  { transform: rotate(-4deg);  }
    50%  { transform: rotate(10deg);  }
    60%  { transform: rotate(0deg);   }
    100% { transform: rotate(0deg);   }
  }
  .wave-emoji {
    display: inline-block;
    transform-origin: 70% 70%;
    animation: waveHand 2.2s ease-in-out infinite;
    animation-delay: 0.6s;
  }

  .glass-card {
    background: rgba(255,255,255,0.72);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.9);
  }

  /* ── STAT TILE: split-panel design ── */
  .stat-tile {
    position: relative;
    overflow: hidden;
    transition: background 0.35s ease, border-color 0.35s ease, box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
    display: flex;
    align-items: stretch;
    padding: 0 !important;
  }
  .stat-tile:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px -6px rgba(0,0,0,0.07);
  }
  .stat-tile-strip {
    width: 56px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .stat-tile-strip::after {
    content: '';
    position: absolute;
    right: -12px;
    top: 0; bottom: 0;
    width: 24px;
    background: inherit;
    clip-path: polygon(0 0, 0% 100%, 100% 100%);
  }
  .stat-tile-body {
    flex: 1;
    padding: 18px 16px 16px 20px;
    background: #f5f5f4;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 100px;
    transition: background 0.35s ease;
  }

  .stat-tile-icon {
    transition: box-shadow 0.3s ease;
  }
  .stat-tile:hover .stat-tile-icon {
    box-shadow: 0 6px 18px -4px rgba(0,0,0,0.28);
  }

  /* ── BENTO ACTION CARD: two-tone block ── */
  .bento-action {
    position: relative;
    overflow: hidden;
    background: #f5f5f4;
    transition: background 0.35s ease, border-color 0.35s ease, box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
    display: flex;
    flex-direction: column;
    padding: 0 !important;
  }
  .bento-action:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 24px -8px rgba(0,0,0,0.08);
  }
  .bento-action-header {
    height: 88px;
    flex-shrink: 0;
    position: relative;
    display: flex;
    align-items: flex-end;
    padding: 0 20px 14px;
  }
  .bento-action-header::after {
    content: '';
    position: absolute;
    bottom: -10px; left: 0; right: 0;
    height: 20px;
    background: #f5f5f4;
    clip-path: ellipse(55% 100% at 50% 100%);
    transition: background 0.35s ease;
  }
  .bento-action-body {
    flex: 1;
    padding: 18px 20px 16px;
    background: #f5f5f4 !important;
    transition: background 0.35s ease;
  }
  .action-icon-wrap {
    width: 40px; height: 40px;
    border-radius: 12px;
    background: rgba(255,255,255,0.25);
    border: 1.5px solid rgba(255,255,255,0.5);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(4px);
    transition: background 0.25s ease;
  }
  .bento-action:hover .action-icon-wrap {
    background: rgba(255,255,255,0.38);
  }

  .action-arrow {
    transition: transform 0.28s cubic-bezier(0.4,0,0.2,1), color 0.28s ease;
  }
  .bento-action:hover .action-arrow {
    transform: translateX(3px);
    color: #3b82f6;
  }

  /* ── REQUEST ROW ── */
  .request-row {
    transition: background 0.18s ease;
    position: relative;
  }
  .request-row::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: linear-gradient(to bottom, #3b82f6, #818cf8);
    border-radius: 0 4px 4px 0;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .request-row:hover { background: rgba(248,250,252,1); }
  .request-row:hover::before { opacity: 1; }

  /* ── DARK GLASS CARD ── */
  .dark-glass {
    background: rgba(255,255,255,0.05);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 1px solid rgba(255,255,255,0.10);
    transition: background 0.35s ease, border-color 0.35s ease, box-shadow 0.3s ease;
  }

  /* ── DARK MODE OVERRIDES ── */
  .dashboard-dark .stat-tile {
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border-color: rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
  }
  .dashboard-dark .stat-tile:hover {
    border-color: rgba(255,255,255,0.18) !important;
    box-shadow: 0 12px 32px -8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08);
  }
  .dashboard-dark .stat-tile-body {
    background: rgba(255,255,255,0.03);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }
  .dashboard-dark .bento-action {
    background: rgba(255,255,255,0.04) !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    border-color: rgba(255,255,255,0.10) !important;
  }
  .dashboard-dark .bento-action:hover {
    background: rgba(255,255,255,0.07) !important;
    border-color: rgba(255,255,255,0.20) !important;
    box-shadow: 0 16px 40px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10);
  }
  .dashboard-dark .bento-action-body {
    background: rgba(255,255,255,0.025) !important;
  }
  .dashboard-dark .bento-action-header::after {
    background: rgba(255,255,255,0.025) !important;
  }
  .dashboard-dark .request-row:hover {
    background: rgba(255,255,255,0.04);
  }
  .dashboard-dark .request-row::before {
    background: linear-gradient(to bottom, #60a5fa, #818cf8);
  }
  .dashboard-dark .hero-banner {
    background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 45%, #3730a3 100%) !important;
  }
`;

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const { isDark } = useTheme();
  const catalogRoute = CATALOG_ROUTES_BY_ROLE.student;

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

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 18) return t('goodAfternoon');
    return t('goodEvening');
  };

  const getTodayDate = () => {
    const locale = lang === 'id' ? 'id-ID' : 'en-US';
    return new Date().toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const pendingRequests   = myRequests.filter(r => r.status === 'pending_lecturer' || r.status === 'pending_head');
  const approvedRequests  = myRequests.filter(r => r.status === 'head_approved' || r.status === 'ready_pickup');
  const borrowedEquipment = myRequests.filter(r => r.status === 'borrowed');
  const availableCount    = equipment.filter(e => (e.available_quantity ?? e.available ?? 0) > 0).length;

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const initials = (user?.name || 'U')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const availableEquipment = equipment
    .filter(e => (e.available_quantity ?? e.available ?? 0) > 0)
    .slice(0, 4);

  // Completion rate for the mini progress arc
  const totalRequests = myRequests.length;
  const returnedCount = myRequests.filter(r => r.status === 'returned').length;
  const completionPct = totalRequests > 0 ? Math.round((returnedCount / totalRequests) * 100) : 0;

  return (
    <div className={`space-y-5 ${isDark ? 'dashboard-dark' : ''}`}>
      <style>{dashboardStyles}</style>

      {/* ── HERO BANNER ──────────────────────────────────────────── */}
      <div className="hero-banner fade-up fade-up-1 relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-6 sm:p-8 shadow-xl">
        {/* decorative orbs */}
        <div className="hero-orb absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/10 pointer-events-none" />
        <div className="hero-orb-2 absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-indigo-400/20 pointer-events-none" />
        <div className="absolute top-4 right-28 w-3 h-3 rounded-full bg-white/30 pointer-events-none" />
        <div className="absolute bottom-6 right-16 w-5 h-5 rounded-full bg-white/20 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          {/* left: text */}
          <div>
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">{getTodayDate()}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
              {getTimeGreeting()},<br className="sm:hidden" />{' '}
              <span className="text-blue-100">{user?.name?.split(' ')[0] || 'Student'}</span> <span className="wave-emoji">👋</span>
            </h1>
            <p className="text-blue-200 text-sm mt-2 leading-relaxed max-w-sm">
              {pendingRequests.length > 0
                ? `You have ${pendingRequests.length} pending request${pendingRequests.length !== 1 ? 's' : ''} waiting for approval.`
                : 'All clear! No pending requests at the moment.'}
            </p>

            {/* CTA */}
            <button
              onClick={() => navigate(catalogRoute)}
              className="mt-4 inline-flex items-center gap-2 bg-white text-blue-600 text-sm font-semibold px-4 py-2 rounded-xl shadow-md hover:shadow-lg hover:bg-blue-50 transition-all duration-200"
            >
              <Package className="w-4 h-4" />
              Browse Equipment
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* right: avatar + stats pill */}
          <div className="flex items-center gap-4 sm:flex-col sm:items-end">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {initials}
            </div>
            <div className={`rounded-xl px-4 py-3 text-center shadow-sm min-w-[90px] border ${isDark ? 'bg-[#0d0d14] border-white/8' : 'glass-card'}`}>
              <p className={`text-2xl font-bold leading-none ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>{totalRequests}</p>
              <p className={`text-[10px] mt-0.5 font-medium uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Total Requests</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── STAT TILES ───────────────────────────────────────────── */}
      <div className="fade-up fade-up-2 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: t('availableEquipment'),
            value: availableCount,
            icon: Package,
            stripBg: 'bg-blue-500',
            stripDarkColor: '#012a4a',
            numColor: 'text-blue-600',
            action: () => navigate(catalogRoute),
          },
          {
            label: t('myActiveRequests'),
            value: pendingRequests.length,
            icon: Clock,
            stripBg: 'bg-amber-400',
            stripDarkColor: '#76520e',
            numColor: 'text-amber-500',
            action: () => navigate('/requests'),
          },
          {
            label: t('approvedPrepNeeded'),
            value: approvedRequests.length,
            icon: CheckCircle,
            stripBg: 'bg-emerald-500',
            stripDarkColor: '#1b4332',
            numColor: 'text-emerald-600',
            action: () => navigate('/requests'),
          },
          {
            label: t('currentlyBorrowed'),
            value: borrowedEquipment.length,
            icon: Layers,
            stripBg: 'bg-violet-500',
            stripDarkColor: '#3c096c',
            numColor: 'text-violet-600',
            action: () => navigate('/requests'),
          },
        ].map((s, i) => (
          <button
            key={s.label}
            onClick={s.action}
            className={`stat-tile group rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 border ${isDark ? 'border-white/25 hover:border-white/40' : 'border-slate-200 hover:border-slate-300'}`}
            style={{ animationDelay: `${0.1 + i * 0.07}s` }}
          >
            {/* Colored accent strip */}
            <div className={`stat-tile-strip ${isDark ? '' : s.stripBg}`} style={isDark ? { backgroundColor: s.stripDarkColor } : undefined}>
              <div className="stat-tile-icon w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shadow-sm">
                <s.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            {/* Content body */}
            <div className="stat-tile-body">
            <p className={`text-[10px] font-semibold uppercase tracking-widest leading-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{s.label}</p>
              <p className={`stat-num text-4xl font-black ${s.numColor} leading-none tabular-nums`}>{s.value}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── BENTO ROW: Quick Actions + Progress card ─────────────── */}
      <div className="fade-up fade-up-3 grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Quick Actions — spans 2 cols */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              title: t('equipmentCatalog'),
              desc: 'Browse & request lab gear',
              icon: Package,
              gradient: 'from-blue-500 to-blue-600',
              darkBg: '#012a4a',
              action: () => navigate(catalogRoute),
            },
            {
              title: t('myRequests'),
              desc: 'Track your borrow requests',
              icon: BookOpen,
              gradient: 'from-emerald-500 to-teal-600',
              darkBg: '#1b4332',
              action: () => navigate('/requests'),
            },
          ].map((a) => (
            <button
              key={a.title}
              onClick={a.action}
              className={`bento-action group rounded-2xl text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDark ? 'hover:border-white/40' : 'hover:border-slate-300'}`}
              style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.25)' : '#e2e8f0'}` }}
            >
              {/* Colored header section */}
              <div
                className={`bento-action-header ${isDark ? '' : `bg-gradient-to-br ${a.gradient}`}`}
                style={isDark ? { background: a.darkBg } : undefined}
              >
                <div className="action-icon-wrap">
                  <a.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              {/* White body */}
              <div className="bento-action-body">
                <p className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{a.title}</p>
                <p className={`text-xs mt-1 leading-snug ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{a.desc}</p>
              </div>
              <ArrowRight className="action-arrow absolute bottom-4 right-4 w-4 h-4 text-slate-300" />
            </button>
          ))}
        </div>

        {/* Progress / Summary card */}
        <div className={`rounded-2xl border shadow-sm p-5 flex flex-col justify-between transition-all duration-[350ms] ease-out ${isDark ? 'dark-glass hover:border-white/20 hover:bg-white/[0.07]' : 'border-stone-300 hover:border-stone-400 bg-stone-100'}`}>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-sm">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <p className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Activity Overview</p>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Pending',  value: pendingRequests.length,   color: 'bg-amber-400',  max: Math.max(totalRequests, 1) },
                { label: 'Approved', value: approvedRequests.length,  color: 'bg-emerald-400', max: Math.max(totalRequests, 1) },
                { label: 'Borrowed', value: borrowedEquipment.length, color: 'bg-violet-400', max: Math.max(totalRequests, 1) },
                { label: 'Returned', value: returnedCount,            color: 'bg-blue-400',   max: Math.max(totalRequests, 1) },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{row.label}</span>
                    <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{row.value}</span>
                  </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-stone-200'}`}>
                    <div
                      className={`h-full ${row.color} rounded-full transition-all duration-700`}
                      style={{ width: `${Math.round((row.value / row.max) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`mt-4 pt-4 border-t flex items-center justify-between ${isDark ? 'border-white/10' : 'border-stone-200'}`}>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Completion rate</p>
            <span className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{completionPct}%</span>
          </div>
        </div>
      </div>

      {/* ── EQUIPMENT SHOWCASE ───────────────────────────────────── */}
      <div className="fade-up fade-up-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <h2 className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Featured Equipment</h2>
          </div>
          <button
            onClick={() => navigate(catalogRoute)}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 transition-all hover:gap-1.5"
          >
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {availableEquipment.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed text-center ${isDark ? 'border-white/10 bg-white/3' : 'border-slate-200 bg-slate-50/60'}`}>
            <Package className={`w-9 h-9 mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No equipment available right now.</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Check back soon for new additions.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {availableEquipment.map((item, idx) => (
              <div key={item._id || item.id} className="fade-up" style={{ animationDelay: `${0.32 + idx * 0.06}s` }}>
                <FeaturedEquipmentCard equipment={item} onClick={() => navigate(catalogRoute)} isDark={isDark} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RECENT REQUESTS ──────────────────────────────────────── */}
      <div className={`fade-up fade-up-5 rounded-2xl border shadow-sm overflow-hidden transition-all duration-[350ms] ease-out ${isDark ? 'dark-glass hover:border-white/20' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-5 pt-5 pb-3 ${isDark ? '' : ''}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <FileText className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{t('myRecentRequests')}</h2>
            {myRequests.length > 0 && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums ${isDark ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                {myRequests.length}
              </span>
            )}
          </div>
          {myRequests.length > 0 && (
            <button
              onClick={() => navigate('/requests')}
              className="text-xs text-blue-500 hover:text-blue-600 font-semibold flex items-center gap-1 transition-all hover:gap-1.5"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {myRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-slate-100'}`}>
              <Zap className={`w-6 h-6 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            </div>
            <p className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>No requests yet. Start borrowing!</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Browse the catalog and submit your first borrow request.</p>
            <button
              onClick={() => navigate(catalogRoute)}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 font-semibold transition-colors"
            >
              Browse Equipment <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="px-5 pb-4">
            {/* Column headers */}
            <div className={`grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 mb-1 rounded-lg text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <span>Equipment</span>
              <span className="text-right w-10">Qty</span>
              <span className="text-right w-24">Status</span>
            </div>

            {/* Rows */}
            <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-white/[0.07]' : 'border-slate-100'}`}>
              {myRequests.slice(0, 6).map((request, idx) => (
                <div
                  key={request.id}
                  className={`request-row grid grid-cols-[1fr_auto_auto] gap-3 items-center px-3 py-3 transition-colors duration-[350ms] ${
                    idx !== Math.min(myRequests.length, 6) - 1
                      ? `border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`
                      : ''
                  }`}
                >
                  {/* Equipment name + date */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                      <Box className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className={`font-semibold text-sm truncate leading-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{request.equipment_name}</p>
                      {request.createdAt && (
                        <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{formatDate(request.createdAt)}</p>
                      )}
                    </div>
                  </div>

                  {/* Qty pill */}
                  <span className={`text-xs font-bold tabular-nums w-10 text-right ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    ×{request.quantity}
                  </span>

                  {/* Status */}
                  <div className="w-24 flex justify-end">
                    <StatusBadge status={request.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
