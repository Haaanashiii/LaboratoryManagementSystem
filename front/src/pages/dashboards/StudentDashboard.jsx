import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, FileText, Clock, CheckCircle, ArrowRight, FlaskConical, BookOpen, History } from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';
import StatusBadge from '@/components/ui/StatusBadge';
import FeaturedEquipmentCard from '@/components/equipment/FeaturedEquipmentCard';
import { CATALOG_ROUTES_BY_ROLE } from '@/utils/roleCatalogRoutes';

const dashboardStyles = `
  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(14px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .fade-up {
    opacity: 0;
    animation: fadeUp 0.4s ease forwards;
  }

  .fade-up-1 { animation-delay: 0.05s; }
  .fade-up-2 { animation-delay: 0.13s; }
  .fade-up-3 { animation-delay: 0.21s; }
  .fade-up-4 { animation-delay: 0.29s; }
  .fade-up-5 { animation-delay: 0.37s; }

  @keyframes countUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .stat-value {
    animation: countUp 0.5s ease forwards;
    animation-delay: 0.35s;
    opacity: 0;
  }

  @keyframes shimmer {
    from {
      background-position: -1000px 0;
    }
    to {
      background-position: 1000px 0;
    }
  }

  .stat-card {
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    background-size: 1000px 100%;
    opacity: 0;
    transition: opacity 0.3s;
  }

  .stat-card:hover::before {
    animation: shimmer 0.6s ease-in-out;
    opacity: 1;
  }

  .stat-card:hover {
    transform: translateY(-2px);
  }

  .quick-action-card {
    position: relative;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 249, 250, 0.9) 100%);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .quick-action-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  }

  .quick-action-card:active {
    transform: translateY(-1px);
  }

  .animate-slide-right {
    animation: slideRight 0.3s ease-out;
  }

  @keyframes slideRight {
    from {
      transform: translateX(-4px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const catalogRoute = CATALOG_ROUTES_BY_ROLE.student;

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => api.entities.Stats.dashboard(),
    enabled: !!user,
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['myRequests'],
    queryFn: () => api.entities.BorrowRequest.myRequests(),
    enabled: !!user,
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

  const initials = (user?.name || 'U')
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
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      action: () => navigate(catalogRoute),
    },
    {
      name: t('myActiveRequests'),
      value: pendingRequests.length,
      icon: Clock,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      action: () => navigate('/requests'),
    },
    {
      name: t('approvedPrepNeeded'),
      value: approvedRequests.length,
      icon: CheckCircle,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      action: () => navigate('/requests'),
    },
    {
      name: t('currentlyBorrowed'),
      value: borrowedEquipment.length,
      icon: FlaskConical,
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      action: () => navigate('/requests'),
    },
  ];

  const quickActions = [
    {
      title: t('equipmentCatalog'),
      description: 'Browse and request lab equipment',
      icon: Package,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      action: () => navigate(catalogRoute),
    },
    {
      title: t('myRequests'),
      description: 'Track your borrow requests',
      icon: BookOpen,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      action: () => navigate('/requests'),
    },
    {
      title: t('myHistory'),
      description: 'View past request history',
      icon: History,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      action: () => navigate('/approval-history'),
    },
  ];

  const availableEquipment = equipment
    .filter(e => (e.available_quantity ?? e.available ?? 0) > 0)
    .slice(0, 4);

  return (
    <div className="space-y-6 px-0">
      <style>{dashboardStyles}</style>

      {/* Header greeting — clean, no hero banner */}
      <div className="fade-up fade-up-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{getTodayDate()}</p>
          <h1 className="text-2xl font-bold text-slate-900">
            {getTimeGreeting()}, <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">{user?.name?.split(' ')[0] || 'Student'}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">
            {pendingRequests.length > 0
              ? <><span className="inline-flex items-center gap-1.5"><span className="inline-flex w-2 h-2 rounded-full bg-amber-500"></span><span className="font-semibold text-slate-700">{pendingRequests.length}</span> pending request{pendingRequests.length !== 1 ? 's' : ''} awaiting approval.</span></>
              : <><span className="inline-flex items-center gap-1.5"><span className="inline-flex w-2 h-2 rounded-full bg-emerald-500"></span>No pending requests right now.</span></>}
          </p>
        </div>
        <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-base font-bold shadow-lg">
          {initials}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="fade-up fade-up-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => (
          <button
            key={stat.name}
            onClick={stat.action}
            className="stat-card group text-left rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm hover:shadow-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            style={{ animationDelay: `${0.15 + idx * 0.08}s` }}
          >
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${stat.iconBg} mb-4 group-hover:scale-110 transition-transform duration-300`}>
              <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
            </div>
            <p className="text-3xl font-bold text-slate-800 leading-none stat-value">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-2 leading-snug font-medium">{stat.name}</p>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="fade-up fade-up-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {quickActions.map((action, idx) => (
            <button
              key={action.title}
              onClick={action.action}
              className="quick-action-card group flex items-center gap-4 rounded-xl border border-slate-200 px-5 py-4 shadow-sm hover:shadow-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              style={{ animationDelay: `${0.25 + idx * 0.08}s` }}
            >
              <div className={`flex-shrink-0 w-11 h-11 rounded-lg ${action.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                <action.icon className={`w-5 h-5 ${action.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-semibold text-slate-800 text-sm">{action.title}</p>
                <p className="text-xs text-slate-400 truncate">{action.description}</p>
              </div>
              <div className="animate-slide-right">
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Equipment Showcase */}
      <div className="fade-up fade-up-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Featured Equipment</h2>
          <button
            onClick={() => navigate(catalogRoute)}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1.5 transition-all hover:gap-2"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {availableEquipment.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
            <Package className="w-8 h-8 text-slate-300 mb-2.5" />
            <p className="text-slate-500 text-sm font-medium">No equipment available right now.</p>
            <p className="text-xs text-slate-400 mt-1">Check back soon for new additions.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {availableEquipment.map((item, idx) => (
              <div key={item._id || item.id} style={{ animationDelay: `${0.35 + idx * 0.06}s` }} className="fade-up">
                <FeaturedEquipmentCard
                  equipment={item}
                  onClick={() => navigate(catalogRoute)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Requests */}
      <Card className="fade-up fade-up-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardHeader className="pb-4 pt-6 px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t('myRecentRequests')}</CardTitle>
            {myRequests.length > 0 && (
              <button
                onClick={() => navigate('/requests')}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1.5 transition-all hover:gap-2"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {myRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                <FileText className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-slate-600 text-sm font-medium">No requests yet.</p>
              <p className="text-xs text-slate-400 mt-1">Start by browsing the equipment catalog.</p>
              <button
                onClick={() => navigate(catalogRoute)}
                className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors"
              >
                Browse Equipment →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {myRequests.slice(0, 5).map((request, idx) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors duration-200"
                  style={{ animationDelay: `${0.45 + idx * 0.05}s` }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center flex-shrink-0 border border-slate-100">
                      <FlaskConical className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm truncate">{request.equipment_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Qty: <span className="font-medium text-slate-600">{request.quantity}</span>
                        {request.createdAt && <> • {formatDate(request.createdAt)}</>}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <StatusBadge status={request.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
