import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileDown, Loader2, User, Package, Calendar,
  CheckCircle2, XCircle, Clock, ClipboardList, Hash,
} from 'lucide-react';
import { api } from '@/api/apiClient';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (v) => {
  if (!v) return '—';
  try { return format(new Date(v), 'MMMM d, yyyy'); } catch { return '—'; }
};

const fmtDateTime = (v) => {
  if (!v) return '—';
  try { return format(new Date(v), 'MMM d, yyyy h:mm a'); } catch { return '—'; }
};

const STATUS_LABELS = {
  pending_lecturer: 'Pending Lecturer Approval',
  pending_head:     'Pending Head of Lab Approval',
  head_approved:    'Head Approved',
  ready_pickup:     'Ready for Pickup',
  borrowed:         'Currently Borrowed',
  returned:         'Returned',
  rejected:         'Rejected',
};

const STATUS_COLORS = {
  pending_lecturer: '#d97706',
  pending_head:     '#ea580c',
  head_approved:    '#2563eb',
  ready_pickup:     '#0891b2',
  borrowed:         '#7c3aed',
  returned:         '#059669',
  rejected:         '#dc2626',
};

const refNum = (id) => {
  const hex = String(id || '').slice(-8).toUpperCase();
  return `BR-${hex}`;
};

const nameStr = (obj) => {
  if (!obj) return '—';
  if (typeof obj === 'string') return obj;
  return obj.name || obj.email || '—';
};

// ─── PDF generator ────────────────────────────────────────────────────────────

function generatePDF(req) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = margin;

  const drawLine = (yPos, thick = false) => {
    doc.setDrawColor(thick ? 30 : 200, thick ? 30 : 200, thick ? 30 : 200);
    doc.setLineWidth(thick ? 0.7 : 0.3);
    doc.line(margin, yPos, W - margin, yPos);
  };

  const sectionTitle = (title, yPos) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, yPos, W - margin * 2, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 3, yPos + 4.8);
    return yPos + 10;
  };

  const labelValue = (label, value, x, yPos, colWidth = 80) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(String(value || '—'), colWidth - 4);
    doc.text(lines, x, yPos + 4.5);
    return yPos + 4.5 + lines.length * 4;
  };

  // ── Header ─────────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('LABORATORY MANAGEMENT SYSTEM', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('Equipment Borrow Request — Official Record', margin, 17);

  // ref number right side
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(`Ref: ${refNum(req._id || req.id)}`, W - margin, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${fmtDateTime(new Date())}`, W - margin, 16, { align: 'right' });

  y = 34;

  // Status banner
  const statusColor = STATUS_COLORS[req.status] || '#475569';
  const statusLabel = STATUS_LABELS[req.status] || req.status || '—';
  const rgb = hexToRgb(statusColor);
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.roundedRect(margin, y, W - margin * 2, 8, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`STATUS: ${statusLabel.toUpperCase()}`, W / 2, y + 5.3, { align: 'center' });
  y += 13;

  // ── Section A: Borrower ────────────────────────────────────────────────────
  y = sectionTitle('A.  BORROWER INFORMATION', y);

  const studentName = nameStr(req.student) !== '—' ? nameStr(req.student) : (req.borrower_name || '—');
  const studentEmail = req.student?.email || req.student_email || '—';
  const studentId = req.student?.studentId || '—';
  const department = req.student?.department || '—';

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
    headStyles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 },
    body: [
      [
        { content: 'Full Name', styles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
        { content: studentName },
        { content: 'Student ID', styles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
        { content: studentId },
      ],
      [
        { content: 'Email Address', styles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
        { content: studentEmail },
        { content: 'Department', styles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
        { content: department },
      ],
    ],
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 60 },
      2: { cellWidth: 32 },
      3: { cellWidth: 'auto' },
    },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.3,
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── Section B: Equipment ───────────────────────────────────────────────────
  y = sectionTitle('B.  EQUIPMENT DETAILS', y);

  const eqName = req.equipment?.name || req.equipment_name || '—';
  const eqCategory = req.equipment?.category || '—';
  const eqLocation = req.equipment?.location || '—';

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
    body: [
      [
        { content: 'Equipment Name', styles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
        { content: eqName, colSpan: 3 },
      ],
      [
        { content: 'Category', styles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
        { content: eqCategory },
        { content: 'Location', styles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
        { content: eqLocation },
      ],
      [
        { content: 'Quantity Requested', styles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
        { content: String(req.quantity || '—') },
        { content: 'Purpose', styles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
        { content: req.purpose || '—' },
      ],
    ],
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 60 },
      2: { cellWidth: 32 },
      3: { cellWidth: 'auto' },
    },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.3,
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── Section C: Schedule ────────────────────────────────────────────────────
  y = sectionTitle('C.  BORROW SCHEDULE', y);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
    body: [
      [
        { content: 'Borrow Date', styles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
        { content: fmtDate(req.borrow_date) },
        { content: 'Expected Return Date', styles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
        { content: fmtDate(req.return_date) },
      ],
      [
        { content: 'Date Submitted', styles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
        { content: fmtDateTime(req.created_date || req.createdAt) },
        { content: 'Actual Return Date', styles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
        { content: req.actual_return_date ? fmtDate(req.actual_return_date) : '—' },
      ],
    ],
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 54 },
      2: { cellWidth: 40 },
      3: { cellWidth: 'auto' },
    },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.3,
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── Section D: Approval Chain ──────────────────────────────────────────────
  y = sectionTitle('D.  APPROVAL CHAIN', y);

  const lecturerApproved = !!req.lecturer_approved_at;
  const headApproved = !!req.head_approved_at;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
    head: [[
      { content: 'Role', styles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
      { content: 'Name', styles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
      { content: 'Decision', styles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
      { content: 'Date & Time', styles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
      { content: 'Remarks', styles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
    ]],
    body: [
      [
        'Lecturer',
        nameStr(req.lecturer),
        lecturerApproved ? 'APPROVED' : (req.status === 'rejected' ? 'REJECTED' : 'PENDING'),
        fmtDateTime(req.lecturer_approved_at),
        req.lecturer_remarks || '—',
      ],
      [
        'Head of Lab',
        nameStr(req.head_of_lab),
        headApproved ? 'APPROVED' : (req.status === 'rejected' ? 'REJECTED' : 'PENDING'),
        fmtDateTime(req.head_approved_at),
        req.head_remarks || '—',
      ],
    ],
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 36 },
      2: { cellWidth: 22 },
      3: { cellWidth: 38 },
      4: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      if (data.column.index === 2 && data.section === 'body') {
        const v = data.cell.raw;
        if (v === 'APPROVED')      { data.cell.styles.textColor = [5, 150, 105]; data.cell.styles.fontStyle = 'bold'; }
        else if (v === 'REJECTED') { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fontStyle = 'bold'; }
        else                       { data.cell.styles.textColor = [217, 119,  6]; }
      }
    },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.3,
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── Section E: Lab Operations ──────────────────────────────────────────────
  y = sectionTitle('E.  LAB OPERATIONS', y);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
    body: [
      [
        { content: 'Prepared By', styles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
        { content: nameStr(req.prepared_by) + (req.prepared_at ? `  (${fmtDateTime(req.prepared_at)})` : '') },
        { content: 'Released By', styles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
        { content: nameStr(req.released_by) + (req.released_at ? `  (${fmtDateTime(req.released_at)})` : '') },
      ],
      [
        { content: 'Return Condition', styles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
        { content: req.return_condition || '—' },
        { content: 'Return Remarks', styles: { textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7.5 } },
        { content: req.return_remarks || '—' },
      ],
    ],
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 60 },
      2: { cellWidth: 32 },
      3: { cellWidth: 'auto' },
    },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.3,
  });

  y = doc.lastAutoTable.finalY + 10;

  // ── Signature Section ──────────────────────────────────────────────────────
  const sigBoxes = [
    { label: "Borrower's Signature", name: studentName },
    { label: "Lecturer's Signature",   name: nameStr(req.lecturer) },
    { label: "Head of Lab's Signature", name: nameStr(req.head_of_lab) },
  ];

  const boxW = (W - margin * 2) / sigBoxes.length - 3;
  sigBoxes.forEach((box, i) => {
    const bx = margin + i * (boxW + 4.5);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(bx, y, boxW, 22);

    doc.setFillColor(248, 250, 252);
    doc.rect(bx, y + 16, boxW, 6, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(box.label, bx + boxW / 2, y + 19.5, { align: 'center' });
    doc.setTextColor(15, 23, 42);
    doc.text(box.name === '—' ? '' : box.name, bx + boxW / 2, y + 24.5, { align: 'center' });
  });

  y += 30;

  // ── Replacement Policy ─────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const policyText =
    'Replacement Policy: By submitting this request, the borrower agrees to replace or compensate for any damage or loss of the borrowed equipment.';
  doc.text(policyText, margin, y, { maxWidth: W - margin * 2 });
  const agreed = req.agreed_replacement_policy ? 'YES' : 'NO';
  doc.setTextColor(15, 23, 42);
  doc.text(`Borrower agreed: ${agreed}`, margin, y + 6);
  if (req.agreed_replacement_policy_at) {
    doc.text(`Agreed on: ${fmtDateTime(req.agreed_replacement_policy_at)}`, margin + 60, y + 6);
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const fY = doc.internal.pageSize.getHeight() - 8;
    doc.setFillColor(248, 250, 252);
    doc.rect(0, fY - 3, W, 11, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(0, fY - 3, W, fY - 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Laboratory Management System — Equipment Borrow Request Record', margin, fY + 1);
    doc.text(`Page ${p} of ${pageCount}`, W - margin, fY + 1, { align: 'right' });
  }

  const safeName = (studentName !== '—' ? studentName : 'unknown').replace(/\s+/g, '_');
  const dateTag = format(new Date(), 'yyyyMMdd');
  doc.save(`BorrowRequest_${refNum(req._id || req.id)}_${safeName}_${dateTag}.pdf`);
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

// ─── Section card helper ───────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <span className="mt-0.5 text-sm text-slate-800 break-words">{value || '—'}</span>
    </div>
  );
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white overflow-hidden">
      <div className="flex items-center gap-2 bg-slate-900 px-4 py-2.5">
        <Icon className="h-3.5 w-3.5 text-slate-300" />
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-200">{title}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 sm:grid-cols-4">
        {children}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function BorrowRequestReportModal({ requestId, onClose }) {
  const [exporting, setExporting] = useState(false);

  const { data: req, isLoading, isError } = useQuery({
    queryKey: ['borrowRequest', requestId],
    queryFn: () => api.entities.BorrowRequest.getById(requestId),
    enabled: !!requestId,
  });

  const handleExport = () => {
    if (!req) return;
    setExporting(true);
    try {
      generatePDF(req);
    } finally {
      setExporting(false);
    }
  };

  const statusColor = req ? (STATUS_COLORS[req.status] || '#475569') : '#475569';
  const statusLabel = req ? (STATUS_LABELS[req.status] || req.status || '—') : '—';

  const studentName = req
    ? (nameStr(req.student) !== '—' ? nameStr(req.student) : (req.borrower_name || '—'))
    : '—';
  const studentEmail = req ? (req.student?.email || req.student_email || '—') : '—';
  const studentId    = req?.student?.studentId || '—';
  const department   = req?.student?.department || '—';

  return (
    <Dialog open={!!requestId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-50 p-0">
        {/* ── Modal Header ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4">
          <div>
            <DialogTitle className="text-base font-bold text-white">
              Equipment Borrow Request
            </DialogTitle>
            {req && (
              <p className="mt-0.5 font-mono text-xs text-slate-400">
                Ref: {refNum(req._id || req.id)}
              </p>
            )}
          </div>
          <Button
            onClick={handleExport}
            disabled={isLoading || isError || exporting || !req}
            className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
            size="sm"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            Export PDF
          </Button>
        </div>

        <div className="space-y-3 p-5">
          {/* ── Loading ── */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
            </div>
          )}

          {/* ── Error ── */}
          {isError && (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-red-500">Failed to load request details.</p>
            </div>
          )}

          {/* ── Content ── */}
          {req && (
            <>
              {/* Status Banner */}
              <div
                className="flex items-center justify-center rounded-lg py-2.5 font-bold tracking-wide text-white text-sm"
                style={{ backgroundColor: statusColor }}
              >
                {statusLabel.toUpperCase()}
              </div>

              {/* Section A — Borrower */}
              <SectionCard icon={User} title="A. Borrower Information">
                <InfoRow label="Full Name"   value={studentName} />
                <InfoRow label="Student ID"  value={studentId} />
                <InfoRow label="Email"       value={studentEmail} />
                <InfoRow label="Department"  value={department} />
              </SectionCard>

              {/* Section B — Equipment */}
              <SectionCard icon={Package} title="B. Equipment Details">
                <div className="col-span-2">
                  <InfoRow label="Equipment Name" value={req.equipment?.name || req.equipment_name} />
                </div>
                <InfoRow label="Category"    value={req.equipment?.category} />
                <InfoRow label="Location"    value={req.equipment?.location} />
                <InfoRow label="Quantity"    value={req.quantity} />
                <div className="col-span-3">
                  <InfoRow label="Purpose"   value={req.purpose} />
                </div>
              </SectionCard>

              {/* Section C — Schedule */}
              <SectionCard icon={Calendar} title="C. Borrow Schedule">
                <InfoRow label="Borrow Date"        value={fmtDate(req.borrow_date)} />
                <InfoRow label="Expected Return"    value={fmtDate(req.return_date)} />
                <InfoRow label="Date Submitted"     value={fmtDateTime(req.created_date || req.createdAt)} />
                <InfoRow label="Actual Return"      value={req.actual_return_date ? fmtDate(req.actual_return_date) : '—'} />
              </SectionCard>

              {/* Section D — Approvals */}
              <div className="rounded-lg border border-slate-100 bg-white overflow-hidden">
                <div className="flex items-center gap-2 bg-slate-900 px-4 py-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-300" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-200">D. Approval Chain</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {[
                    {
                      role: 'Lecturer',
                      person: nameStr(req.lecturer),
                      approved: !!req.lecturer_approved_at,
                      date: req.lecturer_approved_at,
                      remarks: req.lecturer_remarks,
                    },
                    {
                      role: 'Head of Lab',
                      person: nameStr(req.head_of_lab),
                      approved: !!req.head_approved_at,
                      date: req.head_approved_at,
                      remarks: req.head_remarks,
                    },
                  ].map((item) => (
                    <div key={item.role} className="grid grid-cols-4 gap-4 px-4 py-3">
                      <InfoRow label="Role"     value={item.role} />
                      <InfoRow label="Name"     value={item.person} />
                      <InfoRow
                        label="Decision"
                        value={
                          <span
                            className="font-semibold"
                            style={{
                              color: item.approved
                                ? '#059669'
                                : req.status === 'rejected'
                                ? '#dc2626'
                                : '#d97706',
                            }}
                          >
                            {item.approved
                              ? 'APPROVED'
                              : req.status === 'rejected'
                              ? 'REJECTED'
                              : 'PENDING'}
                          </span>
                        }
                      />
                      <div>
                        <InfoRow label="Date" value={fmtDateTime(item.date)} />
                        {item.remarks && (
                          <InfoRow label="Remarks" value={item.remarks} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section E — Lab Operations */}
              <SectionCard icon={ClipboardList} title="E. Lab Operations">
                <div className="col-span-2">
                  <InfoRow
                    label="Prepared By"
                    value={`${nameStr(req.prepared_by)}${req.prepared_at ? `  ·  ${fmtDateTime(req.prepared_at)}` : ''}`}
                  />
                </div>
                <div className="col-span-2">
                  <InfoRow
                    label="Released By"
                    value={`${nameStr(req.released_by)}${req.released_at ? `  ·  ${fmtDateTime(req.released_at)}` : ''}`}
                  />
                </div>
                <InfoRow label="Return Condition" value={req.return_condition} />
                <div className="col-span-3">
                  <InfoRow label="Return Remarks"   value={req.return_remarks} />
                </div>
              </SectionCard>

              {/* Policy acknowledgement */}
              <div className="rounded-lg border border-slate-100 bg-white px-4 py-3">
                <p className="text-[10px] text-slate-500">
                  <span className="font-semibold text-slate-700">Replacement Policy Agreed: </span>
                  {req.agreed_replacement_policy ? (
                    <span className="text-emerald-600 font-semibold">
                      Yes — {fmtDateTime(req.agreed_replacement_policy_at)}
                    </span>
                  ) : (
                    <span className="text-amber-600 font-semibold">No</span>
                  )}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
