import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2,
  GripVertical, ChevronUp, ChevronDown, RotateCcw, Save,
  Shield, LayoutDashboard, Settings, Home, Package,
  BarChart3, History, KeyRound,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { api, clearStoredAuth } from '@/api/apiClient';
import { useLang } from '@/components/i18n/LangContext';
import '@/styles/equimon-admin.css';

const ICON_MAP = {
  dashboard:       Home,
  finalApprovals:  CheckCircle,
  allRequests:     BarChart3,
  approvalHistory: History,
  inventory:       Package,
  settings:        Settings,
};

const SIDEBAR_I18N = {
  dashboard:       'dashboard',
  finalApprovals:  'finalApprovals',
  allRequests:     'allRequests',
  approvalHistory: 'approvalHistory',
  inventory:       'inventory',
  settings:        'settings',
};

const DEFAULT_SIDEBAR_ITEMS = [
  { id: 'dashboard',       href: '/dashboard' },
  { id: 'finalApprovals',  href: '/head-approvals' },
  { id: 'allRequests',     href: '/all-requests' },
  { id: 'approvalHistory', href: '/head-approval-history' },
  { id: 'inventory',       href: '/inventory' },
  { id: 'settings',        href: '/head-settings' },
];

const SIDEBAR_KEY = 'head_of_lab_sidebar_order';

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
  { id: 'security', labelKey: 'adminTabSecurity', icon: Shield          },
  { id: 'sidebar',  labelKey: 'adminTabSidebar',  icon: LayoutDashboard },
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

const sectionHead = { display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--a-rule)', padding: '10px 18px' };
const navySquare = (size = 36) => ({ width: size, height: size, background: 'var(--a-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 });
const fieldLabel = { fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--a-mute)', display: 'block', marginBottom: 6 };

export default function HeadLabSettings() {
  const { t } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => api.auth.me() });

  const initials = useMemo(
    () => (user?.name || 'H').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(),
    [user?.name]
  );

  const [activeTab, setActiveTab] = useState('security');

  // ── Security ──────────────────────────────────────────────────────────────
  const [pw, setPw]               = useState({ cur: '', next: '', confirm: '' });
  const [vis, setVis]             = useState({ cur: false, next: false, confirm: false });
  const [pwMsg, setPwMsg]         = useState(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const pwScore = useMemo(() => PWD_CHECKS.filter(({ fn }) => fn(pw.next)).length, [pw.next]);
  const strengthKey   = ['', 'strengthWeak', 'strengthWeak', 'strengthFair', 'strengthGood', 'strengthStrong'][pwScore] || '';
  const strengthLabel = strengthKey ? t(strengthKey) : '';
  const strengthColor = ['', '#ef4444', '#ef4444', '#f97316', '#f59e0b', 'var(--a-ok)'][pwScore] || '#ef4444';
  const strengthBars  = [0, 1, 1, 2, 3, 4][pwScore] ?? 0;

  const pwMutation = useMutation({
    mutationFn: data => api.auth.changePassword(data),
    onSuccess: () => { setPw({ cur: '', next: '', confirm: '' }); setPwMsg(null); setPwSuccess(true); },
    onError: err => {
      if (err?.status === 401) { clearStoredAuth(); navigate('/admin-login', { replace: true }); return; }
      setPwMsg({ type: 'err', text: err.message || t('passwordUpdateError') });
    },
  });

  const handlePwSave = e => {
    e.preventDefault();
    if (!pw.cur)               { setPwMsg({ type: 'err', text: t('currentPwRequired') }); return; }
    if (pw.next.length < 8)    { setPwMsg({ type: 'err', text: t('newPwMin8Chars') }); return; }
    if (pw.next !== pw.confirm) { setPwMsg({ type: 'err', text: t('passwordsNoMatch') }); return; }
    setPwMsg(null);
    pwMutation.mutate({ currentPassword: pw.cur, newPassword: pw.next });
  };

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const [items, setItems]           = useState(loadOrder);
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
    window.dispatchEvent(new CustomEvent('head_of_lab:sidebar-reordered', { detail: items }));
    setSidebarMsg({ type: 'ok', text: t('sidebarSavedMsg') });
    setTimeout(() => setSidebarMsg(null), 3500);
  };

  const resetSidebar = () => {
    localStorage.removeItem(SIDEBAR_KEY);
    setItems([...DEFAULT_SIDEBAR_ITEMS]);
    window.dispatchEvent(new CustomEvent('head_of_lab:sidebar-reordered', { detail: DEFAULT_SIDEBAR_ITEMS }));
  };

  return (
    <div className="eq-admin" style={{ padding: '24px 28px', minHeight: '100%' }}>

      {/* ── Title Strip ── */}
      <div className="a-titlestrip" style={{ padding: '12px 22px' }}>
        <div>
          <div className="a-eyebrow">{t('headLabSettingsEyebrow')}</div>
          <h1>{t('settings')}</h1>
          <div className="a-deck">{t('managePreferencesSidebar')}</div>
        </div>
        <div className="a-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--a-rule)', padding: '10px 16px', background: 'var(--a-surface)' }}>
            <div style={{ width: 32, height: 32, background: 'var(--a-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 14, color: 'var(--a-ink)' }}>{user?.name || 'Head of Lab'}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--a-mute)', marginTop: 2 }}>{user?.email || '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Strip ── */}
      <div className="a-tabs" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button key={tab.id} className={`a-tab${isActive ? ' active' : ''}`} onClick={() => setActiveTab(tab.id)} style={{ padding: '10px 16px' }}>
              <div className="t-label"><TabIcon style={{ width: 13, height: 13 }} />{t(tab.labelKey).toUpperCase()}</div>
            </button>
          );
        })}
      </div>

      {/* ══════════════ SECURITY ══════════════ */}
      {activeTab === 'security' && (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 280px', alignItems: 'start' }}>
          <div className="a-panel" style={{ marginBottom: 0 }}>
            <div style={sectionHead}>
              <div style={navySquare()}>
                <Lock style={{ width: 15, height: 15, color: '#2563eb' }} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 15, color: 'var(--a-navy)' }}>{t('changePassword')}</div>
                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)', marginTop: 3 }}>{t('keepAccountSecureSub')}</div>
              </div>
            </div>
            <div style={{ padding: '12px 20px' }}>
              <form onSubmit={handlePwSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 600, color: 'var(--a-navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Head of Lab'}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.1em', color: 'var(--a-mute)' }}>HEAD OF LAB</div>
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

      {/* ── Password Success Modal ── */}
      <Dialog open={pwSuccess} onOpenChange={setPwSuccess}>
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
            <button className="a-btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} onClick={() => setPwSuccess(false)}>
              <CheckCircle style={{ width: 14, height: 14 }} />
              {t('gotIt') || 'Got it'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
