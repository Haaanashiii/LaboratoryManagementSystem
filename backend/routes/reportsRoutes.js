const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { getBorrowingReport } = require('../controllers/reportsController');

const router = express.Router();

router.use(protect);
router.get('/borrowing', authorize('admin'), getBorrowingReport);

module.exports = router;
