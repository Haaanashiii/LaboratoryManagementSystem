const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipient_role: {
    type: String,
    enum: ['admin', 'head', 'head_of_lab', 'lecturer', 'lab_assistant', 'student'],
    required: true,
    index: true
  },
  borrow_request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BorrowRequest',
    default: null
  },
  event_key: {
    type: String,
    required: true
  },
  event_type: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  event_time: {
    type: Date,
    required: true,
    index: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

notificationSchema.index({ user: 1, recipient_role: 1, event_key: 1 }, { unique: true });
notificationSchema.index({ user: 1, recipient_role: 1, event_time: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
