import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getStoredToken } from '@/api/apiClient';
import itsLogo from '@/assets/images/Tower2.png';
import itsCrest from '@/assets/images/ITSSecond.png';
import { 
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
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  Activity,
  User,
  XCircle,
  ArrowRight,
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
import { useTheme } from '@/components/hooks/ThemeContext';
import { CATALOG_ROUTES_BY_ROLE } from '@/utils/roleCatalogRoutes';
import { connectNotificationSocket, disconnectNotificationSocket } from '@/lib/socketClient';

// Role-based navigation configuration
const navigationConfig = {
  student: [
    { name: 'dashboard', href: '/dashboard', icon: Home },
    { name: 'equipmentCatalog', href: CATALOG_ROUTES_BY_ROLE.student, icon: Package },
    { name: 'myRequests', href: '/requests', icon: FileText },
  ],
  
  lecturer: [
    { name: 'dashboard', href: '/dashboard', icon: Home },
    { name: 'equipmentCatalog', href: CATALOG_ROUTES_BY_ROLE.lecturer, icon: Package },
    { name: 'pendingApprovals', href: '/lecturer-approvals', icon: CheckSquare },
    { name: 'approvalHistory', href: '/lecturer-approval-history', icon: History },
  ],
  
  head_of_lab: [
    { name: 'dashboard', href: '/dashboard', icon: Home },
    { name: 'equipmentCatalog', href: CATALOG_ROUTES_BY_ROLE.head_of_lab, icon: Package },
    { name: 'finalApprovals', href: '/head-approvals', icon: CheckCircle },
    { name: 'allRequests', href: '/all-requests', icon: BarChart3 },
    { name: 'approvalHistory', href: '/head-approval-history', icon: History },
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
    { name: 'allRequests', href: '/all-requests', icon: BarChart3 },
    { name: 'equipmentProcess', href: '/admin-equipment-process', icon: Activity },
    { name: 'auditLogs', href: '/admin-audit-logs', icon: History },
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
  const { logout, user: authUser } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();

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

  const { data: fetchedNotifications } = useQuery({
    queryKey: ['notifications', user?.id, user?.role],
    enabled: !!user,
    refetchInterval: 20000,
    queryFn: () => api.notifications.list(),
  });

  useEffect(() => {
    if (fetchedNotifications) {
      setNotifications(Array.isArray(fetchedNotifications) ? fetchedNotifications : []);
    }
  }, [fetchedNotifications]);

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

    const invalidateRealtimeData = () => {
      queryClient.invalidateQueries({
        queryKey: ['notifications', user?.id, user?.role]
      });

      queryClient.invalidateQueries({
        predicate: (query) => {
          const firstKey = Array.isArray(query.queryKey) ? query.queryKey[0] : query.queryKey;
          return typeof firstKey === 'string' && /(request|approval)/i.test(firstKey);
        }
      });
    };

    const handleEquipmentUpdate = () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const firstKey = Array.isArray(query.queryKey) ? query.queryKey[0] : query.queryKey;
          return typeof firstKey === 'string' && /^equipment/i.test(firstKey);
        }
      });
    };

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

      invalidateRealtimeData();
    };

    const handleNotificationRefresh = () => {
      invalidateRealtimeData();
    };

    socket.on('notification:new', handleNotificationNew);
    socket.on('notification:refresh', handleNotificationRefresh);
    socket.on('equipment:update', handleEquipmentUpdate);

    return () => {
      socket.off('notification:new', handleNotificationNew);
      socket.off('notification:refresh', handleNotificationRefresh);
      socket.off('equipment:update', handleEquipmentUpdate);
    };
  }, [queryClient, user]);

  const markNotificationReadMutation = useMutation({
    mutationFn: (id) => api.notifications.markAsRead(id)
  });

  const markNotificationUnreadMutation = useMutation({
    mutationFn: (id) => api.notifications.markAsUnread(id)
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      const updater = (prev) => Array.isArray(prev) ? prev.map((item) => ({ ...item, isRead: true })) : [];
      setNotifications((prev) => updater(prev));
      queryClient.setQueryData(['notifications', user?.id, user?.role], updater);
    }
  });

  const clearAllMutation = useMutation({
    mutationFn: () => api.notifications.clearAll(),
    onSuccess: () => {
      setNotifications([]);
      queryClient.setQueryData(['notifications', user?.id, user?.role], []);
    }
  });

  const deleteNotifMutation = useMutation({
    mutationFn: (id) => api.notifications.deleteOne(id),
    onSuccess: (_, id) => {
      const updater = (prev) => (Array.isArray(prev) ? prev : []).filter(n => (n._id || n.id) !== id);
      setNotifications(updater);
      queryClient.setQueryData(['notifications', user?.id, user?.role], updater);
    }
  });

  const buildNotifMessage = (item) => {
    if (!item.message_key) return item.message;
    const template = t(item.message_key);
    const params = item.message_params || {};
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? '');
  };

  const unreadCount = notifications.filter((item) => item.isRead === false).length;

  const handleNotificationsOpenChange = (open) => {
    setNotificationsOpen(open);
  };

  const handleNotificationClick = async (id) => {
    const selected = notifications.find((item) => (item._id || item.id) === id);
    if (!selected || selected.isRead) return;

    const markRead = (prev) =>
      (Array.isArray(prev) ? prev : []).map((item) =>
        (item._id || item.id) === id ? { ...item, isRead: true } : item
      );
    const markUnread = (prev) =>
      (Array.isArray(prev) ? prev : []).map((item) =>
        (item._id || item.id) === id ? { ...item, isRead: false } : item
      );
    const notifKey = ['notifications', user?.id, user?.role];

    setNotifications(markRead);
    queryClient.setQueryData(notifKey, markRead);

    try {
      await markNotificationReadMutation.mutateAsync(id);
    } catch {
      setNotifications(markUnread);
      queryClient.setQueryData(notifKey, markUnread);
    }
  };

  const handleMarkUnread = async (e, id) => {
    e.stopPropagation();
    try {
      await markNotificationUnreadMutation.mutateAsync(id);
      const updater = (prev) =>
        (Array.isArray(prev) ? prev : []).map((item) =>
          (item._id || item.id) === id ? { ...item, isRead: false } : item
        );
      setNotifications(updater);
      queryClient.setQueryData(['notifications', user?.id, user?.role], updater);
    } catch {
      // Keep UI unchanged on failure.
    }
  };

  const LIGHT_NOTIF_ROLES = ['head_of_lab', 'lab_assistant', 'admin', 'lecturer'];
  const notifIsDark = isDark && !LIGHT_NOTIF_ROLES.includes(user?.role);

  const getNotifMeta = (item) => {
    const ev = item.event_type || '';
    if (['head_approved', 'returned'].includes(ev))
      return { Icon: CheckCircle, bg: 'rgba(34,197,94,0.15)',  color: '#22c55e' };
    if (ev === 'rejected')
      return { Icon: XCircle,     bg: 'rgba(239,68,68,0.15)',  color: '#ef4444' };
    if (['pending_head', 'borrowed'].includes(ev))
      return { Icon: Clock,       bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' };
    if (ev === 'ready_pickup')
      return { Icon: Package,     bg: 'rgba(20,184,166,0.15)', color: '#14b8a6' };
    if (ev === 'pending_lecturer')
      return { Icon: FileText,    bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' };
    return   { Icon: Bell,        bg: 'rgba(99,102,241,0.15)', color: '#6366f1' };
  };

  const relTimeAgo = (date) => {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d === 1) return 'Yesterday';
    if (d < 7)  return `${d} days ago`;
    return new Date(date).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  };

  const notifViewAllRoute = '/notifications';

  const notificationsBell = (
    <DropdownMenu open={notificationsOpen} onOpenChange={handleNotificationsOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className={`group relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 ${
            notifIsDark
              ? 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        style={{
          background: notifIsDark ? '#1b1b20' : '#ffffff',
          border: notifIsDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.08)',
          boxShadow: notifIsDark
            ? '0 8px 32px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.90)',
          borderRadius: '24px',
          maxWidth: 'calc(100vw - 24px)',
        }}
        className="w-80 p-0 overflow-hidden"
      >
        {/* ── Header ── */}
        <div className={`flex items-center justify-between px-4 py-3.5 border-b ${notifIsDark ? 'border-white/[0.07]' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2.5">
            <Bell className={`w-4 h-4 ${notifIsDark ? 'text-blue-400' : 'text-blue-500'}`} />
            <span className={`text-sm font-bold ${notifIsDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {t('notifications') || 'Notifications'}
            </span>
            {unreadCount > 0 && (
              <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full ${
                notifIsDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
              }`}>
                {unreadCount} new
              </span>
            )}
          </div>
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || unreadCount === 0}
            className={`text-xs font-medium transition-colors ${
              unreadCount === 0
                ? `opacity-30 cursor-not-allowed ${notifIsDark ? 'text-slate-500' : 'text-slate-400'}`
                : notifIsDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            {markAllReadMutation.isPending ? 'Marking…' : 'Mark all read'}
          </button>
        </div>

        {/* ── Notification list ── */}
        <div className="max-h-[380px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-12 gap-2 ${notifIsDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <Bell className="w-8 h-8 opacity-30" />
              <p className="text-sm">{t('noNotificationsYet')}</p>
            </div>
          ) : (
            notifications.slice(0, 5).map((item, idx) => {
              const isUnread = item.isRead === false;
              const itemId = item._id || item.id;
              const { Icon: NIcon, bg: iconBg, color: iconColor } = getNotifMeta(item);
              const visibleCount = Math.min(5, notifications.length);

              return (
                <div
                  key={itemId}
                  onClick={() => handleNotificationClick(itemId)}
                  className={`relative flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors group ${
                    isUnread
                      ? notifIsDark ? 'bg-blue-500/[0.06]' : 'bg-blue-50/50'
                      : notifIsDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
                  } ${idx < visibleCount - 1 ? `border-b ${notifIsDark ? 'border-white/[0.05]' : 'border-slate-100'}` : ''}`}
                >
                  {/* Left unread accent bar */}
                  {isUnread && (
                    <div className="absolute left-0 top-4 bottom-4 w-[3px] bg-blue-500 rounded-r-full" />
                  )}

                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: iconBg }}
                  >
                    <NIcon className="w-4 h-4" style={{ color: iconColor }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <p className={`text-sm font-semibold leading-snug line-clamp-2 ${notifIsDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      {buildNotifMessage(item)}
                    </p>
                    <p className={`text-[11px] mt-1.5 ${notifIsDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {relTimeAgo(item.event_time)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {isUnread && (
                    <div className="absolute right-4 top-4 w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                  )}

                  {/* Delete button — always on hover */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotifMutation.mutate(itemId); }}
                    title="Delete"
                    className={`absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md ${
                      notifIsDark ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Mark as unread — read items, on hover */}
                  {!isUnread && (
                    <button
                      onClick={(e) => handleMarkUnread(e, itemId)}
                      title={t('markAsUnread')}
                      className={`absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                        notifIsDark ? 'text-blue-400 hover:bg-blue-900/40' : 'text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      {t('unread')}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        {notifications.length > 0 && authUser?.role === 'student' && (
          <div className={`border-t px-4 py-3 ${notifIsDark ? 'border-white/[0.07]' : 'border-slate-100'}`}>
            <button
              onClick={() => { setNotificationsOpen(false); navigate(notifViewAllRoute); }}
              className={`flex items-center gap-1.5 mx-auto text-sm font-medium transition-colors ${
                notifIsDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              View all notifications
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Get navigation items for current user's role
  const navigation = navigationConfig[user?.role] || navigationConfig.student;

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
  };

  // Use authUser (from context, already loaded by ProtectedRoute) for role-based
  // layout decisions to prevent a brief flash of the student layout on refresh.
  const resolvedUser = authUser || user;

  // Determine if current user should use sidebar (all roles except student)
  const useSidebar = resolvedUser?.role && resolvedUser.role !== 'student';

  // If using sidebar layout
  if (useSidebar) {
    return (
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        {/* Sidebar Component */}
        <Sidebar 
          user={resolvedUser} 
          currentPage={location.pathname}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onLogout={handleLogout}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Navbar — shadcn style */}
          <header className="flex-shrink-0 h-14 border-b border-slate-200 bg-white px-4 flex items-center gap-2">
            {/* Mobile: open sidebar */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden flex h-8 w-8 items-center justify-center rounded-md text-slate-500"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Desktop: collapse/expand sidebar */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex h-8 w-8 items-center justify-center rounded-md text-slate-400"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed
                ? <MenuUnfoldOutlined style={{ fontSize: 16 }} />
                : <MenuFoldOutlined style={{ fontSize: 16 }} />}
            </button>

            {/* Separator */}
            <div className="hidden lg:block h-5 w-px bg-slate-200" />

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right actions */}
            <div className="flex items-center gap-1">
              {/* Date / time */}
              <div className="hidden sm:flex items-center gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 mr-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {headerDate}
                </span>
                <span className="h-3.5 w-px bg-slate-200" />
                <span className="flex items-center gap-1.5 tabular-nums font-medium text-slate-900">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {headerTime}
                </span>
              </div>

              {/* Language toggle */}
              <button
                onClick={toggleLang}
                title={lang === 'en' ? 'Switch to Indonesian' : 'Switch to English'}
                className="flex h-8 w-auto items-center gap-1 rounded-md px-2.5 text-xs font-medium text-slate-500"
              >
                <Globe className="h-4 w-4" />
                <span>{lang.toUpperCase()}</span>
              </button>

              {/* Notifications */}
              {notificationsBell}
            </div>
          </header>

          {/* Main content - Scrollable */}
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  // Student layout - horizontal navbar
  const navbarGlass = isDark ? 'glass-dark' : 'glass-light';
  const navbarBdr   = isDark ? 'border-white/[0.06]' : 'border-white/50';
  const pageBg      = isDark ? 'bg-[#0A0A0F]'  : 'bg-slate-50';
  const navActive   = isDark ? 'text-white'     : 'text-slate-900';
  const navInactive = 'text-slate-500';
  const actionBtn   = isDark ? 'text-slate-400' : 'text-slate-500';
  const pillBg      = isDark ? 'bg-white/[0.06]' : 'bg-slate-100';
  const pillActive  = isDark ? 'bg-white/10'    : 'bg-white shadow-sm';

  return (
    <div className={`min-h-screen ${pageBg} font-jakarta`}>
      {/* Mobile drawer backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile Drawer — slides in from right */}
      <div
        className={`fixed top-0 right-0 h-full w-[280px] z-50 lg:hidden flex flex-col transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } ${isDark ? 'bg-[#111118] border-l border-white/[0.08]' : 'bg-white border-l border-slate-200'}`}
      >
        {/* Drawer header */}
        <div className={`flex items-center justify-between px-4 pt-5 pb-4 shrink-0 border-b ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2.5">
            <img src={itsCrest} alt="ITS Logo" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
            <div>
              <p className={`text-sm font-bold leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>ITS</p>
              <p className="text-[10px] leading-none mt-0.5 text-slate-500">{t('appSubtitle')}</p>
            </div>
          </div>
          {/* Close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'
                    : isDark ? 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {t(item.name)}
              </Link>
            );
          })}
        </nav>

        {/* Bottom utility controls */}
        <div className={`px-3 pb-5 pt-3 space-y-0.5 border-t ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>

          {/* Theme toggle */}
          <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <div className="flex items-center gap-3">
              {isDark
                ? <Moon className="w-5 h-5 text-blue-400" />
                : <Sun className="w-5 h-5 text-amber-500" />}
              <span className="text-sm font-medium">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-300 ${isDark ? 'bg-blue-500' : 'bg-slate-300'}`}
            >
              <span
                className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${isDark ? 'left-[22px]' : 'left-[3px]'}`}
              />
            </button>
          </div>

          {/* Language */}
          <button
            onClick={toggleLang}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isDark ? 'text-slate-300 hover:bg-white/[0.06]' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Globe className="w-5 h-5" />
            <span>{lang === 'en' ? 'English' : 'Indonesian'}</span>
            <span className={`ml-auto text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-md ${isDark ? 'bg-white/[0.08] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              {lang.toUpperCase()}
            </span>
          </button>

          {/* Notifications */}
          <button
            onClick={() => { setSidebarOpen(false); navigate('/notifications'); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isDark ? 'text-slate-300 hover:bg-white/[0.06]' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full" />}
            </div>
            <span>{t('notifications') || 'Notifications'}</span>
            {unreadCount > 0 && (
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Settings */}
          <button
            onClick={() => { setSidebarOpen(false); navigate('/settings'); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isDark ? 'text-slate-300 hover:bg-white/[0.06]' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>{t('settings') || 'Settings'}</span>
          </button>

          {/* Divider */}
          <div className={`my-1 h-px ${isDark ? 'bg-white/[0.07]' : 'bg-slate-100'}`} />

          {/* Logout */}
          <button
            onClick={() => { setSidebarOpen(false); handleLogout(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/[0.08] transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>{t('logout') || 'Sign out'}</span>
          </button>
        </div>
      </div>

      {/* Top Navbar */}
      <header className={`fixed top-4 inset-x-4 z-30 h-14 rounded-2xl ${navbarGlass} border ${navbarBdr}`}>
        <div className="flex h-full items-center gap-4 px-5">
          {/* Logo */}
          <div className="flex items-center gap-0.5 shrink-0">
            <img
              src={itsLogo}
              alt="ITS"
              className="h-9 w-auto object-contain shrink-0 -mr-16"
              style={{ filter: isDark ? 'brightness(0) invert(1)' : 'brightness(0) saturate(100%) invert(37%) sepia(98%) saturate(1500%) hue-rotate(204deg) brightness(95%) contrast(95%)' }}
            />
            <div className="hidden sm:block">
              <span className={`text-base font-bold leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Equimon
              </span>
              <p className="text-[10px] leading-none text-slate-500">
                {t('appSubtitle')}
              </p>
            </div>
          </div>

          {/* Desktop Navigation — centered, full height for underline indicator */}
          <nav className="hidden lg:flex items-center justify-center gap-0 flex-1 h-full">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`relative flex items-center gap-1.5 px-5 h-full text-sm font-medium transition-colors ${
                    isActive ? navActive : navInactive
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {t(item.name)}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-0.5 ml-auto shrink-0">
            {/* Theme Toggle Pill — desktop only */}
            <div className={`hidden lg:flex relative items-center ${pillBg} rounded-lg p-0.5 gap-0.5 mr-1`}>
              {/* Sliding active indicator */}
              <div
                className={`absolute top-0.5 bottom-0.5 w-7 rounded-md ${pillActive}`}
                style={{
                  left: isDark ? '32px' : '2px',
                  transition: 'left 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />
              <button
                onClick={isDark ? toggleTheme : undefined}
                title="Light mode"
                className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-md transition-colors duration-300 ${!isDark ? 'text-amber-500' : 'text-slate-500'}`}
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={!isDark ? toggleTheme : undefined}
                title="Dark mode"
                className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-md transition-colors duration-300 ${isDark ? 'text-blue-400' : 'text-slate-400'}`}
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Language Switcher — desktop only */}
            <button
              onClick={toggleLang}
              title={lang === 'en' ? 'Switch to Indonesian' : 'Switch to English'}
              className={`hidden lg:flex group items-center gap-1.5 h-8 px-2.5 rounded-lg transition-all duration-150 ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Globe className="w-4 h-4 transition-transform duration-150 group-hover:rotate-12" />
              <span className="text-[11px] font-semibold tracking-widest uppercase">{lang === 'en' ? 'EN' : 'ID'}</span>
            </button>

            {/* Notification Bell — always visible */}
            {notificationsBell}

            {/* User Dropdown — desktop only */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`hidden lg:flex items-center gap-2 pl-1.5 pr-2.5 h-9 rounded-xl ml-1 transition-all duration-150 group border ${
                  isDark
                    ? 'border-transparent hover:border-white/[0.12] hover:bg-white/[0.10]'
                    : 'border-transparent hover:border-slate-200 hover:bg-slate-100'
                }`}>
                  {/* Gradient rounded-square avatar */}
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}
                  >
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className={`hidden md:block text-sm font-semibold transition-colors duration-150 ${
                    isDark ? 'text-slate-300 group-hover:text-white' : 'text-slate-600 group-hover:text-slate-900'
                  }`}>
                    {user?.name?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-colors duration-150 ${
                    isDark ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600'
                  }`} />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                style={{
                  background: isDark ? '#1b1b20' : '#f8fafc',
                  boxShadow: isDark
                    ? '0 8px 32px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.08)'
                    : '0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.90)',
                  border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.08)',
                }}
                className={`w-[min(288px,calc(100vw-1.5rem))] p-0 rounded-3xl overflow-hidden ${
                  isDark ? 'text-slate-200' : 'text-slate-900'
                }`}
              >
                {/* ── User header ── */}
                <div className={`flex items-center gap-3.5 px-4 py-4 border-b ${isDark ? 'border-white/[0.07]' : 'border-slate-100'}`}>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0"
                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}
                  >
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      {user?.name || 'User'}
                    </p>
                    <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {user?.email || 'user@its.ac.id'}
                    </p>
                  </div>
                </div>

                {/* ── Menu items ── */}
                <div className="p-1.5">
                  {[
                    { Icon: Settings, label: t('settings'),                     action: () => navigate('/settings') },
                    { Icon: User,     label: t('profile'),                       action: () => navigate('/profile') },
                    { Icon: Bell,     label: t('notifications') || 'Notifications', action: () => navigate('/notifications') },
                  ].map(item => (
                    <DropdownMenuItem
                      key={item.label}
                      onClick={item.action}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer ${
                        isDark
                          ? 'text-slate-300 focus:bg-white/[0.06] focus:text-white'
                          : 'text-slate-600 focus:bg-slate-50 focus:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.Icon className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                    </DropdownMenuItem>
                  ))}
                </div>

                <DropdownMenuSeparator className={isDark ? 'bg-white/[0.07]' : 'bg-slate-100'} />

                {/* ── Sign out ── */}
                <div className="p-1.5">
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-red-500 focus:bg-red-500/[0.08] focus:text-red-400"
                  >
                    <div className="flex items-center gap-3">
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">{t('logout') || 'Sign out'}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-red-500/40" />
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile burger — rightmost */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`lg:hidden ml-1 p-1.5 rounded-lg ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content — padded below floating navbar */}
      <main className="pt-24 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
        <Outlet />
      </main>
    </div>
  );
}
