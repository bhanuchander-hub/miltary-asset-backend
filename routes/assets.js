const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const { protect, authorize } = require('../middleware/auth');
const { logAction } = require('../middleware/auditLogger');

router.get('/', protect, async (req, res) => {
  const filter = {};
  if (req.query.base) filter.base = req.query.base;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;

  if (req.user.role !== 'admin' && req.user.base) {
    filter.base = req.user.base._id;
  }

  const assets = await Asset.find(filter).populate('base', 'name code').sort({ type: 1, name: 1 });
  res.json(assets);
});


router.get('/summary', protect, async (req, res) => {
  const baseFilter = req.user.role !== 'admin' && req.user.base ? { base: req.user.base._id } : {};

  const [totalAssets, byType, lowStock] = await Promise.all([
    Asset.countDocuments(baseFilter),
    Asset.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$type', total: { $sum: '$quantity' }, assigned: { $sum: '$assignedQuantity' } } },
    ]),
    Asset.find({ ...baseFilter, quantity: { $lte: 5 } }).populate('base', 'name'),
  ]);

  res.json({ totalAssets, byType, lowStock });
});


router.get('/:id', protect, async (req, res) => {
  const asset = await Asset.findById(req.params.id).populate('base', 'name code');
  if (!asset) return res.status(404).json({ message: 'Asset not found' });
  res.json(asset);
});


router.post('/', protect, authorize('admin', 'logistics'), async (req, res) => {
  try {
    const asset = await Asset.create(req.body);
    await logAction(req.user, 'asset_created', 'Asset', asset._id, { name: asset.name, type: asset.type });
    res.status(201).json(asset);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Serial number already exists' });
    res.status(400).json({ message: err.message });
  }
});


router.put('/:id', protect, authorize('admin', 'logistics'), async (req, res) => {
  try {
    const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    await logAction(req.user, 'asset_updated', 'Asset', asset._id, req.body);
    res.json(asset);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const asset = await Asset.findByIdAndDelete(req.params.id);
  if (!asset) return res.status(404).json({ message: 'Asset not found' });
  await logAction(req.user, 'asset_deleted', 'Asset', asset._id, { name: asset.name });
  res.json({ message: 'Asset deleted' });
});

module.exports = router;
