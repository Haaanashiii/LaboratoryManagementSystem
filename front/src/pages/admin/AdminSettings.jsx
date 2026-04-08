import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2,
  User, GripVertical, ChevronUp, ChevronDown, RotateCcw, Save,
  Shield, LayoutDashboard, Settings, Home, Users, Package,
  BarChart3, CheckSquare, ClipboardList,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/api/apiClient';
import { useTheme } from '@/components/hooks/ThemeContext';

// ─── Icon map for sidebar preview ────────────────────────────────────────────
const ICON_MAP = {
  dashboard:     Home,
  users:         Users,
  inventory:     Package,
  allRequests:   BarChart3,
  equipmentPrep: CheckSquare,
  auditLogs:     ClipboardList,
  settings:      Settings,
};

// ─── Default sidebar items (must match Sidebar.jsx menuConfig.admin labels) ──
const DEFAULT_SIDEBAR_ITEMS = [
  { id: 'dashboard',     label: 'Dashboard',      href: '/dashboard' },
  { id: 'users',         label: 'Users',           href: '/users' },
  { id: 'inventory',     label: 'Inventory',       href: '/inventory' },
  { id: 'allRequests',   label: 'All Requests',    href: '/all-requests' },
  { id: 'equipmentPrep', label: 'Equipment Prep',  href: '/equipment-prep' },
  { id: 'auditLogs',     label: 'Audit Logs',      href: '/admin-audit-logs' },
  { id: 'settings',      label: 'Settings',        href: '/admin-settings' },
];

const SIDEBAR_KEY = 'admin_sidebar_order';

const loadOrder = () => {
  try {
    const raw = localStorage.getItem(SIDEBAR_KEY);
    if (!raw) return DEFAULT_SIDEBAR_ITEMS;
    const saved = JSON.parse(raw);
    const ids = new Set(saved.map((i) => i.id));
    return [
      ...saved.filter((s) => DEFAULT_SIDEBAR_ITEMS.some((d) => d.id === s.id)),
      ...DEFAULT_SIDEBAR_ITEMS.filter((d) => !ids.has(d.id)),
    ];
  } catch {
    return DEFAULT_SIDEBAR_ITEMS;
  }
};

// ─── Password requirement checks ─────────────────────────────────────────────
const PWD_CHECKS = [
  { label: 'At least 6 characters',  fn: (p) => p.length >= 6 },
  { label: 'One uppercase letter',    fn: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter',    fn: (p) => /[a-z]/.test(p) },
  { label: 'One number',              fn: (p) => /[0-9]/.test(p) },
];

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'profile',  label: 'Profile',  icon: User,            activeText: 'text-blue-400',   border: 'border-blue-400' },
  { id: 'security', label: 'Security', icon: Shield,          activeText: 'text-violet-400', border: 'border-violet-400' },
  { id: 'sidebar',  label: 'Sidebar',  icon: LayoutDashboard, activeText: 'text-amber-400',  border: 'border-amber-400' },
];

// ─── Keyframe styles ──────────────────────────────────────────────────────────
const styles = `
  @keyframes asSlide {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .as-in { opacity: 0; animation: asSlide 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
  .as-d1 { animation-delay: 0.04s; }
  .as-d2 { animation-delay: 0.12s; }
  @keyframes asDot {
    0%, 100% { opacity: 0.04; }
    50%       { opacity: 0.09; }
  }
  .as-dot { animation: asDot 7s ease-in-out infinite; }
`;

export default function AdminSettings() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const initials = useMemo(
    () => (user?.name || 'A').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
    [user?.name]
  );

  // ── Active tab ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('profile');

  // ── Shared style tokens ──────────────────────────────────────────────────
  const card  = `rounded-2xl border ${isDark ? 'bg-[#0d0d14] border-white/[0.07]' : 'bg-white border-slate-200'}`;
  const hdivider = `border-b ${isDark ? 'border-white/[0.07]' : 'border-slate-100'}`;
  const inputCls = `h-10 text-sm ${
    isDark
      ? 'bg-slate-800/70 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-blue-500'
      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400'
  }`;
  const labelCls = `text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`;

  // ── Inline feedback component ────────────────────────────────────────────
  const Msg = ({ msg }) =>
    msg ? (
      <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
        msg.type === 'ok'
          ? (isDark ? 'bg-emerald-950/50 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
          : (isDark ? 'bg-red-950/50 text-red-400'         : 'bg-red-50 text-red-600')
      }`}>
        {msg.type === 'ok'
          ? <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
        {msg.text}
      </div>
    ) : null;

  // ─────────────────────────────────────────────────────────────────────────
  // PROFILE ‑ name change
  // ─────────────────────────────────────────────────────────────────────────
  const [nameVal, setNameVal] = useState('');
  const [nameMsg, setNameMsg] = useState(null);

  useEffect(() => { if (user?.name) setNameVal(user.name); }, [user?.name]);

  const nameMutation = useMutation({
    mutationFn: (name) => api.auth.updateName(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setNameMsg({ type: 'ok', text: 'Name updated successfully' });
      setTimeout(() => setNameMsg(null), 3500);
    },
    onError: (err) => setNameMsg({ type: 'err', text: err.message || 'Failed to update name' }),
  });

  const handleNameSave = (e) => {
    e.preventDefault();
    const trimmed = nameVal.trim();
    if (trimmed.length < 2) { setNameMsg({ type: 'err', text: 'Name must be at least 2 characters' }); return; }
    setNameMsg(null);
    nameMutation.mutate(trimmed);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SECURITY ‑ password change
  // ─────────────────────────────────────────────────────────────────────────
  const [pw, setPw]       = useState({ cur: '', next: '', confirm: '' });
  const [vis, setVis]     = useState({ cur: false, next: false, confirm: false });
  const [pwMsg, setPwMsg] = useState(null);

  const pwScore = useMemo(
    () => PWD_CHECKS.filter(({ fn }) => fn(pw.next)).length,
    [pw.next]
  );
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][pwScore] || '';
  const strengthColor = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400'][pwScore] || 'bg-red-500';

  const pwMutation = useMutation({
    mutationFn: (data) => api.auth.changePassword(data),
    onSuccess: () => {
      setPw({ cur: '', next: '', confirm: '' });
      setPwMsg({ type: 'ok', text: 'Password updated successfully' });
      setTimeout(() => setPwMsg(null), 3500);
    },
    onError: (err) => setPwMsg({ type: 'err', text: err.message || 'Failed to update password' }),
  });

  const handlePwSave = (e) => {
    e.preventDefault();
    if (!pw.cur)            { setPwMsg({ type: 'err', text: 'Current password is required' }); return; }
    if (pw.next.length < 6) { setPwMsg({ type: 'err', text: 'New password must be at least 6 characters' }); return; }
    if (pw.next !== pw.confirm) { setPwMsg({ type: 'err', text: 'Passwords do not match' }); return; }
    setPwMsg(null);
    pwMutation.mutate({ currentPassword: pw.cur, newPassword: pw.next });
  };

  const PwField = ({ id, field, placeholder }) => (
    <div className="relative">
      <Input
        id={id}
        type={vis[field] ? 'text' : 'password'}
        value={pw[field]}
        onChange={(e) => setPw((p) => ({ ...p, [field]: e.target.value }))}
        placeholder={placeholder}
        className={`${inputCls} pr-10`}
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={() => setVis((v) => ({ ...v, [field]: !v[field] }))}
        className={`absolute inset-y-0 right-0 flex items-center pr-3 ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
      >
        {vis[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SIDEBAR ‑ reorder + live preview
  // ─────────────────────────────────────────────────────────────────────────
  const [items, setItems]       = useState(loadOrder);
  const [sidebarMsg, setSidebarMsg] = useState(null);
  const dragIdx = React.useRef(null);

  const moveItem = useCallback((i, dir) => {
    setItems((prev) => {
      const next = [...prev];
      const target = i + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[i], next[target]] = [next[target], next[i]];
      return next;
    });
  }, []);

  const onDragStart = (i) => { dragIdx.current = i; };
  const onDragOver  = (e, i) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    setItems((prev) => {
      const next = [...prev];
      const [dragged] = next.splice(dragIdx.current, 1);
      next.splice(i, 0, dragged);
      dragIdx.current = i;
      return next;
    });
  };
  const onDragEnd = () => { dragIdx.current = null; };

  const saveSidebar = () => {
    localStorage.setItem(SIDEBAR_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('admin:sidebar-reordered', { detail: items }));
    setSidebarMsg({ type: 'ok', text: 'Layout saved — sidebar updated!' });
    setTimeout(() => setSidebarMsg(null), 3500);
  };

  const resetSidebar = () => {
    localStorage.removeItem(SIDEBAR_KEY);
    setItems([...DEFAULT_SIDEBAR_ITEMS]);
    window.dispatchEvent(new CustomEvent('admin:sidebar-reordered', { detail: DEFAULT_SIDEBAR_ITEMS }));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <style>{styles}</style>

      {/* ── HERO BANNER ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950">
        {/* dot-grid overlay */}
        <div
          className="as-dot absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="absolute -top-28 -right-20 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full bg-violet-600/25 blur-3xl pointer-events-none" />

        <div className="relative px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar with online dot */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-extrabold bg-white/10 border-2 border-white/20 text-white shadow-2xl backdrop-blur-sm">
                {initials}
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-slate-900 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-white" />
              </span>
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-300 mb-1">Admin Panel</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white truncate leading-tight">
                {user?.name || 'Administrator'}
              </h1>
              <p className="text-sm text-indigo-200/70 mt-0.5 truncate">{user?.email || '—'}</p>
            </div>

            {/* Role chip */}
            <div className="hidden sm:flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] border border-white/10 backdrop-blur-sm text-sm font-semibold text-white">
              <Shield className="w-4 h-4 text-indigo-300 shrink-0" />
              Administrator
            </div>
          </div>
        </div>
      </div>

      {/* ── STICKY TAB BAR ────────────────────────────────────────────────── */}
      <div className={`sticky top-0 z-10 backdrop-blur-md ${
        isDark ? 'bg-slate-950/90 border-b border-white/[0.06]' : 'bg-slate-50/90 border-b border-slate-200/80'
      }`}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex gap-0">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition-all ${
                    active
                      ? `${tab.activeText} ${tab.border}`
                      : `border-transparent ${isDark ? 'text-slate-500 hover:text-slate-300 hover:border-slate-600' : 'text-slate-400 hover:text-slate-600 hover:border-slate-300'}`
                  }`}
                >
                  <tab.icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── TAB CONTENT ───────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8 py-7">
        <div className="max-w-5xl mx-auto">

          {/* ═════════════ PROFILE TAB ═════════════ */}
          {activeTab === 'profile' && (
            <div className="as-in as-d1 max-w-xl">
              <div className={card}>
                {/* Current identity row */}
                <div className={`px-6 py-5 flex items-center gap-4 ${hdivider}`}>
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 ${
                    isDark ? 'bg-blue-500/15 border border-blue-500/20 text-blue-300' : 'bg-blue-50 border border-blue-100 text-blue-600'
                  }`}>
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={labelCls}>Current Name</p>
                    <p className={`text-xl font-bold truncate mt-0.5 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                      {user?.name || '—'}
                    </p>
                    <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{user?.email}</p>
                  </div>
                </div>

                {/* Edit row */}
                <form onSubmit={handleNameSave} className="px-6 py-5 space-y-3">
                  <Label htmlFor="admin-name" className={labelCls}>New Display Name</Label>
                  <div className="flex gap-3">
                    <Input
                      id="admin-name"
                      value={nameVal}
                      onChange={(e) => setNameVal(e.target.value)}
                      placeholder="Enter new display name"
                      className={`${inputCls} flex-1`}
                      autoComplete="name"
                    />
                    <button
                      type="submit"
                      disabled={nameMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white transition-colors shrink-0"
                    >
                      {nameMutation.isPending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Save className="w-3.5 h-3.5" />}
                      Save
                    </button>
                  </div>
                  <Msg msg={nameMsg} />
                </form>
              </div>
            </div>
          )}

          {/* ═════════════ SECURITY TAB ═════════════ */}
          {activeTab === 'security' && (
            <div className="as-in as-d1 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-5 items-start">
              {/* Password form */}
              <div className={card}>
                <div className={`px-6 py-4 flex items-center gap-3 ${hdivider}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-violet-500/15' : 'bg-violet-50'}`}>
                    <Lock className={`w-4 h-4 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Change Password</p>
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Keep your admin account protected</p>
                  </div>
                </div>

                <form onSubmit={handlePwSave} className="px-6 py-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cur-pw" className={labelCls}>Current Password</Label>
                    <PwField id="cur-pw" field="cur" placeholder="Enter current password" />
                  </div>

                  <div className={`border-t my-0.5 ${isDark ? 'border-white/5' : 'border-slate-100'}`} />

                  <div className="space-y-1.5">
                    <Label htmlFor="new-pw" className={labelCls}>New Password</Label>
                    <PwField id="new-pw" field="next" placeholder="Create new password" />
                    {/* strength bar */}
                    {pw.next.length > 0 && (
                      <div className="mt-1.5">
                        <div className="flex gap-1 mb-1">
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                i < pwScore ? strengthColor : (isDark ? 'bg-white/10' : 'bg-slate-200')
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{strengthLabel}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-pw" className={labelCls}>Confirm New Password</Label>
                    <PwField id="confirm-pw" field="confirm" placeholder="Re-enter new password" />
                    {pw.confirm.length > 0 && (
                      <p className={`text-[11px] mt-1 ${
                        pw.next === pw.confirm
                          ? (isDark ? 'text-emerald-400' : 'text-emerald-600')
                          : (isDark ? 'text-red-400' : 'text-red-500')
                      }`}>
                        {pw.next === pw.confirm ? '✓ Passwords match' : '✕ Passwords do not match'}
                      </p>
                    )}
                  </div>

                  <Msg msg={pwMsg} />

                  <button
                    type="submit"
                    disabled={pwMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white transition-colors"
                  >
                    {pwMutation.isPending
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Lock className="w-3.5 h-3.5" />}
                    Update Password
                  </button>
                </form>
              </div>

              {/* Requirements checklist */}
              <div className={`${card} p-5`}>
                <p className={`${labelCls} mb-4`}>Requirements</p>
                <div className="space-y-3">
                  {PWD_CHECKS.map(({ label, fn }) => {
                    const ok = fn(pw.next);
                    return (
                      <div key={label} className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          ok
                            ? (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600')
                            : (isDark ? 'bg-white/5 text-slate-700' : 'bg-slate-100 text-slate-300')
                        }`}>
                          <CheckCircle className="w-3 h-3" />
                        </div>
                        <span className={`text-xs transition-colors ${
                          ok
                            ? (isDark ? 'text-emerald-400' : 'text-emerald-700')
                            : (isDark ? 'text-slate-500' : 'text-slate-400')
                        }`}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className={`mt-5 pt-4 border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                    Strong passwords protect against unauthorized access. Use a unique password not shared with other accounts.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════ SIDEBAR TAB ═════════════ */}
          {activeTab === 'sidebar' && (
            <div className="as-in as-d1 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-5 items-start">

              {/* Reorder list */}
              <div className={card}>
                <div className={`px-6 py-4 ${hdivider}`}>
                  <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Arrange Sidebar Items</p>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Drag rows or use ↑↓ arrows · changes apply instantly after saving
                  </p>
                </div>

                <div className="p-4 space-y-2">
                  {items.map((item, i) => {
                    const Icon = ICON_MAP[item.id];
                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => onDragStart(i)}
                        onDragOver={(e) => onDragOver(e, i)}
                        onDragEnd={onDragEnd}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl border cursor-grab active:cursor-grabbing select-none transition-all ${
                          isDark
                            ? 'bg-white/[0.025] border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.09]'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {/* Position number */}
                        <div className={`w-5 h-5 rounded text-[10px] font-bold font-mono flex items-center justify-center shrink-0 ${
                          isDark ? 'bg-white/5 text-slate-600' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {i + 1}
                        </div>

                        <GripVertical className={`w-4 h-4 shrink-0 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />

                        {/* Icon bubble */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-white/[0.05]' : 'bg-slate-100'}`}>
                          {Icon && <Icon className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />}
                        </div>

                        <span className={`flex-1 text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                          {item.label}
                        </span>

                        {/* Arrow controls */}
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveItem(i, -1)}
                            disabled={i === 0}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-20 ${
                              isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
                            }`}
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(i, 1)}
                            disabled={i === items.length - 1}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-20 ${
                              isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
                            }`}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={`px-4 pb-5 pt-2 flex flex-wrap items-center gap-3 border-t ${isDark ? 'border-white/[0.05]' : 'border-slate-100'}`}>
                  <button
                    type="button"
                    onClick={saveSidebar}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Layout
                  </button>
                  <button
                    type="button"
                    onClick={resetSidebar}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      isDark ? 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-200' : 'border-slate-300 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                  {sidebarMsg && (
                    <span className={`text-xs font-medium ${sidebarMsg.type === 'ok' ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-red-400' : 'text-red-500')}`}>
                      {sidebarMsg.type === 'ok' ? '✓ ' : '✕ '}{sidebarMsg.text}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Live sidebar preview ── */}
              <div className={`${card} overflow-hidden`}>
                <div className={`px-4 py-3 ${hdivider}`}>
                  <p className={labelCls}>Live Preview</p>
                </div>
                <div className="p-3">
                  {/* Mini sidebar shell */}
                  <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-xl">
                    {/* Header */}
                    <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-700/80">
                      <div className="w-4 h-4 rounded bg-white/20 shrink-0" />
                      <div>
                        <p className="text-[11px] font-semibold text-white leading-none">Equimon</p>
                        <p className="text-[9px] text-slate-400 leading-none mt-0.5">Lab Mgmt</p>
                      </div>
                    </div>

                    {/* Nav items */}
                    <div className="p-1.5 space-y-0.5">
                      {items.map((item, i) => {
                        const Icon = ICON_MAP[item.id];
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                              i === 0
                                ? 'bg-white/10 text-white'
                                : 'text-slate-400'
                            }`}
                          >
                            {Icon
                              ? <Icon className="w-3 h-3 shrink-0" />
                              : <div className="w-3 h-3 rounded bg-slate-600 shrink-0" />}
                            <span className="text-[10px] truncate">{item.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-700/60 px-3 py-2 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-white truncate">{user?.name || 'Admin'}</p>
                        <p className="text-[9px] text-slate-500">Administrator</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                    Reorder items on the left to see this preview update. Hit <strong className={isDark ? 'text-slate-400' : 'text-slate-600'}>Save Layout</strong> to apply.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
