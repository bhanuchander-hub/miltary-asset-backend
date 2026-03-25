const express = require('express');
const router = express.Router();
const Transfer = require('../models/Transfer');
const Asset = require('../models/Asset');
const { protect, authorize } = require('../middleware/auth');
const { logAction } = require('../middleware/auditLogger');

router.get('/', protect, async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.user.role !== 'admin' && req.user.base) {
    filter.$or = [{ fromBase: req.user.base._id }, { toBase: req.user.base._id }];
  }
  const transfers = await Transfer.find(filter)
    .populate('asset', 'name type')
    .populate('fromBase', 'name code')
    .populate('toBase', 'name code')
    .populate('requestedBy', 'name role')
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 });
  res.json(transfers);
});


router.post('/', protect, authorize('admin', 'logistics', 'commander'), async (req, res) => {
  try {
    const { asset: assetId, fromBase, toBase, quantity, reason } = req.body;
    const asset = await Asset.findById(assetId);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    if (asset.availableQuantity < quantity)
      return res.status(400).json({ message: 'Insufficient available quantity' });

    const transfer = await Transfer.create({
      asset: assetId, fromBase, toBase, quantity, reason,
      requestedBy: req.user._id,
    });
    await logAction(req.user, 'transfer_requested', 'Transfer', transfer._id, { assetId, quantity });
    res.status(201).json(transfer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


router.put('/:id/approve', protect, authorize('admin', 'commander'), async (req, res) => {
  const transfer = await Transfer.findById(req.params.id).populate('asset');
  if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
  if (transfer.status !== 'pending') return res.status(400).json({ message: 'Transfer is not pending' });

  transfer.status = 'approved';
  transfer.approvedBy = req.user._id;
  transfer.approvedAt = new Date();
  await transfer.save();

  
  await Asset.findByIdAndUpdate(transfer.asset._id, { $inc: { quantity: -transfer.quantity } });
  
  let destAsset = await Asset.findOne({ name: transfer.asset.name, base: transfer.toBase });
  if (destAsset) {
    destAsset.quantity += transfer.quantity;
    await destAsset.save();
  } else {
    await Asset.create({
      name: transfer.asset.name,
      type: transfer.asset.type,
      base: transfer.toBase,
      quantity: transfer.quantity,
      description: transfer.asset.description,
      unit: transfer.asset.unit,
    });
  }

  transfer.status = 'completed';
  await transfer.save();
  await logAction(req.user, 'transfer_approved', 'Transfer', transfer._id, {});
  res.json(transfer);
});


router.put('/:id/reject', protect, authorize('admin', 'commander'), async (req, res) => {
  const transfer = await Transfer.findById(req.params.id);
  if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
  if (transfer.status !== 'pending') return res.status(400).json({ message: 'Transfer is not pending' });

  transfer.status = 'rejected';
  transfer.approvedBy = req.user._id;
  transfer.approvedAt = new Date();
  transfer.notes = req.body.notes || '';
  await transfer.save();
  await logAction(req.user, 'transfer_rejected', 'Transfer', transfer._id, {});
  res.json(transfer);
});

module.exports = router;
