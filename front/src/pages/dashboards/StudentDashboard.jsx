import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, FileText, Clock, CheckCircle } from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { t } = useLang();

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

  const pendingRequests = myRequests.filter(r => r.status === 'pending_lecturer' || r.status === 'pending_head');
  const approvedRequests = myRequests.filter(r => r.status === 'head_approved' || r.status === 'ready_pickup');
  const borrowedEquipment = myRequests.filter(r => r.status === 'borrowed');

  const stats = [
    { 
      name: t('availableEquipment'), 
      value: equipment.filter(e => e.available > 0).length, 
      icon: Package,
      color: 'bg-blue-50 text-blue-600',
      action: () => navigate('/catalog')
    },
    { 
      name: t('myActiveRequests'), 
      value: pendingRequests.length, 
      icon: Clock,
      color: 'bg-amber-50 text-amber-600',
      action: () => navigate('/requests')
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
      icon: FileText,
      color: 'bg-purple-50 text-purple-600',
      action: () => navigate('/requests')
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{t('welcomeBack')}, {user?.name}!</h1>
        <p className="mt-2 text-slate-600">{t('dashboardSubtitle')}</p>
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
          <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('browseEquipmentCatalog')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Button onClick={() => navigate('/catalog')} className="h-auto py-4 flex flex-col gap-2">
              <Package className="w-6 h-6" />
              <span>{t('equipmentCatalog')}</span>
            </Button>
            <Button onClick={() => navigate('/requests')} variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <FileText className="w-6 h-6" />
              <span>{t('myRequests')}</span>
            </Button>
            <Button onClick={() => navigate('/approval-history')} variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <Clock className="w-6 h-6" />
              <span>{t('myHistory')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Requests */}
      {myRequests.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('myRecentRequests')}</h2>
            <div className="space-y-3">
              {myRequests.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium text-slate-900">{request.equipment_name}</p>
                    <p className="text-sm text-slate-500">{t('equipment')}: {request.quantity}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    request.status === 'borrowed' ? 'bg-green-100 text-green-800' :
                    request.status === 'head_approved' || request.status === 'ready_pickup' ? 'bg-blue-100 text-blue-800' :
                    request.status === 'pending_lecturer' || request.status === 'pending_head' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {t(request.status.replace(/_/g, ''))}
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
