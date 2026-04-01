const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  markNotificationRead
} = require('../controllers/notificationController');

router.use(protect);

router.get('/', getNotifications);
router.put('/:id/read', markNotificationRead);

module.exports = router;
