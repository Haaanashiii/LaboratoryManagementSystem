import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Lock, Loader2, Eye, EyeOff,
  CheckCircle, ArrowLeft, AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';
import { useTheme } from '@/components/hooks/ThemeContext';

const profileStyles = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .pf-fade-up { opacity: 0; animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) forwards; }
  .pf-fade-up-1 { animation-delay: 0.04s; }
  .pf-fade-up-2 { animation-delay: 0.12s; }
  .pf-fade-up-3 { animation-delay: 0.22s; }
  .pf-fade-up-4 { animation-delay: 0.32s; }
`;


export default function ProfilePage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword]         = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError]   = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const updatePasswordMutation = useMutation({
    mutationFn: (data) => api.auth.changePassword(data),
    onSuccess: () => {
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    },
    onError: (error) => {
      setPasswordError(error.message || t('passwordUpdateError'));
    },
  });

  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);
    if (passwordData.newPassword.length < 6) { setPasswordError(t('passwordTooShort')); return; }
    if (passwordData.newPassword !== passwordData.confirmPassword) { setPasswordError(t('passwordsDoNotMatch')); return; }
    updatePasswordMutation.mutate({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
  };

  const roleLabel = (role) => {
    const map = { student: 'Student', admin: 'Administrator', lecturer: 'Lecturer', head_of_lab: 'Head of Lab', lab_assistant: 'Lab Assistant' };
    return map[role] || role?.replace(/_/g, ' ') || 'User';
  };

  const inputCls = `h-10 text-sm transition-colors ${
    isDark
      ? 'bg-slate-800 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-blue-500'
      : 'bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-400'
  }`;

  const labelCls = `text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-500'}`;

  const cardCls = `rounded-2xl border overflow-hidden ${isDark ? 'bg-[#0d0d14] border-white/[0.08]' : 'bg-slate-100 border-slate-300'}`;
  const cardHeaderCls = `px-6 py-4 border-b ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`;

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className={`overflow-x-hidden ${isDark ? 'bg-slate-950' : ''}`}>
      <style>{profileStyles}</style>

      {/* ── PAGE HEADER ── */}
      <div className={`px-4 sm:px-6 lg:px-8 pt-5 pb-4 pf-fade-up pf-fade-up-1`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border transition-colors ${
              isDark
                ? 'border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/05 hover:border-white/20'
                : 'border-slate-300 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className={`h-4 w-px ${isDark ? 'bg-white/10' : 'bg-slate-300'}`} />
          <div>
            <h1 className={`text-base font-semibold leading-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Profile Settings</h1>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Manage your account security</p>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5 items-start">

          {/* ── LEFT: Account Details (sticky sidebar) ── */}
          <div className={`${cardCls} pf-fade-up pf-fade-up-2 lg:sticky lg:top-6`}>
            {/* Avatar block */}
            <div className={`px-6 pt-6 pb-5 border-b ${isDark ? 'border-white/[0.08]' : 'border-slate-200'} flex flex-col items-center text-center`}>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white mb-3">
                {initials}
              </div>
              <p className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{user?.name || '—'}</p>
              <p className={`text-xs mt-0.5 truncate max-w-full ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email || '—'}</p>
              <span className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                user?.role === 'admin'         ? (isDark ? 'bg-red-500/20 text-red-300 border-red-500/30'     : 'bg-red-50 text-red-700 border-red-200') :
                user?.role === 'lecturer'      ? (isDark ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' : 'bg-violet-50 text-violet-700 border-violet-200') :
                user?.role === 'head_of_lab'   ? (isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'   : 'bg-amber-50 text-amber-700 border-amber-200') :
                user?.role === 'lab_assistant' ? (isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200') :
                                                 (isDark ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'   : 'bg-blue-50 text-blue-700 border-blue-200')
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  user?.role === 'admin' ? 'bg-red-500' : user?.role === 'lecturer' ? 'bg-violet-500' :
                  user?.role === 'head_of_lab' ? 'bg-amber-500' : user?.role === 'lab_assistant' ? 'bg-emerald-500' : 'bg-blue-500'
                }`} />
                {roleLabel(user?.role)}
              </span>
            </div>

            {/* Info tiles */}
            <div className="p-4 space-y-2">
              {[
                { label: 'User ID',  value: user?.student_id || user?.id?.slice(-10)?.toUpperCase() || '—', mono: true },
                { label: 'Phone',    value: user?.phone || '—', mono: false },
              ].map(({ label, value, mono }) => (
                <div key={label} className={`rounded-xl px-4 py-3 border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-100 border-slate-200'}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
                  <p className={`text-sm font-semibold truncate ${mono ? 'font-mono tracking-wide' : ''} ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Tip */}
            <div className={`mx-4 mb-4 px-4 py-3 rounded-xl flex items-start gap-2.5 ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-100/70 border border-blue-200'}`}>
              <ShieldCheck className={`w-4 h-4 mt-0.5 shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                Keep your info up to date. Never share your credentials with anyone.
              </p>
            </div>
          </div>

          {/* ── COL 2: Change Password ── */}
          <div>

            {/* Change Password */}
            <div className={`${cardCls} pf-fade-up pf-fade-up-3`}>
              <div className={cardHeaderCls}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
                    <ShieldCheck className={`w-3.5 h-3.5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
                  </div>
                  <h2 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Change Password</h2>
                </div>
                <p className={`text-xs mt-0.5 ml-9 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Minimum 6 characters. Use a unique password you don't use elsewhere.</p>
              </div>

              <form onSubmit={handlePasswordUpdate} className="p-5 space-y-3">
                {/* Current Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword" className={labelCls}>Current Password</Label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder="Current password"
                      className={`${inputCls} pl-9 pr-9`}
                    />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New + Confirm in a row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* New Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword" className={labelCls}>New Password</Label>
                    <div className="relative">
                      <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        placeholder="New password"
                        className={`${inputCls} pl-9 pr-9`}
                      />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordData.newPassword && (
                      <div className="flex gap-1 pt-0.5">
                        {[1,2,3,4].map((s) => {
                          const len = passwordData.newPassword.length;
                          const score = len >= 10 ? 4 : len >= 8 ? 3 : len >= 6 ? 2 : 1;
                          return (
                            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${
                              s <= score
                                ? score >= 4 ? 'bg-emerald-500' : score >= 3 ? 'bg-blue-500' : score >= 2 ? 'bg-amber-500' : 'bg-red-500'
                                : isDark ? 'bg-slate-700' : 'bg-slate-200'
                            }`} />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className={labelCls}>Confirm Password</Label>
                    <div className="relative">
                      <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        placeholder="Confirm password"
                        className={`${inputCls} pl-9 pr-9`}
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordData.confirmPassword && (
                      <p className={`text-[11px] mt-0.5 ${
                        passwordData.newPassword === passwordData.confirmPassword
                          ? (isDark ? 'text-emerald-400' : 'text-emerald-600')
                          : (isDark ? 'text-red-400' : 'text-red-500')
                      }`}>
                        {passwordData.newPassword === passwordData.confirmPassword ? '✓ Passwords match' : '✗ Do not match'}
                      </p>
                    )}
                  </div>
                </div>

                {passwordError && (
                  <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm ${
                    isDark ? 'bg-red-900/30 text-red-300 border border-red-700/40' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm ${
                    isDark ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-700/40' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    Password changed successfully.
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={updatePasswordMutation.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-60"
                  >
                    {updatePasswordMutation.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
                      : <><ShieldCheck className="w-4 h-4" /> Update Password</>
                    }
                  </button>
                </div>
              </form>
            </div>

          </div>{/* ── end COL 2 ── */}

        </div>{/* ── end 3-col grid ── */}

        {/* Footer */}
        <p className={`pf-fade-up pf-fade-up-4 text-center text-xs pb-2 mt-5 ${isDark ? 'text-slate-700' : 'text-slate-400'}`}>
          Equimon Laboratory Management System · v1.0.0
        </p>
      </div>
    </div>
  );
}

