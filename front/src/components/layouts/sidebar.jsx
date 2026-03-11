import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ClipboardList,
  Users,
  BarChart3,
  CheckSquare,
  Settings,
  FlaskConical,
  X,
  Home,
  History,
  CheckCircle,
  Calendar,
  Clock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useLang } from '@/components/i18n/LangContext';

const menuConfig = {
  admin: [
    { label: 'dashboard', icon: Home, href: '/dashboard' },
    { label: 'users', icon: Users, href: '/users' },
    { label: 'inventory', icon: Package, href: '/inventory' },
    { label: 'equipmentCatalog', icon: Package, href: '/catalog' },
    { label: 'allRequests', icon: BarChart3, href: '/all-requests' },
    { label: 'equipmentPrep', icon: CheckCircle, href: '/equipment-prep' },
    { label: 'returns', icon: History, href: '/returns' },
    { label: 'settings', icon: Settings, href: '/settings' },
  ],
  lecturer: [
    { label: 'dashboard', icon: Home, href: '/dashboard' },
    { label: 'equipmentCatalog', icon: Package, href: '/catalog' },
    { label: 'pendingApprovals', icon: CheckSquare, href: '/lecturer-approvals' },
    { label: 'approvalHistory', icon: History, href: '/approval-history' },
    { label: 'allRequests', icon: BarChart3, href: '/all-approval-history' },
  ],
  head_of_lab: [
    { label: 'dashboard', icon: Home, href: '/dashboard' },
    { label: 'equipmentCatalog', icon: Package, href: '/catalog' },
    { label: 'finalApprovals', icon: CheckCircle, href: '/head-approvals' },
    { label: 'allRequests', icon: BarChart3, href: '/all-requests' },
    { label: 'approvalHistory', icon: History, href: '/all-approval-history' },
    { label: 'inventory', icon: Package, href: '/inventory' },
  ],
  lab_assistant: [
    { label: 'dashboard', icon: Home, href: '/dashboard' },
    { label: 'equipmentCatalog', icon: Package, href: '/catalog' },
    { label: 'equipmentPrep', icon: CheckCircle, href: '/equipment-prep' },
    { label: 'returns', icon: History, href: '/returns' },
    { label: 'allRequests', icon: ClipboardList, href: '/all-requests' },
  ],
  student: [
    { label: 'dashboard', icon: Home, href: '/dashboard' },
    { label: 'equipmentCatalog', icon: Package, href: '/catalog' },
    { label: 'myRequests', icon: ClipboardList, href: '/requests' },
  ],
};

export default function Sidebar({ user, currentPage, isOpen, onClose, collapsed = false }) {
  const userRole = user?.role || 'student';
  const menu = menuConfig[userRole] || menuConfig.student;
  const { t, lang } = useLang();
  
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    const locale = lang === 'id' ? 'id-ID' : 'en-US';
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(locale, options);
  };

  const formatTime = (date) => {
    const locale = lang === 'id' ? 'id-ID' : 'en-US';
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          ${collapsed ? 'w-20' : 'w-72'} h-screen bg-white border-r border-slate-200
          transform transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col shadow-sm overflow-hidden
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                <FlaskConical className="w-6 h-6 text-white" />
              </div>
              {!collapsed && (
                <div>
                  <h1 className="font-bold text-lg text-slate-900">EquiMon</h1>
                  <p className="text-xs text-slate-500">{t('appSubtitle')}</p>
                </div>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {menu.map((item) => {
            const isActive = currentPage === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 ${collapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg transition-all
                  ${isActive 
                    ? 'bg-blue-50 text-blue-600 font-medium' 
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }
                `}
                title={collapsed ? t(item.label) : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="font-medium">{t(item.label)}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Spacer to push user info to bottom */}
        <div className="flex-1"></div>

        {/* User Info */}
        {!collapsed && (
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50/50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold">
                {user?.full_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-900 truncate">{user?.full_name || 'User'}</p>
                <p className="text-xs text-slate-500 capitalize">{t(userRole.replace('_', ''))}</p>
              </div>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="p-4 border-t border-slate-200 flex justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold">
              {user?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        )}

        {/* Date and Time */}
        {!collapsed && (
          <div className="px-4 pb-4">
            <div className="px-4 py-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-medium text-blue-900">{formatDate(currentDateTime)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-semibold text-blue-900 tabular-nums">{formatTime(currentDateTime)}</p>
              </div>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="px-2 pb-4 flex justify-center">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        )}
      </aside>
    </>
  );
}