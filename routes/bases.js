const express = require('express');
const router = express.Router();
const Base = require('../models/Base');
const { protect, authorize } = require('../middleware/auth');
const { logAction } = require('../middleware/auditLogger');

router.get('/', protect, async (req, res) => {
  const bases = await Base.find({ isActive: true }).sort({ name: 1 });
  res.json(bases);
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const base = await Base.create(req.body);
    await logAction(req.user, 'base_created', 'Base', base._id, { name: base.name });
    res.status(201).json(base);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Base name or code already exists' });
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const base = await Base.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!base) return res.status(404).json({ message: 'Base not found' });
    await logAction(req.user, 'base_updated', 'Base', base._id, req.body);
    res.json(base);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const base = await Base.findByIdAndDelete(req.params.id);
    if (!base) return res.status(404).json({ message: 'Base not found' });
    await logAction(req.user, 'base_deleted', 'Base', req.params.id, { name: base.name });
    res.json({ message: 'Base deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
