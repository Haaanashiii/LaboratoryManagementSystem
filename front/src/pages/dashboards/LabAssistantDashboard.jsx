import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, Clock, History, FileText } from 'lucide-react';
import { EquipmentStatsChart } from '@/components/layouts/Charts';
import { useLang } from '@/components/i18n/LangContext';

export default function LabAssistantDashboard() {
  const navigate = useNavigate();
  const { t } = useLang();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: allRequests = [] } = useQuery({
    queryKey: ['allRequests'],
    queryFn: () => api.entities.BorrowRequest.list(),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.entities.Equipment.list(),
  });

  // Function to get greeting based on time of day
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 18) return t('goodAfternoon');
    return t('goodEvening');
  };

  const readyForPrep = allRequests.filter(r => r.status === 'head_approved');
  const readyForPickup = allRequests.filter(r => r.status === 'ready_pickup');
  const borrowed = allRequests.filter(r => r.status === 'borrowed');
  const toReturn = borrowed.length;

  const stats = [
    { 
      name: t('readyForPrep'), 
      value: readyForPrep.length, 
      icon: Package,
      color: 'bg-amber-50 text-amber-600',
      action: () => navigate('/equipment-prep')
    },
    { 
      name: t('readyForPickup'), 
      value: readyForPickup.length, 
      icon: CheckCircle,
      color: 'bg-blue-50 text-blue-600',
      action: () => navigate('/equipment-prep')
    },
    { 
      name: t('currentlyBorrowed'), 
      value: borrowed.length, 
      icon: Clock,
      color: 'bg-blue-50 text-blue-600',
      action: () => navigate('/returns')
    },
    { 
      name: t('pendingReturns'), 
      value: toReturn, 
      icon: History,
      color: 'bg-purple-50 text-purple-600',
      action: () => navigate('/returns')
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5 py-4 px-4">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {getTimeGreeting()}, {user?.name?.split(' ')[0] || 'User'}
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
                { label: t('prepareEquipment'), sub: `${readyForPrep.length} ${t('readyForPrep')}`, icon: Package, path: '/equipment-prep' },
                { label: t('processReturns'), sub: `${toReturn} ${t('pendingReturns')}`, icon: History, path: '/returns' },
                { label: t('viewCatalog'), sub: `${equipment.length} ${t('items')}`, icon: CheckCircle, path: '/catalog' },
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

      {/* Bottom row — Equipment Prep Queue + Pending Returns */}
      <div className="grid lg:grid-cols-5 gap-6 items-start">

        {/* Equipment Prep Queue */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-700">{t('equipmentPrepQueue')}</h2>
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate('/equipment-prep')}>
              {t('viewAll')}
            </Button>
          </div>
          <Card className="border-slate-200 shadow-none">
            <CardContent className="p-0">
              {readyForPrep.length > 0 ? (
                <div className="space-y-0">
                  {readyForPrep.slice(0, 5).map((request, i, arr) => (
                    <div key={request.id}>
                      <div className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="font-medium text-sm text-slate-900">{request.equipment_name}</p>
                          <p className="text-xs text-slate-500">{t('student_label')}: {request.student_email}</p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                          READY
                        </span>
                      </div>
                      {i < arr.length - 1 && <hr className="border-slate-100 mx-4" />}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">{t('noPrepQueue')}</p>
                  <p className="text-xs text-slate-400">{t('noPrepQueueDesc')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Equipment Currently Out */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-700">{t('equipmentCurrentlyOut')}</h2>
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate('/returns')}>
              {t('viewAll')}
            </Button>
          </div>
          <Card className="border-slate-200 shadow-none">
            <CardContent className="p-0">
              {borrowed.length > 0 ? (
                <div className="space-y-0">
                  {borrowed.slice(0, 5).map((request, i, arr) => (
                    <div key={request.id}>
                      <div className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="font-medium text-sm text-slate-900">{request.equipment_name}</p>
                          <p className="text-xs text-slate-500">{t('student_label')}: {request.student_email}</p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          BORROWED
                        </span>
                      </div>
                      {i < arr.length - 1 && <hr className="border-slate-100 mx-4" />}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">{t('noBorrowed')}</p>
                  <p className="text-xs text-slate-400">{t('noBorrowedDesc')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
