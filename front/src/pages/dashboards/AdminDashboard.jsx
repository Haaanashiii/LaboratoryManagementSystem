import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Package, BarChart3, Settings, FileText, CheckCircle, ShieldCheck, Clock } from 'lucide-react';
import { UserDistributionChart, EquipmentStatsChart } from '@/components/layouts/Charts';
import { useLang } from '@/components/i18n/LangContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend
} from 'recharts';

const toIsoWeekLabel = (dateValue) => {
  const date = new Date(dateValue);
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const groupClientBorrowingTrends = (requests, groupBy) => {
  const grouped = requests.reduce((acc, request) => {
    const createdAt = new Date(request.createdAt || request.created_date || Date.now());
    let label;

    if (groupBy === 'week') {
      label = toIsoWeekLabel(createdAt);
    } else if (groupBy === 'month') {
      label = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
    } else {
      label = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(createdAt.getDate()).padStart(2, '0')}`;
    }

    if (!acc[label]) {
      acc[label] = {
        label,
        total_requests: 0,
        approved_requests: 0,
        rejected_requests: 0,
      };
    }

    acc[label].total_requests += 1;

    if (['head_approved', 'ready_pickup', 'borrowed', 'returned'].includes(request.status)) {
      acc[label].approved_requests += 1;
    }

    if (request.status === 'rejected') {
      acc[label].rejected_requests += 1;
    }

    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => a.label.localeCompare(b.label));
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [trendGroupBy, setTrendGroupBy] = React.useState('day');

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

  const { data: mostBorrowed = [] } = useQuery({
    queryKey: ['adminMostBorrowed'],
    queryFn: () => api.entities.Stats.adminMostBorrowed(8),
  });

  const { data: lateReturnUsers = [] } = useQuery({
    queryKey: ['adminLateReturnUsers'],
    queryFn: () => api.entities.Stats.adminLateReturnUsers(8),
  });

  const { data: borrowingTrends = [], isError: borrowingTrendsError } = useQuery({
    queryKey: ['adminBorrowingTrends', trendGroupBy],
    queryFn: () => api.entities.Stats.adminBorrowingTrends({ groupBy: trendGroupBy, period: 120 }),
  });

  const fallbackBorrowingTrends = React.useMemo(
    () => groupClientBorrowingTrends(allRequests, trendGroupBy),
    [allRequests, trendGroupBy]
  );

  const displayBorrowingTrends = borrowingTrends.length > 0 ? borrowingTrends : fallbackBorrowingTrends;

  const pendingDamageReports = React.useMemo(
    () => allRequests.filter((item) => item.return_condition === 'Damaged' && item.damage_status === 'pending_verification'),
    [allRequests]
  );

  const verifyDamageMutation = useMutation({
    mutationFn: ({ id, action }) => api.entities.BorrowRequest.verifyDamage(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allRequests'] });
    }
  });

  // Function to get greeting based on time of day
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 18) return t('goodAfternoon');
    return t('goodEvening');
  };

  const totalUsers = users.length;
  const totalEquipment = equipment.length;
  const availableEquipment = equipment.filter(e => e.available > 0).length;
  const activeRequests = allRequests.filter(r => 
    r.status !== 'returned' && r.status !== 'rejected'
  ).length;

  const stats = [
    { 
      name: t('totalUsers'), 
      value: totalUsers, 
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      action: () => navigate('/users')
    },
    { 
      name: t('totalEquipment'), 
      value: totalEquipment, 
      icon: Package,
      color: 'bg-blue-50 text-blue-600',
      action: () => navigate('/inventory')
    },
    { 
      name: t('availableEquipment'), 
      value: availableEquipment, 
      icon: CheckCircle,
      color: 'bg-purple-50 text-purple-600',
      action: () => navigate('/catalog')
    },
    { 
      name: t('activeRequests'), 
      value: activeRequests, 
      icon: FileText,
      color: 'bg-amber-50 text-amber-600',
      action: () => navigate('/all-requests')
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5 py-4 px-4">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {getTimeGreeting()}, {currentUser?.name?.split(' ')[0] || 'User'}
        </h1>
        <p className="mt-2 text-slate-600">{t('dailyReport')}</p>
      </div>

      <hr className="border-slate-200" />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <button
            key={stat.name}
            onClick={stat.action}
            className="text-left p-4 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <stat.icon className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.name}</p>
          </button>
        ))}
      </div>

      {/* Main two-column row */}
      <div className="grid lg:grid-cols-5 gap-6 items-start">

        {/* Left — Equipment Overview chart */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-sm font-medium text-slate-700">{t('equipmentOverview')}</h2>
          <EquipmentStatsChart equipment={equipment} requests={allRequests} />
        </div>

        {/* Right — Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-slate-700">{t('quickActions')}</h2>
            <div className="space-y-2">
              {[
                { label: t('manageUsers'), sub: `${totalUsers} ${t('users')}`, icon: Users, path: '/users' },
                { label: t('manageInventory'), sub: `${totalEquipment} ${t('items')}`, icon: Package, path: '/inventory' },
                { label: t('viewAllRequests'), sub: `${activeRequests} ${t('active')}`, icon: FileText, path: '/all-requests' },
                { label: 'Audit Logs', sub: 'Ghost mode', icon: ShieldCheck, path: '/admin-audit-logs' },
                { label: t('systemSettings'), sub: t('configuration'), icon: Settings, path: '/settings' },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <action.icon className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{action.label}</p>
                      <p className="text-xs text-slate-400">{action.sub}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row — User Distribution + Recent Activity */}
      <div className="grid lg:grid-cols-5 gap-6 items-start">

        {/* User Distribution */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-medium text-slate-700">{t('userDistribution')}</h2>
          <UserDistributionChart users={users} />
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-700">{t('recentRequests')}</h2>
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate('/all-requests')}>
              {t('viewAll')}
            </Button>
          </div>
          <Card className="border-slate-200 shadow-none">
            <CardContent className="p-0">
              {allRequests.length > 0 ? (
                <div className="space-y-0">
                  {allRequests.slice(0, 5).map((request, i, arr) => (
                    <div key={request.id}>
                      <div className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="font-medium text-sm text-slate-900">{request.equipment_name}</p>
                          <p className="text-xs text-slate-500">{t('student_label')}: {request.student_email}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          request.status === 'borrowed' ? 'bg-green-100 text-green-800' :
                          request.status === 'head_approved' || request.status === 'ready_pickup' ? 'bg-blue-100 text-blue-800' :
                          request.status === 'pending_lecturer' || request.status === 'pending_head' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {request.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      {i < arr.length - 1 && <hr className="border-slate-100 mx-4" />}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">{t('noRequests')}</p>
                  <p className="text-xs text-slate-400">{t('noRequestsDesc')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Admin Analytics */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-700">Most Borrowed Items</h2>
          <Card className="border-slate-200 shadow-none">
            <CardContent className="h-72 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mostBorrowed} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="item_name"
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                    height={60}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total_borrow_count" fill="#0ea5e9" name="Borrow Count" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-700">Users With Most Late Returns</h2>
          <Card className="border-slate-200 shadow-none">
            <CardContent className="h-72 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lateReturnUsers} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="borrower_name"
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                    height={60}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="late_return_count" fill="#f97316" name="Late Returns" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700">Borrowing Trends</h2>
          <Select value={trendGroupBy} onValueChange={setTrendGroupBy}>
            <SelectTrigger className="w-44 h-8">
              <SelectValue placeholder="Trend grouping" />
            </SelectTrigger>
            <SelectContent className="min-w-[11rem]">
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Card className="border-slate-200 shadow-none">
          <CardContent className="h-80 p-3">
            {displayBorrowingTrends.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-500">
                No borrowing trend data available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayBorrowingTrends} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total_requests" stroke="#0ea5e9" strokeWidth={2} name="Total" />
                  <Line type="monotone" dataKey="approved_requests" stroke="#16a34a" strokeWidth={2} name="Approved" />
                  <Line type="monotone" dataKey="rejected_requests" stroke="#dc2626" strokeWidth={2} name="Rejected" />
                </LineChart>
              </ResponsiveContainer>
            )}
            {borrowingTrendsError && displayBorrowingTrends.length > 0 && (
              <p className="mt-2 text-xs text-amber-600">
                Showing local fallback trend data because analytics API is unavailable.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Damage verification queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700">Pending Damage Verification</h2>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {pendingDamageReports.length} pending
          </span>
        </div>
        <Card className="border-slate-200 shadow-none">
          <CardContent className="p-0">
            {pendingDamageReports.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No pending damage reports.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingDamageReports.slice(0, 8).map((item) => (
                  <div key={item.id} className="p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{item.equipment_name}</p>
                        <p className="text-xs text-slate-500">Borrower: {item.borrower_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={verifyDamageMutation.isPending}
                          onClick={() => verifyDamageMutation.mutate({ id: item.id, action: 'verify' })}
                        >
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={verifyDamageMutation.isPending}
                          onClick={() => verifyDamageMutation.mutate({ id: item.id, action: 'reject' })}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                    {item.damage_details && <p className="text-sm text-slate-600">{item.damage_details}</p>}
                    {item.damage_image_url && (
                      <a
                        href={`http://localhost:3000${item.damage_image_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View uploaded damage image
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
