import React, { useState } from 'react';
import { ArrowLeft, Send, User, Package, Calendar, FileText, Tag, Hash, Building2, Eye, Download } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { api } from '@/api/apiClient';

// ── tiny helpers ──────────────────────────────────────────────────────────────

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

function Col({ title, children, isDark }) {
  return (
    <div
      className="flex-1 min-w-0 rounded-xl border flex flex-col gap-4 p-4"
      style={{
        background: isDark ? 'rgba(255,255,255,0.025)' : '#f8fafc',
        borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0',
      }}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
        {title}
      </p>
      {children}
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function BorrowRequestPreviewModal({
  open,
  formData,
  equipment,
  user,
  isDark = false,
  onEdit,
  onConfirm,
  isSubmitting = false,
}) {
  const [pdfLoading, setPdfLoading] = useState(null); // 'preview' | 'download' | null

  if (!open || !formData || !equipment) return null;

  const objective = formData.objective || formData.purpose || '';

  const handlePdf = async (mode) => {
    setPdfLoading(mode);
    try {
      const blob = await api.entities.BorrowRequest.previewPdf(
        { ...formData, equipment_name: equipment?.name, serial_number: equipment?.serialNumber || formData.serial_number },
        user
      );
      const url = URL.createObjectURL(blob);
      if (mode === 'preview') {
        window.open(url, '_blank');
      } else {
        const safeStudentName = (user?.name || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
        const dateStr = new Date().toISOString().slice(0, 10);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BorrowRequest_${safeStudentName}_${dateStr}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setPdfLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isSubmitting) onEdit?.(); }}>
      <DialogContent
        className={`p-0 gap-0 rounded-2xl border overflow-hidden ${isDark ? 'bg-[#0e0e16] border-white/[0.08]' : 'bg-white border-slate-200'}`}
        style={{
          width: 'min(96vw, 860px)',
          maxWidth: '96vw',
          padding: 0,
          boxShadow: isDark ? '0 32px 80px rgba(0,0,0,0.85)' : '0 24px 64px rgba(0,0,0,0.18)',
        }}
      >
        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{
            background: isDark ? 'rgba(59,130,246,0.09)' : 'rgba(59,130,246,0.04)',
            borderColor: isDark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.12)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}
            >
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#3B82F6' }}>
                Preview Request
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
            Draft — Not Submitted
          </div>
        </div>

        {/* ── TWO-COLUMN BODY ─────────────────────────────────────────── */}
        <div className="flex gap-4 p-5">

          {/* LEFT: who + what */}
          <Col title="Student &amp; Equipment" isDark={isDark}>
            <Field icon={User}      label="Full Name"      value={user?.name}              accent="#3B82F6" isDark={isDark} />
            <Field icon={Hash}      label="Student ID"     value={user?.studentId}         accent="#8B5CF6" isDark={isDark} />
            <Field icon={Building2} label="Email"          value={user?.email}             accent="#6366F1" isDark={isDark} />
            <div className="border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e9edf2' }} />
            <Field icon={Package}   label="Equipment"      value={equipment?.name}         accent="#22C55E" isDark={isDark} />
            <Field icon={Tag}       label="Serial Number"  value={equipment?.serialNumber || formData.serial_number} accent="#14B8A6" isDark={isDark} />
            <Field icon={Package}   label="Quantity"       value={String(formData.quantity || 1)} accent="#F59E0B" isDark={isDark} />
          </Col>

          {/* RIGHT: when + why */}
          <Col title="Borrow Details" isDark={isDark}>
            <Field icon={Calendar}  label="Borrow Date"    value={fmt(formData.borrow_date)}  accent="#3B82F6" isDark={isDark} />
            <Field icon={Calendar}  label="Return Date"    value={fmt(formData.return_date)}  accent="#EF4444" isDark={isDark} />
            <div className="border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e9edf2' }} />
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 w-6 h-6 flex-shrink-0 rounded-md flex items-center justify-center" style={{ background: '#6366F118', color: '#6366F1' }}>
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                  Objective / Purpose
                </p>
                <p className="text-sm leading-relaxed" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
                  {objective || <span style={{ color: isDark ? '#475569' : '#cbd5e1' }}>—</span>}
                </p>
              </div>
            </div>
            {/* Policy reminder */}
            <div
              className="mt-auto rounded-lg px-3 py-2.5 flex gap-2 items-start"
              style={{ background: isDark ? 'rgba(245,158,11,0.08)' : '#fffbeb', border: isDark ? '1px solid rgba(245,158,11,0.18)' : '1px solid #fde68a' }}
            >
              <span className="text-amber-400 text-base leading-none flex-shrink-0">⚠</span>
              <p className="text-[11px] leading-relaxed" style={{ color: isDark ? '#fcd34d' : '#92400e' }}>
                <span className="font-bold">Policy: </span>
                Damaged or lost items must be replaced by the borrower.
              </p>
            </div>
            {/* PDF actions — inside the Borrow Details card */}
            <div className="flex gap-2">
              <button
                onClick={() => handlePdf('preview')}
                disabled={isSubmitting || !!pdfLoading}
                className="flex items-center justify-center gap-1.5 flex-1 h-8 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors disabled:opacity-40"
                style={{
                  background: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
                  color: '#6366F1',
                  border: '1px solid rgba(99,102,241,0.25)',
                }}
              >
                <Eye className="w-3 h-3" />
                {pdfLoading === 'preview' ? 'Opening…' : 'Preview PDF'}
              </button>
              <button
                onClick={() => handlePdf('download')}
                disabled={isSubmitting || !!pdfLoading}
                className="flex items-center justify-center gap-1.5 flex-1 h-8 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors disabled:opacity-40"
                style={{
                  background: isDark ? 'rgba(34,197,94,0.10)' : 'rgba(34,197,94,0.07)',
                  color: '#16A34A',
                  border: '1px solid rgba(34,197,94,0.25)',
                }}
              >
                <Download className="w-3 h-3" />
                {pdfLoading === 'download' ? 'Generating…' : 'Download PDF'}
              </button>
            </div>
          </Col>
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2.5 px-5 pb-5">
          {/* Submit row */}
          <div className="flex gap-3">
            <button
              onClick={onEdit}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 flex-1 h-11 rounded-xl text-sm font-semibold cursor-pointer transition-colors disabled:opacity-40"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                color:      isDark ? '#94a3b8' : '#475569',
                border:     isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 flex-[3] h-11 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all disabled:opacity-40"
              style={{
                background: '#3B82F6',
                boxShadow: isDark ? '0 4px 20px rgba(59,130,246,0.4)' : '0 4px 16px rgba(37,99,235,0.3)',
              }}
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Confirm &amp; Submit
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
