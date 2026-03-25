const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const Asset = require('../models/Asset');
const { protect, authorize } = require('../middleware/auth');
const { logAction } = require('../middleware/auditLogger');

router.get('/', protect, async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.asset) filter.asset = req.query.asset;
  if (req.user.role !== 'admin' && req.user.base) filter.base = req.user.base._id;

  const assignments = await Assignment.find(filter)
    .populate('asset', 'name type unit')
    .populate('base', 'name code')
    .populate('assignedBy', 'name')
    .sort({ createdAt: -1 });
  res.json(assignments);
});


router.post('/', protect, authorize('admin', 'logistics'), async (req, res) => {
  try {
    const { asset: assetId, quantity } = req.body;
    const asset = await Asset.findById(assetId);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    if (asset.availableQuantity < quantity)
      return res.status(400).json({ message: 'Insufficient available quantity' });

    const assignment = await Assignment.create({ ...req.body, assignedBy: req.user._id });
    asset.assignedQuantity += quantity;
    await asset.save();
    await logAction(req.user, 'assignment_created', 'Assignment', assignment._id, { assetId, quantity });
    res.status(201).json(assignment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


router.put('/:id/return', protect, authorize('admin', 'logistics'), async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
  if (assignment.status !== 'active') return res.status(400).json({ message: 'Assignment is not active' });

  assignment.status = 'returned';
  assignment.returnedAt = new Date();
  assignment.notes = req.body.notes || assignment.notes;
  await assignment.save();

  await Asset.findByIdAndUpdate(assignment.asset, { $inc: { assignedQuantity: -assignment.quantity } });
  await logAction(req.user, 'assignment_returned', 'Assignment', assignment._id, {});
  res.json(assignment);
});

router.put('/:id/expend', protect, authorize('admin', 'logistics'), async (req, res) => {
  const { quantityExpended } = req.body;
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
  if (assignment.status !== 'active') return res.status(400).json({ message: 'Assignment is not active' });
  if (quantityExpended > assignment.quantity - assignment.quantityExpended)
    return res.status(400).json({ message: 'Expended quantity exceeds remaining' });

  assignment.quantityExpended += quantityExpended;
  if (assignment.quantityExpended >= assignment.quantity) {
    assignment.status = 'expended';
    await Asset.findByIdAndUpdate(assignment.asset, {
      $inc: { assignedQuantity: -assignment.quantity, quantity: -assignment.quantity },
    });
  }
  await assignment.save();
  await logAction(req.user, 'expenditure_recorded', 'Assignment', assignment._id, { quantityExpended });
  res.json(assignment);
});

module.exports = router;
