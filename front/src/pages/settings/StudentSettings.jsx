import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import {
  Bell,
  Edit,
  ChevronRight,
  Moon,
  Globe,
  LogOut,
  Info,
  Zap,
} from 'lucide-react';
import { api } from '@/api/apiClient';
import { useLang } from '@/components/i18n/LangContext';
import { useTheme } from '@/components/hooks/ThemeContext';
import { useAuth } from '@/components/hooks/useAuth';

const settingsStyles = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .st-fade-up { opacity: 0; animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
  .st-fade-up-1 { animation-delay: 0.04s; }
  .st-fade-up-2 { animation-delay: 0.14s; }
  .st-fade-up-3 { animation-delay: 0.24s; }
  .st-fade-up-4 { animation-delay: 0.34s; }
  .st-fade-up-5 { animation-delay: 0.44s; }
  .st-fade-up-6 { animation-delay: 0.54s; }
  .st-fade-up-7 { animation-delay: 0.62s; }

  @keyframes heroGlow {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50%       { opacity: 1;   transform: scale(1.08); }
  }
  .st-orb   { animation: heroGlow 6s ease-in-out infinite; will-change: transform, opacity; }
  .st-orb-2 { animation: heroGlow 8s ease-in-out infinite reverse; will-change: transform, opacity; }

  .st-dark .st-hero-banner {
    background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 45%, #3730a3 100%) !important;
  }

  .st-row {
    transition: background 0.18s ease;
    position: relative;
  }
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
`;

export default function Settings() {
  const navigate = useNavigate();
  const { t, lang, toggleLang } = useLang();
  const { isDark, toggle: toggleTheme } = useTheme();
  const { logout } = useAuth();

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

  return (
    <div className={`min-h-screen overflow-y-hidden ${isDark ? 'bg-slate-950 st-dark' : 'bg-slate-50'} pb-12`}>
      <style>{settingsStyles}</style>

      {/* ── PAGE HEADER BANNER ── */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6 st-fade-up st-fade-up-1">
        <div className="st-hero-banner relative overflow-hidden rounded-2xl px-6 py-6 sm:px-10 shadow-xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600">
          {/* animated orbs */}
          <div className="st-orb absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/10 pointer-events-none" />
          <div className="st-orb-2 absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-indigo-400/20 pointer-events-none" />
          <div className="absolute top-4 right-28 w-3 h-3 rounded-full bg-white/30 pointer-events-none" />
          <div className="absolute bottom-4 right-16 w-5 h-5 rounded-full bg-white/20 pointer-events-none" />

          <div className="relative max-w-5xl mx-auto flex flex-row items-center gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-lg shrink-0 bg-white/20 border border-white/30 text-white">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-200">{t('accountSettings')}</p>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <h1 className="text-lg font-bold text-white leading-tight">
                  {user?.name || t('user')}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 border border-white/30 text-white">
                  {roleLabel(user?.role)}
                </span>
              </div>
              <p className="text-xs text-blue-100 truncate mt-0.5">{user?.email || '—'}</p>
            </div>

            {/* Edit Profile Button */}
            <Button
              onClick={() => navigate('/profile')}
              size="sm"
              className="shrink-0 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white border border-white/30 transition-all"
              variant="ghost"
            >
              <Edit className="w-3.5 h-3.5" />
              {t('editProfile')}
            </Button>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="px-4 sm:px-6 lg:px-8 mt-8 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* ═══ LEFT COLUMN ═══ */}
        <div className="space-y-5">

        {/* ── PREFERENCES CARD ── */}
        <div className={`st-fade-up st-fade-up-2 rounded-2xl border overflow-hidden ${
          isDark ? 'bg-[#0d0d14] border-white/[0.08]' : 'bg-white border-slate-200'
        }`}>
          <div className={`px-6 py-4 border-b ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{t('preferences')}</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{t('personalizeApp')}</p>
          </div>

          {/* Dark mode toggle */}
          <div className={`st-row flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/5' : 'border-slate-50'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/8' : 'bg-slate-100'}`}>
                <Moon className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-slate-500'}`} />
              </div>
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{t('darkMode')}</p>
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('switchTheme')}</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                isDark ? 'bg-blue-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  isDark ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Language toggle */}
          <div className="st-row flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/8' : 'bg-slate-100'}`}>
                <Globe className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
              </div>
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{t('language')}</p>
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t('currently')} <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{lang === 'en' ? t('langEnglish') : t('langIndonesian')}</span>
                </p>
              </div>
            </div>
            <button
              onClick={toggleLang}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                isDark
                  ? 'bg-white/8 border-white/10 text-slate-300 hover:bg-white/15'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {lang === 'en' ? t('switchToID') : t('switchToEN')}
            </button>
          </div>
        </div>

        {/* ── ACCOUNT CARD ── */}
        <div className={`st-fade-up st-fade-up-3 rounded-2xl border overflow-hidden ${
          isDark ? 'bg-[#0d0d14] border-white/[0.08]' : 'bg-white border-slate-200'
        }`}>
          <div className={`px-6 py-4 border-b ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{t('account')}</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{t('manageAccountDetails')}</p>
          </div>

          {/* Profile Information — expanded card */}
          <div
            onClick={() => navigate('/profile')}
            className={`st-row flex items-center gap-4 px-6 py-5 cursor-pointer transition-colors group border-b ${isDark ? 'border-white/5 hover:bg-white/[0.04]' : 'border-slate-50 hover:bg-slate-50'}`}
          >
            {/* Large avatar */}
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow shrink-0 ${
              isDark ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300' : 'bg-blue-100 text-blue-600'
            }`}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{user?.name || t('user')}</p>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email || '—'}</p>
              <p className={`text-[11px] mt-1 font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('tapToEditProfile')} →</p>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 transition-colors ${isDark ? 'text-slate-600 group-hover:text-slate-400' : 'text-slate-300 group-hover:text-slate-500'}`} />
          </div>

          {/* Notifications row */}
          <div
            className={`st-row flex items-center gap-4 px-6 py-4 cursor-pointer transition-colors group ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'}`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
              <Bell className={`w-4 h-4 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{t('notifications')}</p>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('controlAlertsUpdates')}</p>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 transition-colors ${isDark ? 'text-slate-600 group-hover:text-slate-400' : 'text-slate-300 group-hover:text-slate-500'}`} />
          </div>
        </div>

        </div>{/* ═══ end LEFT COLUMN ═══ */}

        {/* ═══ RIGHT COLUMN ═══ */}
        <div className="space-y-5">

        {/* ── ABOUT CARD ── */}
        <div className={`st-fade-up st-fade-up-5 rounded-2xl border overflow-hidden ${
          isDark ? 'bg-[#0d0d14] border-white/[0.08]' : 'bg-white border-slate-200'
        }`}>
          <div className={`px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-5`}>
            {/* App icon */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shrink-0">
              <Zap className="w-7 h-7 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{t('appName')}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  isDark ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-50 text-blue-600 border-blue-100'
                }`}>v1.0.0</span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('versionTagline')} · {t('universityName')}</p>
              <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{t('builtWithStack')}</p>
            </div>

            <div className={`shrink-0 flex items-center gap-1.5 text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              <Info className="w-3.5 h-3.5" />
              <span>2026</span>
            </div>
          </div>
        </div>

        {/* ── SIGN OUT ── */}
        <div className={`st-fade-up st-fade-up-6 rounded-2xl border overflow-hidden ${
          isDark ? 'bg-[#0d0d14] border-white/[0.08]' : 'bg-white border-slate-200'
        }`}>
          <button
            onClick={async () => { await logout(); }}
            className={`w-full flex items-center gap-3 px-6 py-4 text-sm font-medium transition-colors ${
              isDark ? 'text-red-400 hover:bg-red-950/30' : 'text-red-600 hover:bg-red-50'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-red-500/20' : 'bg-red-50'}`}>
              <LogOut className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="font-semibold">{t('signOut')}</p>
              <p className={`text-[11px] mt-0.5 font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('returnToLogin')}</p>
            </div>
          </button>
        </div>

        </div>{/* ═══ end RIGHT COLUMN ═══ */}

        </div>{/* ═══ end 2-col grid ═══ */}

        {/* ── VERSION FOOTER ── */}
        <p className={`st-fade-up st-fade-up-7 text-center text-xs pb-2 mt-5 ${isDark ? 'text-slate-700' : 'text-slate-400'}`}>
          {t('appName')} {t('versionTagline')} · v1.0.0
        </p>
      </div>
    </div>
  );
}
