const { setMaintenanceMode, getMaintenanceMode } = require('../middleware/maintenanceMode');
const { logAuditEvent } = require('../utils/auditLogger');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const EquipmentHistory = require('../models/EquipmentHistory');

const ASSIGNABLE_ADMIN_ROLES = ['admin', 'lecturer', 'lab_assistant', 'head'];

exports.getMaintenanceStatus = async (req, res, next) => {
  try {
    const maintenanceMode = await getMaintenanceMode();

    res.json({
      success: true,
      data: {
        maintenanceMode
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleMaintenanceMode = async (req, res, next) => {
  try {
    const current = await getMaintenanceMode();
    const hasExplicitTarget = typeof req.body?.enabled === 'boolean';
    const nextState = hasExplicitTarget ? req.body.enabled : !current;

    const maintenanceMode = await setMaintenanceMode(nextState);

    await logAuditEvent({
      req,
      userId: req.user?._id,
      userEmail: req.user?.email,
      actionType: 'maintenance_toggled',
      entityType: 'system',
      status: 'success',
      details: {
        maintenanceMode
      }
    });

    res.json({
      success: true,
      message: maintenanceMode ? 'Maintenance mode enabled' : 'Maintenance mode disabled',
      data: {
        maintenanceMode
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.setUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!ASSIGNABLE_ADMIN_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${ASSIGNABLE_ADMIN_ROLES.join(', ')}`
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    await logAuditEvent({
      req,
      userId: req.user?._id,
      userEmail: req.user?.email,
      actionType: 'role_changed',
      entityType: 'system',
      entityId: user._id,
      status: 'success',
      details: {
        targetUserId: user._id,
        targetUserEmail: user.email,
        previousRole,
        newRole: role
      }
    });

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

const PURGEABLE_COLLECTIONS = ['auditLogs', 'notifications', 'equipmentHistory'];

exports.getStorageStats = async (req, res, next) => {
  try {
    const [auditLogs, notifications, equipmentHistory] = await Promise.all([
      AuditLog.countDocuments(),
      Notification.countDocuments(),
      EquipmentHistory.countDocuments(),
    ]);
    res.json({ success: true, data: { auditLogs, notifications, equipmentHistory } });
  } catch (error) {
    next(error);
  }
};

exports.purgeOldRecords = async (req, res, next) => {
  try {
    const { collections, olderThanDays } = req.body;

    if (!Array.isArray(collections) || collections.length === 0) {
      return res.status(400).json({ success: false, message: 'No collections specified.' });
    }

    const days = Number(olderThanDays);
    if (!Number.isFinite(days) || days < 1) {
      return res.status(400).json({ success: false, message: 'olderThanDays must be a positive number.' });
    }

    const invalid = collections.filter((c) => !PURGEABLE_COLLECTIONS.includes(c));
    if (invalid.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid collections: ${invalid.join(', ')}` });
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const results = { auditLogs: 0, notifications: 0, equipmentHistory: 0 };

    if (collections.includes('auditLogs')) {
      results.auditLogs = (await AuditLog.deleteMany({ createdAt: { $lt: cutoff } })).deletedCount;
    }
    if (collections.includes('notifications')) {
      results.notifications = (await Notification.deleteMany({ createdAt: { $lt: cutoff } })).deletedCount;
    }
    if (collections.includes('equipmentHistory')) {
      results.equipmentHistory = (await EquipmentHistory.deleteMany({ createdAt: { $lt: cutoff } })).deletedCount;
    }

    const totalDeleted = results.auditLogs + results.notifications + results.equipmentHistory;

    await logAuditEvent({
      req,
      userId: req.user?._id,
      userEmail: req.user?.email,
      actionType: 'data_purged',
      entityType: 'system',
      status: 'success',
      details: { collections, olderThanDays: days, cutoff, results, totalDeleted },
    });

    return res.json({
      success: true,
      message: `Purged ${totalDeleted} records older than ${days} days.`,
      data: { results, totalDeleted, cutoff },
    });
  } catch (error) {
    return next(error);
  }
};

exports.clearAuditLogs = async (req, res, next) => {
  try {
    const deletionResult = await AuditLog.deleteMany({});

    await logAuditEvent({
      req,
      userId: req.user?._id,
      userEmail: req.user?.email,
      actionType: 'audit_logs_cleared',
      entityType: 'system',
      status: 'success',
      details: {
        deletedCount: deletionResult.deletedCount || 0
      }
    });

    res.json({
      success: true,
      message: 'Audit logs cleared successfully',
      data: {
        deletedCount: deletionResult.deletedCount || 0
      }
    });
  } catch (error) {
    next(error);
  }
};
