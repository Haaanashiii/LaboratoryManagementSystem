import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, PieChart, Pie, Cell, Sector,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { format, subDays, parseISO, isValid } from 'date-fns';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users, Package, FileText,
  AlertTriangle, Clock, Activity, Sun, Sunset, Moon, CheckCircle,
  ArrowUpRight, ArrowRight, ShieldAlert, BarChart2,
} from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';
import { CATALOG_ROUTES_BY_ROLE } from '@/utils/roleCatalogRoutes';
import { ChartTooltipContent } from '@/components/ui/chart';
import { AdminDashboardSkeleton } from '@/skeleton-framework/admin';


// ─── constants ───────────────────────────────────────────────────────────────
const REQUEST_STATUS_COLORS = {
  pending_lecturer: '#f59e0b',
  pending_head: '#f97316',
  head_approved: '#3b82f6',
  ready_pickup: '#2563eb',
  borrowed: '#22c55e',
  returned: '#94a3b8',
  rejected: '#ef4444',
};

const STATUS_LABELS = {
  pending_lecturer: 'Pending Lecturer',
  pending_head: 'Pending Head',
  head_approved: 'Approved',
  ready_pickup: 'Ready Pickup',
  borrowed: 'Borrowed',
  returned: 'Returned',
  rejected: 'Rejected',
};

const ROLE_COLORS = {
  student: '#3b82f6',
  lecturer: '#22c55e',
  lab_assistant: '#f59e0b',
  head_of_lab: '#2563eb',
  admin: '#ef4444',
};

const ROLE_LABELS = {
  student: 'Student',
  lecturer: 'Lecturer',
  lab_assistant: 'Lab Assistant',
  head_of_lab: 'Head of Lab',
  admin: 'Admin',
};

const ACTIVITY_CHART_CONFIG = {
  new:    { label: 'Pending',   color: '#f59e0b' },
  active: { label: 'Active',    color: '#3b82f6' },
  done:   { label: 'Completed', color: '#22c55e' },
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, color, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)]"
      style={{ borderColor: `${color}55` }}
    >
      {/* Ambient gradient wash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(130% 90% at 0% 0%, ${color}11 0%, transparent 65%)`,
        }}
      />
      <div className="relative flex items-start justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{
            backgroundColor: `${color}14`,
            boxShadow: `0 0 0 1px ${color}25`,
          }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <ArrowUpRight
          className="h-4 w-4 opacity-25 transition-all duration-300 group-hover:opacity-75 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          style={{ color }}
        />
      </div>
      <div className="relative">
        <p className="text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-500">{title}</p>
        {sub && <p className="mt-1.5 text-xs text-slate-400">{sub}</p>}
      </div>
    </button>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-slate-400">
      <BarChart2 className="h-8 w-8 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function DonutLegend({ items }) {
  return (
    <div className="mt-3 space-y-2">
      {items.map((item) => (
        <div key={item.name} className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.color ?? item.fill }}
            />
            <span className="text-slate-600">{item.name}</span>
          </div>
          <span className="font-semibold tabular-nums text-slate-900">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function ActiveDonut({ data, height = 190 }) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const active = data[activeIndex] ?? data[0];

  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 3}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    );
  };

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            onMouseEnter={(_, i) => setActiveIndex(i)}
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.color ?? entry.fill}
                opacity={i === activeIndex ? 1 : 0.55}
              />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltipContent hideLabel />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums text-slate-900">
          {active?.value ?? 0}
        </span>
        <span className="mt-0.5 max-w-[80px] text-center text-[11px] leading-tight text-slate-500">
          {active?.name ?? ''}
        </span>
      </div>
    </div>
  );
}

// ─── Borrow Activity custom tooltip ────────────────────────────────────────
function BorrowActivityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const meta = {
    Pending:   { desc: 'Awaiting lecturer or head approval',                  color: '#f59e0b' },
    Active:    { desc: 'Approved, ready for pickup, or currently borrowed',    color: '#3b82f6' },
    Completed: { desc: 'Returned or rejected requests',                        color: '#22c55e' },
  };
  const total = payload.reduce((s, e) => s + (e.value || 0), 0);
  return (
    <div className="min-w-[220px] rounded-xl border border-slate-200 bg-white p-3.5 shadow-xl text-xs">
      <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
        <p className="font-semibold text-slate-700">{label}</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{total} total</span>
      </div>
      {[...payload].reverse().map((entry) => {
        const m = meta[entry.name] ?? {};
        return (
          <div key={entry.name} className="mb-2.5 last:mb-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="font-semibold text-slate-800">{entry.name}</span>
              </div>
              <span className="font-bold tabular-nums" style={{ color: m.color }}>{entry.value}</span>
            </div>
            {m.desc && (
              <p className="mt-0.5 pl-3.5 text-[10px] leading-relaxed text-slate-400">{m.desc}</p>
            )}
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

  // ── queries ──
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.entities.User.list(),
  });

  const { data: equipment = [], isLoading: equipmentLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.entities.Equipment.list(),
  });

  const { data: allRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['allRequests'],
    queryFn: () => api.entities.BorrowRequest.list(),
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => api.entities.Stats.dashboard(),
  });

  const { data: mostBorrowed = [] } = useQuery({
    queryKey: ['mostBorrowed'],
    queryFn: () => api.entities.Stats.adminMostBorrowed(8),
  });

  // ── mutation ──
  const verifyDamageMutation = useMutation({
    mutationFn: ({ id, action }) => api.entities.BorrowRequest.verifyDamage(id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allRequests'] }),
  });

  // ── derived data ──
  const pendingDamageReports = React.useMemo(
    () =>
      allRequests.filter(
        (item) =>
          item.return_condition === 'Damaged' &&
          item.damage_status === 'pending_verification'
      ),
    [allRequests]
  );

  const requestStatusData = React.useMemo(() => {
    const r = dashboardStats?.requests;
    if (!r) return [];
    return Object.entries(STATUS_LABELS)
      .map(([key, label]) => ({
        name: label,
        value: r[key] ?? 0,
        color: REQUEST_STATUS_COLORS[key],
        key,
      }))
      .filter((s) => s.value > 0);
  }, [dashboardStats]);

  const userRoleData = React.useMemo(() => {
    const u = dashboardStats?.users;
    if (!u) return [];
    return Object.entries(ROLE_LABELS)
      .map(([key, label]) => ({ name: label, value: u[key] ?? 0, fill: ROLE_COLORS[key] }))
      .filter((r) => r.value > 0);
  }, [dashboardStats]);

  const overdueItems = React.useMemo(() => {
    const now = new Date();
    return allRequests
      .filter((r) => r.status === 'borrowed' && new Date(r.return_date) < now)
      .sort((a, b) => new Date(a.return_date) - new Date(b.return_date));
  }, [allRequests]);

  const mostBorrowedChartData = React.useMemo(
    () =>
      mostBorrowed.slice(0, 6).map((item) => ({
        name: (() => {
          const n = item.item_name ?? item.equipment_name ?? '—';
          return n.length > 18 ? `${n.slice(0, 17)}…` : n;
        })(),
        fullName: item.item_name ?? item.equipment_name ?? '—',
        count: item.total_borrow_count,
      })),
    [mostBorrowed]
  );

  // Area chart — stacked by status: pending / active / completed
  const activityChartData = React.useMemo(() => {
    const days = Array.from({ length: activityDays }, (_, i) => {
      const d = subDays(new Date(), activityDays - 1 - i);
      return { date: format(d, 'MMM d'), label: format(d, 'yyyy-MM-dd'), new: 0, active: 0, done: 0 };
    });

    allRequests.forEach((req) => {
      const raw = req.created_at ?? req.createdAt ?? req.date;
      if (!raw) return;
      const parsed = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
      if (!isValid(parsed)) return;
      const label = format(parsed, 'yyyy-MM-dd');
      const slot = days.find((d) => d.label === label);
      if (!slot) return;
      if (['pending_lecturer', 'pending_head'].includes(req.status)) slot.new += 1;
      else if (['head_approved', 'ready_pickup', 'borrowed'].includes(req.status)) slot.active += 1;
      else if (['returned', 'rejected'].includes(req.status)) slot.done += 1;
    });

    return days;
  }, [allRequests, activityDays]);

  const totalRequests = allRequests.length;
  const totalUsers = users.length;
  const totalEquipment = equipment.length;
  const activeRequests = allRequests.filter(
    (r) => r.status !== 'returned' && r.status !== 'rejected'
  ).length;
  const availableEquipment = equipment.filter((e) => e.available > 0).length;
  const utilizationRate =
    totalEquipment > 0
      ? Math.round(((totalEquipment - availableEquipment) / totalEquipment) * 100)
      : 0;

  const getGreetingConfig = () => {
    const h = new Date().getHours();
    if (h < 12) return { greeting: t('goodMorning') || 'Good morning', Icon: Sun,    color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' };
    if (h < 18) return { greeting: t('goodAfternoon') || 'Good afternoon', Icon: Sunset, color: '#f97316', bg: '#fff7ed', border: '#fed7aa' };
    return         { greeting: t('goodEvening') || 'Good evening',   Icon: Moon,   color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' };
  };
  const gc = getGreetingConfig();

  // ── loading guard ──
  if (usersLoading || requestsLoading || equipmentLoading) return <AdminDashboardSkeleton />;

  // ── render ──
  return (
    <div className="w-full overflow-x-hidden space-y-5 px-2 py-3">

      {/* ── Hero Banner ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
            style={{ backgroundColor: gc.bg, borderColor: gc.border }}
          >
            <gc.Icon className="h-6 w-6" style={{ color: gc.color }} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {gc.greeting},{' '}
              <span style={{ color: gc.color }}>
                {currentUser?.name?.split(' ')[0] || 'Admin'}
              </span>
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">

          {/* Damage Reports pill — only when present */}
          {pendingDamageReports.length > 0 && (
            <button
              onClick={() => document.getElementById('damage-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="group flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 transition-all hover:border-amber-300 hover:bg-amber-100 hover:shadow-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 transition-colors group-hover:bg-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <div className="text-left">
                <p className="text-base font-bold leading-none tabular-nums text-amber-700">{pendingDamageReports.length}</p>
                <p className="mt-0.5 text-[10px] font-medium text-amber-500">damage {pendingDamageReports.length !== 1 ? 'reports' : 'report'}</p>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={totalUsers}
          icon={Users}
          color="#2563eb"
          sub="Registered accounts"
          onClick={() => navigate('/users')}
        />
        <StatCard
          title="Total Equipment"
          value={totalEquipment}
          icon={Package}
          color="#0ea5e9"
          sub={`${availableEquipment} available`}
          onClick={() => navigate('/inventory')}
        />
        <StatCard
          title="Active Requests"
          value={activeRequests}
          icon={FileText}
          color="#f59e0b"
          sub={`${totalRequests} total requests`}
          onClick={() => navigate('/all-requests')}
        />
        <StatCard
          title="Utilization"
          value={`${utilizationRate}%`}
          icon={Activity}
          color="#22c55e"
          sub="Equipment in use"
          onClick={() => navigate(CATALOG_ROUTES_BY_ROLE.admin)}
        />
      </div>

      {/* ── Equipment Utilization (compact) ── */}
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-6">
          <div className="shrink-0">
            <p className="text-xs font-medium text-slate-500">Equipment Utilization</p>
            <p className="mt-0.5 text-3xl font-bold tracking-tight text-slate-900">{utilizationRate}%</p>
          </div>
          <div className="flex flex-1 flex-col gap-1.5 min-w-[140px]">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${utilizationRate}%`, backgroundColor: '#2563eb' }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="group relative flex cursor-default items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-xs text-slate-500">Borrowed</span>
              <span className="text-sm font-bold text-slate-900">{totalEquipment - availableEquipment}</span>
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2.5 w-max max-w-[200px] -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] leading-relaxed text-slate-600 shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                Equipment currently checked out and not yet returned
                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-200" />
                <div className="absolute left-1/2 top-[calc(100%-1px)] -translate-x-1/2 border-4 border-transparent border-t-white" />
              </div>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="group relative flex cursor-default items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-500">Available</span>
              <span className="text-sm font-bold text-slate-900">{availableEquipment}</span>
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2.5 w-max max-w-[200px] -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] leading-relaxed text-slate-600 shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                Equipment in stock and ready to borrow
                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-200" />
                <div className="absolute left-1/2 top-[calc(100%-1px)] -translate-x-1/2 border-4 border-transparent border-t-white" />
              </div>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="group relative flex cursor-default items-center gap-2">
              <span className="text-xs text-slate-500">Total</span>
              <span className="text-sm font-bold text-slate-900">{totalEquipment}</span>
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2.5 w-max max-w-[200px] -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] leading-relaxed text-slate-600 shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                Total equipment items registered in the system
                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-200" />
                <div className="absolute left-1/2 top-[calc(100%-1px)] -translate-x-1/2 border-4 border-transparent border-t-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Overdue Returns ── */}
      {overdueItems.length > 0 ? (
        <Card id="overdue-section" className="overflow-hidden rounded-2xl border-red-200 shadow-sm">
          {/* Header */}
          <div className="border-b border-red-100 bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-4 ring-red-100">
                  <Clock className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Overdue Returns</h3>
                  <p className="text-xs text-slate-500">Items past their scheduled return date</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const critical = overdueItems.filter(i => Math.floor((Date.now() - new Date(i.return_date)) / 86_400_000) > 7).length;
                  const warning  = overdueItems.length - critical;
                  return (
                    <>
                      {critical > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                          <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                          {critical} critical
                        </span>
                      )}
                      {warning > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                          {warning} warning
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100">
            {overdueItems.slice(0, 8).map((item, i) => {
              const daysOver   = Math.floor((Date.now() - new Date(item.return_date)) / 86_400_000);
              const isCritical = daysOver > 14;
              const isUrgent   = daysOver > 7;
              return (
                <div
                  key={item.id}
                  className={`group relative flex items-center gap-4 py-4 pl-0 pr-6 transition-colors hover:bg-slate-50/80 ${
                    isCritical ? 'border-l-[3px] border-l-red-600 pl-[21px]'
                    : isUrgent  ? 'border-l-[3px] border-l-red-400 pl-[21px]'
                                : 'border-l-[3px] border-l-orange-300 pl-[21px]'
                  }`}
                >
                  {/* rank */}
                  <span className="w-8 shrink-0 text-center text-sm font-bold tabular-nums text-slate-300">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  {/* equipment + borrower */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.equipment_name}</p>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <Users className="h-3 w-3 shrink-0" />
                      <span className="truncate">{item.borrower_name}</span>
                    </div>
                  </div>

                  {/* due date */}
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold text-slate-700">{format(new Date(item.return_date), 'MMM d')}</p>
                    <p className="text-[10px] text-slate-400">{format(new Date(item.return_date), 'yyyy')}</p>
                  </div>

                  {/* days late badge */}
                  <span
                    className={`shrink-0 min-w-[68px] rounded-lg px-2.5 py-1.5 text-center text-xs font-bold ${
                      isCritical ? 'bg-red-600 text-white'
                      : isUrgent  ? 'bg-red-100 text-red-700'
                                  : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {daysOver}d late
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {overdueItems.length > 8 && (
            <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3">
              <p className="text-xs text-slate-500">{overdueItems.length - 8} more overdue item{overdueItems.length - 8 !== 1 ? 's' : ''} not shown</p>
            </div>
          )}
        </Card>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-4 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">No overdue returns</p>
            <p className="text-xs text-emerald-600">All borrowed items are within their return window</p>
          </div>
        </div>
      )}

      {/* ── Row 1: Activity area chart + Request status donut ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Borrow Activity — Area Chart */}
        <Card className="rounded-2xl border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md lg:col-span-2">
          <CardHeader className="px-6 pt-5 pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Borrow Activity
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Requests over the last {activityDays} days
                </CardDescription>
              </div>
              <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => setActivityDays(d)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150 ${
                      activityDays === d
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            {activityChartData.every((d) => d.new === 0 && d.active === 0 && d.done === 0) ? (
              <EmptyState message="No activity data found" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={activityChartData}
                    margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      interval={activityDays >= 30 ? 4 : activityDays >= 14 ? 1 : 0}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<BorrowActivityTooltip />} />
                    <Area type="monotone" dataKey="done" name="Completed" stackId="a" stroke="#22c55e" strokeWidth={1.5} fill="#22c55e" fillOpacity={0.15} dot={false} />
                    <Area type="monotone" dataKey="active" name="Active" stackId="a" stroke="#3b82f6" strokeWidth={1.5} fill="#3b82f6" fillOpacity={0.2} dot={false} />
                    <Area type="monotone" dataKey="new" name="Pending" stackId="a" stroke="#f59e0b" strokeWidth={1.5} fill="#f59e0b" fillOpacity={0.25} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="mt-3 flex items-center gap-5 text-xs text-slate-500">
                  {[
                    { ...ACTIVITY_CHART_CONFIG.new,    desc: 'Requests awaiting lecturer or head of lab approval' },
                    { ...ACTIVITY_CHART_CONFIG.active, desc: 'Approved, ready for pickup, or currently borrowed' },
                    { ...ACTIVITY_CHART_CONFIG.done,   desc: 'Returned or rejected requests' },
                  ].map(({ label, color, desc }) => (
                    <div key={label} className="group relative flex cursor-default items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                      {label}
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2.5 w-max max-w-[200px] -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] leading-relaxed text-slate-600 shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        {desc}
                        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-200" />
                        <div className="absolute left-1/2 top-[calc(100%-1px)] -translate-x-1/2 border-4 border-transparent border-t-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Request Status — Donut */}
        <Card className="rounded-2xl border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
          <CardHeader className="px-6 pt-5 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">Request Status</CardTitle>
            <CardDescription className="text-xs text-slate-500">Current distribution</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {requestStatusData.length === 0 ? (
              <EmptyState message="No requests yet" />
            ) : (
              <>
                <ActiveDonut data={requestStatusData} />
                <DonutLegend items={requestStatusData} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Most Borrowed Bar + Users by Role ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Most Borrowed — Ranked list */}
        <Card className="rounded-2xl border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md lg:col-span-2">
          <CardHeader className="px-6 pt-5 pb-0">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Most Borrowed Equipment
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Top items by total borrow count
                </CardDescription>
              </div>
              <button
                onClick={() => navigate('/inventory')}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                View all <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-4 pt-4">
            {mostBorrowedChartData.length === 0 ? (
              <EmptyState message="No borrow data yet" />
            ) : (
              <div className="space-y-4">
                {mostBorrowedChartData.map((item, i) => {
                  const max = mostBorrowedChartData[0]?.count || 1;
                  const pct = Math.round((item.count / max) * 100);
                  const rankColors = ['#1d4ed8', '#2563eb', '#3b82f6', '  60a5fa', '#93c5fd', '#bfdbfe'];
                  const barColor = rankColors[i] ?? '#e5e7eb';
                  const isTop = i === 0;
                  return (
                    <div key={item.name} className="group flex items-center gap-4">
                      {/* Rank badge */}
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                          isTop
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {i + 1}
                      </span>

                      {/* Name + bar */}
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p
                            className={`truncate text-sm font-semibold ${
                              isTop ? 'text-slate-900' : 'text-slate-700'
                            }`}
                          >
                            {item.fullName}
                          </p>
                          <span
                            className={`shrink-0 tabular-nums text-sm font-bold ${
                              isTop ? 'text-blue-600' : 'text-slate-500'
                            }`}
                          >
                            {item.count}×
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: barColor }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users by Role — Donut */}
        <Card className="rounded-2xl border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
          <CardHeader className="px-6 pt-5 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">Users by Role</CardTitle>
            <CardDescription className="text-xs text-slate-500">Account type breakdown</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {userRoleData.length === 0 ? (
              <EmptyState message="No user data" />
            ) : (
              <>
                <ActiveDonut data={userRoleData.map((r) => ({ ...r, color: r.fill }))} />
                <DonutLegend items={userRoleData.map((r) => ({ ...r, color: r.fill }))} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Pending Damage Verification ── */}
      {pendingDamageReports.length > 0 && (
        <Card id="damage-section" className="rounded-2xl border-amber-200/70 shadow-sm transition-all duration-200 hover:shadow-md">
          <CardHeader className="px-6 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Pending Damage Verification
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Review and verify reported equipment damage
                  </CardDescription>
                </div>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                {pendingDamageReports.length} pending
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-amber-100">
              {pendingDamageReports.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{item.equipment_name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Borrower: {item.borrower_name}
                    </p>
                    {item.damage_details && (
                      <p className="mt-1.5 max-w-prose text-sm text-slate-600">
                        {item.damage_details}
                      </p>
                    )}
                    {item.damage_image_url && (
                      <a
                        href={`http://localhost:3000${item.damage_image_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs font-medium text-blue-600 hover:underline"
                      >
                        View damage image →
                      </a>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      className="h-7 bg-emerald-600 px-4 text-xs hover:bg-emerald-700"
                      disabled={verifyDamageMutation.isPending}
                      onClick={() =>
                        verifyDamageMutation.mutate({ id: item.id, action: 'verify' })
                      }
                    >
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs"
                      disabled={verifyDamageMutation.isPending}
                      onClick={() =>
                        verifyDamageMutation.mutate({ id: item.id, action: 'reject' })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
