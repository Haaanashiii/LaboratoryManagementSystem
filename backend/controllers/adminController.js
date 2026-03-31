const { setMaintenanceMode, getMaintenanceMode } = require('../middleware/maintenanceMode');
const { logAuditEvent } = require('../utils/auditLogger');

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
