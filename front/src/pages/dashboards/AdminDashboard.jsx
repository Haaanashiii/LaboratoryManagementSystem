import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, Package, FileText, CheckCircle, ShieldCheck,
  Settings, ArrowRight, ArrowUpRight, AlertTriangle, Clock,
} from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';
import { CATALOG_ROUTES_BY_ROLE } from '@/utils/roleCatalogRoutes';

// ─── constants ───────────────────────────────────────────────────────────────
const REQUEST_STATUS_COLORS = {
  pending_lecturer: '#f59e0b',
  pending_head: '#f97316',
  head_approved: '#3b82f6',
  ready_pickup: '#6366f1',
  borrowed: '#22c55e',
  returned: '#94a3b8',
  rejected: '#ef4444',
};

const STATUS_LABELS = {
  pending_lecturer: 'Pending Lecturer',
  pending_head: 'Pending Head',
  head_approved: 'Head Approved',
  ready_pickup: 'Ready Pickup',
  borrowed: 'Borrowed',
  returned: 'Returned',
  rejected: 'Rejected',
};

const STATUS_BADGE_CLASS = {
  borrowed: 'bg-green-50 text-green-700 border-green-200',
  head_approved: 'bg-blue-50 text-blue-700 border-blue-200',
  ready_pickup: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  pending_lecturer: 'bg-amber-50 text-amber-700 border-amber-200',
  pending_head: 'bg-orange-50 text-orange-700 border-orange-200',
  returned: 'bg-slate-50 text-slate-600 border-slate-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const CAT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6', '#8b5cf6'];

const ROLE_COLORS = {
  student: '#3b82f6',
  lecturer: '#22c55e',
  lab_assistant: '#f59e0b',
  head_of_lab: '#6366f1',
  admin: '#ef4444',
};

const ROLE_LABELS = {
  student: 'Student',
  lecturer: 'Lecturer',
  lab_assistant: 'Lab Assistant',
  head_of_lab: 'Head of Lab',
  admin: 'Admin',
};

// ─── small helpers ────────────────────────────────────────────────────────────
function SectionLabel({ title, description, action }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, accentBg, accentText, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative rounded-xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className={`rounded-lg p-2 ${accentBg}`}>
          <Icon className={`h-4 w-4 ${accentText}`} />
        </div>
        <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{title}</p>
    </button>
  );
}

const tooltipStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  padding: '8px 12px',
};

// ─── main component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLang();

  const [trendPeriod, setTrendPeriod] = useState('30');

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

  const { data: rawTrends = [] } = useQuery({
    queryKey: ['adminBorrowingTrends', trendPeriod],
    queryFn: () =>
      api.entities.Stats.adminBorrowingTrends({
        groupBy: trendPeriod === '90' ? 'week' : 'day',
        period: parseInt(trendPeriod, 10),
      }),
  });

  const { data: mostBorrowed = [] } = useQuery({
    queryKey: ['mostBorrowed'],
    queryFn: () => api.entities.Stats.adminMostBorrowed(8),
  });

  const { data: lateReturnUsers = [] } = useQuery({
    queryKey: ['lateReturnUsers'],
    queryFn: () => api.entities.Stats.adminLateReturnUsers(8),
  });

  // ── mutation ──
  const verifyDamageMutation = useMutation({
    mutationFn: ({ id, action }) => api.entities.BorrowRequest.verifyDamage(id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allRequests'] }),
  });

  // ── derived data ──
  const pendingDamageReports = React.useMemo(
    () => allRequests.filter(
      (item) => item.return_condition === 'Damaged' && item.damage_status === 'pending_verification'
    ),
    [allRequests]
  );

  const trendChartData = React.useMemo(
    () =>
      rawTrends.map((p) => ({
        label: p.label,
        Total: p.total_requests,
        Approved: p.approved_requests,
        Rejected: p.rejected_requests,
      })),
    [rawTrends]
  );

  const requestStatusData = React.useMemo(() => {
    const r = dashboardStats?.requests;
    if (!r) return [];
    return Object.entries(STATUS_LABELS)
      .map(([key, label]) => ({ name: label, value: r[key] ?? 0, color: REQUEST_STATUS_COLORS[key], key }))
      .filter((s) => s.value > 0);
  }, [dashboardStats]);

  const categoryData = React.useMemo(
    () =>
      (dashboardStats?.equipmentByCategory || []).map((c, i) => ({
        name: c.category || 'Other',
        count: c.count,
        fill: CAT_COLORS[i % CAT_COLORS.length],
      })),
    [dashboardStats]
  );

  const userRoleData = React.useMemo(() => {
    const u = dashboardStats?.users;
    if (!u) return [];
    return Object.entries(ROLE_LABELS)
      .map(([key, label]) => ({ name: label, value: u[key] ?? 0, fill: ROLE_COLORS[key] }))
      .filter((r) => r.value > 0);
  }, [dashboardStats]);

  const lateReturnChartData = React.useMemo(
    () =>
      lateReturnUsers.slice(0, 6).map((u) => ({
        name: u.borrower_name?.split(' ')[0] ?? 'User',
        late: u.late_return_count,
        days: u.total_late_days,
      })),
    [lateReturnUsers]
  );

  const equipUtilData = React.useMemo(() => {
    const eq = dashboardStats?.equipment;
    if (!eq) return [];
    const borrowed = eq.total - eq.available;
    return [
      { name: 'Available', value: eq.available, fill: '#22c55e' },
      { name: 'Borrowed', value: borrowed > 0 ? borrowed : 0, fill: '#3b82f6' },
    ];
  }, [dashboardStats]);

  const totalUsers = users.length;
  const totalEquipment = equipment.length;
  const availableEquipment = equipment.filter((e) => e.available > 0).length;
  const activeRequests = allRequests.filter(
    (r) => r.status !== 'returned' && r.status !== 'rejected'
  ).length;

  const getTimeGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('goodMorning');
    if (h < 18) return t('goodAfternoon');
    return t('goodEvening');
  };

  const topBorrowMax = mostBorrowed[0]?.total_borrow_count ?? 1;

  // ── render ──
  return (
    <div className="w-full space-y-3 px-2 py-2">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {getTimeGreeting()}, {currentUser?.name?.split(' ')[0] || 'Admin'}
            </h1>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Admin
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Here's what's happening in your lab today.</p>
        </div>
        {pendingDamageReports.length > 0 && (
          <button
            onClick={() => document.getElementById('damage-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {pendingDamageReports.length} damage report{pendingDamageReports.length !== 1 ? 's' : ''} pending
          </button>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title={t('totalUsers')}
          value={totalUsers}
          icon={Users}
          accentBg="bg-blue-50"
          accentText="text-blue-600"
          onClick={() => navigate('/users')}
        />
        <StatCard
          title={t('totalEquipment')}
          value={totalEquipment}
          icon={Package}
          accentBg="bg-violet-50"
          accentText="text-violet-600"
          onClick={() => navigate('/inventory')}
        />
        <StatCard
          title={t('availableEquipment')}
          value={availableEquipment}
          icon={CheckCircle}
          accentBg="bg-emerald-50"
          accentText="text-emerald-600"
          onClick={() => navigate(CATALOG_ROUTES_BY_ROLE.admin)}
        />
        <StatCard
          title={t('activeRequests')}
          value={activeRequests}
          icon={FileText}
          accentBg="bg-amber-50"
          accentText="text-amber-600"
          onClick={() => navigate('/all-requests')}
        />
      </div>

      {/* ── Charts Row: Trend + Status Donut ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Borrowing Trend */}
        <Card className="border-slate-200 shadow-none lg:col-span-2">
          <CardHeader className="pb-2 pt-5 px-5">
            <SectionLabel
              title="Borrowing Trends"
              description="Request volume over time"
              action={
                <Tabs value={trendPeriod} onValueChange={setTrendPeriod} defaultValue="30">
                  <TabsList className="h-7">
                    <TabsTrigger value="7" className="h-5 px-2 text-xs">7d</TabsTrigger>
                    <TabsTrigger value="30" className="h-5 px-2 text-xs">30d</TabsTrigger>
                    <TabsTrigger value="90" className="h-5 px-2 text-xs">90d</TabsTrigger>
                  </TabsList>
                </Tabs>
              }
            />
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {trendChartData.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
                No trend data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendChartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="Total" stroke="#3b82f6" strokeWidth={2} fill="url(#gradTotal)" dot={false} />
                  <Area type="monotone" dataKey="Approved" stroke="#22c55e" strokeWidth={2} fill="url(#gradApproved)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Request Status Donut */}
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="pb-2 pt-5 px-5">
            <SectionLabel title="Request Status" description="Current distribution" />
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {requestStatusData.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
                No requests yet
              </div>
            ) : (
              <div>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={requestStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {requestStatusData.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-2">
                  {requestStatusData.map((s) => (
                    <div key={s.key} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-slate-600">{s.name}</span>
                      </div>
                      <span className="font-semibold text-slate-900">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Row: Category Bar + Most Borrowed + Quick Actions ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Equipment by Category */}
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="pb-2 pt-5 px-5">
            <SectionLabel title="Equipment by Category" description="Inventory breakdown" />
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {categoryData.length === 0 ? (
              <div className="flex h-[180px] items-center justify-center text-sm text-slate-400">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, categoryData.length * 36)}>
                <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    width={88}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Items" radius={[0, 4, 4, 0]} maxBarSize={16}>
                    {categoryData.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Most Borrowed */}
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="pb-2 pt-5 px-5">
            <SectionLabel title="Most Borrowed" description="Top equipment by usage" />
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {mostBorrowed.length === 0 ? (
              <div className="flex h-[180px] items-center justify-center text-sm text-slate-400">No data</div>
            ) : (
              <div className="space-y-3">
                {mostBorrowed.slice(0, 7).map((item, i) => (
                  <div key={item._id ?? i} className="flex items-center gap-3">
                    <span className="w-4 shrink-0 text-xs font-medium text-slate-400">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-800">
                        {item.item_name ?? item.equipment_name ?? '—'}
                      </p>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${Math.min(100, (item.total_borrow_count / topBorrowMax) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">{item.total_borrow_count}×</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="pb-2 pt-5 px-5">
            <SectionLabel title="Quick Actions" />
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2">
            {[
              { label: t('manageUsers'), sub: `${totalUsers} ${t('users')}`, icon: Users, path: '/users', bg: 'bg-blue-50', text: 'text-blue-600' },
              { label: t('manageInventory'), sub: `${totalEquipment} ${t('items')}`, icon: Package, path: '/inventory', bg: 'bg-violet-50', text: 'text-violet-600' },
              { label: 'Audit Logs', sub: 'Security activity', icon: ShieldCheck, path: '/admin-audit-logs', bg: 'bg-emerald-50', text: 'text-emerald-600' },
              { label: t('systemSettings'), sub: t('configuration'), icon: Settings, path: '/settings', bg: 'bg-slate-100', text: 'text-slate-600' },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => navigate(a.path)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 text-left transition-colors hover:border-slate-200 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-md p-1.5 ${a.bg}`}>
                    <a.icon className={`h-3.5 w-3.5 ${a.text}`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-800">{a.label}</p>
                    <p className="text-xs text-slate-400">{a.sub}</p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Extra Charts: Users by Role + Late Returns + Equipment Utilization ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Users by Role */}
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="pb-2 pt-5 px-5">
            <SectionLabel title="Users by Role" description="Active user distribution" />
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {userRoleData.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">No data</div>
            ) : (
              <div>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={userRoleData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {userRoleData.map((entry, i) => (
                        <Cell key={`role-${i}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {userRoleData.map((r) => (
                    <div key={r.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: r.fill }} />
                        <span className="text-slate-600">{r.name}</span>
                      </div>
                      <span className="font-semibold text-slate-900">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Late Return Users */}
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="pb-2 pt-5 px-5">
            <SectionLabel title="Late Return Offenders" description="Users with most overdue returns" />
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {lateReturnChartData.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">No late returns recorded</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, lateReturnChartData.length * 36)}>
                <BarChart data={lateReturnChartData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    width={64}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [value, name === 'late' ? 'Late returns' : 'Total late days']}
                  />
                  <Bar dataKey="late" name="late" fill="#ef4444" radius={[0, 4, 4, 0]} maxBarSize={14} />
                  <Bar dataKey="days" name="days" fill="#fca5a5" radius={[0, 4, 4, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Equipment Utilization */}
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="pb-2 pt-5 px-5">
            <SectionLabel title="Equipment Utilization" description="Available vs currently borrowed" />
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {equipUtilData.length === 0 || (equipUtilData[0].value === 0 && equipUtilData[1].value === 0) ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">No equipment data</div>
            ) : (
              <div>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={equipUtilData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {equipUtilData.map((entry, i) => (
                        <Cell key={`util-${i}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-3">
                  {equipUtilData.map((e) => (
                    <div key={e.name}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: e.fill }} />
                          <span className="text-slate-600">{e.name}</span>
                        </div>
                        <span className="font-semibold text-slate-900">{e.value}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${totalEquipment > 0 ? Math.round((e.value / totalEquipment) * 100) : 0}%`,
                            backgroundColor: e.fill,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="pt-1 text-center text-xs text-slate-400">
                    {totalEquipment > 0
                      ? `${Math.round(((totalEquipment - (equipUtilData[0]?.value ?? 0)) / totalEquipment) * 100)}% utilization rate`
                      : '—'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Pending Damage Verification ── */}
      {pendingDamageReports.length > 0 && (
        <Card id="damage-section" className="border-amber-200 bg-amber-50/30 shadow-none">
          <CardHeader className="pb-3 pt-5 px-5">
            <SectionLabel
              title={
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Pending Damage Verification
                </span>
              }
              action={
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  {pendingDamageReports.length} pending
                </span>
              }
            />
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-amber-100">
              {pendingDamageReports.slice(0, 5).map((item) => (
                <div key={item.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.equipment_name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Borrower: {item.borrower_name}</p>
                    {item.damage_details && (
                      <p className="mt-1.5 text-sm text-slate-600">{item.damage_details}</p>
                    )}
                    {item.damage_image_url && (
                      <a
                        href={`http://localhost:3000${item.damage_image_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                      >
                        View damage image →
                      </a>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      className="h-7 bg-emerald-600 px-3 text-xs hover:bg-emerald-700"
                      disabled={verifyDamageMutation.isPending}
                      onClick={() => verifyDamageMutation.mutate({ id: item.id, action: 'verify' })}
                    >
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs"
                      disabled={verifyDamageMutation.isPending}
                      onClick={() => verifyDamageMutation.mutate({ id: item.id, action: 'reject' })}
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

      {/* ── Recent Requests ── */}
      <Card className="border-slate-200 shadow-none">
        <CardHeader className="pb-3 pt-5 px-5">
          <SectionLabel
            title="Recent Requests"
            description="Latest borrow activity across all users"
            action={
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2 text-xs text-slate-500 hover:text-slate-700"
                onClick={() => navigate('/all-requests')}
              >
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            }
          />
        </CardHeader>
        <CardContent className="p-0">
          {allRequests.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No requests yet.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {allRequests.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{request.equipment_name}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {t('student_label')}: {request.student_email}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                      STATUS_BADGE_CLASS[request.status] ?? 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {String(request.status ?? '').replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}