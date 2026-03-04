import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Package, BarChart3, Settings, FileText, CheckCircle } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const { data: user } = useQuery({
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

  const totalUsers = users.length;
  const totalEquipment = equipment.length;
  const availableEquipment = equipment.filter(e => e.available > 0).length;
  const activeRequests = allRequests.filter(r => 
    r.status !== 'returned' && r.status !== 'rejected'
  ).length;

  const stats = [
    { 
      name: 'Total Users', 
      value: totalUsers, 
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      action: () => navigate('/users')
    },
    { 
      name: 'Total Equipment', 
      value: totalEquipment, 
      icon: Package,
      color: 'bg-emerald-50 text-emerald-600',
      action: () => navigate('/inventory')
    },
    { 
      name: 'Available Equipment', 
      value: availableEquipment, 
      icon: CheckCircle,
      color: 'bg-purple-50 text-purple-600',
      action: () => navigate('/catalog')
    },
    { 
      name: 'Active Requests', 
      value: activeRequests, 
      icon: FileText,
      color: 'bg-amber-50 text-amber-600',
      action: () => navigate('/all-requests')
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">System Administrator Dashboard</h1>
        <p className="mt-2 text-slate-600">Manage users, equipment inventory, and system settings.</p>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button onClick={() => navigate('/users')} className="h-auto py-4 flex flex-col gap-2">
              <Users className="w-6 h-6" />
              <span>Manage Users</span>
            </Button>
            <Button onClick={() => navigate('/inventory')} variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <Package className="w-6 h-6" />
              <span>Manage Inventory</span>
            </Button>
            <Button onClick={() => navigate('/all-requests')} variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <BarChart3 className="w-6 h-6" />
              <span>View All Requests</span>
            </Button>
            <Button onClick={() => navigate('/settings')} variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <Settings className="w-6 h-6" />
              <span>System Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">User Distribution</h2>
            <div className="space-y-3">
              {['admin', 'head_of_lab', 'lecturer', 'lab_assistant', 'student'].map((role) => {
                const roleUsers = users.filter(u => u.role === role);
                const roleNames = {
                  admin: 'Administrators',
                  head_of_lab: 'Head of Lab',
                  lecturer: 'Lecturers',
                  lab_assistant: 'Lab Assistants',
                  student: 'Students',
                };
                return (
                  <div key={role} className="flex items-center justify-between py-2">
                    <span className="text-slate-700">{roleNames[role]}</span>
                    <span className="text-lg font-semibold text-slate-900">{roleUsers.length}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Equipment Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-700">Total Equipment</span>
                <span className="text-lg font-semibold text-slate-900">{totalEquipment}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-700">Available</span>
                <span className="text-lg font-semibold text-emerald-600">{availableEquipment}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-700">Total Quantity</span>
                <span className="text-lg font-semibold text-slate-900">
                  {equipment.reduce((sum, e) => sum + (e.quantity || 0), 0)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-700">Available Units</span>
                <span className="text-lg font-semibold text-blue-600">
                  {equipment.reduce((sum, e) => sum + (e.available || 0), 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {allRequests.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Recent Requests</h2>
              <Button onClick={() => navigate('/all-requests')} variant="link" size="sm">
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {allRequests.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium text-slate-900">{request.equipment_name}</p>
                    <p className="text-sm text-slate-500">Student: {request.student_email}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    request.status === 'borrowed' ? 'bg-green-100 text-green-800' :
                    request.status === 'head_approved' || request.status === 'ready_pickup' ? 'bg-blue-100 text-blue-800' :
                    request.status === 'pending_lecturer' || request.status === 'pending_head' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {request.status.replace(/_/g, ' ').toUpperCase()}
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
