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
  Clock, CheckCircle, TrendingUp,
  AlertCircle, Package, ArrowRight, ArrowUpRight,
  BarChart2, Sun, Sunset, Moon,
} from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';
import StatusBadge from '@/components/ui/StatusBadge';
import EquimonStatCard from '@/components/ui/equimon/EquimonStatCard';
import EquimonGreetingHeader from '@/components/ui/equimon/EquimonGreetingHeader';
import EquimonActionPanel from '@/components/ui/equimon/EquimonActionPanel';

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

const ACTIVITY_CHART_CONFIG = {
  new:      { label: 'New Requests', color: '#2563eb' },
  pending:  { label: 'Pending',      color: '#f59e0b' },
  approved: { label: 'Approved',     color: '#22c55e' },
  rejected: { label: 'Rejected',     color: '#ef4444' },
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function EmptyState({ message }) {
  return (
    <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-slate-400">
      <BarChart2 className="h-8 w-8 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function ApprovalActivityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const meta = {
    'New Requests': { desc: 'Awaiting lecturer review',       color: '#2563eb' },
    Pending:        { desc: 'Awaiting head of lab approval',  color: '#f59e0b' },
    Approved:       { desc: 'Approved and fully processed',   color: '#22c55e' },
    Rejected:       { desc: 'Declined requests',              color: '#ef4444' },
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
export default function LecturerDashboard() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [activityDays, setActivityDays] = React.useState(14);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: allRequests = [] } = useQuery({
    queryKey: ['lecturerRequests', user?.email],
    queryFn: () => api.entities.BorrowRequest.filter({ history: 'true' }),
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

  // Stacked area chart: pending / active / completed over N days
  const activityChartData = React.useMemo(() => {
    const days = Array.from({ length: activityDays }, (_, i) => {
      const d = subDays(new Date(), activityDays - 1 - i);
      return { date: format(d, 'MMM d'), label: format(d, 'yyyy-MM-dd'), new: 0, pending: 0, approved: 0, rejected: 0 };
    });
    allRequests.forEach((req) => {
      const raw = req.created_at ?? req.createdAt;
      if (!raw) return;
      const parsed = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
      if (!isValid(parsed)) return;
      const label = format(parsed, 'yyyy-MM-dd');
      const slot = days.find((d) => d.label === label);
      if (!slot) return;
      if (req.status === 'pending_lecturer') slot.new += 1;
      else if (req.status === 'pending_head') slot.pending += 1;
      else if (['head_approved', 'ready_pickup', 'borrowed', 'returned'].includes(req.status)) slot.approved += 1;
      else if (req.status === 'rejected') slot.rejected += 1;
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
    ? Math.round((approvedByMe.length / totalRequests) * 100)
    : 0;

  const rejectionRate = totalRequests > 0
    ? Math.round((rejectedByMe.length / totalRequests) * 100)
    : 0;

  // ── greeting for EquimonGreetingHeader ──
  const h = new Date().getHours();
  const greetingText = h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
  const greetingIcon = h < 12 ? Sun : h < 18 ? Sunset : Moon;

  // ── render ──
  return (
    <div className="w-full space-y-5 px-2 py-3">

      {/* ── Hero Banner → EquimonGreetingHeader ── */}
      <EquimonGreetingHeader
        accent="#2563eb"
        name={user?.full_name || user?.name || 'Lecturer'}
        greeting={greetingText}
        icon={greetingIcon}
      />

      {/* ── KPI Cards → EquimonStatCard ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <EquimonStatCard
          tint="#fff7ed"
          fg="#ea580c"
          icon={Clock}
          label="Pending Approvals"
          value={pendingApprovals.length}
          sub={`${recentRequests.filter((r) => r.status === 'pending_lecturer').length} new this week`}
          onClick={() => navigate('/lecturer-approvals')}
        />
        <EquimonStatCard
          tint="#eff6ff"
          fg="#2563eb"
          icon={CheckCircle}
          label="Approved by Me"
          value={approvedByMe.length}
          sub={`${approvalRate}% approval rate`}
          onClick={() => navigate('/approval-history')}
        />
        <EquimonStatCard
          tint="#ecfdf5"
          fg="#059669"
          icon={Package}
          label="Total Requests"
          value={totalRequests}
          sub={`${recentRequests.length} in last 7 days`}
          onClick={() => navigate('/all-approval-history')}
        />
        <EquimonStatCard
          tint="#fef2f2"
          fg="#dc2626"
          icon={AlertCircle}
          label="Rejected"
          value={rejectedByMe.length}
          sub={`${rejectionRate}% rejection rate`}
          onClick={() => navigate('/all-approval-history')}
        />
      </div>

      {/* ── Action Panel ── */}
      <EquimonActionPanel
        accent="#2563eb"
        items={pendingApprovals.slice(0, 3).map((r) => ({
          icon: CheckCircle,
          color: '#2563eb',
          title: 'Pending approval',
          desc: `${r.equipment_name} ×${r.quantity || ''} — ${r.borrower_name || r.student_email || ''}`,
          onClick: () => navigate('/lecturer-approvals'),
        }))}
      />

      {/* ── Pending Approvals Table (full width) ── */}
      <Card className="rounded-2xl border border-slate-200/70 bg-white shadow-sm">
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
                <TableRow className="border-slate-100 bg-slate-50/70">
                  <TableHead className="pl-6 text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">Equipment</TableHead>
                  <TableHead className="text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">Student</TableHead>
                  <TableHead className="text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">Qty</TableHead>
                  <TableHead className="pr-6 text-right text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingApprovals.slice(0, 5).map((request) => (
                  <TableRow key={request.id} className="border-slate-100 hover:bg-slate-50/60">
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

      {/* ── Row: Activity chart + Recent Activity ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Approval Activity — Stacked Area Chart */}
        <Card className="rounded-2xl border border-slate-200/70 bg-white shadow-sm lg:col-span-2">
          <CardHeader className="px-6 pt-5 pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Approval Activity
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Requests assigned to you over the last {activityDays} days
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
            {activityChartData.every((d) => d.new === 0 && d.pending === 0 && d.approved === 0 && d.rejected === 0) ? (
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
                    <Tooltip content={<ApprovalActivityTooltip />} />
                    <Area type="monotone" dataKey="rejected" name="Rejected" stackId="a" stroke="#ef4444" strokeWidth={1.5} fill="#ef4444" fillOpacity={0.15} dot={false} />
                    <Area type="monotone" dataKey="approved" name="Approved" stackId="a" stroke="#22c55e" strokeWidth={1.5} fill="#22c55e" fillOpacity={0.2} dot={false} />
                    <Area type="monotone" dataKey="pending" name="Pending" stackId="a" stroke="#f59e0b" strokeWidth={1.5} fill="#f59e0b" fillOpacity={0.2} dot={false} />
                    <Area type="monotone" dataKey="new" name="New Requests" stackId="a" stroke="#2563eb" strokeWidth={1.5} fill="#2563eb" fillOpacity={0.25} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="mt-3 flex items-center gap-5 text-xs text-slate-500">
                  {[ACTIVITY_CHART_CONFIG.new, ACTIVITY_CHART_CONFIG.pending, ACTIVITY_CHART_CONFIG.approved, ACTIVITY_CHART_CONFIG.rejected].map(({ label, color }) => (
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

        {/* Recent Activity — 2×2 grid */}
        <Card className="rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <CardHeader className="px-6 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900">Recent Activity</CardTitle>
            <CardDescription className="text-xs text-slate-500">Summary snapshot</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'New Requests',  sub: 'This week',       value: recentRequests.length,   color: '#2563eb', icon: TrendingUp  },
                { label: 'Approved',      sub: 'By you',          value: approvedByMe.length,     color: '#22c55e', icon: CheckCircle },
                { label: 'Pending',       sub: 'Awaiting review', value: pendingApprovals.length, color: '#f59e0b', icon: Clock       },
                { label: 'Rejected',      sub: 'Declined',        value: rejectedByMe.length,     color: '#ef4444', icon: AlertCircle },
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
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
