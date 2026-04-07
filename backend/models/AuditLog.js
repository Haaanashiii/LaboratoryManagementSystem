const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  user_email: {
    type: String,
    trim: true
  },
  action_type: {
    type: String,
    enum: [
      'login_success',
      'login_failed',
      'borrow_created',
      'borrow_released',
      'borrow_returned',
      'damage_verified',
      'maintenance_toggled',
      'role_changed',
      'audit_logs_cleared'
    ],
    required: true
  },
  entity_type: {
    type: String,
    enum: ['auth', 'borrow_request', 'equipment', 'system'],
    default: 'system'
  },
  entity_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  ip_address: {
    type: String,
    trim: true
  },
  user_agent: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    default: 'success'
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
auditLogSchema.index({ action_type: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
