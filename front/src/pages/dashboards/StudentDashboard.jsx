import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, FileText, Clock, CheckCircle, ArrowRight, FlaskConical, BookOpen, History } from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';
import StatusBadge from '@/components/ui/StatusBadge';
import EquipmentCard from '@/components/equipment/EquipmentCard';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { t, lang } = useLang();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['myRequests', user?.email],
    queryFn: () => api.entities.BorrowRequest.filter({ student_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.entities.Equipment.list(),
  });

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 18) return t('goodAfternoon');
    return t('goodEvening');
  };

  const getTodayDate = () => {
    const locale = lang === 'id' ? 'id-ID' : 'en-US';
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString(locale, options);
  };

  const pendingRequests = myRequests.filter(r => r.status === 'pending_lecturer' || r.status === 'pending_head');
  const approvedRequests = myRequests.filter(r => r.status === 'head_approved' || r.status === 'ready_pickup');
  const borrowedEquipment = myRequests.filter(r => r.status === 'borrowed');
  const availableCount = equipment.filter(e => e.available > 0).length;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const initials = (user?.full_name || 'U')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const stats = [
    {
      name: t('availableEquipment'),
      value: availableCount,
      icon: Package,
      gradient: 'from-blue-500 to-blue-600',
      lightBg: 'bg-blue-50',
      textColor: 'text-blue-600',
      action: () => navigate('/catalog'),
    },
    {
      name: t('myActiveRequests'),
      value: pendingRequests.length,
      icon: Clock,
      gradient: 'from-amber-400 to-orange-500',
      lightBg: 'bg-amber-50',
      textColor: 'text-amber-600',
      action: () => navigate('/requests'),
    },
    {
      name: t('approvedPrepNeeded'),
      value: approvedRequests.length,
      icon: CheckCircle,
      color: 'bg-emerald-50 text-emerald-600',
      action: () => navigate('/requests')
    },
    {
      name: t('currentlyBorrowed'),
      value: borrowedEquipment.length,
      icon: FlaskConical,
      gradient: 'from-purple-500 to-violet-600',
      lightBg: 'bg-purple-50',
      textColor: 'text-purple-600',
      action: () => navigate('/requests'),
    },
  ];

  const quickActions = [
    {
      title: t('equipmentCatalog'),
      description: 'Browse and request lab equipment',
      icon: Package,
      gradient: 'from-blue-500 to-indigo-600',
      action: () => navigate('/catalog'),
    },
    {
      title: t('myRequests'),
      description: 'Track your borrow requests',
      icon: BookOpen,
      gradient: 'from-emerald-500 to-teal-600',
      action: () => navigate('/requests'),
    },
    {
      title: t('myHistory'),
      description: 'View past request history',
      icon: History,
      gradient: 'from-purple-500 to-pink-600',
      action: () => navigate('/approval-history'),
    },
  ];

  return (
    <div className="space-y-6">

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 p-6 md:p-8 text-white shadow-lg">
        {/* decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/10" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-blue-100 text-sm font-medium mb-1">{getTodayDate()}</p>
            <h1 className="text-2xl md:text-3xl font-bold">
              {getTimeGreeting()}, {user?.full_name?.split(' ')[0] || 'Student'}
            </h1>
            <p className="mt-1 text-blue-100 text-sm">
              You have <span className="font-semibold text-white">{pendingRequests.length}</span> pending request{pendingRequests.length !== 1 ? 's' : ''} awaiting approval.
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm text-2xl font-bold shadow-inner">
            {initials}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <button
            key={stat.name}
            onClick={stat.action}
            className="group text-left rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-sm mb-3`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            <p className="text-sm text-slate-500 mt-0.5 leading-snug">{stat.name}</p>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-3">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={action.action}
              className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 text-left focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <div className={`flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-sm`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{action.title}</p>
                <p className="text-xs text-slate-500 truncate">{action.description}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Equipment Showcase */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-700">Available Equipment</h2>
          <button
            onClick={() => navigate('/catalog')}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
          >
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {equipment.filter(e => (e.available_quantity ?? e.available ?? 0) > 0).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 rounded-2xl border border-slate-100 bg-white text-center">
            <Package className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-slate-400 text-sm">No equipment available right now.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {equipment
              .filter(e => (e.available_quantity ?? e.available ?? 0) > 0)
              .slice(0, 4)
              .map(item => (
                <EquipmentCard
                  key={item._id || item.id}
                  equipment={{
                    ...item,
                    available_quantity: item.available_quantity ?? item.available ?? 0,
                    total_quantity: item.total_quantity ?? item.total ?? 0,
                  }}
                  onBorrow={() => navigate('/catalog')}
                />
              ))}
          </div>
        )}
      </div>

      {/* Recent Requests */}
      <Card className="rounded-2xl border border-slate-100 shadow-sm">
        <CardHeader className="pb-2 pt-5 px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-700">{t('myRecentRequests')}</CardTitle>
            {myRequests.length > 0 && (
              <button
                onClick={() => navigate('/requests')}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-5">
          {myRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm">No requests yet.</p>
              <button
                onClick={() => navigate('/catalog')}
                className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium underline underline-offset-2"
              >
                Browse the equipment catalog
              </button>
            </div>
          ) : (
            <div className="space-y-2 mt-1">
              {myRequests.slice(0, 5).map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <FlaskConical className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{request.equipment_name}</p>
                      <p className="text-xs text-slate-400">
                        Qty: {request.quantity}
                        {request.createdAt && <> &middot; {formatDate(request.createdAt)}</>}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
