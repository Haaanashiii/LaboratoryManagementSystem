import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getStoredToken } from '@/api/apiClient';
import equimonLogo from '@/assets/images/Equimon Logo.png';
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
  Calendar,
  Clock,
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
import { useAuth } from '@/components/hooks/useAuth.js';
import { CATALOG_ROUTES_BY_ROLE } from '@/utils/roleCatalogRoutes';
import { connectNotificationSocket, disconnectNotificationSocket } from '@/lib/socketClient';

// Role-based navigation configuration
const navigationConfig = {
  student: [
    { name: 'dashboard', href: '/dashboard', icon: Home },
    { name: 'equipmentCatalog', href: CATALOG_ROUTES_BY_ROLE.student, icon: Package },
    { name: 'myRequests', href: '/requests', icon: FileText },
    { name: 'myHistory', href: '/approval-history', icon: History },
  ],
  
  lecturer: [
    { name: 'dashboard', href: '/dashboard', icon: Home },
    { name: 'equipmentCatalog', href: CATALOG_ROUTES_BY_ROLE.lecturer, icon: Package },
    { name: 'pendingApprovals', href: '/lecturer-approvals', icon: CheckSquare },
    { name: 'approvalHistory', href: '/approval-history', icon: History },
    { name: 'allRequests', href: '/all-approval-history', icon: BarChart3 },
  ],
  
  head_of_lab: [
    { name: 'dashboard', href: '/dashboard', icon: Home },
    { name: 'equipmentCatalog', href: CATALOG_ROUTES_BY_ROLE.head_of_lab, icon: Package },
    { name: 'finalApprovals', href: '/head-approvals', icon: CheckCircle },
    { name: 'allRequests', href: '/all-requests', icon: BarChart3 },
    { name: 'approvalHistory', href: '/all-approval-history', icon: History },
    { name: 'inventory', href: '/inventory', icon: Package },
  ],
  
  lab_assistant: [
    { name: 'dashboard', href: '/dashboard', icon: Home },
    { name: 'equipmentCatalog', href: CATALOG_ROUTES_BY_ROLE.lab_assistant, icon: Package },
    { name: 'equipmentPrep', href: '/equipment-prep', icon: CheckCircle },
    { name: 'returns', href: '/returns', icon: History },
    { name: 'allRequests', href: '/all-requests', icon: FileText },
  ],
  
  admin: [
    { name: 'dashboard', href: '/dashboard', icon: Home },
    { name: 'users', href: '/users', icon: Users },
    { name: 'inventory', href: '/inventory', icon: Package },
    { name: 'equipmentCatalog', href: CATALOG_ROUTES_BY_ROLE.admin, icon: Package },
    { name: 'allRequests', href: '/all-requests', icon: BarChart3 },
    { name: 'auditLogs', href: '/admin-audit-logs', icon: History },
    { name: 'equipmentPrep', href: '/equipment-prep', icon: CheckCircle },
    { name: 'returns', href: '/returns', icon: History },
    { name: 'settings', href: '/settings', icon: Settings },
  ],
};

const roleColors = {
  student: 'bg-blue-100 text-blue-800',
  lecturer: 'bg-blue-100 text-blue-800',
  head_of_lab: 'bg-purple-100 text-purple-800',
  lab_assistant: 'bg-amber-100 text-amber-800',
  admin: 'bg-red-100 text-red-800',
};

export default function DashboardLayout() {
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang, toggleLang } = useLang();
  const { logout } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  const headerDate = currentDateTime.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  const headerTime = currentDateTime.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  useQuery({
    queryKey: ['notifications', user?.id, user?.role],
    enabled: !!user,
    refetchInterval: 20000,
    queryFn: () => api.notifications.list(),
    onSuccess: (data) => {
      setNotifications(Array.isArray(data) ? data : []);
    }
  });

  useEffect(() => {
    if (!user) {
      disconnectNotificationSocket();
      return undefined;
    }

    const token = getStoredToken();
    const socket = connectNotificationSocket(token);
    if (!socket) {
      return undefined;
    }

    const handleNotificationNew = (incoming) => {
      if (!incoming) {
        return;
      }

      setNotifications((prev) => {
        const incomingId = incoming._id || incoming.id;
        const exists = prev.some((item) => (item._id || item.id) === incomingId);
        if (exists) {
          return prev;
        }

        return [
          {
            ...incoming,
            id: incomingId,
            isRead: Boolean(incoming.isRead)
          },
          ...prev
        ].slice(0, 20);
      });
    };

    const handleNotificationRefresh = () => {
      queryClient.invalidateQueries({
        queryKey: ['notifications', user?.id, user?.role]
      });
    };

    socket.on('notification:new', handleNotificationNew);
    socket.on('notification:refresh', handleNotificationRefresh);

    return () => {
      socket.off('notification:new', handleNotificationNew);
      socket.off('notification:refresh', handleNotificationRefresh);
    };
  }, [queryClient, user]);

  const markNotificationReadMutation = useMutation({
    mutationFn: (id) => api.notifications.markAsRead(id)
  });

  const unreadCount = notifications.filter((item) => item.isRead === false).length;

  const handleNotificationsOpenChange = (open) => {
    setNotificationsOpen(open);
  };

  const handleNotificationClick = async (id) => {
    const selected = notifications.find((item) => (item._id || item.id) === id);
    if (!selected || selected.isRead) {
      return;
    }

    try {
      await markNotificationReadMutation.mutateAsync(id);

      setNotifications((prev) =>
        prev.map((item) =>
          (item._id || item.id) === id ? { ...item, isRead: true } : item
        )
      );
    } catch {
      // Keep UI unchanged if mark-as-read request fails.
    }
  };

  const notificationsBell = (
    <DropdownMenu open={notificationsOpen} onOpenChange={handleNotificationsOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-slate-600" />
          {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>{t('notifications') || 'Notifications'}</span>
          <span className="text-xs font-normal text-slate-500">{notifications.length} items</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="px-3 py-4 text-sm text-slate-500">No notifications yet.</div>
        ) : (
          notifications.map((item) => {
            const isUnread = item.isRead === false;

            return (
              <DropdownMenuItem
                key={item._id || item.id}
                className="items-start gap-2 py-3 cursor-pointer focus:bg-slate-50"
                onClick={() => handleNotificationClick(item._id || item.id)}
              >
                <span className={`mt-1 h-2 w-2 rounded-full ${isUnread ? 'bg-blue-500' : 'bg-slate-300'}`} />
                <div className="flex flex-col">
                  <span className="text-sm text-slate-800 leading-snug">{item.message}</span>
                  <span className="text-xs text-slate-500 mt-1">
                    {item.event_time ? new Date(item.event_time).toLocaleString() : 'Just now'}
                  </span>
                </div>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Get navigation items for current user's role
  const navigation = navigationConfig[user?.role] || navigationConfig.student;

  const handleLogout = async () => {
    await logout();
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
          onLogout={handleLogout}
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
                {notificationsBell}

                {/* Date/Time Display */}
                <div className="flex items-center gap-3 h-auto px-3 py-2 rounded-md border border-slate-200 bg-slate-50">
                  <div className="hidden sm:flex items-center gap-2 text-slate-700">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium">{headerDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-900">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold tabular-nums">{headerTime}</span>
                  </div>
                </div>
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
            <img src={equimonLogo} alt="Equimon Logo" className="w-12 h-12 object-contain" />
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
            {notificationsBell}

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 hover:bg-slate-100">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
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
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
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
