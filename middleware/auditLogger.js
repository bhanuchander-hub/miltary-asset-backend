const AuditLog = require('../models/AuditLog');

const logAction = async (user, action, resource, resourceId, details, base) => {
  try {
    await AuditLog.create({
      user: user?._id,
      action,
      resource,
      resourceId,
      details,
      base: base || user?.base?._id,
    });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

module.exports = { logAction };
