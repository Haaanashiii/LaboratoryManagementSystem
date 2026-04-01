import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Package, FileText, CheckCircle, Clock, ShieldCheck, Settings, ArrowRight } from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';
import { CATALOG_ROUTES_BY_ROLE } from '@/utils/roleCatalogRoutes';

const statusClassMap = {
  borrowed: 'bg-green-100 text-green-800',
  head_approved: 'bg-blue-100 text-blue-800',
  ready_pickup: 'bg-blue-100 text-blue-800',
  pending_lecturer: 'bg-amber-100 text-amber-800',
  pending_head: 'bg-amber-100 text-amber-800',
  returned: 'bg-slate-100 text-slate-700',
  rejected: 'bg-rose-100 text-rose-700',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLang();

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

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 18) return t('goodAfternoon');
    return t('goodEvening');
  };

  const totalUsers = users.length;
  const totalEquipment = equipment.length;
  const availableEquipment = equipment.filter((item) => item.available > 0).length;
  const activeRequests = allRequests.filter((item) => item.status !== 'returned' && item.status !== 'rejected').length;

  const stats = [
    { name: t('totalUsers'), value: totalUsers, icon: Users, action: () => navigate('/users') },
    { name: t('totalEquipment'), value: totalEquipment, icon: Package, action: () => navigate('/inventory') },
    { name: t('availableEquipment'), value: availableEquipment, icon: CheckCircle, action: () => navigate(CATALOG_ROUTES_BY_ROLE.admin) },
    { name: t('activeRequests'), value: activeRequests, icon: FileText, action: () => navigate('/all-requests') },
  ];

  const quickActions = [
    { label: t('manageUsers'), subtitle: `${totalUsers} ${t('users')}`, icon: Users, path: '/users' },
    { label: t('manageInventory'), subtitle: `${totalEquipment} ${t('items')}`, icon: Package, path: '/inventory' },
    { label: 'Audit Logs', subtitle: 'Security activity', icon: ShieldCheck, path: '/admin-audit-logs' },
    { label: t('systemSettings'), subtitle: t('configuration'), icon: Settings, path: '/settings' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-4 px-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {getTimeGreeting()}, {currentUser?.name?.split(' ')[0] || 'Admin'}
        </h1>
        <p className="mt-2 text-slate-600">Admin control center with only the essentials.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <button
            key={stat.name}
            onClick={stat.action}
            className="rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-400 hover:bg-slate-50"
          >
            <div className="mb-3 flex items-center justify-between">
              <stat.icon className="h-4 w-4 text-slate-500" />
            </div>
            <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
            <p className="mt-1 text-xs text-slate-500">{stat.name}</p>
          </button>
        ))}
      </div>

      <Card className="border-slate-200 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-slate-800">Pending Damage Verification</CardTitle>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {pendingDamageReports.length} pending
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {pendingDamageReports.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No pending damage reports.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingDamageReports.slice(0, 8).map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{item.equipment_name}</p>
                      <p className="text-xs text-slate-500">Borrower: {item.borrower_name}</p>
                      {item.damage_details && <p className="mt-2 text-sm text-slate-600">{item.damage_details}</p>}
                      {item.damage_image_url && (
                        <a
                          href={`http://localhost:3000${item.damage_image_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                        >
                          View uploaded damage image
                        </a>
                      )}
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="border-slate-200 shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base text-slate-800">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-3 text-left transition-colors hover:border-slate-400 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <action.icon className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{action.label}</p>
                    <p className="text-xs text-slate-500">{action.subtitle}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-none lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-slate-800">Recent Requests</CardTitle>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate('/all-requests')}>
                {t('viewAll')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {allRequests.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No requests yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {allRequests.slice(0, 8).map((request) => (
                  <div key={request.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{request.equipment_name}</p>
                      <p className="text-xs text-slate-500">{t('student_label')}: {request.student_email}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClassMap[request.status] || 'bg-slate-100 text-slate-700'}`}>
                      {String(request.status || '').replace(/_/g, ' ').toUpperCase()}
                    </span>
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