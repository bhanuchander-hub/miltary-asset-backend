const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: {
      type: String,
      enum: [
        'login', 'logout',
        'asset_created', 'asset_updated', 'asset_deleted',
        'transfer_requested', 'transfer_approved', 'transfer_rejected', 'transfer_completed',
        'assignment_created', 'assignment_returned', 'expenditure_recorded',
        'purchase_created',
        'user_created', 'user_updated', 'user_deleted',
        'base_created', 'base_updated', 'base_deleted',
      ],
      required: true,
    },
    resource: { type: String },
    resourceId: { type: mongoose.Schema.Types.ObjectId },
    details: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
    base: { type: mongoose.Schema.Types.ObjectId, ref: 'Base' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
