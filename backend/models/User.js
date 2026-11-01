const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    match: [/^[a-zA-Z0-9_.]+$/, 'Username cannot contain spaces or special characters']
  },
  bio: {
    type: String,
    default: 'Hey there! I am using Friends Table.'
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: ''
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    default: 'Available'
  },
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  allowNotifications: {
    type: Boolean,
    default: true
  },
  publicOnlineStatus: {
    type: Boolean,
    default: true
  },
  bestFriendId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  loverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deviceTokens: [{
    token: { type: String, required: true },
    platform: { type: String, enum: ['android', 'ios', 'web'], default: 'android' },
    updatedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// User search by name (regex search in /api/users/search)
UserSchema.index({ name: 1 });

module.exports = mongoose.model('User', UserSchema);
