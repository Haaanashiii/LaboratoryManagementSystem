import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, ShieldCheck, Lock } from 'lucide-react';

import Threads from '@/components/ui/Threads';
import { Button } from '@/components/ui/button';
import { api, clearStoredAuth } from '@/api/apiClient';
import equimonLogo from '@/assets/images/Equimon Logo.png';
import itsSecondLogo from '@/assets/images/ITSSecond.png';
import { useAuth } from '@/components/hooks/useAuth.js';

const ADMIN_ACCESS_ROLES = ['lecturer', 'head_of_lab', 'lab_assistant', 'admin'];

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user, refreshSession } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

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

    if (!formData.email || !formData.password) {
      setError('Email and password are required.');
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
        setError('This account cannot access the admin portal.');
        return;
      }

      navigate('/admin-dashboard', { replace: true });
    } catch (loginError) {
      setError(loginError.message || 'Invalid credentials.');
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
              ADMIN ACCESS
            </div>
            <h1 className="text-3xl font-bold text-white">Admin Login</h1>
            <p className="mt-2 text-sm text-slate-300">Sign in to manage laboratory operations.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder=""
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-11 pr-12 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-cyan-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-cyan-400 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-cyan-900/40 disabled:text-slate-400"
            >
              {loading ? 'Signing in...' : 'Sign In as Admin'}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-6 w-full text-sm font-medium text-cyan-200 transition hover:text-cyan-100"
          >
            Use regular login instead
          </button>
        </div>
      </div>
    </div>
  );
}
