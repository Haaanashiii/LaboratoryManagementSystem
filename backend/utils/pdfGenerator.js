/**
 * PDF Generator — Borrow Request
 * Uses pdfkit (already in dependencies) to produce a clean A4 form document
 * that mirrors the on-screen BorrowRequestFormView layout.
 */
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const BRAND_BLUE = '#2563EB';
const BRAND_DARK = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#CBD5E1';
const BG_SECTION = '#F8FAFC';
const BADGE_PENDING_BG = '#FEF9C3';
const BADGE_APPROVED_BG = '#DCFCE7';
const BADGE_REJECTED_BG = '#FEE2E2';
const BADGE_PENDING_FG = '#854D0E';
const BADGE_APPROVED_FG = '#166534';
const BADGE_REJECTED_FG = '#991B1B';

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo-its.jpg');

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  pending_lecturer: 'Pending Lecturer',
  pending_head: 'Pending Head',
  head_approved: 'Head Approved',
  ready_pickup: 'Ready for Pickup',
  borrowed: 'Borrowed',
  returned: 'Returned',
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

/**
 * Draw a rounded rectangle (PDFKit helper)
 */
const roundRect = (doc, x, y, w, h, r) => {
  doc
    .moveTo(x + r, y)
    .lineTo(x + w - r, y)
    .quadraticCurveTo(x + w, y, x + w, y + r)
    .lineTo(x + w, y + h - r)
    .quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    .lineTo(x + r, y + h)
    .quadraticCurveTo(x, y + h, x, y + h - r)
    .lineTo(x, y + r)
    .quadraticCurveTo(x, y, x + r, y)
    .closePath();
};

/**
 * Draw a labelled field row inside a section
 */
const drawField = (doc, label, value, x, y, w, labelWidth = 140) => {
  const val = value || '—';
  doc
    .fontSize(8)
    .fillColor(MUTED)
    .text(label, x, y, { width: labelWidth, lineBreak: false });

  doc
    .fontSize(9)
    .fillColor(BRAND_DARK)
    .font('Helvetica-Bold')
    .text(val, x + labelWidth, y, { width: w - labelWidth, lineBreak: false });

  doc.font('Helvetica');
  return y + 18;
};

/**
 * Draw a section card
 * Returns the y position after the card.
 */
const drawSection = (doc, title, fields, x, y, w) => {
  const rowH = 18;
  const paddingV = 14;
  const paddingH = 14;
  const innerW = w - paddingH * 2;
  const cardH = paddingV * 2 + fields.length * rowH + 4;

  // Card background
  roundRect(doc, x, y, w, cardH, 6);
  doc.fillColor(BG_SECTION).fill();

  // Card border
  roundRect(doc, x, y, w, cardH, 6);
  doc.strokeColor(BORDER).lineWidth(0.5).stroke();

  // Section title
  doc
    .fontSize(7.5)
    .fillColor(MUTED)
    .font('Helvetica-Bold')
    .text(title.toUpperCase(), x + paddingH, y + paddingV - 4, { width: innerW });

  let curY = y + paddingV + 10;
  for (const { label, value } of fields) {
    curY = drawField(doc, label, value, x + paddingH, curY, innerW);
  }

  doc.font('Helvetica');
  return y + cardH + 10;
};

/**
 * Generate a PDF buffer for a borrow request.
 *
 * @param {object} request    - Mongoose BorrowRequest document (lean or plain)
 * @param {object} printedBy  - { name, email, role } of the user generating the PDF
 * @returns {Promise<Buffer>}
 */
const generateBorrowRequestPdf = (request, printedBy = null) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const margin = 40;
    const contentW = pageW - margin * 2;

    // ── INSTITUTIONAL HEADER ─────────────────────────────────────────────
    const logoSize = 64;
    const logoX = margin;
    const logoY = margin - 8;

    // Try to draw logo; silently skip if missing
    try {
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, logoX, logoY, { width: logoSize, height: logoSize });
      }
    } catch (_) {}

    const textX = logoX + logoSize + 14;
    const textW = contentW - logoSize - 14;

    doc
      .fontSize(13)
      .fillColor(BRAND_DARK)
      .font('Helvetica-Bold')
      .text('INSTITUT TEKNOLOGI SEPULUH NOPEMBER', textX, logoY + 4, { width: textW });

    doc
      .fontSize(9)
      .fillColor(MUTED)
      .font('Helvetica')
      .text('Laboratory Management System', textX, logoY + 22, { width: textW });

    doc
      .fontSize(8)
      .fillColor(MUTED)
      .text('Jl. Arief Rahman Hakim No.100, Sukolilo, Surabaya 60111', textX, logoY + 36, { width: textW });

    doc
      .fontSize(8)
      .fillColor(MUTED)
      .text('Telp. (031) 5994251  |  www.its.ac.id', textX, logoY + 48, { width: textW });

    // Thick rule under header
    const ruleY = logoY + logoSize + 8;
    doc
      .moveTo(margin, ruleY)
      .lineTo(pageW - margin, ruleY)
      .strokeColor(BRAND_DARK)
      .lineWidth(2)
      .stroke();

    doc
      .moveTo(margin, ruleY + 3.5)
      .lineTo(pageW - margin, ruleY + 3.5)
      .strokeColor(BRAND_DARK)
      .lineWidth(0.5)
      .stroke();

    // ── DOCUMENT TITLE BAND ───────────────────────────────────────────────
    const titleBandY = ruleY + 10;
    const titleBandH = 26;

    doc
      .rect(margin, titleBandY, contentW, titleBandH)
      .fillColor('#EFF6FF')
      .fill();

    roundRect(doc, margin, titleBandY, contentW, titleBandH, 4);
    doc.strokeColor('#BFDBFE').lineWidth(0.5).stroke();

    doc
      .fontSize(11)
      .fillColor(BRAND_BLUE)
      .font('Helvetica-Bold')
      .text('EQUIPMENT BORROWING REQUEST FORM', margin, titleBandY + 8, {
        width: contentW,
        align: 'center',
      });

    // ── STATUS BADGE + META ROW ───────────────────────────────────────────
    let curY = titleBandY + titleBandH + 10;

    const statusLabel = STATUS_LABELS[request.status] || request.status || 'Pending';
    const badgeBg =
      request.status === 'approved' || request.status === 'head_approved' ? BADGE_APPROVED_BG :
      request.status === 'rejected' ? BADGE_REJECTED_BG :
      BADGE_PENDING_BG;
    const badgeFg =
      request.status === 'approved' || request.status === 'head_approved' ? BADGE_APPROVED_FG :
      request.status === 'rejected' ? BADGE_REJECTED_FG :
      BADGE_PENDING_FG;

    // Meta left: Request ID
    doc
      .fontSize(7.5)
      .fillColor(MUTED)
      .font('Helvetica')
      .text('Request No.', margin, curY, { continued: true })
      .fillColor(BRAND_DARK)
      .font('Helvetica-Bold')
      .text(`  ${request._id || request.id || '—'}`, { lineBreak: false });

    // Status badge right-aligned
    const badgeW = 100;
    const badgeX = pageW - margin - badgeW;
    roundRect(doc, badgeX, curY - 2, badgeW, 16, 4);
    doc.fillColor(badgeBg).fill();
    doc
      .fontSize(7.5)
      .fillColor(badgeFg)
      .font('Helvetica-Bold')
      .text(`Status: ${statusLabel}`, badgeX, curY + 2, { width: badgeW, align: 'center' });

    curY += 14;

    // Generated date
    doc
      .fontSize(7.5)
      .fillColor(MUTED)
      .font('Helvetica')
      .text(
        `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        margin, curY, { width: contentW }
      );

    curY += 16;

    // Divider
    doc
      .moveTo(margin, curY)
      .lineTo(pageW - margin, curY)
      .strokeColor(BORDER)
      .lineWidth(0.5)
      .stroke();

    curY += 12;

    // ── EQUIPMENT IMAGE ──────────────────────────────────────────────────
    const imgPath = (() => {
      const raw = request.equipment?.image || request.equipment_image_path || null;
      if (!raw) return null;
      if (raw.startsWith('/uploads/')) {
        return path.join(__dirname, '..', raw.replace(/^\/uploads\//, 'uploads/'));
      }
      if (path.isAbsolute(raw)) return raw;
      return path.join(__dirname, '..', raw);
    })();

    if (imgPath) {
      try {
        if (fs.existsSync(imgPath)) {
          const imgH = 140;
          roundRect(doc, margin, curY, contentW, imgH, 8);
          doc.fillColor(BG_SECTION).fill();
          roundRect(doc, margin, curY, contentW, imgH, 8);
          doc.strokeColor(BORDER).lineWidth(0.5).stroke();
          doc.image(imgPath, margin + 8, curY + 8, {
            fit: [contentW - 16, imgH - 16],
            align: 'center',
            valign: 'center',
          });
          curY += imgH + 10;
        }
      } catch (_) {
        // skip image silently if unreadable
      }
    }

    // ── STUDENT INFORMATION ──────────────────────────────────────────────
    curY = drawSection(doc, 'Student Information', [
      { label: 'Full Name',   value: request.borrower_name },
      { label: 'Student ID',  value: request.student_id },
      { label: 'Email',       value: request.student_email },
    ], margin, curY, contentW);

    // ── EQUIPMENT INFORMATION ────────────────────────────────────────────
    curY = drawSection(doc, 'Equipment Information', [
      { label: 'Equipment Name',  value: request.equipment_name },
      { label: 'Serial Number',   value: request.serial_number },
      { label: 'Number of Units', value: request.quantity != null ? String(request.quantity) : '—' },
    ], margin, curY, contentW);

    // ── BORROW DETAILS ───────────────────────────────────────────────────
    curY = drawSection(doc, 'Borrow Details', [
      { label: 'Borrow Date',        value: formatDate(request.borrow_date) },
      { label: 'Planned Return Date', value: formatDate(request.return_date) },
      { label: 'Objective / Purpose', value: request.objective || request.purpose },
    ], margin, curY, contentW);

    // ── APPROVAL INFORMATION ─────────────────────────────────────────────
    // Lecturer approval / assignment
    const resolvedLecturerName = request.lecturer?.name || request.lecturer_name;
    if (resolvedLecturerName || request.lecturer_approved_at) {
      const lecturerFields = [
        { label: 'Lecturer', value: resolvedLecturerName || '—' },
      ];
      if (request.lecturer_approved_at) {
        lecturerFields.push({ label: 'Approved At', value: formatDate(request.lecturer_approved_at) });
      } else {
        lecturerFields.push({ label: 'Status', value: 'Pending Approval' });
      }
      if (request.lecturer_remarks) {
        lecturerFields.push({ label: 'Remarks', value: request.lecturer_remarks });
      }
      curY = drawSection(doc, 'Lecturer Approval', lecturerFields, margin, curY, contentW);
    }

    // Head of Lab approval
    if (request.head_approved_at || request.head_of_lab?.name) {
      const headFields = [
        { label: 'Head of Lab', value: request.head_of_lab?.name || '—' },
        { label: 'Approved At', value: formatDate(request.head_approved_at) },
      ];
      if (request.head_remarks) {
        headFields.push({ label: 'Remarks', value: request.head_remarks });
      }
      curY = drawSection(doc, 'Head of Lab Approval', headFields, margin, curY, contentW);
    }

    // Lab assistant / final approval
    if (request.status === 'approved' || request.approved_at) {
      curY = drawSection(doc, 'Approval Information', [
        { label: 'Approved By', value: request.approved_by?.name || '—' },
        { label: 'Approved At', value: formatDate(request.approved_at) },
      ], margin, curY, contentW);
    }

    if (request.status === 'rejected' && (request.rejection_reason || request.rejected_by)) {
      curY = drawSection(doc, 'Rejection Information', [
        { label: 'Rejected By',  value: request.rejected_by?.name || '—' },
        { label: 'Rejected At',  value: formatDate(request.rejected_at) },
        { label: 'Reason',       value: request.rejection_reason },
      ], margin, curY, contentW);
    }

    // ── SIGNATURE AREA ───────────────────────────────────────────────────
    const sigY = Math.max(curY + 10, pageH - 130);
    doc
      .moveTo(margin, sigY)
      .lineTo(pageW - margin, sigY)
      .strokeColor(BORDER)
      .lineWidth(0.5)
      .stroke();

    const sigColW = (contentW - 20) / 3;
    const sigGap = 10;

    const drawSigCol = (x, label, name) => {
      doc
        .moveTo(x, sigY + 52)
        .lineTo(x + sigColW, sigY + 52)
        .strokeColor(MUTED)
        .lineWidth(0.4)
        .stroke();
      doc
        .fontSize(7)
        .fillColor(MUTED)
        .font('Helvetica')
        .text(label, x, sigY + 56, { width: sigColW, align: 'center' });
      doc
        .fontSize(7.5)
        .fillColor(BRAND_DARK)
        .font('Helvetica-Bold')
        .text(name || '', x, sigY + 66, { width: sigColW, align: 'center' });
    };

    drawSigCol(margin, 'Borrower Signature', request.borrower_name);
    drawSigCol(margin + sigColW + sigGap, 'Lecturer Signature', resolvedLecturerName);
    drawSigCol(margin + (sigColW + sigGap) * 2, 'Lab Assistant Signature', request.approved_by?.name);

    // Footer rule
    doc
      .moveTo(margin, pageH - 46)
      .lineTo(pageW - margin, pageH - 46)
      .strokeColor(BORDER)
      .lineWidth(0.5)
      .stroke();

    // Printed by — left side
    if (printedBy) {
      const roleLabel = (printedBy.role || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      doc
        .fontSize(7)
        .fillColor(MUTED)
        .font('Helvetica')
        .text(
          `Printed by: ${printedBy.name || '—'}  (${roleLabel})  —  ${printedBy.email || '—'}`,
          margin,
          pageH - 38,
          { width: contentW / 2 }
        );
    }

    // Timestamp — right side
    doc
      .fontSize(7)
      .fillColor(MUTED)
      .font('Helvetica')
      .text(
        `Printed on: ${new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        margin + contentW / 2,
        pageH - 38,
        { width: contentW / 2, align: 'right' }
      );

    doc
      .fontSize(7)
      .fillColor(MUTED)
      .font('Helvetica')
      .text(
        'This document is system-generated — Institut Teknologi Sepuluh Nopember. Unauthorized alteration is prohibited.',
        margin,
        pageH - 26,
        { width: contentW, align: 'center' }
      );

    doc.end();
  });
};

/**
 * Save PDF to uploads/pdf/ and return the relative path.
 */
const saveBorrowRequestPdf = async (request, printedBy = null) => {
  const uploadDir = path.join(__dirname, '..', 'uploads', 'pdf');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filename = `borrow-request-${request._id || request.id}-${Date.now()}.pdf`;
  const filePath = path.join(uploadDir, filename);
  const buffer = await generateBorrowRequestPdf(request, printedBy);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/pdf/${filename}`;
};

module.exports = { generateBorrowRequestPdf, saveBorrowRequestPdf };
