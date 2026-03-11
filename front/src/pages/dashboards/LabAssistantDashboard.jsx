import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, Clock, History } from 'lucide-react';
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
      color: 'bg-emerald-50 text-emerald-600',
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {getTimeGreeting()}, {user?.full_name || 'User'}
        </h1>
        <p className="mt-2 text-slate-600">{t('labAssistantDailyReport')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={stat.action}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{stat.name}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Button onClick={() => navigate('/equipment-prep')} className="h-auto py-4 flex flex-col gap-2">
              <Package className="w-6 h-6" />
              <span>Prepare Equipment</span>
            </Button>
            <Button onClick={() => navigate('/returns')} variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <History className="w-6 h-6" />
              <span>Process Returns</span>
            </Button>
            <Button onClick={() => navigate('/catalog')} variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <CheckCircle className="w-6 h-6" />
              <span>View Catalog</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Statistics */}
      <EquipmentStatsChart equipment={equipment} requests={allRequests} />

      {/* Equipment Prep Queue */}
      {readyForPrep.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Equipment Preparation Queue</h2>
              <Button onClick={() => navigate('/equipment-prep')} variant="link" size="sm">
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {readyForPrep.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium text-slate-900">{request.equipment_name}</p>
                    <p className="text-sm text-slate-500">Student: {request.student_email}</p>
                    <p className="text-sm text-slate-500">Quantity: {request.quantity}</p>
                  </div>
                  <Button onClick={() => navigate('/equipment-prep')} size="sm">
                    Prepare
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Returns */}
      {borrowed.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Equipment Currently Out</h2>
              <Button onClick={() => navigate('/returns')} variant="link" size="sm">
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {borrowed.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium text-slate-900">{request.equipment_name}</p>
                    <p className="text-sm text-slate-500">Student: {request.student_email}</p>
                    <p className="text-sm text-slate-500">Return Due: {request.return_date}</p>
                  </div>
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    BORROWED
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
