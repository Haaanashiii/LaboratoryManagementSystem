import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Edit, ChevronRight, Moon, Globe, LogOut,
  Shield, User, Hash, Building2, Mail,
} from 'lucide-react';
import { api } from '@/api/apiClient';
import itsLogo from '@/assets/images/Tower2.png';
import { useLang } from '@/components/i18n/LangContext';
import { useTheme } from '@/components/hooks/ThemeContext';
import { useAuth } from '@/components/hooks/useAuth';

const settingsStyles = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .st-fade-up   { opacity: 0; animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
  .st-fade-up-1 { animation-delay: 0.04s; }
  .st-fade-up-2 { animation-delay: 0.14s; }
  .st-fade-up-3 { animation-delay: 0.24s; }
  .st-fade-up-4 { animation-delay: 0.34s; }

  .st-row { transition: background 0.18s ease; position: relative; }
  .st-row::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: linear-gradient(to bottom, #3b82f6, #818cf8);
    border-radius: 0 4px 4px 0;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .st-row:hover::before { opacity: 1; }

  .st-icon-blue   { box-shadow: 0 0 14px rgba(59, 130, 246, 0.3); }
  .st-icon-violet { box-shadow: 0 0 14px rgba(139, 92, 246, 0.3); }
  .st-icon-red    { box-shadow: 0 0 14px rgba(239, 68,  68, 0.28); }
  .st-icon-amber  { box-shadow: 0 0 14px rgba(245, 158,  11, 0.3); }
  .st-icon-slate  { box-shadow: 0 0 10px rgba(100, 116, 139, 0.18); }

  .st-row-hover-dark:hover  { background: rgba(255,255,255,0.03) !important; }
  .st-row-hover-light:hover { background: rgba(0,0,0,0.03) !important; }
  .st-row-red-dark:hover    { background: rgba(239,68,68,0.07) !important; }
  .st-row-red-light:hover   { background: rgba(239,68,68,0.05) !important; }

  .st-toggle-on { box-shadow: 0 0 12px rgba(59,130,246,0.45); }
  .st-lang-active { box-shadow: 0 0 10px rgba(59,130,246,0.4); }
`;

export default function Settings() {
  const navigate = useNavigate();
  const { t, lang, toggleLang } = useLang();
  const { isDark, toggle: toggleTheme } = useTheme();
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const roleLabel = (role) => {
    const map = {
      student: t('student'), admin: t('administrator'),
      lecturer: t('lecturer'), head_of_lab: t('head_of_lab'),
      lab_assistant: t('lab_assistant'),
    };
    return map[role] || role?.replace(/_/g, ' ') || t('user');
  };

  // Exact same tokens as StudentDashboard
  const surface  = isDark ? 'glass-dark' : 'glass-light';
  const txt      = isDark ? 'text-white'     : 'text-slate-900';
  const txtsub   = isDark ? 'text-slate-400' : 'text-slate-500';
  const txtmuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const divider  = isDark ? 'border-white/[0.07]' : 'border-white/50';
  const ttl      = isDark ? 'text-slate-200' : 'text-slate-800';
  const sub      = isDark ? 'text-slate-500' : 'text-slate-500';
  const rowTxt   = isDark ? 'text-slate-200' : 'text-slate-800';
  const rowSub   = isDark ? 'text-slate-500' : 'text-slate-400';
  const rowHover = isDark ? 'st-row-hover-dark' : 'st-row-hover-light';

  return (
    <div className="space-y-4">
      <style>{settingsStyles}</style>

      {/* ── BANNER ── */}
      <div className={`st-fade-up st-fade-up-1 rounded-2xl p-6 sm:p-8 ${surface}`}>
        <div className="flex flex-col items-center text-center gap-3">
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
            style={{
              background: isDark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.35)',
              color: '#3b82f6',
              boxShadow: '0 0 20px rgba(59,130,246,0.22)',
            }}
          >
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>

          {/* Name + meta */}
          <div>
            <p className={`text-[10px] font-semibold tracking-widest uppercase mb-1.5 ${txtmuted}`}>
              {t('accountSettings')}
            </p>
            <h1 className={`text-2xl sm:text-3xl font-bold leading-tight ${txt}`}>
              {user?.name || t('user')}
            </h1>
            <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 mt-2">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{
                  background: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.10)',
                  border: '1px solid rgba(59,130,246,0.30)',
                  color: isDark ? '#93c5fd' : '#2563eb',
                }}
              >
                {roleLabel(user?.role)}
              </span>
              {user?.email && (
                <span className={`flex items-center gap-1 text-xs ${txtsub}`}>
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[200px]">{user.email}</span>
                </span>
              )}
              {user?.studentId && (
                <span className={`flex items-center gap-1 text-xs ${txtsub}`}>
                  <Hash className="w-3 h-3 shrink-0" />
                  <span className="font-mono-jb">{user.studentId}</span>
                </span>
              )}
              {user?.department && (
                <span className={`flex items-center gap-1 text-xs ${txtsub}`}>
                  <Building2 className="w-3 h-3 shrink-0" />
                  {user.department}
                </span>
              )}
            </div>
          </div>

          {/* Edit Profile button */}
          <button
            onClick={() => navigate('/profile')}
            className={`mt-1 text-sm font-medium px-5 py-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
              isDark
                ? 'border-white/[0.15] text-slate-300 hover:bg-white/[0.06]'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Edit className="w-3.5 h-3.5" />
            {t('editProfile')}
          </button>
        </div>
      </div>

      {/* ── GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* ── PREFERENCES ── */}
        <div className={`st-fade-up st-fade-up-2 rounded-2xl overflow-hidden ${surface}`}>
          <div className={`px-6 py-4 border-b ${divider}`}>
            <h2 className={`text-sm font-semibold ${ttl}`}>{t('preferences')}</h2>
            <p className={`text-xs mt-0.5 ${sub}`}>{t('personalizeApp')}</p>
          </div>

          {/* Dark mode */}
          <div className={`st-row flex items-center justify-between px-6 py-4 border-b ${divider} ${rowHover}`}>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 st-icon-amber"
                style={{
                  background: isDark ? 'rgba(245,158,11,0.14)' : 'rgba(245,158,11,0.10)',
                  border: '1px solid rgba(245,158,11,0.28)',
                }}
              >
                <Moon className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className={`text-sm font-medium ${rowTxt}`}>{t('darkMode')}</p>
                <p className={`text-xs ${rowSub}`}>{t('switchTheme')}</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ${
                isDark ? 'bg-blue-500 st-toggle-on' : 'bg-slate-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Language */}
          <div className={`st-row flex items-center justify-between px-6 py-4 border-b ${divider} ${rowHover}`}>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 st-icon-blue"
                style={{
                  background: isDark ? 'rgba(59,130,246,0.14)' : 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.28)',
                }}
              >
                <Globe className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className={`text-sm font-medium ${rowTxt}`}>{t('language')}</p>
                <p className={`text-xs ${rowSub}`}>
                  {t('currently')}:{' '}
                  <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {lang === 'en' ? t('langEnglish') : t('langIndonesian')}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => lang !== 'en' && toggleLang()}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  lang === 'en'
                    ? 'bg-blue-500 text-white st-lang-active'
                    : isDark ? 'bg-white/[0.07] text-slate-400 hover:bg-white/[0.12]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >EN</button>
              <button
                onClick={() => lang !== 'id' && toggleLang()}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  lang === 'id'
                    ? 'bg-blue-500 text-white st-lang-active'
                    : isDark ? 'bg-white/[0.07] text-slate-400 hover:bg-white/[0.12]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >ID</button>
            </div>
          </div>

          {/* Notifications */}
          <div onClick={() => navigate('/notifications')} className={`st-row flex items-center gap-3 px-6 py-4 cursor-pointer group transition-colors ${rowHover}`}>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 st-icon-violet"
              style={{
                background: isDark ? 'rgba(139,92,246,0.14)' : 'rgba(139,92,246,0.08)',
                border: '1px solid rgba(139,92,246,0.28)',
              }}
            >
              <Bell className="w-4 h-4 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${rowTxt}`}>{t('notifications')}</p>
              <p className={`text-xs ${rowSub}`}>{t('controlAlertsUpdates')}</p>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 transition-colors ${isDark ? 'text-slate-600 group-hover:text-slate-400' : 'text-slate-300 group-hover:text-slate-500'}`} />
          </div>
        </div>

        {/* ── ACCOUNT ── */}
        <div className={`st-fade-up st-fade-up-3 rounded-2xl overflow-hidden ${surface}`}>
          <div className={`px-6 py-4 border-b ${divider}`}>
            <h2 className={`text-sm font-semibold ${ttl}`}>{t('account')}</h2>
            <p className={`text-xs mt-0.5 ${sub}`}>{t('manageAccountDetails')}</p>
          </div>

          {/* Profile & password */}
          <div
            onClick={() => navigate('/profile')}
            className={`st-row flex items-center gap-3 px-6 py-4 cursor-pointer group transition-colors border-b ${divider} ${rowHover}`}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 st-icon-blue"
              style={{
                background: isDark ? 'rgba(59,130,246,0.14)' : 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.28)',
              }}
            >
              <User className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${rowTxt}`}>{t('stProfilePassword')}</p>
              <p className={`text-xs ${rowSub}`}>{t('stProfilePasswordSub')}</p>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 transition-colors ${isDark ? 'text-slate-600 group-hover:text-slate-400' : 'text-slate-300 group-hover:text-slate-500'}`} />
          </div>

          {/* Two-factor auth */}
          <div className={`st-row flex items-center gap-3 px-6 py-4 border-b ${divider}`}>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.28)',
              }}
            >
              <Shield className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${rowTxt}`}>{t('stTwoFactor')}</p>
              <p className={`text-xs ${rowSub}`}>{t('stTwoFactorSub')}</p>
            </div>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
              isDark
                ? 'bg-amber-500/[0.12] text-amber-400 border border-amber-500/[0.25]'
                : 'bg-amber-50 text-amber-600 border border-amber-200'
            }`}>
              {t('stComingSoon')}
            </span>
          </div>

          {/* Sign out */}
          <button
            onClick={async () => { await logout(); queryClient.clear(); }}
            className={`w-full flex items-center gap-3 px-6 py-4 transition-colors ${
              isDark ? 'st-row-red-dark' : 'st-row-red-light'
            }`}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 st-icon-red"
              style={{
                background: isDark ? 'rgba(239,68,68,0.14)' : 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.28)',
              }}
            >
              <LogOut className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold text-red-500">{t('signOut')}</p>
              <p className={`text-xs ${rowSub}`}>{t('returnToLogin')}</p>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
          </button>
        </div>
      </div>

      {/* ── APP INFO ── */}
      <div className={`st-fade-up st-fade-up-4 rounded-2xl ${surface}`}>
        <div className="px-6 py-5 flex flex-wrap sm:flex-nowrap items-center gap-4">
          <img
            src={itsLogo}
            alt="ITS"
            className="h-10 w-auto max-w-[140px] object-contain shrink-0 -mr-12"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <p className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{t('appName')}</p>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{
                  background: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.28)',
                  color: isDark ? '#93c5fd' : '#2563eb',
                }}
              >
                v1.0.0
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('versionTagline')} · {t('universityName')}
            </p>
          </div>
          <p className={`text-xs shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>© 2026 ITS</p>
        </div>
      </div>
    </div>
  );
}
