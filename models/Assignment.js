const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    base: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', required: true },
    assignedTo: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    quantityExpended: { type: Number, default: 0, min: 0 },
    purpose: { type: String, trim: true },
    status: {
      type: String,
      enum: ['active', 'returned', 'expended'],
      default: 'active',
    },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    returnedAt: { type: Date },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Assignment', assignmentSchema);
