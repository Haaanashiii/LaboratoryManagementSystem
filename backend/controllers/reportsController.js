const BorrowRequest = require('../models/BorrowRequest');

const normalizeCondition = (value) => {
  const condition = String(value || '').trim().toLowerCase();

  if (condition === 'damaged') return 'Damaged';
  if (condition === 'lost') return 'Lost';

  // Treat all non-damaged/non-lost return states as good for report summary.
  return 'Good';
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

    const startDate = req.query.startDate ? new Date(req.query.startDate) : defaults.startDate;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : defaults.endDate;

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use ISO date values for startDate and endDate.'
      });
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate cannot be after endDate.'
      });
    }

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
