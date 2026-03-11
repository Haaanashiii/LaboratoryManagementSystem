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
  Settings,
  Globe,
  Bell,
  ChevronDown
} from 'lucide-react';
import { Button } from './ui/button';
import { MenuFoldOutlined, MenuUnfoldOutlined } from './antd-icons';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from "./ui/dropdown-menu";
import { useLang } from '@/components/i18n/LangContext';
import Sidebar from '@/components/layouts/sidebar';

// Role-based navigation configuration
const navigationConfig = {
  student: [
    { name: 'dashboard', href: '/dashboard', icon: Home },
    { name: 'equipmentCatalog', href: '/catalog', icon: Package },
    { name: 'myRequests', href: '/requests', icon: FileText },
    { name: 'myHistory', href: '/approval-history', icon: History },
  ],
  
  lecturer: [
    { name: 'dashboard', href: '/dashboard', icon: Home },
    { name: 'equipmentCatalog', href: '/catalog', icon: Package },
    { name: 'pendingApprovals', href: '/lecturer-approvals', icon: CheckSquare },
    { name: 'approvalHistory', href: '/approval-history', icon: History },
    { name: 'allRequests', href: '/all-approval-history', icon: BarChart3 },
  ],
  
  head_of_lab: [
    { name: 'dashboard', href: '/dashboard', icon: Home },
    { name: 'equipmentCatalog', href: '/catalog', icon: Package },
    { name: 'finalApprovals', href: '/head-approvals', icon: CheckCircle },
    { name: 'allRequests', href: '/all-requests', icon: BarChart3 },
    { name: 'approvalHistory', href: '/all-approval-history', icon: History },
    { name: 'inventory', href: '/inventory', icon: Package },
  ],
  
  lab_assistant: [
    { name: 'dashboard', href: '/dashboard', icon: Home },
    { name: 'equipmentCatalog', href: '/catalog', icon: Package },
    { name: 'equipmentPrep', href: '/equipment-prep', icon: CheckCircle },
    { name: 'returns', href: '/returns', icon: History },
    { name: 'allRequests', href: '/all-requests', icon: FileText },
  ],
  
  admin: [
    { name: 'dashboard', href: '/dashboard', icon: Home },
    { name: 'users', href: '/users', icon: Users },
    { name: 'inventory', href: '/inventory', icon: Package },
    { name: 'equipmentCatalog', href: '/catalog', icon: Package },
    { name: 'allRequests', href: '/all-requests', icon: BarChart3 },
    { name: 'equipmentPrep', href: '/equipment-prep', icon: CheckCircle },
    { name: 'returns', href: '/returns', icon: History },
    { name: 'settings', href: '/settings', icon: Settings },
  ],
};

const roleColors = {
  student: 'bg-emerald-100 text-emerald-800',
  lecturer: 'bg-blue-100 text-blue-800',
  head_of_lab: 'bg-purple-100 text-purple-800',
  lab_assistant: 'bg-amber-100 text-amber-800',
  admin: 'bg-red-100 text-red-800',
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang, toggleLang } = useLang();

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

  // Determine if current user should use sidebar (all roles except student)
  const useSidebar = user?.role && user.role !== 'student';

  // If using sidebar layout
  if (useSidebar) {
    return (
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        {/* Sidebar Component */}
        <Sidebar 
          user={user} 
          currentPage={location.pathname}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Navbar - Simplified for sidebar layout */}
          <header className="flex-shrink-0 bg-white border-b border-slate-200">
            <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                <Menu className="w-6 h-6 text-slate-600" />
              </Button>

              {/* Sidebar collapse toggle (desktop) */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? <MenuUnfoldOutlined style={{ fontSize: 20 }} /> : <MenuFoldOutlined style={{ fontSize: 20 }} />}
              </button>

              {/* Page title or breadcrumb can go here */}
              <div className="flex-1"></div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-2">
                {/* Language Switcher */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex items-center gap-1 px-3"
                  onClick={toggleLang}
                  title={lang === 'en' ? 'Switch to Indonesian' : 'Switch to English'}
                >
                  <Globe className="w-5 h-5 text-slate-600" />
                  <span className="text-xs font-medium text-slate-600">{lang.toUpperCase()}</span>
                </Button>

                {/* Notification Bell */}
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5 text-slate-600" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                </Button>

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 hover:bg-slate-100">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <span className="hidden md:inline text-sm font-medium text-slate-900">{user?.name}</span>
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer focus:bg-slate-50">
                      <div className="flex items-center gap-3 py-2 w-full">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{user?.name || 'User'}</p>
                          <p className="text-xs text-slate-500 truncate">{user?.email || 'user@its.ac.id'}</p>
                          <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${roleColors[user?.role] || 'bg-slate-100 text-slate-800'}`}>
                            {t(user?.role || 'student')}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                      <Settings className="w-4 h-4 mr-2" />
                      {t('settings')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Main content - Scrollable */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  // Student layout - horizontal navbar
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Menu Dropdown */}
      {sidebarOpen && (
        <div className="fixed top-16 left-0 right-0 z-50 lg:hidden bg-white border-b border-slate-200 shadow-lg">
          <nav className="p-4 space-y-1">
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
                  {t(item.name)}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Header/Navbar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold text-slate-900">Equimon</span>
              <p className="text-xs text-slate-500 leading-none">{t('appSubtitle')}</p>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden ml-2"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 ml-8 flex-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {t(item.name)}
                </Link>
              );
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Language Switcher - Always visible */}
            <Button
              variant="ghost"
              size="icon"
              className="flex items-center gap-1 px-3"
              onClick={toggleLang}
              title={lang === 'en' ? 'Switch to Indonesian' : 'Switch to English'}
            >
              <Globe className="w-5 h-5 text-slate-600" />
              <span className="text-xs font-medium text-slate-600">{lang.toUpperCase()}</span>
            </Button>

            {/* Notification Bell */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
            </Button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 hover:bg-slate-100">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="hidden md:inline text-sm font-medium text-slate-900">{user?.name}</span>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {/* User Info Section - Clickable to navigate to profile */}
                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer focus:bg-slate-50">
                  <div className="flex items-center gap-3 py-2 w-full">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{user?.name || 'User'}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email || 'user@its.ac.id'}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${roleColors[user?.role] || 'bg-slate-100 text-slate-800'}`}>
                        {t(user?.role || 'student')}
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  {t('settings')}
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
