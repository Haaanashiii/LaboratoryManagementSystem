const mongoose = require('mongoose');

const equipmentHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['added', 'deleted', 'quantity_changed', 'published', 'unpublished'],
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    performedByName: {
      type: String,
      default: 'Unknown',
    },
    equipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    equipmentName: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: '',
    },
    previousQuantity: {
      type: Number,
      default: null,
    },
    newQuantity: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

equipmentHistorySchema.index({ createdAt: -1 });
equipmentHistorySchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('EquipmentHistory', equipmentHistorySchema);
