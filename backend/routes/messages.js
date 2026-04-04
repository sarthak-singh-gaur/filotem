const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// @route   GET /api/messages/unread-counts
// @desc    Get the number of unseen messages across all chats explicitly
router.get('/unread-counts', auth, async (req, res) => {
  try {
    const unreads = await Message.find({
      readBy: { $ne: req.user },
      sender: { $ne: req.user }
    });

    const counts = {};
    for (let msg of unreads) {
      if (msg.receiver.toString() === req.user) {
        counts[msg.sender.toString()] = (counts[msg.sender.toString()] || 0) + 1;
      } else {
        counts[msg.receiver.toString()] = (counts[msg.receiver.toString()] || 0) + 1;
      }
    }
    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   PUT /api/messages/read
// @desc    Bulk append current user to readBy array for active chat viewport Focus
router.put('/read', auth, async (req, res) => {
  try {
    const { chatId, chatType } = req.body;
    if (chatType === 'table') {
      await Message.updateMany(
        { receiver: chatId, readBy: { $ne: req.user } },
        { $addToSet: { readBy: req.user } }
      );
    } else {
      await Message.updateMany(
        { sender: chatId, receiver: req.user, readBy: { $ne: req.user } },
        { $addToSet: { readBy: req.user } }
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/messages/table/:tableId
// @desc    Get messages for a specific table
router.get('/table/:tableId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      receiver: req.params.tableId
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/messages/:friendId
// @desc    Get messages between current user and a friend (MUST be last - catches all params)
router.get('/:friendId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user, receiver: req.params.friendId },
        { sender: req.params.friendId, receiver: req.user }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
