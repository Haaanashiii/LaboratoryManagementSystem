import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2,
  GripVertical, ChevronUp, ChevronDown, RotateCcw, Save,
  Shield, LayoutDashboard, Settings, Home, Users, Package,
  BarChart3, CheckSquare, ClipboardList, Wrench, AlertOctagon, Power,
  HardDrive, Trash2, KeyRound,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { api, clearStoredAuth } from '@/api/apiClient';
import { format } from 'date-fns';
import { useLang } from '@/components/i18n/LangContext';
import '@/styles/equimon-admin.css';

const ICON_MAP = {
  dashboard: Home, users: Users, inventory: Package,
  allRequests: BarChart3, equipmentPrep: CheckSquare,
  auditLogs: ClipboardList, settings: Settings,
};

const SIDEBAR_I18N = {
  dashboard: 'dashboard', users: 'users', inventory: 'inventory',
  allRequests: 'allRequests', equipmentPrep: 'equipmentPrep',
  auditLogs: 'auditLogsLabel', settings: 'settings',
};

const DEFAULT_SIDEBAR_ITEMS = [
  { id: 'dashboard',     href: '/dashboard' },
  { id: 'users',         href: '/users' },
  { id: 'inventory',     href: '/inventory' },
  { id: 'allRequests',   href: '/all-requests' },
  { id: 'equipmentPrep', href: '/equipment-prep' },
  { id: 'auditLogs',     href: '/admin-audit-logs' },
  { id: 'settings',      href: '/admin-settings' },
];

const SIDEBAR_KEY = 'admin_sidebar_order';

const loadOrder = () => {
  try {
    const raw = localStorage.getItem(SIDEBAR_KEY);
    if (!raw) return DEFAULT_SIDEBAR_ITEMS;
    const saved = JSON.parse(raw);
    const ids = new Set(saved.map(i => i.id));
    return [
      ...saved.filter(s => DEFAULT_SIDEBAR_ITEMS.some(d => d.id === s.id)),
      ...DEFAULT_SIDEBAR_ITEMS.filter(d => !ids.has(d.id)),
    ];
  } catch { return DEFAULT_SIDEBAR_ITEMS; }
};

const PWD_CHECKS = [
  { labelKey: 'pwdCheck8Chars',  fn: p => p.length >= 8 },
  { labelKey: 'pwdCheck2',       fn: p => /[A-Z]/.test(p) },
  { labelKey: 'pwdCheck3',       fn: p => /[a-z]/.test(p) },
  { labelKey: 'pwdCheck4',       fn: p => /[0-9]/.test(p) },
  { labelKey: 'pwdCheckSpecial', fn: p => /[^A-Za-z0-9]/.test(p) },
];

const TABS = [
  { id: 'security',    labelKey: 'adminTabSecurity',    icon: Shield        },
  { id: 'sidebar',     labelKey: 'adminTabSidebar',     icon: LayoutDashboard },
  { id: 'maintenance', labelKey: 'adminTabMaintenance', icon: Wrench        },
  { id: 'storage',     labelKey: 'adminTabStorage',     icon: HardDrive     },
];

function PasswordField({ id, value, visible, onChange, onToggle, placeholder, autoComplete = 'new-password', disabled = false }) {
  return (
    <div style={{ position: 'relative' }}>
      <Input id={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange}
        placeholder={placeholder} className="h-9 pr-10 text-sm" autoComplete={autoComplete} disabled={disabled} />
      <button type="button" onClick={onToggle} disabled={disabled}
        style={{ position: 'absolute', inset: '0 0 0 auto', display: 'flex', alignItems: 'center', paddingRight: 10, color: 'var(--a-mute)', background: 'none', border: 'none', cursor: 'pointer' }}>
        {visible ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
      </button>
    </div>
  );
}

function Msg({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontFamily: 'var(--sans)', fontSize: 12, borderLeft: `3px solid ${msg.type === 'ok' ? 'var(--a-ok)' : 'var(--a-bad)'}`, background: msg.type === 'ok' ? 'var(--a-ok-bg)' : 'var(--a-bad-bg)', color: msg.type === 'ok' ? 'var(--a-ok)' : 'var(--a-bad)' }}>
      {msg.type === 'ok' ? <CheckCircle style={{ width: 14, height: 14, flexShrink: 0 }} /> : <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />}
      {msg.text}
    </div>
  );
}

const sectionHead = { display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--a-rule)', padding: '18px 22px' };
const navySquare = (size = 36) => ({ width: size, height: size, background: 'var(--a-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 });
const fieldLabel = { fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--a-mute)', display: 'block', marginBottom: 6 };

export default function AdminSettings() {
  const { t } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => api.auth.me() });

  const initials = useMemo(
    () => (user?.name || 'A').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(),
    [user?.name]
  );

  const [activeTab, setActiveTab] = useState('security');

  // ── Security ──────────────────────────────────────────────────────────────
  const [pw, setPw]       = useState({ cur: '', next: '', confirm: '' });
  const [vis, setVis]     = useState({ cur: false, next: false, confirm: false });
  const [pwMsg, setPwMsg]           = useState(null);
  const [pwSuccessModal, setPwSuccessModal] = useState(false);

  const pwScore = useMemo(() => PWD_CHECKS.filter(({ fn }) => fn(pw.next)).length, [pw.next]);
  const strengthKey   = ['', 'strengthWeak', 'strengthWeak', 'strengthFair', 'strengthGood', 'strengthStrong'][pwScore] || '';
  const strengthLabel = strengthKey ? t(strengthKey) : '';
  const strengthColor = ['', '#ef4444', '#ef4444', '#f97316', '#f59e0b', 'var(--a-ok)'][pwScore] || '#ef4444';
  const strengthBars  = [0, 1, 1, 2, 3, 4][pwScore] ?? 0;

  const pwMutation = useMutation({
    mutationFn: data => api.auth.changePassword(data),
    onSuccess: () => {
      setPw({ cur: '', next: '', confirm: '' });
      setPwMsg(null);
      setPwSuccessModal(true);
    },
    onError: err => {
      if (err?.status === 401) {
        clearStoredAuth();
        navigate('/admin-login', { replace: true });
        return;
      }
      setPwMsg({ type: 'err', text: err.message || t('passwordUpdateError') });
    },
  });

  const handlePwSave = e => {
    e.preventDefault();
    if (!pw.cur)             { setPwMsg({ type: 'err', text: t('currentPwRequired') }); return; }
    if (pw.next.length < 8)  { setPwMsg({ type: 'err', text: t('newPwMin8Chars') }); return; }
    if (pw.next !== pw.confirm) { setPwMsg({ type: 'err', text: t('passwordsNoMatch') }); return; }
    setPwMsg(null);
    pwMutation.mutate({ currentPassword: pw.cur, newPassword: pw.next });
  };

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const [items, setItems]       = useState(loadOrder);
  const [sidebarMsg, setSidebarMsg] = useState(null);
  const dragIdx = React.useRef(null);

  const moveItem = useCallback((i, dir) => {
    setItems(prev => {
      const next = [...prev]; const target = i + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[i], next[target]] = [next[target], next[i]]; return next;
    });
  }, []);

  const onDragStart = i => { dragIdx.current = i; };
  const onDragOver  = (e, i) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    setItems(prev => { const next = [...prev]; const [dragged] = next.splice(dragIdx.current, 1); next.splice(i, 0, dragged); dragIdx.current = i; return next; });
  };
  const onDragEnd = () => { dragIdx.current = null; };

  const saveSidebar = () => {
    localStorage.setItem(SIDEBAR_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('admin:sidebar-reordered', { detail: items }));
    setSidebarMsg({ type: 'ok', text: t('sidebarSavedMsg') });
    setTimeout(() => setSidebarMsg(null), 3500);
  };

  const resetSidebar = () => {
    localStorage.removeItem(SIDEBAR_KEY);
    setItems([...DEFAULT_SIDEBAR_ITEMS]);
    window.dispatchEvent(new CustomEvent('admin:sidebar-reordered', { detail: DEFAULT_SIDEBAR_ITEMS }));
  };

  // ── Maintenance ───────────────────────────────────────────────────────────
  const [maintenanceMsg, setMaintenanceMsg] = useState(null);
  const { data: maintenanceData, isLoading: maintenanceLoading, refetch: refetchMaintenance } = useQuery({
    queryKey: ['maintenanceStatus'],
    queryFn: () => api.entities.AdminMaintenance.status(),
    enabled: activeTab === 'maintenance',
  });
  const isMaintenanceOn = maintenanceData?.maintenanceMode === true;

  const maintenanceMutation = useMutation({
    mutationFn: enabled => api.entities.AdminMaintenance.toggle(enabled),
    onSuccess: data => {
      refetchMaintenance();
      setMaintenanceMsg({ type: 'ok', text: data.maintenanceMode ? t('maintenanceTurnedOn') : t('maintenanceTurnedOff') });
      setTimeout(() => setMaintenanceMsg(null), 3500);
    },
    onError: err => setMaintenanceMsg({ type: 'err', text: err.message || t('failedUpdateMaintenance') }),
  });

  const handleToggleMaintenance = () => maintenanceMutation.mutate(!isMaintenanceOn);

  // ── Storage ───────────────────────────────────────────────────────────────
  const [purgeRetentionDays, setPurgeRetentionDays] = useState(90);
  const [purgeCollections, setPurgeCollections] = useState(new Set(['auditLogs', 'notifications', 'equipmentHistory']));
  const [purgeStep, setPurgeStep]     = useState('idle');
  const [purgeResult, setPurgeResult] = useState(null);
  const [purgeMsg, setPurgeMsg]       = useState(null);

  const { data: storageStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['storageStats'],
    queryFn: () => api.entities.AdminStorage.stats(),
    enabled: activeTab === 'storage',
  });

  const purgeMutation = useMutation({
    mutationFn: ({ collections, olderThanDays }) => api.entities.AdminStorage.purge({ collections, olderThanDays }),
    onSuccess: data => { setPurgeStep('idle'); setPurgeResult(data); refetchStats(); },
    onError: err => { setPurgeStep('idle'); setPurgeMsg({ type: 'err', text: err.message || 'Purge failed' }); setTimeout(() => setPurgeMsg(null), 4000); },
  });

  const handlePurge = () => purgeMutation.mutate({ collections: [...purgeCollections], olderThanDays: purgeRetentionDays });

  const toggleCollection = id => {
    setPurgeStep('idle'); setPurgeResult(null);
    setPurgeCollections(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  return (
    <div className="eq-admin" style={{ padding: '24px 28px', minHeight: '100%' }}>

      {/* ── Password Changed Success Modal ── */}
      <Dialog open={pwSuccessModal} onOpenChange={setPwSuccessModal}>
        <DialogContent className="sm:max-w-sm p-0 gap-0 rounded-2xl overflow-hidden" style={{ background: '#fff' }}>
          <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <KeyRound style={{ width: 24, height: 24, color: '#16a34a' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 18, color: 'var(--a-ink)', marginBottom: 6 }}>
                {t('passwordChangedTitle') || 'Password Changed'}
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--a-mute)', lineHeight: 1.5 }}>
                {t('passwordChangedDesc') || 'Your password has been updated successfully. Use your new password the next time you log in.'}
              </div>
            </div>
            <button
              className="a-btn primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
              onClick={() => setPwSuccessModal(false)}
            >
              <CheckCircle style={{ width: 14, height: 14 }} />
              {t('gotIt') || 'Got it'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Title Strip ── */}
      <div className="a-titlestrip">
        <div>
          <div className="a-eyebrow">{t('systemSettingsEyebrow')}</div>
          <h1>{t('settings')}</h1>
          <div className="a-deck">{format(new Date(), 'EEEE, MMMM d, yyyy')}</div>
        </div>
        <div className="a-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--a-rule)', padding: '10px 16px', background: 'var(--a-surface)' }}>
            <div style={{ width: 32, height: 32, background: 'var(--a-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 14, color: 'var(--a-ink)' }}>{user?.name || 'Administrator'}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--a-mute)', marginTop: 2 }}>{user?.email || '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Strip ── */}
      <div className="a-tabs" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button key={tab.id} className={`a-tab${isActive ? ' active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              <div className="t-label"><TabIcon style={{ width: 13, height: 13 }} />{t(tab.labelKey).toUpperCase()}</div>
            </button>
          );
        })}
      </div>

      {/* ══════════════ SECURITY ══════════════ */}
      {activeTab === 'security' && (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 280px', alignItems: 'start' }}>

          {/* Change Password */}
          <div className="a-panel" style={{ marginBottom: 0 }}>
            <div style={sectionHead}>
              <div style={navySquare()}>
                <Lock style={{ width: 15, height: 15, color: '#2563eb' }} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 15, color: 'var(--a-navy)' }}>{t('changePassword')}</div>
                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)', marginTop: 3 }}>{t('keepAdminSecure')}</div>
              </div>
            </div>
            <div style={{ padding: '22px 24px' }}>
              <form onSubmit={handlePwSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Step 1 */}
                <div>
                  <label style={fieldLabel}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: 'var(--a-navy)', color: '#2563eb', fontFamily: 'var(--mono)', fontSize: 8, padding: '1px 5px' }}>1</span>
                      {t('currentPassword')}
                    </span>
                  </label>
                  <PasswordField id="cur-pw" value={pw.cur} visible={vis.cur}
                    onChange={e => setPw(p => ({ ...p, cur: e.target.value }))}
                    onToggle={() => setVis(v => ({ ...v, cur: !v.cur }))}
                    placeholder={t('enterCurrentPassword')} autoComplete="current-password" />
                </div>

                <div style={{ borderTop: '1px dashed var(--a-rule)', display: 'flex', alignItems: 'center', gap: 12, margin: '2px 0' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--a-mute)', background: 'var(--a-surface)', padding: '0 8px', marginTop: -8 }}>{t('newCredentials')}</span>
                </div>

                {/* Step 2 */}
                <div>
                  <label style={fieldLabel}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: 'var(--a-navy)', color: '#2563eb', fontFamily: 'var(--mono)', fontSize: 8, padding: '1px 5px' }}>2</span>
                      {t('newPassword')}
                    </span>
                  </label>
                  <PasswordField id="new-pw" value={pw.next} visible={vis.next}
                    onChange={e => setPw(p => ({ ...p, next: e.target.value }))}
                    onToggle={() => setVis(v => ({ ...v, next: !v.next }))}
                    placeholder={t('createStrongPassword')} />
                  {pw.next.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[0,1,2,3].map(i => (
                          <div key={i} style={{ height: 4, flex: 1, background: i < strengthBars ? strengthColor : 'var(--a-rule-2)', transition: 'background 0.3s' }} />
                        ))}
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: strengthColor, marginTop: 4, letterSpacing: '0.1em' }}>{strengthLabel}</div>
                    </div>
                  )}
                </div>

                {/* Step 3 */}
                <div>
                  <label style={fieldLabel}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: 'var(--a-navy)', color: '#2563eb', fontFamily: 'var(--mono)', fontSize: 8, padding: '1px 5px' }}>3</span>
                      {t('confirmNewPassword')}
                    </span>
                  </label>
                  <PasswordField id="confirm-pw" value={pw.confirm} visible={vis.confirm}
                    onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))}
                    onToggle={() => setVis(v => ({ ...v, confirm: !v.confirm }))}
                    placeholder={t('reEnterNewPassword')} />
                  {pw.confirm.length > 0 && (
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: pw.next === pw.confirm ? 'var(--a-ok)' : 'var(--a-bad)', marginTop: 4 }}>
                      {pw.next === pw.confirm ? t('passwordsMatch') : t('passwordsNoMatch')}
                    </div>
                  )}
                </div>

                <Msg msg={pwMsg} />

                <button type="submit" className="a-btn primary" disabled={pwMutation.isPending} style={{ width: '100%', justifyContent: 'center' }}>
                  {pwMutation.isPending ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Lock style={{ width: 13, height: 13 }} />}
                  {t('updatePassword')}
                </button>
              </form>
            </div>
          </div>

          {/* Requirements Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="a-panel" style={{ marginBottom: 0 }}>
              <div style={sectionHead}>
                <div style={navySquare(32)}>
                  <CheckCircle style={{ width: 14, height: 14, color: '#2563eb' }} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 14, color: 'var(--a-navy)' }}>{t('requirements')}</div>
                  <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11, color: 'var(--a-mute)', marginTop: 2 }}>{t('mustMeetAll4')}</div>
                </div>
              </div>
              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PWD_CHECKS.map(({ labelKey, fn }) => {
                  const ok = fn(pw.next);
                  return (
                    <div key={labelKey} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: `1px solid ${ok ? 'var(--a-ok)' : 'var(--a-rule)'}`, background: ok ? 'var(--a-ok-bg)' : 'var(--a-surface-2)', transition: 'all 0.2s' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: ok ? 'var(--a-ok)' : 'var(--a-rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CheckCircle style={{ width: 12, height: 12, color: ok ? '#fff' : 'var(--a-mute)' }} />
                      </div>
                      <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: ok ? 'var(--a-ok)' : 'var(--a-mute)' }}>{t(labelKey)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ border: '1px solid #2563eb', background: '#dbeafe', padding: '12px 16px' }}>
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: '#1d4ed8', margin: 0, lineHeight: 1.5 }}>
                {t('passphraseHint')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ SIDEBAR ══════════════ */}
      {activeTab === 'sidebar' && (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 240px', alignItems: 'start' }}>
          <div className="a-panel" style={{ marginBottom: 0 }}>
            <div style={sectionHead}>
              <div style={navySquare()}>
                <LayoutDashboard style={{ width: 15, height: 15, color: '#2563eb' }} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 15, color: 'var(--a-navy)' }}>{t('arrangeSidebar')}</div>
                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)', marginTop: 3 }}>{t('arrangeSidebarDesc')}</div>
              </div>
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((item, i) => {
                  const Icon = ICON_MAP[item.id];
                  return (
                    <div key={item.id} draggable onDragStart={() => onDragStart(i)} onDragOver={e => onDragOver(e, i)} onDragEnd={onDragEnd}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid var(--a-rule)', background: 'var(--a-surface-2)', cursor: 'grab', userSelect: 'none', transition: 'all 0.15s' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, background: 'var(--a-navy)', color: '#2563eb', padding: '2px 5px', flexShrink: 0 }}>{i + 1}</span>
                      <GripVertical style={{ width: 14, height: 14, color: 'var(--a-mute-2)', flexShrink: 0 }} />
                      <div style={{ width: 28, height: 28, background: 'var(--a-rule-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {Icon && <Icon style={{ width: 13, height: 13, color: 'var(--a-mute)' }} />}
                      </div>
                      <span style={{ flex: 1, fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--a-ink-2)' }}>{t(SIDEBAR_I18N[item.id] || item.id)}</span>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button type="button" onClick={() => moveItem(i, -1)} disabled={i === 0} className="a-btn" style={{ padding: '4px 6px', opacity: i === 0 ? 0.25 : 1 }}>
                          <ChevronUp style={{ width: 12, height: 12 }} />
                        </button>
                        <button type="button" onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} className="a-btn" style={{ padding: '4px 6px', opacity: i === items.length - 1 ? 0.25 : 1 }}>
                          <ChevronDown style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, borderTop: '1px solid var(--a-rule)', padding: '14px 16px' }}>
              <button className="a-btn primary" onClick={saveSidebar}><Save style={{ width: 13, height: 13 }} />{t('saveLayout')}</button>
              <button className="a-btn" onClick={resetSidebar}><RotateCcw style={{ width: 13, height: 13 }} />{t('resetLabel')}</button>
              {sidebarMsg && <Msg msg={sidebarMsg} />}
            </div>
          </div>

          {/* Live Preview */}
          <div className="a-panel" style={{ marginBottom: 0 }}>
            <div style={sectionHead}>
              <div style={navySquare(32)}>
                <LayoutDashboard style={{ width: 13, height: 13, color: '#2563eb' }} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 14, color: 'var(--a-navy)' }}>{t('livePreview')}</div>
                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11, color: 'var(--a-mute)', marginTop: 2 }}>{t('reflectsCurrentOrder')}</div>
              </div>
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ border: '1px solid var(--a-rule)', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--a-rule)', background: 'var(--a-navy)', padding: '10px 12px' }}>
                  <div style={{ width: 18, height: 18, background: '#2563eb', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 11, color: '#fff' }}>Equimon</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.1em', color: '#2563eb', opacity: 0.8 }}>LAB MANAGEMENT</div>
                  </div>
                </div>
                <div style={{ padding: '6px' }}>
                  {items.map((item, i) => {
                    const Icon = ICON_MAP[item.id];
                    return (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px', background: i === 0 ? 'rgba(37,99,235,0.12)' : 'transparent', borderLeft: i === 0 ? '2px solid #2563eb' : '2px solid transparent' }}>
                        {Icon ? <Icon style={{ width: 11, height: 11, color: i === 0 ? '#2563eb' : 'var(--a-mute)' }} /> : <div style={{ width: 11, height: 11, background: 'var(--a-rule)' }} />}
                        <span style={{ fontFamily: 'var(--sans)', fontSize: 10, color: i === 0 ? 'var(--a-navy)' : 'var(--a-mute)', fontWeight: i === 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(SIDEBAR_I18N[item.id] || item.id)}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ borderTop: '1px solid var(--a-rule)', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 20, height: 20, background: 'var(--a-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 8, fontWeight: 700, color: '#2563eb', flexShrink: 0 }}>{initials}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 600, color: 'var(--a-navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Admin'}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.1em', color: 'var(--a-mute)' }}>ADMINISTRATOR</div>
                  </div>
                </div>
              </div>
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11, color: 'var(--a-mute)', marginTop: 10, lineHeight: 1.5 }}>
                {t('hitSaveToApply')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ STORAGE ══════════════ */}
      {activeTab === 'storage' && (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 280px', alignItems: 'start' }}>
          <div className="a-panel" style={{ marginBottom: 0 }}>
            <div style={sectionHead}>
              <div style={navySquare()}>
                <HardDrive style={{ width: 15, height: 15, color: '#2563eb' }} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 15, color: 'var(--a-navy)' }}>{t('dataRetentionCleanup')}</div>
                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)', marginTop: 3 }}>{t('purgeOldRecordsDesc')}</div>
              </div>
            </div>
            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Record counts */}
              <div>
                <div style={fieldLabel}>{t('currentRecordCounts')}</div>
                {statsLoading ? <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--a-mute)', fontSize: 12 }}>{t('loadingStats')}</p> : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                      { labelKey: 'auditLogsLabel',  value: storageStats?.auditLogs ?? 0,        accent: '#6366f1' },
                      { labelKey: 'notifications',    value: storageStats?.notifications ?? 0,    accent: '#f59e0b' },
                      { labelKey: 'equipmentHistory', value: storageStats?.equipmentHistory ?? 0, accent: '#10b981' },
                    ].map(({ labelKey, value, accent }) => (
                      <div key={labelKey} style={{ border: `1px solid ${accent}33`, background: `${accent}0d`, padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 600, color: accent, lineHeight: 1 }}>{value.toLocaleString()}</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--a-mute)', marginTop: 6 }}>{t(labelKey)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--a-rule)' }} />

              {/* Retention period */}
              <div>
                <div style={fieldLabel}>{t('deleteRecordsOlderThan')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[{ days: 30, label: '30 days' }, { days: 60, label: '60 days' }, { days: 90, label: '90 days' }, { days: 180, label: '6 months' }, { days: 365, label: '1 year' }].map(({ days, label }) => (
                    <button key={days} type="button"
                      className={purgeRetentionDays === days ? 'a-btn danger' : 'a-btn'}
                      style={{ padding: '6px 12px' }}
                      onClick={() => { setPurgeRetentionDays(days); setPurgeStep('idle'); setPurgeResult(null); }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Collections */}
              <div>
                <div style={fieldLabel}>{t('collectionsToClean')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { id: 'auditLogs',        labelKey: 'auditLogsLabel',  descKey: 'auditLogsCollDesc' },
                    { id: 'notifications',    labelKey: 'notifications',   descKey: 'notificationsCollDesc' },
                    { id: 'equipmentHistory', labelKey: 'equipmentHistory', descKey: 'equipmentHistoryCollDesc' },
                  ].map(({ id, labelKey, descKey }) => (
                    <label key={id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', border: '1px solid var(--a-rule)', background: 'var(--a-surface-2)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={purgeCollections.has(id)} onChange={() => toggleCollection(id)}
                        style={{ marginTop: 2, width: 14, height: 14, accentColor: 'var(--a-bad)' }} />
                      <div>
                        <div style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13, color: 'var(--a-ink-2)' }}>{t(labelKey)}</div>
                        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11, color: 'var(--a-mute)', marginTop: 2 }}>{t(descKey)}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <Msg msg={purgeMsg} />

              {purgeResult && (
                <div style={{ border: '1px solid var(--a-ok)', background: 'var(--a-ok-bg)', padding: '12px 16px' }}>
                  <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, color: 'var(--a-ok)', fontSize: 14 }}>
                    {t('purgeCompleteMsg')} — {purgeResult.totalDeleted.toLocaleString()} {t('recordsRemovedLabel')}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--a-ok)', marginTop: 4, letterSpacing: '0.1em' }}>
                    {t('auditShortLabel')}: {purgeResult.results.auditLogs} · {t('notifications')}: {purgeResult.results.notifications} · {t('historyShortLabel')}: {purgeResult.results.equipmentHistory}
                  </div>
                </div>
              )}

              {purgeStep === 'idle' && (
                <button type="button" className="a-btn danger" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                  onClick={() => setPurgeStep('confirm')}
                  disabled={purgeCollections.size === 0 || purgeMutation.isPending}>
                  <Trash2 style={{ width: 14, height: 14 }} />
                  {t('purgeOldRecords')}
                </button>
              )}

              {purgeStep === 'confirm' && (
                <div style={{ border: '1px solid var(--a-bad)', background: 'var(--a-bad-bg)', padding: '16px' }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <AlertCircle style={{ width: 16, height: 16, color: 'var(--a-bad)', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, color: 'var(--a-bad)', fontSize: 14 }}>{t('confirmPurge')}</div>
                      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-bad)', marginTop: 4, lineHeight: 1.5 }}>
                        {t('permanentlyDeleteOlderThan')} <strong>{purgeRetentionDays} {t('daysFromLabel')}</strong>{' '}
                        <strong>{purgeCollections.size} {purgeCollections.size !== 1 ? t('collectionsLabel') : t('collectionLabel')}</strong>. {t('thisCannotBeUndone')}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="a-btn danger" onClick={handlePurge} disabled={purgeMutation.isPending}>
                      {purgeMutation.isPending ? <Loader2 style={{ width: 13, height: 13 }} /> : <Trash2 style={{ width: 13, height: 13 }} />}
                      {t('yesPurgeNow')}
                    </button>
                    <button type="button" className="a-btn" onClick={() => setPurgeStep('idle')} disabled={purgeMutation.isPending}>{t('cancel')}</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Storage Guide */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="a-panel" style={{ marginBottom: 0 }}>
              <div style={sectionHead}>
                <div style={navySquare(32)}>
                  <HardDrive style={{ width: 13, height: 13, color: '#2563eb' }} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 14, color: 'var(--a-navy)' }}>{t('storageGuideTitle')}</div>
                  <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11, color: 'var(--a-mute)', marginTop: 2 }}>{t('storageGuideSubtitle')}</div>
                </div>
              </div>
              <div style={{ padding: '14px' }}>
                {[
                  'storageGuide1',
                  'storageGuide2',
                  'storageGuide3',
                  'storageGuide4',
                ].map((key) => (
                  <div key={key} style={{ display: 'flex', gap: 10, padding: '8px 10px', borderBottom: '1px solid var(--a-rule-2)', alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-ink-2)', lineHeight: 1.5 }}>{t(key)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ border: '1px solid #2563eb', background: '#dbeafe', padding: '12px 16px' }}>
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: '#1d4ed8', margin: 0, lineHeight: 1.5 }}>
                {t('storageExportHint')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MAINTENANCE ══════════════ */}
      {activeTab === 'maintenance' && (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 280px', alignItems: 'start' }}>
          <div className="a-panel" style={{ marginBottom: 0 }}>
            <div style={sectionHead}>
              <div style={{ ...navySquare(), background: isMaintenanceOn ? 'var(--a-bad)' : 'var(--a-ok)' }}>
                <Wrench style={{ width: 15, height: 15, color: '#fff' }} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 15, color: 'var(--a-navy)' }}>{t('maintenanceModeTitle')}</div>
                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)', marginTop: 3 }}>{t('maintenanceModeDesc')}</div>
              </div>
            </div>
            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <div style={fieldLabel}>{t('systemStatusLabel')}</div>
                <span className={`a-pill ${maintenanceLoading ? 'p-mute' : isMaintenanceOn ? 'p-bad' : 'p-ok'}`} style={{ marginTop: 6 }}>
                  <span className="dot" style={{ background: 'currentColor', animation: !maintenanceLoading && isMaintenanceOn ? 'pulse 1.5s infinite' : 'none' }} />
                  {maintenanceLoading ? t('checkingLabel') : isMaintenanceOn ? t('maintenanceOnLabel') : t('systemOperationalLabel')}
                </span>
              </div>

              {isMaintenanceOn && (
                <div style={{ display: 'flex', gap: 12, border: '1px solid var(--a-bad)', background: 'var(--a-bad-bg)', padding: '12px 16px' }}>
                  <AlertOctagon style={{ width: 16, height: 16, color: 'var(--a-bad)', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, color: 'var(--a-bad)', fontSize: 14 }}>{t('maintenanceIsActiveTitle')}</div>
                    <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-bad)', marginTop: 3, lineHeight: 1.5 }}>
                      {t('maintenanceIsActiveDesc')}
                    </div>
                  </div>
                </div>
              )}

              <Msg msg={maintenanceMsg} />

              <button type="button"
                className={`a-btn${isMaintenanceOn ? '' : ' danger'}`}
                style={{ width: '100%', justifyContent: 'center', padding: '10px', background: isMaintenanceOn ? 'var(--a-ok)' : undefined, color: isMaintenanceOn ? '#fff' : undefined, borderColor: isMaintenanceOn ? 'var(--a-ok)' : undefined }}
                onClick={handleToggleMaintenance}
                disabled={maintenanceLoading || maintenanceMutation.isPending}>
                {maintenanceMutation.isPending ? <Loader2 style={{ width: 14, height: 14 }} /> : <Power style={{ width: 14, height: 14 }} />}
                {isMaintenanceOn ? t('disableMaintenanceMode') : t('enableMaintenanceMode')}
              </button>
            </div>
          </div>

          {/* Info panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="a-panel" style={{ marginBottom: 0 }}>
              <div style={sectionHead}>
                <div style={navySquare(32)}>
                  <AlertOctagon style={{ width: 13, height: 13, color: '#2563eb' }} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 14, color: 'var(--a-navy)' }}>{t('whatHappensTitle')}</div>
                  <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11, color: 'var(--a-mute)', marginTop: 2 }}>{t('whenMaintenanceOnSub')}</div>
                </div>
              </div>
              <div style={{ padding: '14px' }}>
                {['maintenanceBullet1', 'maintenanceBullet2', 'maintenanceBullet3', 'maintenanceBullet4'].map((key) => (
                  <div key={key} style={{ display: 'flex', gap: 10, padding: '8px 10px', borderBottom: '1px solid var(--a-rule-2)', alignItems: 'flex-start' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--a-navy)', flexShrink: 0, marginTop: 5 }} />
                    <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-ink-2)', lineHeight: 1.5 }}>{t(key)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ border: '1px solid var(--a-info)', background: 'var(--a-info-bg)', padding: '12px 16px' }}>
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-info)', margin: 0, lineHeight: 1.5 }}>
                {t('maintenanceUsageHint')}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
