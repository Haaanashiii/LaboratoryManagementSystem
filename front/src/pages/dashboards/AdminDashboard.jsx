import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Package, BarChart3, Settings, FileText, CheckCircle } from 'lucide-react';
import { UserDistributionChart, EquipmentStatsChart } from '@/components/layouts/Charts';
import { useLang } from '@/components/i18n/LangContext';

export default function AdminDashboard() {
  const navigate = useNavigate();
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
    </div>
  );
}
