const AuditLog = require('../models/AuditLog');

const normalizeIp = (value) => {
  if (!value) return null;

  const ip = String(value).trim();
  if (!ip) return null;

  if (ip === '::1') return '127.0.0.1';
  if (ip.startsWith('::ffff:')) return ip.slice(7);

  return ip;
};

const getClientIp = (req) => {
  const ipFromExpress = normalizeIp(req.ip);
  if (ipFromExpress) {
    return ipFromExpress;
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return normalizeIp(forwarded.split(',')[0]);
  }

  return normalizeIp(req.connection?.remoteAddress);
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
