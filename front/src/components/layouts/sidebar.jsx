import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Package, ClipboardList, Users, BarChart3, CheckSquare,
  Settings, X, Home, History, CheckCircle, LogOut, Plus,
  Pencil, ChevronDown, Printer, Activity,
} from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';
import itsLogo from '@/assets/images/ITSSecond.png';
import { CATALOG_ROUTES_BY_ROLE } from '@/utils/roleCatalogRoutes';

// ─── Design tokens ────────────────────────────────────────────────────────────

const NAVY        = '#0F2A4A';
const NAVY_HOVER  = '#173559';
const GOLD        = '#C8A246';
const GOLD_3      = '#F0E4BD';
const RULE        = 'rgba(200,162,70,0.22)';
const TEXT_DIM    = '#C7D3E5';
const TEXT_MUTE   = 'rgba(199,211,229,0.45)';
const ICON_MUTE   = 'rgba(199,211,229,0.35)';
const HOVER_BG    = 'rgba(255,255,255,0.05)';
const LOGOUT_CLR  = '#E4A8A8';

// ─── Menu config ──────────────────────────────────────────────────────────────

const menuConfig = {
  admin: [
    {
      groupLabel: 'Dashboard',
      items: [{ label: 'dashboard', icon: Home, href: '/dashboard' }],
    },
    {
      groupLabel: 'Platform',
      items: [
        { label: 'users', icon: Users, href: '/users' },
        {
          label: 'inventory', icon: Package, href: '/inventory',
          children: [
            { label: 'addEquipment', icon: Plus, href: '/inventory/add-equipment' },
            { label: 'editEquipment', icon: Pencil, href: '/inventory' },
          ],
        },
        { label: 'allRequests', icon: BarChart3, href: '/all-requests' },
        { label: 'equipmentProcess', icon: Activity, href: '/admin-equipment-process' },
        { label: 'borrowReports', icon: Printer, href: '/borrow-reports' },
        { label: 'reports', icon: ClipboardList, href: '/reports' },
      ],
    },
    {
      groupLabel: 'System',
      items: [
        { label: 'Audit Logs', icon: ClipboardList, href: '/admin-audit-logs' },
        { label: 'settings', icon: Settings, href: '/admin-settings' },
      ],
    },
  ],
  lecturer: [
    {
      groupLabel: 'Application',
      items: [
        { label: 'dashboard', icon: Home, href: '/dashboard' },
        { label: 'inventory', icon: Package, href: '/inventory' },
      ],
    },
    {
      groupLabel: 'Approvals',
      items: [
        { label: 'pendingApprovals', icon: CheckSquare, href: '/lecturer-approvals' },
        { label: 'approvalHistory', icon: History, href: '/lecturer-approval-history' },
      ],
    },
    {
      groupLabel: 'System',
      items: [{ label: 'settings', icon: Settings, href: '/lecturer-settings' }],
    },
  ],
  head_of_lab: [
    {
      groupLabel: 'Dashboard',
      items: [{ label: 'dashboard', icon: Home, href: '/dashboard' }],
    },
    {
      groupLabel: 'Approvals',
      items: [
        { label: 'finalApprovals', icon: CheckCircle, href: '/head-approvals' },
        { label: 'allRequests', icon: BarChart3, href: '/all-requests' },
        { label: 'approvalHistory', icon: History, href: '/head-approval-history' },
      ],
    },
    {
      groupLabel: 'System',
      items: [{ label: 'settings', icon: Settings, href: '/head-settings' }],
    },
  ],
  lab_assistant: [
    {
      groupLabel: 'Application',
      items: [{ label: 'dashboard', icon: Home, href: '/dashboard' }],
    },
    {
      groupLabel: 'Operations',
      items: [
        { label: 'equipmentPrep', icon: CheckCircle, href: '/equipment-prep' },
        { label: 'returns', icon: History, href: '/returns' },
        { label: 'allRequests', icon: ClipboardList, href: '/all-requests' },
      ],
    },
    {
      groupLabel: 'System',
      items: [{ label: 'settings', icon: Settings, href: '/assistant-settings' }],
    },
  ],
  student: [
    {
      groupLabel: 'Application',
      items: [
        { label: 'dashboard', icon: Home, href: '/dashboard' },
        { label: 'equipmentCatalog', icon: Package, href: CATALOG_ROUTES_BY_ROLE.student },
      ],
    },
    {
      groupLabel: 'My Activity',
      items: [{ label: 'myRequests', icon: ClipboardList, href: '/requests' }],
    },
  ],
};

const ROLE_LABEL = {
  admin:         'Administrator',
  lecturer:      'Lecturer',
  head_of_lab:   'Head of Lab',
  lab_assistant: 'Lab Assistant',
  student:       'Student',
};

export default function Sidebar({ user, isOpen, onClose, collapsed = false, onLogout }) {
  const userRole = user?.role || 'student';
  const { t } = useLang();
  const location = useLocation();

  const [orderRevision, setOrderRevision] = useState(0);
  useEffect(() => {
    const handler = () => setOrderRevision(v => v + 1);
    const events = ['admin', 'lecturer', 'head_of_lab', 'lab_assistant'].map(r => `${r}:sidebar-reordered`);
    events.forEach(e => window.addEventListener(e, handler));
    return () => events.forEach(e => window.removeEventListener(e, handler));
  }, []);

  const groups = useMemo(() => {
    const applyOrder = (role, storageKey) => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return menuConfig[role];
        const savedOrder = JSON.parse(raw);
        const posMap = new Map(savedOrder.map((s, idx) => [s.id, idx]));
        return menuConfig[role]
          .map(group => ({
            ...group,
            items: [...group.items].sort((a, b) => {
              const pa = posMap.has(a.label) ? posMap.get(a.label) : Infinity;
              const pb = posMap.has(b.label) ? posMap.get(b.label) : Infinity;
              return pa - pb;
            }),
          }))
          .sort((ga, gb) => {
            const firstA = Math.min(...ga.items.map(i => posMap.has(i.label) ? posMap.get(i.label) : Infinity));
            const firstB = Math.min(...gb.items.map(i => posMap.has(i.label) ? posMap.get(i.label) : Infinity));
            return firstA - firstB;
          });
      } catch {
        return menuConfig[role];
      }
    };
    if (userRole === 'admin')         return applyOrder('admin',         'admin_sidebar_order');
    if (userRole === 'lecturer')      return applyOrder('lecturer',      'lecturer_sidebar_order');
    if (userRole === 'head_of_lab')   return applyOrder('head_of_lab',   'head_of_lab_sidebar_order');
    if (userRole === 'lab_assistant') return applyOrder('lab_assistant', 'lab_assistant_sidebar_order');
    return menuConfig[userRole] || menuConfig.student;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, orderRevision]);

  const [expandedItems, setExpandedItems] = useState(() => {
    const defaultGroups = menuConfig[userRole] || menuConfig.student;
    const expanded = new Set();
    defaultGroups.forEach(group => {
      group.items.forEach(item => {
        if (item.children?.some(c => location.pathname === c.href)) expanded.add(item.label);
      });
    });
    return expanded;
  });

  const toggleExpand = (label) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  const initials = user?.name
    ? user.name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 h-screen flex flex-col
          ${collapsed ? 'w-[4.5rem]' : 'w-64'}
          transition-[width,transform] duration-200 ease-linear
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-hidden
        `}
        style={{ background: NAVY, borderRight: `1px solid ${RULE}` }}
      >
        {/* ── Gold top rule ── */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${GOLD}, ${GOLD}44)`, zIndex: 10 }} />

        {/* ── Header ── */}
        <div
          className={`flex h-16 shrink-0 items-center mt-[2px] ${collapsed ? 'justify-center px-0' : 'px-4'}`}
          style={{ borderBottom: `1px solid ${RULE}` }}
        >
          {collapsed ? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center" title="ITS Equimon">
              <img src={itsLogo} alt="ITS" className="h-full w-full object-contain" style={{ filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
            </div>
          ) : (
            <>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div
                  className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center p-1"
                  style={{ background: 'rgba(200,162,70,0.12)', border: `1px solid ${RULE}` }}
                >
                  <img src={itsLogo} alt="ITS" className="h-full w-full object-contain" style={{ filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
                </div>
                <div className="min-w-0">
                  <span className="block truncate text-[15px] font-bold leading-tight" style={{ color: GOLD_3, fontFamily: "'Source Serif 4', Georgia, serif" }}>
                    Equimon
                  </span>
                  <span className="block truncate text-[10px] leading-tight" style={{ color: TEXT_MUTE, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.04em' }}>
                    {t('appSubtitle')}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors lg:hidden"
                style={{ color: TEXT_DIM }}
                onMouseEnter={e => e.currentTarget.style.background = HOVER_BG}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-5">
          {groups.map((group, gi) => (
            <div key={gi}>
              {!collapsed && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span
                    style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.18em',
                      textTransform: 'uppercase', color: TEXT_MUTE,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    {group.groupLabel}
                  </span>
                  <div className="flex-1 h-px" style={{ background: RULE }} />
                </div>
              )}

              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive      = location.pathname === item.href;
                  const hasChildren   = Boolean(item.children?.length);
                  const isExpanded    = expandedItems.has(item.label);
                  const isChildActive = hasChildren && item.children.some(c => location.pathname === c.href);
                  const highlighted   = isActive || isChildActive;

                  return (
                    <li key={item.href}>
                      <div className="flex items-center">
                        <Link
                          to={item.href}
                          onClick={onClose}
                          title={collapsed ? t(item.label) : undefined}
                          className={`
                            relative flex flex-1 items-center gap-2.5 rounded-xl text-[13px] transition-all duration-150
                            ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'}
                          `}
                          style={highlighted ? {
                            background: NAVY_HOVER,
                            color: GOLD_3,
                            fontWeight: 600,
                          } : {
                            color: TEXT_DIM,
                            fontWeight: 500,
                          }}
                          onMouseEnter={e => { if (!highlighted) e.currentTarget.style.background = HOVER_BG; }}
                          onMouseLeave={e => { if (!highlighted) e.currentTarget.style.background = 'transparent'; }}
                        >
                          {/* Gold active left bar */}
                          {highlighted && !collapsed && (
                            <span
                              className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                              style={{ width: 3, height: '60%', background: GOLD }}
                            />
                          )}
                          <item.icon
                            className={`shrink-0 ${collapsed ? 'h-[18px] w-[18px]' : 'h-[15px] w-[15px]'}`}
                            style={{ color: highlighted ? GOLD : ICON_MUTE }}
                          />
                          {!collapsed && <span className="truncate">{t(item.label)}</span>}
                        </Link>

                        {hasChildren && !collapsed && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.label)}
                            className="ml-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors"
                            style={{ color: TEXT_MUTE }}
                            onMouseEnter={e => e.currentTarget.style.background = HOVER_BG}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>

                      {hasChildren && !collapsed && isExpanded && (
                        <ul className="ml-4 mt-1 space-y-0.5 pl-3" style={{ borderLeft: `2px solid ${RULE}` }}>
                          {item.children.map((child) => {
                            const childActive = location.pathname === child.href;
                            return (
                              <li key={child.href}>
                                <Link
                                  to={child.href}
                                  onClick={onClose}
                                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] transition-all"
                                  style={childActive
                                    ? { background: NAVY_HOVER, color: GOLD_3, fontWeight: 600 }
                                    : { color: TEXT_MUTE, fontWeight: 500 }
                                  }
                                  onMouseEnter={e => { if (!childActive) e.currentTarget.style.background = HOVER_BG; }}
                                  onMouseLeave={e => { if (!childActive) e.currentTarget.style.background = 'transparent'; }}
                                >
                                  <child.icon className="h-3 w-3 shrink-0" style={{ color: childActive ? GOLD : ICON_MUTE }} />
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
        <div className="shrink-0 p-3" style={{ borderTop: `1px solid ${RULE}` }}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[13px] font-bold shadow-sm"
                style={{ background: 'rgba(200,162,70,0.18)', color: GOLD_3, border: `1px solid ${RULE}` }}
                title={user?.name || 'User'}
              >
                {initials}
              </div>
              <button
                onClick={onLogout}
                title={t('logout')}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                style={{ color: LOGOUT_CLR }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(228,168,168,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              {/* User card */}
              <div
                className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 mb-1"
                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${RULE}` }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold shadow-sm"
                  style={{ background: 'rgba(200,162,70,0.2)', color: GOLD_3, border: `1px solid rgba(200,162,70,0.35)` }}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold leading-tight" style={{ color: '#E8EFF6' }}>
                    {user?.name || 'User'}
                  </p>
                  <p className="truncate text-[10px] leading-tight mt-0.5" style={{ color: GOLD, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {ROLE_LABEL[userRole] || userRole}
                  </p>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-colors"
                style={{ color: LOGOUT_CLR }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(228,168,168,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
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
