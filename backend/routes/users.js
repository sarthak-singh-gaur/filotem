const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Table = require('../models/Table');
const FriendRequest = require('../models/FriendRequest');
const BadgeRequest = require('../models/BadgeRequest');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// @route   GET /api/users/init
// @desc    Bulk fetch all startup data (Friends, Tables, Requests, Unreads)
router.get('/init', auth, async (req, res) => {
  try {
    const [user, tables, requests, badgeRequests] = await Promise.all([
      // 1. User with friends
      User.findById(req.user).populate('friends', 'name username bio avatar publicOnlineStatus'),
      
      // 2. Tables member of
      Table.find({ members: req.user }).populate('members', 'name username').populate('admins', 'name username'),
      
      // 3. Friend requests
      FriendRequest.find({ to: req.user, status: 'pending' }).populate('from', 'name username bio status'),
      
      // 4. Badge requests (Incoming)
      BadgeRequest.find({ to: req.user, status: 'pending' }).populate('from', 'name username avatar')
    ]);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const userTableIds = tables.map(t => t._id);

    // 5. Unread message counts strictly for this user (direct messages or tables they belong to)
    const unreads = await Message.find({
      readBy: { $ne: req.user },
      sender: { $ne: req.user },
      $or: [
        { receiver: req.user },
        { receiver: { $in: userTableIds } }
      ]
    });

    // Format friends with online status
    const friendsWithStatus = (user.friends || []).map(f => {
       const isOnline = f.publicOnlineStatus !== false && global.onlineUsers && global.onlineUsers.has(f._id.toString());
       return { ...f.toObject(), isOnline };
    });

    // Format unread counts
    const unreadCounts = {};
    for (let msg of unreads) {
      if (msg.receiver.toString() === req.user) {
        unreadCounts[msg.sender.toString()] = (unreadCounts[msg.sender.toString()] || 0) + 1;
      } else {
        unreadCounts[msg.receiver.toString()] = (unreadCounts[msg.receiver.toString()] || 0) + 1;
      }
    }

    res.json({
      friends: friendsWithStatus,
      tables,
      friendRequests: requests,
      badgeRequests,
      unreadCounts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// @route   POST /api/users/device-token
// @desc    Register or update an FCM push device token for current user
router.post('/device-token', auth, async (req, res) => {
  try {
    const { token, platform = 'android' } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Device token is required' });
    }

    // Pull any existing entry with the same token, then push fresh token entry
    await User.findByIdAndUpdate(req.user, {
      $pull: { deviceTokens: { token } }
    });

    await User.findByIdAndUpdate(req.user, {
      $push: {
        deviceTokens: {
          token,
          platform,
          updatedAt: new Date()
        }
      }
    });

    res.json({ success: true, msg: 'Device token registered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   DELETE /api/users/device-token
// @desc    Unregister a device token on logout
router.delete('/device-token', auth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Device token is required' });
    }

    await User.findByIdAndUpdate(req.user, {
      $pull: { deviceTokens: { token } }
    });

    res.json({ success: true, msg: 'Device token unregistered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
