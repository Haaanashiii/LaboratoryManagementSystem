/**
 * BorrowRequestFormView
 * ─────────────────────
 * Shared display component used in three places:
 *   1. Preview Modal (student side, before submit)
 *   2. Approval View (lab assistant — read + Approve/Reject buttons)
 *   3. Read-only View (lecturer, head of lab, admin)
 *
 * Props:
 *   request        object   – Borrow request data (or partial form data for preview)
 *   mode           string   – 'preview' | 'approval' | 'readonly'
 *   isDark         boolean
 *   onApprove      fn       – (approval mode) called when Approve clicked
 *   onReject       fn       – (approval mode) called when Reject clicked
 *   isApproving    bool
 *   isRejecting    bool
 */
import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  User, Package, Calendar, FileText, Hash,
  CheckCircle2, XCircle, Download, Tag,
  ClipboardList, Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLang } from '@/components/i18n/LangContext';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = (value) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return format(d, 'MMMM d, yyyy');
  } catch {
    return String(value);
  }
};

const STATUS_META = {
  pending:          { label: 'Pending',            bg: 'rgba(245,158,11,0.12)',  fg: '#F59E0B',  border: 'rgba(245,158,11,0.25)' },
  approved:         { label: 'Approved',           bg: 'rgba(34,197,94,0.12)',   fg: '#22C55E',  border: 'rgba(34,197,94,0.25)' },
  rejected:         { label: 'Rejected',           bg: 'rgba(239,68,68,0.12)',   fg: '#EF4444',  border: 'rgba(239,68,68,0.25)' },
  pending_lecturer: { label: 'Pending Lecturer',   bg: 'rgba(245,158,11,0.12)',  fg: '#F59E0B',  border: 'rgba(245,158,11,0.25)' },
  pending_head:     { label: 'Pending Head',       bg: 'rgba(245,158,11,0.12)',  fg: '#F59E0B',  border: 'rgba(245,158,11,0.25)' },
  head_approved:    { label: 'Head Approved',      bg: 'rgba(59,130,246,0.12)',  fg: '#3B82F6',  border: 'rgba(59,130,246,0.25)' },
  ready_pickup:     { label: 'Ready for Pickup',   bg: 'rgba(99,102,241,0.12)',  fg: '#818CF8',  border: 'rgba(99,102,241,0.25)' },
  borrowed:         { label: 'Borrowed',           bg: 'rgba(6,182,212,0.12)',   fg: '#22D3EE',  border: 'rgba(6,182,212,0.25)' },
  returned:         { label: 'Returned',           bg: 'rgba(34,197,94,0.12)',   fg: '#22C55E',  border: 'rgba(34,197,94,0.25)' },
};

const getStatusMeta = (status) => STATUS_META[status] || { label: status || 'Unknown', bg: 'rgba(100,116,139,0.12)', fg: '#64748B', border: 'rgba(100,116,139,0.25)' };

// ─── Field row ────────────────────────────────────────────────────────────────

function FieldRow({ icon: Icon, label, value, isDark, accent }) {
  const val = value || '—';
  return (
    <div
      className="flex items-start gap-3 py-2.5 border-b last:border-b-0"
      style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}
    >
      <div
        className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-md flex items-center justify-center"
        style={{ background: accent + '18', color: accent }}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
          {label}
        </p>
        <p className="text-sm font-medium break-words" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
          {val}
        </p>
      </div>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({ title, children, isDark }) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
        borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0',
      }}
    >
      <div
        className="px-4 py-2.5 border-b"
        style={{
          background: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0',
        }}
      >
        <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
          {title}
        </p>
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}

// ─── Reject dialog ────────────────────────────────────────────────────────────

function RejectDialog({ open, onClose, onConfirm, isRejecting, isDark }) {
  const { t } = useLang();
  const [reason, setReason] = useState('');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
      <div
        className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
        style={{ background: isDark ? '#111118' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.09)' : '#e2e8f0' }}
      >
        <p className="text-sm font-bold mb-1" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{t('rejectRequest')}</p>
        <p className="text-xs mb-4" style={{ color: isDark ? '#64748b' : '#64748b' }}>
          {t('optionalRejectReason')}
        </p>
        <textarea
          rows={3}
          placeholder={t('reasonForRejection')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-xs resize-none outline-none focus:ring-1 focus:ring-red-400"
          style={{
            background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
            borderColor: isDark ? 'rgba(255,255,255,0.10)' : '#e2e8f0',
            color: isDark ? '#e2e8f0' : '#0f172a',
          }}
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-lg text-xs font-semibold cursor-pointer"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', color: isDark ? '#94a3b8' : '#475569', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0' }}
          >
            {t('cancel')}
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={isRejecting}
            className="flex-1 h-9 rounded-lg text-xs font-semibold text-white cursor-pointer disabled:opacity-40"
            style={{ background: '#EF4444' }}
          >
            {isRejecting ? t('rejecting') : t('confirmReject')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BorrowRequestFormView({
  request,
  mode = 'readonly',          // 'preview' | 'approval' | 'readonly'
  isDark = false,
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
  onDownloadPdf,
  showDownload = false,
}) {
  const { t } = useLang();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  if (!request) return null;

  const status = request.status;
  const statusMeta = getStatusMeta(status);
  const isApprovalMode = mode === 'approval';
  const canAct = isApprovalMode && ['pending', 'pending_lecturer', 'pending_head'].includes(status);

  return (
    <div className="flex flex-col gap-4">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-start justify-between gap-3 px-4 pt-5 pb-3 rounded-xl border"
        style={{ background: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.04)', borderColor: isDark ? 'rgba(59,130,246,0.20)' : 'rgba(59,130,246,0.15)' }}
      >
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: '#3B82F6' }}>
            {t('equipmentBorrowRequest')}
          </p>
          <p className="text-base font-bold leading-snug" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
            {request.equipment_name || '—'}
          </p>
          {request._id && (
            <p className="text-[10px] mt-0.5 font-mono" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
              {String(request._id).slice(-10).toUpperCase()}
            </p>
          )}
        </div>
        {status && (
          <div
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold"
            style={{ background: statusMeta.bg, color: statusMeta.fg, border: `1px solid ${statusMeta.border}` }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusMeta.fg }} />
            {statusMeta.label}
          </div>
        )}
      </div>

      {/* ── STUDENT INFORMATION ─────────────────────────────────────────── */}
      <Section title={t('studentInformation')} isDark={isDark}>
        <FieldRow icon={User}         label={t('fullName')}   value={request.borrower_name}   isDark={isDark} accent="#3B82F6" />
        <FieldRow icon={Hash}         label={t('studentId')}  value={request.student_id}       isDark={isDark} accent="#8B5CF6" />
        <FieldRow icon={Building2}    label={t('email')}       value={request.student_email}    isDark={isDark} accent="#6366F1" />
      </Section>

      {/* ── EQUIPMENT INFORMATION ───────────────────────────────────────── */}
      <Section title={t('equipmentInformation')} isDark={isDark}>
        <FieldRow icon={Package}      label={t('equipmentName')}  value={request.equipment_name}  isDark={isDark} accent="#22C55E" />
        <FieldRow icon={Tag}          label={t('serialNumber')}   value={request.serial_number}   isDark={isDark} accent="#14B8A6" />
        <FieldRow icon={ClipboardList} label={t('numberOfUnits')} value={request.quantity != null ? String(request.quantity) : null} isDark={isDark} accent="#F59E0B" />
      </Section>

      {/* ── BORROW DETAILS ──────────────────────────────────────────────── */}
      <Section title={t('borrowDetails')} isDark={isDark}>
        <FieldRow icon={Calendar}  label={t('borrowDate')}         value={fmt(request.borrow_date)}  isDark={isDark} accent="#3B82F6" />
        <FieldRow icon={Calendar}  label={t('plannedReturnDate')}  value={fmt(request.return_date)}  isDark={isDark} accent="#8B5CF6" />
        <FieldRow icon={FileText}  label={t('objectivePurpose')}   value={request.objective || request.purpose} isDark={isDark} accent="#F59E0B" />
      </Section>

      {/* ── APPROVAL INFORMATION (if approved/rejected) ─────────────────── */}
      {(request.approved_at || request.rejected_at || request.rejection_reason) && (
        <Section
          title={status === 'rejected' ? t('rejectionDetails') : t('approvalDetails')}
          isDark={isDark}
        >
          {status === 'approved' && (
            <>
              <FieldRow icon={User}     label={t('approvedBy')} value={request.approved_by?.name || '—'}  isDark={isDark} accent="#22C55E" />
              <FieldRow icon={Calendar} label={t('approvedAt')} value={fmt(request.approved_at)}           isDark={isDark} accent="#22C55E" />
            </>
          )}
          {status === 'rejected' && (
            <>
              <FieldRow icon={User}     label={t('rejectedBy')} value={request.rejected_by?.name || '—'}  isDark={isDark} accent="#EF4444" />
              <FieldRow icon={Calendar} label={t('rejectedAt')} value={fmt(request.rejected_at)}           isDark={isDark} accent="#EF4444" />
              <FieldRow icon={FileText} label={t('reason')}     value={request.rejection_reason}           isDark={isDark} accent="#EF4444" />
            </>
          )}
        </Section>
      )}

      {/* ── DOWNLOAD PDF (for approved requests) ────────────────────────── */}
      {showDownload && status === 'approved' && onDownloadPdf && (
        <button
          onClick={onDownloadPdf}
          className="flex items-center justify-center gap-2 w-full h-10 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all"
          style={{ background: '#3B82F6', boxShadow: '0 4px 16px rgba(59,130,246,0.3)' }}
        >
          <Download className="w-4 h-4" />
          {t('downloadPDF')}
        </button>
      )}

      {/* ── APPROVAL ACTIONS ────────────────────────────────────────────── */}
      {canAct && (
        <div className="flex gap-3">
          <button
            onClick={() => setShowRejectDialog(true)}
            disabled={isApproving || isRejecting}
            className="flex-1 h-11 rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            style={{
              background: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
              color: '#EF4444',
              border: '1px solid rgba(239,68,68,0.25)',
            }}
          >
            <XCircle className="w-4 h-4" />
            {t('reject')}
          </button>
          <button
            onClick={onApprove}
            disabled={isApproving || isRejecting}
            className="flex-[2] h-11 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: '#22C55E', boxShadow: '0 4px 20px rgba(34,197,94,0.3)' }}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isApproving ? t('approving') : t('approve')}
          </button>
        </div>
      )}

      <RejectDialog
        open={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        onConfirm={(reason) => {
          setShowRejectDialog(false);
          onReject?.(reason);
        }}
        isRejecting={isRejecting}
        isDark={isDark}
      />
    </div>
  );
}
