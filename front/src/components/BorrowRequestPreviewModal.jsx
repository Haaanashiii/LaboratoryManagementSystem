import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, FileText, Printer, GraduationCap, Eye, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useLang } from '@/components/i18n/LangContext';
import { buildItsReceiptHtml, printItsReceipt } from '@/utils/printItsReceipt';

const fmt = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? String(v)
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

function Row({ label, value, isDark }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="text-[10px] font-semibold shrink-0" style={{ color: isDark ? '#475569' : '#94a3b8' }}>{label}</p>
      <p className="text-xs font-semibold text-right break-all" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>{value || '—'}</p>
    </div>
  );
}

export default function BorrowRequestPreviewModal({
  open,
  formData,
  equipment,
  user,
  lecturerName = '',
  isDark = false,
  onEdit,
  onConfirm,
  isSubmitting = false,
  submitError = '',
}) {
  const [iframeSrc, setIframeSrc] = useState('');
  const iframeUrlRef = useRef(null);
  const { t } = useLang();

  const objective = formData?.objective || formData?.purpose || '';

  const buildSyntheticRequest = () => ({
    id: null,
    equipment_name: equipment?.name,
    category: equipment?.category,
    quantity: formData?.quantity,
    borrower_name: user?.name,
    student_email: user?.email,
    department: user?.department,
    lecturer_name: lecturerName,
    purpose: objective,
    created_date: new Date().toISOString(),
    borrow_date: formData?.borrow_date,
    return_date: formData?.return_date,
    status: 'pending_lecturer',
    lecturer_approved_at: null,
    head_approved_at: null,
  });

  useEffect(() => {
    if (!open || !formData || !equipment) return;
    const html = buildItsReceiptHtml(buildSyntheticRequest());
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframeUrlRef.current = url;
    setIframeSrc(url);
    return () => {
      URL.revokeObjectURL(url);
      iframeUrlRef.current = null;
      setIframeSrc('');
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrint = () => printItsReceipt(buildSyntheticRequest());

  const handleMobilePreview = () => {
    if (iframeSrc) window.open(iframeSrc, '_blank');
  };

  const durationDays = (() => {
    if (!formData?.borrow_date || !formData?.return_date) return null;
    const d1 = new Date(formData.borrow_date);
    const d2 = new Date(formData.return_date);
    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return null;
    const days = Math.round((d2 - d1) / 86400000);
    return days > 0 ? days : null;
  })();

  if (!open || !formData || !equipment) return null;

  const border  = isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0';
  const cardBg  = isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc';
  const txt     = isDark ? '#e2e8f0' : '#0f172a';
  const txtsub  = isDark ? '#94a3b8'  : '#64748b';
  const lbl     = isDark ? '#475569'  : '#94a3b8';

  const ConfirmButton = () => (
    <button
      onClick={onConfirm}
      disabled={isSubmitting}
      className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-40 transition-all"
      style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', boxShadow: '0 4px 20px rgba(99,102,241,0.30)' }}
    >
      {isSubmitting ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {t('submitting')}
        </>
      ) : (
        <>
          {t('confirmSubmit')}
          <Send className="w-3.5 h-3.5" />
        </>
      )}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isSubmitting) onEdit?.(); }}>
      <DialogContent
        hideCloseButton
        className={`p-0 gap-0 rounded-2xl border overflow-hidden ${isDark ? 'bg-[#0e0e16] border-white/[0.08]' : 'bg-white border-slate-200'}`}
        style={{
          width: 'min(96vw, 920px)',
          maxWidth: '96vw',
          height: 'min(88vh, 88dvh)',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isDark ? '0 32px 80px rgba(0,0,0,0.85)' : '0 24px 64px rgba(0,0,0,0.18)',
        }}
      >
        {/* ── TWO-PANEL BODY ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">

          {/* ── LEFT PANEL ──────────────────────────────────────── */}
          <div
            className="flex flex-col min-h-0 sm:w-[52%]"
            style={{ borderRight: `1px solid ${border}` }}
          >
            {/* Left header */}
            <div
              className="flex-shrink-0 px-5 pt-5 pb-4"
              style={{ borderBottom: `1px solid ${border}`, background: isDark ? 'rgba(59,130,246,0.05)' : 'rgba(59,130,246,0.03)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: '#3b82f6' }}>
                    {t('previewRequest')}
                  </p>
                  <h2 className="text-[15px] font-bold leading-tight truncate" style={{ color: txt }}>
                    {equipment?.name}
                  </h2>
                  {equipment?.category && (
                    <span className="inline-flex items-center mt-1 text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)', color: '#6366f1' }}>
                      {equipment.category}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                  <span
                    className="text-[11px] font-extrabold px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.22)' }}
                  >
                    ×{formData?.quantity}
                  </span>
                  <div
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold"
                    style={{ background: 'rgba(245,158,11,0.10)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.22)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    {t('draftNotSubmitted')}
                  </div>
                  <button
                    onClick={onEdit}
                    disabled={isSubmitting}
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-80"
                    style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', color: txtsub, border: `1px solid ${border}` }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Left scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

              {/* BORROWER */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: lbl }}>
                  {t('studentAndEquipment')}
                </p>
                <div className="rounded-xl p-3 space-y-2.5" style={{ background: cardBg, border: `1px solid ${border}` }}>
                  <Row label={t('fullName')}  value={user?.name}       isDark={isDark} />
                  <Row label={t('studentId')} value={user?.studentId}  isDark={isDark} />
                  <Row label={t('email')}     value={user?.email}      isDark={isDark} />
                  {user?.department && <Row label="Department" value={user.department} isDark={isDark} />}
                </div>
              </div>

              {/* LOAN PERIOD */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: lbl }}>
                  {t('borrowDate')} — {t('returnDate')}
                </p>
                <div className="flex items-stretch gap-2">
                  <div className="flex-1 rounded-xl px-3 py-2.5" style={{ background: cardBg, border: `1px solid ${border}` }}>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: lbl }}>From</p>
                    <p className="text-[13px] font-bold leading-tight" style={{ color: txt }}>{fmt(formData?.borrow_date)}</p>
                  </div>
                  <div className="flex items-center flex-shrink-0">
                    <ChevronRight className="w-4 h-4" style={{ color: txtsub }} />
                  </div>
                  <div className="flex-1 rounded-xl px-3 py-2.5" style={{ background: cardBg, border: `1px solid ${border}` }}>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: lbl }}>Return</p>
                    <p className="text-[13px] font-bold leading-tight" style={{ color: txt }}>{fmt(formData?.return_date)}</p>
                  </div>
                </div>
                {durationDays && (
                  <p className="text-[10px] font-semibold mt-1.5 text-right" style={{ color: '#3b82f6' }}>
                    {durationDays} {durationDays === 1 ? 'day' : 'days'} total
                  </p>
                )}
              </div>

              {/* APPROVAL CHAIN */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: lbl }}>
                  {t('assignedLecturer')}
                </p>
                <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: cardBg, border: `1px solid ${border}` }}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}
                  >
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: txt }}>{lecturerName || '—'}</p>
                    <p className="text-[10px]" style={{ color: txtsub }}>{t('approvingLecturer')}</p>
                  </div>
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: 'rgba(245,158,11,0.10)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.22)' }}
                  >
                    {t('draftNotSubmitted').split(' ')[0]}
                  </span>
                </div>
              </div>

              {/* OBJECTIVE */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: lbl }}>
                  {t('objectivePurpose')}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
                  {objective || <span style={{ color: lbl }}>—</span>}
                </p>
              </div>

              {/* POLICY */}
              <div
                className="rounded-xl px-3 py-2.5 flex gap-2 items-start"
                style={{ background: isDark ? 'rgba(245,158,11,0.07)' : '#fffbeb', border: isDark ? '1px solid rgba(245,158,11,0.18)' : '1px solid #fde68a' }}
              >
                <span className="text-amber-400 text-sm leading-none flex-shrink-0 mt-0.5">⚠</span>
                <p className="text-[10px] leading-relaxed" style={{ color: isDark ? '#fcd34d' : '#92400e' }}>
                  <span className="font-bold">{t('policyLabel')} </span>
                  {t('policyWarning')}
                </p>
              </div>
            </div>

            {/* Left footer — edit link */}
            <div
              className="flex-shrink-0 px-5 py-3.5 border-t"
              style={{ borderColor: border }}
            >
              <button
                onClick={onEdit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-40 transition-opacity hover:opacity-70"
                style={{ color: txtsub }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('edit')} {t('requestDetails') || 'details'}
              </button>
            </div>
          </div>

          {/* ── RIGHT PANEL — desktop only ────────────────────── */}
          <div className="hidden sm:flex flex-col flex-1 min-h-0 min-w-0">

            {/* Right header */}
            <div
              className="flex-shrink-0 px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${border}`, background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}
            >
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: lbl }}>
                Official Loan Receipt
              </p>
              <button
                onClick={handlePrint}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer disabled:opacity-40 transition-opacity hover:opacity-80"
                style={{ background: isDark ? 'rgba(34,197,94,0.10)' : 'rgba(34,197,94,0.07)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.22)' }}
              >
                <Printer className="w-3 h-3" />
                Print
              </button>
            </div>

            {/* iframe — always light color-scheme regardless of dark mode */}
            <div className="flex-1 overflow-hidden" style={{ background: '#e8ecf0' }}>
              {iframeSrc ? (
                <iframe
                  src={iframeSrc}
                  title="Loan Receipt Preview"
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block', colorScheme: 'light' }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <FileText className="w-10 h-10 opacity-20" style={{ color: '#94a3b8' }} />
                </div>
              )}
            </div>

            {/* Right footer — confirm */}
            <div
              className="flex-shrink-0 px-4 py-3 border-t space-y-2"
              style={{ borderColor: border }}
            >
              {submitError && (
                <p className="text-[11px] font-semibold text-center rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.20)' }}>
                  {submitError}
                </p>
              )}
              <ConfirmButton />
            </div>
          </div>
        </div>

        {/* ── MOBILE FOOTER — confirm + preview ─────────────── */}
        <div
          className="sm:hidden flex-shrink-0 px-4 py-3.5 space-y-2 border-t"
          style={{ borderColor: border, background: isDark ? 'rgba(0,0,0,0.12)' : 'rgba(248,250,255,0.9)' }}
        >
          {submitError && (
            <p className="text-[11px] font-semibold text-center rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.20)' }}>
              {submitError}
            </p>
          )}
          <button
            onClick={handleMobilePreview}
            disabled={!iframeSrc || isSubmitting}
            className="flex items-center justify-center gap-2 w-full h-10 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-40 transition-opacity hover:opacity-80"
            style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', color: txtsub, border: `1px solid ${border}` }}
          >
            <Eye className="w-4 h-4" />
            Preview Receipt
          </button>
          <ConfirmButton />
        </div>
      </DialogContent>
    </Dialog>
  );
}
