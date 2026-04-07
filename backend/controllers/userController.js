const User = require('../models/User');
const { validatePasswordPolicy } = require('../utils/passwordPolicy');
const {
  parseEmail,
  isDevBypassEmail,
  isAllowedRegistrationDomain,
  isAllowedDomainForRole
} = require('../utils/emailPolicy');

const DEFAULT_ADMIN_CREATED_PASSWORD = 'Default123';

const isPasswordUsedByOtherUsers = async (password, excludeUserId = null) => {
  const usersCursor = User.find({}, 'password').select('+password').cursor();

  for await (const existingUser of usersCursor) {
    if (excludeUserId && existingUser._id.toString() === String(excludeUserId)) {
      continue;
    }

    const isReusedPassword = await existingUser.comparePassword(password);
    if (isReusedPassword) {
      return true;
    }
  }

  return false;
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin, Head of Lab)
exports.getUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    
    // Build query
    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query).select('-password').sort('-createdAt');

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create user / Invite user
// @route   POST /api/users
// @access  Private (Admin)
exports.createUser = async (req, res, next) => {
  try {
    const { email, password, name, role, department, studentId, phone } = req.body;
    const normalizedRole = String(role || 'student').trim().toLowerCase();

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
        message: 'Email domain is not allowed'
      });
    }

    if (!isBypassEmail && !isAllowedDomainForRole(normalizedRole, parsedEmail.domain)) {
      return res.status(403).json({
        success: false,
        message: 'Email domain is not allowed for this role'
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

    const resolvedPassword = password || DEFAULT_ADMIN_CREATED_PASSWORD;
    const policy = validatePasswordPolicy(resolvedPassword);
    if (!policy.isValid) {
      return res.status(400).json({
        success: false,
        message: policy.errors[0]
      });
    }

    const isPasswordReused = await isPasswordUsedByOtherUsers(resolvedPassword);
    if (isPasswordReused) {
      return res.status(400).json({
        success: false,
        message: 'Password is already used by another account. Please choose a more unique password.'
      });
    }

    // Create user
    const user = await User.create({
      email: parsedEmail.normalizedEmail,
      password: resolvedPassword,
      name,
      role: normalizedRole,
      department,
      studentId,
      phone
    });

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin, Own profile)
exports.updateUser = async (req, res, next) => {
  try {
    const { name, role, department, studentId, phone, status, password } = req.body;

    // Check if user can update this record
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If an admin account remains admin, restrict updates to role/status/password.
    const nextRole = role || user.role;
    if (user.role === 'admin' && req.user.role === 'admin' && nextRole === 'admin') {
      if (role) user.role = role;
      if (status) user.status = status;
      if (password) {
        const policy = validatePasswordPolicy(password);
        if (!policy.isValid) {
          return res.status(400).json({
            success: false,
            message: policy.errors[0]
          });
        }

        const isPasswordReused = await isPasswordUsedByOtherUsers(password, user._id);
        if (isPasswordReused) {
          return res.status(400).json({
            success: false,
            message: 'Password is already used by another account. Please choose a more unique password.'
          });
        }

        user.password = password;
      }
      await user.save();

      return res.json({
        success: true,
        data: user
      });
    }

    // Update fields
    if (name) user.name = name;
    if (department) user.department = department;
    if (studentId) user.studentId = studentId;
    if (phone) user.phone = phone;
    
    // Only admins can update role and status
    if (req.user.role === 'admin') {
      if (role) user.role = role;
      if (status) user.status = status;
      if (password) {
        const policy = validatePasswordPolicy(password);
        if (!policy.isValid) {
          return res.status(400).json({
            success: false,
            message: policy.errors[0]
          });
        }

        const isPasswordReused = await isPasswordUsedByOtherUsers(password, user._id);
        if (isPasswordReused) {
          return res.status(400).json({
            success: false,
            message: 'Password is already used by another account. Please choose a more unique password.'
          });
        }

        user.password = password;
      }
    }

    await user.save();

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting own account
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await user.deleteOne();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get users by role
// @route   GET /api/users/role/:role
// @access  Private
exports.getUsersByRole = async (req, res, next) => {
  try {
    const users = await User.find({ role: req.params.role, status: 'active' })
      .select('name email role department')
      .sort('name');

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};
