const mongoose = require('mongoose');

const borrowRequestSchema = new mongoose.Schema({
  // Student Information
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  student_email: {
    type: String,
    required: true
  },
  borrower_name: {
    type: String,
    required: true
  },
  student_id: {
    type: String,
    trim: true
  },
  
  // Equipment Information
  equipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true
  },
  equipment_name: {
    type: String,
    required: true
  },
  serial_number: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  
  // Request Details
  purpose: {
    type: String,
    required: [true, 'Purpose is required'],
    trim: true
  },
  objective: {
    type: String,
    trim: true
  },
  borrow_date: {
    type: Date,
    required: [true, 'Borrow date is required']
  },
  return_date: {
    type: Date,
    required: [true, 'Return date is required']
  },
  agreed_replacement_policy: {
    type: Boolean,
    default: false
  },
  agreed_replacement_policy_at: {
    type: Date
  },
  
  // Approvals
  lecturer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lecturer_email: {
    type: String
  },
  lecturer_approved_at: {
    type: Date
  },
  lecturer_remarks: {
    type: String,
    trim: true
  },
  
  head_of_lab: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  head_approved_at: {
    type: Date
  },
  head_remarks: {
    type: String,
    trim: true
  },
  
  // Lab Assistant Operations
  prepared_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  prepared_at: {
    type: Date
  },
  released_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  released_at: {
    type: Date
  },
  stock_reserved: {
    type: Boolean,
    default: false
  },
  
  // Return Information
  actual_return_date: {
    type: Date
  },
  returned_early: {
    type: Boolean,
    default: false
  },
  return_timing: {
    type: String,
    enum: ['early', 'on_time', 'late']
  },
  return_condition: {
    type: String,
    enum: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged', 'Lost']
  },
  return_remarks: {
    type: String,
    trim: true
  },
  damage_details: {
    type: String,
    trim: true
  },
  damage_image_url: {
    type: String,
    trim: true
  },
  damage_reported_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  damage_status: {
    type: String,
    enum: ['none', 'pending_verification', 'verified', 'rejected'],
    default: 'none'
  },
  damage_verified_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  damage_verified_at: {
    type: Date
  },
  damage_verification_remarks: {
    type: String,
    trim: true
  },
  student_will_replace: {
    type: Boolean,
    default: false
  },
  replacement_completed: {
    type: Boolean,
    default: false
  },
  replacement_completed_at: {
    type: Date
  },
  returned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Status Tracking
  status: {
    type: String,
    enum: [
      'pending',
      'approved',
      'pending_lecturer',
      'pending_head',
      'head_approved',
      'ready_pickup',
      'borrowed',
      'returned',
      'rejected'
    ],
    default: 'pending'
  },
  
  // Lab Assistant Approval
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approved_at: {
    type: Date
  },
  
  // PDF
  pdf_url: {
    type: String,
    trim: true
  },
  
  rejection_reason: {
    type: String,
    trim: true
  },
  rejected_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejected_at: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for created_date (for frontend compatibility)
borrowRequestSchema.virtual('created_date').get(function() {
  return this.createdAt;
});

// Validation: return date must be after borrow date
borrowRequestSchema.pre('validate', function(next) {
  if (this.borrow_date && this.return_date && this.return_date <= this.borrow_date) {
    next(new Error('Return date must be after borrow date'));
  }
  next();
});

// Indexes for faster queries
borrowRequestSchema.index({ student: 1, status: 1 });
borrowRequestSchema.index({ equipment: 1, status: 1 });
borrowRequestSchema.index({ lecturer: 1, status: 1 });
borrowRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('BorrowRequest', borrowRequestSchema);
