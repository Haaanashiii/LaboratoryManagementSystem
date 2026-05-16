import { format } from 'date-fns';
import itsLogoUrl from '@/assets/images/logo-its-l-min.jpg';

// Safely extract a display name from a field that may be a plain string,
// a populated object { name, full_name, email }, or a raw MongoDB ObjectId hex.
const toName = (v) => {
  if (!v) return '—';
  if (typeof v === 'object') return v.name || v.full_name || v.email || '—';
  if (typeof v === 'string') {
    if (/^[a-f0-9]{24}$/i.test(v)) return '—'; // bare ObjectId — not useful
    return v;
  }
  return '—';
};

const fmt = (v) => {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return format(d, 'MMMM d, yyyy');
  } catch {
    return String(v);
  }
};

const statusLabel = (status) => {
  const map = {
    pending_lecturer: 'Pending Lecturer Approval',
    pending_head:     'Pending Head of Lab Approval',
    head_approved:    'Approved — Awaiting Preparation',
    ready_pickup:     'Ready for Pickup',
    borrowed:         'Currently Borrowed',
    returned:         'Returned',
    rejected:         'Rejected',
  };
  return map[status] || status || '—';
};

const statusClass = (status) => {
  if (status === 'returned') return 'returned';
  if (status === 'rejected') return 'rejected';
  if (['pending_lecturer', 'pending_head'].includes(status)) return 'pending';
  return '';
};

const decisionColor = (s) => {
  if (s === 'approved' || s === 'head_approved') return '#0f766e';
  if (s === 'rejected') return '#b91c1c';
  return '#a16207';
};

export function buildItsReceiptHtml(request) {
  if (!request) return '';

  const docNo = `${request.id || '—'} / EQUIMON / ${new Date().getFullYear()}`;
  const issueDate = format(new Date(), 'MMMM d, yyyy');

  // Make the logo URL absolute so it loads correctly inside a blob: iframe.
  const logoSrc = itsLogoUrl.startsWith('data:') || /^https?:\/\//.test(itsLogoUrl)
    ? itsLogoUrl
    : `${window.location.origin}${itsLogoUrl}`;

  const lecturerName  = request.lecturer_name  || toName(request.lecturer);
  const headName      = request.head_name      || toName(request.head_of_lab) || toName(request.head);
  const assistantName = request.assistant_name || toName(request.lab_assistant) || toName(request.assistant);

  const trail = [
    {
      tier: 'Lecturer',
      name: lecturerName,
      date: fmt(request.lecturer_approved_at),
      status: request.lecturer_approved_at ? 'approved' : (request.status === 'rejected' ? 'rejected' : 'pending'),
      note: request.lecturer_remarks || '—',
    },
    {
      tier: 'Head of Lab',
      name: headName,
      date: fmt(request.head_approved_at),
      status: request.head_approved_at ? 'approved' : (request.status === 'rejected' ? 'rejected' : 'pending'),
      note: request.head_remarks || '—',
    },
    {
      tier: 'Lab Assistant',
      name: assistantName,
      date: fmt(request.assistant_approved_at || request.released_at),
      status: ['ready_pickup', 'borrowed', 'returned'].includes(request.status) ? 'approved' : 'pending',
      note: request.assistant_remarks || '—',
    },
  ];

  const trailRows = trail
    .map(
      (t) => `<tr>
      <td><b>${t.tier}</b></td>
      <td>${t.name}</td>
      <td>${t.date}</td>
      <td><span style="color:${decisionColor(t.status)};font-weight:700">${t.status.toUpperCase()}</span></td>
      <td style="font-style:italic;color:#475569">${t.note}</td>
    </tr>`
    )
    .join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"/>
<title>Equipment Loan Receipt · ${request.id || ''}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Times New Roman","Liberation Serif",Georgia,serif; color: #111827; margin: 0; padding: 24px 28px; font-size: 12pt; line-height: 1.45; }

  .letterhead { display: flex; align-items: center; gap: 18px; padding-bottom: 14px; border-bottom: 3px double #0b1d51; }
  .logo-img { width: 90px; height: auto; object-fit: contain; flex-shrink: 0; }
  .head-text h1 { margin: 0; font-size: 18pt; font-weight: 800; color: #0b1d51; letter-spacing: 0.5px; text-transform: uppercase; }
  .head-text .sub { font-size: 11pt; color: #1e3a8a; margin-top: 2px; font-weight: 600; }
  .head-text .addr { font-size: 9.5pt; color: #475569; margin-top: 4px; }

  .doc-title { margin: 22px 0 8px; text-align: center; font-size: 14pt; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; text-decoration: underline; text-underline-offset: 4px; }
  .doc-meta { display: flex; justify-content: space-between; margin-bottom: 18px; font-size: 10pt; color: #334155; }
  .doc-meta b { color: #0b1d51; }

  h2.section { margin: 18px 0 6px; font-size: 11pt; font-weight: 800; color: #0b1d51; text-transform: uppercase; letter-spacing: 1.2px; border-left: 4px solid #0b1d51; padding-left: 8px; }
  table.kv { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  table.kv td { padding: 5px 8px; vertical-align: top; font-size: 10.5pt; }
  table.kv td:first-child { width: 32%; color: #475569; }
  table.kv td:last-child { color: #0f172a; font-weight: 600; }
  table.kv tr { border-bottom: 1px dotted #cbd5e1; }

  table.trail { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 10pt; }
  table.trail th { background: #0b1d51; color: #fff; text-align: left; padding: 8px 10px; font-weight: 700; }
  table.trail td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  table.trail tr:nth-child(even) td { background: #f8fafc; }

  .purpose { border: 1px solid #cbd5e1; background: #f8fafc; padding: 10px 12px; font-size: 10.5pt; line-height: 1.55; margin-top: 4px; font-style: italic; color: #334155; }

  .status-stamp { display: inline-block; padding: 6px 16px; border: 2.5px solid #0b1d51; color: #0b1d51; font-weight: 800; font-size: 11pt; letter-spacing: 2px; text-transform: uppercase; transform: rotate(-2deg); border-radius: 4px; }
  .status-stamp.returned { color: #047857; border-color: #047857; }
  .status-stamp.rejected { color: #b91c1c; border-color: #b91c1c; }
  .status-stamp.pending  { color: #a16207; border-color: #a16207; }

  .sig-block { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 22px; }
  .sig { text-align: center; font-size: 10pt; color: #475569; }
  .sig .title { font-weight: 700; color: #0f172a; margin-bottom: 56px; }
  .sig .name { border-top: 1px solid #0f172a; padding-top: 4px; font-weight: 700; color: #0f172a; }
  .sig .role { font-size: 9pt; color: #64748b; margin-top: 2px; }

  .footnote { margin-top: 28px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 8.5pt; color: #64748b; text-align: center; font-style: italic; }
  .footnote b { font-style: normal; color: #0b1d51; }

  @media print {
    body { padding: 0; }
    .no-print { display: none; }
  }
</style>
</head>
<body>

<!-- LETTERHEAD -->
<div class="letterhead">
  <img src="${logoSrc}" alt="ITS Logo" class="logo-img" />
  <div class="head-text">
    <h1>Institut Teknologi Sepuluh Nopember</h1>
    <div class="sub">Laboratory Management System · Equimon</div>
    <div class="addr">Jl. Arief Rahman Hakim No.100, Sukolilo, Surabaya 60111 · Telp. (031) 5994251 · equimon@its.ac.id</div>
  </div>
</div>

<!-- DOCUMENT TITLE -->
<div class="doc-title">Equipment Loan Receipt</div>
<div class="doc-meta">
  <span><b>Document No.:</b> ${docNo}</span>
  <span><b>Issued:</b> ${issueDate}</span>
</div>

<!-- A. Equipment Information -->
<h2 class="section">A. Equipment Information</h2>
<table class="kv">
  <tr><td>Equipment Name</td><td>${request.equipment_name || '—'}</td></tr>
  <tr><td>Category</td><td>${request.category || request.equipment_category || '—'}</td></tr>
  <tr><td>Quantity Requested</td><td>${request.quantity || '—'}</td></tr>
</table>

<!-- B. Borrower Information -->
<h2 class="section">B. Borrower Information</h2>
<table class="kv">
  <tr><td>Full Name</td><td>${request.borrower_name || '—'}</td></tr>
  <tr><td>Email</td><td>${request.student_email || request.borrower_email || '—'}</td></tr>
  <tr><td>Department</td><td>${request.department || '—'}</td></tr>
  <tr><td>Supervising Lecturer</td><td>${lecturerName}</td></tr>
</table>

<!-- C. Purpose of Borrowing -->
<h2 class="section">C. Purpose of Borrowing</h2>
<div class="purpose">${request.purpose || request.reason || '—'}</div>

<!-- D. Loan Period -->
<h2 class="section">D. Loan Period</h2>
<table class="kv">
  <tr><td>Request Submitted</td><td>${fmt(request.created_date || request.createdAt)}</td></tr>
  <tr><td>Scheduled Borrow Date</td><td>${fmt(request.borrow_date)}</td></tr>
  <tr><td>Scheduled Return Date</td><td>${fmt(request.return_date)}</td></tr>
  <tr><td>Actual Return Date</td><td>${request.status === 'returned' ? fmt(request.returned_at || request.return_date) : '—'}</td></tr>
</table>

<!-- E. Approval Chain -->
<h2 class="section">E. Approval Chain</h2>
<table class="trail">
  <thead><tr>
    <th>Tier</th><th>Name</th><th>Decision Date</th><th>Decision</th><th>Notes</th>
  </tr></thead>
  <tbody>${trailRows}</tbody>
</table>

<!-- F. Current Status -->
<h2 class="section">F. Current Status</h2>
<div style="margin-top:8px">
  <span class="status-stamp ${statusClass(request.status)}">${statusLabel(request.status)}</span>
</div>

<!-- SIGNATURE BLOCK -->
<div class="sig-block">
  <div class="sig">
    <div class="title">Borrower</div>
    <div class="name">${request.borrower_name || '—'}</div>
    <div class="role">Student</div>
  </div>
  <div class="sig">
    <div class="title">Supervising Lecturer</div>
    <div class="name">${lecturerName}</div>
    <div class="role">Lecturer</div>
  </div>
  <div class="sig">
    <div class="title">Lab Assistant</div>
    <div class="name">${assistantName}</div>
    <div class="role">Lab Assistant</div>
  </div>
</div>

<!-- FOOTNOTE -->
<div class="footnote">
  This document is issued in accordance with <b>laboratory regulation No. 03/LAB/ITS/2024</b>.
  Please retain this receipt for the duration of the loan period.
</div>

</body></html>`;
}

export function printItsReceipt(request) {
  if (!request) return;
  const html = buildItsReceiptHtml(request);
  const w = window.open('', '_blank', 'width=900,height=1200');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 250);
}
