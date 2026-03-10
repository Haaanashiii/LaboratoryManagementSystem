import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckSquare, Clock, CheckCircle, History, AlertCircle, Package, ArrowRight } from 'lucide-react';
import { EquipmentStatsChart } from '@/components/layouts/Charts';
import StatusBadge from '@/components/ui/StatusBadge';

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

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.entities.Equipment.list(),
  });

  const pendingApprovals = allRequests.filter(r => r.status === 'pending_lecturer');
  const approvedByMe = allRequests.filter(r => r.status !== 'pending_lecturer' && r.status !== 'rejected');
  const rejectedByMe = allRequests.filter(r => r.status === 'rejected');
  const totalRequests = allRequests.length;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentRequests = allRequests.filter(r => new Date(r.createdAt) >= sevenDaysAgo);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const stats = [
    { name: 'Pending Approvals', value: pendingApprovals.length, icon: Clock, sub: `${recentRequests.filter(r => r.status === 'pending_lecturer').length} new this week`, action: () => navigate('/lecturer-approvals') },
    { name: 'Approved by Me', value: approvedByMe.length, icon: CheckCircle, sub: `${Math.round((approvedByMe.length / totalRequests) * 100) || 0}% approval rate`, action: () => navigate('/approval-history') },
    { name: 'Total Requests', value: totalRequests, icon: CheckSquare, sub: `${recentRequests.length} in last 7 days`, action: () => navigate('/all-approval-history') },
    { name: 'Rejected', value: rejectedByMe.length, icon: AlertCircle, sub: `${Math.round((rejectedByMe.length / totalRequests) * 100) || 0}% rejection rate`, action: () => navigate('/all-approval-history') },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5 py-4 px-4">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Welcome back, {user?.name}.</h1>
        <p className="mt-0.5 text-sm text-slate-500">Review and approve student equipment borrowing requests.</p>
      </div>

      <hr className="border-slate-200" />

      {/* Stats — 4 cards, unchanged */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <button
            key={stat.name}
            onClick={stat.action}
            className="text-left p-4 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <stat.icon className="w-4 h-4 text-slate-400" />
              {stat.name === 'Pending Approvals' && stat.value > 0 && (
                <span className="text-xs font-medium bg-slate-900 text-white px-1.5 py-0.5 rounded">
                  {stat.value}
                </span>
              )}
            </div>
            <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.name}</p>
            <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
          </button>
        ))}
      </div>

      {/* Main two-column row: Equipment Overview (left) | Pending Approvals + Quick Actions (right) */}
      <div className="grid lg:grid-cols-5 gap-6 items-start">

        {/* Left — Equipment Overview chart */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-sm font-medium text-slate-700">Equipment Overview</h2>
          <EquipmentStatsChart equipment={equipment} requests={allRequests} />
        </div>

        {/* Right — Pending Approvals + Quick Actions stacked */}
        <div className="lg:col-span-2 space-y-6">

          {/* Pending Approval Requests */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-700">Pending Approval Requests</h2>
              {pendingApprovals.length > 0 && (
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate('/lecturer-approvals')}>
                  Review all <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
            <Card className="border-slate-200 shadow-none">
              <CardContent className="p-0">
                {pendingApprovals.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-100">
                        <TableHead className="text-xs font-medium text-slate-500">Equipment</TableHead>
                        <TableHead className="text-xs font-medium text-slate-500">Student</TableHead>
                        <TableHead className="text-xs font-medium text-slate-500">Qty</TableHead>
                        <TableHead className="text-right text-xs font-medium text-slate-500">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingApprovals.slice(0, 5).map((request) => (
                        <TableRow key={request.id} className="border-slate-100 hover:bg-slate-50">
                          <TableCell className="text-sm font-medium text-slate-800">{request.equipment_name}</TableCell>
                          <TableCell className="text-sm text-slate-600 max-w-[120px] truncate">{request.student_email}</TableCell>
                          <TableCell className="text-sm text-slate-600">{request.quantity}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate('/lecturer-approvals')}>
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-10 text-center">
                    <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-600">All caught up!</p>
                    <p className="text-xs text-slate-400">No pending approvals at the moment.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-slate-700">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: 'Review Pending Requests', sub: `${pendingApprovals.length} waiting`, icon: CheckSquare, path: '/lecturer-approvals' },
                { label: 'View Approval History', sub: 'See past decisions', icon: History, path: '/approval-history' },
                { label: 'All Requests', sub: `${totalRequests} total requests`, icon: Package, path: '/all-approval-history' },
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
                  <ArrowRight className="w-4 h-4 text-slate-300" />
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Recent Activity + Recent Requests — one row */}
      <div className="grid lg:grid-cols-5 gap-6 items-start">

        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-medium text-slate-700">Recent Activity</h2>
          <Card className="border-slate-200 shadow-none">
            <CardContent className="p-0">
              {[
                { label: 'New Requests', sub: 'This week', value: recentRequests.length },
                { label: 'Approved', sub: 'By you', value: approvedByMe.length },
                { label: 'Pending', sub: 'Awaiting review', value: pendingApprovals.length },
              ].map((item, i, arr) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{item.label}</p>
                      <p className="text-xs text-slate-400">{item.sub}</p>
                    </div>
                    <span className="text-xl font-semibold text-slate-900">{item.value}</span>
                  </div>
                  {i < arr.length - 1 && <hr className="border-slate-100 mx-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Requests */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-700">Recent Requests</h2>
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate('/all-approval-history')}>
              View all <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <Card className="border-slate-200 shadow-none">
            <CardContent className="p-0">
              {recentRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100">
                      <TableHead className="text-xs font-medium text-slate-500">Equipment</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500">Student</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500">Quantity</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500">Date</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentRequests.slice(0, 10).map((request) => (
                      <TableRow key={request.id} className="border-slate-100 hover:bg-slate-50">
                        <TableCell className="text-sm font-medium text-slate-800">{request.equipment_name}</TableCell>
                        <TableCell className="text-sm text-slate-600">{request.student_email}</TableCell>
                        <TableCell className="text-sm text-slate-600">{request.quantity}</TableCell>
                        <TableCell className="text-sm text-slate-500">{formatDate(request.createdAt || new Date())}</TableCell>
                        <TableCell><StatusBadge status={request.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center">
                  <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">No recent activity</p>
                  <p className="text-xs text-slate-400">No requests in the last 7 days.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

    </div>
  );
}