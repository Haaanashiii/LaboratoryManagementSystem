import ExcelJS from 'exceljs';

// ── Design tokens ──────────────────────────────────────────────────────────────

const NAVY     = 'FF0F2A4A';
const GOLD     = 'FFC8A246';
const WHITE    = 'FFFFFFFF';
const ROW_ODD  = 'FFFFFFFF';
const ROW_EVEN = 'FFF8F8F8';
const TOTAL_BG = 'FFE8EFF6';

const HDR_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
const HDR_FONT = { bold: true, color: { argb: WHITE }, size: 9, name: 'Calibri' };
const HDR_BORDER = { bottom: { style: 'medium', color: { argb: GOLD } } };

function fill(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function rowFill(rowNum) {
  return fill(rowNum % 2 === 0 ? ROW_EVEN : ROW_ODD);
}

function statusStyle(status) {
  const map = {
    returned:         { bg: 'FFdcfce7', fg: 'FF166534' },
    approved:         { bg: 'FFdcfce7', fg: 'FF166534' },
    pending:          { bg: 'FFfef3c7', fg: 'FF92400e' },
    pending_lecturer: { bg: 'FFfef3c7', fg: 'FF92400e' },
    pending_head:     { bg: 'FFfef3c7', fg: 'FF92400e' },
    rejected:         { bg: 'FFfee2e2', fg: 'FF991b1b' },
    borrowed:         { bg: 'FFdbeafe', fg: 'FF1e40af' },
    ready_pickup:     { bg: 'FFdbeafe', fg: 'FF1e40af' },
    head_approved:    { bg: 'FFfef9c3', fg: 'FF854d0e' },
  };
  const s = map[status] || { bg: 'FFf3f4f6', fg: 'FF374151' };
  return { fill: fill(s.bg), font: { bold: true, size: 9, color: { argb: s.fg }, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'middle' } };
}

function actionStyle(action) {
  const map = {
    added:            { bg: 'FFdcfce7', fg: 'FF166534' },
    deleted:          { bg: 'FFfee2e2', fg: 'FF991b1b' },
    quantity_changed: { bg: 'FFfef3c7', fg: 'FF92400e' },
    published:        { bg: 'FFdbeafe', fg: 'FF1e40af' },
    unpublished:      { bg: 'FFf3f4f6', fg: 'FF374151' },
  };
  const s = map[action] || { bg: 'FFf3f4f6', fg: 'FF374151' };
  return { fill: fill(s.bg), font: { bold: true, size: 9, color: { argb: s.fg }, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'middle' } };
}

function applyHeaders(ws, headers) {
  ws.columns = headers.map(h => ({ key: h.key, width: h.width }));
  const row = ws.getRow(1);
  headers.forEach((h, i) => {
    const cell = row.getCell(i + 1);
    cell.value     = h.label.toUpperCase();
    cell.fill      = HDR_FILL;
    cell.font      = HDR_FONT;
    cell.border    = HDR_BORDER;
    cell.alignment = { vertical: 'middle', horizontal: h.align || 'left', wrapText: false };
  });
  row.height = 22;
}

function addTotalRow(ws, label, colCount, numCols = {}) {
  const row = ws.addRow([]);
  row.getCell(1).value = label;
  row.getCell(1).font  = { bold: true, italic: true, size: 9, color: { argb: NAVY }, name: 'Calibri' };
  Object.entries(numCols).forEach(([col, val]) => {
    const cell = row.getCell(Number(col));
    cell.value = val;
    cell.font  = { bold: true, size: 9, color: { argb: NAVY }, name: 'Calibri' };
    cell.alignment = { horizontal: 'center' };
  });
  row.eachCell(c => { c.fill = fill(TOTAL_BG); });
  row.height = 18;
  return row;
}

async function download(wb, filename) {
  const buf  = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function newWb() {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'Equimon LMS';
  wb.created  = new Date();
  return wb;
}

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? '—' : d.toLocaleDateString();
};

const fmtDT = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d)) return '—';
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const dateTag = () => new Date().toISOString().slice(0, 10);

const INV_LABEL = { added: 'Added', deleted: 'Deleted', quantity_changed: 'Qty Changed', published: 'Published', unpublished: 'Unpublished' };
const invDetails = (r) => {
  if (r.action === 'added')            return `Initial qty: ${r.newQuantity ?? '—'}`;
  if (r.action === 'deleted')          return `Had qty: ${r.previousQuantity ?? '—'}`;
  if (r.action === 'quantity_changed') return `${r.previousQuantity ?? '—'} → ${r.newQuantity ?? '—'}`;
  if (r.action === 'published')        return 'Visible to students';
  if (r.action === 'unpublished')      return 'Hidden from students';
  return '—';
};

// ── 1. Full Release Report ─────────────────────────────────────────────────────

export async function exportXlsAll(records) {
  const wb = newWb();
  const ws = wb.addWorksheet('Lecturer Releases');

  const headers = [
    { label: 'Lecturer Name',   key: 'lecturerName',      width: 22 },
    { label: 'Lecturer Email',  key: 'lecturerEmail',     width: 28 },
    { label: 'Student Name',    key: 'studentName',       width: 22 },
    { label: 'Student ID',      key: 'studentId',         width: 16 },
    { label: 'Student Email',   key: 'studentEmail',      width: 28 },
    { label: 'Equipment',       key: 'equipmentName',     width: 26 },
    { label: 'Category',        key: 'category',          width: 16 },
    { label: 'Qty',             key: 'quantity',          width: 8,  align: 'center' },
    { label: 'Borrow Date',     key: 'borrowDate',        width: 14 },
    { label: 'Return Date',     key: 'returnDate',        width: 14 },
    { label: 'Released At',     key: 'releasedAt',        width: 22 },
    { label: 'Status',          key: 'status',            width: 18, align: 'center' },
  ];

  applyHeaders(ws, headers);

  let totalQty = 0;
  records.forEach((r, i) => {
    const qty = Number(r.quantity) || 0;
    totalQty += qty;
    const row = ws.addRow({
      lecturerName:  r.lecturerName      || '—',
      lecturerEmail: r.lecturerEmail     || '—',
      studentName:   r.studentName       || '—',
      studentId:     r.studentId         || '—',
      studentEmail:  r.studentEmail      || '—',
      equipmentName: r.equipmentName     || '—',
      category:      r.equipmentCategory || '—',
      quantity:      qty,
      borrowDate:    fmtDate(r.borrowDate),
      returnDate:    fmtDate(r.returnDate),
      releasedAt:    fmtDT(r.releasedAt),
      status:        r.status            || '—',
    });
    const bg = rowFill(i + 2);
    row.eachCell((cell, col) => {
      if (col === 12) { Object.assign(cell, statusStyle(r.status)); }
      else { cell.fill = bg; cell.font = { size: 9, name: 'Calibri' }; }
      if (col === 8) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      else cell.alignment = { vertical: 'middle' };
    });
    row.height = 18;
  });

  addTotalRow(ws, `Total · ${records.length} records`, 12, { 8: totalQty });

  await download(wb, `lecturer-releases-${dateTag()}.xlsx`);
}

// ── 2. Weekly Summary ──────────────────────────────────────────────────────────

export async function exportXlsWeekly(weeklySummary) {
  const wb = newWb();
  const ws = wb.addWorksheet('Weekly Summary');

  const headers = [
    { label: 'Week Start',        key: 'weekStart',        width: 16 },
    { label: 'Total Releases',    key: 'totalReleased',    width: 16, align: 'center' },
    { label: 'Total Quantity',    key: 'totalQuantity',    width: 16, align: 'center' },
    { label: 'Lecturer',          key: 'lecturerName',     width: 26 },
    { label: 'Lecturer Releases', key: 'lecturerReleased', width: 18, align: 'center' },
    { label: 'Lecturer Quantity', key: 'lecturerQuantity', width: 18, align: 'center' },
  ];

  applyHeaders(ws, headers);

  let rowIdx = 2;
  weeklySummary.forEach(wk => {
    const lecturers = Object.values(wk.byLecturer || {});
    if (lecturers.length === 0) {
      const row = ws.addRow({ weekStart: wk.weekStart, totalReleased: wk.totalReleased, totalQuantity: wk.totalQuantity });
      row.eachCell(c => { c.fill = rowFill(rowIdx); c.font = { size: 9, name: 'Calibri' }; c.alignment = { vertical: 'middle' }; });
      row.height = 18; rowIdx++;
    } else {
      lecturers.forEach((l, i) => {
        const row = ws.addRow({
          weekStart:        i === 0 ? wk.weekStart     : '',
          totalReleased:    i === 0 ? wk.totalReleased : '',
          totalQuantity:    i === 0 ? wk.totalQuantity : '',
          lecturerName:     l.lecturerName,
          lecturerReleased: l.totalReleased,
          lecturerQuantity: l.totalQuantity,
        });
        const bg = rowFill(rowIdx);
        row.eachCell((c, col) => {
          c.fill = bg; c.font = { size: 9, name: 'Calibri' };
          c.alignment = { vertical: 'middle', horizontal: [2,3,5,6].includes(col) ? 'center' : 'left' };
        });
        row.height = 18; rowIdx++;
      });
    }
  });

  const totalRel = weeklySummary.reduce((s, w) => s + (w.totalReleased || 0), 0);
  const totalQty = weeklySummary.reduce((s, w) => s + (w.totalQuantity || 0), 0);
  addTotalRow(ws, `Total · ${weeklySummary.length} weeks`, 6, { 2: totalRel, 3: totalQty });

  await download(wb, `weekly-summary-${dateTag()}.xlsx`);
}

// ── 3. Inventory Changes ───────────────────────────────────────────────────────

export async function exportXlsInventory(records) {
  const wb = newWb();
  const ws = wb.addWorksheet('Inventory Changes');

  const headers = [
    { label: '#',           key: 'num',       width: 6,  align: 'center' },
    { label: 'Date & Time', key: 'datetime',  width: 22 },
    { label: 'Equipment',   key: 'equipment', width: 26 },
    { label: 'Category',    key: 'category',  width: 16 },
    { label: 'Action',      key: 'action',    width: 16, align: 'center' },
    { label: 'Details',     key: 'details',   width: 28 },
    { label: 'Done By',     key: 'doneBy',    width: 22 },
  ];

  applyHeaders(ws, headers);

  records.forEach((r, i) => {
    const row = ws.addRow({
      num:       i + 1,
      datetime:  fmtDT(r.createdAt),
      equipment: r.equipmentName    || '—',
      category:  r.category         || '—',
      action:    INV_LABEL[r.action] || r.action || '—',
      details:   invDetails(r),
      doneBy:    r.performedByName  || '—',
    });
    const bg = rowFill(i + 2);
    row.eachCell((c, col) => {
      if (col === 5) { Object.assign(c, actionStyle(r.action)); }
      else { c.fill = bg; c.font = { size: 9, name: 'Calibri' }; }
      if (col === 1) c.alignment = { horizontal: 'center', vertical: 'middle' };
      else if (col !== 5) c.alignment = { vertical: 'middle' };
    });
    row.height = 18;
  });

  addTotalRow(ws, `Total · ${records.length} events`, 7);

  await download(wb, `inventory-changes-${dateTag()}.xlsx`);
}

// ── 4. Borrow Requests ─────────────────────────────────────────────────────────

export async function exportXlsBorrow(records) {
  const wb = newWb();
  const ws = wb.addWorksheet('Borrow Requests');

  const headers = [
    { label: '#',            key: 'num',        width: 6,  align: 'center' },
    { label: 'Date',         key: 'date',       width: 14 },
    { label: 'Borrower',     key: 'borrower',   width: 22 },
    { label: 'Email',        key: 'email',      width: 28 },
    { label: 'Equipment',    key: 'equipment',  width: 26 },
    { label: 'Qty',          key: 'qty',        width: 6,  align: 'center' },
    { label: 'Borrow Date',  key: 'borrowDate', width: 14 },
    { label: 'Return Date',  key: 'returnDate', width: 14 },
    { label: 'Status',       key: 'status',     width: 18, align: 'center' },
    { label: 'Submitted',    key: 'submitted',  width: 14 },
  ];

  applyHeaders(ws, headers);

  let totalQty = 0;
  records.forEach((r, i) => {
    const qty = Number(r.quantity) || 0;
    totalQty += qty;
    const row = ws.addRow({
      num:        i + 1,
      date:       fmtDate(r.borrow_date || r.createdAt),
      borrower:   r.borrower_name  || '—',
      email:      r.student_email  || r.borrower_email || '—',
      equipment:  r.equipment_name || r.equipment?.name || '—',
      qty,
      borrowDate: fmtDate(r.borrow_date),
      returnDate: fmtDate(r.return_date),
      status:     r.status         || '—',
      submitted:  fmtDate(r.createdAt),
    });
    const bg = rowFill(i + 2);
    row.eachCell((c, col) => {
      if (col === 9) { Object.assign(c, statusStyle(r.status)); }
      else { c.fill = bg; c.font = { size: 9, name: 'Calibri' }; }
      if (col === 1 || col === 6) c.alignment = { horizontal: 'center', vertical: 'middle' };
      else if (col !== 9) c.alignment = { vertical: 'middle' };
    });
    row.height = 18;
  });

  addTotalRow(ws, `Total · ${records.length} entries`, 10, { 6: totalQty });

  await download(wb, `borrow-requests-${dateTag()}.xlsx`);
}
