const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUsersByRole
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Admin/Head of Lab only routes
router.get('/', authorize('admin', 'head_of_lab'), getUsers);
router.post('/', authorize('admin', 'head_of_lab'), createUser);

// Get users by role (all authenticated users; controller limits student access)
router.get('/role/:role', getUsersByRole);

// User profile routes - users can update own profile or admins can update any
router.route('/:id')
  .get(authorize('admin', 'head_of_lab'), getUser)
  .put(updateUser)  // Controller checks own profile or admin
  .delete(authorize('admin', 'head_of_lab'), deleteUser);

module.exports = router;
