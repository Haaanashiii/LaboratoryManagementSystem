const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { getBorrowingReport, getLecturerReleasesReport } = require('../controllers/reportsController');

const router = express.Router();

router.use(protect);
router.get('/borrowing', authorize('admin'), getBorrowingReport);
router.get('/lecturer-releases', authorize('admin'), getLecturerReleasesReport);

module.exports = router;
