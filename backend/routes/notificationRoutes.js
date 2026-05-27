const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  markNotificationRead,
  markNotificationUnread,
  markAllRead,
  clearAll,
  deleteOne
} = require('../controllers/notificationController');

router.use(protect);

router.get('/', getNotifications);
router.put('/read-all', markAllRead);
router.delete('/', clearAll);
router.put('/:id/read', markNotificationRead);
router.put('/:id/unread', markNotificationUnread);
router.delete('/:id', deleteOne);

module.exports = router;
