const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const Asset = require('../models/Asset');
const { protect, authorize } = require('../middleware/auth');
const { logAction } = require('../middleware/auditLogger');

// GET /api/purchases
router.get('/', protect, async (req, res) => {
  const filter = {};
  if (req.user.role !== 'admin' && req.user.base) filter.base = req.user.base._id;

  const purchases = await Purchase.find(filter)
    .populate('asset', 'name type unit')
    .populate('base', 'name code')
    .populate('purchasedBy', 'name')
    .sort({ createdAt: -1 });
  res.json(purchases);
});

// POST /api/purchases - add new stock
router.post('/', protect, authorize('admin', 'logistics'), async (req, res) => {
  try {
    const { asset: assetId, quantity } = req.body;
    const asset = await Asset.findById(assetId);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const purchase = await Purchase.create({ ...req.body, purchasedBy: req.user._id });

    // Increase asset quantity
    asset.quantity += quantity;
    await asset.save();

    await logAction(req.user, 'purchase_created', 'Purchase', purchase._id, { assetId, quantity });
    res.status(201).json(purchase);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
