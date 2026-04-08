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
  markOutOfStock,
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
router.post('/upload-image', authorize('admin', 'head_of_lab', 'lab_assistant'), upload.single('image'), uploadImage);

// Admin, Head of Lab, and Lab Assistant can manage equipment
router.post('/', authorize('admin', 'head_of_lab', 'lab_assistant'), equipmentValidation, validate, createEquipment);
router.put('/:id', authorize('admin', 'head_of_lab', 'lab_assistant'), updateEquipment);
router.delete('/:id', authorize('admin', 'head_of_lab', 'lab_assistant'), deleteEquipment);

// Lab assistant can update quantities
router.patch('/:id/quantity', authorize('admin', 'head_of_lab', 'lab_assistant'), updateQuantity);
router.patch('/:id/out-of-stock', authorize('admin', 'head_of_lab', 'lab_assistant'), markOutOfStock);

module.exports = router;
