const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

// DM conversation queries: find messages between two users, sorted by time
MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

// Table message queries + unread count (receiver = tableId)
MessageSchema.index({ receiver: 1, createdAt: -1 });

// Unread count filtering: find messages where user NOT in readBy
MessageSchema.index({ receiver: 1, readBy: 1 });

module.exports = mongoose.model('Message', MessageSchema);
