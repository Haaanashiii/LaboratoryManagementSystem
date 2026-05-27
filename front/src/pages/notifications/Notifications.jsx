import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, CheckCircle, Clock, FileText, Package, XCircle,
  ArrowLeft, Check, Activity, Calendar, Hash, MapPin, X,
} from 'lucide-react';
import { api } from '@/api/apiClient';
import { useTheme } from '@/components/hooks/ThemeContext';
import { useLang } from '@/components/i18n/LangContext';
import { useAuth } from '@/components/hooks/useAuth';
import { Dialog, DialogContent } from '@/components/ui/dialog';

/* ── Animation styles (mirrors StudentDashboard) ──────────────── */
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
  .sd-num { font-family: 'JetBrains Mono', monospace; }

  @keyframes modalSlideIn {
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  .nf-modal-panel { animation: modalSlideIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards; }

  .nf-img-banner {
    position: relative; overflow: hidden;
    height: 160px; border-radius: 16px 16px 0 0; background: #0d1117;
  }
  .nf-img-banner img { width: 100%; height: 100%; object-fit: cover; }
  .nf-img-banner::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0;
    height: 80px; background: linear-gradient(to top, rgba(0,0,0,0.75), transparent);
    pointer-events: none;
  }
  .nf-img-placeholder {
    width: 100%; height: 100%; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 8px;
    background: repeating-linear-gradient(135deg,#0d0d14 0px,#0d0d14 20px,#111118 20px,#111118 40px);
  }
`;

/* ── Helpers ──────────────────────────────────────────────────── */
const getNotifMeta = (item) => {
  const ev = item.event_type || '';
  if (['head_approved', 'returned'].includes(ev))
    return { Icon: CheckCircle, bg: 'rgba(34,197,94,0.15)',  color: '#22c55e' };
  if (ev === 'rejected')
    return { Icon: XCircle,     bg: 'rgba(239,68,68,0.15)',  color: '#ef4444' };
  if (['pending_head', 'borrowed'].includes(ev))
    return { Icon: Clock,       bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' };
  if (ev === 'ready_pickup')
    return { Icon: Package,     bg: 'rgba(20,184,166,0.15)', color: '#14b8a6' };
  if (ev === 'pending_lecturer')
    return { Icon: FileText,    bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' };
  return   { Icon: Bell,        bg: 'rgba(99,102,241,0.15)', color: '#6366f1' };
};

const relTimeAgo = (date, t) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1)   return t('justNow');
  if (m < 60)  return `${m}${t('nfMinsSuffix')}`;
  if (h < 24)  return `${h}${t('nfHoursSuffix')}`;
  if (d === 1) return t('nfYesterday');
  if (d < 7)   return `${d} ${t('nfDaysAgo')}`;
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const buildMessage = (item, t) => {
  if (!item.message_key) return item.message;
  const template = t(item.message_key);
  const params = item.message_params || {};
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? '');
};

const APPROVAL_TYPES = ['head_approved', 'pending_head', 'pending_lecturer'];
const REMINDER_TYPES = ['ready_pickup', 'borrowed', 'returned'];

/* ── Component ────────────────────────────────────────────────── */
export default function Notifications() {
  const navigate    = useNavigate();
  const { isDark }  = useTheme();
  const { t }       = useLang();
  const { user }    = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter]           = useState('all');
  const [page, setPage]               = useState(1);
  const [pickupNotifId, setPickupNotifId] = useState(null);
  const PAGE_SIZE = 10;

  /* ── Design tokens — identical to StudentDashboard ── */
  const surface  = isDark ? 'glass-dark' : 'glass-light';
  const txt      = isDark ? 'text-white'      : 'text-slate-900';
  const txtsub   = isDark ? 'text-slate-400'  : 'text-slate-500';
  const txtmuted = isDark ? 'text-slate-500'  : 'text-slate-400';
  const divider  = isDark ? 'border-white/[0.07]' : 'border-white/50';

  /* ── Data ── */
  const { data, isLoading } = useQuery({
    queryKey: ['notifications', user?.id, user?.role],
    enabled: !!user,
    queryFn: () => api.notifications.list(),
  });

  const notifications = Array.isArray(data) ? data : [];

  const pickupNotif = pickupNotifId ? notifications.find(n => (n._id || n.id) === pickupNotifId) : null;
  const { data: pickupReq, isLoading: pickupLoading } = useQuery({
    queryKey: ['borrowRequest', pickupNotif?.borrow_request],
    enabled: !!pickupNotif?.borrow_request,
    queryFn: () => api.entities.BorrowRequest.getById(pickupNotif.borrow_request),
  });
  const unreadCount   = notifications.filter(n => !n.isRead).length;
  const approvalCount = notifications.filter(n => APPROVAL_TYPES.includes(n.event_type)).length;
  const reminderCount = notifications.filter(n => REMINDER_TYPES.includes(n.event_type)).length;

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── Mutations ── */
  const markReadMutation = useMutation({
    mutationFn: (id) => api.notifications.markAsRead(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(['notifications', user?.id, user?.role], (prev) =>
        Array.isArray(prev)
          ? prev.map(n => (n._id || n.id) === id ? { ...n, isRead: true } : n)
          : prev
      );
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      queryClient.setQueryData(['notifications', user?.id, user?.role], (prev) =>
        Array.isArray(prev) ? prev.map(n => ({ ...n, isRead: true })) : prev
      );
    },
  });

  const deleteOneMutation = useMutation({
    mutationFn: (id) => api.notifications.deleteOne(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(['notifications', user?.id, user?.role], (prev) =>
        Array.isArray(prev) ? prev.filter(n => (n._id || n.id) !== id) : prev
      );
    },
  });

  const handleClick = (id) => {
    const item = notifications.find(n => (n._id || n.id) === id);
    if (!item?.isRead) markReadMutation.mutate(id);
    if (item?.event_type === 'ready_pickup' && !item?.isRead) {
      setPickupNotifId(id);
    }
  };

  /* ── Stat tiles ── */
  const statTiles = [
    {
      label: t('total'),
      sublabel: t('nfStatAllNotifs'),
      value: notifications.length,
      Icon: Bell,
      iconBg: 'rgba(99,102,241,0.13)', iconBorder: 'rgba(99,102,241,0.28)', iconColor: '#6366f1',
      numColor: isDark ? '#e2e8f0' : '#1e40af',
    },
    {
      label: t('unread'),
      sublabel: t('nfStatAwaitingReview'),
      value: unreadCount,
      Icon: Activity,
      iconBg: 'rgba(59,130,246,0.13)', iconBorder: 'rgba(59,130,246,0.28)', iconColor: '#3b82f6',
      numColor: '#3b82f6',
    },
    {
      label: t('nfStatApprovals'),
      sublabel: t('nfStatApprovalUpdates'),
      value: approvalCount,
      Icon: CheckCircle,
      iconBg: 'rgba(34,197,94,0.13)', iconBorder: 'rgba(34,197,94,0.28)', iconColor: '#22c55e',
      numColor: '#22c55e',
    },
    {
      label: t('nfStatReminders'),
      sublabel: t('nfStatReturnPickup'),
      value: reminderCount,
      Icon: Clock,
      iconBg: 'rgba(245,158,11,0.13)', iconBorder: 'rgba(245,158,11,0.28)', iconColor: '#f59e0b',
      numColor: '#f59e0b',
    },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="space-y-4 sm:space-y-5">

        {/* ── Header banner ── */}
        <div className={`sd-fade sd-d1 rounded-2xl p-5 sm:p-6 ${surface}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className={`text-[10px] font-semibold tracking-widest uppercase mb-2 ${txtmuted}`}>
                {t('nfEyebrow')}
              </p>
              <h1 className={`text-2xl sm:text-3xl font-bold leading-tight ${txt}`}>
                {t('notifications')}
              </h1>
              <p className={`text-sm mt-2 max-w-lg leading-relaxed ${txtsub}`}>
                {t('nfSubtitle')}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => navigate(-1)}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium border transition-colors ${
                  isDark
                    ? 'border-white/[0.10] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
                    : 'border-white/60 text-slate-500 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('back')}
              </button>
              <button
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending || unreadCount === 0}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium border transition-colors ${
                  unreadCount === 0
                    ? `opacity-40 cursor-not-allowed ${isDark ? 'border-white/[0.08] text-slate-500' : 'border-white/50 text-slate-400'}`
                    : isDark
                      ? 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10'
                      : 'border-blue-200/80 text-blue-600 hover:bg-blue-50/60'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                {markAllMutation.isPending ? t('nfMarkingAll') : t('nfMarkAllRead')}
              </button>
            </div>
          </div>
        </div>

        {/* ── Stat tiles ── */}
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

        {/* ── Notification list ── */}
        <div className={`sd-fade sd-d3 rounded-2xl overflow-hidden ${surface}`}>

          {/* Filter pills */}
          <div className={`flex items-center justify-between px-5 py-4 border-b ${divider}`}>
            <div className={`flex items-center gap-1 p-1 rounded-xl ${isDark ? 'bg-black/30' : 'bg-white/50'}`}>
              {['all', 'unread'].map(f => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setPage(1); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200 ${
                    filter === f
                      ? isDark
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'bg-white text-slate-900 shadow-sm'
                      : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {f === 'all' ? t('all') : `${t('unread')}${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                </button>
              ))}
            </div>
            <span className={`text-[11px] ${txtmuted}`}>
              {filtered.length} {filtered.length === 1 ? t('itemLabel') : t('itemsLabel')}
            </span>
          </div>

          {/* Items */}
          {isLoading ? (
            <div className="flex flex-col">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`flex items-start gap-3.5 px-5 py-4 ${i < 3 ? `border-b ${divider}` : ''}`}>
                  <div className={`w-9 h-9 rounded-xl shrink-0 animate-pulse ${isDark ? 'bg-white/[0.07]' : 'bg-white/60'}`} />
                  <div className="flex-1 space-y-2 py-1">
                    <div className={`h-3.5 rounded-full w-3/4 animate-pulse ${isDark ? 'bg-white/[0.07]' : 'bg-white/60'}`} />
                    <div className={`h-3 rounded-full w-1/3 animate-pulse ${isDark ? 'bg-white/[0.05]' : 'bg-white/40'}`} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-16 gap-3 ${txtmuted}`}>
              <Bell className="w-10 h-10 opacity-20" />
              <p className="text-sm">
                {filter === 'unread' ? t('nfNoUnread') : t('noNotificationsYet')}
              </p>
            </div>
          ) : (
            paginated.map((item, idx) => {
              const isUnread = item.isRead === false;
              const itemId   = item._id || item.id;
              const { Icon: NIcon, bg: iconBg, color: iconColor } = getNotifMeta(item);
              const msg = buildMessage(item, t);

              return (
                <div
                  key={itemId}
                  onClick={() => handleClick(itemId)}
                  className={`relative flex items-start gap-3.5 px-5 py-4 cursor-pointer transition-colors group ${
                    isUnread
                      ? isDark ? 'bg-blue-500/[0.05]' : 'bg-blue-50/30'
                      : isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-white/40'
                  } ${idx < paginated.length - 1 ? `border-b ${divider}` : ''}`}
                >
                  {/* Left unread accent bar */}
                  {isUnread && (
                    <div className="absolute left-0 top-4 bottom-4 w-[3px] bg-blue-500 rounded-r-full" />
                  )}

                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: iconBg }}
                  >
                    <NIcon className="w-4 h-4" style={{ color: iconColor }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <p className={`text-sm font-semibold leading-snug ${txt}`}>
                      {msg}
                    </p>
                    <p className={`text-[11px] mt-1.5 ${txtmuted}`}>
                      {relTimeAgo(item.event_time, t)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {isUnread && (
                    <div className="absolute right-10 top-4 w-2 h-2 bg-blue-500 rounded-full" />
                  )}

                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteOneMutation.mutate(itemId); }}
                    title="Delete"
                    className={`absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg ${
                      isDark ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}

          {/* Pagination */}
          {!isLoading && filtered.length > PAGE_SIZE && (
            <div className={`flex items-center justify-between px-5 py-3.5 border-t ${divider}`}>
              <p className={`text-[11px] ${txtmuted}`}>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                    isDark ? 'text-slate-400 hover:bg-white/[0.07] hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {t('prevBtn')}
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce((acc, n, i, arr) => {
                    if (i > 0 && n - arr[i - 1] > 1) acc.push('…');
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) =>
                    n === '…' ? (
                      <span key={`ellipsis-${i}`} className={`px-1.5 text-xs ${txtmuted}`}>…</span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                          page === n
                            ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
                            : isDark ? 'text-slate-400 hover:bg-white/[0.07] hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {n}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                    isDark ? 'text-slate-400 hover:bg-white/[0.07] hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {t('nextBtn')}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

    {/* ── Ready for Pickup Modal ── */}
    <Dialog open={!!pickupNotifId} onOpenChange={() => setPickupNotifId(null)}>
      <DialogContent
        className={`p-0 overflow-hidden sm:max-w-md rounded-2xl shadow-2xl border-0 nf-modal-panel ${isDark ? 'text-slate-200' : 'text-slate-900'}`}
        style={isDark ? {
          background: 'rgba(13,13,20,0.97)',
          backdropFilter: 'blur(32px) saturate(140%)',
          WebkitBackdropFilter: 'blur(32px) saturate(140%)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
        } : {
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(32px) saturate(160%)',
          WebkitBackdropFilter: 'blur(32px) saturate(160%)',
          border: '1px solid rgba(255,255,255,0.85)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.12)',
        }}
      >
        {pickupLoading ? (
          <div className={`flex items-center justify-center py-16 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            <div className="w-6 h-6 rounded-full border-2 border-current border-t-transparent animate-spin" />
          </div>
        ) : pickupReq ? (() => {
          const images  = pickupReq.equipment_images_urls || [];
          const img     = images[0] || null;
          const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

          return (
            <>
              {/* Image banner */}
              <div className="nf-img-banner">
                {img ? (
                  <img src={img} alt={pickupReq.equipment_name} />
                ) : (
                  <div className="nf-img-placeholder">
                    <Package className="w-10 h-10 text-slate-700" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-green-400 mb-0.5">{t('equipment')}</p>
                  <h2 className="text-lg font-black text-white leading-tight drop-shadow-md">
                    {pickupReq.equipment_name}
                  </h2>
                </div>
              </div>

              {/* Body */}
              <div className="overflow-y-auto max-h-[60vh]">

                {/* Ready for pickup alert */}
                <div className="mx-5 mt-4 mb-3 flex items-start gap-3 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
                  <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-green-400">{t('readyForPickup')}</p>
                    <p className={`text-xs mt-0.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {t('nfEquipmentReadyBody')}
                    </p>
                  </div>
                </div>

                {/* Meta details */}
                <div className={`mx-5 mb-4 flex flex-col gap-2.5 rounded-xl px-4 py-3 ${
                  isDark ? 'bg-white/[0.04] border border-white/[0.07]' : 'bg-slate-50 border border-slate-200'
                }`}>
                  {[
                    { Icon: Hash,     label: t('quantity'),   value: `${pickupReq.quantity} ${pickupReq.quantity !== 1 ? t('nfUnits') : t('nfUnit')}` },
                    { Icon: Calendar, label: t('borrowDate'), value: fmtDate(pickupReq.borrow_date) },
                    { Icon: Calendar, label: t('returnBy'),   value: fmtDate(pickupReq.return_date) },
                    ...(pickupReq.preparation_location ? [{ Icon: MapPin, label: t('location'), value: pickupReq.preparation_location }] : []),
                  ].map(({ Icon, label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</span>
                      </div>
                      <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="mx-5 mb-5">
                  <button
                    onClick={() => { setPickupNotifId(null); navigate('/requests'); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.30)', color: '#4ade80' }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    {t('viewMyRequests')}
                  </button>
                </div>

              </div>
            </>
          );
        })() : null}
      </DialogContent>
    </Dialog>

    </>
  );
}
