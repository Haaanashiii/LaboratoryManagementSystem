import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FlaskConical, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
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
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const normalizedRole = (user?.role || '').toLowerCase();
      const destination = ADMIN_ACCESS_ROLES.includes(normalizedRole)
        ? '/admin-dashboard'
        : '/dashboard';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = t('errorEmailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('errorEmailInvalid');
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = t('errorPasswordRequired');
    } else if (formData.password.length < 6) {
      newErrors.password = t('errorPasswordLength');
    }

    // Sign up specific validation
    if (!isLogin) {
      if (!formData.name) {
        newErrors.name = t('errorNameRequired');
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = t('errorConfirmPassword');
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('errorPasswordMismatch');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      if (isLogin) {
        try {
          // Handle login logic
          await api.auth.login(formData.email, formData.password);
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

          // Role-aware default destination after successful login.
          navigate(defaultDestination, { replace: true });
        } catch (error) {
          console.error('Login failed:', error);
          setErrors({ email: error.message || t('errorInvalidCredentials') });
        }
      } else {
        // Handle sign up logic
        try {
          const user = await api.auth.register({
            name: formData.name,
            email: formData.email,
            password: formData.password,
          });
          console.log('Registration successful:', user);
          navigate('/dashboard', { replace: true });
        } catch (error) {
          console.error('Registration failed:', error);
          setErrors({ email: error.message || t('errorRegistrationFailed') });
        }
      }
    }
  };

  const toggleMode  = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setFormData({
      email: '',
      password: '',
      name: '',
      confirmPassword: ''
    });
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
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
        {/* Back to Home Button - Top Left */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors flex items-center gap-2"
        >
          ← {t('backToHome')}
        </button>

        <div className="w-full max-w-md">
          {/* Logo and Title */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl mb-4">
              <img src={equimonLogo} alt="Equimon Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {isLogin ? t('signIn') : t('signUp')}
            </h1>
            <p className="text-slate-600 text-sm">
              {isLogin ? t('loginWelcome') : t('equimonHelps')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            {/* Name Field (Sign Up Only) */}
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                  {t('fullName')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder={t('placeholderFullName')}
                    autoComplete="off"
                    className={`w-full pl-11 pr-4 py-3 bg-white border ${
                      errors.name ? 'border-red-500' : 'border-slate-300'
                    } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>
            )}

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
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
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
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field (Sign Up Only) */}
            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                  {t('confirmPassword')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder={t('placeholderConfirmPassword')}
                    autoComplete="new-password"
                    className={`w-full pl-11 pr-4 py-3 bg-white border ${
                      errors.confirmPassword ? 'border-red-500' : 'border-slate-300'
                    } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* Remember Me and Forgot Password (Login Only) */}
            {isLogin && (
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
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 h-12 rounded-xl transition-all shadow-lg shadow-slate-900/20"
            >
              {isLogin ? t('signIn') : t('createAccount')}
            </Button>
          </form>

          {/* Toggle between Login and Sign Up */}
          <div className="mt-6 text-center">
            <p className="text-slate-600 text-sm">
              {isLogin ? t('dontHaveAccount') + ' ' : t('alreadyHaveAccount') + ' '}
              <button
                onClick={toggleMode}
                className="text-slate-900 hover:text-blue-600 font-semibold transition-colors"
              >
                {isLogin ? t('signUp') : t('signIn')}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 items-center justify-center p-12 overflow-hidden">
        {/* Background with Orb */}
        <div className="absolute inset-0">
          <LandingBG />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-md text-center">
          {/* Large Logo */}
          <div className="mb-8 flex items-center justify-center">
            <div className="w-40 h-40 rounded-3xl flex items-center justify-center">
              <img src={equimonLogo} alt="Equimon Logo" className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Welcome Text */}
          <h2 className="text-4xl font-bold text-white mb-4">
            {t('welcomeToEquimon')}
          </h2>
          <p className="text-slate-300 text-lg">
            {t('equimonHelps')}
          </p>
        </div>
      </div>
    </div>
  );
}
