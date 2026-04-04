const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   GET /api/users/search?q=term
// @desc    Search users by username or name
router.get('/search', auth, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ msg: 'Search query required' });

  try {
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } }
      ]
    })
      .select('-password')
      .limit(20);

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user profile (name, bio, status)
router.put('/:id', auth, async (req, res) => {
  if (req.user !== req.params.id) {
    return res.status(403).json({ msg: 'Not authorized' });
  }

  const { name, username, bio, status, avatar, allowNotifications, publicOnlineStatus } = req.body;
  const updateFields = {};
  if (name)   updateFields.name   = name;
  if (username) updateFields.username = username;
  if (bio !== undefined) updateFields.bio = bio;
  if (status) updateFields.status = status;
  if (avatar !== undefined) updateFields.avatar = avatar;
  if (typeof allowNotifications === 'boolean') updateFields.allowNotifications = allowNotifications;
  if (typeof publicOnlineStatus === 'boolean') updateFields.publicOnlineStatus = publicOnlineStatus;

  try {
    const user = await User.findByIdAndUpdate(req.params.id, updateFields, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
