import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu as AntMenu, ConfigProvider, Tooltip } from 'antd';
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
} from 'lucide-react';
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

export default function Sidebar({ user, currentPage, isOpen, onClose, collapsed }) {
  const navigate = useNavigate();
  const userRole = user?.role || 'student';
  const menu = menuConfig[userRole] || menuConfig.student;
  const { t } = useLang();

  const items = menu.map((item) => ({
    key: item.href,
    icon: <item.icon size={17} />,
    label: t(item.label),
  }));

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
          h-screen bg-white border-r border-slate-200
          transform transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'w-[72px]' : 'w-64'}
          flex flex-col overflow-hidden
          font-poppins
        `}
        style={{ fontFamily: 'Poppins, sans-serif' }}
      >
        {/* Header */}
        <div className={`flex items-center border-b border-slate-200 h-16 shrink-0 ${collapsed ? 'justify-center px-3' : 'justify-between px-5'}`}>
          {collapsed ? (
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                  <FlaskConical className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-base text-slate-900 leading-tight">EquiMon</h1>
                  <p className="text-xs text-slate-500">{t('appSubtitle')}</p>
                </div>
              </div>
              <button
                className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 pt-2">
          <ConfigProvider
            theme={{
              components: {
                Menu: {
                  itemBg: 'transparent',
                  itemColor: '#475569',
                  itemHoverBg: '#f1f5f9',
                  itemHoverColor: '#0f172a',
                  itemSelectedBg: '#eff6ff',
                  itemSelectedColor: '#2563eb',
                  itemActiveBg: '#eff6ff',
                  iconSize: 17,
                  collapsedWidth: 72,
                  itemPaddingInline: 0,
                },
              },
              token: {
                borderRadius: 8,
                colorPrimary: '#2563eb',
                fontFamily: "'Poppins', sans-serif",
              },
            }}
          >
            <AntMenu
              mode="inline"
              selectedKeys={[currentPage]}
              inlineCollapsed={collapsed}
              items={items}
              style={{ border: 'none', background: 'transparent', width: collapsed ? 72 : 256 }}
              onClick={({ key }) => {
                navigate(key);
                onClose();
              }}
            />
          </ConfigProvider>
        </div>

        {/* User Info */}
        <div className="shrink-0 border-t border-slate-200">
          {collapsed ? (
            <div className="flex justify-center py-3">
              <Tooltip title={user?.full_name || 'User'} placement="right">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm cursor-default">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
              </Tooltip>
            </div>
          ) : (
            <div className="px-4 py-3">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900 truncate">{user?.full_name || 'User'}</p>
                  <p className="text-xs text-slate-500 capitalize">{t(userRole.replace('_', ''))}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}