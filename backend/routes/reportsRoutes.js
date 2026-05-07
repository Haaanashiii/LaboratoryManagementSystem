const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getBorrowingReport,
  getLecturerReleasesReport,
  getEquipmentChangesReport,
} = require('../controllers/reportsController');

const router = express.Router();

router.use(protect);
router.get('/borrowing', authorize('admin'), getBorrowingReport);
router.get('/lecturer-releases', authorize('admin'), getLecturerReleasesReport);
router.get('/equipment-changes', authorize('admin'), getEquipmentChangesReport);

module.exports = router;
