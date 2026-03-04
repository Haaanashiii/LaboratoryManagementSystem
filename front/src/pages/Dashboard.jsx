import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StudentDashboard from './dashboards/StudentDashboard';
import LecturerDashboard from './dashboards/LecturerDashboard';
import HeadDashboard from './dashboards/HeadDashboard';
import LabAssistantDashboard from './dashboards/LabAssistantDashboard';
import AdminDashboard from './dashboards/AdminDashboard';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Route to appropriate dashboard based on user role
  switch (user?.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'head_of_lab':
      return <HeadDashboard />;
    case 'lecturer':
      return <LecturerDashboard />;
    case 'lab_assistant':
      return <LabAssistantDashboard />;
    case 'student':
      return <StudentDashboard />;
    default:
      return <StudentDashboard />;
  }
}
