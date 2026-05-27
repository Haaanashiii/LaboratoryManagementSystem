const express = require('express');

const { getMaintenanceStatus, toggleMaintenanceMode, setUserRole, clearAuditLogs, getStorageStats, purgeOldRecords } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/maintenance-status', getMaintenanceStatus);
router.post('/toggle-maintenance', toggleMaintenanceMode);
router.put('/set-role/:id', setUserRole);
router.delete('/audit-logs', clearAuditLogs);
router.get('/storage-stats', getStorageStats);
router.post('/purge', purgeOldRecords);

module.exports = router;
