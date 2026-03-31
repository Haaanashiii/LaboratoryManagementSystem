const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Setting = require('../models/Setting');

const MAINTENANCE_KEY = 'system_maintenance_mode';
const CACHE_TTL_MS = 5000;
const ALLOWED_WHEN_MAINTENANCE = ['/health', '/api/auth/admin/login', '/api/auth/maintenance-status'];

let cache = {
  value: false,
  checkedAt: 0
};

const isMaintenanceBypassPath = (url = '') => {
  return ALLOWED_WHEN_MAINTENANCE.some((path) => url.startsWith(path));
};

const readMaintenanceFlag = async (force = false) => {
  const now = Date.now();
  if (!force && now - cache.checkedAt < CACHE_TTL_MS) {
    return cache.value;
  }

  const setting = await Setting.findOne({ key: MAINTENANCE_KEY }).select('value');
  const enabled = Boolean(setting?.value === true);

  cache = {
    value: enabled,
    checkedAt: now
  };

  return enabled;
};

const isAdminFromToken = async (req) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return false;
  }

  const token = header.split(' ')[1];
  if (!token) {
    return false;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('role status');
    return !!user && user.status === 'active' && user.role === 'admin';
  } catch {
    return false;
  }
};

const maintenanceModeGuard = async (req, res, next) => {
  try {
    if (req.method === 'OPTIONS') {
      return next();
    }

    if (isMaintenanceBypassPath(req.originalUrl)) {
      return next();
    }

    const maintenanceEnabled = await readMaintenanceFlag();
    if (!maintenanceEnabled) {
      return next();
    }

    const isAdmin = await isAdminFromToken(req);
    if (isAdmin) {
      return next();
    }

    res.set('Retry-After', '120');
    return res.status(503).json({
      success: false,
      maintenance: true,
      message: 'System is under maintenance. Please try again later.'
    });
  } catch (error) {
    return next(error);
  }
};

const setMaintenanceMode = async (enabled) => {
  const value = Boolean(enabled);

  await Setting.findOneAndUpdate(
    { key: MAINTENANCE_KEY },
    {
      key: MAINTENANCE_KEY,
      value,
      description: 'Global maintenance mode switch'
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  cache = {
    value,
    checkedAt: Date.now()
  };

  return value;
};

const getMaintenanceMode = async () => {
  return readMaintenanceFlag(true);
};

module.exports = {
  maintenanceModeGuard,
  setMaintenanceMode,
  getMaintenanceMode,
  MAINTENANCE_KEY
};
