const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Table = require('../models/Table');
const auth = require('../middleware/auth');

// @route   GET /api/messages/unread-counts
// @desc    Get the number of unseen messages across chats strictly intended for current user
router.get('/unread-counts', auth, async (req, res) => {
  try {
    const userTables = await Table.find({ members: req.user }).select('_id');
    const userTableIds = userTables.map(t => t._id);

    const unreads = await Message.find({
      readBy: { $ne: req.user },
      sender: { $ne: req.user },
      $or: [
        { receiver: req.user },
        { receiver: { $in: userTableIds } }
      ]
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
    if (!chatId) {
      return res.status(400).json({ msg: 'chatId is required' });
    }

    if (chatType === 'table') {
      const isMember = await Table.exists({ _id: chatId, members: req.user });
      if (!isMember) {
        return res.status(403).json({ msg: 'Access denied: You are not a member of this table' });
      }

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
// @desc    Get messages for a specific table (Table members only) — cursor-paginated
router.get('/table/:tableId', auth, async (req, res) => {
  try {
    const isMember = await Table.exists({ _id: req.params.tableId, members: req.user });
    if (!isMember) {
      return res.status(403).json({ msg: 'Access denied: You are not a member of this table' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const query = { receiver: req.params.tableId };

    // Cursor: fetch messages older than the given ID
    if (req.query.before) {
      query._id = { $lt: req.query.before };
    }

    // Fetch limit+1 to check if there are more messages beyond this page
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop(); // Remove the extra probe message

    // Reverse to chronological order for the client
    messages.reverse();

    res.json({ messages, hasMore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/messages/:friendId
// @desc    Get messages between current user and a friend — cursor-paginated (MUST be last - catches all params)
router.get('/:friendId', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const query = {
      $or: [
        { sender: req.user, receiver: req.params.friendId },
        { sender: req.params.friendId, receiver: req.user }
      ]
    };

    // Cursor: fetch messages older than the given ID
    if (req.query.before) {
      query._id = { $lt: req.query.before };
    }

    // Fetch limit+1 to check if there are more messages beyond this page
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop(); // Remove the extra probe message

    // Reverse to chronological order for the client
    messages.reverse();

    res.json({ messages, hasMore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
