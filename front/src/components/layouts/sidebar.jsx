import React from 'react';
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
  LogOut
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useLang } from '@/components/i18n/LangContext';
import equimonLogo from '@/assets/images/Equimon Logo.png';
import { CATALOG_ROUTES_BY_ROLE } from '@/utils/roleCatalogRoutes';

const menuConfig = {
  admin: [
    { label: 'dashboard', icon: Home, href: '/dashboard' },
    { label: 'users', icon: Users, href: '/users' },
    { label: 'inventory', icon: Package, href: '/inventory' },
    { label: 'equipmentCatalog', icon: Package, href: CATALOG_ROUTES_BY_ROLE.admin },
    { label: 'allRequests', icon: BarChart3, href: '/all-requests' },
    { label: 'auditLogs', icon: ClipboardList, href: '/admin-audit-logs' },
    { label: 'equipmentPrep', icon: CheckCircle, href: '/equipment-prep' },
    { label: 'settings', icon: Settings, href: '/settings' },
  ],
  lecturer: [
    { label: 'dashboard', icon: Home, href: '/dashboard' },
    { label: 'equipmentCatalog', icon: Package, href: CATALOG_ROUTES_BY_ROLE.lecturer },
    { label: 'pendingApprovals', icon: CheckSquare, href: '/lecturer-approvals' },
    { label: 'approvalHistory', icon: History, href: '/lecturer-approval-history' },
  ],
  head_of_lab: [
    { label: 'dashboard', icon: Home, href: '/dashboard' },
    { label: 'equipmentCatalog', icon: Package, href: CATALOG_ROUTES_BY_ROLE.head_of_lab },
    { label: 'finalApprovals', icon: CheckCircle, href: '/head-approvals' },
    { label: 'allRequests', icon: BarChart3, href: '/all-requests' },
    { label: 'approvalHistory', icon: History, href: '/head-approval-history' },
    { label: 'inventory', icon: Package, href: '/inventory' },
  ],
  lab_assistant: [
    { label: 'dashboard', icon: Home, href: '/dashboard' },
    { label: 'equipmentCatalog', icon: Package, href: CATALOG_ROUTES_BY_ROLE.lab_assistant },
    { label: 'equipmentPrep', icon: CheckCircle, href: '/equipment-prep' },
    { label: 'returns', icon: History, href: '/returns' },
    { label: 'allRequests', icon: ClipboardList, href: '/all-requests' },
  ],
  student: [
    { label: 'dashboard', icon: Home, href: '/dashboard' },
    { label: 'equipmentCatalog', icon: Package, href: CATALOG_ROUTES_BY_ROLE.student },
    { label: 'myRequests', icon: ClipboardList, href: '/requests' },
  ],
};

export default function Sidebar({ user, currentPage, isOpen, onClose, collapsed = false, onLogout }) {
  const userRole = user?.role || 'student';
  const menu = menuConfig[userRole] || menuConfig.student;
  const { t } = useLang();

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
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                <img src={equimonLogo} alt="Equimon Logo" className="w-full h-full object-contain" />
              </div>
              {!collapsed && (
                <div>
                  <h1 className="font-bold text-lg text-slate-900">Equimon</h1>
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

        {/* Sidebar profile card */}
        {!collapsed && (
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50/80 border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email || 'user@its.ac.id'}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                  {t(userRole)}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onLogout}
              className="w-full mt-3 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('logout')}
            </Button>
          </div>
        )}

        {collapsed && (
          <div className="p-4 border-t border-slate-200 flex justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}