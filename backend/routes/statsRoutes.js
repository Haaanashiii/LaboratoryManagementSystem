const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getBorrowingTrends,
  getEquipmentUsage,
  getOverdueReturns
} = require('../controllers/statsController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// Dashboard stats (all authenticated users get role-specific stats)
router.get('/dashboard', getDashboardStats);

// Admin and Head of Lab only
router.get('/trends', authorize('admin', 'head_of_lab'), getBorrowingTrends);
router.get('/equipment-usage', authorize('admin', 'head_of_lab'), getEquipmentUsage);

// Lab Assistant, Admin, and Head of Lab can view overdue
router.get('/overdue', authorize('admin', 'head_of_lab', 'lab_assistant'), getOverdueReturns);

module.exports = router;
