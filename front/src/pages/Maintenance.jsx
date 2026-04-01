import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import LightRays from './LightRays';

export default function Maintenance() {
  const navigate = useNavigate();
  const [statusView, setStatusView] = useState('maintenance');

  useEffect(() => {
    const checkMaintenanceStatus = async () => {
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

    checkMaintenanceStatus();
  }, [navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
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

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-slate-900/70 p-8 text-center shadow-2xl backdrop-blur-md sm:p-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            {statusView === 'offline' ? 'OFFLINE' : 'MAINTENANCE'}
          </div>

          {statusView === 'offline' && (
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">Page is currently offline.</h1>
          )}

          {statusView === 'maintenance' && (
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">Page is under maintenance.</h1>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
