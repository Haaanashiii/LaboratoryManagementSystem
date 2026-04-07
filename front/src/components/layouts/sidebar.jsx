import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Package,
  ClipboardList,
  Users,
  BarChart3,
  CheckSquare,
  Settings,
  X,
  Home,
  History,
  CheckCircle,
  LogOut,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';
import equimonLogo from '@/assets/images/Equimon Logo.png';
import { CATALOG_ROUTES_BY_ROLE } from '@/utils/roleCatalogRoutes';

// Each role's menu is an array of groups, each group has a translated label key and items.
const menuConfig = {
  admin: [
    {
      groupLabel: 'sidebarGroupApplication',
      items: [
        { label: 'dashboard', icon: Home, href: '/dashboard' },
      ],
    },
    {
      groupLabel: 'sidebarGroupPlatform',
      items: [
        { label: 'users', icon: Users, href: '/users' },
        {
          label: 'inventory', icon: Package, href: '/inventory',
          children: [
            { label: 'addEquipment', icon: Plus, href: '/inventory/add-equipment' },
          ],
        },
        { label: 'equipmentCatalog', icon: Package, href: CATALOG_ROUTES_BY_ROLE.admin },
        { label: 'allRequests', icon: BarChart3, href: '/all-requests' },
        { label: 'equipmentPrep', icon: CheckCircle, href: '/equipment-prep' },
      ],
    },
    {
      groupLabel: 'sidebarGroupSystem',
      items: [
        { label: 'auditLogs', icon: ClipboardList, href: '/admin-audit-logs' },
        { label: 'settings', icon: Settings, href: '/settings' },
      ],
    },
  ],
  lecturer: [
    {
      groupLabel: 'sidebarGroupApplication',
      items: [
        { label: 'dashboard', icon: Home, href: '/dashboard' },
        { label: 'equipmentCatalog', icon: Package, href: CATALOG_ROUTES_BY_ROLE.lecturer },
      ],
    },
    {
      groupLabel: 'sidebarGroupApprovals',
      items: [
        { label: 'pendingApprovals', icon: CheckSquare, href: '/lecturer-approvals' },
        { label: 'approvalHistory', icon: History, href: '/lecturer-approval-history' },
      ],
    },
  ],
  head_of_lab: [
    {
      groupLabel: 'sidebarGroupApplication',
      items: [
        { label: 'dashboard', icon: Home, href: '/dashboard' },
        { label: 'equipmentCatalog', icon: Package, href: CATALOG_ROUTES_BY_ROLE.head_of_lab },
      ],
    },
    {
      groupLabel: 'sidebarGroupApprovals',
      items: [
        { label: 'finalApprovals', icon: CheckCircle, href: '/head-approvals' },
        { label: 'allRequests', icon: BarChart3, href: '/all-requests' },
        { label: 'approvalHistory', icon: History, href: '/head-approval-history' },
      ],
    },
    {
      groupLabel: 'sidebarGroupManagement',
      items: [
        {
          label: 'inventory', icon: Package, href: '/inventory',
          children: [
            { label: 'addEquipment', icon: Plus, href: '/inventory/add-equipment' },
          ],
        },
      ],
    },
  ],
  lab_assistant: [
    {
      groupLabel: 'sidebarGroupApplication',
      items: [
        { label: 'dashboard', icon: Home, href: '/dashboard' },
        { label: 'equipmentCatalog', icon: Package, href: CATALOG_ROUTES_BY_ROLE.lab_assistant },
      ],
    },
    {
      groupLabel: 'sidebarGroupOperations',
      items: [
        { label: 'equipmentPrep', icon: CheckCircle, href: '/equipment-prep' },
        { label: 'returns', icon: History, href: '/returns' },
        { label: 'allRequests', icon: ClipboardList, href: '/all-requests' },
      ],
    },
  ],
  student: [
    {
      groupLabel: 'sidebarGroupApplication',
      items: [
        { label: 'dashboard', icon: Home, href: '/dashboard' },
        { label: 'equipmentCatalog', icon: Package, href: CATALOG_ROUTES_BY_ROLE.student },
      ],
    },
    {
      groupLabel: 'sidebarGroupMyActivity',
      items: [
        { label: 'myRequests', icon: ClipboardList, href: '/requests' },
      ],
    },
  ],
};

const roleBadgeStyles = {
  admin: 'bg-red-100 text-red-700',
  lecturer: 'bg-blue-100 text-blue-700',
  head_of_lab: 'bg-purple-100 text-purple-700',
  lab_assistant: 'bg-amber-100 text-amber-700',
  student: 'bg-emerald-100 text-emerald-700',
};

export default function Sidebar({ user, isOpen, onClose, collapsed = false, onLogout }) {
  const userRole = user?.role || 'student';
  const groups = menuConfig[userRole] || menuConfig.student;
  const { t } = useLang();
  const location = useLocation();

  const [expandedItems, setExpandedItems] = useState(() => {
    const expanded = new Set();
    groups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children?.some((child) => location.pathname === child.href)) {
          expanded.add(item.label);
        }
      });
    });
    return expanded;
  });

  const toggleExpand = (label) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
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
          fixed lg:static inset-y-0 left-0 z-50 h-screen flex flex-col
          ${collapsed ? 'w-[4.5rem]' : 'w-64'}
          bg-[hsl(var(--sidebar))] border-r border-[hsl(var(--sidebar-border))]
          transition-[width,transform] duration-200 ease-linear
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-hidden
        `}
      >
        {/* ── Header ── */}
        <div
          className={`
            flex h-16 shrink-0 items-center border-b border-[hsl(var(--sidebar-border))]
            ${collapsed ? 'justify-center px-3' : 'px-4'}
          `}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="h-8 w-8 shrink-0">
              <img src={equimonLogo} alt="Equimon" className="h-full w-full object-contain" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[hsl(var(--sidebar-primary))]">
                  Equimon
                </span>
                <span className="block truncate text-xs text-[hsl(var(--sidebar-foreground)/60%)]">
                  {t('appSubtitle')}
                </span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={onClose}
              className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[hsl(var(--sidebar-foreground)/50%)] transition-colors hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))] lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {groups.map((group, gi) => (
            <div key={gi}>
              {/* Group label */}
              {!collapsed && (
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--sidebar-foreground)/45%)]">
                  {t(group.groupLabel)}
                </p>
              )}

              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  const hasChildren = Boolean(item.children?.length);
                  const isExpanded = expandedItems.has(item.label);
                  const isChildActive = hasChildren && item.children.some((c) => location.pathname === c.href);

                  return (
                    <li key={item.href}>
                      {/* Parent row */}
                      <div className="flex items-center">
                        <Link
                          to={item.href}
                          onClick={onClose}
                          title={collapsed ? t(item.label) : undefined}
                          className={`
                            flex flex-1 items-center gap-2 rounded-md text-sm font-medium transition-colors
                            ${collapsed ? 'justify-center px-2 py-2' : 'px-2 py-1.5'}
                            ${isActive || isChildActive
                              ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]'
                              : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]'
                            }
                          `}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{t(item.label)}</span>}
                        </Link>

                        {/* Expand toggle — only when not collapsed and has children */}
                        {hasChildren && !collapsed && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.label)}
                            className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[hsl(var(--sidebar-foreground)/40%)] transition-colors hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>
                        )}
                      </div>

                      {/* Sub-items */}
                      {hasChildren && !collapsed && isExpanded && (
                        <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-[hsl(var(--sidebar-border))] pl-3">
                          {item.children.map((child) => {
                            const childActive = location.pathname === child.href;
                            return (
                              <li key={child.href}>
                                <Link
                                  to={child.href}
                                  onClick={onClose}
                                  className={`
                                    flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors
                                    ${childActive
                                      ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] font-medium'
                                      : 'text-[hsl(var(--sidebar-foreground)/70%)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]'
                                    }
                                  `}
                                >
                                  <child.icon className="h-3.5 w-3.5 shrink-0" />
                                  <span>{t(child.label)}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-[hsl(var(--sidebar-border))] p-2">
          {collapsed ? (
            <div className="flex justify-center py-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 text-sm font-bold text-white">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            </div>
          ) : (
            <>
              {/* User card */}
              <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 text-sm font-semibold text-white">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-none text-[hsl(var(--sidebar-primary))]">
                    {user?.name || 'User'}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[hsl(var(--sidebar-foreground)/50%)]">
                    {user?.email || ''}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${roleBadgeStyles[userRole] || 'bg-slate-100 text-slate-600'}`}
                >
                  {t(userRole)}
                </span>
              </div>

              {/* Logout */}
              <button
                onClick={onLogout}
                className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>{t('logout')}</span>
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

