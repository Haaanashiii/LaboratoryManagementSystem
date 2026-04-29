const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { logAuditEvent } = require('../utils/auditLogger');
const {
  parseEmail,
  isDevBypassEmail,
  isAllowedRegistrationDomain,
  isAllowedDomainForRole
} = require('../utils/emailPolicy');
const { validatePasswordPolicy } = require('../utils/passwordPolicy');

const ADMIN_PORTAL_ROLES = ['admin', 'lecturer', 'lab_assistant', 'head', 'head_of_lab'];
const STUDENT_PORTAL_DOMAIN = 'student.its.ac.id';
const ALLOW_PASSWORD_REUSE = String(process.env.ALLOW_PASSWORD_REUSE || '').toLowerCase() === 'true';

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

    if (parsedEmail.domain !== STUDENT_PORTAL_DOMAIN) {
      return res.status(403).json({
        success: false,
        message: 'Student registration only accepts @student.its.ac.id accounts'
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

    // Enforce signup password uniqueness against existing accounts.
    if (!ALLOW_PASSWORD_REUSE) {
      const existingUsersCursor = User.find({}, 'password').select('+password').cursor();
      for await (const existingUser of existingUsersCursor) {
        const isReusedPassword = await existingUser.comparePassword(password);
        if (isReusedPassword) {
          return res.status(400).json({
            success: false,
            message: 'Password is already used by another account. Please choose a more unique password.'
          });
        }
      }
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

    if (parsedEmail.domain !== STUDENT_PORTAL_DOMAIN) {
      await logAuditEvent({
        req,
        userEmail: parsedEmail.normalizedEmail,
        actionType: 'login_failed',
        entityType: 'auth',
        status: 'failed',
        details: { reason: 'domain_not_allowed_for_student_portal', portal: 'default' }
      });
      return res.status(403).json({
        success: false,
        message: 'Student portal only accepts @student.its.ac.id accounts'
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

    if (String(user.role || '').toLowerCase() !== 'student') {
      await logAuditEvent({
        req,
        userId: user._id,
        userEmail: user.email,
        actionType: 'login_failed',
        entityType: 'auth',
        status: 'failed',
        details: { reason: 'role_not_allowed_student_portal', role: user.role, portal: 'default' }
      });
      return res.status(403).json({
        success: false,
        message: 'This account is not allowed to access the student portal'
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

// @desc    Update current user's display name
// @route   PUT /api/auth/update-name
// @access  Private
exports.updateName = async (req, res, next) => {
  try {
    const { name } = req.body;
    const trimmed = String(name || '').trim();

    if (!trimmed || trimmed.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters'
      });
    }

    if (trimmed.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name must not exceed 100 characters'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name: trimmed },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Name updated successfully',
      data: { name: user.name }
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
    const normalizedCurrentPassword = String(currentPassword || '');
    const normalizedNewPassword = String(newPassword || '');

    if (!normalizedCurrentPassword || !normalizedNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (normalizedCurrentPassword === normalizedNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(normalizedCurrentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const isSamePassword = await user.comparePassword(normalizedNewPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    const policy = validatePasswordPolicy(normalizedNewPassword);
    if (!policy.isValid) {
      return res.status(400).json({
        success: false,
        message: policy.errors[0]
      });
    }

    // Update password
    user.password = normalizedNewPassword;
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

// @desc    Verify current password (no change — used for UX gating)
// @route   POST /api/auth/verify-password
// @access  Private
exports.verifyCurrentPassword = async (req, res, next) => {
  try {
    const { currentPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is required'
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    const isMatch = await user.comparePassword(String(currentPassword));

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect password. Please try again.'
      });
    }

    return res.json({ success: true, message: 'Password verified.' });
  } catch (error) {
    next(error);
  }
};
