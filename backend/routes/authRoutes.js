const express = require('express');
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
const { registerValidation, loginValidation, validate } = require('../middleware/validator');

// Public routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/admin-login', loginValidation, validate, adminLogin);

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
router.post('/logout', protect, logout);
router.put('/update-password', protect, updatePassword);

module.exports = router;
