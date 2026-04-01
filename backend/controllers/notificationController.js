const BorrowRequest = require('../models/BorrowRequest');
const Notification = require('../models/Notification');

const toEventDate = (request) => {
  return new Date(request.released_at || request.updatedAt || request.createdAt || Date.now());
};

const buildCandidatesForRole = (requests, role) => {
  return requests
    .map((request) => {
      const equipmentName = request.equipment_name || request.equipment?.name || 'Equipment';
      const eventDate = toEventDate(request);
      let message = null;

      if (role === 'student') {
        const studentMessages = {
          pending_lecturer: `Request submitted for ${equipmentName}`,
          pending_head: `${equipmentName} approved by lecturer and waiting head approval`,
          head_approved: `${equipmentName} approved by head of lab`,
          ready_pickup: `${equipmentName} is ready for pickup`,
          borrowed: `${equipmentName} has been marked as borrowed`,
          returned: `${equipmentName} has been marked as returned`,
          rejected: `Request for ${equipmentName} was rejected`
        };
        message = studentMessages[request.status] || null;
      } else if (role === 'lecturer' && request.status === 'pending_lecturer') {
        message = `${request.borrower_name || 'A student'} requested ${equipmentName}`;
      } else if (role === 'head_of_lab' && request.status === 'pending_head') {
        message = `${request.borrower_name || 'A student'} request is waiting final approval`;
      } else if (role === 'lab_assistant' && request.status === 'head_approved') {
        message = `${equipmentName} is approved and needs preparation`;
      } else if (role === 'lab_assistant' && request.status === 'ready_pickup') {
        message = `${equipmentName} is ready and waiting pickup confirmation`;
      } else if (role === 'admin' && ['borrowed', 'returned', 'rejected'].includes(request.status)) {
        message = `${equipmentName} status changed to ${request.status.replace('_', ' ')}`;
      }

      if (!message) {
        return null;
      }

      const eventKey = `${request._id}:${request.status}:${eventDate.getTime()}`;

      return {
        user: request.viewerUserId,
        recipient_role: role,
        borrow_request: request._id,
        event_key: eventKey,
        event_type: request.status,
        message,
        event_time: eventDate
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.event_time - a.event_time);
};

const getRequestQueryForRole = (user) => {
  switch (user.role) {
    case 'student':
      return { student: user.id };
    case 'lecturer':
      return { status: 'pending_lecturer' };
    case 'head_of_lab':
      return { status: 'pending_head' };
    case 'lab_assistant':
      return { status: { $in: ['head_approved', 'ready_pickup'] } };
    case 'admin':
      return { status: { $in: ['borrowed', 'returned', 'rejected'] } };
    default:
      return null;
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const roleQuery = getRequestQueryForRole(req.user);
    if (!roleQuery) {
      return res.json({ success: true, data: [] });
    }

    const requests = await BorrowRequest.find(roleQuery)
      .select('equipment_name equipment borrower_name status released_at updatedAt createdAt')
      .sort('-updatedAt')
      .limit(100);

    const hydratedRequests = requests.map((request) => ({
      ...request.toObject(),
      viewerUserId: req.user.id
    }));

    const candidates = buildCandidatesForRole(hydratedRequests, req.user.role).slice(0, 50);

    if (candidates.length > 0) {
      await Notification.bulkWrite(
        candidates.map((candidate) => ({
          updateOne: {
            filter: {
              user: candidate.user,
              recipient_role: candidate.recipient_role,
              event_key: candidate.event_key
            },
            update: {
              $setOnInsert: candidate
            },
            upsert: true
          }
        })),
        { ordered: false }
      );
    }

    const notifications = await Notification.find({
      user: req.user.id,
      recipient_role: req.user.role
    })
      .sort({ event_time: -1, createdAt: -1 })
      .limit(20);

    return res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

exports.markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.id,
        recipient_role: req.user.role
      },
      {
        $set: { isRead: true }
      },
      {
        new: true
      }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    return res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};
