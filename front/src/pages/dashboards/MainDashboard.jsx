import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StudentDashboard from './StudentDashboard';
import LecturerDashboard from './LecturerDashboard';
import HeadDashboard from './HeadDashboard';
import LabAssistantDashboard from './LabAssistantDashboard';
import AdminDashboard from './AdminDashboard';

export default function Dashboard() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
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
