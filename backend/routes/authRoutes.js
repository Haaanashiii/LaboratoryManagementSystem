const express = require('express');
const rateLimit = require('express-rate-limit');
const { validationResult } = require('express-validator');
const router = express.Router();
const {
  register,
  login,
  adminLogin,
  getMe,
  logout,
  updatePassword
} = require('../controllers/authController');
const { protect, authorizeAdminAccess } = require('../middleware/auth');
const { getMaintenanceMode } = require('../middleware/maintenanceMode');
const { registerValidation, loginValidation, validate } = require('../middleware/validator');
const { logAuditEvent } = require('../utils/auditLogger');
const { parseEmail } = require('../utils/emailPolicy');

const getAuditEmail = (email) => {
  const parsed = parseEmail(email);
  return parsed.normalizedEmail || null;
};

const loginValidationWithAudit = (portal = 'default') => async (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  await logAuditEvent({
    req,
    userEmail: getAuditEmail(req.body?.email),
    actionType: 'login_failed',
    entityType: 'auth',
    status: 'failed',
    details: {
      reason: 'validation_failed',
      portal,
      validation_errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg
      }))
    }
  });

  return res.status(400).json({
    success: false,
    errors: errors.array()
  });
};

const loginRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res, _next, options) => {
    await logAuditEvent({
      req,
      userEmail: getAuditEmail(req.body?.email),
      actionType: 'login_failed',
      entityType: 'auth',
      status: 'failed',
      details: {
        reason: 'rate_limited',
        portal: 'default'
      }
    });

    return res.status(options.statusCode).json(options.message);
  },
  message: {
    success: false,
    message: 'Too many failed login attempts. Please try again in 30 minutes.'
  }
});

const adminLoginRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res, _next, options) => {
    await logAuditEvent({
      req,
      userEmail: getAuditEmail(req.body?.email),
      actionType: 'login_failed',
      entityType: 'auth',
      status: 'failed',
      details: {
        reason: 'rate_limited',
        portal: 'admin'
      }
    });

    return res.status(options.statusCode).json(options.message);
  },
  message: {
    success: false,
    message: 'Too many failed login attempts. Please try again in 30 minutes.'
  }
});

// Public routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginRateLimiter, loginValidation, loginValidationWithAudit('default'), login);
router.post('/admin/login', adminLoginRateLimiter, loginValidation, loginValidationWithAudit('admin'), adminLogin);
router.get('/maintenance-status', async (req, res, next) => {
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
});

// Protected routes
router.get('/me', protect, getMe);
router.get('/dashboard', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the protected dashboard route',
    data: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    }
  });
});
router.get('/admin-dashboard', protect, authorizeAdminAccess, (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the admin dashboard route',
    data: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    }
  });
});
router.get('/admin/session', protect, authorizeAdminAccess, (req, res) => {
  res.json({
    success: true,
    message: 'Admin session is valid',
    data: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    }
  });
});
router.post('/logout', protect, logout);
router.put('/update-password', protect, updatePassword);

module.exports = router;
