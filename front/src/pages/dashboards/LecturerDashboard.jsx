import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { format, subDays, parseISO, isValid } from 'date-fns';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CheckSquare, Clock, CheckCircle, History,
  AlertCircle, Package, ArrowRight, ArrowUpRight,
  TrendingUp, BarChart2,
} from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';
import StatusBadge from '@/components/ui/StatusBadge';

// ─── constants ────────────────────────────────────────────────────────────────
const REQUEST_STATUS_COLORS = {
  pending_lecturer: '#f59e0b',
  pending_head:     '#f97316',
  head_approved:    '#3b82f6',
  ready_pickup:     '#2563eb',
  borrowed:         '#22c55e',
  returned:         '#94a3b8',
  rejected:         '#ef4444',
};

const STATUS_LABELS = {
  pending_lecturer: 'Pending Lecturer',
  pending_head:     'Pending Head',
  head_approved:    'Approved',
  ready_pickup:     'Ready Pickup',
  borrowed:         'Borrowed',
  returned:         'Returned',
  rejected:         'Rejected',
};

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
  fontSize: '12px',
  padding: '8px 12px',
};

// ─── helpers ──────────────────────────────────────────────────────────────────
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
          <Icon className="h-4 w-4" style={{ color }} />
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
export default function LecturerDashboard() {
  const navigate = useNavigate();
  const { t } = useLang();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: allRequests = [] } = useQuery({
    queryKey: ['lecturerRequests', user?.email],
    queryFn: () => api.entities.BorrowRequest.filter({ lecturer_email: user?.email }),
    enabled: !!user?.email,
  });

  // ── derived data ──
  const pendingApprovals = React.useMemo(
    () =>
      allRequests
        .filter((r) => r.status === 'pending_lecturer')
        .sort((a, b) => {
          const aRaw = a.created_at ?? a.createdAt;
          const bRaw = b.created_at ?? b.createdAt;
          const aDate = aRaw ? new Date(aRaw) : 0;
          const bDate = bRaw ? new Date(bRaw) : 0;
          return bDate - aDate;
        }),
    [allRequests]
  );

  const approvedByMe = React.useMemo(
    () => allRequests.filter((r) => r.status !== 'pending_lecturer' && r.status !== 'rejected'),
    [allRequests]
  );

  const rejectedByMe = React.useMemo(
    () => allRequests.filter((r) => r.status === 'rejected'),
    [allRequests]
  );

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

  // Area chart: requests per day over last 14 days
  const activityChartData = React.useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i);
      return { date: format(d, 'MMM d'), label: format(d, 'yyyy-MM-dd'), count: 0 };
    });
    allRequests.forEach((req) => {
      const raw = req.created_at ?? req.createdAt;
      if (!raw) return;
      const parsed = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
      if (!isValid(parsed)) return;
      const label = format(parsed, 'yyyy-MM-dd');
      const slot = days.find((d) => d.label === label);
      if (slot) slot.count += 1;
    });
    return days;
  }, [allRequests]);

  // Donut: status distribution of lecturer's requests
  const requestStatusData = React.useMemo(() => {
    const counts = {};
    allRequests.forEach((r) => {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    });
    return Object.entries(STATUS_LABELS)
      .map(([key, label]) => ({
        name: label,
        value: counts[key] ?? 0,
        color: REQUEST_STATUS_COLORS[key],
      }))
      .filter((s) => s.value > 0);
  }, [allRequests]);

  const getTimeGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('goodMorning') || 'Good morning';
    if (h < 18) return t('goodAfternoon') || 'Good afternoon';
    return t('goodEvening') || 'Good evening';
  };

  const approvalRate = totalRequests > 0
    ? Math.round((approvedByMe.length / totalRequests) * 100)
    : 0;

  const rejectionRate = totalRequests > 0
    ? Math.round((rejectedByMe.length / totalRequests) * 100)
    : 0;

  // ── render ──
  return (
    <div className="w-full space-y-5 px-2 py-3">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {getTimeGreeting()},{' '}
            <span className="text-blue-600">
              {user?.full_name?.split(' ')[0] || 'Lecturer'}
            </span>
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Approval overview — {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        {pendingApprovals.length > 0 && (
          <button
            onClick={() => navigate('/lecturer-approvals')}
            className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
          >
            <Clock className="h-3.5 w-3.5" />
            {pendingApprovals.length} pending approval{pendingApprovals.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Pending Approvals"
          value={pendingApprovals.length}
          icon={Clock}
          color="#f59e0b"
          sub={`${recentRequests.filter((r) => r.status === 'pending_lecturer').length} new this week`}
          onClick={() => navigate('/lecturer-approvals')}
        />
        <StatCard
          title="Approved by Me"
          value={approvedByMe.length}
          icon={CheckCircle}
          color="#22c55e"
          sub={`${approvalRate}% approval rate`}
          onClick={() => navigate('/approval-history')}
        />
        <StatCard
          title="Total Requests"
          value={totalRequests}
          icon={CheckSquare}
          color="#2563eb"
          sub={`${recentRequests.length} in last 7 days`}
          onClick={() => navigate('/all-approval-history')}
        />
        <StatCard
          title="Rejected"
          value={rejectedByMe.length}
          icon={AlertCircle}
          color="#ef4444"
          sub={`${rejectionRate}% rejection rate`}
          onClick={() => navigate('/all-approval-history')}
        />
      </div>

      {/* ── Row 1: Activity chart + Status donut ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Approval Activity — Area Chart */}
        <Card className="border-slate-200 shadow-none lg:col-span-2">
          <CardHeader className="px-6 pt-5 pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Approval Activity
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Requests assigned to you over the last 14 days
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
                    <linearGradient id="lecturerActivityGrad" x1="0" y1="0" x2="0" y2="1">
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
                    fill="url(#lecturerActivityGrad)"
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

      {/* ── Row 2: Pending Approvals table + Quick Actions ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Pending Approvals */}
        <Card className="border-slate-200 shadow-none lg:col-span-2">
          <CardHeader className="px-6 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Pending Approvals
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  5 most recent awaiting your decision
                </CardDescription>
              </div>
              {pendingApprovals.length > 0 && (
                <button
                  onClick={() => navigate('/lecturer-approvals')}
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
                          onClick={() => navigate('/lecturer-approvals')}
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

        {/* Quick Actions */}
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="px-6 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900">Quick Actions</CardTitle>
            <CardDescription className="text-xs text-slate-500">Navigate to key pages</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {[
              {
                label: 'Review Pending Requests',
                sub: `${pendingApprovals.length} waiting`,
                icon: CheckSquare,
                color: '#f59e0b',
                path: '/lecturer-approvals',
              },
              {
                label: 'Approval History',
                sub: 'See past decisions',
                icon: History,
                color: '#22c55e',
                path: '/approval-history',
              },
              {
                label: 'All Requests',
                sub: `${totalRequests} total`,
                icon: Package,
                color: '#2563eb',
                path: '/all-approval-history',
              },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="group w-full flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left transition-all duration-200 hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${action.color}18` }}
                  >
                    <action.icon className="h-4 w-4" style={{ color: action.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{action.label}</p>
                    <p className="text-xs text-slate-400">{action.sub}</p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-colors group-hover:text-slate-500" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Recent Activity summary + Recent Requests table ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Recent Activity */}
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="px-6 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900">Recent Activity</CardTitle>
            <CardDescription className="text-xs text-slate-500">Summary snapshot</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-1">
            {[
              { label: 'New Requests',  sub: 'This week',      value: recentRequests.length,     color: '#2563eb' },
              { label: 'Approved',      sub: 'By you',         value: approvedByMe.length,       color: '#22c55e' },
              { label: 'Pending',       sub: 'Awaiting review', value: pendingApprovals.length,  color: '#f59e0b' },
              { label: 'Rejected',      sub: 'Declined',       value: rejectedByMe.length,       color: '#ef4444' },
            ].map((item, i, arr) => (
              <div key={item.label}>
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{item.label}</p>
                      <p className="text-xs text-slate-400">{item.sub}</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold tabular-nums text-slate-900">{item.value}</span>
                </div>
                {i < arr.length - 1 && <hr className="border-slate-100" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Requests */}
        <Card className="border-slate-200 shadow-none lg:col-span-2">
          <CardHeader className="px-6 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">Recent Requests</CardTitle>
                <CardDescription className="text-xs text-slate-500">Last 7 days</CardDescription>
              </div>
              <button
                onClick={() => navigate('/all-approval-history')}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                View all <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {recentRequests.length === 0 ? (
              <div className="flex h-[160px] flex-col items-center justify-center gap-2 text-slate-400">
                <History className="h-7 w-7 opacity-30" />
                <p className="text-sm">No requests in the last 7 days.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100">
                    <TableHead className="pl-6 text-xs font-medium text-slate-500">Equipment</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Student</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Qty</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Date</TableHead>
                    <TableHead className="pr-6 text-xs font-medium text-slate-500">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRequests.slice(0, 8).map((request) => {
                    const raw = request.created_at ?? request.createdAt;
                    const parsed = raw
                      ? (typeof raw === 'string' ? parseISO(raw) : new Date(raw))
                      : null;
                    const dateStr = parsed && isValid(parsed)
                      ? format(parsed, 'MMM d, yyyy')
                      : '—';
                    return (
                      <TableRow key={request.id} className="border-slate-100 hover:bg-slate-50">
                        <TableCell className="pl-6 text-xs font-semibold text-slate-800">
                          {request.equipment_name}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate text-xs text-slate-500">
                          {request.student_email}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">{request.quantity}</TableCell>
                        <TableCell className="text-xs text-slate-400">{dateStr}</TableCell>
                        <TableCell className="pr-6">
                          <StatusBadge status={request.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

      </div>

    </div>
  );
}