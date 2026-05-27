const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Roles that are allowed to access admin-facing login and dashboard endpoints.
const ADMIN_ACCESS_ROLES = ['lecturer', 'head', 'head_of_lab', 'lab_assistant', 'admin'];

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      
      // Get user from token
      req.user = await User.findById(decoded.id);
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (req.user.status !== 'active') {
        return res.status(401).json({
          success: false,
          message: 'User account is not active'
        });
      }

      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please log in again.'
        });
      }

      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please log in again.'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Authentication failed. Please log in again.'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Authorize specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

exports.ADMIN_ACCESS_ROLES = ADMIN_ACCESS_ROLES;

exports.authorizeAdminAccess = exports.authorize(...ADMIN_ACCESS_ROLES);

// Generate JWT token with user id and role. Token expires in 1 day.
exports.generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRE || '1d'
  });
};
