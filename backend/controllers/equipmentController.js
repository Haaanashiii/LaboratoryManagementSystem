const Equipment = require('../models/Equipment');

// @desc    Get all equipment
// @route   GET /api/equipment
// @access  Private
exports.getEquipment = async (req, res, next) => {
  try {
    const { category, status, available, search } = req.query;
    
    // Build query
    const query = {};
    if (category && category !== 'all') query.category = category;
    if (status) query.status = status;
    if (available === 'true') query.available = { $gt: 0 };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const equipment = await Equipment.find(query).sort('-createdAt');

    res.json({
      success: true,
      count: equipment.length,
      data: equipment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single equipment
// @route   GET /api/equipment/:id
// @access  Private
exports.getEquipmentById = async (req, res, next) => {
  try {
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    res.json({
      success: true,
      data: equipment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create equipment
// @route   POST /api/equipment
// @access  Private (Admin)
exports.createEquipment = async (req, res, next) => {
  try {
    const equipment = await Equipment.create(req.body);

    res.status(201).json({
      success: true,
      data: equipment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update equipment
// @route   PUT /api/equipment/:id
// @access  Private (Admin)
exports.updateEquipment = async (req, res, next) => {
  try {
    const equipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    res.json({
      success: true,
      data: equipment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete equipment
// @route   DELETE /api/equipment/:id
// @access  Private (Admin)
exports.deleteEquipment = async (req, res, next) => {
  try {
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    await equipment.deleteOne();

    res.json({
      success: true,
      message: 'Equipment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get equipment categories
// @route   GET /api/equipment/categories/list
// @access  Private
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Equipment.distinct('category');

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update equipment quantity
// @route   PUT /api/equipment/:id/quantity
// @access  Private (Admin, Lab Assistant)
exports.updateQuantity = async (req, res, next) => {
  try {
    const { quantity, available } = req.body;
    
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    if (quantity !== undefined) equipment.quantity = quantity;
    if (available !== undefined) equipment.available = available;

    await equipment.save();

    res.json({
      success: true,
      data: equipment
    });
  } catch (error) {
    next(error);
  }
};
