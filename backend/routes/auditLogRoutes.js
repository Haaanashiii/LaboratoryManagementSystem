const express = require('express');
const router = express.Router();

const { getAuditLogs, exportAuditLogsPdf } = require('../controllers/auditLogController');
const { protect, authorize } = require('../middleware/auth');

// Admin-only ghost mode logs endpoint with filtering support.
router.use(protect, authorize('admin'));

router.get('/export/pdf', exportAuditLogsPdf);
router.get('/', getAuditLogs);

module.exports = router;
