const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { logAuditEvent } = require('../utils/auditLogger');
const {
  parseEmail,
  isDevBypassEmail,
  isAllowedRegistrationDomain,
  isAllowedDomainForRole
} = require('../utils/emailPolicy');

const ADMIN_PORTAL_ROLES = ['admin', 'lecturer', 'lab_assistant', 'head', 'head_of_lab'];

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { email, password, name, department, studentId, phone } = req.body;

    const parsedEmail = parseEmail(email);
    if (!parsedEmail.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email'
      });
    }

    const isBypassEmail = isDevBypassEmail(parsedEmail.normalizedEmail);
    if (!isBypassEmail && !isAllowedRegistrationDomain(parsedEmail.domain)) {
      return res.status(403).json({
        success: false,
        message: 'Registration is restricted to @student.its.ac.id or @its.ac.id emails'
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email: parsedEmail.normalizedEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create user
    const user = await User.create({
      email: parsedEmail.normalizedEmail,
      password,
      name,
      role: 'student',
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

    const parsedEmail = parseEmail(email);
    if (!parsedEmail.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email'
      });
    }

    const isBypassEmail = isDevBypassEmail(parsedEmail.normalizedEmail);
    if (!isBypassEmail && !isAllowedRegistrationDomain(parsedEmail.domain)) {
      await logAuditEvent({
        req,
        userEmail: parsedEmail.normalizedEmail,
        actionType: 'login_failed',
        entityType: 'auth',
        status: 'failed',
        details: { reason: 'domain_not_allowed_for_login' }
      });
      return res.status(403).json({
        success: false,
        message: 'Email domain is not allowed'
      });
    }

    // Check for user
    const user = await User.findOne({ email: parsedEmail.normalizedEmail }).select('+password');
    
    if (!user) {
      await logAuditEvent({
        req,
        userEmail: parsedEmail.normalizedEmail,
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

    if (!isBypassEmail && !isAllowedDomainForRole(user.role, parsedEmail.domain)) {
      await logAuditEvent({
        req,
        userId: user._id,
        userEmail: user.email,
        actionType: 'login_failed',
        entityType: 'auth',
        status: 'failed',
        details: { reason: 'domain_role_mismatch', role: user.role }
      });
      return res.status(403).json({
        success: false,
        message: 'Email domain is not allowed for this role'
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

// @desc    Login user to admin portal
// @route   POST /api/auth/admin/login
// @access  Public
exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const parsedEmail = parseEmail(email);
    if (!parsedEmail.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email'
      });
    }

    const isBypassEmail = isDevBypassEmail(parsedEmail.normalizedEmail);
    if (!isBypassEmail && !isAllowedRegistrationDomain(parsedEmail.domain)) {
      await logAuditEvent({
        req,
        userEmail: parsedEmail.normalizedEmail,
        actionType: 'login_failed',
        entityType: 'auth',
        status: 'failed',
        details: { reason: 'domain_not_allowed_for_admin_login', portal: 'admin' }
      });
      return res.status(403).json({
        success: false,
        message: 'Email domain is not allowed'
      });
    }

    const user = await User.findOne({ email: parsedEmail.normalizedEmail }).select('+password');

    if (!user) {
      await logAuditEvent({
        req,
        userEmail: parsedEmail.normalizedEmail,
        actionType: 'login_failed',
        entityType: 'auth',
        status: 'failed',
        details: { reason: 'user_not_found', portal: 'admin' }
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!isBypassEmail && !isAllowedDomainForRole(user.role, parsedEmail.domain)) {
      await logAuditEvent({
        req,
        userId: user._id,
        userEmail: user.email,
        actionType: 'login_failed',
        entityType: 'auth',
        status: 'failed',
        details: { reason: 'domain_role_mismatch', role: user.role, portal: 'admin' }
      });
      return res.status(403).json({
        success: false,
        message: 'Email domain is not allowed for this role'
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      await logAuditEvent({
        req,
        userId: user._id,
        userEmail: user.email,
        actionType: 'login_failed',
        entityType: 'auth',
        status: 'failed',
        details: { reason: 'password_mismatch', portal: 'admin' }
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.status !== 'active') {
      await logAuditEvent({
        req,
        userId: user._id,
        userEmail: user.email,
        actionType: 'login_failed',
        entityType: 'auth',
        status: 'failed',
        details: { reason: 'inactive_account', portal: 'admin' }
      });
      return res.status(401).json({
        success: false,
        message: 'User account is not active'
      });
    }

    const normalizedRole = String(user.role || '').toLowerCase();
    if (!ADMIN_PORTAL_ROLES.includes(normalizedRole)) {
      await logAuditEvent({
        req,
        userId: user._id,
        userEmail: user.email,
        actionType: 'login_failed',
        entityType: 'auth',
        status: 'failed',
        details: { reason: 'role_not_allowed_admin_portal', role: user.role, portal: 'admin' }
      });
      return res.status(403).json({
        success: false,
        message: 'This account is not allowed to access the admin portal'
      });
    }

    const token = generateToken(user._id, user.role);

    await logAuditEvent({
      req,
      userId: user._id,
      userEmail: user.email,
      actionType: 'login_success',
      entityType: 'auth',
      status: 'success',
      details: { role: user.role, portal: 'admin' }
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
