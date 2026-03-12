const express = require('express');
const router = express.Router();
const {
  getEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getCategories,
  updateQuantity,
  uploadImage,
  getImage
} = require('../controllers/equipmentController');
const { protect, authorize } = require('../middleware/auth');
const { equipmentValidation, validate } = require('../middleware/validator');
const upload = require('../middleware/upload');

// Public image route (no auth required for viewing images)
router.get('/image/:fileId', getImage);

// All other routes are protected
router.use(protect);

// Public equipment routes (all authenticated users)
router.get('/', getEquipment);
router.get('/categories', getCategories);
router.get('/:id', getEquipmentById);

// Image upload
router.post('/upload-image', authorize('admin', 'head_of_lab'), upload.single('image'), uploadImage);

// Admin and Head of Lab can manage equipment
router.post('/', authorize('admin', 'head_of_lab'), equipmentValidation, validate, createEquipment);
router.put('/:id', authorize('admin', 'head_of_lab'), updateEquipment);
router.delete('/:id', authorize('admin', 'head_of_lab'), deleteEquipment);

// Lab assistant can update quantities
router.patch('/:id/quantity', authorize('admin', 'head_of_lab', 'lab_assistant'), updateQuantity);

module.exports = router;
