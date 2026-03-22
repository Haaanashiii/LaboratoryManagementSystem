const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { logAuditEvent } = require('../utils/auditLogger');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { email, password, name, role, department, studentId, phone } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      role: role || 'student',
      department,
      studentId,
      phone
    });

    // Generate token with id and role
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      await logAuditEvent({
        req,
        userEmail: email,
        actionType: 'login_failed',
        entityType: 'auth',
        status: 'failed',
        details: { reason: 'user_not_found' }
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      await logAuditEvent({
        req,
        userId: user._id,
        userEmail: user.email,
        actionType: 'login_failed',
        entityType: 'auth',
        status: 'failed',
        details: { reason: 'password_mismatch' }
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      await logAuditEvent({
        req,
        userId: user._id,
        userEmail: user.email,
        actionType: 'login_failed',
        entityType: 'auth',
        status: 'failed',
        details: { reason: 'inactive_account' }
      });
      return res.status(401).json({
        success: false,
        message: 'User account is not active'
      });
    }

    // Generate token with id and role
    const token = generateToken(user._id, user.role);

    await logAuditEvent({
      req,
      userId: user._id,
      userEmail: user.email,
      actionType: 'login_success',
      entityType: 'auth',
      status: 'success',
      details: { role: user.role, portal: 'default' }
    });

    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        studentId: user.studentId,
        phone: user.phone,
        status: user.status,
        created_date: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    // Client-side will remove token
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user password
// @route   PUT /api/auth/update-password
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new token with id and role
    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Password updated successfully',
      token
    });
  } catch (error) {
    next(error);
  }
};
