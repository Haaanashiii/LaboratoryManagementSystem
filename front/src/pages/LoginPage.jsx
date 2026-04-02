import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { api } from '@/api/apiClient';
import { useLang } from '@/components/i18n/LangContext';
import LandingBG from '@/components/layouts/LandingBG';
import equimonLogo from '@/assets/images/Equimon Logo.png';
import { useAuth } from '@/components/hooks/useAuth.js';
import BanterLoader from '@/components/ui/BanterLoader';

const ADMIN_ACCESS_ROLES = ['lecturer', 'head', 'head_of_lab', 'lab_assistant', 'admin'];

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

  // Sign-up modal state
  const [showSignup, setShowSignup] = useState(false);
  const [signupStep, setSignupStep] = useState(0); // 0 = welcome, 1 = form
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [signupErrors, setSignupErrors] = useState({});
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const normalizedRole = (user?.role || '').toLowerCase();
      const destination = ADMIN_ACCESS_ROLES.includes(normalizedRole)
        ? '/admin-dashboard'
        : '/dashboard';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  // Lock body scroll when signup modal is open; reset step on close
  useEffect(() => {
    document.body.style.overflow = showSignup ? 'hidden' : '';
    if (!showSignup) setSignupStep(0);
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
    if (!signupForm.email) newErrors.email = t('errorEmailRequired');
    else if (!/\S+@\S+\.\S+/.test(signupForm.email)) newErrors.email = t('errorEmailInvalid');
    if (!signupForm.password) newErrors.password = t('errorPasswordRequired');
    else if (signupForm.password.length < 6) newErrors.password = t('errorPasswordLength');
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
        navigate(location.state.from.pathname, { replace: true });
        return;
      }

      const normalizedRole = (user?.role || '').toLowerCase();
      const defaultDestination = ADMIN_ACCESS_ROLES.includes(normalizedRole)
        ? '/admin-dashboard'
        : '/dashboard';
      navigate(defaultDestination, { replace: true });
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
      });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Registration failed:', error);
      setSignupErrors({ email: error.message || t('errorRegistrationFailed') });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative bg-white">
        <BanterLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <style>{`
        @keyframes loginFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 items-center justify-center p-12 overflow-hidden">
        {/* Background with Orb */}
        <div className="absolute inset-0">
          <LandingBG />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-md text-center">
          <div className="mb-8 flex items-center justify-center">
            <div className="w-40 h-40 rounded-3xl flex items-center justify-center">
              <img src={equimonLogo} alt="Equimon Logo" className="w-full h-full object-contain" />
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white mb-4">
            {t('welcomeToEquimon')}
          </h2>
          <p className="text-slate-300 text-lg mb-8">
            {t('equimonHelps')}
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative overflow-hidden">
        {/* Back to Home Button - Top Right */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 right-6 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors flex items-center gap-2"
        >
          ← {t('backToHome')}
        </button>

        <div
          className="w-full max-w-md"
          style={{ animation: 'loginFadeIn 0.45s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          {/* Logo and Title */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl mb-4">
              <img src={equimonLogo} alt="Equimon Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('signIn')}</h1>
            <p className="text-slate-600 text-sm">{t('loginWelcome')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                {t('emailAddress')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={t('placeholderEmail')}
                  autoComplete="off"
                  className={`w-full pl-11 pr-4 py-3 bg-white border ${
                    errors.email ? 'border-red-500' : 'border-slate-300'
                  } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              {rateLimitUntil && countdownLabel && (
                <p className="mt-1 text-sm text-red-600">Try again in {countdownLabel}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={t('placeholderPassword')}
                  autoComplete="new-password"
                  className={`w-full pl-11 pr-12 py-3 bg-white border ${
                    errors.password ? 'border-red-500' : 'border-slate-300'
                  } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-sm text-slate-700">{t('rememberMe')}</span>
              </label>
              <button
                type="button"
                className="text-sm text-slate-900 hover:text-blue-600 font-medium transition-colors"
              >
                {t('forgotPassword')}
              </button>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 h-12 rounded-xl transition-all shadow-lg shadow-slate-900/20"
            >
              {t('Login Now!')}
            </Button>

            {/* Sign Up — opens sliding modal */}
            <button
              type="button"
              onClick={() => setShowSignup(true)}
              className="w-full mt-3 py-3 h-12 rounded-xl font-semibold border-2 border-slate-300 text-slate-700 hover:border-slate-900 hover:text-slate-900 transition-all duration-300"
            >
              {t('signUp')}
            </button>
          </form>
        </div>
      </div>

      {/* ── Sign-Up Sliding Panel ── */}

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-500 ${
          showSignup ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowSignup(false)}
      />

      {/* Drawer — slides in from the right */}
      <div
        className={`fixed top-0 right-0 h-full w-full lg:w-1/2 z-50 bg-white shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          showSignup ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Inner wrapper needed for absolute-positioned steps */}
        <div className="relative w-full h-full overflow-hidden">
        {/* Close Button */}
        <button
          onClick={() => setShowSignup(false)}
          className="absolute top-6 right-6 text-slate-500 hover:text-slate-900 transition-colors p-1 rounded-lg hover:bg-slate-100 z-10"
          aria-label="Close sign-up"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── STEP 0: Welcome Page ── */}
        <div
          key={showSignup ? 'open' : 'closed'}
          className={`absolute inset-0 flex flex-col items-center justify-center px-8 pb-10 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            signupStep === 0 ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-full pointer-events-none'
          }`}
        >
          <div className="w-full max-w-md text-center">
            <div className="inline-flex items-center justify-center w-28 h-28 rounded-3xl mb-8 animate-[fadeInUp_0.5s_ease_0.05s_both]">
              <img src={equimonLogo} alt="Equimon Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4 animate-[fadeInUp_0.5s_ease_0.15s_both]">
              {t('welcomeToEquimon')}
            </h1>
            <p className="text-slate-500 text-base leading-relaxed max-w-sm mx-auto mb-10 animate-[fadeInUp_0.5s_ease_0.25s_both]">
              Borrow smarter, manage better — your lab, your rules.
            </p>
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-10 animate-[fadeInUp_0.5s_ease_0.35s_both]" />
            <Button
              type="button"
              onClick={() => setSignupStep(1)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 h-12 rounded-xl transition-all shadow-lg shadow-slate-900/20 animate-[fadeInUp_0.5s_ease_0.4s_both]"
            >
              Get Started →
            </Button>
            <button
              type="button"
              onClick={() => setShowSignup(false)}
              className="w-full mt-3 py-3 h-12 rounded-xl font-semibold border-2 border-slate-300 text-slate-700 hover:border-slate-900 hover:text-slate-900 transition-all duration-300 animate-[fadeInUp_0.5s_ease_0.45s_both]"
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
          <div className="w-full max-w-md">
            {/* Section header */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setSignupStep(0)}
                className="text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4 flex items-center gap-1"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-slate-900">{t('signUp')}</h2>
              <p className="text-slate-500 text-sm mt-1">{t('loginWelcome')}</p>
            </div>

          <form onSubmit={handleSignupSubmit} className="space-y-5" autoComplete="off">
            {/* Name Field */}
            <div>
              <label htmlFor="signup-name" className="block text-sm font-medium text-slate-700 mb-2">
                {t('fullName')}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  id="signup-name"
                  name="name"
                  value={signupForm.name}
                  onChange={handleSignupChange}
                  placeholder={t('placeholderFullName')}
                  autoComplete="off"
                  className={`w-full pl-11 pr-4 py-3 bg-white border ${
                    signupErrors.name ? 'border-red-500' : 'border-slate-300'
                  } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                />
              </div>
              {signupErrors.name && <p className="mt-1 text-sm text-red-600">{signupErrors.name}</p>}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-slate-700 mb-2">
                {t('emailAddress')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  id="signup-email"
                  name="email"
                  value={signupForm.email}
                  onChange={handleSignupChange}
                  placeholder={t('placeholderEmail')}
                  autoComplete="off"
                  className={`w-full pl-11 pr-4 py-3 bg-white border ${
                    signupErrors.email ? 'border-red-500' : 'border-slate-300'
                  } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                />
              </div>
              {signupErrors.email && <p className="mt-1 text-sm text-red-600">{signupErrors.email}</p>}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-slate-700 mb-2">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showSignupPassword ? "text" : "password"}
                  id="signup-password"
                  name="password"
                  value={signupForm.password}
                  onChange={handleSignupChange}
                  placeholder={t('placeholderPassword')}
                  autoComplete="new-password"
                  className={`w-full pl-11 pr-12 py-3 bg-white border ${
                    signupErrors.password ? 'border-red-500' : 'border-slate-300'
                  } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showSignupPassword ? t('hidePassword') : t('showPassword')}
                >
                  {showSignupPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {signupErrors.password && <p className="mt-1 text-sm text-red-600">{signupErrors.password}</p>}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="signup-confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                {t('confirmPassword')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showSignupPassword ? "text" : "password"}
                  id="signup-confirmPassword"
                  name="confirmPassword"
                  value={signupForm.confirmPassword}
                  onChange={handleSignupChange}
                  placeholder={t('placeholderConfirmPassword')}
                  autoComplete="new-password"
                  className={`w-full pl-11 pr-4 py-3 bg-white border ${
                    signupErrors.confirmPassword ? 'border-red-500' : 'border-slate-300'
                  } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                />
              </div>
              {signupErrors.confirmPassword && <p className="mt-1 text-sm text-red-600">{signupErrors.confirmPassword}</p>}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 h-12 rounded-xl transition-all shadow-lg shadow-slate-900/20"
            >
              {t('createAccount')}
            </Button>

            {/* Back to Sign In */}
            <button
              type="button"
              onClick={() => setShowSignup(false)}
              className="w-full mt-3 py-3 h-12 rounded-xl font-semibold border-2 border-slate-300 text-slate-700 hover:border-slate-900 hover:text-slate-900 transition-all duration-300"
            >
              {t('Back to Login')}
            </button>
          </form>

          </div>{/* /max-w-md */}
        </div>{/* /step-1 */}
        </div>{/* /inner relative wrapper */}
      </div>{/* /drawer */}
    </div>
  );
}
