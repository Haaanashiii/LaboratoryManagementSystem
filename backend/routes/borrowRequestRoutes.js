const express = require('express');
const router = express.Router();
const {
  getBorrowRequests,
  getBorrowRequest,
  createBorrowRequest,
  lecturerAction,
  headAction,
  prepareEquipment,
  releaseEquipment,
  returnEquipment,
  getMyRequests,
  deleteBorrowRequest
} = require('../controllers/borrowRequestController');
const { protect, authorize } = require('../middleware/auth');
const { borrowRequestValidation, validate } = require('../middleware/validator');

// All routes are protected
router.use(protect);

// Student routes
router.get('/my-requests', authorize('student'), getMyRequests);
router.post('/', authorize('student'), borrowRequestValidation, validate, createBorrowRequest);

// General routes (all authenticated users can view based on role filtering in controller)
router.get('/', getBorrowRequests);
router.get('/:id', getBorrowRequest);

// Lecturer routes
router.put('/:id/lecturer-action', authorize('lecturer'), lecturerAction);

// Head of Lab routes
router.put('/:id/head-action', authorize('head_of_lab'), headAction);

// Lab Assistant routes
router.put('/:id/prepare', authorize('lab_assistant'), prepareEquipment);
router.put('/:id/release', authorize('lab_assistant'), releaseEquipment);
router.put('/:id/return', authorize('lab_assistant'), returnEquipment);

// Delete route (student can delete own pending requests, admin can delete any pending)
router.delete('/:id', deleteBorrowRequest);

module.exports = router;
