import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckSquare, Clock, CheckCircle, History } from 'lucide-react';

export default function LecturerDashboard() {
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: allRequests = [] } = useQuery({
    queryKey: ['lecturerRequests', user?.email],
    queryFn: () => api.entities.BorrowRequest.filter({ lecturer_email: user?.email }),
    enabled: !!user?.email,
  });

  const pendingApprovals = allRequests.filter(r => r.status === 'pending_lecturer');
  const approvedByMe = allRequests.filter(r => r.status !== 'pending_lecturer' && r.status !== 'rejected');
  const totalRequests = allRequests.length;

  const stats = [
    { 
      name: 'Pending Approvals', 
      value: pendingApprovals.length, 
      icon: Clock,
      color: 'bg-amber-50 text-amber-600',
      action: () => navigate('/lecturer-approvals')
    },
    { 
      name: 'Approved by Me', 
      value: approvedByMe.length, 
      icon: CheckCircle,
      color: 'bg-emerald-50 text-emerald-600',
      action: () => navigate('/approval-history')
    },
    { 
      name: 'Total Requests', 
      value: totalRequests, 
      icon: CheckSquare,
      color: 'bg-blue-50 text-blue-600',
      action: () => navigate('/all-approval-history')
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Welcome, {user?.name}!</h1>
        <p className="mt-2 text-slate-600">Review and approve student equipment borrowing requests.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Button onClick={() => navigate('/lecturer-approvals')} className="h-auto py-4 flex flex-col gap-2">
              <CheckSquare className="w-6 h-6" />
              <span>Review Pending Requests</span>
            </Button>
            <Button onClick={() => navigate('/approval-history')} variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <History className="w-6 h-6" />
              <span>View Approval History</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Pending Requests */}
      {pendingApprovals.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Pending Approvals</h2>
              <Button onClick={() => navigate('/lecturer-approvals')} variant="link" size="sm">
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {pendingApprovals.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium text-slate-900">{request.equipment_name}</p>
                    <p className="text-sm text-slate-500">Student: {request.student_email}</p>
                    <p className="text-sm text-slate-500">Quantity: {request.quantity}</p>
                  </div>
                  <Button onClick={() => navigate('/lecturer-approvals')} size="sm">
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
