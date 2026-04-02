const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  markNotificationRead,
  markNotificationUnread
} = require('../controllers/notificationController');

router.use(protect);

router.get('/', getNotifications);
router.put('/:id/read', markNotificationRead);
router.put('/:id/unread', markNotificationUnread);

module.exports = router;
