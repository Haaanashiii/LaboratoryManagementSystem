const { setMaintenanceMode, getMaintenanceMode } = require('../middleware/maintenanceMode');
const { logAuditEvent } = require('../utils/auditLogger');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

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
