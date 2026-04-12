import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { format, subDays, parseISO, isValid } from 'date-fns';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Clock, CheckCircle, Package, BarChart3,
  ArrowRight, ArrowUpRight, CheckSquare, History,
  Sun, Sunset, Moon, BarChart2,
} from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';
import { CATALOG_ROUTES_BY_ROLE } from '@/utils/roleCatalogRoutes';
import { HeadDashboardSkeleton } from '@/skeleton-framework/head of lab';


// ─── helpers ──────────────────────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, color, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)]"
      style={{ borderColor: `${color}55` }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(130% 90% at 0% 0%, ${color}11 0%, transparent 65%)`,
        }}
      />
      <div className="relative flex items-start justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}14`, boxShadow: `0 0 0 1px ${color}25` }}
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

function RequestActivityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const meta = {
    Pending:  { desc: 'Awaiting your final approval', color: '#f59e0b' },
    Approved: { desc: 'Final approval granted',        color: '#22c55e' },
    Borrowed: { desc: 'Currently borrowed',            color: '#2563eb' },
    Returned: { desc: 'Equipment returned',            color: '#94a3b8' },
  };
  const total = payload.reduce((s, e) => s + (e.value || 0), 0);
  return (
    <div className="min-w-[220px] rounded-xl border border-slate-200 bg-white p-3.5 shadow-xl text-xs">
      <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
        <p className="font-semibold text-slate-700">{label}</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          {total} total
        </span>
      </div>
      {[...payload].reverse().map((entry) => {
        const m = meta[entry.name] ?? {};
        return (
          <div key={entry.name} className="mb-2.5 last:mb-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: m.color ?? entry.color }} />
                <span className="font-semibold text-slate-800">{entry.name}</span>
              </div>
              <span className="font-bold tabular-nums" style={{ color: m.color ?? entry.color }}>
                {entry.value}
              </span>
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
export default function HeadDashboard() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [activityDays, setActivityDays] = React.useState(14);
  const catalogRoute = CATALOG_ROUTES_BY_ROLE.head_of_lab;

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: allRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['allRequests'],
    queryFn: () => api.entities.BorrowRequest.list(),
  });

  const { data: equipment = [], isLoading: equipmentLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.entities.Equipment.list(),
  });

  // ── derived data ──
  const pendingApprovals = React.useMemo(
    () =>
      allRequests
        .filter((r) => r.status === 'pending_head')
        .sort((a, b) => {
          const aRaw = a.created_at ?? a.createdAt;
          const bRaw = b.created_at ?? b.createdAt;
          return new Date(bRaw || 0) - new Date(aRaw || 0);
        }),
    [allRequests]
  );

  const approvedRequests = React.useMemo(
    () => allRequests.filter((r) => ['head_approved', 'ready_pickup', 'borrowed', 'returned'].includes(r.status)),
    [allRequests]
  );

  const totalEquipment = equipment.length;
  const availableEquipment = equipment.filter((e) => e.available > 0).length;
  const totalRequests = allRequests.length;

  const recentRequests = React.useMemo(() => {
    const cutoff = subDays(new Date(), 7);
    return allRequests.filter((r) => {
      const raw = r.created_at ?? r.createdAt;
      if (!raw) return false;
      const d = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
      return isValid(d) && d >= cutoff;
    });
  }, [allRequests]);

  const activityChartData = React.useMemo(() => {
    const days = Array.from({ length: activityDays }, (_, i) => {
      const d = subDays(new Date(), activityDays - 1 - i);
      return { date: format(d, 'MMM d'), label: format(d, 'yyyy-MM-dd'), pending: 0, approved: 0, borrowed: 0, returned: 0 };
    });
    allRequests.forEach((req) => {
      const raw = req.created_at ?? req.createdAt;
      if (!raw) return;
      const parsed = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
      if (!isValid(parsed)) return;
      const lbl = format(parsed, 'yyyy-MM-dd');
      const slot = days.find((d) => d.label === lbl);
      if (!slot) return;
      if (req.status === 'pending_head') slot.pending += 1;
      else if (req.status === 'head_approved' || req.status === 'ready_pickup') slot.approved += 1;
      else if (req.status === 'borrowed') slot.borrowed += 1;
      else if (req.status === 'returned') slot.returned += 1;
    });
    return days;
  }, [allRequests, activityDays]);

  const getGreetingConfig = () => {
    const h = new Date().getHours();
    if (h < 12) return { greeting: t('goodMorning') || 'Good morning',    Icon: Sun,    color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' };
    if (h < 18) return { greeting: t('goodAfternoon') || 'Good afternoon', Icon: Sunset, color: '#f97316', bg: '#fff7ed', border: '#fed7aa' };
    return         { greeting: t('goodEvening') || 'Good evening',         Icon: Moon,   color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' };
  };
  const gc = getGreetingConfig();

  const approvalRate = totalRequests > 0
    ? Math.round((approvedRequests.length / totalRequests) * 100)
    : 0;

  const CHART_CONFIG = [
    { key: 'pending',  label: 'Pending',  color: '#f59e0b' },
    { key: 'approved', label: 'Approved', color: '#22c55e' },
    { key: 'borrowed', label: 'Borrowed', color: '#2563eb' },
    { key: 'returned', label: 'Returned', color: '#94a3b8' },
  ];

  if (requestsLoading || equipmentLoading) return <HeadDashboardSkeleton />;

  return (
    <div className="w-full space-y-5 px-2 py-3">

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
                {user?.full_name?.split(' ')[0] || 'Head of Lab'}
              </span>
            </h1>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title={t('pendingFinalApproval') || 'Pending Final Approval'}
          value={pendingApprovals.length}
          icon={Clock}
          color="#f59e0b"
          sub={`${recentRequests.filter((r) => r.status === 'pending_head').length} new this week`}
          onClick={() => navigate('/head-approvals')}
        />
        <StatCard
          title={t('approvedRequests') || 'Approved Requests'}
          value={approvedRequests.length}
          icon={CheckCircle}
          color="#22c55e"
          sub={`${approvalRate}% approval rate`}
          onClick={() => navigate('/all-approval-history')}
        />
        <StatCard
          title={t('totalEquipment') || 'Total Equipment'}
          value={totalEquipment}
          icon={Package}
          color="#2563eb"
          sub={`${availableEquipment} currently available`}
          onClick={() => navigate('/inventory')}
        />
        <StatCard
          title={t('availableEquipment') || 'Available Equipment'}
          value={availableEquipment}
          icon={BarChart3}
          color="#8b5cf6"
          sub={`${totalEquipment - availableEquipment} in use`}
          onClick={() => navigate(catalogRoute)}
        />
      </div>

      {/* ── Pending Approvals (full width) ── */}
      <Card className="rounded-2xl border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
        <CardHeader className="px-6 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Requests Awaiting Final Approval
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                5 most recent awaiting your decision
              </CardDescription>
            </div>
            {pendingApprovals.length > 0 && (
              <button
                onClick={() => navigate('/head-approvals')}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Review all <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {pendingApprovals.length === 0 ? (
            <div className="flex h-[160px] flex-col items-center justify-center gap-2 text-slate-400">
              <CheckCircle className="h-7 w-7 opacity-30" />
              <p className="text-sm">All caught up! No pending approvals.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="pl-6 text-xs font-medium text-slate-500">Equipment</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">Student</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">Qty</TableHead>
                  <TableHead className="pr-6 text-right text-xs font-medium text-slate-500">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingApprovals.slice(0, 5).map((request) => (
                  <TableRow key={request.id} className="border-slate-100 hover:bg-slate-50">
                    <TableCell className="pl-6 text-xs font-semibold text-slate-800">
                      {request.equipment_name}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-xs text-slate-500">
                      {request.student_email}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{request.quantity}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <button
                        onClick={() => navigate('/head-approvals')}
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                      >
                        Review
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Row: Activity chart + Summary/Quick Actions ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Request Activity — Stacked Area Chart */}
        <Card className="rounded-2xl border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md lg:col-span-2">
          <CardHeader className="px-6 pt-5 pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Request Activity
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  All requests overview over the last {activityDays} days
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
            {activityChartData.every((d) => d.pending === 0 && d.approved === 0 && d.borrowed === 0 && d.returned === 0) ? (
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
                    <Tooltip content={<RequestActivityTooltip />} />
                    <Area type="monotone" dataKey="returned" name="Returned" stackId="a" stroke="#94a3b8" strokeWidth={1.5} fill="#94a3b8" fillOpacity={0.15} dot={false} />
                    <Area type="monotone" dataKey="borrowed" name="Borrowed" stackId="a" stroke="#2563eb" strokeWidth={1.5} fill="#2563eb" fillOpacity={0.2}  dot={false} />
                    <Area type="monotone" dataKey="approved" name="Approved" stackId="a" stroke="#22c55e" strokeWidth={1.5} fill="#22c55e" fillOpacity={0.2}  dot={false} />
                    <Area type="monotone" dataKey="pending"  name="Pending"  stackId="a" stroke="#f59e0b" strokeWidth={1.5} fill="#f59e0b" fillOpacity={0.25} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="mt-3 flex items-center gap-5 text-xs text-slate-500">
                  {CHART_CONFIG.map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                      {label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Summary + Quick Actions */}
        <Card className="rounded-2xl border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
          <CardHeader className="px-6 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900">Summary</CardTitle>
            <CardDescription className="text-xs text-slate-500">Overview snapshot</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'New Requests', sub: 'This week',     value: recentRequests.length,   color: '#2563eb', icon: Package     },
                { label: 'Approved',     sub: 'Final approval', value: approvedRequests.length, color: '#22c55e', icon: CheckCircle },
                { label: 'Pending',      sub: 'Needs review',  value: pendingApprovals.length, color: '#f59e0b', icon: Clock       },
                { label: 'Available',    sub: 'Equipment',      value: availableEquipment,      color: '#8b5cf6', icon: BarChart3   },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5"
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    <item.icon className="h-4 w-4" style={{ color: item.color }} />
                  </div>
                  <div>
                    <p className="text-xl font-bold tabular-nums text-slate-900">{item.value}</p>
                    <p className="text-[11px] font-medium text-slate-600">{item.label}</p>
                    <p className="text-[10px] text-slate-400">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-medium text-slate-500 px-1">Quick Actions</p>
              {[
                { label: 'Review Approvals',   icon: CheckSquare, path: '/head-approvals' },
                { label: 'Approval History',   icon: History,     path: '/all-approval-history' },
                { label: 'Inventory Overview', icon: Package,     path: '/inventory' },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <action.icon className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-xs font-medium text-slate-700">{action.label}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>


    </div>
  );
}
