import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Send, User, Package, Calendar, FileText, Tag, Hash, Building2, Download, Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { api } from '@/api/apiClient';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// ── helpers ───────────────────────────────────────────────────────────────────

/** Displays a PDF page as a sharp image (data-URL from off-screen canvas) */
function PdfPage({ src, cssWidth, cssHeight }) {
  return (
    <img
      src={src}
      style={{
        display: 'block',
        maxWidth: '100%',
        maxHeight: '100%',
        width: 'auto',
        height: 'auto',
        objectFit: 'contain',
      }}
      alt="PDF preview"
    />
  );
}

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
  isDark = false,
  onEdit,
  onConfirm,
  isSubmitting = false,
}) {
  const [pdfLoading, setPdfLoading]           = useState(null); // 'download' | null
  const [pdfPreviewState, setPdfPreviewState] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
  const [pdfPages, setPdfPages]               = useState([]); // array of { canvas, key }
  const blobUrlRef   = useRef(null);
  const pdfDocRef    = useRef(null);
  const scrollRef    = useRef(null);

  const objective = formData?.objective || formData?.purpose || '';

  // Render page 1 at a fixed high-DPI scale; CSS handles the fit
  const renderPages = useCallback(async (pdfDoc) => {
    const dpr      = window.devicePixelRatio || 1;
    const page     = await pdfDoc.getPage(1);
    // Render at 1.5× base scale * DPR for crisp output on all screens
    const viewport = page.getViewport({ scale: 1.5 * dpr });
    const canvas   = document.createElement('canvas');
    canvas.width   = viewport.width;
    canvas.height  = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const src = canvas.toDataURL('image/png');
    return [{ src, key: 1 }];
  }, []);

  // Auto-generate PDF preview when modal opens
  useEffect(() => {
    if (!open || !formData || !equipment) return;

    let cancelled = false;
    setPdfPreviewState('loading');
    setPdfPages([]);

    api.entities.BorrowRequest.previewPdf(
      { ...formData, equipment_name: equipment?.name, serial_number: equipment?.serialNumber || formData.serial_number },
      user
    )
      .then(async (blob) => {
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        const arrayBuffer = await blob.arrayBuffer();
        if (cancelled) return;
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;
        pdfDocRef.current = pdfDoc;
        const pages = await renderPages(pdfDoc);
        if (cancelled) return;
        setPdfPages(pages);
        setPdfPreviewState('ready');
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('PDF preview failed:', err);
          setPdfPreviewState('error');
        }
      });

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setPdfPages([]);
      setPdfPreviewState('idle');
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = async () => {
    setPdfLoading('download');
    try {
      const blob = await api.entities.BorrowRequest.previewPdf(
        { ...formData, equipment_name: equipment?.name, serial_number: equipment?.serialNumber || formData.serial_number },
        user
      );
      const url = URL.createObjectURL(blob);
      const safeStudentName = (user?.name || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BorrowRequest_${safeStudentName}_${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      console.error('PDF download failed:', err);
    } finally {
      setPdfLoading(null);
    }
  };

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
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">

          {/* LEFT — request details summary */}
          <div
            className="md:w-[60%] flex-shrink-0 flex flex-col gap-2 p-3 border-b md:border-b-0 md:border-r overflow-y-auto"
            style={{ ...border, scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Student & Equipment */}
            <div className="rounded-xl border flex flex-col gap-2 p-3" style={cardBg}>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={labelClr}>
                Student &amp; Equipment
              </p>
              <Field icon={User}      label="Full Name"     value={user?.name}                                        accent="#3B82F6" isDark={isDark} />
              <Field icon={Hash}      label="Student ID"    value={user?.studentId}                                   accent="#8B5CF6" isDark={isDark} />
              <Field icon={Building2} label="Email"         value={user?.email}                                       accent="#6366F1" isDark={isDark} />
              <div className="border-t" style={divider} />
              <Field icon={Package}   label="Equipment"     value={equipment?.name}                                   accent="#22C55E" isDark={isDark} />
              <Field icon={Tag}       label="Serial Number" value={equipment?.serialNumber || formData.serial_number} accent="#14B8A6" isDark={isDark} />
              <Field icon={Package}   label="Quantity"      value={String(formData.quantity || 1)}                    accent="#F59E0B" isDark={isDark} />
            </div>

            {/* Borrow details */}
            <div className="rounded-xl border flex flex-col gap-2 p-3" style={cardBg}>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={labelClr}>
                Request Details
              </p>
              <Field icon={Calendar} label="Borrow Date" value={fmt(formData.borrow_date)} accent="#3B82F6" isDark={isDark} />
              <Field icon={Calendar} label="Return Date"  value={fmt(formData.return_date)} accent="#EF4444" isDark={isDark} />
              <div className="border-t" style={divider} />
              {/* Objective */}
              <div className="flex items-start gap-2">
                <div className="mt-0.5 w-5 h-5 flex-shrink-0 rounded-md flex items-center justify-center" style={{ background: '#6366F118', color: '#6366F1' }}>
                  <FileText className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-bold uppercase tracking-widest mb-0" style={labelClr}>Objective / Purpose</p>
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
                  <span className="font-bold">Policy: </span>
                  Damaged or lost items must be replaced by the borrower.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT — PDF fills the entire column, no gaps */}
          <div className="md:w-[40%] flex-shrink-0 flex flex-col min-h-0 min-w-0">
            {/* PDF area — canvas pages, no browser PDF chrome */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-hidden flex items-center justify-center"
              style={{ background: isDark ? '#1a1a24' : '#e8ecf0', padding: 0 }}
            >
              {pdfPreviewState === 'loading' && (
                <div className="flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#3B82F6' }} />
                  <p className="text-sm font-medium" style={{ color: isDark ? '#475569' : '#64748b' }}>
                    Generating preview…
                  </p>
                </div>
              )}
              {pdfPreviewState === 'ready' && pdfPages.map(({ src, cssWidth, cssHeight, key }) => (
                <PdfPage key={key} src={src} cssWidth={cssWidth} cssHeight={cssHeight} />
              ))}
              {pdfPreviewState === 'error' && (
                <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <FileText className="w-10 h-10 opacity-30" style={{ color: isDark ? '#475569' : '#94a3b8' }} />
                  <p className="text-sm font-medium" style={{ color: isDark ? '#475569' : '#94a3b8' }}>Preview unavailable</p>
                  <p className="text-xs" style={{ color: isDark ? '#334155' : '#cbd5e1' }}>Download the PDF below.</p>
                </div>
              )}
            </div>

            {/* Download PDF — pinned below the iframe */}
            <div className="flex-shrink-0 px-4 py-3 border-t" style={border}>
              <button
                onClick={handleDownload}
                disabled={isSubmitting || !!pdfLoading}
                className="flex items-center justify-center gap-2 w-full h-9 rounded-xl text-[12px] font-semibold cursor-pointer transition-colors disabled:opacity-40"
                style={{ background: isDark ? 'rgba(34,197,94,0.10)' : 'rgba(34,197,94,0.07)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.25)' }}
              >
                <Download className="w-3.5 h-3.5" />
                {pdfLoading === 'download' ? 'Generating…' : 'Download PDF'}
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
            Edit
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
      </DialogContent>
    </Dialog>
  );
}
