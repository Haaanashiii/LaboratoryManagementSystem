import React from 'react';
import { format } from 'date-fns';
import { Package, CheckCircle2, XCircle, Clock, Printer } from 'lucide-react';
import itsLogo from '@/assets/images/Tower2.png';
import { printItsReceipt } from '@/utils/printItsReceipt';

const fmt = (v) => {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return format(d, 'MMM d, yyyy');
  } catch { return String(v); }
};

const toName = (v) => {
  if (!v) return '—';
  if (typeof v === 'object') return v.name || v.full_name || v.email || '—';
  if (typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v)) return '—';
  return v || '—';
};

const STATUS_LABEL = {
  pending_lecturer: 'Pending Lecturer',
  pending_head:     'Pending Head of Lab',
  head_approved:    'Awaiting Preparation',
  ready_pickup:     'Ready for Pickup',
  borrowed:         'Currently Borrowed',
  returned:         'Returned',
  rejected:         'Rejected',
};

const STATUS_STYLE = {
  returned:     { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#22c55e' },
  rejected:     { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', dot: '#ef4444' },
  borrowed:     { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' },
  ready_pickup: { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe', dot: '#8b5cf6' },
  head_approved:{ bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#22c55e' },
  pending_head: { bg: '#fffbeb', text: '#b45309', border: '#fde68a', dot: '#f59e0b' },
  pending_lecturer:{ bg: '#fffbeb', text: '#b45309', border: '#fde68a', dot: '#f59e0b' },
};

function SectionLabel({ letter, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-extrabold text-white bg-[#0b1d51]">
        {letter}
      </div>
      <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#0b1d51]">{title}</span>
      <div className="flex-1 h-px bg-[#0b1d51]/20" />
    </div>
  );
}

function KVRow({ label, value }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0">
      <span className="w-36 shrink-0 text-[11px] text-slate-400">{label}</span>
      <span className="text-[11px] font-semibold text-slate-800 break-words">{value || '—'}</span>
    </div>
  );
}

function ApprovalRow({ tier, name, date, status, note }) {
  const icon = status === 'approved'
    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
    : status === 'rejected'
    ? <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
    : <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />;

  const textColor = status === 'approved' ? '#15803d' : status === 'rejected' ? '#b91c1c' : '#b45309';

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-1.5 w-24 shrink-0 mt-0.5">
        {icon}
        <span className="text-[11px] font-bold text-slate-700">{tier}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-slate-800 leading-tight">{name}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{date}</p>
        {note && note !== '—' && (
          <p className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-2">"{note}"</p>
        )}
      </div>
      <span className="text-[10px] font-extrabold uppercase shrink-0 mt-0.5" style={{ color: textColor }}>
        {status}
      </span>
    </div>
  );
}

export default function LoanSlip({ request, imageUrl }) {
  if (!request) return null;

  const docNo  = `${String(request.id || '').slice(-6).toUpperCase() || '——'} / EQUIMON / ${new Date().getFullYear()}`;
  const issued = format(new Date(), 'MMM d, yyyy');

  const lecturerName  = request.lecturer_name
    || (request.lecturer && typeof request.lecturer === 'object' ? (request.lecturer.name || request.lecturer.full_name || request.lecturer.email) : null)
    || (typeof request.lecturer === 'string' && !/^[a-f0-9]{24}$/i.test(request.lecturer) ? request.lecturer : null)
    || request.lecturer_email
    || '—';
  const headName      = request.head_name      || toName(request.head_of_lab) || toName(request.head);
  const assistantName = request.assistant_name || toName(request.released_by) || toName(request.prepared_by) || toName(request.lab_assistant) || toName(request.assistant);

  const trail = [
    {
      tier: 'Lecturer',
      name: lecturerName,
      date: fmt(request.lecturer_approved_at),
      status: request.lecturer_approved_at ? 'approved' : (request.status === 'rejected' ? 'rejected' : 'pending'),
      note: request.lecturer_remarks,
    },
    {
      tier: 'Head of Lab',
      name: headName,
      date: fmt(request.head_approved_at),
      status: request.head_approved_at ? 'approved' : (request.status === 'rejected' ? 'rejected' : 'pending'),
      note: request.head_remarks,
    },
    {
      tier: 'Assistant',
      name: assistantName,
      date: fmt(request.assistant_approved_at || request.released_at),
      status: ['ready_pickup', 'borrowed', 'returned'].includes(request.status) ? 'approved' : 'pending',
      note: request.assistant_remarks,
    },
  ];

  const ss = STATUS_STYLE[request.status] || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0', dot: '#94a3b8' };

  return (
    <div className="bg-white rounded-xl overflow-hidden text-slate-900">

      {/* ── Letterhead ── */}
      <div className="border-b-[3px] border-[#0b1d51] pb-4 mb-5">
        <div className="flex items-center gap-3 mb-3">
          <img src={itsLogo} alt="ITS" className="h-10 w-auto object-contain shrink-0" />
          <div>
            <p className="text-[13px] font-extrabold text-[#0b1d51] uppercase tracking-wide leading-tight">
              Institut Teknologi Sepuluh Nopember
            </p>
            <p className="text-[10px] text-[#1e3a8a] font-semibold">Laboratory Management System · Equimon</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Jl. Arief Rahman Hakim No.100, Sukolilo, Surabaya 60111</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-[13px] font-extrabold uppercase tracking-[3px] text-[#0b1d51] underline underline-offset-4">
            Equipment Loan Receipt
          </p>
        </div>
        <div className="flex justify-between mt-2 text-[9px] text-slate-500">
          <span><span className="font-bold text-slate-700">Doc No.:</span> {docNo}</span>
          <span><span className="font-bold text-slate-700">Issued:</span> {issued}</span>
        </div>
      </div>

      {/* ── Equipment Photo + Info ── */}
      <div className="mb-5">
        <SectionLabel letter="A" title="Equipment Information" />
        <div className="flex gap-4">
          {/* Photo */}
          <div className="w-28 h-28 rounded-xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
            {imageUrl ? (
              <img src={imageUrl} alt={request.equipment_name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-slate-300">
                <Package className="w-8 h-8" />
                <span className="text-[9px]">No photo</span>
              </div>
            )}
          </div>
          {/* Details */}
          <div className="flex-1 min-w-0">
            <p className="text-[17px] font-extrabold text-slate-900 leading-snug mb-1">
              {request.equipment_name || '—'}
            </p>
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border mb-2"
              style={{ background: ss.bg, color: ss.text, borderColor: ss.border }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: ss.dot }} />
              {STATUS_LABEL[request.status] || request.status || '—'}
            </div>
            <KVRow label="Category"  value={request.category || request.equipment_category || (request.equipment && typeof request.equipment === 'object' ? request.equipment.category : null)} />
            <KVRow label="Quantity"  value={request.quantity != null ? String(request.quantity) : null} />
          </div>
        </div>
      </div>

      {/* ── Borrower ── */}
      <div className="mb-5">
        <SectionLabel letter="B" title="Borrower Information" />
        <KVRow label="Full Name"          value={request.borrower_name} />
        <KVRow label="Email"              value={request.student_email || request.borrower_email} />
        <KVRow label="Department"         value={request.department} />
        <KVRow label="Supervising Lecturer" value={lecturerName} />
      </div>

      {/* ── Purpose ── */}
      {(request.purpose || request.reason || request.objective) && (
        <div className="mb-5">
          <SectionLabel letter="C" title="Purpose of Borrowing" />
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600 italic leading-relaxed">
            {request.purpose || request.reason || request.objective}
          </div>
        </div>
      )}

      {/* ── Loan Period ── */}
      <div className="mb-5">
        <SectionLabel letter="D" title="Loan Period" />
        <KVRow label="Request Submitted"  value={fmt(request.created_date || request.createdAt)} />
        <KVRow label="Borrow Date"        value={fmt(request.borrow_date)} />
        <KVRow label="Return Date"        value={fmt(request.return_date)} />
        {request.status === 'returned' && (
          <KVRow label="Actual Return"    value={fmt(request.returned_at || request.return_date)} />
        )}
      </div>

      {/* ── Approval Chain ── */}
      <div className="mb-5">
        <SectionLabel letter="E" title="Approval Chain" />
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          {trail.map((row, i) => (
            <ApprovalRow key={i} {...row} />
          ))}
        </div>
      </div>

      {/* ── Signature Block ── */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { title: 'Borrower',           name: request.borrower_name || '—',  role: 'Student' },
          { title: 'Supervising Lecturer', name: lecturerName,                 role: 'Lecturer' },
          { title: 'Lab Assistant',       name: assistantName,                 role: 'Lab Assistant' },
        ].map(({ title, name, role }) => (
          <div key={title} className="text-center">
            <p className="text-[10px] font-bold text-slate-700 mb-7">{title}</p>
            <div className="border-t border-slate-800 pt-1.5">
              <p className="text-[10px] font-bold text-slate-800">{name}</p>
              <p className="text-[9px] text-slate-400">{role}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Print button ── */}
      <div className="flex justify-center pt-3 border-t border-slate-100">
        <button
          onClick={() => printItsReceipt(request)}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-[12px] font-bold text-white bg-[#0b1d51] hover:bg-[#162a6e] transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Print Receipt
        </button>
      </div>

      {/* ── Footnote ── */}
      <p className="text-[8.5px] text-slate-400 text-center italic mt-3">
        This document is issued in accordance with laboratory regulation No. 03/LAB/ITS/2024.
        Please retain this receipt for the duration of the loan period.
      </p>
    </div>
  );
}
