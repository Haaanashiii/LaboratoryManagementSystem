const AuditLog = require('../models/AuditLog');

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
