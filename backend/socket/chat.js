const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Table = require('../models/Table');
const User = require('../models/User');
const logger = require('../utils/logger');
const { sendPushNotification } = require('../services/pushNotification');

// Map of userId -> Set<socketId>
global.onlineUsers = new Map();

module.exports = function setupSocket(io) {
  // Enforce JWT authentication on socket connection
  io.use((socket, next) => {
    let token = socket.handshake.auth?.token || socket.handshake.headers?.['x-auth-token'];
    if (!token && socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id.toString();
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`🔌 Socket connected: ${socket.id} (Authenticated User: ${socket.userId})`);

    const userId = socket.userId;

    // Automatically register online user into their personal room
    if (!global.onlineUsers.has(userId)) {
      global.onlineUsers.set(userId, new Set());
      io.emit('user_online', userId);
    }
    global.onlineUsers.get(userId).add(socket.id);
    socket.join(userId);

    // Keep backwards compatibility with client register_user event
    socket.on('register_user', (clientUserId) => {
      if (clientUserId !== socket.userId) {
        logger.warn(`User ${socket.userId} attempted to register as ${clientUserId} - spoof attempt blocked.`);
      }
    });

    // Send a message
    socket.on('send_message', async (data) => {
      // NEVER trust data.senderId from client; enforce authenticated socket.userId
      const senderId = socket.userId;
      const { receiverId, text, chatType, tempId } = data;

      if (!receiverId || !text || !text.trim()) {
        return socket.emit('message_error', { error: 'Receiver and text are required' });
      }

      try {
        const senderUser = await User.findById(senderId).select('name');
        const senderName = senderUser ? senderUser.name : 'Filotem User';

        if (chatType === 'table') {
          // Authorize: Ensure sender is a member of the table
          const table = await Table.findById(receiverId).select('name members');
          const isMember = table && table.members.some(m => m.toString() === senderId);
          if (!isMember) {
            return socket.emit('message_error', { error: 'Access denied: You are not a member of this table' });
          }

          const message = new Message({ sender: senderId, receiver: receiverId, text: text.trim() });
          await message.save();

          // Broadcast to all users in the table room except the sender
          socket.to(receiverId).emit('receive_message', {
            _id: message._id,
            sender: senderId,
            receiver: receiverId,
            text: message.text,
            chatType: 'table',
            createdAt: message.createdAt
          });

          // Acknowledge back to sender
          socket.emit('message_sent', {
            _id: message._id,
            tempId,
            sender: senderId,
            receiver: receiverId,
            text: message.text,
            chatType: 'table',
            createdAt: message.createdAt
          });

          // Dispatch push notifications to table members who are currently offline
          const offlineMembers = table.members
            .map(m => m.toString())
            .filter(memberId => memberId !== senderId && !global.onlineUsers.has(memberId));

          if (offlineMembers.length > 0) {
            sendPushNotification(offlineMembers, {
              title: table.name,
              body: `${senderName}: ${message.text}`,
              data: { chatId: receiverId, chatType: 'table' }
            }).catch(e => logger.error('Push notification error (table):', e));
          }
        } else {
          const message = new Message({ sender: senderId, receiver: receiverId, text: text.trim() });
          await message.save();

          // Emit to the receiver's personal user room
          io.to(receiverId.toString()).emit('receive_message', {
            _id: message._id,
            sender: senderId,
            receiver: receiverId,
            text: message.text,
            chatType: 'friend',
            createdAt: message.createdAt
          });

          // Acknowledge back to sender
          socket.emit('message_sent', {
            _id: message._id,
            tempId,
            sender: senderId,
            receiver: receiverId,
            text: message.text,
            chatType: 'friend',
            createdAt: message.createdAt
          });

          // Dispatch push notification if recipient is offline
          if (!global.onlineUsers.has(receiverId.toString())) {
            sendPushNotification(receiverId, {
              title: senderName,
              body: message.text,
              data: { chatId: senderId, chatType: 'friend' }
            }).catch(e => logger.error('Push notification error (direct):', e));
          }
        }
      } catch (err) {
        logger.error('Socket send_message error:', err);
        socket.emit('message_error', { error: err.message });
      }
    });

    socket.on('messages_read', (data) => {
      const { receiverId, chatType } = data;
      if (chatType === 'table') {
        socket.to(receiverId).emit('messages_read_receipt', { friendId: socket.userId, tableId: receiverId });
      } else {
        io.to(receiverId.toString()).emit('messages_read_receipt', { friendId: socket.userId });
      }
    });

    // Authorize joining table room
    socket.on('join_table', async (tableId) => {
      try {
        const isMember = await Table.exists({ _id: tableId, members: socket.userId });
        if (isMember) {
          socket.join(tableId);
          logger.debug(`User ${socket.userId} joined table room ${tableId}`);
        } else {
          socket.emit('message_error', { error: 'Cannot join room: Not a member of this table' });
        }
      } catch (err) {
        logger.error('Socket join_table error:', err.message);
      }
    });

    socket.on('leave_table', (tableId) => {
      socket.leave(tableId);
    });

    socket.on('disconnect', () => {
      if (socket.userId && global.onlineUsers.has(socket.userId)) {
        const sockets = global.onlineUsers.get(socket.userId);
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          global.onlineUsers.delete(socket.userId);
          io.emit('user_offline', socket.userId);
        }
      }
      logger.info(`🔌 Socket disconnected: ${socket.id} (User: ${socket.userId})`);
    });
  });
};
