import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, ShieldCheck, Lock } from 'lucide-react';

import ShapeGrid from '@/components/bits/ShapeGrid';
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
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [generalError, setGeneralError] = useState('');
  const [rateLimitUntil, setRateLimitUntil] = useState(null);
  const [countdownNow, setCountdownNow] = useState(0);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [focused, setFocused] = useState({ email: false, password: false });

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
    if (totalSeconds <= 0) return '';

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
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    if (generalError) setGeneralError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (rateLimitUntil && Date.now() >= rateLimitUntil) {
      setRateLimitUntil(null);
      setGeneralError('');
    }

    if (rateLimitUntil && Date.now() < rateLimitUntil) {
      setGeneralError(`Too many failed login attempts. Try again in ${countdownLabel || '00:00'}.`);
      return;
    }

    // Per-field required validation
    const newFieldErrors = { email: '', password: '' };
    if (!formData.email) newFieldErrors.email = t('adminErrorEmailRequired');
    if (!formData.password) newFieldErrors.password = t('adminErrorPasswordRequired');

    if (newFieldErrors.email || newFieldErrors.password) {
      setFieldErrors(newFieldErrors);
      return;
    }

    try {
      setLoading(true);
      setGeneralError('');
      setFieldErrors({ email: '', password: '' });

      await api.auth.adminLogin(formData.email, formData.password);
      const currentUser = await refreshSession();
      const normalizedRole = (currentUser?.role || '').toLowerCase();

      if (!ADMIN_ACCESS_ROLES.includes(normalizedRole)) {
        clearStoredAuth();
        setGeneralError(t('adminErrorNoAccess'));
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

        setGeneralError(`Too many failed login attempts. Try again in ${initialLabel}.`);
        return;
      }

      // Show inline under password field; also mark email border red to hint both fields
      const status = loginError?.status;
      if (status === 401 || status === 403) {
        setFieldErrors({ email: '\u200b', password: t('adminErrorInvalidPassword') });
      } else {
        setGeneralError(loginError.message || t('adminErrorInvalidCredentials'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04040A]">

      {/* ── ShapeGrid background ── */}
      <div className="absolute inset-0">
        <ShapeGrid
          direction="diagonal"
          speed={0.25}
          borderColor="rgba(6, 182, 212, 0.09)"
          squareSize={54}
          hoverFillColor="rgba(6, 182, 212, 0.07)"
          shape="hexagon"
          hoverTrailAmount={5}
          className="h-full w-full"
        />
      </div>

      {/* ── Radial depth vignette ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, #04040A 100%)' }}
      />

      {/* ── Subtle top glow ── */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.4), transparent)' }}
      />

      {/* ── Page center ── */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px]">

          {/* ── Card ── */}
          <div
            className="overflow-hidden rounded-2xl border border-white/[0.06]"
            style={{ background: 'rgba(10, 10, 20, 0.88)', backdropFilter: 'blur(24px) saturate(160%)' }}
          >
            {/* top gradient line */}
            <div
              className="h-[2px] w-full"
              style={{ background: 'linear-gradient(90deg, transparent 0%, #22d3ee 40%, #818cf8 70%, transparent 100%)' }}
            />

            {/* ── Card header ── */}
            <div className="flex items-center justify-between border-b border-white/[0.05] px-7 py-5">
              <div className="flex items-center gap-3">
                <img src={equimonLogo} alt="Equimon" className="h-8 w-8 object-contain" />
                <div>
                  <p className="text-[9px] font-mono tracking-[0.28em] text-slate-600 uppercase">
                    EQ-LABS · v2.0
                  </p>
                  <p className="text-sm font-bold tracking-widest text-white">EQUIMON</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 rounded border border-cyan-500/20 bg-cyan-500/[0.07] px-2.5 py-1.5">
                <ShieldCheck className="h-3 w-3 text-cyan-400" />
                <span className="text-[9px] font-mono tracking-[0.2em] text-cyan-400 uppercase">Restricted</span>
              </div>
            </div>

            {/* ── Card body ── */}
            <div className="px-7 pb-6 pt-7">

              {/* Title block */}
              <div className="mb-7">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-600">
                  {t('adminAccess')}
                </p>
                <h1 className="text-[26px] font-bold leading-tight text-white">
                  {t('adminLoginTitle')}
                </h1>
                <p className="mt-1.5 text-xs text-slate-500">{t('adminLoginSubtitle')}</p>
              </div>

              {/* ── Form ── */}
              <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">

                {/* Email field */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500"
                  >
                    {t('adminEmailLabel')}
                  </label>
                  <div
                    className="relative pb-px transition-colors duration-300"
                    style={{
                      borderBottom: fieldErrors.email
                        ? '1px solid rgba(239,68,68,0.7)'
                        : `1px solid ${focused.email || formData.email ? 'rgba(6,182,212,0.7)' : 'rgba(255,255,255,0.1)'}`,
                      boxShadow: fieldErrors.email
                        ? '0 1px 0 rgba(239,68,68,0.3)'
                        : focused.email ? '0 1px 0 rgba(6,182,212,0.35)' : 'none',
                    }}
                  >
                    <Mail
                      className={`pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 ${
                        fieldErrors.email ? 'text-red-500/60' : 'text-slate-600'
                      }`}
                    />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onFocus={() => setFocused((p) => ({ ...p, email: true }))}
                      onBlur={() => setFocused((p) => ({ ...p, email: false }))}
                      placeholder={t('adminEmailPlaceholder')}
                      autoComplete="username"
                      className="w-full bg-transparent py-2.5 pl-7 pr-3 text-sm text-white placeholder-slate-700 outline-none"
                    />
                  </div>
                  {fieldErrors.email && fieldErrors.email.trim() && (
                    <p className="mt-1.5 font-mono text-[10px] text-red-400">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Password field */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500"
                  >
                    {t('adminPasswordLabel')}
                  </label>
                  <div
                    className="relative pb-px transition-colors duration-300"
                    style={{
                      borderBottom: fieldErrors.password
                        ? '1px solid rgba(239,68,68,0.7)'
                        : `1px solid ${focused.password || formData.password ? 'rgba(6,182,212,0.7)' : 'rgba(255,255,255,0.1)'}`,
                      boxShadow: fieldErrors.password
                        ? '0 1px 0 rgba(239,68,68,0.3)'
                        : focused.password ? '0 1px 0 rgba(6,182,212,0.35)' : 'none',
                    }}
                  >
                    <Lock
                      className={`pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 ${
                        fieldErrors.password ? 'text-red-500/60' : 'text-slate-600'
                      }`}
                    />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleInputChange}
                      onFocus={() => setFocused((p) => ({ ...p, password: true }))}
                      onBlur={() => setFocused((p) => ({ ...p, password: false }))}
                      placeholder={t('adminPasswordPlaceholder')}
                      autoComplete="current-password"
                      className="w-full bg-transparent py-2.5 pl-7 pr-10 text-sm text-white placeholder-slate-700 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-600 transition hover:text-cyan-300"
                      aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-1.5 font-mono text-[10px] text-red-400">{fieldErrors.password}</p>
                  )}
                </div>

                {/* General error message */}
                {generalError && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-500/15 bg-red-500/[0.07] px-3.5 py-3">
                    <span className="mt-0.5 font-mono text-xs text-red-400">›</span>
                    <p className="text-xs leading-relaxed text-red-300">{generalError}</p>
                  </div>
                )}

                {isRateLimited && countdownLabel && (
                  <p className="font-mono text-xs text-red-400">retry in {countdownLabel}</p>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={loading || isRateLimited}
                  className="mt-1 h-11 w-full rounded-xl border-0 bg-cyan-500 font-semibold tracking-wide text-slate-950 transition-all duration-300 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600"
                  style={loading || isRateLimited ? {} : { boxShadow: '0 0 0 0 rgba(6,182,212,0)' }}
                  onMouseEnter={(e) => { if (!loading && !isRateLimited) e.currentTarget.style.boxShadow = '0 0 28px rgba(6,182,212,0.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 0 0 rgba(6,182,212,0)'; }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                      {t('adminSigningIn')}
                    </span>
                  ) : (
                    t('adminSignInButton')
                  )}
                </Button>
              </form>
            </div>

            {/* ── Card footer ── */}
            <div className="flex items-center justify-between border-t border-white/[0.04] px-7 py-3.5">
              <div className="flex items-center gap-2">
                <img src={itsSecondLogo} alt="ITS" className="h-5 w-5 object-contain opacity-30" />
                <span className="text-[9px] font-mono tracking-widest text-slate-700 uppercase">
                  Smart City Lab · ITS
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-[9px] font-mono text-slate-700">secure channel</span>
              </div>
            </div>

          </div>
          {/* end card */}

        </div>
      </div>
    </div>
  );
}
