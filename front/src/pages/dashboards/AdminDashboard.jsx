import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { format, subDays, parseISO, isValid } from 'date-fns';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users, Package, FileText, CheckCircle,
  TrendingUp, AlertTriangle, Clock, Activity,
  ArrowUpRight, ArrowRight, ShieldAlert, BarChart2,
} from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';
import { CATALOG_ROUTES_BY_ROLE } from '@/utils/roleCatalogRoutes';

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

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
  fontSize: '12px',
  padding: '8px 12px',
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, color, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-5 text-left transition-all duration-200 hover:border-slate-300 hover:shadow-md"
    >
      <div
        className="absolute inset-y-0 left-0 w-1 rounded-l-xl"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-start justify-between pl-2">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}18` }}
        >
          <Icon className="h-4.5 w-4.5" style={{ color }} />
        </div>
        <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors duration-200 group-hover:text-slate-500" />
      </div>
      <div className="pl-2">
        <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-500">{title}</p>
        {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
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

// ─── main component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLang();

  // ── queries ──
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.entities.User.list(),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.entities.Equipment.list(),
  });

  const { data: allRequests = [] } = useQuery({
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

  // Area chart: requests created per day over last 14 days
  const activityChartData = React.useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i);
      return { date: format(d, 'MMM d'), label: format(d, 'yyyy-MM-dd'), count: 0 };
    });

    allRequests.forEach((req) => {
      const raw = req.created_at ?? req.createdAt ?? req.date;
      if (!raw) return;
      const parsed = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
      if (!isValid(parsed)) return;
      const label = format(parsed, 'yyyy-MM-dd');
      const slot = days.find((d) => d.label === label);
      if (slot) slot.count += 1;
    });

    return days;
  }, [allRequests]);

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

  const getTimeGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('goodMorning') || 'Good morning';
    if (h < 18) return t('goodAfternoon') || 'Good afternoon';
    return t('goodEvening') || 'Good evening';
  };

  // ── render ──
  return (
    <div className="w-full space-y-5 px-2 py-3">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {getTimeGreeting()},{' '}
            <span className="text-blue-600">
              {currentUser?.name?.split(' ')[0] || 'Admin'}
            </span>
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Lab overview — {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingDamageReports.length > 0 && (
            <button
              onClick={() =>
                document.getElementById('damage-section')?.scrollIntoView({ behavior: 'smooth' })
              }
              className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {pendingDamageReports.length} damage{' '}
              {pendingDamageReports.length !== 1 ? 'reports' : 'report'}
            </button>
          )}
          {overdueItems.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
              <Clock className="h-3.5 w-3.5" />
              {overdueItems.length} overdue
            </span>
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

      {/* ── Row 1: Activity area chart + Request status donut ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Borrow Activity — Area Chart */}
        <Card className="border-slate-200 shadow-none lg:col-span-2">
          <CardHeader className="px-6 pt-5 pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Borrow Activity
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Requests created over the last 14 days
                </CardDescription>
              </div>
              <span className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">
                <TrendingUp className="h-3 w-3" />
                14-day trend
              </span>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            {activityChartData.every((d) => d.count === 0) ? (
              <EmptyState message="No activity data found" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={activityChartData}
                  margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
                >
                  <defs>
                    <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    interval={1}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value) => [value, 'Requests']}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Requests"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#activityGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Request Status — Donut */}
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="px-6 pt-5 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">Request Status</CardTitle>
            <CardDescription className="text-xs text-slate-500">Current distribution</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {requestStatusData.length === 0 ? (
              <EmptyState message="No requests yet" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={requestStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={72}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {requestStatusData.map((entry, i) => (
                        <Cell key={`rs-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <DonutLegend items={requestStatusData} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Most Borrowed Bar + Users by Role ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Most Borrowed — Ranked list */}
        <Card className="border-slate-200 shadow-none lg:col-span-2">
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
              <div className="space-y-3">
                {mostBorrowedChartData.map((item, i) => {
                  const max = mostBorrowedChartData[0]?.count || 1;
                  const pct = Math.round((item.count / max) * 100);
                  const rankColors = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];
                  const barColor = rankColors[i] ?? '#e5e7eb';
                  const isTop = i === 0;
                  return (
                    <div key={item.name} className="group flex items-center gap-3">
                      {/* Rank badge */}
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          isTop
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {i + 1}
                      </span>

                      {/* Name + bar */}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <p
                            className={`truncate text-xs font-medium ${
                              isTop ? 'text-slate-900' : 'text-slate-700'
                            }`}
                          >
                            {item.fullName}
                          </p>
                          <span
                            className={`shrink-0 tabular-nums text-xs font-semibold ${
                              isTop ? 'text-blue-600' : 'text-slate-500'
                            }`}
                          >
                            {item.count}×
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
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
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="px-6 pt-5 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">Users by Role</CardTitle>
            <CardDescription className="text-xs text-slate-500">Account type breakdown</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {userRoleData.length === 0 ? (
              <EmptyState message="No user data" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={155}>
                  <PieChart>
                    <Pie
                      data={userRoleData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={66}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {userRoleData.map((entry, i) => (
                        <Cell key={`role-${i}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <DonutLegend items={userRoleData.map((r) => ({ ...r, color: r.fill }))} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Overdue + Equipment Utilization bar ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Overdue Items */}
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="px-6 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Overdue Borrows
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Items past their return date
                </CardDescription>
              </div>
              {overdueItems.length > 0 && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                  {overdueItems.length}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {overdueItems.length === 0 ? (
              <div className="flex h-[160px] flex-col items-center justify-center gap-2 text-slate-400">
                <CheckCircle className="h-7 w-7 opacity-30" />
                <p className="text-sm">All items returned on time</p>
              </div>
            ) : (
              <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                {overdueItems.slice(0, 8).map((item) => {
                  const daysOver = Math.floor(
                    (Date.now() - new Date(item.return_date)) / 86_400_000
                  );
                  const urgency =
                    daysOver > 7
                      ? 'bg-red-100 border-red-200 text-red-700'
                      : 'bg-orange-50 border-orange-200 text-orange-700';
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-800">
                          {item.equipment_name}
                        </p>
                        <p className="truncate text-xs text-slate-500">{item.borrower_name}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${urgency}`}
                      >
                        {daysOver}d
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Equipment Utilization — stacked bar */}
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="px-6 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Equipment Utilization
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Available vs borrowed breakdown
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            {totalEquipment === 0 ? (
              <EmptyState message="No equipment data" />
            ) : (
              <div className="space-y-5">
                {/* Big utilization number */}
                <div className="flex items-end gap-3">
                  <p className="text-4xl font-bold tracking-tight text-slate-900">
                    {utilizationRate}%
                  </p>
                  <p className="mb-1 text-sm text-slate-500">utilization rate</p>
                </div>

                {/* Stacked progress */}
                <div>
                  <div className="mb-2 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-l-full transition-all duration-500"
                      style={{
                        width: `${utilizationRate}%`,
                        backgroundColor: '#2563eb',
                      }}
                    />
                    <div
                      className="h-full flex-1 rounded-r-full transition-all duration-500"
                      style={{ backgroundColor: '#22c55e' }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      Borrowed
                    </div>
                    <p className="mt-1.5 text-2xl font-bold text-slate-900">
                      {totalEquipment - availableEquipment}
                    </p>
                    <p className="text-xs text-slate-400">items out</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Available
                    </div>
                    <p className="mt-1.5 text-2xl font-bold text-slate-900">
                      {availableEquipment}
                    </p>
                    <p className="text-xs text-slate-400">items ready</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Pending Damage Verification ── */}
      {pendingDamageReports.length > 0 && (
        <Card id="damage-section" className="border-amber-200 shadow-none">
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
