import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { api } from '@/api/apiClient';
import { useLang } from '@/components/i18n/LangContext';
import LandingBG from '@/components/layouts/LandingBG';

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLang();
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
          const user = await api.auth.login(formData.email, formData.password);
          console.log('Login successful:', user);
          // Navigate to dashboard page after successful login
          navigate('/dashboard');
        } catch (error) {
          console.error('Login failed:', error);
          setErrors({ email: t('errorInvalidCredentials') });
        }
      } else {
        // Handle sign up logic
        console.log('Sign up:', { 
          name: formData.name, 
          email: formData.email, 
          password: formData.password 
        });
        // For now, just switch to login mode after signup
        setIsLogin(true);
        setErrors({});
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
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-slate-900 mb-4">
              <FlaskConical className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {isLogin ? t('signIn') : t('signUp')}
            </h1>
            <p className="text-slate-600 text-sm">
              {isLogin ? t('loginWelcome') : t('equimonHelps')}
            </p>
          </div>

          {/* Quick Role Selector (Development Mode) - Only in Login */}
          {isLogin && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs font-semibold text-blue-900 mb-3">{t('quickLoginDev')}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, email: 'student@its.ac.id', password: 'test' })}
                  className="px-3 py-2 text-xs font-medium bg-white hover:bg-blue-100 text-slate-700 rounded-lg transition-colors border border-blue-200"
                >
                  {t('student')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, email: 'lecturer@its.ac.id', password: 'test' })}
                  className="px-3 py-2 text-xs font-medium bg-white hover:bg-blue-100 text-slate-700 rounded-lg transition-colors border border-blue-200"
                >
                  {t('lecturer')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, email: 'head@its.ac.id', password: 'test' })}
                  className="px-3 py-2 text-xs font-medium bg-white hover:bg-blue-100 text-slate-700 rounded-lg transition-colors border border-blue-200"
                >
                  {t('headoflab')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, email: 'assistant@its.ac.id', password: 'test' })}
                  className="px-3 py-2 text-xs font-medium bg-white hover:bg-blue-100 text-slate-700 rounded-lg transition-colors border border-blue-200"
                >
                  {t('labassistant')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, email: 'admin@its.ac.id', password: 'test' })}
                  className="px-3 py-2 text-xs font-medium bg-white hover:bg-blue-100 text-slate-700 rounded-lg transition-colors border border-blue-200 col-span-2"
                >
                  {t('admin')}
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
                    className={`w-full pl-11 pr-4 py-3 bg-white border ${
                      errors.name ? 'border-red-500' : 'border-slate-300'
                    } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                    placeholder="John Doe"
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
                  className={`w-full pl-11 pr-4 py-3 bg-white border ${
                    errors.email ? 'border-red-500' : 'border-slate-300'
                  } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  placeholder="John@ds@gmail.com"
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
                  className={`w-full pl-11 pr-12 py-3 bg-white border ${
                    errors.password ? 'border-red-500' : 'border-slate-300'
                  } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
                    className={`w-full pl-11 pr-4 py-3 bg-white border ${
                      errors.confirmPassword ? 'border-red-500' : 'border-slate-300'
                    } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                    placeholder="••••••••"
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
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-600/50">
              <FlaskConical className="w-16 h-16 text-white" />
            </div>
          </div>

          {/* Welcome Text */}
          <h2 className="text-4xl font-bold text-white mb-4">
            {t('welcomeToEquimon')}
          </h2>
          <p className="text-slate-300 text-lg mb-8">
            {t('equimonHelps')}
          </p>

          {/* Card */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-3">
              {t('joinEquimon')}
            </h3>
            <p className="text-slate-300 mb-6">
              {t('moreThanUsers')}
            </p>
            
            {/* Avatar Stack */}
            <div className="flex items-center justify-center gap-2">
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white shadow-lg"></div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 border-2 border-white shadow-lg"></div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 border-2 border-white shadow-lg"></div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 border-2 border-white shadow-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
