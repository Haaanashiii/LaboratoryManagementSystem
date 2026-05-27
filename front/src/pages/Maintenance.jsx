import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '@/components/i18n/LangContext';
import ShapeGrid from '@/components/bits/ShapeGrid';
import towerLogo from '@/assets/images/Tower2.png';

export default function Maintenance() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [checking, setChecking] = useState(false);
  const [offline, setOffline] = useState(false);
  const year = new Date().getFullYear();

  const checkStatus = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const res = await fetch(`${apiBase}/auth/maintenance-status`);
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload?.data?.maintenanceMode === false) {
        navigate('/login', { replace: true });
        return;
      }
      setOffline(false);
    } catch {
      setOffline(true);
    }
  };

  useEffect(() => { checkStatus(); }, []);

  const handleRetry = async () => {
    setChecking(true);
    await checkStatus();
    setChecking(false);
  };

  return (
    <div style={{
      height: '100vh', background: '#0A0A0F',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: '#cbd5e1', position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
        @keyframes rotateSlow { to { transform: rotate(360deg); } }
      `}</style>

      {/* ShapeGrid background — matches login page */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
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

      {/* Depth gradient */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.07) 0%, transparent 65%)',
      }} />

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: '#475569', fontFamily: 'monospace' }}>EQU · ITS</span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: '#475569', fontFamily: 'monospace' }}>REF: {year}</span>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', position: 'relative', zIndex: 10 }}>

        {/* ITS Logo area */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ margin: '0 auto 14px', display: 'flex', justifyContent: 'center' }}>
            <img src={towerLogo} alt="ITS Logo" style={{ width: 180, height: 'auto', objectFit: 'contain' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.04em' }}>
Institut Teknologi Sepuluh Nopember</div>
          <div style={{ fontSize: 9, letterSpacing: '0.25em', color: '#475569', textTransform: 'uppercase', marginTop: 3, fontFamily: 'monospace' }}>
            Laboratory Management System
          </div>
        </div>

        {/* Terminal card */}
        <div style={{
          width: '100%', maxWidth: 420,
          background: 'rgba(10,20,40,0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 4,
          boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.08)',
          backdropFilter: 'blur(12px)',
          overflow: 'hidden',
        }}>
          {/* Card header bar */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', opacity: 0.7 }} />
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', opacity: 0.7 }} />
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', opacity: 0.7 }} />
            <span style={{ marginLeft: 8, fontSize: 9, fontFamily: 'monospace', color: '#475569', letterSpacing: '0.12em' }}>SYSTEM STATUS</span>
          </div>

          <div style={{ padding: '20px 22px' }}>
            {/* Badge */}
            <div style={{ marginBottom: 14 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.18em',
                color: offline ? '#94a3b8' : '#3b82f6',
                background: offline ? 'rgba(148,163,184,0.1)' : 'rgba(59,130,246,0.1)',
                border: `1px solid ${offline ? 'rgba(148,163,184,0.2)' : 'rgba(59,130,246,0.2)'}`,
                padding: '3px 10px', borderRadius: 3,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: offline ? '#64748b' : '#3b82f6',
                  animation: offline ? 'none' : 'pulse 2s ease-in-out infinite',
                  display: 'inline-block',
                }} />
                {offline ? '# CONNECTION LOST' : '# SCHEDULED MAINTENANCE'}
              </span>
            </div>

            {/* Heading */}
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.15, marginBottom: 10, fontFamily: 'Georgia, serif' }}>
              {offline ? 'Connection Lost.' : "We'll Be Right Back."}
            </h1>

            {/* Subtext */}
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.65, marginBottom: 18 }}>
              {offline
                ? "We're having trouble reaching the server. Please check your network and try again."
                : 'Our team is performing scheduled maintenance to keep the system running at its best. Thank you for your patience.'}
            </p>

            {/* Maintenance in progress button */}
            <button
              onClick={handleRetry}
              disabled={checking}
              style={{
                width: '100%', padding: '10px 0',
                background: checking ? 'rgba(29,78,216,0.5)' : offline ? 'rgba(29,78,216,0.6)' : '#1d4ed8',
                color: '#fff', border: 'none', borderRadius: 3,
                fontSize: 11, fontWeight: 800, letterSpacing: '0.12em',
                textTransform: 'uppercase', cursor: checking ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.2s',
              }}
            >
              <span style={{
                display: 'inline-block', width: 12, height: 12,
                border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                flexShrink: 0,
              }} />
              {checking ? 'Checking…' : offline ? 'Retry Connection' : 'Maintenance in Progress…'}
            </button>

            {/* Admin link */}
            <p style={{ fontSize: 10, color: '#334155', textAlign: 'center', marginTop: 12 }}>
              Need urgent access?{' '}
              <span style={{ color: '#475569', textDecoration: 'underline', cursor: 'default' }}>
                Contact your laboratory administrator
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'relative', zIndex: 2,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '12px 28px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 9, letterSpacing: '0.18em', color: '#1e293b', fontFamily: 'monospace' }}>
          © {year} ITS LABORATORY MANAGEMENT SYSTEM · ALL RIGHTS RESERVED · SURABAYA, ID
        </span>
        <span style={{ fontSize: 9, letterSpacing: '0.18em', color: '#1e293b', fontFamily: 'monospace' }}>PAG. 01</span>
      </div>
    </div>
  );
}
