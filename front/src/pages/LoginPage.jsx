import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Hash, Eye, EyeOff, X, ClipboardList, RotateCcw, Bell } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { api } from '@/api/apiClient';
import { useLang } from '@/components/i18n/LangContext';
import ShapeGrid from '@/components/bits/ShapeGrid';
import itsLogo from '@/assets/images/ITSSecond.png';
import { useAuth } from '@/components/hooks/useAuth.js';
import { toast } from 'sonner';

const ADMIN_ACCESS_ROLES = ['lecturer', 'head', 'head_of_lab', 'lab_assistant', 'admin'];
const MIN_SIGNUP_PASSWORD_LENGTH = 6;
const MIN_SIGNUP_UNIQUE_CHARS = 5;

const countUniqueChars = (value) => new Set(String(value || '')).size;

const getSignupPasswordStrength = (password) => {
  const value = String(password || '');
  const checks = {
    minLength: value.length >= MIN_SIGNUP_PASSWORD_LENGTH,
    hasUppercase: /[A-Z]/.test(value),
    uniqueChars: countUniqueChars(value) >= MIN_SIGNUP_UNIQUE_CHARS,
    hasNumber: /\d/.test(value),
    hasSymbol: /[^A-Za-z0-9]/.test(value),
  };

  const basePolicyMet = checks.minLength && checks.hasUppercase && checks.uniqueChars;
  const score = Object.values(checks).filter(Boolean).length;

  if (!value) {
    return {
      label: 'Enter password',
      tone: 'slate',
      segments: 0,
      checks,
    };
  }

  if (!basePolicyMet) {
    return {
      label: score <= 2 ? 'Weak' : 'Fair',
      tone: 'red',
      segments: score <= 2 ? 1 : 2,
      checks,
    };
  }

  if (checks.hasNumber && checks.hasSymbol) {
    return {
      label: 'Strong',
      tone: 'emerald',
      segments: 4,
      checks,
    };
  }

  return {
    label: 'Medium',
    tone: 'blue',
    segments: 3,
    checks,
  };
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLang();
  const { isAuthenticated, isLoading, user, refreshSession } = useAuth();
  // Login state
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    const savedMode = localStorage.getItem('authStorageMode');
    return savedMode !== 'session';
  });
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [rateLimitUntil, setRateLimitUntil] = useState(null);
  const [countdownNow, setCountdownNow] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const navigateWithTransition = (destination) => {
    setIsExiting(true);
    setTimeout(() => navigate(destination, { replace: true }), 550);
  };

  // Sign-up modal state
  const [showSignup, setShowSignup] = useState(false);
  const [signupStep, setSignupStep] = useState(0); // 0 = welcome, 1 = form
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', confirmPassword: '', studentId: '' });
  const [signupErrors, setSignupErrors] = useState({});
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const passwordStrength = getSignupPasswordStrength(signupForm.password);

  const openSignupModal = () => {
    setSignupStep(0);
    setShowSignup(true);
  };

  const closeSignupModal = () => {
    setShowSignup(false);
    setSignupStep(0);
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const normalizedRole = (user?.role || '').toLowerCase();
      const destination = ADMIN_ACCESS_ROLES.includes(normalizedRole)
        ? '/admin-dashboard'
        : '/dashboard';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  // Lock body scroll when signup modal is open.
  useEffect(() => {
    document.body.style.overflow = showSignup ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showSignup]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

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
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (totalSeconds <= 0) {
      return '';
    }

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const countdownLabel = getCountdownLabel();

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupForm(prev => ({ ...prev, [name]: value }));
    if (signupErrors[name]) setSignupErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateLogin = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = t('errorEmailRequired');
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = t('errorEmailInvalid');
    if (!formData.password) newErrors.password = t('errorPasswordRequired');
    else if (formData.password.length < 6) newErrors.password = t('errorPasswordLength');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignup = () => {
    const newErrors = {};
    if (!signupForm.name) newErrors.name = t('errorNameRequired');
    if (!signupForm.studentId) {
      newErrors.studentId = 'Student ID is required';
    } else if (/\D/.test(signupForm.studentId)) {
      newErrors.studentId = 'Student ID must contain numbers only';
    }
    if (!signupForm.email) newErrors.email = t('errorEmailRequired');
    else if (!/\S+@\S+\.\S+/.test(signupForm.email)) newErrors.email = t('errorEmailInvalid');
    if (!signupForm.password) newErrors.password = t('errorPasswordRequired');
    else if (signupForm.password.length < MIN_SIGNUP_PASSWORD_LENGTH) {
      newErrors.password = `Password must be at least ${MIN_SIGNUP_PASSWORD_LENGTH} characters.`;
    } else if (!/[A-Z]/.test(signupForm.password)) {
      newErrors.password = 'Password must include at least one uppercase letter.';
    } else if (countUniqueChars(signupForm.password) < MIN_SIGNUP_UNIQUE_CHARS) {
      newErrors.password = `Password must include at least ${MIN_SIGNUP_UNIQUE_CHARS} unique characters.`;
    }
    if (!signupForm.confirmPassword) newErrors.confirmPassword = t('errorConfirmPassword');
    else if (signupForm.password !== signupForm.confirmPassword) newErrors.confirmPassword = t('errorPasswordMismatch');
    setSignupErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rateLimitUntil && Date.now() >= rateLimitUntil) {
      setRateLimitUntil(null);
      setErrors((prev) => {
        const next = { ...prev };
        if (next.email && next.email.toLowerCase().includes('too many failed login attempts')) {
          delete next.email;
        }
        return next;
      });
    }

    if (rateLimitUntil && Date.now() < rateLimitUntil) {
      setErrors({ email: `Too many failed login attempts. Try again in ${countdownLabel || '00:00'}.` });
      return;
    }

    if (!validateLogin()) return;
    try {
      await api.auth.login(formData.email, formData.password, { rememberMe });
      const user = await refreshSession();
      console.log('Login successful:', user);

      if (location.state?.from?.pathname) {
        navigateWithTransition(location.state.from.pathname);
        return;
      }

      const normalizedRole = (user?.role || '').toLowerCase();
      const defaultDestination = ADMIN_ACCESS_ROLES.includes(normalizedRole)
        ? '/admin-dashboard'
        : '/dashboard';
      navigateWithTransition(defaultDestination);
    } catch (error) {
      console.error('Login failed:', error);
      if (error?.status === 429) {
        const defaultRetryMs = 30 * 60 * 1000;
        const retryMs = Number.isFinite(error?.retryAfterMs) ? error.retryAfterMs : defaultRetryMs;
        const until = Date.now() + retryMs;
        setRateLimitUntil(until);
        setCountdownNow(Date.now());
        const initialSeconds = Math.ceil(retryMs / 1000);
        const initialMinutes = Math.floor(initialSeconds / 60);
        const initialRemainder = initialSeconds % 60;
        const initialLabel = `${String(initialMinutes).padStart(2, '0')}:${String(initialRemainder).padStart(2, '0')}`;
        setErrors({ email: `Too many failed login attempts. Try again in ${initialLabel}.` });
        return;
      }

      setErrors({ email: error.message || t('errorInvalidCredentials') });
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!validateSignup()) return;
    try {
      await api.auth.register({
        name: signupForm.name,
        email: signupForm.email,
        password: signupForm.password,
        studentId: signupForm.studentId,
      });
      toast.success('Account created successfully! Welcome aboard.');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Registration failed:', error);
      setSignupErrors({ email: error.message || t('errorRegistrationFailed') });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-blue-500" />
      </div>
    );
  }

  const featureItems = [
    { icon: ClipboardList, label: 'Browse & submit borrow requests' },
    { icon: Bell, label: 'Live status updates at every step' },
    { icon: RotateCcw, label: 'Return logged, inventory synced' },
  ];

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: '#0A0A0F' }}>
      <style>{`
        @keyframes lp-fadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes lp-lineGrow {
          from { transform: scaleX(0); transform-origin: left; }
          to   { transform: scaleX(1); transform-origin: left; }
        }
        .lp-a1 { animation: lp-fadeUp 0.65s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
        .lp-a2 { animation: lp-fadeUp 0.65s cubic-bezier(0.16,1,0.3,1) 0.15s both; }
        .lp-a3 { animation: lp-fadeUp 0.65s cubic-bezier(0.16,1,0.3,1) 0.25s both; }
        .lp-a4 { animation: lp-fadeUp 0.65s cubic-bezier(0.16,1,0.3,1) 0.35s both; }
        .lp-a5 { animation: lp-fadeUp 0.65s cubic-bezier(0.16,1,0.3,1) 0.42s both; }
        .lp-a6 { animation: lp-fadeUp 0.65s cubic-bezier(0.16,1,0.3,1) 0.49s both; }
        .lp-a7 { animation: lp-fadeUp 0.65s cubic-bezier(0.16,1,0.3,1) 0.56s both; }
        .lp-card { animation: lp-scaleIn 0.55s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .lp-line { animation: lp-lineGrow 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s both; }
        @keyframes lp-exitFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .lp-exit-overlay {
          animation: lp-exitFade 0.45s cubic-bezier(0.4,0,0.2,1) forwards;
        }
        .lp-input {
          background: #1A1A24;
          border: 1px solid rgba(71,85,105,0.4);
          color: #E2E8F0;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .lp-input:focus {
          outline: none;
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
        }
        .lp-input::placeholder { color: #334155; }
        .lp-input-err { border-color: #EF4444 !important; }
        .lp-btn-primary {
          background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
          box-shadow: 0 4px 20px rgba(59,130,246,0.3);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .lp-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 30px rgba(59,130,246,0.45);
        }
        .lp-btn-primary:active { transform: translateY(0px); }
        .lp-btn-ghost {
          background: transparent;
          border: 1px solid rgba(71,85,105,0.45);
          color: #64748B;
          transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
        }
        .lp-btn-ghost:hover {
          border-color: rgba(59,130,246,0.5);
          color: #93C5FD;
          background: rgba(59,130,246,0.06);
        }
        .lp-feature-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(30,41,59,0.6);
          transition: opacity 0.2s ease;
        }
        .lp-feature-row:last-child { border-bottom: none; }
        .su-input {
          background: #13131c;
          border: 1px solid rgba(71,85,105,0.3);
          color: #E2E8F0;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .su-input:focus {
          outline: none;
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
        }
        .su-input::placeholder { color: #334155; }
        .su-input-err { border-color: #EF4444 !important; }
        @keyframes su-fadeInUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Exit transition overlay ── */}
      {isExiting && (
        <div
          className="lp-exit-overlay fixed inset-0 z-[100] pointer-events-none"
          style={{ background: '#0A0A0F' }}
        />
      )}

      {/* ── Full-page ShapeGrid background ── */}
      <div className="absolute inset-0 z-0">
        <ShapeGrid
          shape="hexagon"
          direction="diagonal"
          speed={0.25}
          borderColor="rgba(59, 130, 246, 0.09)"
          hoverFillColor="rgba(59, 130, 246, 0.07)"
          squareSize={52}
          className="w-full h-full"
        />
      </div>

      {/* Depth gradient — fades right side to keep card readable */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 65% 80% at 15% 50%, rgba(59,130,246,0.06) 0%, transparent 65%), ' +
            'linear-gradient(to right, transparent 40%, rgba(10,10,15,0.55) 100%)',
        }}
      />

      {/* ── Left Branding Panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 items-center justify-center p-16">
        <div className="max-w-[420px] w-full">

          {/* Logo + system tag */}
          <div className="flex items-center gap-3 mb-14 lp-a1">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#111118', border: '1px solid rgba(59,130,246,0.2)' }}
            >
              <img src={itsLogo} alt="ITS Logo" className="w-7 h-7 object-contain" />
            </div>
            <div
              className="h-6 w-px flex-shrink-0"
              style={{ background: 'rgba(71,85,105,0.35)' }}
            />
            <span
              className="text-xs font-semibold tracking-[0.2em] uppercase"
              style={{ color: '#3B82F6' }}
            >
              Institut Teknologi Sepuluh Nopember
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-bold text-white leading-[1.1] mb-5 lp-a2"
            style={{ fontSize: 'clamp(2.4rem, 3.5vw, 3.2rem)' }}
          >
            {t('welcomeToEquimon')}
          </h1>

          {/* Tagline */}
          <p className="text-base leading-relaxed mb-10 lp-a3" style={{ color: '#64748B' }}>
            {t('equimonHelps')}
          </p>

          {/* Accent line */}
          <div
            className="h-px mb-10 lp-line"
            style={{ background: 'linear-gradient(to right, rgba(59,130,246,0.5), rgba(59,130,246,0.05))' }}
          />

          {/* Feature rows */}
          <div className="lp-a4">
            {featureItems.map(({ icon: Icon, label }, i) => (
              <div key={i} className="lp-feature-row">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.15)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: '#60A5FA' }} />
                </div>
                <span className="text-sm" style={{ color: '#94A3B8' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative z-10">

        {/* Back to Home */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 right-6 flex items-center gap-1.5 text-sm font-medium transition-colors"
          style={{ color: '#475569' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#94A3B8'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#475569'; }}
        >
          ← {t('backToHome')}
        </button>

        {/* Glass card */}
        <div
          className="w-full max-w-md rounded-2xl p-8 lg:p-9 lp-card"
          style={{
            background: 'rgba(13,13,20,0.85)',
            border: '1px solid rgba(59,130,246,0.13)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 32px 80px rgba(0,0,0,0.5), 0 0 60px rgba(59,130,246,0.06)',
          }}
        >
          {/* Logo + title */}
          <div className="mb-8 lp-a1">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5"
              style={{ background: '#1A1A24', border: '1px solid rgba(59,130,246,0.18)' }}
            >
              <img src={itsLogo} alt="ITS Logo" className="w-8 h-8 object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">{t('signIn')}</h2>
            <p className="text-sm" style={{ color: '#475569' }}>{t('loginWelcome')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            {/* Email */}
            <div className="lp-a2">
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>
                {t('emailAddress')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#334155' }} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={t('placeholderEmail')}
                  autoComplete="off"
                  className={`lp-input w-full pl-10 pr-4 py-3 rounded-xl text-sm ${errors.email ? 'lp-input-err' : ''}`}
                />
              </div>
              {errors.email && <p className="mt-1.5 text-xs" style={{ color: '#F87171' }}>{errors.email}</p>}
              {rateLimitUntil && countdownLabel && (
                <p className="mt-1.5 text-xs" style={{ color: '#F87171' }}>Try again in {countdownLabel}</p>
              )}
            </div>

            {/* Password */}
            <div className="lp-a3">
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#334155' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={t('placeholderPassword')}
                  autoComplete="new-password"
                  className={`lp-input w-full pl-10 pr-11 py-3 rounded-xl text-sm ${errors.password ? 'lp-input-err' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#334155' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#64748B'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#334155'; }}
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs" style={{ color: '#F87171' }}>{errors.password}</p>}
            </div>

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between lp-a4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer"
                  style={{ accentColor: '#3B82F6' }}
                />
                <span className="text-sm" style={{ color: '#64748B' }}>{t('rememberMe')}</span>
              </label>
              <button
                type="button"
                className="text-sm font-medium transition-colors"
                style={{ color: '#3B82F6' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#93C5FD'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#3B82F6'; }}
              >
                {t('forgotPassword')}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="lp-btn-primary w-full py-3 h-12 rounded-xl font-semibold text-white text-sm lp-a5"
            >
              {t('Login Now!')}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 lp-a6">
              <div className="flex-1 h-px" style={{ background: 'rgba(30,41,59,0.8)' }} />
              <span className="text-xs font-medium" style={{ color: '#334155' }}>or</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(30,41,59,0.8)' }} />
            </div>

            {/* Sign Up */}
            <button
              type="button"
              onClick={openSignupModal}
              className="lp-btn-ghost w-full py-3 h-12 rounded-xl font-semibold text-sm lp-a7"
            >
              {t('signUp')}
            </button>
          </form>
        </div>
      </div>

      {/* ── Sign-Up Sliding Panel ── */}

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-500 ${
          showSignup ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={closeSignupModal}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full lg:w-[480px] z-50 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          showSignup ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: '#0D0D14',
          borderLeft: '1px solid rgba(59,130,246,0.12)',
        }}
      >
        <div className="relative w-full h-full overflow-hidden">
          {/* Close */}
          <button
            onClick={closeSignupModal}
            className="absolute top-6 right-6 p-2 rounded-lg z-10 transition-all"
            style={{ color: '#475569', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; e.currentTarget.style.color = '#94A3B8'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
            aria-label="Close sign-up"
          >
            <X className="w-5 h-5" />
          </button>

          {/* ── STEP 0: Welcome ── */}
          <div
            key={showSignup ? 'open' : 'closed'}
            className={`absolute inset-0 flex flex-col items-center justify-center px-8 pb-10 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              signupStep === 0 ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-full pointer-events-none'
            }`}
          >
            <div className="w-full max-w-sm text-center">
              <div
                className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-8"
                style={{
                  background: '#111118',
                  border: '1px solid rgba(59,130,246,0.2)',
                  animation: 'su-fadeInUp 0.5s ease 0.05s both',
                }}
              >
                <img src={itsLogo} alt="ITS Logo" className="w-12 h-12 object-contain" />
              </div>
              <h1
                className="text-3xl font-bold text-white mb-3"
                style={{ animation: 'su-fadeInUp 0.5s ease 0.15s both' }}
              >
                {t('welcomeToEquimon')}
              </h1>
              <p
                className="text-sm leading-relaxed max-w-xs mx-auto mb-10"
                style={{ color: '#64748B', animation: 'su-fadeInUp 0.5s ease 0.25s both' }}
              >
                Borrow smarter, manage better — your lab, your rules.
              </p>
              <div
                className="h-px mb-10"
                style={{
                  background: 'linear-gradient(to right, transparent, rgba(59,130,246,0.25), transparent)',
                  animation: 'su-fadeInUp 0.5s ease 0.3s both',
                }}
              />
              <button
                type="button"
                onClick={() => setSignupStep(1)}
                className="lp-btn-primary w-full py-3 h-12 rounded-xl font-semibold text-white text-sm"
                style={{ animation: 'su-fadeInUp 0.5s ease 0.38s both' }}
              >
                Get Started →
              </button>
              <button
                type="button"
                onClick={closeSignupModal}
                className="lp-btn-ghost w-full mt-3 py-3 h-12 rounded-xl font-semibold text-sm"
                style={{ animation: 'su-fadeInUp 0.5s ease 0.45s both' }}
              >
                {t('Back to Login')}
              </button>
            </div>
          </div>

          {/* ── STEP 1: Sign-Up Form ── */}
          <div
            className={`absolute inset-0 overflow-y-auto flex flex-col items-center justify-start px-8 pt-14 pb-10 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              signupStep === 1 ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-full pointer-events-none'
            }`}
          >
            <div className="w-full max-w-sm">
              {/* Header */}
              <div className="mb-7">
                <button
                  type="button"
                  onClick={() => setSignupStep(0)}
                  className="flex items-center gap-1.5 text-sm mb-5 transition-colors"
                  style={{ color: '#475569' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#94A3B8'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#475569'; }}
                >
                  ← Back
                </button>
                <h2 className="text-2xl font-bold text-white">{t('signUp')}</h2>
                <p className="text-sm mt-1" style={{ color: '#475569' }}>{t('loginWelcome')}</p>
              </div>

              <form onSubmit={handleSignupSubmit} className="space-y-5" autoComplete="off">
                {/* Name */}
                <div>
                  <label htmlFor="signup-name" className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>
                    {t('fullName')}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#334155' }} />
                    <input
                      type="text"
                      id="signup-name"
                      name="name"
                      value={signupForm.name}
                      onChange={handleSignupChange}
                      placeholder={t('placeholderFullName')}
                      autoComplete="off"
                      className={`su-input w-full pl-10 pr-4 py-3 rounded-xl text-sm ${signupErrors.name ? 'su-input-err' : ''}`}
                    />
                  </div>
                  {signupErrors.name && <p className="mt-1.5 text-xs" style={{ color: '#F87171' }}>{signupErrors.name}</p>}
                </div>

                {/* Student ID */}
                <div>
                  <label htmlFor="signup-studentId" className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>
                    Student ID
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#334155' }} />
                    <input
                      type="text"
                      id="signup-studentId"
                      name="studentId"
                      value={signupForm.studentId}
                      onChange={handleSignupChange}
                      placeholder="Enter your student ID"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      className={`su-input w-full pl-10 pr-4 py-3 rounded-xl text-sm ${signupErrors.studentId ? 'su-input-err' : ''}`}
                    />
                  </div>
                  {signupErrors.studentId && <p className="mt-1.5 text-xs" style={{ color: '#F87171' }}>{signupErrors.studentId}</p>}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="signup-email" className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>
                    {t('emailAddress')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#334155' }} />
                    <input
                      type="email"
                      id="signup-email"
                      name="email"
                      value={signupForm.email}
                      onChange={handleSignupChange}
                      placeholder={t('placeholderEmail')}
                      autoComplete="off"
                      className={`su-input w-full pl-10 pr-4 py-3 rounded-xl text-sm ${signupErrors.email ? 'su-input-err' : ''}`}
                    />
                  </div>
                  {signupErrors.email && <p className="mt-1.5 text-xs" style={{ color: '#F87171' }}>{signupErrors.email}</p>}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="signup-password" className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>
                    {t('password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#334155' }} />
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      id="signup-password"
                      name="password"
                      value={signupForm.password}
                      onChange={handleSignupChange}
                      placeholder={t('placeholderPassword')}
                      autoComplete="new-password"
                      className={`su-input w-full pl-10 pr-11 py-3 rounded-xl text-sm ${signupErrors.password ? 'su-input-err' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: '#334155' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#64748B'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#334155'; }}
                      aria-label={showSignupPassword ? t('hidePassword') : t('showPassword')}
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {signupErrors.password && <p className="mt-1.5 text-xs" style={{ color: '#F87171' }}>{signupErrors.password}</p>}
                  {!signupErrors.password && signupForm.password && (
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs" style={{ color: '#475569' }}>Password strength</p>
                        <p className={`text-xs font-semibold`} style={{
                          color: passwordStrength.tone === 'emerald' ? '#34D399'
                            : passwordStrength.tone === 'blue' ? '#60A5FA'
                            : '#F87171',
                        }}>
                          {passwordStrength.label}
                        </p>
                      </div>
                      <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(30,41,59,0.8)' }}>
                        <span
                          className="block h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${(passwordStrength.segments / 4) * 100}%`,
                            background: passwordStrength.tone === 'emerald' ? '#34D399'
                              : passwordStrength.tone === 'blue' ? '#3B82F6'
                              : '#EF4444',
                          }}
                        />
                      </div>
                      <p className="text-xs" style={{ color: '#334155' }}>
                        Use at least 6 characters, 1 uppercase letter, and 5 unique characters.
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="signup-confirmPassword" className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>
                    {t('confirmPassword')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#334155' }} />
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      id="signup-confirmPassword"
                      name="confirmPassword"
                      value={signupForm.confirmPassword}
                      onChange={handleSignupChange}
                      placeholder={t('placeholderConfirmPassword')}
                      autoComplete="new-password"
                      className={`su-input w-full pl-10 pr-4 py-3 rounded-xl text-sm ${signupErrors.confirmPassword ? 'su-input-err' : ''}`}
                    />
                  </div>
                  {signupErrors.confirmPassword && <p className="mt-1.5 text-xs" style={{ color: '#F87171' }}>{signupErrors.confirmPassword}</p>}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="lp-btn-primary w-full py-3 h-12 rounded-xl font-semibold text-white text-sm"
                >
                  {t('createAccount')}
                </button>

                {/* Back to login */}
                <button
                  type="button"
                  onClick={closeSignupModal}
                  className="lp-btn-ghost w-full py-3 h-12 rounded-xl font-semibold text-sm"
                >
                  {t('Back to Login')}
                </button>
              </form>
            </div>{/* /max-w-sm */}
          </div>{/* /step-1 */}
        </div>{/* /inner relative wrapper */}
      </div>{/* /drawer */}
    </div>
  );
}
