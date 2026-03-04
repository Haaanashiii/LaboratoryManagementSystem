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

// All routes are protected and require admin or head_of_lab role
router.use(protect);
router.use(authorize('admin', 'head_of_lab'));

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/role/:role')
  .get(getUsersByRole);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

module.exports = router;
