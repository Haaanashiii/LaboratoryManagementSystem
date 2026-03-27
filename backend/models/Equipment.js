const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Equipment name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  available: {
    type: Number,
    min: [0, 'Available quantity cannot be negative'],
    default: 0
  },
  condition: {
    type: String,
    enum: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'],
    default: 'Good'
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  manufacturer: {
    type: String,
    trim: true
  },
  model: {
    type: String,
    trim: true
  },
  serialNumber: {
    type: String,
    trim: true,
    sparse: true
  },
  purchaseDate: {
    type: Date
  },
  price: {
    type: Number,
    min: 0
  },
  image: {
    type: String // URL or file path (for backward compatibility)
  },
  images: [{
    type: String // Array of image URLs or file paths
  }],
  specifications: {
    type: Map,
    of: String
  },
  maintenanceSchedule: {
    lastMaintenance: Date,
    nextMaintenance: Date
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'retired'],
    default: 'active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for created_date (for frontend compatibility)
equipmentSchema.virtual('created_date').get(function() {
  return this.createdAt;
});

// Index for faster searches
equipmentSchema.index({ name: 1, category: 1 });
equipmentSchema.index({ status: 1, available: 1 });

module.exports = mongoose.model('Equipment', equipmentSchema);
