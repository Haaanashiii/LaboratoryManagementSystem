import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { 
  FlaskConical, 
  Package, 
  FileText, 
  CheckCircle, 
  Users, 
  BarChart3, 
  CheckSquare,
  History,
  Menu,
  X,
  Home,
  LogOut,
  Settings
} from 'lucide-react';
import { Button } from './ui/button';

// Role-based navigation configuration
const navigationConfig = {
  student: [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Equipment Catalog', href: '/catalog', icon: Package },
    { name: 'My Requests', href: '/requests', icon: FileText },
    { name: 'Request History', href: '/approval-history', icon: History },
  ],
  
  lecturer: [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Equipment Catalog', href: '/catalog', icon: Package },
    { name: 'Pending Approvals', href: '/lecturer-approvals', icon: CheckSquare },
    { name: 'Approval History', href: '/approval-history', icon: History },
    { name: 'All Approvals', href: '/all-approval-history', icon: BarChart3 },
  ],
  
  head_of_lab: [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Equipment Catalog', href: '/catalog', icon: Package },
    { name: 'Pending Approvals', href: '/head-approvals', icon: CheckCircle },
    { name: 'All Requests', href: '/all-requests', icon: BarChart3 },
    { name: 'Approval History', href: '/all-approval-history', icon: History },
    { name: 'Inventory Overview', href: '/inventory', icon: Package },
  ],
  
  lab_assistant: [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Equipment Catalog', href: '/catalog', icon: Package },
    { name: 'Equipment Prep', href: '/equipment-prep', icon: CheckCircle },
    { name: 'Process Returns', href: '/returns', icon: History },
    { name: 'All Requests', href: '/all-requests', icon: FileText },
  ],
  
  admin: [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'User Management', href: '/users', icon: Users },
    { name: 'Inventory Management', href: '/inventory', icon: Package },
    { name: 'Equipment Catalog', href: '/catalog', icon: Package },
    { name: 'All Requests', href: '/all-requests', icon: BarChart3 },
    { name: 'Equipment Prep', href: '/equipment-prep', icon: CheckCircle },
    { name: 'Process Returns', href: '/returns', icon: History },
    { name: 'System Settings', href: '/settings', icon: Settings },
  ],
};

const roleColors = {
  student: 'bg-emerald-100 text-emerald-800',
  lecturer: 'bg-blue-100 text-blue-800',
  head_of_lab: 'bg-purple-100 text-purple-800',
  lab_assistant: 'bg-amber-100 text-amber-800',
  admin: 'bg-red-100 text-red-800',
};

const roleNames = {
  student: 'Student',
  lecturer: 'Lecturer',
  head_of_lab: 'Head of Lab',
  lab_assistant: 'Lab Assistant',
  admin: 'Administrator',
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  // Get navigation items for current user's role
  const navigation = navigationConfig[user?.role] || navigationConfig.student;

  const handleLogout = async () => {
    await api.auth.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">LabEquip</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User section */}
          <div className="border-t border-slate-200 p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email || 'user@its.ac.id'}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${roleColors[user?.role] || 'bg-slate-100 text-slate-800'}`}>
                    {roleNames[user?.role] || 'User'}
                  </span>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1" />
          
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="sm"
          >
            Home
          </Button>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
