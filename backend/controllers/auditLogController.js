const AuditLog = require('../models/AuditLog');
const PDFDocument = require('pdfkit');

const MAX_EXPORT_RECORDS = 5000;

const buildAuditLogQuery = (params = {}) => {
  const {
    user,
    action_type,
    status,
    start_date,
    end_date,
  } = params;

  const query = {};

  if (user) {
    query.$or = [{ user }, { user_email: { $regex: user, $options: 'i' } }];
  }

  if (action_type) {
    query.action_type = action_type;
  }

  if (status) {
    query.status = status;
  }

  if (start_date || end_date) {
    query.createdAt = {};
    if (start_date) query.createdAt.$gte = new Date(start_date);
    if (end_date) query.createdAt.$lte = new Date(end_date);
  }

  return query;
};

const asDisplayText = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

const normalizeExportDateFormat = (value) => {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'numeric') return 'numeric';
  if (normalized === 'long') return 'long';
  return 'short';
};

const getDayKey = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Invalid Date' : date.toISOString().slice(0, 10);
};

const formatDayLabel = (dayKey, format = 'short') => {
  if (dayKey === 'Invalid Date') return 'Invalid Date';
  const date = new Date(`${dayKey}T00:00:00.000Z`);

  if (format === 'numeric') {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  if (format === 'long') {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const drawTableHeader = (doc, cols, startX, rowHeight) => {
  const headerY = doc.y;
  const totalWidth = cols.reduce((sum, col) => sum + col.width, 0);

  doc
    .rect(startX, headerY, totalWidth, rowHeight)
    .fillColor('#F1F5F9')
    .fill();

  doc.fillColor('#334155').font('Helvetica-Bold').fontSize(10);
  let x = startX;
  cols.forEach((col) => {
    doc.text(col.label, x + 4, headerY + 7, {
      width: col.width - 8,
      align: col.align || 'left',
      ellipsis: true,
    });
    x += col.width;
  });

  doc
    .lineWidth(0.8)
    .strokeColor('#CBD5E1')
    .rect(startX, headerY, totalWidth, rowHeight)
    .stroke();

  doc.y = headerY + rowHeight;
};

// @desc    Get audit logs with filters
// @route   GET /api/admin/audit-logs
// @access  Private (Admin)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const {
      user,
      action_type,
      status,
      start_date,
      end_date,
      page = 1,
      limit = 20
    } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const query = buildAuditLogQuery({
      user,
      action_type,
      status,
      start_date,
      end_date,
    });

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('user', 'name email role')
        .sort('-createdAt')
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize),
      AuditLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      meta: {
        page: pageNumber,
        limit: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize)
      },
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export filtered audit logs to PDF
// @route   GET /api/audit-logs/export/pdf
// @access  Private (Admin)
exports.exportAuditLogsPdf = async (req, res, next) => {
  try {
    const {
      user,
      action_type,
      status,
      start_date,
      end_date,
      limit,
      date_format,
    } = req.query;
    const exportDateFormat = normalizeExportDateFormat(date_format);

    const requestedLimit = parseInt(limit, 10);
    const safeLimit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), MAX_EXPORT_RECORDS)
      : MAX_EXPORT_RECORDS;

    const query = buildAuditLogQuery({
      user,
      action_type,
      status,
      start_date,
      end_date,
    });

    const logs = await AuditLog.find(query)
      .populate('user', 'email')
      .sort('-createdAt')
      .limit(safeLimit)
      .lean();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.pdf"');

    const doc = new PDFDocument({
      size: 'A4',
      margin: 36,
      bufferPages: true,
    });

    doc.pipe(res);

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#0F172A').text('Audit Logs Export');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(10).fillColor('#475569').text(`Date generated: ${new Date().toLocaleString()}`);
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(10).fillColor('#475569').text(`Records: ${logs.length}${logs.length >= MAX_EXPORT_RECORDS ? ` (capped at ${MAX_EXPORT_RECORDS})` : ''}`);
    doc.moveDown(0.4);

    const appliedFilters = [
      user ? `User: ${user}` : null,
      action_type ? `Action: ${action_type}` : null,
      status ? `Status: ${status}` : null,
      start_date ? `Start: ${start_date}` : null,
      end_date ? `End: ${end_date}` : null,
    ].filter(Boolean);

    doc.font('Helvetica').fontSize(9).fillColor('#64748B').text(
      `Applied filters: ${appliedFilters.length ? appliedFilters.join(' | ') : 'None'}`
    );
    doc.font('Helvetica').fontSize(9).fillColor('#64748B').text(`Date format: ${exportDateFormat}`);
    doc.moveDown(0.8);

    const tableStartX = doc.page.margins.left;
    const rowHeight = 24;
    const columns = [
      { key: 'user', label: 'User', width: 160 },
      { key: 'action', label: 'Action', width: 150 },
      { key: 'ip', label: 'IP Address', width: 120 },
      { key: 'timestamp', label: 'Timestamp', width: 125 },
    ];
    const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);

    const logsByDay = new Map();
    logs.forEach((log) => {
      const dayKey = getDayKey(log.createdAt);
      if (!logsByDay.has(dayKey)) {
        logsByDay.set(dayKey, []);
      }
      logsByDay.get(dayKey).push(log);
    });

    const pageBottomLimit = doc.page.height - doc.page.margins.bottom;

    Array.from(logsByDay.entries()).forEach(([dayKey, dayLogs], dayIndex) => {
      if (dayIndex > 0) {
        doc.moveDown(0.5);
      }

      if (doc.y + 34 > pageBottomLimit) {
        doc.addPage();
      }

      const dayLabel = formatDayLabel(dayKey, exportDateFormat);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1E293B').text(`Date: ${dayLabel} (${dayLogs.length} record${dayLogs.length === 1 ? '' : 's'})`);
      doc.moveDown(0.2);

      drawTableHeader(doc, columns, tableStartX, rowHeight);
      doc.font('Helvetica').fontSize(9).fillColor('#0F172A');

      dayLogs.forEach((log, rowIndex) => {
        const nextRowBottom = doc.y + rowHeight;
        if (nextRowBottom > pageBottomLimit) {
          doc.addPage();
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#334155').text(`Date: ${dayLabel} (continued)`);
          doc.moveDown(0.2);
          drawTableHeader(doc, columns, tableStartX, rowHeight);
          doc.font('Helvetica').fontSize(9).fillColor('#0F172A');
        }

        const rowY = doc.y;
        if (rowIndex % 2 === 0) {
          doc
            .rect(tableStartX, rowY, tableWidth, rowHeight)
            .fillColor('#F8FAFC')
            .fill();
        }

        doc
          .lineWidth(0.4)
          .strokeColor('#E2E8F0')
          .rect(tableStartX, rowY, tableWidth, rowHeight)
          .stroke();

        const rowData = {
          user: asDisplayText(log.user?.email || log.user_email),
          action: asDisplayText(log.action_type),
          ip: asDisplayText(log.ip_address),
          timestamp: asDisplayText(new Date(log.createdAt).toLocaleString()),
        };

        let x = tableStartX;
        columns.forEach((col) => {
          doc.fillColor('#0F172A').text(rowData[col.key], x + 4, rowY + 7, {
            width: col.width - 8,
            align: 'left',
            ellipsis: true,
          });

          x += col.width;
        });

        doc.y = rowY + rowHeight;
      });
    });

    doc.end();
  } catch (error) {
    next(error);
  }
};
