const { body, param, query, validationResult } = require('express-validator');
const { validatePasswordPolicy } = require('../utils/passwordPolicy');

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
  body('password').custom((value) => {
    const policy = validatePasswordPolicy(value);
    if (!policy.isValid) {
      throw new Error(policy.errors[0]);
    }
    return true;
  }),
  body('name').trim().notEmpty().withMessage('Name is required')
];

exports.loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Equipment validation rules
exports.equipmentValidation = [
  body('name').trim().notEmpty().withMessage('Equipment name is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('quantity').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Quantity must be a non-negative whole number'),
  body('available').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Available quantity must be a non-negative whole number'),
  body('location').trim().notEmpty().withMessage('Location is required')
];

// Borrow request validation rules
exports.borrowRequestValidation = [
  body('equipment').isMongoId().withMessage('Valid equipment ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('purpose').trim().notEmpty().withMessage('Purpose is required'),
  body('borrow_date').isISO8601().withMessage('Valid borrow date is required'),
  body('return_date').isISO8601().withMessage('Valid return date is required'),
  body('borrow_date').custom((value) => {
    const borrowDate = new Date(value);
    if (Number.isNaN(borrowDate.getTime())) {
      throw new Error('Valid borrow date is required');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    borrowDate.setHours(0, 0, 0, 0);

    if (borrowDate < today) {
      throw new Error('Borrow date cannot be in the past');
    }

    return true;
  }),
  body('return_date').custom((value, { req }) => {
    const returnDate = new Date(value);
    const borrowDate = new Date(req.body.borrow_date);

    if (Number.isNaN(returnDate.getTime()) || Number.isNaN(borrowDate.getTime())) {
      throw new Error('Valid borrow and return dates are required');
    }

    returnDate.setHours(0, 0, 0, 0);
    borrowDate.setHours(0, 0, 0, 0);

    if (returnDate <= borrowDate) {
      throw new Error('Return date must be after borrow date');
    }

    return true;
  }),
  body('agree_policy').isBoolean().withMessage('Agreement confirmation is required'),
  body('agree_policy').custom((value) => value === true).withMessage('You must agree to the replacement policy before submitting'),
  body('lecturer_id').isMongoId().withMessage('Lecturer selection is required'),
  body('lecturer_email').optional().isEmail().withMessage('Valid lecturer email is required')
];
