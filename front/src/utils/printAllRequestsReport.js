const fmt = (v) => {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return '—'; }
};

const statusLabel = (s) => ({
  pending_lecturer: 'Pending Lecturer',
  pending_head:     'Pending Head',
  pending:          'Pending',
  head_approved:    'Head Approved',
  ready_pickup:     'Ready for Pickup',
  borrowed:         'Borrowed',
  returned:         'Returned',
  rejected:         'Rejected',
}[s] || s || '—');

const statusColor = (s) => ({
  pending_lecturer: '#b45309',
  pending_head:     '#b45309',
  pending:          '#b45309',
  head_approved:    '#15803d',
  ready_pickup:     '#7c3aed',
  borrowed:         '#1d4ed8',
  returned:         '#15803d',
  rejected:         '#b91c1c',
}[s] || '#64748b');

const pct = (n, total) => total === 0 ? 0 : Math.round((n / total) * 100);

export function printAllRequestsReport(requests, userName = 'Administrator') {
  const now = new Date();
  const generated = now.toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const total    = requests.length;
  const pending  = requests.filter(r => ['pending_lecturer', 'pending_head', 'pending'].includes(r.status)).length;
  const active   = requests.filter(r => ['head_approved', 'ready_pickup', 'borrowed'].includes(r.status)).length;
  const returned = requests.filter(r => r.status === 'returned').length;
  const rejected = requests.filter(r => r.status === 'rejected').length;

  // Equipment frequency
  const equipFreq = {};
  requests.forEach(r => {
    const k = r.equipment_name || 'Unknown';
    equipFreq[k] = (equipFreq[k] || 0) + (r.quantity || 1);
  });
  const topEquipment = Object.entries(equipFreq).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxEquip = topEquipment[0]?.[1] || 1;

  // Borrower frequency
  const borrowerFreq = {};
  requests.forEach(r => {
    const k = r.borrower_name || 'Unknown';
    borrowerFreq[k] = (borrowerFreq[k] || 0) + 1;
  });
  const topBorrowers = Object.entries(borrowerFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const kpiCards = [
    { label: 'Total Requests',  value: total,    color: '#0b1d51', bg: '#eff6ff' },
    { label: 'Pending Review',  value: pending,  color: '#b45309', bg: '#fffbeb' },
    { label: 'Active / Approved', value: active, color: '#1d4ed8', bg: '#eff6ff' },
    { label: 'Returned',        value: returned, color: '#15803d', bg: '#f0fdf4' },
    { label: 'Rejected',        value: rejected, color: '#b91c1c', bg: '#fef2f2' },
  ].map(c => `
    <div style="flex:1;min-width:100px;background:${c.bg};border:1px solid ${c.color}22;border-radius:8px;padding:14px 16px;text-align:center;">
      <div style="font-size:28px;font-weight:800;color:${c.color};font-family:Georgia,serif;line-height:1;">${c.value}</div>
      <div style="font-size:10px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:0.08em;">${c.label}</div>
    </div>`).join('');

  const barRows = topEquipment.map(([name, qty]) => `
    <tr>
      <td style="padding:6px 8px;font-size:11px;color:#1e293b;white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis;">${name}</td>
      <td style="padding:6px 8px;">
        <div style="background:#e2e8f0;border-radius:3px;height:12px;width:100%;">
          <div style="background:#0b1d51;border-radius:3px;height:12px;width:${pct(qty, maxEquip)}%;"></div>
        </div>
      </td>
      <td style="padding:6px 8px;font-size:11px;font-weight:700;color:#0b1d51;text-align:right;white-space:nowrap;">${qty} units</td>
    </tr>`).join('');

  const borrowerRows = topBorrowers.map(([name, count], i) => `
    <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#fff'};">
      <td style="padding:5px 8px;font-size:11px;color:#1e293b;">${i + 1}. ${name}</td>
      <td style="padding:5px 8px;font-size:11px;font-weight:700;color:#0b1d51;text-align:right;">${count} request${count !== 1 ? 's' : ''}</td>
    </tr>`).join('');

  const requestRows = requests.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#fff'};">
      <td style="padding:5px 8px;font-size:10px;color:#64748b;white-space:nowrap;">${fmt(r.created_date || r.createdAt)}</td>
      <td style="padding:5px 8px;font-size:11px;font-weight:600;color:#1e293b;">${r.equipment_name || '—'}</td>
      <td style="padding:5px 8px;font-size:10px;color:#475569;text-align:center;">${r.quantity || 1}</td>
      <td style="padding:5px 8px;font-size:11px;color:#1e293b;">${r.borrower_name || '—'}</td>
      <td style="padding:5px 8px;font-size:10px;color:#64748b;">${r.student_email || r.borrower_email || '—'}</td>
      <td style="padding:5px 8px;font-size:10px;white-space:nowrap;">${fmt(r.borrow_date)}</td>
      <td style="padding:5px 8px;font-size:10px;white-space:nowrap;">${fmt(r.return_date)}</td>
      <td style="padding:5px 8px;">
        <span style="font-size:9px;font-weight:700;color:${statusColor(r.status)};text-transform:uppercase;letter-spacing:0.05em;">${statusLabel(r.status)}</span>
      </td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>All Requests Report — ${now.toLocaleDateString()}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Arial, sans-serif; color: #1e293b; background: #fff; font-size: 12px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
  }
  .page { padding: 28px 32px; max-width: 1000px; margin: 0 auto; }
  .letterhead { border-bottom: 3px solid #0b1d51; padding-bottom: 14px; margin-bottom: 20px; display: flex; align-items: flex-start; justify-content: space-between; }
  .lh-left h1 { font-size: 14px; font-weight: 800; color: #0b1d51; text-transform: uppercase; letter-spacing: 0.05em; }
  .lh-left p  { font-size: 10px; color: #64748b; margin-top: 2px; }
  .lh-right   { text-align: right; font-size: 10px; color: #64748b; }
  .report-title { text-align: center; margin-bottom: 20px; }
  .report-title h2 { font-size: 16px; font-weight: 800; color: #0b1d51; text-transform: uppercase; letter-spacing: 0.12em; }
  .report-title p  { font-size: 10px; color: #94a3b8; margin-top: 3px; }
  .kpi-row { display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap; }
  .section-head { font-size: 10px; font-weight: 700; color: #0b1d51; text-transform: uppercase; letter-spacing: 0.12em; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; margin-top: 20px; }
  table { width: 100%; border-collapse: collapse; }
  thead th { background: #0b1d51; color: #fff; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 7px 8px; text-align: left; }
  .analytics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 8px; }
  .print-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 20px; background: #0b1d51; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; margin-bottom: 20px; }
</style>
</head>
<body>
<div class="page">

  <button class="print-btn no-print" onclick="window.print()">🖨 Print / Save as PDF</button>

  <!-- Letterhead -->
  <div class="letterhead">
    <div class="lh-left">
      <h1>Institut Teknologi Sepuluh Nopember</h1>
      <p>Laboratory Management System · Equimon</p>
      <p>Jl. Arief Rahman Hakim No.100, Sukolilo, Surabaya 60111</p>
    </div>
    <div class="lh-right">
      <div style="font-weight:700;color:#0b1d51;">Generated by</div>
      <div>${userName}</div>
      <div style="margin-top:4px;">${generated}</div>
    </div>
  </div>

  <!-- Report title -->
  <div class="report-title">
    <h2>Equipment Borrow Requests — Statistical Report</h2>
    <p>Comprehensive overview of all borrow requests across all statuses</p>
  </div>

  <!-- KPI Cards -->
  <div class="kpi-row">${kpiCards}</div>

  <!-- Status breakdown bar (simple) -->
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:4px;">
    <div style="font-size:10px;font-weight:700;color:#0b1d51;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Status Distribution</div>
    <div style="display:flex;height:16px;border-radius:4px;overflow:hidden;background:#e2e8f0;">
      ${total > 0 ? [
        { w: pct(pending, total),  c: '#f59e0b', l: 'Pending' },
        { w: pct(active, total),   c: '#3b82f6', l: 'Active'  },
        { w: pct(returned, total), c: '#22c55e', l: 'Returned'},
        { w: pct(rejected, total), c: '#ef4444', l: 'Rejected'},
      ].filter(s => s.w > 0).map(s => `<div style="width:${s.w}%;background:${s.c};height:100%;"></div>`).join('')
        : '<div style="width:100%;background:#cbd5e1;height:100%;"></div>'}
    </div>
    <div style="display:flex;gap:16px;margin-top:8px;flex-wrap:wrap;">
      ${[
        { label:'Pending',  color:'#f59e0b', n: pending  },
        { label:'Active',   color:'#3b82f6', n: active   },
        { label:'Returned', color:'#22c55e', n: returned },
        { label:'Rejected', color:'#ef4444', n: rejected },
      ].map(s => `<div style="display:flex;align-items:center;gap:5px;font-size:10px;color:#64748b;">
        <span style="width:10px;height:10px;border-radius:2px;background:${s.color};display:inline-block;"></span>
        ${s.label} (${pct(s.n, total)}%)
      </div>`).join('')}
    </div>
  </div>

  <!-- Analytics grid -->
  <div class="analytics-grid">
    <!-- Top Equipment -->
    <div>
      <div class="section-head">Top Equipment by Units Borrowed</div>
      <table>
        <tbody>${barRows || '<tr><td colspan="3" style="padding:12px;text-align:center;color:#94a3b8;font-size:11px;">No data</td></tr>'}</tbody>
      </table>
    </div>
    <!-- Top Borrowers -->
    <div>
      <div class="section-head">Most Active Borrowers</div>
      <table>
        <tbody>${borrowerRows || '<tr><td colspan="2" style="padding:12px;text-align:center;color:#94a3b8;font-size:11px;">No data</td></tr>'}</tbody>
      </table>
    </div>
  </div>

  <!-- Full request list -->
  <div class="section-head" style="margin-top:24px;">Complete Request Log (${total} records)</div>
  <table>
    <thead>
      <tr>
        <th>Submitted</th>
        <th>Equipment</th>
        <th style="text-align:center;">Qty</th>
        <th>Borrower</th>
        <th>Email</th>
        <th>Borrow Date</th>
        <th>Return Date</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${requestRows || '<tr><td colspan="8" style="text-align:center;padding:24px;color:#94a3b8;">No requests found</td></tr>'}
    </tbody>
  </table>

  <!-- Footer -->
  <div style="margin-top:24px;border-top:1px solid #e2e8f0;padding-top:10px;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8;">
    <span>Equimon · Laboratory Management System · Institut Teknologi Sepuluh Nopember</span>
    <span>Report generated: ${generated}</span>
  </div>

</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1100,height=850');
  if (!win) { alert('Please allow popups to generate the report.'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 800);
}
