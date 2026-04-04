const express = require('express');
const router = express.Router();
const BadgeRequest = require('../models/BadgeRequest');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST /api/badges/request
// @desc    Send a badge request (bestFriend or lover)
router.post('/request', auth, async (req, res) => {
  const { toUserId, type } = req.body;
  if (!toUserId || !type) return res.status(400).json({ msg: 'toUserId and type are required' });
  if (!['bestFriend', 'lover'].includes(type)) return res.status(400).json({ msg: 'Invalid badge type' });
  if (toUserId === req.user) return res.status(400).json({ msg: 'Cannot send badge request to yourself' });

  try {
    // Check for existing pending request of same type between these users
    const existing = await BadgeRequest.findOne({
      $or: [
        { from: req.user, to: toUserId, type, status: 'pending' },
        { from: toUserId, to: req.user, type, status: 'pending' }
      ]
    });
    if (existing) return res.status(400).json({ msg: 'A pending request of this type already exists' });

    const request = new BadgeRequest({ from: req.user, to: toUserId, type });
    await request.save();
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/badges/requests
// @desc    Get all badge requests (incoming + outgoing)
router.get('/requests', auth, async (req, res) => {
  try {
    const incoming = await BadgeRequest.find({ to: req.user, status: 'pending' })
      .populate('from', 'name username avatar');
    const outgoing = await BadgeRequest.find({ from: req.user, status: 'pending' })
      .populate('to', 'name username avatar');
    res.json({ incoming, outgoing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   PUT /api/badges/requests/:id/accept
// @desc    Accept a badge request
router.put('/requests/:id/accept', auth, async (req, res) => {
  try {
    const request = await BadgeRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ msg: 'Request not found' });
    if (request.to.toString() !== req.user) return res.status(403).json({ msg: 'Not authorized' });
    if (request.status !== 'pending') return res.status(400).json({ msg: 'Request is no longer pending' });

    const fieldName = request.type === 'bestFriend' ? 'bestFriendId' : 'loverId';

    // Clear old badges of this type for BOTH users
    await User.updateMany(
      { [fieldName]: { $in: [request.from, request.to] } },
      { $set: { [fieldName]: null } }
    );
    // Also clear reverse — if someone else had either user as their badge
    await User.updateMany(
      { _id: { $in: [request.from, request.to] } },
      { $set: { [fieldName]: null } }
    );

    // Set the mutual badge
    await User.findByIdAndUpdate(request.from, { [fieldName]: request.to });
    await User.findByIdAndUpdate(request.to, { [fieldName]: request.from });

    // Mark request as accepted
    request.status = 'accepted';
    await request.save();

    // Clean up any other pending requests of same type involving either user
    await BadgeRequest.updateMany(
      {
        _id: { $ne: request._id },
        type: request.type,
        status: 'pending',
        $or: [
          { from: request.from }, { to: request.from },
          { from: request.to }, { to: request.to }
        ]
      },
      { status: 'rejected' }
    );

    res.json({ msg: 'Badge accepted! You are now connected.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   PUT /api/badges/requests/:id/reject
// @desc    Reject a badge request
router.put('/requests/:id/reject', auth, async (req, res) => {
  try {
    const request = await BadgeRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ msg: 'Request not found' });
    if (request.to.toString() !== req.user) return res.status(403).json({ msg: 'Not authorized' });

    request.status = 'rejected';
    await request.save();
    res.json({ msg: 'Badge request rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   DELETE /api/badges/remove/:type
// @desc    Remove your own badge (unilateral removal for both)
router.delete('/remove/:type', auth, async (req, res) => {
  const { type } = req.params;
  if (!['bestFriend', 'lover'].includes(type)) return res.status(400).json({ msg: 'Invalid badge type' });

  try {
    const fieldName = type === 'bestFriend' ? 'bestFriendId' : 'loverId';
    const me = await User.findById(req.user);
    const partnerId = me[fieldName];

    if (!partnerId) return res.status(400).json({ msg: 'You do not have this badge assigned' });

    // Remove from both users
    await User.findByIdAndUpdate(req.user, { [fieldName]: null });
    await User.findByIdAndUpdate(partnerId, { [fieldName]: null });

    res.json({ msg: 'Badge removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/badges/status
// @desc    Get current badge status with populated partner info
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user)
      .populate('bestFriendId', 'name username avatar')
      .populate('loverId', 'name username avatar');
    res.json({
      bestFriend: user.bestFriendId || null,
      lover: user.loverId || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
