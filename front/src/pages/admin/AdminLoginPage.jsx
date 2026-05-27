import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, clearStoredAuth, getPortalOrigin } from '@/api/apiClient';
import itsSecondLogo from '@/assets/images/Tower2.png';
import { useAuth } from '@/components/hooks/useAuth.js';
import { useLang } from '@/components/i18n/LangContext';

const C = {
  bg:         '#050a14',
  bgDeep:     '#020509',
  surface:    '#0b1933',
  surface2:   '#142a4d',
  surface3:   '#1d3a66',
  border:     '#1f3a64',
  borderSoft: '#15294a',
  text:       '#e6ecf5',
  text2:      '#b8c4d6',
  text3:      '#7c8aa1',
  text4:      '#4f5b73',
  blue:       '#5fa0ff',
  blueSoft:   '#3777d9',
  cyan:       '#a8d4ff',
  ok:         '#5fa0ff',
};

const ADMIN_ACCESS_ROLES = ['lecturer', 'head', 'head_of_lab', 'lab_assistant', 'admin'];

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { t, lang, toggleLang } = useLang();
  const { isAuthenticated, isLoading, user, refreshSession } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [generalError, setGeneralError] = useState('');
  const [rateLimitUntil, setRateLimitUntil] = useState(null);
  const [countdownNow, setCountdownNow] = useState(0);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('adminRememberEmail'));
  const [formData, setFormData] = useState({ email: localStorage.getItem('adminRememberEmail') || '', password: '' });
  const [focused, setFocused] = useState({ email: false, password: false });

  useEffect(() => {
    if (!rateLimitUntil) return;
    const interval = window.setInterval(() => setCountdownNow(Date.now()), 1000);
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
    if (!isLoading && isAuthenticated && getPortalOrigin() === 'admin') {
      const normalizedRole = (user?.role || '').toLowerCase();
      if (ADMIN_ACCESS_ROLES.includes(normalizedRole)) {
        navigate('/admin-dashboard', { replace: true });
      }
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

      await api.auth.adminLogin(formData.email, formData.password, rememberMe);
      const currentUser = await refreshSession();
      const normalizedRole = (currentUser?.role || '').toLowerCase();

      if (!ADMIN_ACCESS_ROLES.includes(normalizedRole)) {
        clearStoredAuth();
        setGeneralError(t('adminErrorNoAccess'));
        return;
      }

      if (rememberMe) {
        localStorage.setItem('adminRememberEmail', formData.email);
      } else {
        localStorage.removeItem('adminRememberEmail');
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
      const status = loginError?.status;
      if (status === 401 || status === 403) {
        setFieldErrors({ email: '​', password: t('adminErrorInvalidPassword') });
      } else {
        setGeneralError(loginError.message || t('adminErrorInvalidCredentials'));
      }
    } finally {
      setLoading(false);
    }
  };

  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  const serif = { fontFamily: '"Source Serif 4", Georgia, serif' };

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      fontFamily: 'Inter, sans-serif', position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 48, boxSizing: 'border-box', color: C.text,
    }}>

      {/* Atmosphere gradients */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 75% 65% at 50% 25%, ${C.surface2}cc 0%, ${C.surface}77 35%, ${C.bg} 65%, ${C.bgDeep} 100%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -220, left: '50%', transform: 'translateX(-50%)', width: 960, height: 640, background: `radial-gradient(ellipse, ${C.blue}1a 0%, transparent 60%)`, pointerEvents: 'none', filter: 'blur(12px)' }} />

      {/* Dot grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(${C.blue}10 1px, transparent 1px)`, backgroundSize: '26px 26px', opacity: 0.45, pointerEvents: 'none' }} />

      {/* Horizon rules */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, transparent, ${C.blue}, transparent)` }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(to right, transparent, ${C.blue}55, transparent)` }} />

      {/* Corner monograms */}
      
      <div style={{ position: 'absolute', top: 20, right: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: C.blue, opacity: 0.75, ...mono, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Est. 2026 · Surabaya</span>
        <button
          onClick={toggleLang}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 8px', borderRadius: 3, cursor: 'pointer',
            background: 'transparent', color: C.text3,
            border: `1px solid ${C.border}`,
            ...mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.blue; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text3; }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/>
          </svg>
          {lang === 'en' ? 'ID' : 'EN'}
        </button>
      </div>
      <div style={{ position: 'absolute', bottom: 24, left: 32, color: C.text4, ...mono, fontSize: 9.5, letterSpacing: '0.22em', textTransform: 'uppercase' }}>EQM-AUTH-20260518</div>

      {/* ── Two-column layout ── */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 1200, display: 'grid', gridTemplateColumns: '1fr 480px', gap: 80, alignItems: 'center' }}>

        {/* ─── LEFT · institutional showcase ─── */}
        <div style={{ paddingLeft: 8 }}>


          {/* Headline */}
          <div style={{ marginTop: 36, maxWidth: 520 }}>
            <div style={{ ...serif, fontSize: 54, fontWeight: 600, color: C.text, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
              {t('adminLoginHeadline')}
            </div>
          </div>

        </div>

        {/* ─── RIGHT · login card ─── */}
        <div style={{
          position: 'relative', padding: '34px 36px 28px',
          background: `linear-gradient(to bottom, ${C.surface2}ee, ${C.surface}ee)`,
          backdropFilter: 'blur(8px)',
          border: `1px solid ${C.border}`, borderRadius: 6,
          boxShadow: `0 30px 80px -20px rgba(0,0,0,0.65), 0 0 0 1px ${C.blue}15, inset 0 1px 0 ${C.blue}22`,
        }}>

          {/* Blue left strip */}
          <div style={{ position: 'absolute', left: 0, top: 30, bottom: 30, width: 3, background: C.blue, borderRadius: '0 2px 2px 0', boxShadow: `0 0 12px ${C.blue}77` }} />

          {/* Corner brackets */}
          {[{ t: 8, l: 8 }, { t: 8, r: 8 }, { b: 8, l: 8 }, { b: 8, r: 8 }].map((corner, i) => (
            <div key={i} style={{
              position: 'absolute', width: 14, height: 14, borderColor: `${C.blue}77`,
              borderStyle: 'solid', borderWidth: 0,
              borderTopWidth:    corner.t !== undefined ? 1 : 0,
              borderBottomWidth: corner.b !== undefined ? 1 : 0,
              borderLeftWidth:   corner.l !== undefined ? 1 : 0,
              borderRightWidth:  corner.r !== undefined ? 1 : 0,
              ...(corner.t !== undefined ? { top:    corner.t } : {}),
              ...(corner.b !== undefined ? { bottom: corner.b } : {}),
              ...(corner.l !== undefined ? { left:   corner.l } : {}),
              ...(corner.r !== undefined ? { right:  corner.r } : {}),
            }} />
          ))}

          {/* Eyebrow */}
          <div style={{ width: '100%', marginBottom: 10, background: `radial-gradient(ellipse at center, ${C.surface3}88 0%, transparent 70%)`, borderRadius: 4, overflow: 'hidden' }}>
            <img src={itsSecondLogo} alt="ITS Logo" style={{ width: '100%', height: 'auto', display: 'block', filter: `drop-shadow(0 0 20px ${C.blue}66)` }} />
          </div>


          {/* Title */}
          <div>
            <div style={{ ...mono, fontSize: 10, letterSpacing: '0.24em', color: C.blue, textTransform: 'uppercase' }}>{t('adminAccess')}</div>
            <div style={{ ...serif, fontSize: 34, fontWeight: 600, color: C.text, marginTop: 6, letterSpacing: '-0.018em', lineHeight: 1.1 }}>{t('adminLoginTitle')}</div>
            <div style={{ ...serif, fontStyle: 'italic', fontSize: 13.5, color: C.text2, marginTop: 6, lineHeight: 1.5 }}>{t('adminLoginSubtitle')}</div>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }} autoComplete="off">

            {/* Email */}
            <div>
              <div style={{ ...mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.text3, fontWeight: 600, marginBottom: 7 }}>{t('adminEmailLabel')}</div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.text4, display: 'flex', pointerEvents: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><path d="M22 6l-10 7L2 6" />
                  </svg>
                </span>
                <input
                  id="email" name="email" type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onFocus={() => setFocused(p => ({ ...p, email: true }))}
                  onBlur={() => setFocused(p => ({ ...p, email: false }))}
                  placeholder={t('adminEmailPlaceholder')}
                  autoComplete="username"
                  style={{
                    width: '100%', padding: '11px 14px 11px 36px', boxSizing: 'border-box',
                    background: `${C.bgDeep}cc`, color: C.text,
                    border: `1px solid ${fieldErrors.email ? 'rgba(239,68,68,0.7)' : focused.email || formData.email ? `${C.blue}aa` : C.border}`,
                    borderRadius: 6, fontFamily: 'Inter, sans-serif', fontSize: 13.5, outline: 'none',
                  }}
                />
              </div>
              {fieldErrors.email && fieldErrors.email.trim() && (
                <p style={{ ...mono, fontSize: 10, color: '#f87171', marginTop: 5 }}>{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <div style={{ ...mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.text3, fontWeight: 600 }}>{t('adminPasswordLabel')}</div>
                <button type="button" style={{ ...mono, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.blue, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: `${C.blue}55`, textUnderlineOffset: 3 }}>{t('adminForgotPassword')}</button>
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.text4, display: 'flex', pointerEvents: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 11h14v10H5z" /><path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </span>
                <input
                  id="password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  onFocus={() => setFocused(p => ({ ...p, password: true }))}
                  onBlur={() => setFocused(p => ({ ...p, password: false }))}
                  placeholder={t('adminPasswordPlaceholder')}
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '11px 38px 11px 36px', boxSizing: 'border-box',
                    background: `${C.bgDeep}cc`, color: C.text,
                    border: `1px solid ${fieldErrors.password ? 'rgba(239,68,68,0.7)' : focused.password || formData.password ? `${C.blue}aa` : C.border}`,
                    borderRadius: 6, fontFamily: 'Inter, sans-serif', fontSize: 13.5, outline: 'none',
                    letterSpacing: showPassword ? 'normal' : '0.18em',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, color: C.text3, cursor: 'pointer', display: 'flex' }}
                >
                  {showPassword ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><path d="M1 1l22 22" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p style={{ ...mono, fontSize: 10, color: '#f87171', marginTop: 5 }}>{fieldErrors.password}</p>
              )}
            </div>

            {/* Remember me + 2FA */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
              <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <div
                  onClick={() => setRememberMe(prev => !prev)}
                  style={{
                    width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                    background: rememberMe ? C.blue : 'transparent',
                    border: `1px solid ${rememberMe ? C.blue : C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {rememberMe && (
                    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke={C.bgDeep} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </div>
                <span style={{ ...serif, fontSize: 12.5, color: C.text2, fontStyle: 'italic' }}>{t('adminKeepSignedIn')}</span>
              </label>
              <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2"><path d="M12 2L4 5v6c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V5l-8-3z" /></svg>
                <span style={{ ...mono, fontSize: 9.5, letterSpacing: '0.18em', color: C.blue, textTransform: 'uppercase' }}>{t('admin2FAEnrolled')}</span>
              </div>
            </div>

            {/* General error */}
            {generalError && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.07)', padding: '10px 12px' }}>
                <span style={{ ...mono, fontSize: 12, color: '#f87171', marginTop: 1 }}>›</span>
                <p style={{ fontSize: 12, color: '#fca5a5', lineHeight: 1.5, margin: 0 }}>{generalError}</p>
              </div>
            )}
            {isRateLimited && countdownLabel && (
              <p style={{ ...mono, fontSize: 12, color: '#f87171' }}>{t('adminRetryIn')} {countdownLabel}</p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || isRateLimited}
              style={{
                width: '100%', marginTop: 8, padding: '14px 22px',
                display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 10,
                borderRadius: 5, cursor: loading || isRateLimited ? 'not-allowed' : 'pointer',
                background: loading || isRateLimited ? '#1e293b' : `linear-gradient(to bottom, ${C.blue}, ${C.blueSoft})`,
                color: loading || isRateLimited ? '#475569' : C.bgDeep,
                border: loading || isRateLimited ? '1px solid #334155' : `1px solid ${C.blue}`,
                boxShadow: loading || isRateLimited ? 'none' : `0 4px 24px ${C.blue}66, inset 0 1px 0 ${C.cyan}88`,
                ...mono, fontSize: 11.5, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
              }}
            >
              {loading ? (
                <>
                  <span style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${C.bgDeep}44`, borderTopColor: C.bgDeep, animation: 'adminSpin 0.7s linear infinite', display: 'inline-block' }} />
                  {t('adminSigningIn')}
                </>
              ) : (
                <>
                  {t('adminSignInButton')}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </>
              )}
            </button>


          </form>

          {/* Card footer */}
          <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${C.borderSoft}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              
              <span style={{ ...mono, fontSize: 9, letterSpacing: '0.16em', color: C.text4, textTransform: 'uppercase' }}>Equimon Laboratory Management System </span>
            </div>
          </div>

        </div>
        {/* end right card */}

      </div>
      {/* end two-column */}

      <style>{`
        @keyframes adminPulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes adminSpin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
