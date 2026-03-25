const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['vehicle', 'weapon', 'ammunition', 'equipment', 'other'],
      required: true,
    },
    serialNumber: { type: String, unique: true, sparse: true, trim: true },
    base: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', required: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    assignedQuantity: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['available', 'assigned', 'maintenance', 'decommissioned'],
      default: 'available',
    },
    description: { type: String, trim: true },
    unit: { type: String, default: 'unit' },
  },
  { timestamps: true }
);

assetSchema.virtual('availableQuantity').get(function () {
  return this.quantity - this.assignedQuantity;
});

assetSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Asset', assetSchema);
