import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, User, Package, Calendar, FileText, Tag, Hash, Building2, Printer, GraduationCap } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useLang } from '@/components/i18n/LangContext';
import { buildItsReceiptHtml, printItsReceipt } from '@/utils/printItsReceipt';

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

function Field({ icon: Icon, label, value, accent = '#3B82F6', isDark }) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className="mt-0.5 w-6 h-6 flex-shrink-0 rounded-md flex items-center justify-center"
        style={{ background: accent + '18', color: accent }}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
          {label}
        </p>
        <p className="text-sm font-semibold break-words leading-snug" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────


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
}) {
  const [iframeSrc, setIframeSrc] = useState('');
  const iframeUrlRef = useRef(null);

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

  const handlePrint = () => {
    printItsReceipt(buildSyntheticRequest());
  };

  const { t } = useLang();

  if (!open || !formData || !equipment) return null;

  const border   = { borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0' };
  const cardBg   = { background: isDark ? 'rgba(255,255,255,0.025)' : '#f8fafc', ...border };
  const divider  = { borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e9edf2' };
  const labelClr = { color: isDark ? '#475569' : '#94a3b8' };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isSubmitting) onEdit?.(); }}>
      <DialogContent
        className={`p-0 gap-0 rounded-2xl border overflow-hidden flex flex-col ${isDark ? 'bg-[#0e0e16] border-white/[0.08]' : 'bg-white border-slate-200'}`}
        style={{
          width: 'min(96vw, 1060px)',
          maxWidth: '96vw',
          height: '88vh',
          padding: 0,
          boxShadow: isDark ? '0 32px 80px rgba(0,0,0,0.85)' : '0 24px 64px rgba(0,0,0,0.18)',
        }}
      >
        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 px-6 py-4 border-b flex items-center justify-between"
          style={{
            background:  isDark ? 'rgba(59,130,246,0.09)' : 'rgba(59,130,246,0.04)',
            borderColor: isDark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.12)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}
            >
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#3B82F6' }}>
                {t('previewRequest')}
              </p>
              <p className="text-sm font-bold leading-tight" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                {equipment?.name}
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {t('draftNotSubmitted')}
          </div>
        </div>

        {/* ── TWO-COLUMN BODY ─────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">

          {/* LEFT — request details summary (50% height on mobile, 60% width on desktop) */}
          <div
            className="min-h-0 flex-1 md:flex-none md:w-[60%] flex flex-col gap-2 p-3 border-b md:border-b-0 md:border-r overflow-y-auto"
            style={{ ...border, scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Student & Equipment */}
            <div className="rounded-xl border flex flex-col gap-2 p-3" style={cardBg}>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={labelClr}>
                {t('studentAndEquipment')}
              </p>
              <Field icon={User}      label={t('fullName')}     value={user?.name}                                        accent="#3B82F6" isDark={isDark} />
              <Field icon={Hash}      label={t('studentId')}    value={user?.studentId}                                   accent="#8B5CF6" isDark={isDark} />
              <Field icon={Building2} label={t('email')}         value={user?.email}                                       accent="#6366F1" isDark={isDark} />
              <div className="border-t" style={divider} />
              <Field icon={Package}   label={t('equipment')}     value={equipment?.name}                                                              accent="#22C55E" isDark={isDark} />
              <Field icon={Tag}       label={t('serialNumber')} value={equipment?.serialNumber || equipment?.serial_number || formData.serial_number} accent="#14B8A6" isDark={isDark} />
              <Field icon={Package}   label={t('quantity')}      value={String(formData.quantity || 1)}                                               accent="#F59E0B" isDark={isDark} />
            </div>

            {/* Borrow details */}
            <div className="rounded-xl border flex flex-col gap-2 p-3" style={cardBg}>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={labelClr}>
                {t('requestDetails')}
              </p>
              <Field icon={Calendar}      label={t('borrowDate')}       value={fmt(formData.borrow_date)} accent="#3B82F6" isDark={isDark} />
              <Field icon={Calendar}      label={t('returnDate')}        value={fmt(formData.return_date)} accent="#EF4444" isDark={isDark} />
              <Field icon={GraduationCap} label={t('assignedLecturer')}  value={lecturerName}              accent="#8B5CF6" isDark={isDark} />
              <div className="border-t" style={divider} />
              {/* Objective */}
              <div className="flex items-start gap-2">
                <div className="mt-0.5 w-5 h-5 flex-shrink-0 rounded-md flex items-center justify-center" style={{ background: '#6366F118', color: '#6366F1' }}>
                  <FileText className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-bold uppercase tracking-widest mb-0" style={labelClr}>{t('objectivePurpose')}</p>
                  <p className="text-xs leading-relaxed" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
                    {objective || <span style={{ color: isDark ? '#475569' : '#cbd5e1' }}>—</span>}
                  </p>
                </div>
              </div>
              {/* Policy */}
              <div
                className="rounded-lg px-2.5 py-2 flex gap-1.5 items-start"
                style={{ background: isDark ? 'rgba(245,158,11,0.08)' : '#fffbeb', border: isDark ? '1px solid rgba(245,158,11,0.18)' : '1px solid #fde68a' }}
              >
                <span className="text-amber-400 text-sm leading-none flex-shrink-0">⚠</span>
                <p className="text-[10px] leading-relaxed" style={{ color: isDark ? '#fcd34d' : '#92400e' }}>
                  <span className="font-bold">{t('policyLabel')}</span>
                  {t('policyWarning')}
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT — Receipt preview */}
          <div className="min-h-0 flex-1 md:flex-none md:w-[40%] flex flex-col min-w-0">
            <div className="flex-1 overflow-hidden" style={{ background: isDark ? '#1a1a24' : '#e8ecf0' }}>
              {iframeSrc ? (
                <iframe
                  src={iframeSrc}
                  title="Loan Receipt Preview"
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <FileText className="w-10 h-10 opacity-20" style={{ color: isDark ? '#475569' : '#94a3b8' }} />
                </div>
              )}
            </div>

            {/* Print receipt — pinned below the preview */}
            <div className="flex-shrink-0 px-4 py-3 border-t" style={border}>
              <button
                onClick={handlePrint}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 w-full h-9 rounded-xl text-[12px] font-semibold cursor-pointer transition-colors disabled:opacity-40"
                style={{ background: isDark ? 'rgba(34,197,94,0.10)' : 'rgba(34,197,94,0.07)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.25)' }}
              >
                <Printer className="w-3.5 h-3.5" />
                Print Receipt
              </button>
            </div>
          </div>
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex gap-3 px-5 py-4 border-t" style={border}>
          <button
            onClick={onEdit}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 flex-1 h-11 rounded-xl text-sm font-semibold cursor-pointer transition-colors disabled:opacity-40"
            style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', color: isDark ? '#94a3b8' : '#475569', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0' }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t('edit')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 flex-[3] h-11 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all disabled:opacity-40"
            style={{ background: '#3B82F6', boxShadow: isDark ? '0 4px 20px rgba(59,130,246,0.4)' : '0 4px 16px rgba(37,99,235,0.3)' }}
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
                <Send className="w-4 h-4" />
                {t('confirmSubmit')}
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
