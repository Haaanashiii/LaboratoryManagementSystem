import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, ShieldCheck, Lock } from 'lucide-react';

import Threads from '@/components/ui/Threads';
import { Button } from '@/components/ui/button';
import { api, clearStoredAuth } from '@/api/apiClient';
import equimonLogo from '@/assets/images/Equimon Logo.png';
import itsSecondLogo from '@/assets/images/ITSSecond.png';
import { useAuth } from '@/components/hooks/useAuth.js';
import { useLang } from '@/components/i18n/LangContext';

const ADMIN_ACCESS_ROLES = ['lecturer', 'head', 'head_of_lab', 'lab_assistant', 'admin'];

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { isAuthenticated, isLoading, user, refreshSession } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rateLimitUntil, setRateLimitUntil] = useState(null);
  const [countdownNow, setCountdownNow] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    if (!rateLimitUntil) return;

    const interval = window.setInterval(() => {
      setCountdownNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [rateLimitUntil]);

  const getCountdownLabel = () => {
    if (!rateLimitUntil) return '';

    const remainingMs = Math.max(0, rateLimitUntil - countdownNow);
    const totalSeconds = Math.ceil(remainingMs / 1000);
    if (totalSeconds <= 0) {
      return '';
    }

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const countdownLabel = getCountdownLabel();
  const isRateLimited = !!rateLimitUntil && Date.now() < rateLimitUntil;

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const normalizedRole = (user?.role || '').toLowerCase();
      const destination = ADMIN_ACCESS_ROLES.includes(normalizedRole)
        ? '/admin-dashboard'
        : '/dashboard';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (rateLimitUntil && Date.now() >= rateLimitUntil) {
      setRateLimitUntil(null);
      setError('');
    }

    if (rateLimitUntil && Date.now() < rateLimitUntil) {
      setError(`Too many failed login attempts. Try again in ${countdownLabel || '00:00'}.`);
      return;
    }

    if (!formData.email || !formData.password) {
      setError(t('adminErrorRequired'));
      return;
    }

    try {
      setLoading(true);
      setError('');

      await api.auth.adminLogin(formData.email, formData.password);
      const currentUser = await refreshSession();
      const normalizedRole = (currentUser?.role || '').toLowerCase();

      if (!ADMIN_ACCESS_ROLES.includes(normalizedRole)) {
        clearStoredAuth();
        setError(t('adminErrorNoAccess'));
        return;
      }

      navigate('/admin-dashboard', { replace: true });
    } catch (loginError) {
      if (loginError?.status === 429) {
        const defaultRetryMs = 30 * 60 * 1000;
        const retryMs = Number.isFinite(loginError?.retryAfterMs) ? loginError.retryAfterMs : defaultRetryMs;
        const until = Date.now() + retryMs;
        setRateLimitUntil(until);
        setCountdownNow(Date.now());

        const initialSeconds = Math.ceil(retryMs / 1000);
        const initialMinutes = Math.floor(initialSeconds / 60);
        const initialRemainder = initialSeconds % 60;
        const initialLabel = `${String(initialMinutes).padStart(2, '0')}:${String(initialRemainder).padStart(2, '0')}`;

        setError(`Too many failed login attempts. Try again in ${initialLabel}.`);
        return;
      }

      setError(loginError.message || t('adminErrorInvalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0 opacity-80">
        <Threads amplitude={1} distance={0} enableMouseInteraction />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900/70 p-8 backdrop-blur-xl shadow-2xl shadow-black/40">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex w-fit items-center gap-3">
              <img src={equimonLogo} alt="Equimon logo" className="h-14 w-14 object-contain" />
              <img src={itsSecondLogo} alt="ITSSecond logo" className="h-14 w-14 object-contain" />
            </div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold tracking-wider text-cyan-200">
              <ShieldCheck className="h-4 w-4" />
              {t('adminAccess')}
            </div>
            <h1 className="text-3xl font-bold text-white">{t('adminLoginTitle')}</h1>
            <p className="mt-2 text-sm text-slate-300">{t('adminLoginSubtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
                {t('adminEmailLabel')}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={t('adminEmailPlaceholder')}
                  autoComplete="username"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">
                {t('adminPasswordLabel')}
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={t('adminPasswordPlaceholder')}
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-11 pr-12 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-cyan-200"
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}

            {isRateLimited && countdownLabel && (
              <p className="text-sm text-red-200">Try again in {countdownLabel}</p>
            )}

            <Button
              type="submit"
              disabled={loading || isRateLimited}
              className="h-11 w-full rounded-xl bg-cyan-400 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-cyan-900/40 disabled:text-slate-400"
            >
              {loading ? t('adminSigningIn') : t('adminSignInButton')}
            </Button>
          </form>

      
        </div>
      </div>
    </div>
  );
}
