const { body, param, query, validationResult } = require('express-validator');

// Middleware to check validation results
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
exports.registerValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('role').optional().isIn(['admin', 'head_of_lab', 'lecturer', 'lab_assistant', 'student'])
];

exports.loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Equipment validation rules
exports.equipmentValidation = [
  body('name').trim().notEmpty().withMessage('Equipment name is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('available').optional().isInt({ min: 0 }).withMessage('Available quantity must be a positive number'),
  body('location').trim().notEmpty().withMessage('Location is required')
];

// Borrow request validation rules
exports.borrowRequestValidation = [
  body('equipment').isMongoId().withMessage('Valid equipment ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('purpose').trim().notEmpty().withMessage('Purpose is required'),
  body('borrow_date').isISO8601().withMessage('Valid borrow date is required'),
  body('return_date').isISO8601().withMessage('Valid return date is required'),
  body('agree_policy').isBoolean().withMessage('Agreement confirmation is required'),
  body('agree_policy').custom((value) => value === true).withMessage('You must agree to the replacement policy before submitting'),
  body('lecturer_email').optional().isEmail().withMessage('Valid lecturer email is required')
];
