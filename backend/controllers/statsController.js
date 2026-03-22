const User = require('../models/User');
const Equipment = require('../models/Equipment');
const BorrowRequest = require('../models/BorrowRequest');

const buildTrendGroupId = (groupBy) => {
  if (groupBy === 'week') {
    return {
      year: { $isoWeekYear: '$createdAt' },
      week: { $isoWeek: '$createdAt' }
    };
  }

  if (groupBy === 'month') {
    return {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' }
    };
  }

  return {
    year: { $year: '$createdAt' },
    month: { $month: '$createdAt' },
    day: { $dayOfMonth: '$createdAt' }
  };
};

const buildTrendLabel = (groupBy, point) => {
  if (groupBy === 'week') {
    return `${point._id.year}-W${String(point._id.week).padStart(2, '0')}`;
  }

  if (groupBy === 'month') {
    return `${point._id.year}-${String(point._id.month).padStart(2, '0')}`;
  }

  return `${point._id.year}-${String(point._id.month).padStart(2, '0')}-${String(point._id.day).padStart(2, '0')}`;
};

// @desc    Get dashboard statistics
// @route   GET /api/stats/dashboard
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    const stats = {};
    const role = req.user.role;

    // Common stats for all roles
    const totalEquipment = await Equipment.countDocuments();
    const availableEquipment = await Equipment.countDocuments({ available: { $gt: 0 } });
    
    stats.equipment = {
      total: totalEquipment,
      available: availableEquipment,
      borrowed: totalEquipment - availableEquipment
    };

    // Role-specific stats
    if (role === 'admin' || role === 'head_of_lab') {
      // User statistics
      stats.users = {
        total: await User.countDocuments({ status: 'active' }),
        admin: await User.countDocuments({ role: 'admin', status: 'active' }),
        head_of_lab: await User.countDocuments({ role: 'head_of_lab', status: 'active' }),
        lecturer: await User.countDocuments({ role: 'lecturer', status: 'active' }),
        lab_assistant: await User.countDocuments({ role: 'lab_assistant', status: 'active' }),
        student: await User.countDocuments({ role: 'student', status: 'active' })
      };

      // Borrow requests by status
      stats.requests = {
        total: await BorrowRequest.countDocuments(),
        pending_lecturer: await BorrowRequest.countDocuments({ status: 'pending_lecturer' }),
        pending_head: await BorrowRequest.countDocuments({ status: 'pending_head' }),
        head_approved: await BorrowRequest.countDocuments({ status: 'head_approved' }),
        ready_pickup: await BorrowRequest.countDocuments({ status: 'ready_pickup' }),
        borrowed: await BorrowRequest.countDocuments({ status: 'borrowed' }),
        returned: await BorrowRequest.countDocuments({ status: 'returned' }),
        rejected: await BorrowRequest.countDocuments({ status: 'rejected' })
      };

      // Equipment by category
      const categoryCounts = await Equipment.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]);
      stats.equipmentByCategory = categoryCounts.map(cat => ({
        category: cat._id,
        count: cat.count
      }));

      // Recent activity
      stats.recentRequests = await BorrowRequest.find()
        .populate('student', 'name email')
        .populate('equipment', 'name')
        .sort('-createdAt')
        .limit(10)
        .select('student equipment status createdAt');

    } else if (role === 'lecturer') {
      // Lecturer-specific stats
      stats.requests = {
        pending_approval: await BorrowRequest.countDocuments({
          lecturer: req.user.id,
          status: 'pending_lecturer'
        }),
        approved_by_me: await BorrowRequest.countDocuments({
          lecturer: req.user.id,
          status: { $in: ['pending_head', 'head_approved', 'ready_pickup', 'borrowed', 'returned'] }
        }),
        total_requests: await BorrowRequest.countDocuments({ lecturer: req.user.id })
      };

      stats.myRequests = await BorrowRequest.find({ lecturer: req.user.id })
        .populate('student', 'name email')
        .populate('equipment', 'name')
        .sort('-createdAt')
        .limit(5);

    } else if (role === 'lab_assistant') {
      // Lab assistant stats
      stats.requests = {
        ready_to_prepare: await BorrowRequest.countDocuments({ status: 'head_approved' }),
        ready_for_pickup: await BorrowRequest.countDocuments({ status: 'ready_pickup' }),
        currently_borrowed: await BorrowRequest.countDocuments({ status: 'borrowed' }),
        pending_return: await BorrowRequest.countDocuments({
          status: 'borrowed',
          return_date: { $lt: new Date() }
        })
      };

      // Equipment low stock alert
      stats.lowStockEquipment = await Equipment.find({
        $expr: { $lte: ['$available', { $multiply: ['$quantity', 0.2] }] }
      }).select('name available quantity category');

    } else if (role === 'student') {
      // Student stats
      stats.myRequests = {
        pending: await BorrowRequest.countDocuments({
          student: req.user.id,
          status: { $in: ['pending_lecturer', 'pending_head'] }
        }),
        approved: await BorrowRequest.countDocuments({
          student: req.user.id,
          status: { $in: ['head_approved', 'ready_pickup'] }
        }),
        borrowed: await BorrowRequest.countDocuments({
          student: req.user.id,
          status: 'borrowed'
        }),
        completed: await BorrowRequest.countDocuments({
          student: req.user.id,
          status: 'returned'
        }),
        rejected: await BorrowRequest.countDocuments({
          student: req.user.id,
          status: 'rejected'
        })
      };

      stats.recentRequests = await BorrowRequest.find({ student: req.user.id })
        .populate('equipment', 'name category')
        .sort('-createdAt')
        .limit(5);
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get borrowing trends
// @route   GET /api/stats/trends
// @access  Private (Admin, Head of Lab)
exports.getBorrowingTrends = async (req, res, next) => {
  try {
    const { period = '30' } = req.query; // days
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    const trends = await BorrowRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: daysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          approved: {
            $sum: {
              $cond: [{ $in: ['$status', ['head_approved', 'ready_pickup', 'borrowed', 'returned']] }, 1, 0]
            }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get equipment usage statistics
// @route   GET /api/stats/equipment-usage
// @access  Private (Admin, Head of Lab)
exports.getEquipmentUsage = async (req, res, next) => {
  try {
    const usage = await BorrowRequest.aggregate([
      {
        $match: {
          status: { $in: ['borrowed', 'returned'] }
        }
      },
      {
        $group: {
          _id: '$equipment',
          totalBorrows: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      },
      {
        $lookup: {
          from: 'equipments',
          localField: '_id',
          foreignField: '_id',
          as: 'equipment'
        }
      },
      { $unwind: '$equipment' },
      {
        $project: {
          name: '$equipment.name',
          category: '$equipment.category',
          totalBorrows: 1,
          totalQuantity: 1
        }
      },
      { $sort: { totalBorrows: -1 } },
      { $limit: 20 }
    ]);

    res.json({
      success: true,
      data: usage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get overdue returns
// @route   GET /api/stats/overdue
// @access  Private (Lab Assistant, Admin, Head of Lab)
exports.getOverdueReturns = async (req, res, next) => {
  try {
    const overdue = await BorrowRequest.find({
      status: 'borrowed',
      return_date: { $lt: new Date() }
    })
      .populate('student', 'name email studentId')
      .populate('equipment', 'name category')
      .sort('return_date');

    res.json({
      success: true,
      count: overdue.length,
      data: overdue
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin analytics: most borrowed items
// @route   GET /api/stats/admin/most-borrowed
// @access  Private (Admin)
exports.getMostBorrowedItems = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

    const data = await BorrowRequest.aggregate([
      {
        $match: {
          status: { $in: ['borrowed', 'returned'] }
        }
      },
      {
        $group: {
          _id: '$equipment',
          item_name: { $first: '$equipment_name' },
          total_borrow_count: { $sum: 1 },
          total_quantity_borrowed: { $sum: '$quantity' }
        }
      },
      { $sort: { total_borrow_count: -1, total_quantity_borrowed: -1 } },
      { $limit: limit }
    ]);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin analytics: users with most late returns
// @route   GET /api/stats/admin/late-return-users
// @access  Private (Admin)
exports.getUsersWithMostLateReturns = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

    const data = await BorrowRequest.aggregate([
      {
        $match: {
          actual_return_date: { $type: 'date' },
          return_date: { $type: 'date' },
          $expr: { $gt: ['$actual_return_date', '$return_date'] }
        }
      },
      {
        $group: {
          _id: '$student',
          borrower_name: { $first: '$borrower_name' },
          borrower_email: { $first: '$student_email' },
          late_return_count: { $sum: 1 },
          total_late_days: {
            $sum: {
              $ceil: {
                $divide: [
                  { $subtract: ['$actual_return_date', '$return_date'] },
                  1000 * 60 * 60 * 24
                ]
              }
            }
          }
        }
      },
      { $sort: { late_return_count: -1, total_late_days: -1 } },
      { $limit: limit }
    ]);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin analytics: borrowing trends by day/week/month
// @route   GET /api/stats/admin/borrowing-trends
// @access  Private (Admin)
exports.getAdminBorrowingTrends = async (req, res, next) => {
  try {
    const groupBy = ['day', 'week', 'month'].includes(req.query.groupBy) ? req.query.groupBy : 'day';
    const periodDays = Math.min(parseInt(req.query.period, 10) || 90, 365);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const groupId = buildTrendGroupId(groupBy);

    const points = await BorrowRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: groupId,
          total_requests: { $sum: 1 },
          approved_requests: {
            $sum: {
              $cond: [{ $in: ['$status', ['head_approved', 'ready_pickup', 'borrowed', 'returned']] }, 1, 0]
            }
          },
          rejected_requests: {
            $sum: {
              $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.day': 1 } }
    ]);

    res.json({
      success: true,
      data: points.map((point) => ({
        label: buildTrendLabel(groupBy, point),
        total_requests: point.total_requests,
        approved_requests: point.approved_requests,
        rejected_requests: point.rejected_requests
      }))
    });
  } catch (error) {
    next(error);
  }
};
