import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Lock, Loader2, Eye, EyeOff,
  CheckCircle, ArrowLeft, AlertCircle,
  ShieldCheck, UserCircle2, ShieldCheck as ShieldOk,
} from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';
import { useTheme } from '@/components/hooks/ThemeContext';

// ─── Password requirement checks ─────────────────────────────────────────────
const PWD_CHECKS = [
  { labelKey: 'pwdCheck1', fn: (p) => p.length >= 6 },
  { labelKey: 'pwdCheck2', fn: (p) => /[A-Z]/.test(p) },
  { labelKey: 'pwdCheck3', fn: (p) => /[a-z]/.test(p) },
  { labelKey: 'pwdCheck4', fn: (p) => /[0-9]/.test(p) },
];

const profileStyles = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .pf-fade-up { opacity: 0; animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
  .pf-fade-up-1 { animation-delay: 0.04s; }
  .pf-fade-up-2 { animation-delay: 0.14s; }
  .pf-fade-up-3 { animation-delay: 0.24s; }
  .pf-fade-up-4 { animation-delay: 0.34s; }
  .pf-fade-up-5 { animation-delay: 0.44s; }
`;

// ─── Reusable password field ──────────────────────────────────────────────────
function PasswordField({ id, value, visible, onChange, onToggle, placeholder, autoComplete = 'new-password', disabled = false, isDark = false }) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={isDark ? { background: '#1e293b', color: '#f1f5f9', borderColor: 'rgba(255,255,255,0.1)' } : {}}
        className={`h-10 pr-10 text-sm transition-colors ${
          isDark
            ? 'border-white/10 placeholder:text-slate-500 focus:border-blue-500'
            : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
        }`}
        autoComplete={autoComplete}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`absolute inset-y-0 right-0 flex items-center pr-3 disabled:opacity-40 disabled:cursor-not-allowed ${
          isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ─── Inline message ───────────────────────────────────────────────────────────
function Msg({ msg, isDark = false }) {
  if (!msg) return null;
  return (
    <div className={`flex items-center gap-2.5 text-xs rounded-xl px-4 py-3 border ${
      msg.type === 'ok'
        ? isDark ? 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : isDark ? 'bg-red-900/30 text-red-300 border-red-700/40' : 'bg-red-50 text-red-600 border-red-200'
    }`}>
      {msg.type === 'ok'
        ? <CheckCircle className="w-4 h-4 shrink-0" />
        : <AlertCircle className="w-4 h-4 shrink-0" />}
      {msg.text}
    </div>
  );
}


export default function ProfilePage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { isDark } = useTheme();

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
    queryFn: () => api.auth.me(),
  });

  const initials = useMemo(
    () => (user?.name || 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
    [user?.name]
  );

  // ── Password state ────────────────────────────────────────────────────────
  const [pw, setPw]        = useState({ cur: '', next: '', confirm: '' });
  const [vis, setVis]      = useState({ cur: false, next: false, confirm: false });
  const [pwMsg, setPwMsg]  = useState(null);
  const [curVerified, setCurVerified] = useState(false);
  const [verifyMsg, setVerifyMsg]     = useState(null);

  const pwScore = useMemo(
    () => PWD_CHECKS.filter(({ fn }) => fn(pw.next)).length,
    [pw.next]
  );
  const strengthLabels = ['', t('strengthWeak'), t('strengthFair'), t('strengthGood'), t('strengthStrong')];
  const strengthLabel = strengthLabels[pwScore] || '';
  const strengthColor = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400'][pwScore] || 'bg-red-500';

  const verifyMutation = useMutation({
    mutationFn: (password) => api.auth.verifyPassword(password),
    onSuccess: () => {
      setCurVerified(true);
      setVerifyMsg(null);
    },
    onError: (err) => setVerifyMsg(err.message || t('incorrectPasswordTryAgain')),
  });

  const handleVerify = () => {
    if (!pw.cur) { setVerifyMsg(t('pleaseEnterCurrentPassword')); return; }
    setVerifyMsg(null);
    verifyMutation.mutate(pw.cur);
  };

  const handleResetVerify = () => {
    setCurVerified(false);
    setVerifyMsg(null);
    setPw({ cur: '', next: '', confirm: '' });
    setPwMsg(null);
  };

  const pwMutation = useMutation({
    mutationFn: (data) => api.auth.changePassword(data),
    onSuccess: () => {
      setPw({ cur: '', next: '', confirm: '' });
      setCurVerified(false);
      setPwMsg(null);
      toast.success(t('passwordChangedSuccess'), {
        description: t('newPasswordIsNowActive'),
        duration: 3000,
      });
    },
    onError: (err) => {
      toast.error(err.message || t('passwordUpdateError'));
    },
  });

  const handlePwSave = (e) => {
    e.preventDefault();
    if (pw.next.length < 6)     { setPwMsg({ type: 'err', text: t('newPwMinLength') }); return; }
    if (pw.next === pw.cur)      { setPwMsg({ type: 'err', text: t('newPasswordMustDiffer') }); return; }
    if (pw.next !== pw.confirm)  { setPwMsg({ type: 'err', text: t('passwordsDoNotMatch') }); return; }
    setPwMsg(null);
    pwMutation.mutate({ currentPassword: pw.cur, newPassword: pw.next });
  };

  const roleLabel = (role) => {
    const map = {
      student: t('student'),
      admin: t('administrator'),
      lecturer: t('lecturer'),
      head_of_lab: t('head_of_lab'),
      lab_assistant: t('lab_assistant'),
    };
    return map[role] || role?.replace(/_/g, ' ') || t('user');
  };

  const roleBadge = isDark ? {
    admin:         'bg-red-500/20 text-red-300 border-red-500/30',
    lecturer:      'bg-violet-500/20 text-violet-300 border-violet-500/30',
    head_of_lab:   'bg-amber-500/20 text-amber-300 border-amber-500/30',
    lab_assistant: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  } : {
    admin:         'bg-red-100 text-red-700 border-red-200',
    lecturer:      'bg-violet-100 text-violet-700 border-violet-200',
    head_of_lab:   'bg-amber-100 text-amber-700 border-amber-200',
    lab_assistant: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };

  return (
    <div className={`w-full space-y-6 px-2 pt-0 pb-2 min-h-screen overflow-hidden ${isDark ? 'bg-slate-950' : ''}`}>
      <style>{profileStyles}</style>

      {/* ── Page Header ── */}
      <div className={`pf-fade-up pf-fade-up-1 flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-6 py-5 shadow-sm ${
        isDark ? 'bg-[#0d0d14] border-white/[0.08]' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${
            isDark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}>
            <UserCircle2 className={`h-6 w-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          </div>
          <div>
            <p className={`text-[11px] font-medium uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('account')}</p>
            <h1 className={`text-xl font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{t('profileSettings')}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 ${
            isDark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-slate-50 border-slate-100'
          }`}>
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
              isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-600'
            }`}>
              {initials}
            </div>
            <div className="text-left">
              <p className={`text-sm font-semibold leading-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{user?.name || t('user')}</p>
              <p className={`mt-0.5 text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{user?.email || '—'}</p>
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              isDark
                ? 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="w-4 h-4" /> {t('back')}
          </button>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">

        {/* ── LEFT: Account Info Sidebar ── */}
        <div className="pf-fade-up pf-fade-up-2 space-y-4 lg:sticky lg:top-6">

          {/* Account card */}
          <Card
            style={{ background: isDark ? '#0d0d14' : '#ffffff' }}
            className={`shadow-none overflow-hidden ${
              isDark ? 'border-white/[0.08]' : 'border-slate-200'
            }`}
          >
            <div className={`flex items-center gap-3 border-b px-5 py-4 ${
              isDark ? 'border-white/[0.08]' : 'border-slate-100'
            }`}>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                isDark ? 'bg-blue-500/20 border-blue-500/30' : 'bg-blue-50 border-blue-100'
              }`}>
                <UserCircle2 className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <div>
                <p className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{t('accountDetails')}</p>
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('yourIdentityInfo')}</p>
              </div>
            </div>
            <CardContent className="p-5 space-y-4">
              {/* Avatar + name block */}
              <div className={`flex flex-col items-center text-center pt-2 pb-4 border-b ${
                isDark ? 'border-white/[0.06]' : 'border-slate-100'
              }`}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white mb-3">
                  {initials}
                </div>
                <p className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{user?.name || '—'}</p>
                <p className={`text-xs mt-0.5 truncate max-w-full ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email || '—'}</p>
                <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  roleBadge[user?.role] || (isDark ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-100 text-blue-700 border-blue-200')
                }`}>
                  {roleLabel(user?.role)}
                </span>
              </div>

              {/* User ID tile */}
              <div className={`rounded-xl border px-4 py-3.5 ${
                isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('userId')}</p>
                <p className={`text-sm font-semibold font-mono tracking-wide truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                  {user?.studentId || '—'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security tip */}
          <div className={`rounded-xl border px-4 py-4 flex items-start gap-3 ${
            isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
          }`}>
            <ShieldCheck className={`w-4 h-4 mt-0.5 shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
            <p className={`text-xs leading-relaxed ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
              {t('securityTip')}
            </p>
          </div>
        </div>

        {/* ── RIGHT: Password + Requirements ── */}
        <div className="grid gap-5 lg:grid-cols-[1fr_260px] items-start">

          {/* Change Password card */}
          <Card
            style={{ background: isDark ? '#0d0d14' : '#ffffff' }}
            className={`pf-fade-up pf-fade-up-3 shadow-none overflow-hidden ${
              isDark ? 'border-white/[0.08]' : 'border-slate-200'
            }`}
          >
            <div className={`flex items-center gap-4 border-b px-6 py-5 ${
              isDark ? 'border-white/[0.08]' : 'border-slate-100'
            }`}>
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                isDark ? 'bg-white/[0.06] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
              }`}>
                <Lock className={`w-5 h-5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} />
              </div>
              <div>
                <p className={`text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{t('changePassword')}</p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('keepAccountSecure')}</p>
              </div>
            </div>

            <CardContent className="px-6 pt-8 pb-6">
              <form onSubmit={handlePwSave} className="space-y-6">

                {/* Step 1: Current password */}
                <div className="space-y-2">
                  <Label htmlFor="cur-pw" className={`flex items-center gap-2 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span className={`inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold ${
                      curVerified
                        ? 'bg-emerald-500 text-white'
                        : isDark ? 'bg-white/[0.08] text-slate-400' : 'bg-slate-100 text-slate-500'
                    }`}>{curVerified ? '✓' : '1'}</span>
                    {t('currentPassword')}
                    {curVerified && (
                      <span className={`ml-auto flex items-center gap-1 text-[10px] font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        <CheckCircle className="w-3 h-3" /> {t('verifiedLabel')}
                        <button
                          type="button"
                          onClick={handleResetVerify}
                          className={`ml-2 underline underline-offset-2 ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {t('change')}
                        </button>
                      </span>
                    )}
                  </Label>
                  {!curVerified ? (
                    <>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <PasswordField
                            id="cur-pw"
                            value={pw.cur}
                            visible={vis.cur}
                            onChange={(e) => { setPw((p) => ({ ...p, cur: e.target.value })); setVerifyMsg(null); }}
                            onToggle={() => setVis((v) => ({ ...v, cur: !v.cur }))}
                            placeholder={t('enterCurrentPassword')}
                            autoComplete="current-password"
                            isDark={isDark}
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={handleVerify}
                          disabled={verifyMutation.isPending || !pw.cur}
                          className={`shrink-0 gap-1.5 text-white disabled:opacity-40 disabled:cursor-not-allowed ${
                            isDark ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {verifyMutation.isPending
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <><ShieldOk className="w-4 h-4" /> {t('verify')}</>
                          }
                        </Button>
                      </div>
                      {verifyMsg && (
                        <p className={`flex items-center gap-1.5 text-[11px] font-medium ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {verifyMsg}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className={`flex items-center gap-2 h-10 rounded-md border px-3 text-sm ${
                      isDark ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}>
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      {t('currentPasswordConfirmed')}
                    </div>
                  )}
                </div>

                {/* Divider — only show when verified */}
                {curVerified && (
                  <div className="flex items-center gap-3">
                    <div className={`flex-1 border-t border-dashed ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`} />
                    <span className={`text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>{t('newCredentials')}</span>
                    <div className={`flex-1 border-t border-dashed ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`} />
                  </div>
                )}

                {/* Step 2: New password — gated */}
                {curVerified && (
                  <div className="space-y-2">
                    <Label htmlFor="new-pw" className={`flex items-center gap-2 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      <span className={`inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold ${
                        isDark ? 'bg-white/[0.08] text-slate-400' : 'bg-slate-100 text-slate-500'
                      }`}>2</span>
                      {t('newPassword')}
                    </Label>
                    <PasswordField
                      id="new-pw"
                      value={pw.next}
                      visible={vis.next}
                      onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                      onToggle={() => setVis((v) => ({ ...v, next: !v.next }))}
                      placeholder={t('createStrongPassword')}
                      isDark={isDark}
                    />
                    {pw.next.length > 0 && pw.next === pw.cur && (
                      <p className={`flex items-center gap-1.5 text-[11px] font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {t('newPasswordMustDiffer')}
                      </p>
                    )}
                  </div>
                )}

                {/* Step 3: Confirm password — gated */}
                {curVerified && (
                  <div className="space-y-2">
                    <Label htmlFor="confirm-pw" className={`flex items-center gap-2 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      <span className={`inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold ${
                        isDark ? 'bg-white/[0.08] text-slate-400' : 'bg-slate-100 text-slate-500'
                      }`}>3</span>
                      {t('confirmNewPassword')}
                    </Label>
                    <PasswordField
                      id="confirm-pw"
                      value={pw.confirm}
                      visible={vis.confirm}
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
                          : isDark ? 'text-red-400' : 'text-red-500'
                      }`}>
                        {pw.next === pw.confirm ? t('passwordsMatch') : `✕ ${t('passwordsDoNotMatch')}`}
                      </p>
                    )}
                  </div>
                )}

                {curVerified && (
                  <Button
                    type="submit"
                    disabled={pwMutation.isPending || pw.next === pw.cur || pw.next.length === 0}
                    className={`w-full gap-2 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {pwMutation.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('updating')}</>
                      : <><Lock className="w-4 h-4" /> {t('updatePassword')}</>
                    }
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Requirements side card */}
          <div className="pf-fade-up pf-fade-up-4 space-y-4">
            <Card
              style={{ background: isDark ? '#0d0d14' : '#ffffff' }}
              className={`shadow-none overflow-hidden ${
                isDark ? 'border-white/[0.08]' : 'border-slate-200'
              }`}
            >
              <div className={`flex items-center gap-3 border-b px-5 py-4 ${
                isDark ? 'border-white/[0.08]' : 'border-slate-100'
              }`}>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                  isDark ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-100'
                }`}>
                  <CheckCircle className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <p className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{t('requirements')}</p>
                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('mustMeetAll4')}</p>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {PWD_CHECKS.map(({ labelKey, fn }) => {
                    const ok = fn(pw.next);
                    return (
                      <div
                        key={labelKey}
                        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-all duration-200 ${
                          ok
                            ? isDark ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'
                            : isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-100 bg-slate-50/60'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          ok ? 'bg-emerald-500 shadow-sm shadow-emerald-300' : isDark ? 'bg-white/[0.1]' : 'bg-slate-200'
                        }`}>
                          <CheckCircle className={`w-3 h-3 ${ok ? 'text-white' : isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                        </div>
                        <span className={`text-xs font-medium leading-tight ${
                          ok ? isDark ? 'text-emerald-400' : 'text-emerald-700' : isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {t(labelKey)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Progress summary */}
            <div className={`rounded-xl border px-4 py-4 ${
              isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50 border-slate-200'
            }`}>
              <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('strengthProgress')}</p>
              <div className="flex gap-1 mb-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                    i < pwScore ? strengthColor : isDark ? 'bg-white/[0.08]' : 'bg-slate-200'
                  }`} />
                ))}
              </div>
              <p className={`text-xs font-semibold ${
                pwScore === 0 ? isDark ? 'text-slate-600' : 'text-slate-400' :
                pwScore === 1 ? 'text-red-500' :
                pwScore === 2 ? 'text-orange-500' :
                pwScore === 3 ? 'text-yellow-500' : 'text-emerald-500'
              }`}>
                {pwScore === 0 ? t('enterAPassword') : `${pwScore}/4 — ${strengthLabel}`}
              </p>
            </div>
          </div>

        </div>{/* end right grid */}
      </div>{/* end main grid */}

      {/* Footer */}
      <p className="pf-fade-up pf-fade-up-5 text-center text-xs text-slate-400 pb-2">
        {t('appName')} {t('versionTagline')} · v1.0.0
      </p>
    </div>
  );
}
