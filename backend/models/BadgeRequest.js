const mongoose = require('mongoose');

const BadgeRequestSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['bestFriend', 'lover'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, { timestamps: true });

// Pending badge requests lookup (used in /init)
BadgeRequestSchema.index({ to: 1, status: 1 });

// Duplicate prevention: check existing badge request of same type
BadgeRequestSchema.index({ from: 1, to: 1, type: 1 });

module.exports = mongoose.model('BadgeRequest', BadgeRequestSchema);
