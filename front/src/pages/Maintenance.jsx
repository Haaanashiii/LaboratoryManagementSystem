import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCcw, CheckCircle, Loader2, Wrench } from 'lucide-react';
import LightRays from './LightRays';
import { useLang } from '@/components/i18n/LangContext';

const MAINTENANCE_STEPS = [
  { label: 'Reviewing system configurations' },
  { label: 'Updating core modules' },
  { label: 'Running quality checks' },
];

export default function Maintenance() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [statusView, setStatusView] = useState('maintenance');
  const [checking, setChecking] = useState(false);

  const checkStatus = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiBase}/auth/maintenance-status`);
      const payload = await response.json().catch(() => ({}));

      if (response.ok && payload?.data?.maintenanceMode === false) {
        navigate('/login', { replace: true });
        return;
      }

      setStatusView('maintenance');
    } catch {
      setStatusView('offline');
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleRetry = async () => {
    setChecking(true);
    await checkStatus();
    setChecking(false);
  };

  const isOffline = statusView === 'offline';

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">

      {/* Light rays background */}
      <div className="absolute inset-0 opacity-70">
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <LightRays
            raysOrigin="top-center"
            raysColor="#ffffff"
            raysSpeed={1}
            lightSpread={0.5}
            rayLength={3}
            followMouse={true}
            mouseInfluence={0.1}
            noiseAmount={0}
            distortion={0}
            className="custom-rays"
            pulsating={false}
            fadeDistance={1}
            saturation={1}
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.18),transparent_45%),radial-gradient(circle_at_80%_75%,rgba(244,114,182,0.14),transparent_40%)]" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-10">

        {/* Brand */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
            <Wrench className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold leading-none text-white">{t('appName')}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{t('versionTagline')}</p>
          </div>
        </div>

        {/* Main card */}
        <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-slate-900/70 p-8 text-center shadow-2xl backdrop-blur-md sm:p-10">

          {/* Status badge */}
          <div className={`mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.1em] ${
            isOffline
              ? 'border-slate-500/30 bg-slate-400/10 text-slate-300'
              : 'border-amber-200/30 bg-amber-300/10 text-amber-200'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${
              isOffline ? 'bg-slate-400' : 'bg-amber-400 animate-pulse'
            }`} />
            {isOffline ? t('offline').toUpperCase() : t('maintenance').toUpperCase()}
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {isOffline ? 'Connection Lost' : "We'll Be Right Back"}
          </h1>

          {/* Subtext */}
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            {isOffline
              ? "We're having trouble connecting to the server. Please check your network and try again."
              : 'Our team is performing scheduled maintenance to keep the system running at its best. Thank you for your patience.'}
          </p>

          {/* Progress steps (maintenance only) */}
          {!isOffline && (
            <div className="mt-6 space-y-2 text-left">
              {MAINTENANCE_STEPS.map((step, i) => {
                const isDone = i < MAINTENANCE_STEPS.length - 1;
                const isActive = i === MAINTENANCE_STEPS.length - 1;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5"
                  >
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      isDone ? 'bg-emerald-500' : isActive ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'
                    }`}>
                      {isDone
                        ? <CheckCircle className="h-3 w-3 text-white" />
                        : <div className="h-2 w-2 rounded-full bg-slate-900" />}
                    </div>
                    <span className={`text-sm ${isDone ? 'text-slate-400' : 'font-medium text-white'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleRetry}
              disabled={checking}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {checking
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <RefreshCcw className="h-4 w-4" />}
              {checking ? 'Checking...' : t('retry')}
            </button>

            <p className="text-xs text-slate-500">
              Need urgent access? Contact your laboratory administrator.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-[11px] text-slate-600">
          © {new Date().getFullYear()} {t('appName')} · All rights reserved
        </p>
      </div>
    </div>
  );
}
