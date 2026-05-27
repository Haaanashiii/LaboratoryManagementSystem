import { format, differenceInDays } from 'date-fns';
import itsLogoUrl from '@/assets/images/Tower2.png';

const fmt = (v) => {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return format(d, 'MMM d, yyyy');
  } catch { return String(v); }
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
  .title-deck { font-family: var(--serif); font-style: italic; color: var(--ink-2); font-size: 12.5px; margin-top: 7px; line-height: 1.5; }
  .meta { display: grid; grid-template-columns: repeat(4,1fr); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); padding: 9px 0; margin: 14px 0 24px; }
  .meta-item .mlabel { font-family: var(--mono); font-size: 7.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute); margin-bottom: 3px; }
  .meta-item .mvalue { font-family: var(--serif); font-size: 11.5px; color: var(--ink); font-weight: 600; }
  .meta-item .mvalue.mono { font-family: var(--mono); font-weight: 500; font-size: 10.5px; }
  .section { margin-top: 22px; }
  .section-h { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 0.5px solid var(--rule); }
  .section-h h2 { font-family: var(--serif); font-weight: 600; font-size: 13.5px; color: var(--navy); letter-spacing: 0.01em; }
  .section-h h2 .num { font-family: var(--mono); font-size: 9.5px; color: var(--blue-2); margin-right: 7px; letter-spacing: 0.08em; }
  .section-h .count { font-family: var(--mono); font-size: 9px; color: var(--mute); margin-left: auto; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 4px; }
  .kpi { border: 1px solid var(--rule); background: var(--paper-2); padding: 12px 14px; }
  .kpi .k-label { font-family: var(--mono); font-size: 7.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute); margin-bottom: 6px; }
  .kpi .k-value { font-family: var(--serif); font-weight: 700; font-size: 28px; line-height: 1; }
  .kpi .k-sub { font-family: var(--serif); font-style: italic; font-size: 9.5px; color: var(--mute); margin-top: 4px; }
  table.r { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  table.r thead th { text-align: left; font-family: var(--mono); font-size: 8px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--paper); background: var(--navy); padding: 8px 10px; font-weight: 500; }
  table.r thead th:first-child { padding-left: 13px; }
  table.r thead th.num { text-align: right; }
  table.r tbody td { padding: 7px 10px; border-bottom: 0.5px solid var(--rule-2); vertical-align: top; line-height: 1.4; }
  table.r tbody td:first-child { padding-left: 13px; }
  table.r tbody tr:nth-child(even) td { background: rgba(219,234,254,0.18); }
  table.r tbody td.num { text-align: right; font-family: var(--mono); font-size: 10px; }
  .badge { display: inline-block; padding: 1px 7px; border-radius: 2px; font-family: var(--mono); font-size: 7.5px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; line-height: 1.6; border: 0.5px solid; }
  .b-ok   { color: var(--ok);   border-color: var(--ok);   background: rgba(31,107,77,0.06); }
  .b-warn { color: var(--warn); border-color: var(--warn); background: rgba(176,122,18,0.07); }
  .b-bad  { color: var(--bad);  border-color: var(--bad);  background: rgba(140,31,31,0.05); }
  .b-navy { color: var(--navy); border-color: var(--navy); background: rgba(15,42,74,0.05); }
  .b-blue { color: var(--blue); border-color: var(--blue); background: rgba(37,99,235,0.06); }
  .name-primary { font-family: var(--serif); font-weight: 600; color: var(--navy); font-size: 11px; }
  .name-sub { font-family: var(--mono); font-size: 9px; color: var(--mute); margin-top: 2px; }
  .footer { position: absolute; left: 60px; right: 60px; bottom: 28px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 9px; border-top: 0.5px solid var(--rule); font-family: var(--mono); font-size: 7.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--mute); }
  @media print { body { background: white; } .page { margin: 0 !important; box-shadow: none !important; } }
`;

export function buildReturnsQueueHtml(requests) {
  const logoSrc = itsLogoUrl.startsWith('data:') || /^https?:\/\//.test(itsLogoUrl)
    ? itsLogoUrl
    : `${window.location.origin}${itsLogoUrl}`;

  const today = new Date();
  const docNo  = `EQM-RTN-${format(today, 'yyyyMMdd')}-F`;
  const issued = format(today, 'MMMM d, yyyy');

  const isOverdue  = (r) => new Date(r.return_date) < today;
  const isDueSoon  = (r) => { const d = differenceInDays(new Date(r.return_date), today); return d >= 0 && d <= 3; };

  const overdue  = requests.filter(r => r._section === 'overdue' || isOverdue(r));
  const dueSoon  = requests.filter(r => r._section === 'due_soon' || (!isOverdue(r) && isDueSoon(r)));
  const regular  = requests.filter(r => r._section === 'regular' || (!isOverdue(r) && !isDueSoon(r)));
  const totalQty = requests.reduce((s, r) => s + (Number(r.quantity) || 0), 0);

  const statusBadge = (r) => {
    if (r._section === 'overdue' || isOverdue(r)) {
      const days = differenceInDays(today, new Date(r.return_date));
      return `<span class="badge b-bad">Overdue ${days}d</span>`;
    }
    if (r._section === 'due_soon' || isDueSoon(r)) {
      const days = differenceInDays(new Date(r.return_date), today);
      return `<span class="badge b-warn">Due in ${days}d</span>`;
    }
    return `<span class="badge b-ok">On Schedule</span>`;
  };

  const tableRow = (r) => {
    const borrowedDate = r.borrow_date || r.released_at || r.created_date;
    const loanDays = borrowedDate
      ? Math.abs(differenceInDays(new Date(r.return_date), new Date(borrowedDate)))
      : null;
    const reqId = `REQ-${today.getFullYear()}-${String(r.id || '').slice(-4).toUpperCase() || '????'}`;
    return `<tr>
      <td>
        <div class="name-primary">${r.equipment_name || '—'}</div>
        ${r.category || r.equipment_category ? `<div class="name-sub">${r.category || r.equipment_category}</div>` : ''}
      </td>
      <td class="num">×${r.quantity || 1}</td>
      <td>
        <div class="name-primary">${r.borrower_name || '—'}</div>
        ${r.student_email ? `<div class="name-sub">${r.student_email}</div>` : ''}
      </td>
      <td style="font-family:var(--mono);font-size:9.5px">${fmt(borrowedDate)}</td>
      <td style="font-family:var(--mono);font-size:9.5px;color:${r._section === 'overdue' || isOverdue(r) ? 'var(--bad)' : 'var(--ink)'};font-weight:${isOverdue(r) ? 700 : 400}">${fmt(r.return_date)}</td>
      <td class="num" style="color:var(--mute)">${loanDays != null ? `${loanDays}d` : '—'}</td>
      <td style="font-family:var(--mono);font-size:8.5px;color:var(--mute)">${reqId}</td>
      <td>${statusBadge(r)}</td>
    </tr>`;
  };

  const allRows = [
    ...overdue,
    ...dueSoon,
    ...regular,
  ].map(tableRow).join('');

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
      <div class="title-eyebrow">Inventory &amp; Lending · Equipment Returns</div>
      <h1 class="title-h1">Equipment Returns Queue</h1>
      <p class="title-deck">A complete record of all active equipment loans currently under the lab's custody, including overdue items, upcoming returns, and current loan status as of the report date.</p>
    </div>

    <div class="meta">
      <div class="meta-item">
        <div class="mlabel">Document No.</div>
        <div class="mvalue mono">${docNo}</div>
      </div>
      <div class="meta-item">
        <div class="mlabel">Generated</div>
        <div class="mvalue">${issued}</div>
      </div>
      <div class="meta-item">
        <div class="mlabel">Total Active</div>
        <div class="mvalue">${requests.length} loan${requests.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="meta-item">
        <div class="mlabel">Overdue</div>
        <div class="mvalue" style="color:${overdue.length > 0 ? 'var(--bad)' : 'var(--ok)'}">${overdue.length} item${overdue.length !== 1 ? 's' : ''}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-h"><h2><span class="num">01</span>At-a-glance</h2><span class="count">Period Totals</span></div>
      <div class="kpi-grid">
        <div class="kpi">
          <div class="k-label">Total Active Loans</div>
          <div class="k-value" style="color:var(--navy)">${requests.length}</div>
          <div class="k-sub">across all borrowers</div>
        </div>
        <div class="kpi">
          <div class="k-label">Total Quantity Out</div>
          <div class="k-value" style="color:var(--blue)">${totalQty}</div>
          <div class="k-sub">units currently borrowed</div>
        </div>
        <div class="kpi">
          <div class="k-label">Overdue</div>
          <div class="k-value" style="color:${overdue.length > 0 ? 'var(--bad)' : 'var(--ok)'}">${overdue.length}</div>
          <div class="k-sub">past return date</div>
        </div>
        <div class="kpi">
          <div class="k-label">Due Within 3 Days</div>
          <div class="k-value" style="color:var(--warn)">${dueSoon.length}</div>
          <div class="k-sub">returning soon</div>
        </div>
      </div>
    </div>

    ${overdue.length > 0 ? `
    <div class="section">
      <div class="section-h">
        <h2><span class="num">02</span>Overdue Items</h2>
        <span class="count">${overdue.length} item${overdue.length !== 1 ? 's' : ''} past due date</span>
      </div>
      <table class="r">
        <thead><tr>
          <th>Equipment</th><th class="num">Qty</th><th>Borrower</th><th>Borrowed</th><th>Was Due</th><th class="num">Days Late</th>
        </tr></thead>
        <tbody>
          ${overdue.map(r => {
            const daysLate = differenceInDays(today, new Date(r.return_date));
            const borrowedDate = r.borrow_date || r.released_at || r.created_date;
            return `<tr>
              <td><div class="name-primary">${r.equipment_name || '—'}</div>${r.category || r.equipment_category ? `<div class="name-sub">${r.category || r.equipment_category}</div>` : ''}</td>
              <td class="num">×${r.quantity || 1}</td>
              <td><div class="name-primary">${r.borrower_name || '—'}</div>${r.student_email ? `<div class="name-sub">${r.student_email}</div>` : ''}</td>
              <td style="font-family:var(--mono);font-size:9.5px">${fmt(borrowedDate)}</td>
              <td style="font-family:var(--mono);font-size:9.5px;color:var(--bad);font-weight:700">${fmt(r.return_date)}</td>
              <td class="num" style="color:var(--bad);font-weight:700">${daysLate}d</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="section">
      <div class="section-h">
        <h2><span class="num">${overdue.length > 0 ? '03' : '02'}</span>Detailed Returns Queue</h2>
        <span class="count">${requests.length} entr${requests.length !== 1 ? 'ies' : 'y'} · overdue first</span>
      </div>
      <table class="r">
        <thead><tr>
          <th>Equipment</th><th class="num">Qty</th><th>Borrower</th><th>Borrowed</th><th>Due Back</th><th class="num">Duration</th><th>Request ID</th><th>Status</th>
        </tr></thead>
        <tbody>${allRows}</tbody>
      </table>
    </div>

    <footer class="footer">
      <div>Doc · ${docNo}</div>
      <div>— Page 1 of 1 —</div>
      <div>Generated ${format(today, 'MMM d, yyyy · HH:mm')}</div>
    </footer>
  </div>`;

  return `<!doctype html><html><head><meta charset="utf-8"/>
    <title>Equipment Returns Queue · ${docNo}</title>
    <style>${PDF_STYLES}</style>
  </head><body>${body}</body></html>`;
}

export function printReturnsQueue(requests) {
  if (!requests?.length) return;
  const html = buildReturnsQueueHtml(requests);
  const w = window.open('', '_blank', 'width=960,height=1100');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 600);
}
