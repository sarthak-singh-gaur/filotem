const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  avatar: {
    type: String,
    default: ''
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isDirectMessage: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// "Find tables I belong to" — used in /init, /tables, unread-counts
TableSchema.index({ members: 1 });

module.exports = mongoose.model('Table', TableSchema);
