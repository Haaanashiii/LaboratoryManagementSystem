import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2,
  GripVertical, ChevronUp, ChevronDown, RotateCcw, Save,
  Shield, LayoutDashboard, Settings, Home, Package,
  CheckSquare, History,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { api } from '@/api/apiClient';
import { format } from 'date-fns';

// ─── Icon map for sidebar preview ────────────────────────────────────────────
const ICON_MAP = {
  dashboard:        Home,
  inventory:        Package,
  pendingApprovals: CheckSquare,
  approvalHistory:  History,
  settings:         Settings,
};

// ─── Default sidebar items (must match sidebar.jsx menuConfig.lecturer) ───────
const DEFAULT_SIDEBAR_ITEMS = [
  { id: 'dashboard',        label: 'Dashboard',         href: '/dashboard' },
  { id: 'inventory',        label: 'Inventory',         href: '/inventory' },
  { id: 'pendingApprovals', label: 'Pending Approvals', href: '/lecturer-approvals' },
  { id: 'approvalHistory',  label: 'Approval History',  href: '/lecturer-approval-history' },
  { id: 'settings',         label: 'Settings',          href: '/lecturer-settings' },
];

const SIDEBAR_KEY = 'lecturer_sidebar_order';

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
  { id: 'security', label: 'Security', icon: Shield,          color: 'bg-violet-50 text-violet-700 border-violet-200', dot: '#8b5cf6' },
  { id: 'sidebar',  label: 'Sidebar',  icon: LayoutDashboard, color: 'bg-amber-50 text-amber-700 border-amber-200',    dot: '#f59e0b' },
];

function PasswordField({
  id,
  value,
  visible,
  onChange,
  onToggle,
  placeholder,
  autoComplete = 'new-password',
  disabled = false,
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-9 pr-10 text-sm"
        autoComplete={autoComplete}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function Msg({ msg }) {
  if (!msg) return null;
  return (
    <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
      msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
    }`}>
      {msg.type === 'ok'
        ? <CheckCircle className="w-3.5 h-3.5 shrink-0" />
        : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
      {msg.text}
    </div>
  );
}

export default function LecturerSettings() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const initials = useMemo(
    () => (user?.name || 'L').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
    [user?.name]
  );

  // ── Active tab ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('security');

  // ── Time-based color ──────────────────────────────────────────────────────
  const h = new Date().getHours();
  const gc =
    h < 12 ? { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' } :
    h < 18 ? { color: '#f97316', bg: '#fff7ed', border: '#fed7aa' } :
             { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' };

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
    if (!pw.cur)                { setPwMsg({ type: 'err', text: 'Current password is required' }); return; }
    if (pw.next.length < 6)     { setPwMsg({ type: 'err', text: 'New password must be at least 6 characters' }); return; }
    if (pw.next !== pw.confirm) { setPwMsg({ type: 'err', text: 'Passwords do not match' }); return; }
    setPwMsg(null);
    pwMutation.mutate({ currentPassword: pw.cur, newPassword: pw.next });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SIDEBAR ‑ reorder + live preview
  // ─────────────────────────────────────────────────────────────────────────
  const [items, setItems]           = useState(loadOrder);
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
    window.dispatchEvent(new CustomEvent('lecturer:sidebar-reordered', { detail: items }));
    setSidebarMsg({ type: 'ok', text: 'Layout saved — sidebar updated!' });
    setTimeout(() => setSidebarMsg(null), 3500);
  };

  const resetSidebar = () => {
    localStorage.removeItem(SIDEBAR_KEY);
    setItems([...DEFAULT_SIDEBAR_ITEMS]);
    window.dispatchEvent(new CustomEvent('lecturer:sidebar-reordered', { detail: DEFAULT_SIDEBAR_ITEMS }));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-4 px-2 py-2">

      {/* ── Hero Banner ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
            style={{ backgroundColor: gc.bg, borderColor: gc.border }}
          >
            <Settings className="h-6 w-6" style={{ color: gc.color }} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Settings</h1>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-600">
            {initials}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold leading-none text-slate-800">{user?.name || 'Lecturer'}</p>
            <p className="mt-0.5 text-[10px] font-medium text-slate-500">{user?.email || '—'}</p>
          </div>
        </div>
      </div>

      {/* ── Tab pills ── */}
      <div className="grid grid-cols-2 gap-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                isActive
                  ? `${tab.color} shadow-sm`
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`rounded-lg p-1.5 ${isActive ? 'bg-white/60' : 'bg-slate-100'}`}>
                <TabIcon className="h-4 w-4" style={isActive ? { color: tab.dot } : { color: '#64748b' }} />
              </div>
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═════════════ SECURITY TAB ═════════════ */}
      {activeTab === 'security' && (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px] items-start">

          {/* ── Change Password card ── */}
          <Card className="border-slate-200 shadow-none overflow-hidden">
            <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 border border-violet-100">
                <Lock className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-800">Change Password</p>
                <p className="text-xs text-slate-400 mt-0.5">Keep your account secure</p>
              </div>
            </div>

            <CardContent className="p-6">
              <form onSubmit={handlePwSave} className="space-y-5">

                {/* Current password */}
                <div className="space-y-1.5">
                  <Label htmlFor="cur-pw" className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-slate-100 text-[9px] font-bold text-slate-500">1</span>
                    Current Password
                  </Label>
                  <PasswordField
                    id="cur-pw"
                    value={pw.cur}
                    visible={vis.cur}
                    onChange={(e) => setPw((p) => ({ ...p, cur: e.target.value }))}
                    onToggle={() => setVis((v) => ({ ...v, cur: !v.cur }))}
                    placeholder="Enter your current password"
                    autoComplete="current-password"
                  />
                </div>

                {/* Divider with label */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-dashed border-slate-200" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">New credentials</span>
                  <div className="flex-1 border-t border-dashed border-slate-200" />
                </div>

                {/* New password */}
                <div className="space-y-1.5">
                  <Label htmlFor="new-pw" className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-slate-100 text-[9px] font-bold text-slate-500">2</span>
                    New Password
                  </Label>
                  <PasswordField
                    id="new-pw"
                    value={pw.next}
                    visible={vis.next}
                    onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                    onToggle={() => setVis((v) => ({ ...v, next: !v.next }))}
                    placeholder="Create a strong password"
                  />
                  {pw.next.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                              i < pwScore ? strengthColor : 'bg-slate-100'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-[11px] font-medium ${
                        pwScore <= 1 ? 'text-red-500' :
                        pwScore === 2 ? 'text-orange-500' :
                        pwScore === 3 ? 'text-yellow-600' : 'text-emerald-600'
                      }`}>{strengthLabel}</p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-pw" className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-slate-100 text-[9px] font-bold text-slate-500">3</span>
                    Confirm New Password
                  </Label>
                  <PasswordField
                    id="confirm-pw"
                    value={pw.confirm}
                    visible={vis.confirm}
                    onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                    onToggle={() => setVis((v) => ({ ...v, confirm: !v.confirm }))}
                    placeholder="Re-enter your new password"
                  />
                  {pw.confirm.length > 0 && (
                    <p className={`text-[11px] mt-1 font-medium flex items-center gap-1 ${
                      pw.next === pw.confirm ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {pw.next === pw.confirm ? '✓ Passwords match' : '✕ Passwords do not match'}
                    </p>
                  )}
                </div>

                <Msg msg={pwMsg} />

                <Button
                  type="submit"
                  disabled={pwMutation.isPending}
                  className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white transition-colors"
                >
                  {pwMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Lock className="w-4 h-4" />}
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* ── Requirements side card ── */}
          <div className="space-y-3">
            <Card className="border-slate-200 shadow-none overflow-hidden">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Requirements</p>
                  <p className="text-xs text-slate-400">Must meet all 4</p>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {PWD_CHECKS.map(({ label, fn }) => {
                    const ok = fn(pw.next);
                    return (
                      <div
                        key={label}
                        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-all duration-200 ${
                          ok
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-slate-100 bg-slate-50/60'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          ok
                            ? 'bg-emerald-500 shadow-sm shadow-emerald-300'
                            : 'bg-slate-200'
                        }`}>
                          <CheckCircle className={`w-3 h-3 ${ok ? 'text-white' : 'text-slate-300'}`} />
                        </div>
                        <span className={`text-xs font-medium leading-tight ${
                          ok ? 'text-emerald-700' : 'text-slate-500'
                        }`}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[11px] leading-relaxed text-slate-400">
                Use a passphrase — a string of random words — for a strong yet memorable password.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ═════════════ SIDEBAR TAB ═════════════ */}
      {activeTab === 'sidebar' && (
        <div className="grid gap-4 lg:grid-cols-[1fr_240px] items-start">
          <Card className="border-slate-200 shadow-none overflow-hidden">
            <div className="border-b border-slate-100 bg-white px-6 py-4">
              <p className="text-sm font-semibold text-slate-800">Arrange Sidebar Items</p>
              <p className="text-xs text-slate-400 mt-0.5">Drag rows or use ↑↓ arrows · changes apply after saving</p>
            </div>
            <CardContent className="p-4 space-y-2">
              {items.map((item, i) => {
                const Icon = ICON_MAP[item.id];
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => onDragStart(i)}
                    onDragOver={(e) => onDragOver(e, i)}
                    onDragEnd={onDragEnd}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 cursor-grab active:cursor-grabbing select-none transition-all"
                  >
                    <div className="w-5 h-5 rounded text-[10px] font-bold font-mono flex items-center justify-center shrink-0 bg-slate-200 text-slate-500">
                      {i + 1}
                    </div>
                    <GripVertical className="w-4 h-4 shrink-0 text-slate-300" />
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-slate-100">
                      {Icon && <Icon className="w-3.5 h-3.5 text-slate-500" />}
                    </div>
                    <span className="flex-1 text-sm font-medium text-slate-700">{item.label}</span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveItem(i, -1)}
                        disabled={i === 0}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-200 text-slate-500 disabled:opacity-20"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(i, 1)}
                        disabled={i === items.length - 1}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-200 text-slate-500 disabled:opacity-20"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-white px-4 py-4">
              <Button onClick={saveSidebar} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
                <Save className="w-3.5 h-3.5" />
                Save Layout
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetSidebar}
                className="gap-2 border-slate-300 text-slate-500 hover:bg-slate-100"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
              {sidebarMsg && (
                <span className={`text-xs font-medium ${sidebarMsg.type === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {sidebarMsg.type === 'ok' ? '✓ ' : '✕ '}{sidebarMsg.text}
                </span>
              )}
            </div>
          </Card>

          {/* Live preview */}
          <Card className="border-slate-200 shadow-none overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-6 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-100">
                <LayoutDashboard className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Live Preview</p>
                <p className="text-xs text-slate-400">Reflects your current order</p>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                {/* Mini header */}
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2.5">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-slate-800 leading-none">Equimon</p>
                    <p className="text-[9px] text-slate-400 leading-none mt-0.5">Lab Management</p>
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
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {Icon
                          ? <Icon className="w-3 h-3 shrink-0" />
                          : <div className="w-3 h-3 rounded bg-slate-300 shrink-0" />}
                        <span className="text-[10px] font-medium truncate">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Footer */}
                <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-700 truncate">{user?.name || 'Lecturer'}</p>
                    <p className="text-[9px] text-slate-400">Lecturer</p>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                Hit <strong className="text-slate-600">Save Layout</strong> to apply.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
