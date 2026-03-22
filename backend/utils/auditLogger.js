const AuditLog = require('../models/AuditLog');

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.connection?.remoteAddress || null;
};

// Centralized audit logger keeps action tracking consistent across controllers.
exports.logAuditEvent = async ({
  req,
  userId = null,
  userEmail = null,
  actionType,
  entityType = 'system',
  entityId = null,
  status = 'success',
  details = {}
}) => {
  try {
    await AuditLog.create({
      user: userId,
      user_email: userEmail,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      ip_address: req ? getClientIp(req) : null,
      user_agent: req?.headers?.['user-agent'] || null,
      status,
      details
    });
  } catch (error) {
    // Never block business flow if audit logging fails.
    console.error('Audit logging failed:', error.message);
  }
};
