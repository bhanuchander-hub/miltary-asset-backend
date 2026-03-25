const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { logAction } = require('../middleware/auditLogger');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password required' });

  const user = await User.findOne({ email, isActive: true }).populate('base');
  if (!user || !(await user.comparePassword(password)))
    return res.status(401).json({ message: 'Invalid credentials' });

  await logAction(user, 'login', 'User', user._id, { email });
  res.json({ token: signToken(user._id), user });
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json(req.user));

// POST /api/auth/register (admin only)
router.post('/register', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.create(req.body);
    await logAction(req.user, 'user_created', 'User', user._id, { email: user.email, role: user.role });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Email already exists' });
    res.status(400).json({ message: err.message });
  }
});

// GET /api/auth/users (admin only)
router.get('/users', protect, authorize('admin'), async (req, res) => {
  const users = await User.find().populate('base', 'name code').sort({ createdAt: -1 });
  res.json(users);
});

// DELETE /api/auth/users/:id (admin only)
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    await User.findByIdAndDelete(req.params.id);
    await logAction(req.user, 'user_deleted', 'User', req.params.id, { email: user.email });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
