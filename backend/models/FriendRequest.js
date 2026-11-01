const mongoose = require('mongoose');

const FriendRequestSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, { timestamps: true });

// Pending requests lookup (used in /init)
FriendRequestSchema.index({ to: 1, status: 1 });

// Duplicate prevention: check if request already exists
FriendRequestSchema.index({ from: 1, to: 1 });

module.exports = mongoose.model('FriendRequest', FriendRequestSchema);
