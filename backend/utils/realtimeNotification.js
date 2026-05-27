const Notification = require('../models/Notification');
const {
  emitNotificationToUser,
  emitNotificationRefreshToRole,
  emitNotificationRefreshToUser
} = require('../socket');

const buildStudentMessage = (status, equipmentName) => {
  const safeEquipmentName = equipmentName || 'Equipment';
  const messages = {
    pending_lecturer: `Request submitted for ${safeEquipmentName}`,
    pending_head: `${safeEquipmentName} approved by lecturer and waiting head approval`,
    head_approved: `${safeEquipmentName} approved by head of lab`,
    ready_pickup: `${safeEquipmentName} is ready for pickup`,
    borrowed: `${safeEquipmentName} has been marked as borrowed`,
    returned: `${safeEquipmentName} has been marked as returned`,
    rejected: `Request for ${safeEquipmentName} was rejected`
  };

  return messages[status] || null;
};

const createNotification = async ({
  userId,
  recipientRole,
  borrowRequestId,
  eventType,
  message,
  eventTime
}) => {
  if (!userId || !recipientRole || !eventType || !message) {
    return null;
  }

  try {
    const safeEventTime = eventTime ? new Date(eventTime) : new Date();
    const eventKey = `${borrowRequestId || 'general'}:${eventType}:${safeEventTime.getTime()}`;

    const notification = await Notification.findOneAndUpdate(
      {
        user: userId,
        recipient_role: recipientRole,
        event_key: eventKey
      },
      {
        $setOnInsert: {
          user: userId,
          recipient_role: recipientRole,
          borrow_request: borrowRequestId || null,
          event_key: eventKey,
          event_type: eventType,
          message,
          event_time: safeEventTime
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    emitNotificationToUser(String(userId), {
      ...notification.toObject(),
      id: notification._id,
      isRead: Boolean(notification.isRead)
    });

    return notification;
  } catch (error) {
    console.error('Realtime notification write failed:', error.message);
    return null;
  }
};

const notifyStudentBorrowStatus = async (request) => {
  if (!request || !request.student) {
    return null;
  }

  const message = buildStudentMessage(request.status, request.equipment_name);
  if (!message) {
    return null;
  }

  return createNotification({
    userId: request.student,
    recipientRole: 'student',
    borrowRequestId: request._id,
    eventType: request.status,
    message,
    eventTime: request.updatedAt || Date.now()
  });
};

const notifyRoleRefresh = (role, payload = {}) => {
  emitNotificationRefreshToRole(role, payload);
};

const notifyUserRefresh = (userId, payload = {}) => {
  emitNotificationRefreshToUser(userId, payload);
};

module.exports = {
  notifyStudentBorrowStatus,
  notifyRoleRefresh,
  notifyUserRefresh
};
