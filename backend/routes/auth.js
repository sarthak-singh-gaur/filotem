const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register new user
router.post('/register', async (req, res) => {
  const { name, username, email, password } = req.body;

  if (!name || !username || !email || !password) {
    return res.status(400).json({ msg: 'Please enter all fields' });
  }

  if (/\s/.test(username)) {
    return res.status(400).json({ msg: 'Username cannot contain spaces' });
  }

  try {
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) return res.status(400).json({ msg: 'User with this email or username already exists' });

    const newUser = new User({ name, username, email, password });

    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(password, salt);

    const savedUser = await newUser.save();

    jwt.sign(
      { id: savedUser.id },
      process.env.JWT_SECRET || 'fallback_secret_xyz123',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: savedUser.id,
            name: savedUser.name,
            username: savedUser.username,
            bio: savedUser.bio,
            email: savedUser.email,
            status: savedUser.status,
            avatar: savedUser.avatar,
            allowNotifications: savedUser.allowNotifications,
            publicOnlineStatus: savedUser.publicOnlineStatus,
            bestFriendId: savedUser.bestFriendId,
            loverId: savedUser.loverId
          }
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & return token
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ msg: 'Please enter all fields' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: 'User does not exist' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'fallback_secret_xyz123',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            username: user.username,
            bio: user.bio,
            email: user.email,
            status: user.status,
            avatar: user.avatar,
            allowNotifications: user.allowNotifications,
            publicOnlineStatus: user.publicOnlineStatus,
            bestFriendId: user.bestFriendId,
            loverId: user.loverId
          }
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get user by token
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json({
      id: user.id,
      name: user.name,
      username: user.username,
      bio: user.bio,
      email: user.email,
      status: user.status,
      avatar: user.avatar,
      allowNotifications: user.allowNotifications,
      publicOnlineStatus: user.publicOnlineStatus,
      bestFriendId: user.bestFriendId,
      loverId: user.loverId
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/auth/badges
// @desc    Set Best Friend or Lover badge
router.put('/badges', auth, async (req, res) => {
  const { type, targetId } = req.body; // type: 'bestFriend', 'lover'

  if (!['bestFriend', 'lover'].includes(type)) {
    return res.status(400).json({ msg: 'Invalid badge type' });
  }

  try {
    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const fieldName = type === 'bestFriend' ? 'bestFriendId' : 'loverId';

    // Toggle logic: If same person, remove. If different, replace.
    if (user[fieldName]?.toString() === targetId) {
       user[fieldName] = null;
    } else {
       user[fieldName] = targetId;
    }

    await user.save();
    res.json({
      msg: `Badge updated successfully`,
      bestFriendId: user.bestFriendId,
      loverId: user.loverId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
