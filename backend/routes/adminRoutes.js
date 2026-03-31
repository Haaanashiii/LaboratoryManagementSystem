const express = require('express');

const { getMaintenanceStatus, toggleMaintenanceMode } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/maintenance-status', getMaintenanceStatus);
router.post('/toggle-maintenance', toggleMaintenanceMode);

module.exports = router;
