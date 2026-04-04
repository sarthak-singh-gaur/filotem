const express = require('express');
const router = express.Router();
const Table = require('../models/Table');
const auth = require('../middleware/auth');

// @route   POST /api/tables
// @desc    Create a new Group Table
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;
    if (!name) return res.status(400).json({ msg: 'Table name is required' });

    // The creator is automatically an admin and member
    const members = memberIds ? [...new Set([...memberIds, req.user])] : [req.user];

    const table = new Table({
      name,
      description,
      members,
      admins: [req.user]
    });

    await table.save();
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/tables
// @desc    Get user's tables
router.get('/', auth, async (req, res) => {
  try {
    const tables = await Table.find({ members: req.user }).populate('members', 'name username').populate('admins', 'name username');
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   PUT /api/tables/:id/add
// @desc    Add member to table (Admin only)
router.put('/:id/add', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ msg: 'Table not found' });
    
    const isActingAdmin = table.admins.some(a => a.toString() === req.user);
    if (!isActingAdmin) {
      return res.status(403).json({ msg: 'Only admins can add members' });
    }

    if (!table.members.includes(userId)) {
      table.members.push(userId);
      await table.save();
    }

    res.json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   PUT /api/tables/:id/promote
// @desc    Promote member to admin (Admin only)
router.put('/:id/promote', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ msg: 'Table not found' });
    
    const isActingAdmin = table.admins.some(a => a.toString() === req.user);
    if (!isActingAdmin) {
      return res.status(403).json({ msg: 'Only admins can promote members' });
    }

    if (table.members.includes(userId) && !table.admins.includes(userId)) {
      table.admins.push(userId);
      await table.save();
    }

    res.json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   PUT /api/tables/:id/update
// @desc    Update table settings (Admin only)
router.put('/:id/update', auth, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ msg: 'Table not found' });
    
    const isActingAdmin = table.admins.some(a => a.toString() === req.user);
    if (!isActingAdmin) {
      return res.status(403).json({ msg: 'Only admins can modify the table' });
    }

    if (name) table.name = name;
    if (avatar !== undefined) table.avatar = avatar;

    await table.save();
    
    // Broadcast the updated table info to all members' personal sockets
    const io = req.app.get('io');
    if (io && global.onlineUsers) {
      table.members.forEach(memberId => {
        const socketId = global.onlineUsers.get(memberId.toString());
        if (socketId) {
          io.to(socketId).emit('table_updated', table);
        }
      });
    }
    
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   DELETE /api/tables/:id/members/:memberId
// @desc    Kick member from table (Admin only)
router.delete('/:id/members/:memberId', auth, async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ msg: 'Table not found' });
    
    // Check if acting user is admin (Robust check)
    const isActingAdmin = table.admins.some(a => a.toString() === req.user);
    if (!isActingAdmin) {
      return res.status(403).json({ msg: 'Only admins can kick members' });
    }

    // Admins cannot kick other admins for now (prevent lockouts)
    const isTargetAdmin = table.admins.some(a => a.toString() === req.params.memberId);
    if (isTargetAdmin && req.user !== req.params.memberId) {
      return res.status(403).json({ msg: 'Cannot kick another admin' });
    }

    // Pull from members and admins
    table.members.pull(req.params.memberId);
    table.admins.pull(req.params.memberId);
    
    await table.save();
    res.json({ msg: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   DELETE /api/tables/:id
// @desc    Delete entire table (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ msg: 'Table not found' });

    // Check if acting user is admin
    const isActingAdmin = table.admins.some(a => a.toString() === req.user);
    if (!isActingAdmin) {
      return res.status(403).json({ msg: 'Only admins can delete the table' });
    }

    await Table.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Table deleted permanently' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
