const BorrowRequest = require('../models/BorrowRequest');
const EquipmentHistory = require('../models/EquipmentHistory');

const normalizeCondition = (value) => {
  const condition = String(value || '').trim().toLowerCase();

  if (condition === 'damaged') return 'Damaged';
  if (condition === 'lost') return 'Lost';

  // Treat all non-damaged/non-lost return states as good for report summary.
  return 'Good';
};

const parseDateRange = (query, defaults) => {
  const startDate = query.startDate ? new Date(query.startDate) : defaults.startDate;
  const endDate   = query.endDate   ? new Date(query.endDate)   : defaults.endDate;
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate };
};

const getDateRangeError = (startDate, endDate) => {
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 'Invalid date format. Use ISO date values for startDate and endDate.';
  }
  if (startDate > endDate) {
    return 'startDate cannot be after endDate.';
  }
  return null;
};

const buildDefaultDateRange = (type) => {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);

  if (type === 'weekly') {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    startDate.setDate(now.getDate() - diff);
  } else {
    startDate.setDate(1);
  }

  return { startDate, endDate };
};

// @desc    Get student borrowing report
// @route   GET /api/reports/borrowing
// @access  Private (Admin)
exports.getBorrowingReport = async (req, res, next) => {
  try {
    const type = req.query.type === 'weekly' ? 'weekly' : 'monthly';
    const defaults = buildDefaultDateRange(type);

    const { startDate, endDate } = parseDateRange(req.query, defaults);
    const dateError = getDateRangeError(startDate, endDate);
    if (dateError) return res.status(400).json({ success: false, message: dateError });

    const borrowRecords = await BorrowRequest.find({
      status: 'returned',
      actual_return_date: { $gte: startDate, $lte: endDate }
    })
      .populate('student', 'name studentId')
      .populate('equipment', 'name')
      .sort({ actual_return_date: -1 })
      .select('borrower_name equipment_name borrow_date return_date actual_return_date return_condition student equipment');

    const records = borrowRecords.map((record) => {
      const condition = normalizeCondition(record.return_condition);

      return {
        studentName: record.student?.name || record.borrower_name || 'Unknown Student',
        studentId: record.student?.studentId || '',
        itemName: record.equipment?.name || record.equipment_name || 'Unknown Item',
        itemId: record.equipment?._id ? String(record.equipment._id) : '',
        borrowDate: record.borrow_date,
        returnDate: record.actual_return_date || record.return_date,
        condition
      };
    });

    const summary = records.reduce(
      (acc, record) => {
        acc.totalBorrowed += 1;
        if (record.condition === 'Good') acc.good += 1;
        if (record.condition === 'Damaged') acc.damaged += 1;
        if (record.condition === 'Lost') acc.lost += 1;
        return acc;
      },
      { totalBorrowed: 0, good: 0, damaged: 0, lost: 0 }
    );

    return res.json({
      summary,
      records
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get equipment release report grouped by lecturer
// @route   GET /api/reports/lecturer-releases
// @access  Private (Admin)
exports.getLecturerReleasesReport = async (req, res, next) => {
  try {
    const type = req.query.type === 'weekly' ? 'weekly' : 'monthly';
    const defaults = buildDefaultDateRange(type);

    const { startDate, endDate } = parseDateRange(req.query, defaults);
    const dateError = getDateRangeError(startDate, endDate);
    if (dateError) return res.status(400).json({ success: false, message: dateError });

    // Build base query – only requests that have been lecturer-approved (released)
    const baseQuery = {
      lecturer_approved_at: { $gte: startDate, $lte: endDate },
      status: { $in: ['head_approved', 'ready_pickup', 'borrowed', 'returned'] }
    };

    // Optional lecturer filter
    if (req.query.lecturerId) {
      baseQuery.lecturer = req.query.lecturerId;
    }

    const releases = await BorrowRequest.find(baseQuery)
      .populate('student',   'name studentId email')
      .populate('lecturer',  'name email')
      .populate('equipment', 'name category')
      .sort({ lecturer_approved_at: -1 })
      .lean();

    // Build per-record list
    const records = releases.map((r) => ({
      lecturerId:   r.lecturer?._id ? String(r.lecturer._id) : null,
      lecturerName: r.lecturer?.name  || r.lecturer_email || 'Unknown Lecturer',
      lecturerEmail: r.lecturer?.email || r.lecturer_email || '',
      studentName:  r.student?.name   || r.borrower_name  || 'Unknown Student',
      studentId:    r.student?.studentId || '',
      studentEmail: r.student?.email  || r.student_email  || '',
      equipmentName: r.equipment?.name  || r.equipment_name || 'Unknown Equipment',
      equipmentId:  r.equipment?._id   ? String(r.equipment._id) : '',
      equipmentCategory: r.equipment?.category || '',
      quantity:     r.quantity || 1,
      borrowDate:   r.borrow_date,
      returnDate:   r.return_date,
      actualReturnDate: r.actual_return_date || null,
      releasedAt:   r.lecturer_approved_at,
      status:       r.status,
      purpose:      r.purpose || '',
      returnCondition: r.return_condition || null,
      returnTiming:   r.return_timing    || null,
      returnRemarks:  r.return_remarks   || '',
    }));

    // Group by lecturer for summary
    const lecturerMap = {};
    records.forEach((rec) => {
      const key = rec.lecturerId || rec.lecturerName;
      if (!lecturerMap[key]) {
        lecturerMap[key] = {
          lecturerId:    rec.lecturerId,
          lecturerName:  rec.lecturerName,
          lecturerEmail: rec.lecturerEmail,
          totalReleased: 0,
          totalQuantity: 0,
          releases:      [],
        };
      }
      lecturerMap[key].totalReleased += 1;
      lecturerMap[key].totalQuantity += rec.quantity;
      lecturerMap[key].releases.push(rec);
    });

    // Weekly breakdown – group records by ISO week (Mon–Sun)
    const getWeekKey = (date) => {
      if (!date) return 'Unknown Week';
      const d = new Date(date);
      // Align to Monday
      const day = d.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      const monday = new Date(d);
      monday.setDate(d.getDate() + diff);
      monday.setHours(0, 0, 0, 0);
      return monday.toISOString().slice(0, 10); // e.g. "2026-04-27"
    };

    const weeklyMap = {};
    records.forEach((rec) => {
      const wk = getWeekKey(rec.releasedAt);
      if (!weeklyMap[wk]) {
        weeklyMap[wk] = { weekStart: wk, totalReleased: 0, totalQuantity: 0, byLecturer: {} };
      }
      weeklyMap[wk].totalReleased += 1;
      weeklyMap[wk].totalQuantity += rec.quantity;

      const lKey = rec.lecturerId || rec.lecturerName;
      if (!weeklyMap[wk].byLecturer[lKey]) {
        weeklyMap[wk].byLecturer[lKey] = {
          lecturerName:  rec.lecturerName,
          totalReleased: 0,
          totalQuantity: 0,
        };
      }
      weeklyMap[wk].byLecturer[lKey].totalReleased += 1;
      weeklyMap[wk].byLecturer[lKey].totalQuantity += rec.quantity;
    });

    const weeklySummary = Object.values(weeklyMap).sort((a, b) =>
      new Date(b.weekStart) - new Date(a.weekStart)
    );

    const overallSummary = {
      totalReleases:  records.length,
      totalQuantity:  records.reduce((s, r) => s + r.quantity, 0),
      totalLecturers: Object.keys(lecturerMap).length,
    };

    return res.json({
      success: true,
      summary: overallSummary,
      lecturerGroups: Object.values(lecturerMap).sort((a, b) =>
        b.totalReleased - a.totalReleased
      ),
      weeklySummary,
      records,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get equipment inventory changes (added, deleted, quantity changed)
// @route   GET /api/reports/equipment-changes
// @access  Private (Admin)
exports.getEquipmentChangesReport = async (req, res, next) => {
  try {
    const type = req.query.type === 'weekly' ? 'weekly' : 'monthly';
    const defaults = buildDefaultDateRange(type);
    const { startDate, endDate } = parseDateRange(req.query, defaults);
    const dateError = getDateRangeError(startDate, endDate);
    if (dateError) return res.status(400).json({ success: false, message: dateError });

    const query = { createdAt: { $gte: startDate, $lte: endDate } };
    if (req.query.action && ['added', 'deleted', 'quantity_changed', 'published', 'unpublished'].includes(req.query.action)) {
      query.action = req.query.action;
    }

    const records = await EquipmentHistory.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const summary = records.reduce(
      (acc, r) => {
        if (r.action === 'added') acc.totalAdded += 1;
        else if (r.action === 'deleted') acc.totalDeleted += 1;
        else if (r.action === 'quantity_changed') acc.totalQuantityChanges += 1;
        else if (r.action === 'published') acc.totalPublished += 1;
        else if (r.action === 'unpublished') acc.totalUnpublished += 1;
        return acc;
      },
      { totalAdded: 0, totalDeleted: 0, totalQuantityChanges: 0, totalPublished: 0, totalUnpublished: 0 }
    );

    return res.json({ success: true, summary, records });
  } catch (error) {
    return next(error);
  }
};
