import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, clearStoredAuth } from '@/api/apiClient';
import {
  Lock, Loader2, Eye, EyeOff,
  CheckCircle, ArrowLeft, AlertCircle, Shield,
} from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';
import { useTheme } from '@/components/hooks/ThemeContext';

const PWD_CHECKS = [
  { labelKey: 'pwdCheck1', fn: (p) => p.length >= 6 },
  { labelKey: 'pwdCheck2', fn: (p) => /[A-Z]/.test(p) },
  { labelKey: 'pwdCheck3', fn: (p) => /[a-z]/.test(p) },
  { labelKey: 'pwdCheck4', fn: (p) => /[0-9]/.test(p) },
];

const profileStyles = `
  @keyframes pfUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .pf-up { opacity: 0; animation: pfUp 0.45s cubic-bezier(0.16,1,0.3,1) forwards; }
  .pf-d1 { animation-delay: 0.04s; }
  .pf-d2 { animation-delay: 0.12s; }
  .pf-d3 { animation-delay: 0.20s; }
  .pf-d4 { animation-delay: 0.28s; }
  .pf-up button:hover { filter: none !important; }
`;

function PwField({ id, value, visible, onChange, onToggle, onKeyDown, placeholder, autoComplete = 'new-password', disabled = false, isDark }) {
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className={`w-full h-11 rounded-xl px-4 pr-11 text-sm border outline-none transition-all ${
          isDark
            ? 'bg-white/[0.04] border-white/[0.10] text-slate-100 placeholder:text-slate-500 focus:border-blue-500/60 focus:bg-white/[0.06] disabled:opacity-40'
            : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 disabled:opacity-40'
        }`}
      />
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`absolute inset-y-0 right-0 flex items-center pr-3.5 disabled:opacity-30 cursor-default ${
          isDark ? 'text-slate-500' : 'text-slate-400'
        }`}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const { t }       = useLang();
  const navigate    = useNavigate();
  const { isDark }  = useTheme();

  // Lock scroll on desktop so the 3-col layout fills the viewport
  React.useEffect(() => {
    const el = document.querySelector('main');
    if (!el) return;
    const prev = el.style.overflowY;
    const apply = () => {
      if (window.innerWidth >= 1024) {
        el.style.overflowY = 'hidden';
        document.body.style.overflowY = 'hidden';
      } else {
        el.style.overflowY = prev;
        document.body.style.overflowY = '';
      }
    };
    apply();
    window.addEventListener('resize', apply);
    return () => {
      window.removeEventListener('resize', apply);
      el.style.overflowY = prev;
      document.body.style.overflowY = '';
    };
  }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn:  () => api.auth.me(),
  });

  const initials = useMemo(
    () => (user?.name || 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
    [user?.name],
  );

  const joinedDate = useMemo(() => {
    if (!user?.createdAt) return '—';
    return new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [user?.createdAt]);

  // ── Password state ──────────────────────────────────────────────────────────
  const [pw,  setPw]  = useState({ cur: '', next: '', confirm: '' });
  const [vis, setVis] = useState({ cur: false, next: false, confirm: false });
  const [pwMsg,       setPwMsg]       = useState(null);
  const [curVerified, setCurVerified] = useState(false);
  const [verifyMsg,   setVerifyMsg]   = useState(null);

  const pwScore = useMemo(() => PWD_CHECKS.filter(({ fn }) => fn(pw.next)).length, [pw.next]);
  const strengthLabels = ['', t('strengthWeak'), t('strengthFair'), t('strengthGood'), t('strengthStrong')];
  const strengthColor  = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'][pwScore] || '#ef4444';
  const strengthBarCls = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400'][pwScore] || '';

  const verifyMutation = useMutation({
    mutationFn: (password) => api.auth.verifyPassword(password),
    onSuccess:  () => { setCurVerified(true); setVerifyMsg(null); },
    onError:    (err) => setVerifyMsg(err.message || t('incorrectPasswordTryAgain')),
  });

  const pwMutation = useMutation({
    mutationFn: (data) => api.auth.changePassword(data),
    onSuccess: () => {
      setPw({ cur: '', next: '', confirm: '' });
      setCurVerified(false); setPwMsg(null);
      toast.success(t('passwordChangedSuccess'), { description: t('newPasswordIsNowActive'), duration: 3000 });
    },
    onError: (err) => {
      if (err?.status === 401) { clearStoredAuth(); navigate('/login', { replace: true }); return; }
      toast.error(err.message || t('passwordUpdateError'));
    },
  });

  const handleVerify = () => {
    if (!pw.cur) { setVerifyMsg(t('pleaseEnterCurrentPassword')); return; }
    setVerifyMsg(null);
    verifyMutation.mutate(pw.cur);
  };

  const handleResetVerify = () => {
    setCurVerified(false); setVerifyMsg(null);
    setPw({ cur: '', next: '', confirm: '' }); setPwMsg(null);
  };

  const handlePwSave = (e) => {
    e.preventDefault();
    if (pw.next.length < 6)    { setPwMsg({ type: 'err', text: t('newPwMinLength') }); return; }
    if (pw.next === pw.cur)     { setPwMsg({ type: 'err', text: t('newPasswordMustDiffer') }); return; }
    if (pw.next !== pw.confirm) { setPwMsg({ type: 'err', text: t('passwordsDoNotMatch') }); return; }
    setPwMsg(null);
    pwMutation.mutate({ currentPassword: pw.cur, newPassword: pw.next });
  };

  const roleLabel = (role) => {
    const map = { student: t('student'), admin: t('administrator'), lecturer: t('lecturer'), head_of_lab: t('head_of_lab'), lab_assistant: t('lab_assistant') };
    return map[role] || role?.replace(/_/g, ' ') || t('user');
  };

  const step = !curVerified ? 1 : pw.next.length > 0 ? 3 : 2;

  const surface  = isDark ? 'glass-dark' : 'glass-light';
  const txt      = isDark ? 'text-white'     : 'text-slate-900';
  const txtsub   = isDark ? 'text-slate-400' : 'text-slate-500';
  const txtmut   = isDark ? 'text-slate-500' : 'text-slate-400';
  const divider  = isDark ? 'border-white/[0.07]' : 'border-white/50';

  return (
    <div className="space-y-4 sm:space-y-5">
      <style>{profileStyles}</style>

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="pf-up pf-d1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={`text-[10px] font-semibold tracking-widest uppercase mb-1 ${txtmut}`}>
            {t('account')} · {t('profile')}
          </p>
          <h1 className={`text-xl sm:text-2xl font-bold ${txt}`}>{t('profileSettings')}</h1>
          <p className={`text-sm mt-1 ${txtsub}`}>
            {t('updateAccountInfoAndPassword')}
          </p>
        </div>
        <button
          onClick={() => navigate('/settings')}
          className={`self-start flex items-center gap-1.5 text-sm font-medium px-3 py-2 sm:px-4 rounded-xl border shrink-0 ${
            isDark
              ? 'border-white/[0.15] text-slate-300'
              : 'border-slate-200 text-slate-600'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden xs:inline">{t('backToSettings')}</span>
          <span className="xs:hidden">{t('back')}</span>
        </button>
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────────── */}
      {/* Mobile: 1-col stack | Tablet (md): password + sidebar 2-col | Desktop (lg): full 3-col */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] lg:grid-cols-[280px_1fr_240px] gap-4 sm:gap-5 items-start">

        {/* ── LEFT: Account details — hidden on mobile until md, then col 1 row 1 on lg ── */}
        <div className="pf-up pf-d2 space-y-4 md:order-last lg:order-first md:col-span-full lg:col-span-1 pointer-events-none select-none">

          {/* On mobile: horizontal compact card; on md+: vertical card */}
          <div className={`rounded-2xl overflow-hidden ${surface}`}>
            <div className={`px-4 sm:px-5 py-3 border-b ${divider}`}>
              <p className={`text-[10px] font-semibold tracking-widest uppercase ${txtmut}`}>
                {t('accountDetails')}
              </p>
            </div>

            <div className="px-4 sm:px-5 py-4 sm:py-5">
              {/* Mobile: horizontal row. Desktop: centered column */}
              <div className="flex flex-row gap-4 items-center md:flex-col md:items-center md:text-center mb-4 sm:mb-5">
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-lg sm:text-xl md:text-2xl font-bold text-white shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                    boxShadow: '0 0 24px rgba(99,102,241,0.35)',
                  }}
                >
                  {initials}
                </div>
                <div className="min-w-0 md:text-center">
                  <p className={`text-sm font-bold truncate ${txt}`}>{user?.name || '—'}</p>
                  <p className={`text-xs mt-0.5 truncate ${txtsub}`}>{user?.email || '—'}</p>
                  <span
                    className="mt-1.5 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{
                      background: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.10)',
                      border:     '1px solid rgba(59,130,246,0.30)',
                      color:      isDark ? '#93c5fd' : '#2563eb',
                    }}
                  >
                    {roleLabel(user?.role)}
                  </span>
                </div>
              </div>

              <div className={`border-t mb-3 sm:mb-4 ${divider}`} />

              {/* Info rows — 2-col on mobile, 1-col on md+ */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-1 md:gap-y-3.5">
                {user?.studentId && (
                  <div>
                    <p className={`text-[9px] font-semibold uppercase tracking-widest mb-0.5 ${txtmut}`}>
                      {t('studentId')}
                    </p>
                    <p className={`text-xs sm:text-sm font-bold font-mono-jb tracking-wide ${txt}`}>{user.studentId}</p>
                  </div>
                )}
                {user?.department && (
                  <div>
                    <p className={`text-[9px] font-semibold uppercase tracking-widest mb-0.5 ${txtmut}`}>
                      {t('department')}
                    </p>
                    <p className={`text-xs sm:text-sm font-semibold ${txt}`}>{user.department}</p>
                  </div>
                )}
                <div>
                  <p className={`text-[9px] font-semibold uppercase tracking-widest mb-0.5 ${txtmut}`}>
                    {t('joined')}
                  </p>
                  <p className={`text-xs sm:text-sm font-semibold ${txt}`}>{joinedDate}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stay secure tip */}
          <div className={`rounded-2xl px-4 py-3 sm:py-4 flex items-start gap-3 ${
            isDark
              ? 'bg-blue-500/[0.07] border border-blue-500/[0.18]'
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <Shield className={`w-4 h-4 mt-0.5 shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
            <div>
              <p className={`text-xs font-semibold mb-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                {t('staySecure')}
              </p>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-blue-300/70' : 'text-blue-600/80'}`}>
                {t('securityTip')}
              </p>
            </div>
          </div>
        </div>

        {/* ── MIDDLE: Change password — col 1 on md, col 2 on lg ── */}
        <div className={`pf-up pf-d3 rounded-2xl overflow-hidden md:order-first lg:order-none ${surface}`}>

          {/* Card header */}
          <div className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5 border-b ${divider}`}>
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: isDark ? 'rgba(100,116,139,0.14)' : 'rgba(100,116,139,0.09)',
                border:     '1px solid rgba(100,116,139,0.24)',
              }}
            >
              <Lock className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} />
            </div>
            <div>
              <p className={`text-sm sm:text-base font-bold ${txt}`}>{t('changePassword')}</p>
              <p className={`text-xs mt-0.5 ${txtsub}`}>{t('keepAccountSecure')}</p>
            </div>
          </div>

          {/* Stepper */}
          <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b ${divider}`}>
            <div className="flex items-center">
              {[
                { n: 1, label: t('verifyIdentity') },
                { n: 2, label: t('newPassword')     },
                { n: 3, label: t('confirm')         },
              ].map(({ n, label }, idx) => {
                const done   = (n === 1 && curVerified) || n < step;
                const active = n === step;
                return (
                  <React.Fragment key={n}>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all duration-200"
                        style={{
                          background: done   ? '#22c55e'
                                    : active ? '#3b82f6'
                                    : isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                          color: done || active ? '#fff' : isDark ? '#475569' : '#94a3b8',
                          boxShadow: active ? '0 0 10px rgba(59,130,246,0.4)' : 'none',
                        }}
                      >
                        {done ? '✓' : n}
                      </div>
                      <span className={`hidden sm:inline text-xs font-medium whitespace-nowrap ${
                        active ? (isDark ? 'text-slate-200' : 'text-slate-800')
                        : done  ? (isDark ? 'text-emerald-400' : 'text-emerald-600')
                                : (isDark ? 'text-slate-600'   : 'text-slate-400')
                      }`}>
                        {label}
                      </span>
                    </div>
                    {idx < 2 && (
                      <div className={`flex-1 mx-2 sm:mx-3 h-px transition-colors duration-300 ${
                        n < step
                          ? isDark ? 'bg-emerald-500/40' : 'bg-emerald-300'
                          : isDark ? 'bg-white/[0.08]'   : 'bg-slate-200'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handlePwSave} className="px-4 sm:px-6 py-5 sm:py-6 space-y-4 sm:space-y-5">

            {/* Step 1 — current password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="cur-pw" className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {t('currentPassword')}
                </label>
                {curVerified && (
                  <button
                    type="button"
                    onClick={handleResetVerify}
                    className={`text-[11px] underline underline-offset-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                  >
                    {t('change')}
                  </button>
                )}
              </div>

              {!curVerified ? (
                <>
                  <PwField
                    id="cur-pw"
                    value={pw.cur} visible={vis.cur}
                    onChange={(e) => { setPw((p) => ({ ...p, cur: e.target.value })); setVerifyMsg(null); }}
                    onToggle={() => setVis((v) => ({ ...v, cur: !v.cur }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleVerify(); } }}
                    placeholder={t('enterCurrentPassword')}
                    autoComplete="current-password"
                    isDark={isDark}
                  />
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={verifyMutation.isPending || !pw.cur}
                    className="w-full h-10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                      boxShadow: pw.cur ? '0 0 16px rgba(59,130,246,0.3)' : 'none',
                    }}
                  >
                    {verifyMutation.isPending
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <><Lock className="w-4 h-4" /> {t('verifyAndContinue')}</>
                    }
                  </button>
                  {verifyMsg && (
                    <p className={`flex items-center gap-1.5 text-[11px] font-medium ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {verifyMsg}
                    </p>
                  )}
                </>
              ) : (
                <div className={`flex items-center gap-2 h-10 rounded-xl border px-3 text-sm ${
                  isDark
                    ? 'border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}>
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  {t('currentPasswordConfirmed')}
                </div>
              )}
            </div>

            {/* Steps 2 + 3 — gated behind verification */}
            {curVerified && (
              <>
                <div className={`border-t border-dashed ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`} />

                {/* New password */}
                <div className="space-y-2">
                  <label htmlFor="new-pw" className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t('newPassword')}
                  </label>
                  <PwField
                    id="new-pw" value={pw.next} visible={vis.next}
                    onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                    onToggle={() => setVis((v) => ({ ...v, next: !v.next }))}
                    placeholder={t('createStrongPassword')} isDark={isDark}
                  />
                  {pw.next.length > 0 && pw.next === pw.cur && (
                    <p className={`flex items-center gap-1.5 text-[11px] font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {t('newPasswordMustDiffer')}
                    </p>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-2">
                  <label htmlFor="confirm-pw" className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t('confirmNewPassword')}
                  </label>
                  <PwField
                    id="confirm-pw" value={pw.confirm} visible={vis.confirm}
                    onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                    onToggle={() => setVis((v) => ({ ...v, confirm: !v.confirm }))}
                    placeholder={t('reEnterNewPassword')}
                    disabled={pw.next.length === 0 || pw.next === pw.cur}
                    isDark={isDark}
                  />
                  {pw.confirm.length > 0 && (
                    <p className={`text-[11px] font-medium flex items-center gap-1 ${
                      pw.next === pw.confirm
                        ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                        : isDark ? 'text-red-400'     : 'text-red-500'
                    }`}>
                      {pw.next === pw.confirm ? `✓ ${t('passwordsMatch')}` : `✕ ${t('passwordsDoNotMatch')}`}
                    </p>
                  )}
                </div>

                {pwMsg && (
                  <div className={`flex items-center gap-2.5 text-xs rounded-xl px-4 py-3 border ${
                    pwMsg.type === 'ok'
                      ? isDark ? 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : isDark ? 'bg-red-900/30 text-red-300 border-red-700/40'             : 'bg-red-50 text-red-600 border-red-200'
                  }`}>
                    {pwMsg.type === 'ok'
                      ? <CheckCircle className="w-4 h-4 shrink-0" />
                      : <AlertCircle className="w-4 h-4 shrink-0" />}
                    {pwMsg.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pwMutation.isPending || pw.next === pw.cur || pw.next.length === 0 || pw.next !== pw.confirm}
                  className="w-full h-10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                    boxShadow: '0 0 16px rgba(59,130,246,0.3)',
                  }}
                >
                  {pwMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('updating')}</>
                    : <><Lock className="w-4 h-4" /> {t('updatePassword')}</>
                  }
                </button>
              </>
            )}
          </form>
        </div>

        {/* ── RIGHT: Requirements + Strength — col 2 on md, col 3 on lg ── */}
        <div className="pf-up pf-d4 space-y-4">

          {/* Requirements card */}
          <div className={`rounded-2xl overflow-hidden ${surface}`}>
            <div className={`flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b ${divider}`}>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: isDark ? 'rgba(34,197,94,0.14)' : 'rgba(34,197,94,0.10)',
                  border:     '1px solid rgba(34,197,94,0.28)',
                }}
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className={`text-sm font-bold ${txt}`}>{t('requirements')}</p>
                <p className={`text-xs ${txtsub}`}>{t('mustMeetAll4')}</p>
              </div>
            </div>

            <div className="p-3 sm:p-4 space-y-2">
              {PWD_CHECKS.map(({ labelKey, fn }) => {
                const ok = fn(pw.next);
                return (
                  <div
                    key={labelKey}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 sm:py-2.5 transition-all duration-200 ${
                      ok
                        ? isDark ? 'border-emerald-500/30 bg-emerald-500/[0.07]' : 'border-emerald-200 bg-emerald-50'
                        : isDark ? 'border-white/[0.06] bg-white/[0.02]'         : 'border-slate-200/60 bg-slate-50/40'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-200 ${
                      ok
                        ? 'border-emerald-500 bg-emerald-500'
                        : isDark ? 'border-slate-600 bg-transparent' : 'border-slate-300 bg-transparent'
                    }`}>
                      {ok && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className={`text-xs font-medium ${
                      ok
                        ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                        : isDark ? 'text-slate-400'   : 'text-slate-500'
                    }`}>
                      {t(labelKey)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strength card */}
          <div className={`rounded-2xl px-4 sm:px-5 py-4 ${surface}`}>
            <p className={`text-xs font-semibold mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {t('strengthProgress')}
            </p>
            <div className="flex gap-1.5 mb-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    i < pwScore ? strengthBarCls : isDark ? 'bg-white/[0.08]' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <p
              className="text-xs font-semibold"
              style={{ color: pwScore === 0 ? (isDark ? '#475569' : '#94a3b8') : strengthColor }}
            >
              {pwScore === 0
                ? t('enterAPassword')
                : `${pwScore}/4 — ${strengthLabels[pwScore]}`}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
