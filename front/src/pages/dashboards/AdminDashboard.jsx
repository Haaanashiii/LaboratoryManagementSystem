import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, PieChart, Pie, Cell, Sector,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { format, subDays, parseISO, isValid } from 'date-fns';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import {
  Users, Package, FileText,
  AlertTriangle, Clock, Activity, Sun, Sunset, Moon, CheckCircle,
  ArrowRight, ShieldAlert, BarChart2, PackageCheck,
} from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';
import { CATALOG_ROUTES_BY_ROLE } from '@/utils/roleCatalogRoutes';
import { ChartTooltipContent } from '@/components/ui/chart';
import { AdminDashboardSkeleton } from '@/skeleton-framework/admin';
import '@/styles/equimon-admin.css';

// ─── constants ───────────────────────────────────────────────────────────────
const REQUEST_STATUS_COLORS = {
  pending_lecturer: '#f59e0b', pending_head: '#f97316', head_approved: '#3b82f6',
  ready_pickup: '#2563eb', borrowed: '#22c55e', returned: '#94a3b8', rejected: '#ef4444',
};

const STATUS_LABEL_KEYS = {
  pending_lecturer: 'pendingLecturer',
  pending_head: 'pendingHeadApproval',
  head_approved: 'approved',
  ready_pickup: 'readyPickup',
  borrowed: 'borrowed',
  returned: 'returned',
  rejected: 'rejected',
};

const ROLE_COLORS = {
  student: '#3b82f6', lecturer: '#22c55e', lab_assistant: '#f59e0b',
  head_of_lab: '#2563eb', admin: '#ef4444',
};
const ROLE_LABEL_KEYS = {
  student: 'student',
  lecturer: 'lecturer',
  lab_assistant: 'lab_assistant',
  head_of_lab: 'head_of_lab',
  admin: 'admin',
};

const ACTIVITY_CHART_CONFIG = {
  new:    { labelKey: 'pending',        color: '#f59e0b' },
  active: { labelKey: 'active',         color: '#3b82f6' },
  done:   { labelKey: 'completedLabel', color: '#22c55e' },
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function EmptyState({ message }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, gap: 8, color: 'var(--a-mute)' }}>
      <BarChart2 style={{ width: 32, height: 32, opacity: 0.3 }} />
      <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13 }}>{message}</p>
    </div>
  );
}

function DonutLegend({ items }) {
  return (
    <div style={{ marginTop: 12 }}>
      {items.map(item => (
        <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color ?? item.fill, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ color: 'var(--a-ink-2)' }}>{item.name}</span>
          </div>
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--a-ink)' }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function ActiveDonut({ data, height = 190 }) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const active = data[activeIndex] ?? data[0];

  const renderActiveShape = ({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill }) => (
    <Sector cx={cx} cy={cy} innerRadius={innerRadius - 3} outerRadius={outerRadius + 6}
      startAngle={startAngle} endAngle={endAngle} fill={fill} />
  );

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={70} paddingAngle={2}
            dataKey="value" strokeWidth={0} activeIndex={activeIndex}
            activeShape={renderActiveShape} onMouseEnter={(_, i) => setActiveIndex(i)}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color ?? entry.fill} opacity={i === activeIndex ? 1 : 0.55} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltipContent hideLabel />} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 600, color: 'var(--a-navy)' }}>{active?.value ?? 0}</span>
        <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11, color: 'var(--a-mute)', maxWidth: 80, textAlign: 'center', marginTop: 2, lineHeight: 1.3 }}>{active?.name ?? ''}</span>
      </div>
    </div>
  );
}

function BorrowActivityTooltip({ active, payload, label }) {
  const { t } = useLang();
  if (!active || !payload?.length) return null;
  const meta = {
    Pending:   { displayName: t('pending'),        desc: t('tooltipPendingDesc'),   color: '#f59e0b' },
    Active:    { displayName: t('active'),          desc: t('tooltipActiveDesc'),    color: '#3b82f6' },
    Completed: { displayName: t('completedLabel'),  desc: t('tooltipCompletedDesc'), color: '#22c55e' },
  };
  const total = payload.reduce((s, e) => s + (e.value || 0), 0);
  return (
    <div style={{ minWidth: 220, borderRadius: 8, border: '1px solid var(--a-rule)', background: '#fff', padding: '12px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', fontSize: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--a-rule-2)', paddingBottom: 8, marginBottom: 10 }}>
        <strong style={{ color: 'var(--a-ink)' }}>{label}</strong>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--a-mute)', background: 'var(--a-rule-2)', padding: '2px 6px' }}>{total} {t('total')}</span>
      </div>
      {[...payload].reverse().map(entry => {
        const m = meta[entry.name] ?? {};
        return (
          <div key={entry.name} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, display: 'inline-block' }} />
                <strong style={{ color: 'var(--a-ink)' }}>{m.displayName ?? entry.name}</strong>
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: m.color }}>{entry.value}</span>
            </div>
            {m.desc && <p style={{ margin: '2px 0 0 14px', fontSize: 10, color: 'var(--a-mute)', lineHeight: 1.4 }}>{m.desc}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLang();
  const [activityDays, setActivityDays] = React.useState(14);

  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => api.auth.me() });
  const { data: users = [], isLoading: usersLoading } = useQuery({ queryKey: ['users'], queryFn: () => api.entities.User.list() });
  const { data: equipment = [], isLoading: equipmentLoading } = useQuery({ queryKey: ['equipment'], queryFn: () => api.entities.Equipment.list() });
  const { data: allRequests = [], isLoading: requestsLoading } = useQuery({ queryKey: ['allRequests'], queryFn: () => api.entities.BorrowRequest.list() });
  const { data: dashboardStats } = useQuery({ queryKey: ['dashboardStats'], queryFn: () => api.entities.Stats.dashboard() });
  const { data: mostBorrowed = [] } = useQuery({ queryKey: ['mostBorrowed'], queryFn: () => api.entities.Stats.adminMostBorrowed(8) });

  const verifyDamageMutation = useMutation({
    mutationFn: ({ id, action }) => api.entities.BorrowRequest.verifyDamage(id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allRequests'] }),
  });

  const pendingDamageReports = React.useMemo(
    () => allRequests.filter(item => item.return_condition === 'Damaged' && item.damage_status === 'pending_verification'),
    [allRequests]
  );

  const requestStatusData = React.useMemo(() => {
    const r = dashboardStats?.requests;
    if (!r) return [];
    return Object.entries(STATUS_LABEL_KEYS)
      .map(([key, labelKey]) => ({ name: t(labelKey), value: r[key] ?? 0, color: REQUEST_STATUS_COLORS[key], key }))
      .filter(s => s.value > 0);
  }, [dashboardStats, t]);

  const userRoleData = React.useMemo(() => {
    const u = dashboardStats?.users;
    if (!u) return [];
    return Object.entries(ROLE_LABEL_KEYS)
      .map(([key, labelKey]) => ({ name: t(labelKey), value: u[key] ?? 0, fill: ROLE_COLORS[key] }))
      .filter(r => r.value > 0);
  }, [dashboardStats, t]);

  const overdueItems = React.useMemo(() => {
    const now = new Date();
    return allRequests
      .filter(r => r.status === 'borrowed' && new Date(r.return_date) < now)
      .sort((a, b) => new Date(a.return_date) - new Date(b.return_date));
  }, [allRequests]);

  const needsReadyItems = React.useMemo(() => allRequests.filter(r => r.status === 'head_approved'), [allRequests]);

  const mostBorrowedChartData = React.useMemo(
    () => mostBorrowed.slice(0, 6).map(item => ({
      name: (() => { const n = item.item_name ?? item.equipment_name ?? '—'; return n.length > 18 ? `${n.slice(0, 17)}…` : n; })(),
      fullName: item.item_name ?? item.equipment_name ?? '—',
      count: item.total_borrow_count,
    })),
    [mostBorrowed]
  );

  const activityChartData = React.useMemo(() => {
    const days = Array.from({ length: activityDays }, (_, i) => {
      const d = subDays(new Date(), activityDays - 1 - i);
      return { date: format(d, 'MMM d'), label: format(d, 'yyyy-MM-dd'), new: 0, active: 0, done: 0 };
    });
    allRequests.forEach(req => {
      const raw = req.created_at ?? req.createdAt ?? req.date;
      if (!raw) return;
      const parsed = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
      if (!isValid(parsed)) return;
      const label = format(parsed, 'yyyy-MM-dd');
      const slot = days.find(d => d.label === label);
      if (!slot) return;
      if (['pending_lecturer','pending_head'].includes(req.status)) slot.new += 1;
      else if (['head_approved','ready_pickup','borrowed'].includes(req.status)) slot.active += 1;
      else if (['returned','rejected'].includes(req.status)) slot.done += 1;
    });
    return days;
  }, [allRequests, activityDays]);

  const totalRequests      = allRequests.length;
  const totalUsers         = users.length;
  const totalEquipment     = equipment.length;
  const activeRequests     = allRequests.filter(r => r.status !== 'returned' && r.status !== 'rejected').length;
  const availableEquipment = equipment.filter(e => e.available > 0).length;
  const utilizationRate    = totalEquipment > 0 ? Math.round(((totalEquipment - availableEquipment) / totalEquipment) * 100) : 0;

  const getGreetingConfig = () => {
    const h = new Date().getHours();
    if (h < 12) return { greeting: t('goodMorning') || 'Good morning', Icon: Sun,    color: '#f59e0b', bg: '#fffbeb' };
    if (h < 18) return { greeting: t('goodAfternoon') || 'Good afternoon', Icon: Sunset, color: '#f97316', bg: '#fff7ed' };
    return         { greeting: t('goodEvening') || 'Good evening',   Icon: Moon,   color: '#6366f1', bg: '#eef2ff' };
  };
  const gc = getGreetingConfig();

  if (usersLoading || requestsLoading || equipmentLoading) return <AdminDashboardSkeleton />;

  return (
    <div className="eq-admin" style={{ padding: '24px 28px', minHeight: '100%' }}>

      {/* ── Title Strip ── */}
      <div className="a-titlestrip">
        <div>
          <div className="a-eyebrow">{t('adminOverviewEyebrow')}</div>
          <h1>
            {gc.greeting},{' '}
            <span style={{ color: '#3b82f6' }}>{currentUser?.name?.split(' ')[0] || 'Admin'}</span>
          </h1>
          <div className="a-deck">{format(new Date(), 'EEEE, MMMM d, yyyy')}</div>
        </div>
        <div className="a-right">
          {pendingDamageReports.length > 0 && (
            <button
              onClick={() => document.getElementById('damage-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="a-btn"
              style={{ borderColor: 'var(--a-warn)', color: 'var(--a-warn)', background: 'var(--a-warn-bg)' }}
            >
              <AlertTriangle style={{ width: 13, height: 13 }} />
              {pendingDamageReports.length} {pendingDamageReports.length !== 1 ? t('damageReports') : t('damageReport')}
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="a-cards">
        {[
          { title: t('totalUsers'),     value: totalUsers,      icon: Users,     sub: t('registeredAccounts'),                           onClick: () => navigate('/users') },
          { title: t('totalEquipment'), value: totalEquipment, icon: Package,   sub: `${availableEquipment} ${t('availableLabel')}`,     onClick: () => navigate('/inventory') },
          { title: t('activeRequests'), value: activeRequests, icon: FileText,  sub: `${totalRequests} ${t('totalRequestsLabel')}`,      onClick: () => navigate('/all-requests') },
          { title: t('utilization'),    value: `${utilizationRate}%`, icon: Activity, sub: t('equipmentInUse'),                         onClick: () => navigate(CATALOG_ROUTES_BY_ROLE.admin) },
        ].map(({ title, value, icon: Icon, sub, onClick }) => (
          <button key={title} className="a-card" onClick={onClick} style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }}>
            <div className="c-label">{title}</div>
            <div className="c-val">{value}</div>
            <div className="c-sub">{sub}</div>
            <div className="c-ico"><Icon style={{ width: 20, height: 20 }} /></div>
          </button>
        ))}
      </div>

      {/* ── Equipment Needs Preparation ── */}
      <div className="a-panel">
        <div className="p-head">
          <div style={{ width: 36, height: 36, background: 'var(--a-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <PackageCheck style={{ width: 16, height: 16, color: '#3b82f6' }} />
          </div>
          <h2>{t('equipNeedsMarkedReady')}</h2>
          <span className="count">{needsReadyItems.length} {t('pendingCount')}</span>
          <div className="spacer" />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--a-mute)' }}>
            {t('headApprovedAwaitingLab')}
          </span>
        </div>
        {needsReadyItems.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '28px 24px' }}>
            <CheckCircle style={{ width: 20, height: 20, color: 'var(--a-ok)', opacity: 0.7 }} />
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--a-mute)', fontSize: 13 }}>{t('allEquipmentPreparedLabel')}</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="a-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>{t('equipment')}</th>
                  <th>{t('borrower')}</th>
                  <th className="num">{t('qty')}</th>
                  <th>{t('borrowDate')}</th>
                  <th>{t('returnDate')}</th>
                  <th>{t('lecturer')}</th>
                  <th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {needsReadyItems.map((item, i) => (
                  <tr key={item.id || item._id}>
                    <td className="mono muted" style={{ textAlign: 'center' }}>{String(i + 1).padStart(2, '0')}</td>
                    <td><div className="primary">{item.equipment_name}</div></td>
                    <td className="muted">{item.borrower_name}</td>
                    <td className="num">{item.quantity}</td>
                    <td className="muted">{item.borrow_date ? format(new Date(item.borrow_date), 'MMM d, yyyy') : '—'}</td>
                    <td className="muted">{item.return_date ? format(new Date(item.return_date), 'MMM d, yyyy') : '—'}</td>
                    <td className="muted">{item.lecturer?.name || item.lecturer_email || '—'}</td>
                    <td><span className="a-pill p-info"><span className="dot" style={{ background: 'currentColor' }} />{t('needsPrepLabel')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Equipment Utilization ── */}
      <div className="a-panel" style={{ marginBottom: 20 }}>
        <div style={{ padding: '20px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24 }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--a-mute)' }}>{t('equipmentUtilizationLabel')}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 600, color: 'var(--a-navy)', lineHeight: 1, marginTop: 8 }}>{utilizationRate}%</div>
          </div>
          <div style={{ flex: 1, minWidth: 140, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ height: 10, background: 'var(--a-rule-2)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${utilizationRate}%`, background: 'var(--a-navy)', transition: 'width 0.7s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--a-mute)' }}>
              <span>0%</span><span>100%</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
            {[
              { label: t('borrowed'), value: totalEquipment - availableEquipment, color: 'var(--a-navy)' },
              { label: t('availableLabel'), value: availableEquipment, color: 'var(--a-ok)' },
              { label: t('total'), value: totalEquipment, color: 'var(--a-ink)' },
            ].map(({ label, value, color }, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {i > 0 && <div style={{ width: 1, height: 16, background: 'var(--a-rule)' }} />}
                <div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--a-mute)' }}>{label}</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 600, color, lineHeight: 1.2 }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Overdue Returns ── */}
      {overdueItems.length > 0 ? (
        <div className="a-panel" id="overdue-section" style={{ borderColor: 'var(--a-bad)', marginBottom: 20 }}>
          <div className="p-head" style={{ background: 'var(--a-bad-bg)' }}>
            <div style={{ width: 36, height: 36, background: 'var(--a-bad)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock style={{ width: 16, height: 16, color: '#fff' }} />
            </div>
            <h2>{t('overdueReturns')}</h2>
            <div className="spacer" />
            {(() => {
              const critical = overdueItems.filter(i => Math.floor((Date.now() - new Date(i.return_date)) / 86_400_000) > 7).length;
              const warning  = overdueItems.length - critical;
              return (
                <>
                  {critical > 0 && <span className="a-pill p-bad"><span className="dot" style={{ background: 'currentColor' }} />{critical} {t('criticalLabel')}</span>}
                  {warning  > 0 && <span className="a-pill p-warn"><span className="dot" style={{ background: 'currentColor' }} />{warning} {t('warningLabel')}</span>}
                </>
              );
            })()}
          </div>
          <div style={{ padding: '0 0' }}>
            {overdueItems.slice(0, 8).map((item, i) => {
              const daysOver   = Math.floor((Date.now() - new Date(item.return_date)) / 86_400_000);
              const isCritical = daysOver > 14;
              const isUrgent   = daysOver > 7;
              const barColor   = isCritical ? 'var(--a-bad)' : isUrgent ? '#f97316' : 'var(--a-warn)';
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: '1px solid var(--a-rule-2)', borderLeft: `3px solid ${barColor}` }}>
                  <span className="mono muted" style={{ width: 28, textAlign: 'center', fontSize: 12 }}>{String(i + 1).padStart(2, '0')}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="primary">{item.equipment_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      <Users style={{ width: 11, height: 11, color: 'var(--a-mute)' }} />
                      <span className="muted" style={{ fontSize: 11 }}>{item.borrower_name}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--a-ink-2)', fontWeight: 600 }}>{format(new Date(item.return_date), 'MMM d')}</div>
                    <div className="muted" style={{ fontSize: 10 }}>{format(new Date(item.return_date), 'yyyy')}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, padding: '4px 10px', background: isCritical ? 'var(--a-bad)' : 'var(--a-bad-bg)', color: isCritical ? '#fff' : 'var(--a-bad)', minWidth: 64, textAlign: 'center' }}>
                    {daysOver}{t('dLate')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--a-ok)', background: 'var(--a-ok-bg)', padding: '16px 20px', marginBottom: 20 }}>
          <CheckCircle style={{ width: 18, height: 18, color: 'var(--a-ok)', flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, color: 'var(--a-ok)', fontSize: 14 }}>{t('noOverdueReturns')}</div>
            <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--a-ok)', fontSize: 12, marginTop: 2 }}>{t('allBorrowedWithinWindow')}</div>
          </div>
        </div>
      )}

      {/* ── Charts Row: Borrow Activity + Request Status ── */}
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '2fr 1fr', marginBottom: 16 }}>
        {/* Borrow Activity */}
        <div className="a-panel" style={{ marginBottom: 0 }}>
          <div className="p-head">
            <h2>{t('borrowActivityLabel')}</h2>
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11, color: 'var(--a-mute)' }}>{t('lastLabel')} {activityDays} {t('daysLabel')}</span>
            <div className="spacer" />
            <div style={{ display: 'flex', border: '1px solid var(--a-rule)', background: '#fff' }}>
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setActivityDays(d)}
                  className={activityDays === d ? 'a-btn primary' : 'a-btn'}
                  style={{ padding: '5px 10px', fontSize: 9, borderRadius: 0, border: 'none', borderRight: d !== 30 ? '1px solid var(--a-rule)' : 'none' }}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {activityChartData.every(d => d.new === 0 && d.active === 0 && d.done === 0) ? (
              <EmptyState message={t('noActivityDataFound')} />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={activityChartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--a-rule-2)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--a-mute)' }} axisLine={false} tickLine={false}
                      interval={activityDays >= 30 ? 4 : activityDays >= 14 ? 1 : 0} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--a-mute)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<BorrowActivityTooltip />} />
                    <Area type="monotone" dataKey="done"   name="Completed" stackId="a" stroke="#22c55e" strokeWidth={1.5} fill="#22c55e" fillOpacity={0.15} dot={false} />
                    <Area type="monotone" dataKey="active" name="Active"    stackId="a" stroke="#3b82f6" strokeWidth={1.5} fill="#3b82f6" fillOpacity={0.2}  dot={false} />
                    <Area type="monotone" dataKey="new"    name="Pending"   stackId="a" stroke="#f59e0b" strokeWidth={1.5} fill="#f59e0b" fillOpacity={0.25} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 12, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {Object.values(ACTIVITY_CHART_CONFIG).map(({ labelKey, color }) => (
                    <div key={labelKey} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--a-mute)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                      {t(labelKey)}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Request Status Donut */}
        <div className="a-panel" style={{ marginBottom: 0 }}>
          <div className="p-head"><h2>{t('requestStatusLabel')}</h2></div>
          <div style={{ padding: '16px 20px' }}>
            {requestStatusData.length === 0 ? <EmptyState message={t('noRequestsYet')} /> : (
              <>
                <ActiveDonut data={requestStatusData} />
                <DonutLegend items={requestStatusData} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Charts Row: Most Borrowed + Users by Role ── */}
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '2fr 1fr', marginBottom: 16 }}>
        {/* Most Borrowed */}
        <div className="a-panel" style={{ marginBottom: 0 }}>
          <div className="p-head">
            <h2>{t('mostBorrowedEquipmentLabel')}</h2>
            <div className="spacer" />
            <button onClick={() => navigate('/inventory')} className="a-btn" style={{ padding: '5px 10px', fontSize: 9 }}>
              {t('viewAll')} <ArrowRight style={{ width: 11, height: 11 }} />
            </button>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {mostBorrowedChartData.length === 0 ? <EmptyState message={t('noBorrowDataYet')} /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {mostBorrowedChartData.map((item, i) => {
                  const max = mostBorrowedChartData[0]?.count || 1;
                  const pct = Math.round((item.count / max) * 100);
                  const isTop = i === 0;
                  return (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isTop ? 'var(--a-navy)' : 'var(--a-surface-2)', color: isTop ? '#3b82f6' : 'var(--a-mute)', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontFamily: 'var(--serif)', fontWeight: 600, color: 'var(--a-navy)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.fullName}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: isTop ? 'var(--a-navy)' : 'var(--a-mute)', flexShrink: 0, marginLeft: 8 }}>{item.count}×</span>
                        </div>
                        <div style={{ height: 8, background: 'var(--a-rule-2)' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--a-navy)', opacity: 0.7 + 0.3 * (1 - i / 6) }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Users by Role */}
        <div className="a-panel" style={{ marginBottom: 0 }}>
          <div className="p-head"><h2>{t('usersByRoleLabel')}</h2></div>
          <div style={{ padding: '16px 20px' }}>
            {userRoleData.length === 0 ? <EmptyState message={t('noUserData')} /> : (
              <>
                <ActiveDonut data={userRoleData.map(r => ({ ...r, color: r.fill }))} />
                <DonutLegend items={userRoleData.map(r => ({ ...r, color: r.fill }))} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Pending Damage Verification ── */}
      {pendingDamageReports.length > 0 && (
        <div className="a-panel" id="damage-section" style={{ borderColor: '#3b82f6', marginBottom: 0 }}>
          <div className="p-head" style={{ background: 'var(--a-warn-bg)' }}>
            <div style={{ width: 36, height: 36, background: 'var(--a-warn)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldAlert style={{ width: 16, height: 16, color: '#fff' }} />
            </div>
            <h2>{t('pendingDamageVerificationLabel')}</h2>
            <span className="count">{pendingDamageReports.length} {t('pendingCount')}</span>
          </div>
          <div>
            {pendingDamageReports.slice(0, 5).map(item => (
              <div key={item.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--a-warn-bg)' }}>
                <div style={{ minWidth: 0 }}>
                  <div className="primary">{item.equipment_name}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{t('borrower')}: {item.borrower_name}</div>
                  {item.damage_details && <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--a-ink-2)', margin: '6px 0 0', lineHeight: 1.5 }}>{item.damage_details}</p>}
                  {item.damage_image_url && (
                    <a href={item.damage_image_url} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--a-navy)', letterSpacing: '0.1em' }}>
                      {t('viewImageArrow')}
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Button size="sm" className="h-7 bg-emerald-600 px-4 text-xs hover:bg-emerald-700"
                    disabled={verifyDamageMutation.isPending}
                    onClick={() => verifyDamageMutation.mutate({ id: item.id, action: 'verify' })}>
                    {t('verify')}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-3 text-xs"
                    disabled={verifyDamageMutation.isPending}
                    onClick={() => verifyDamageMutation.mutate({ id: item.id, action: 'reject' })}>
                    {t('reject')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
