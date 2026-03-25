const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    base: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', required: true },
    quantity: { type: Number, required: true, min: 1 },
    supplier: { type: String, trim: true },
    invoiceNumber: { type: String, trim: true },
    unitCost: { type: Number, min: 0 },
    totalCost: { type: Number, min: 0 },
    purchasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

purchaseSchema.pre('save', function (next) {
  if (this.unitCost && this.quantity) {
    this.totalCost = this.unitCost * this.quantity;
  }
  next();
});

module.exports = mongoose.model('Purchase', purchaseSchema);
