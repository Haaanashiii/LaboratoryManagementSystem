import itsLogoUrl from '@/assets/images/logo-its-l-min.jpg';

/* ── Shared styles for all formal Equimon PDF documents ────────────────── */
const PDF_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=IBM+Plex+Mono:wght@400;500&display=swap');

  :root {
    --navy: #0F2A4A; --navy-2: #1B3A60;
    --gold: #C8A246; --gold-2: #A8862E; --gold-3: #EFE4BF;
    --paper: #FAFAF6; --paper-2: #F2EFE5;
    --ink: #1A1A1A; --ink-2: #3F3F3F;
    --mute: #6B7280; --mute-2: #94989F;
    --rule: #D9D4C2; --rule-2: #EDEAE0;
    --ok: #1F6B4D; --warn: #B07A12; --bad: #8C1F1F;
    --serif: "Source Serif 4", Georgia, serif;
    --sans: "Inter", -apple-system, sans-serif;
    --mono: "IBM Plex Mono", "JetBrains Mono", Menlo, monospace;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--sans); color: var(--ink);
    background: #2a2825;
    -webkit-font-smoothing: antialiased;
  }
  .page {
    width: 794px; min-height: 1123px;
    background: var(--paper);
    padding: 52px 60px 80px;
    position: relative;
    font-size: 11.5px; line-height: 1.45;
    display: flex; flex-direction: column;
    margin: 0 auto 24px;
  }
  .page::after {
    content: ""; position: absolute;
    top: 52px; left: 0;
    width: 4px; height: 80px;
    background: var(--gold);
  }
  /* ── Letterhead ── */
  .letterhead {
    display: grid; grid-template-columns: 52px 1fr auto;
    gap: 16px; align-items: center;
    padding-bottom: 12px;
    border-bottom: 1.5px solid var(--navy);
    position: relative; margin-bottom: 2px;
  }
  .letterhead::after {
    content: ""; position: absolute;
    left: 0; right: 0; bottom: -4px;
    height: 1px; background: var(--gold);
  }
  .crest {
    width: 52px; height: 52px; border-radius: 50%;
    background: var(--navy); color: var(--paper);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--serif); font-weight: 600;
    font-size: 16px; letter-spacing: 0.04em;
    border: 1.5px solid var(--gold);
    box-shadow: inset 0 0 0 4px var(--navy), inset 0 0 0 4.5px var(--gold);
  }
  .org { font-family: var(--serif); font-weight: 600; color: var(--navy); font-size: 14px; letter-spacing: 0.06em; text-transform: uppercase; line-height: 1.2; }
  .org-sub { font-family: var(--serif); font-style: italic; color: var(--ink-2); font-size: 11px; margin-top: 3px; }
  .org-addr { font-size: 9px; color: var(--mute); letter-spacing: 0.02em; margin-top: 3px; }
  .doc-class { text-align: right; font-family: var(--mono); font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--mute); line-height: 1.6; }
  .class-pill { display: inline-block; border: 1px solid var(--navy); color: var(--navy); padding: 2px 7px; border-radius: 2px; margin-bottom: 4px; font-weight: 600; }
  /* ── Title block ── */
  .title-block { margin: 20px 0 16px; }
  .title-eyebrow { font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--gold-2); margin-bottom: 5px; }
  .title-h1 { font-family: var(--serif); font-weight: 600; font-size: 28px; color: var(--navy); letter-spacing: -0.005em; line-height: 1.08; }
  .title-deck { font-family: var(--serif); font-style: italic; color: var(--ink-2); font-size: 12.5px; margin-top: 7px; max-width: 540px; }
  /* ── Meta strip ── */
  .meta { display: grid; grid-template-columns: repeat(4,1fr); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); padding: 9px 0; margin: 14px 0 20px; }
  .meta-item .mlabel { font-family: var(--mono); font-size: 7.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute); margin-bottom: 3px; }
  .meta-item .mvalue { font-family: var(--serif); font-size: 11.5px; color: var(--ink); font-weight: 600; }
  .meta-item .mvalue.mono { font-family: var(--mono); font-weight: 500; font-size: 10.5px; }
  /* ── Section ── */
  .section { margin-top: 20px; }
  .section-h { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 9px; padding-bottom: 5px; border-bottom: 0.5px solid var(--rule); }
  .section-h h2 { font-family: var(--serif); font-weight: 600; font-size: 13.5px; color: var(--navy); letter-spacing: 0.01em; }
  .section-h h2 .num { font-family: var(--mono); font-size: 9.5px; color: var(--gold-2); margin-right: 7px; letter-spacing: 0.08em; }
  .section-h .right { font-family: var(--mono); font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--mute); }
  /* ── KPI cards ── */
  .kpis { display: grid; grid-template-columns: repeat(4,1fr); border: 1px solid var(--rule); background: linear-gradient(180deg,#fdfcf6 0%,var(--paper) 100%); }
  .kpi { padding: 13px 15px; border-right: 1px solid var(--rule); }
  .kpi:last-child { border-right: none; }
  .kpi .k-label { font-family: var(--mono); font-size: 7.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute); }
  .kpi .k-val { font-family: var(--serif); font-size: 26px; font-weight: 600; color: var(--navy); line-height: 1; margin-top: 7px; letter-spacing: -0.01em; }
  .kpi .k-val .unit { font-family: var(--sans); font-size: 10.5px; color: var(--mute); font-weight: 400; margin-left: 4px; }
  .kpi .k-sub { font-size: 9px; color: var(--ink-2); margin-top: 5px; font-style: italic; font-family: var(--serif); }
  .kpi .k-sub .up { color: var(--ok); font-style: normal; font-weight: 600; }
  .kpi .k-sub .dn { color: var(--bad); font-style: normal; font-weight: 600; }
  /* ── Tables ── */
  table.r { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  table.r thead th { text-align: left; font-family: var(--mono); font-size: 8px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--paper); background: var(--navy); padding: 8px 10px; font-weight: 500; vertical-align: middle; }
  table.r thead th.num { text-align: right; }
  table.r thead th:first-child { padding-left: 13px; }
  table.r thead th:last-child  { padding-right: 13px; }
  table.r tbody td { padding: 7px 10px; border-bottom: 0.5px solid var(--rule-2); vertical-align: top; line-height: 1.4; }
  table.r tbody td:first-child { padding-left: 13px; }
  table.r tbody td:last-child  { padding-right: 13px; }
  table.r tbody tr:nth-child(even) td { background: rgba(232,225,200,0.15); }
  table.r td.num  { text-align: right; font-variant-numeric: tabular-nums; font-family: var(--mono); font-size: 10px; }
  table.r td.mono { font-family: var(--mono); font-size: 9.5px; }
  table.r td.muted { color: var(--mute); }
  table.r tbody tr.group-row td { background: var(--paper-2) !important; font-family: var(--serif); font-weight: 600; color: var(--navy); font-size: 10.5px; padding: 6px 13px; border-bottom: 1px solid var(--gold); border-top: 0.5px solid var(--rule); }
  table.r tbody tr.group-row td .grp-count { font-family: var(--mono); font-size: 8px; color: var(--gold-2); margin-left: 10px; letter-spacing: 0.1em; font-weight: 500; }
  table.r tbody tr.total-row td { background: var(--paper-2) !important; font-family: var(--serif); font-weight: 600; color: var(--navy); border-top: 1px solid var(--navy); border-bottom: 1px solid var(--navy); font-size: 10.5px; }
  table.r tbody tr.total-row td.num { font-family: var(--mono); font-size: 11px; }
  /* ── Badges ── */
  .badge { display: inline-block; padding: 1px 7px; border-radius: 2px; font-family: var(--mono); font-size: 7.5px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; line-height: 1.6; border: 0.5px solid; }
  .b-ok   { color: var(--ok);   border-color: var(--ok);   background: rgba(31,107,77,0.06); }
  .b-warn { color: var(--warn); border-color: var(--warn); background: rgba(176,122,18,0.07); }
  .b-bad  { color: var(--bad);  border-color: var(--bad);  background: rgba(140,31,31,0.05); }
  .b-navy { color: var(--navy); border-color: var(--navy); background: rgba(15,42,74,0.05); }
  .b-mute { color: var(--mute); border-color: var(--mute); background: transparent; }
  /* ── Distribution bars ── */
  .dist { display: grid; gap: 6px; margin-top: 2px; }
  .dist-row { display: grid; gap: 10px; align-items: center; font-size: 9.5px; }
  .d-label { color: var(--ink-2); font-family: var(--sans); }
  .d-bar { height: 7px; background: var(--rule-2); position: relative; }
  .d-bar > span { display: block; height: 100%; background: var(--navy); position: relative; }
  .d-bar > span::after { content: ""; position: absolute; right: -1px; top: 0; bottom: 0; width: 2px; background: var(--gold); }
  .d-val { font-family: var(--mono); font-size: 9.5px; color: var(--navy); text-align: right; font-weight: 600; }
  /* ── Note ── */
  .note { font-family: var(--serif); font-style: italic; font-size: 10.5px; color: var(--ink-2); padding: 9px 13px; border-left: 2px solid var(--gold); background: rgba(200,162,70,0.05); margin: 12px 0; }
  .note strong { font-style: normal; color: var(--navy); }
  /* ── Two-col ── */
  .two-col { display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px; }
  /* ── Sparkline ── */
  .spark { display: flex; align-items: flex-end; gap: 9px; height: 90px; padding: 7px 3px 0; border-bottom: 1px solid var(--rule); }
  .spark .col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .spark .col .b { width: 100%; background: linear-gradient(180deg,var(--navy-2) 0%,var(--navy) 100%); min-height: 2px; }
  .spark .col .v { font-family: var(--mono); font-size: 8.5px; color: var(--navy); font-weight: 600; }
  .spark-labels { display: flex; gap: 9px; padding: 4px 3px 0; }
  .spark-labels .l { flex: 1; text-align: center; font-family: var(--mono); font-size: 7.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--mute); }
  /* ── Signatures ── */
  .sigs { margin-top: auto; padding-top: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 56px; }
  .sig { text-align: center; }
  .sig .where { font-family: var(--serif); font-style: italic; font-size: 10.5px; color: var(--ink-2); margin-bottom: 34px; }
  .sig .line { border-bottom: 1px solid var(--ink); margin-bottom: 5px; height: 1px; }
  .sig .name { font-family: var(--serif); font-weight: 600; color: var(--navy); font-size: 11.5px; text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 0.5px; }
  .sig .role { font-size: 9.5px; color: var(--ink-2); font-style: italic; font-family: var(--serif); margin-top: 2px; }
  .sig .nip  { font-family: var(--mono); font-size: 8.5px; color: var(--mute); margin-top: 4px; letter-spacing: 0.06em; }
  /* ── Footer ── */
  .footer { position: absolute; left: 60px; right: 60px; bottom: 28px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 9px; border-top: 0.5px solid var(--rule); font-family: var(--mono); font-size: 7.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--mute); }
  .footer .pageno { font-family: var(--serif); font-style: italic; font-size: 9.5px; text-transform: none; letter-spacing: 0.02em; color: var(--ink-2); }
  .sc { font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--mute); }
  @media print {
    body { background: white; }
    .page { margin: 0 !important; box-shadow: none !important; page-break-after: always; }
  }
`;

/* ── Shared HTML fragments ─────────────────────────────────────────────── */

function letterheadHtml(logoSrc) {
  const src = logoSrc && (logoSrc.startsWith('data:') || /^https?:\/\//.test(logoSrc))
    ? logoSrc
    : `${window.location.origin}${logoSrc}`;
  return `
  <header class="letterhead">
    <div class="crest">ITS</div>
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
  </header>`;
}

function metaHtml(items) {
  return `<div class="meta">${items.map(it => `
    <div class="meta-item">
      <div class="mlabel">${it.label}</div>
      <div class="mvalue${it.mono ? ' mono' : ''}">${it.value}</div>
    </div>`).join('')}
  </div>`;
}

function sectionHtml(num, title, right = '') {
  return `<div class="section-h">
    <h2><span class="num">${num}</span>${title}</h2>
    ${right ? `<div class="right">${right}</div>` : ''}
  </div>`;
}

function kpiHtml(items) {
  return `<div class="kpis">${items.map(k => `
    <div class="kpi">
      <div class="k-label">${k.label}</div>
      <div class="k-val">${k.value}${k.unit ? `<span class="unit">${k.unit}</span>` : ''}</div>
      ${k.sub ? `<div class="k-sub">${k.sub}</div>` : ''}
    </div>`).join('')}
  </div>`;
}

function signaturesHtml(city, date, left, right) {
  return `<div class="sigs">
    <div class="sig">
      <div class="where">Acknowledged by,</div>
      <div class="line"></div>
      <div class="name">${left.name}</div>
      <div class="role">${left.role}</div>
      ${left.nip ? `<div class="nip">NIP. ${left.nip}</div>` : ''}
    </div>
    <div class="sig">
      <div class="where">${city}, ${date}<br/>Issued by,</div>
      <div class="line"></div>
      <div class="name">${right.name}</div>
      <div class="role">${right.role}</div>
      ${right.nip ? `<div class="nip">NIP. ${right.nip}</div>` : ''}
    </div>
  </div>`;
}

function footerHtml(docId, page, total, generated) {
  return `<footer class="footer">
    <div>Doc · ${docId}</div>
    <div class="pageno">— Page ${page} of ${total} —</div>
    <div>Generated ${generated}</div>
  </footer>`;
}

function pageHtml(content) {
  return `<div class="page">${content}</div>`;
}

function openPrint(title, body) {
  const html = `<!doctype html><html><head><meta charset="utf-8"/>
    <title>${title}</title>
    <style>${PDF_STYLES}</style>
  </head><body>${body}</body></html>`;
  const w = window.open('', '_blank', 'width=960,height=1100');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 600);
}

function fmtDate(v) {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return String(v); }
}

function fmtDT(v) {
  if (!v) return '—';
  try {
    const d = new Date(v);
    return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function dateTag() { return new Date().toISOString().slice(0, 10); }

function genTimestamp() {
  return new Date().toLocaleString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ── Badge helper ──────────────────────────────────────────────────────── */
function statusBadge(status) {
  if (!status) return '<span class="badge b-mute">—</span>';
  const s = status.toLowerCase();
  const cls = s === 'returned' ? 'b-ok' : s === 'released' ? 'b-navy' : s === 'rejected' ? 'b-bad' : 'b-mute';
  return `<span class="badge ${cls}">${status}</span>`;
}

/* ══════════════════════════════════════════════════════════════════════════
   1. Full Release Report
   ══════════════════════════════════════════════════════════════════════════ */
export function printFullReleaseReport(records, summary, { startDate, endDate, lecturerFilter } = {}, admin = {}) {
  const period = `${startDate || 'Start'} – ${endDate || 'Today'}`;
  const docId   = `EQM-REL-${dateTag().replace(/-/g, '')}-F`;
  const now     = genTimestamp();

  // Group by lecturer for distribution bars
  const lecturerMap = {};
  records.forEach(r => {
    const key = r.lecturerName || '—';
    if (!lecturerMap[key]) lecturerMap[key] = { releases: 0, qty: 0 };
    lecturerMap[key].releases += 1;
    lecturerMap[key].qty += Number(r.quantity) || 0;
  });
  const lecturers = Object.entries(lecturerMap).sort((a, b) => b[1].releases - a[1].releases);
  const maxRel = Math.max(1, ...lecturers.map(([, v]) => v.releases));

  const tableRows = records.map(r => {
    const st = r.status || '';
    const stLabel = st.replace(/_/g, ' ') || '—';
    const stCls = st === 'returned' ? 'b-ok' : ['borrowed', 'released', 'ready_pickup', 'head_approved'].includes(st) ? 'b-navy' : 'b-mute';
    return `<tr>
      <td class="mono">${fmtDate(r.releasedAt || r.borrow_date)}</td>
      <td style="font-family:var(--serif);font-weight:600;color:var(--navy)">${r.lecturerName || '—'}</td>
      <td>${r.studentName || r.borrower_name || '—'}</td>
      <td>${r.equipmentName || r.equipment_name || '—'}</td>
      <td class="num">${r.quantity || '—'}</td>
      <td class="mono muted">${r.requestId || r.id || '—'}</td>
      <td><span class="badge ${stCls}">${stLabel}</span></td>
    </tr>`;
  }).join('');

  const distBars = lecturers.map(([name, data]) => `
    <div class="dist-row" style="grid-template-columns:1fr 1fr 60px">
      <div class="d-label" style="font-family:var(--serif);font-weight:600;color:var(--navy)">${name}</div>
      <div class="d-bar"><span style="width:${(data.releases / maxRel) * 100}%"></span></div>
      <div class="d-val">${data.releases} · ${data.qty}u</div>
    </div>`).join('');

  const totalQty = records.reduce((s, r) => s + (Number(r.quantity) || 0), 0);

  const body = pageHtml(`
    ${letterheadHtml(itsLogoUrl)}
    <div class="title-block">
      <div class="title-eyebrow">Inventory &amp; Lending · Full Disclosure</div>
      <h1 class="title-h1">Equipment Release Report</h1>
      <p class="title-deck">A complete record of every equipment release authorised under lecturer custody during the reporting period, including borrower, quantity, request identifier, and lifecycle status.</p>
    </div>
    ${metaHtml([
      { label: 'Document ID',    value: docId, mono: true },
      { label: 'Period',         value: period },
      { label: 'Lecturer Scope', value: lecturerFilter ? lecturers[0]?.[0] || 'Filtered' : 'All lecturers' },
      { label: 'Issued by',      value: admin?.email || 'admin@its.ac.id' },
    ])}
    <div class="section" style="margin-top:4px">
      ${sectionHtml('01', 'At-a-glance', 'Period totals')}
      ${kpiHtml([
        { label: 'Total Releases',    value: summary.totalReleases  || records.length,   sub: `across the period` },
        { label: 'Total Quantity',    value: totalQty,              unit: 'units' },
        { label: 'Lecturers',         value: summary.totalLecturers || lecturers.length, sub: 'approving custody' },
        { label: 'Distinct Borrowers',value: new Set(records.map(r => r.studentName || r.borrower_name)).size, sub: 'active borrowers' },
      ])}
    </div>
    <div class="two-col" style="margin-top:20px">
      <div class="section" style="margin-top:0">
        ${sectionHtml('02', 'Releases by Lecturer')}
        <div class="dist">${distBars}</div>
        <div class="sc" style="margin-top:7px">Bar represents share of total releases; figures are <strong style="color:var(--ink)">releases · units</strong>.</div>
      </div>
      <div class="section" style="margin-top:0">
        ${sectionHtml('03', 'Lifecycle Status')}
        <div class="dist">
          ${['returned', 'borrowed', 'released', 'ready_pickup', 'rejected'].map(st => {
            const cnt = records.filter(r => (r.status || '').toLowerCase() === st || (r.status || '').includes(st)).length;
            const pct = records.length ? (cnt / records.length) * 100 : 0;
            return `<div class="dist-row" style="grid-template-columns:110px 1fr 40px">
              <div class="d-label">${st.replace(/_/g, ' ')}</div>
              <div class="d-bar"><span style="width:${pct}%"></span></div>
              <div class="d-val">${cnt}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
    <div class="section">
      ${sectionHtml('04', 'Detailed Release Ledger', `${records.length} entries`)}
      <table class="r">
        <thead><tr>
          <th style="width:80px">Date</th>
          <th>Lecturer</th>
          <th>Borrower</th>
          <th>Equipment</th>
          <th class="num" style="width:40px">Qty</th>
          <th style="width:100px">Request</th>
          <th style="width:80px">Status</th>
        </tr></thead>
        <tbody>
          ${tableRows}
          <tr class="total-row">
            <td colspan="4" style="text-align:right;padding-right:13px">Period total</td>
            <td class="num">${totalQty}</td>
            <td class="mono muted">${records.length} reqs</td>
            <td class="sc">${records.filter(r => (r.status || '').toLowerCase() === 'returned').length} returned</td>
          </tr>
        </tbody>
      </table>
    </div>
    ${signaturesHtml('Surabaya', new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
      { name: admin?.name || 'System Administrator', role: 'Laboratory Administrator', nip: '' },
      { name: 'Head of Laboratory', role: 'Head of Laboratory', nip: '' }
    )}
    ${footerHtml(docId, '1', '1', now)}
  `);

  openPrint('Equipment Release Report — Equimon', body);
}

/* ══════════════════════════════════════════════════════════════════════════
   2. Weekly Summary Report
   ══════════════════════════════════════════════════════════════════════════ */
export function printWeeklySummaryReport(weeklySummary, summary, { startDate, endDate } = {}, admin = {}) {
  const period = `${startDate || 'Start'} – ${endDate || 'Today'}`;
  const docId  = `EQM-WKL-${dateTag().replace(/-/g, '')}-W`;
  const now    = genTimestamp();

  const totalQty      = weeklySummary.reduce((s, w) => s + (w.totalQuantity || 0), 0);
  const activeWeeks   = weeklySummary.filter(w => (w.totalReleased || 0) > 0).length;
  const avgPerWeek    = activeWeeks > 0 ? (summary.totalReleases / activeWeeks).toFixed(1) : '0';

  // Sparkline data (last 8 weeks)
  const sparkData = weeklySummary.slice(-8);
  const maxSpark  = Math.max(1, ...sparkData.map(w => w.totalReleased || 0));

  const sparkBars = sparkData.map(w => {
    const h = Math.max(2, ((w.totalReleased || 0) / maxSpark) * 80);
    const label = (() => { try { return new Date(w.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return w.weekStart || ''; } })();
    return { h, v: w.totalReleased || 0, label };
  });

  const weekRows = weeklySummary.map(wk => {
    const lecturers = Object.values(wk.byLecturer || {});
    if (!lecturers.length) return `<tr><td class="mono">${wk.weekStart || '—'}</td><td>—</td><td class="num">0</td><td class="num">0</td><td class="num">—</td></tr>`;
    const wkLabel = (() => { try { return new Date(wk.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return wk.weekStart || '—'; } })();
    return `
      <tr class="group-row"><td colspan="5">${wkLabel}<span class="grp-count">${lecturers.length} lecturer${lecturers.length !== 1 ? 's' : ''}</span></td></tr>
      ${lecturers.map(l => `<tr>
        <td></td>
        <td style="font-family:var(--serif);font-weight:600;color:var(--navy)">${l.lecturerName || '—'}</td>
        <td class="num">${l.totalReleased || 0}</td>
        <td class="num">${l.totalQuantity || 0}</td>
        <td class="num muted">${totalQty ? (((l.totalQuantity || 0) / totalQty) * 100).toFixed(1) + '%' : '—'}</td>
      </tr>`).join('')}
      <tr style="background:rgba(232,225,200,0.35)">
        <td colspan="2" style="text-align:right;padding-right:13px;font-style:italic;color:var(--ink-2);font-family:var(--serif)">Week subtotal</td>
        <td class="num" style="font-weight:600;color:var(--navy)">${wk.totalReleased || 0}</td>
        <td class="num" style="font-weight:600;color:var(--navy)">${wk.totalQuantity || 0}</td>
        <td class="num" style="font-weight:600;color:var(--navy)">${totalQty ? (((wk.totalQuantity || 0) / totalQty) * 100).toFixed(1) + '%' : '—'}</td>
      </tr>`;
  }).join('');

  const body = pageHtml(`
    ${letterheadHtml(itsLogoUrl)}
    <div class="title-block">
      <div class="title-eyebrow">Inventory &amp; Lending · Weekly Aggregate</div>
      <h1 class="title-h1">Weekly Release Summary</h1>
      <p class="title-deck">Releases aggregated by ISO calendar week, broken down per lecturer, suitable for laboratory operations review and capacity planning.</p>
    </div>
    ${metaHtml([
      { label: 'Document ID',    value: docId, mono: true },
      { label: 'Period',         value: period },
      { label: 'Lecturer Scope', value: 'All lecturers' },
      { label: 'Issued by',      value: admin?.email || 'admin@its.ac.id' },
    ])}
    <div class="section" style="margin-top:4px">
      ${sectionHtml('01', 'Period Totals')}
      ${kpiHtml([
        { label: 'Weeks Reported',  value: activeWeeks,                   sub: `of ${weeklySummary.length} in window` },
        { label: 'Total Releases',  value: summary.totalReleases || 0 },
        { label: 'Total Quantity',  value: totalQty,                      unit: 'units' },
        { label: 'Avg. per Week',   value: avgPerWeek,                    sub: 'releases / active week' },
      ])}
    </div>
    <div class="section">
      ${sectionHtml('02', 'Release Volume by Week', 'Units released')}
      <div class="spark">
        ${sparkBars.map(b => `<div class="col"><div class="v">${b.v}</div><div class="b" style="height:${b.h}%"></div></div>`).join('')}
      </div>
      <div class="spark-labels">
        ${sparkBars.map(b => `<div class="l">${b.label}</div>`).join('')}
      </div>
    </div>
    <div class="section">
      ${sectionHtml('03', 'Weekly Breakdown by Lecturer')}
      <table class="r">
        <thead><tr>
          <th style="width:120px">Week Starting</th>
          <th>Lecturer</th>
          <th class="num" style="width:80px">Releases</th>
          <th class="num" style="width:80px">Total Qty</th>
          <th class="num" style="width:100px">Share of Period</th>
        </tr></thead>
        <tbody>
          ${weekRows}
          <tr class="total-row">
            <td colspan="2" style="text-align:right;padding-right:13px">Period total</td>
            <td class="num">${summary.totalReleases || 0}</td>
            <td class="num">${totalQty}</td>
            <td class="num">100.0%</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="note"><strong>Methodology.</strong> Weeks are aligned to ISO-8601, starting Monday. A release is counted in the week of its issuance, irrespective of the return date. Lecturer attribution follows the request's approving custodian at the moment of release.</div>
    ${signaturesHtml('Surabaya', new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
      { name: admin?.name || 'System Administrator', role: 'Laboratory Administrator', nip: '' },
      { name: 'Head of Laboratory', role: 'Head of Laboratory', nip: '' }
    )}
    ${footerHtml(docId, '1', '1', now)}
  `);

  openPrint('Weekly Release Summary — Equimon', body);
}

/* ══════════════════════════════════════════════════════════════════════════
   3. Inventory Changes Report
   ══════════════════════════════════════════════════════════════════════════ */
const INV_ACTION_LABEL = {
  added:            'Added',
  deleted:          'Deleted',
  quantity_changed: 'Qty Changed',
  published:        'Published',
  unpublished:      'Unpublished',
};

function invDetails(r) {
  if (r.action === 'added')            return `Initial qty: ${r.newQuantity ?? '—'}`;
  if (r.action === 'deleted')          return `Had qty: ${r.previousQuantity ?? '—'}`;
  if (r.action === 'quantity_changed') return `${r.previousQuantity ?? '—'} → ${r.newQuantity ?? '—'}`;
  if (r.action === 'published')        return 'Visible to students';
  if (r.action === 'unpublished')      return 'Hidden from students';
  return '—';
}

function invBadgeCls(action) {
  if (action === 'added')            return 'b-ok';
  if (action === 'deleted')          return 'b-bad';
  if (action === 'quantity_changed') return 'b-warn';
  if (action === 'published')        return 'b-navy';
  return 'b-mute';
}

export function printInventoryChangesReport(records, inventorySummary, { startDate, endDate } = {}, admin = {}) {
  const period = `${startDate || 'Start'} – ${endDate || 'Today'}`;
  const docId  = `EQM-INV-${dateTag().replace(/-/g, '')}-I`;
  const now    = genTimestamp();

  const tableRows = records.map((r, i) => `<tr>
    <td class="num muted" style="width:30px">${i + 1}</td>
    <td class="mono">${fmtDT(r.createdAt)}</td>
    <td style="font-family:var(--serif);font-weight:600;color:var(--navy)">${r.equipmentName || '—'}</td>
    <td class="muted">${r.category || '—'}</td>
    <td><span class="badge ${invBadgeCls(r.action)}">${INV_ACTION_LABEL[r.action] || r.action || '—'}</span></td>
    <td>${invDetails(r)}</td>
    <td>${r.performedByName || '—'}</td>
  </tr>`).join('');

  const body = pageHtml(`
    ${letterheadHtml(itsLogoUrl)}
    <div class="title-block">
      <div class="title-eyebrow">Inventory Catalogue · Mutation Log</div>
      <h1 class="title-h1">Inventory Changes Report</h1>
      <p class="title-deck">All catalogue mutations — additions, removals, quantity changes, and publish/unpublish actions — with the actor responsible for each change.</p>
    </div>
    ${metaHtml([
      { label: 'Document ID',  value: docId, mono: true },
      { label: 'Period',       value: period },
      { label: 'Total Events', value: String(records.length) },
      { label: 'Issued by',    value: admin?.email || 'admin@its.ac.id' },
    ])}
    <div class="section" style="margin-top:4px">
      ${sectionHtml('01', 'At-a-glance')}
      ${kpiHtml([
        { label: 'Items Added',    value: inventorySummary.totalAdded           || 0 },
        { label: 'Items Deleted',  value: inventorySummary.totalDeleted         || 0 },
        { label: 'Qty Changes',    value: inventorySummary.totalQuantityChanges || 0 },
        { label: 'Pub/Unpub',      value: (inventorySummary.totalPublished || 0) + (inventorySummary.totalUnpublished || 0) },
      ])}
    </div>
    <div class="section">
      ${sectionHtml('02', 'Mutation Ledger', `${records.length} events`)}
      <table class="r">
        <thead><tr>
          <th class="num" style="width:30px">#</th>
          <th style="width:120px">Date &amp; Time</th>
          <th>Equipment</th>
          <th style="width:100px">Category</th>
          <th style="width:90px">Action</th>
          <th>Details</th>
          <th style="width:110px">Done By</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
    ${signaturesHtml('Surabaya', new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
      { name: admin?.name || 'System Administrator', role: 'Laboratory Administrator', nip: '' },
      { name: 'Head of Laboratory', role: 'Head of Laboratory', nip: '' }
    )}
    ${footerHtml(docId, '1', '1', now)}
  `);

  openPrint('Inventory Changes Report — Equimon', body);
}

/* ══════════════════════════════════════════════════════════════════════════
   4. Borrow Requests Report
   ══════════════════════════════════════════════════════════════════════════ */
export function printBorrowRequestsReport(records, admin = {}) {
  const docId = `EQM-BRW-${dateTag().replace(/-/g, '')}-B`;
  const now   = genTimestamp();

  const tableRows = records.map((r, i) => {
    const st = r.status || '';
    const stCls = st === 'returned' ? 'b-ok' : ['rejected'].includes(st) ? 'b-bad' : st.startsWith('pending') ? 'b-warn' : 'b-navy';
    return `<tr>
      <td class="num muted">${i + 1}</td>
      <td style="font-family:var(--serif);font-weight:600;color:var(--navy)">${r.borrower_name || '—'}</td>
      <td class="mono muted">${r.student_id || '—'}</td>
      <td>${r.equipment_name || r.equipment?.name || '—'}</td>
      <td class="num">${r.quantity || '—'}</td>
      <td class="mono">${fmtDate(r.borrow_date)}</td>
      <td class="mono">${fmtDate(r.return_date)}</td>
      <td><span class="badge ${stCls}">${st.replace(/_/g, ' ')}</span></td>
    </tr>`;
  }).join('');

  const body = pageHtml(`
    ${letterheadHtml(itsLogoUrl)}
    <div class="title-block">
      <div class="title-eyebrow">Borrow Lifecycle · Complete Listing</div>
      <h1 class="title-h1">Borrow Request Report</h1>
      <p class="title-deck">A complete listing of all equipment borrow requests, including borrower details, equipment, loan period, and current lifecycle status.</p>
    </div>
    ${metaHtml([
      { label: 'Document ID',    value: docId, mono: true },
      { label: 'Total Records',  value: String(records.length) },
      { label: 'Generated',      value: now },
      { label: 'Issued by',      value: admin?.email || 'admin@its.ac.id' },
    ])}
    <div class="section">
      ${sectionHtml('01', 'All Borrow Requests', `${records.length} records`)}
      <table class="r">
        <thead><tr>
          <th class="num" style="width:30px">#</th>
          <th>Borrower</th>
          <th style="width:90px">Student ID</th>
          <th>Equipment</th>
          <th class="num" style="width:40px">Qty</th>
          <th style="width:90px">Borrow Date</th>
          <th style="width:90px">Return Date</th>
          <th style="width:90px">Status</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
    ${footerHtml(docId, '1', '1', now)}
  `);

  openPrint('Borrow Request Report — Equimon', body);
}
