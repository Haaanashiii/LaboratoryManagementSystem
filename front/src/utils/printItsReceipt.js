import { format } from 'date-fns';
import itsLogoUrl from '@/assets/images/Tower2.png';

const toName = (v) => {
  if (!v) return '—';
  if (typeof v === 'object') return v.name || v.full_name || v.email || '—';
  if (typeof v === 'string') {
    if (/^[a-f0-9]{24}$/i.test(v)) return '—';
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
  } catch { return String(v); }
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

const decisionColor = (s) => {
  if (s === 'approved' || s === 'head_approved') return '#1F6B4D';
  if (s === 'rejected') return '#8C1F1F';
  return '#B07A12';
};

const PDF_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=IBM+Plex+Mono:wght@400;500&display=swap');
  :root {
    --navy: #0F2A4A; --navy-2: #1B3A60;
    --blue: #2563EB; --blue-2: #1D4ED8; --blue-3: #EFF6FF;
    --paper: #FAFBFC; --paper-2: #F0F4F8;
    --ink: #1A1A1A; --ink-2: #3F3F3F;
    --mute: #6B7280; --mute-2: #94989F;
    --rule: #D1D5DB; --rule-2: #E5E7EB;
    --ok: #1F6B4D; --warn: #B07A12; --bad: #8C1F1F;
    --serif: "Source Serif 4", Georgia, serif;
    --sans: "Inter", -apple-system, sans-serif;
    --mono: "IBM Plex Mono", "JetBrains Mono", Menlo, monospace;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--sans); color: var(--ink); background: #2a2825; -webkit-font-smoothing: antialiased; }
  .page {
    width: 794px; min-height: 1123px; background: var(--paper);
    padding: 52px 60px 80px; position: relative;
    font-size: 11.5px; line-height: 1.45;
    display: flex; flex-direction: column; margin: 0 auto 24px;
  }
  .page::after {
    content: ""; position: absolute; top: 52px; left: 0;
    width: 4px; height: 80px; background: var(--blue);
  }
  .letterhead {
    display: grid; grid-template-columns: 160px 1fr auto;
    gap: 20px; align-items: center; padding-bottom: 12px;
    border-bottom: 1.5px solid var(--navy); position: relative; margin-bottom: 2px;
  }
  .letterhead::after {
    content: ""; position: absolute; left: 0; right: 0; bottom: -4px;
    height: 1px; background: var(--blue);
  }
  .crest { width: auto; height: auto; max-width: 160px; max-height: 56px; object-fit: contain; display: block; }
  .org { font-family: var(--serif); font-weight: 600; color: var(--navy); font-size: 14px; letter-spacing: 0.06em; text-transform: uppercase; line-height: 1.2; }
  .org-sub { font-family: var(--serif); font-style: italic; color: var(--ink-2); font-size: 11px; margin-top: 3px; }
  .org-addr { font-size: 9px; color: var(--mute); letter-spacing: 0.02em; margin-top: 3px; }
  .doc-class { text-align: right; font-family: var(--mono); font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--mute); line-height: 1.6; }
  .class-pill { display: inline-block; border: 1px solid var(--navy); color: var(--navy); padding: 2px 7px; border-radius: 2px; margin-bottom: 4px; font-weight: 600; }
  .title-block { margin: 20px 0 16px; }
  .title-eyebrow { font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--blue-2); margin-bottom: 5px; }
  .title-h1 { font-family: var(--serif); font-weight: 600; font-size: 28px; color: var(--navy); letter-spacing: -0.005em; line-height: 1.08; }
  .title-deck { font-family: var(--serif); font-style: italic; color: var(--ink-2); font-size: 12.5px; margin-top: 7px; }
  .meta { display: grid; grid-template-columns: repeat(4,1fr); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); padding: 9px 0; margin: 14px 0 20px; }
  .meta-item .mlabel { font-family: var(--mono); font-size: 7.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute); margin-bottom: 3px; }
  .meta-item .mvalue { font-family: var(--serif); font-size: 11.5px; color: var(--ink); font-weight: 600; }
  .meta-item .mvalue.mono { font-family: var(--mono); font-weight: 500; font-size: 10.5px; }
  .section { margin-top: 20px; }
  .section-h { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 9px; padding-bottom: 5px; border-bottom: 0.5px solid var(--rule); }
  .section-h h2 { font-family: var(--serif); font-weight: 600; font-size: 13.5px; color: var(--navy); letter-spacing: 0.01em; }
  .section-h h2 .num { font-family: var(--mono); font-size: 9.5px; color: var(--blue-2); margin-right: 7px; letter-spacing: 0.08em; }
  table.kv { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  table.kv td { padding: 5px 8px; vertical-align: top; }
  table.kv td:first-child { width: 35%; font-family: var(--mono); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--mute); }
  table.kv td:last-child { color: var(--ink); font-weight: 600; font-family: var(--serif); }
  table.kv tr { border-bottom: 0.5px solid var(--rule-2); }
  .purpose { border-left: 2px solid var(--blue); background: rgba(37,99,235,0.05); padding: 10px 13px; font-family: var(--serif); font-style: italic; font-size: 11px; color: var(--ink-2); line-height: 1.55; }
  table.r { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  table.r thead th { text-align: left; font-family: var(--mono); font-size: 8px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--paper); background: var(--navy); padding: 8px 10px; font-weight: 500; }
  table.r thead th:first-child { padding-left: 13px; }
  table.r tbody td { padding: 7px 10px; border-bottom: 0.5px solid var(--rule-2); vertical-align: top; line-height: 1.4; }
  table.r tbody td:first-child { padding-left: 13px; }
  table.r tbody tr:nth-child(even) td { background: rgba(219,234,254,0.2); }
  .badge { display: inline-block; padding: 1px 7px; border-radius: 2px; font-family: var(--mono); font-size: 7.5px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; line-height: 1.6; border: 0.5px solid; }
  .b-ok   { color: var(--ok);   border-color: var(--ok);   background: rgba(31,107,77,0.06); }
  .b-warn { color: var(--warn); border-color: var(--warn); background: rgba(176,122,18,0.07); }
  .b-bad  { color: var(--bad);  border-color: var(--bad);  background: rgba(140,31,31,0.05); }
  .b-navy { color: var(--navy); border-color: var(--navy); background: rgba(15,42,74,0.05); }
  .sigs { margin-top: auto; padding-top: 32px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; }
  .sig { text-align: center; }
  .sig .where { font-family: var(--serif); font-style: italic; font-size: 10.5px; color: var(--ink-2); margin-bottom: 40px; }
  .sig .line { border-bottom: 1px solid var(--ink); margin-bottom: 5px; height: 1px; }
  .sig .name { font-family: var(--serif); font-weight: 600; color: var(--navy); font-size: 11.5px; }
  .sig .role { font-size: 9.5px; color: var(--ink-2); font-style: italic; font-family: var(--serif); margin-top: 2px; }
  .footer { position: absolute; left: 60px; right: 60px; bottom: 28px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 9px; border-top: 0.5px solid var(--rule); font-family: var(--mono); font-size: 7.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--mute); }
  @media print { body { background: white; } .page { margin: 0 !important; box-shadow: none !important; } }
`;

export function buildItsReceiptHtml(request) {
  if (!request) return '';

  const logoSrc = itsLogoUrl.startsWith('data:') || /^https?:\/\//.test(itsLogoUrl)
    ? itsLogoUrl
    : `${window.location.origin}${itsLogoUrl}`;

  const docNo     = `EQM-RCP-${(request.id || '').slice(-6).toUpperCase() || 'XXXXXX'}`;
  const issueDate = format(new Date(), 'MMMM d, yyyy');

  const lecturerName  = request.lecturer_name
    || (request.lecturer && typeof request.lecturer === 'object' ? (request.lecturer.name || request.lecturer.full_name || request.lecturer.email) : null)
    || (typeof request.lecturer === 'string' && !/^[a-f0-9]{24}$/i.test(request.lecturer) ? request.lecturer : null)
    || request.lecturer_email || '—';
  const headName      = request.head_name      || toName(request.head_of_lab) || toName(request.head);
  const assistantName = request.assistant_name || toName(request.lab_assistant) || toName(request.assistant);

  const trail = [
    { tier: 'Lecturer',      name: lecturerName,  date: fmt(request.lecturer_approved_at), status: request.lecturer_approved_at ? 'approved' : (request.status === 'rejected' ? 'rejected' : 'pending'), note: request.lecturer_remarks || '—' },
    { tier: 'Head of Lab',   name: headName,      date: fmt(request.head_approved_at),     status: request.head_approved_at ? 'approved' : (request.status === 'rejected' ? 'rejected' : 'pending'),    note: request.head_remarks || '—' },
    { tier: 'Lab Assistant', name: assistantName, date: fmt(request.assistant_approved_at || request.released_at), status: ['ready_pickup', 'borrowed', 'returned'].includes(request.status) ? 'approved' : 'pending', note: request.assistant_remarks || '—' },
  ];

  const trailRows = trail.map(t => `<tr>
    <td style="font-family:var(--serif);font-weight:600;color:var(--navy)">${t.tier}</td>
    <td>${t.name}</td>
    <td style="font-family:var(--mono);font-size:9.5px">${t.date}</td>
    <td><span style="color:${decisionColor(t.status)};font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">${t.status}</span></td>
    <td style="font-style:italic;color:var(--mute)">${t.note}</td>
  </tr>`).join('');

  const stCls = request.status === 'returned' ? 'b-ok' : request.status === 'rejected' ? 'b-bad' : request.status?.startsWith('pending') ? 'b-warn' : 'b-navy';

  const body = `<div class="page">
    <header class="letterhead">
      <img src="${logoSrc}" alt="ITS Logo" class="crest" />
      <div>
        <div class="org">Institut Teknologi Sepuluh Nopember</div>
        <div class="org-sub">Equimon · Laboratory Management System</div>
        <div class="org-addr">Jl. Arief Rahman Hakim No. 100 · Sukolilo, Surabaya 60111 · East Java, Indonesia</div>
      </div>
      <div class="doc-class">
        <div class="class-pill">Official · Internal</div>
        <div>Equimon LMS · v2.4</div>
        <div>equimon.its.ac.id</div>
      </div>
    </header>

    <div class="title-block">
      <div class="title-eyebrow">Equipment Loan · Official Receipt</div>
      <h1 class="title-h1">Equipment Loan Receipt</h1>
      <p class="title-deck">Official record of equipment borrowing issued by the ITS Laboratory Management System.</p>
    </div>

    <div class="meta">
      <div class="meta-item"><div class="mlabel">Document No.</div><div class="mvalue mono">${docNo}</div></div>
      <div class="meta-item"><div class="mlabel">Issued</div><div class="mvalue">${issueDate}</div></div>
      <div class="meta-item"><div class="mlabel">Status</div><div class="mvalue"><span class="badge ${stCls}">${statusLabel(request.status)}</span></div></div>
      <div class="meta-item"><div class="mlabel">Equipment</div><div class="mvalue">${request.equipment_name || '—'}</div></div>
    </div>

    <div class="section">
      <div class="section-h"><h2><span class="num">01</span>Equipment Information</h2></div>
      <table class="kv">
        <tr><td>Equipment Name</td><td>${request.equipment_name || '—'}</td></tr>
        <tr><td>Category</td><td>${request.category || request.equipment_category || (request.equipment && typeof request.equipment === 'object' ? request.equipment.category : null) || '—'}</td></tr>
        <tr><td>Quantity</td><td>${request.quantity || '—'}</td></tr>
      </table>
    </div>

    <div class="section">
      <div class="section-h"><h2><span class="num">02</span>Borrower Information</h2></div>
      <table class="kv">
        <tr><td>Full Name</td><td>${request.borrower_name || '—'}</td></tr>
        <tr><td>Email</td><td>${request.student_email || request.borrower_email || '—'}</td></tr>
        <tr><td>Department</td><td>${request.department || '—'}</td></tr>
        <tr><td>Supervising Lecturer</td><td>${lecturerName}</td></tr>
      </table>
    </div>

    <div class="section">
      <div class="section-h"><h2><span class="num">03</span>Loan Period</h2></div>
      <table class="kv">
        <tr><td>Request Submitted</td><td>${fmt(request.created_date || request.createdAt)}</td></tr>
        <tr><td>Borrow Date</td><td>${fmt(request.borrow_date)}</td></tr>
        <tr><td>Return Date</td><td>${fmt(request.return_date)}</td></tr>
        <tr><td>Actual Return</td><td>${request.status === 'returned' ? fmt(request.returned_at || request.return_date) : '—'}</td></tr>
      </table>
    </div>

    <div class="section">
      <div class="section-h"><h2><span class="num">04</span>Purpose of Borrowing</h2></div>
      <div class="purpose">${request.purpose || request.reason || '—'}</div>
    </div>

    <div class="section">
      <div class="section-h"><h2><span class="num">05</span>Approval Chain</h2></div>
      <table class="r">
        <thead><tr>
          <th>Tier</th><th>Name</th><th style="width:100px">Decision Date</th><th style="width:80px">Decision</th><th>Notes</th>
        </tr></thead>
        <tbody>${trailRows}</tbody>
      </table>
    </div>

    <div class="sigs">
      <div class="sig">
        <div class="where">Borrower</div>
        <div class="line"></div>
        <div class="name">${request.borrower_name || '—'}</div>
        <div class="role">Student</div>
      </div>
      <div class="sig">
        <div class="where">Supervising Lecturer</div>
        <div class="line"></div>
        <div class="name">${lecturerName}</div>
        <div class="role">Lecturer</div>
      </div>
      <div class="sig">
        <div class="where">Surabaya, ${issueDate}<br/>Issued by,</div>
        <div class="line"></div>
        <div class="name">${assistantName}</div>
        <div class="role">Lab Assistant</div>
      </div>
    </div>

    <footer class="footer">
      <div>Doc · ${docNo}</div>
      <div>— Page 1 of 1 —</div>
      <div>Generated ${format(new Date(), 'MMM d, yyyy · HH:mm')}</div>
    </footer>
  </div>`;

  return `<!doctype html><html><head><meta charset="utf-8"/>
    <title>Equipment Loan Receipt · ${docNo}</title>
    <style>${PDF_STYLES}</style>
  </head><body>${body}</body></html>`;
}

export function printItsReceipt(request) {
  if (!request) return;
  const html = buildItsReceiptHtml(request);
  const w = window.open('', '_blank', 'width=960,height=1100');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 600);
}
