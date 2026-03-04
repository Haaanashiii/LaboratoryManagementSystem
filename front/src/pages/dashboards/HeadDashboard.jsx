import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, BarChart3, Package } from 'lucide-react';

export default function HeadDashboard() {
  const navigate = useNavigate();

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

  const pendingApprovals = allRequests.filter(r => r.status === 'pending_head');
  const approvedRequests = allRequests.filter(r => r.status === 'head_approved' || r.status === 'ready_pickup' || r.status === 'borrowed');
  const totalEquipment = equipment.length;
  const availableEquipment = equipment.filter(e => e.available > 0).length;

  const stats = [
    { 
      name: 'Pending Final Approval', 
      value: pendingApprovals.length, 
      icon: Clock,
      color: 'bg-amber-50 text-amber-600',
      action: () => navigate('/head-approvals')
    },
    { 
      name: 'Approved Requests', 
      value: approvedRequests.length, 
      icon: CheckCircle,
      color: 'bg-emerald-50 text-emerald-600',
      action: () => navigate('/all-approval-history')
    },
    { 
      name: 'Total Equipment', 
      value: totalEquipment, 
      icon: Package,
      color: 'bg-blue-50 text-blue-600',
      action: () => navigate('/inventory')
    },
    { 
      name: 'Available Equipment', 
      value: availableEquipment, 
      icon: BarChart3,
      color: 'bg-purple-50 text-purple-600',
      action: () => navigate('/catalog')
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Head of Laboratory Dashboard</h1>
        <p className="mt-2 text-slate-600">Monitor equipment usage and provide final approval for borrowing requests.</p>
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
            <Button onClick={() => navigate('/head-approvals')} className="h-auto py-4 flex flex-col gap-2">
              <CheckCircle className="w-6 h-6" />
              <span>Review Pending Approvals</span>
            </Button>
            <Button onClick={() => navigate('/all-requests')} variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <BarChart3 className="w-6 h-6" />
              <span>View All Requests</span>
            </Button>
            <Button onClick={() => navigate('/inventory')} variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <Package className="w-6 h-6" />
              <span>Inventory Overview</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Requests Awaiting Final Approval</h2>
              <Button onClick={() => navigate('/head-approvals')} variant="link" size="sm">
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {pendingApprovals.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium text-slate-900">{request.equipment_name}</p>
                    <p className="text-sm text-slate-500">Student: {request.student_email}</p>
                    <p className="text-sm text-slate-500">Verified by: {request.lecturer_email}</p>
                  </div>
                  <Button onClick={() => navigate('/head-approvals')} size="sm">
                    Review
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
