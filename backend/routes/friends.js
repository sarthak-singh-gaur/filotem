const express = require('express');
const router = express.Router();
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const auth = require('../middleware/auth');

// @route   POST /api/friends/request
// @desc    Send a friend request
router.post('/request', auth, async (req, res) => {
  const { toUserId } = req.body;
  if (!toUserId) return res.status(400).json({ msg: 'toUserId is required' });
  if (toUserId === req.user) return res.status(400).json({ msg: 'Cannot send request to yourself' });

  try {
    const existing = await FriendRequest.findOne({
      $or: [
        { from: req.user, to: toUserId, status: 'pending' },
        { from: toUserId, to: req.user, status: 'pending' }
      ]
    });
    if (existing) return res.status(400).json({ msg: 'Request already pending' });

    // Check if already friends
    const me = await User.findById(req.user);
    if (me.friends.includes(toUserId)) return res.status(400).json({ msg: 'Already friends' });

    const request = new FriendRequest({ from: req.user, to: toUserId });
    await request.save();
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/friends/requests
// @desc    Get pending friend requests for the current user
router.get('/requests', auth, async (req, res) => {
  try {
    const requests = await FriendRequest.find({ to: req.user, status: 'pending' })
      .populate('from', 'name username bio status');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   PUT /api/friends/requests/:id/accept
// @desc    Accept a friend request
router.put('/requests/:id/accept', auth, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ msg: 'Request not found' });
    if (request.to.toString() !== req.user) return res.status(403).json({ msg: 'Not authorized' });

    request.status = 'accepted';
    await request.save();

    // Add each other as friends
    await User.findByIdAndUpdate(request.from, { $addToSet: { friends: request.to } });
    await User.findByIdAndUpdate(request.to,   { $addToSet: { friends: request.from } });

    res.json({ msg: 'Friend request accepted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   PUT /api/friends/requests/:id/reject
// @desc    Reject a friend request
router.put('/requests/:id/reject', auth, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ msg: 'Request not found' });
    if (request.to.toString() !== req.user) return res.status(403).json({ msg: 'Not authorized' });

    request.status = 'rejected';
    await request.save();
    res.json({ msg: 'Friend request rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/friends
// @desc    Get current user's friends list
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).populate('friends', 'name username bio avatar publicOnlineStatus');
    const friendsWithStatus = user.friends.map(f => {
       const isOnline = f.publicOnlineStatus !== false && global.onlineUsers && global.onlineUsers.has(f._id.toString());
       return { ...f.toObject(), isOnline };
    });
    res.json(friendsWithStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   DELETE /api/friends/:friendId
// @desc    Remove a friend
router.delete('/:friendId', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user, { $pull: { friends: req.params.friendId } });
    await User.findByIdAndUpdate(req.params.friendId, { $pull: { friends: req.user } });
    res.json({ msg: 'Friend removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   PUT /api/friends/:id/block
// @desc    Block a user (also removes them from friends)
router.put('/:id/block', auth, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    if (targetUserId === req.user) return res.status(400).json({ msg: 'Cannot block yourself' });

    // Add to blockedUsers, remove from friends
    await User.findByIdAndUpdate(req.user, {
      $addToSet: { blockedUsers: targetUserId },
      $pull: { friends: targetUserId }
    });
    
    // Remove me from their friends list silently
    await User.findByIdAndUpdate(targetUserId, { $pull: { friends: req.user } });

    res.json({ msg: 'User blocked successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
