const Message = require('../models/Message');

// Map of userId -> Set<socketId>
global.onlineUsers = new Map();

module.exports = function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Register user so we can route messages to them
    socket.on('register_user', (userId) => {
      if (!global.onlineUsers.has(userId)) {
        global.onlineUsers.set(userId, new Set());
        io.emit('user_online', userId);
      }
      global.onlineUsers.get(userId).add(socket.id);
      socket.userId = userId;
      socket.join(userId.toString()); // Group by userId room
      console.log(`👤 User ${userId} registered with socket ${socket.id}`);
    });

    // Send a message
    socket.on('send_message', async (data) => {
      const { senderId, receiverId, text } = data;

      try {
        const message = new Message({ sender: senderId, receiver: receiverId, text });
        await message.save();

        if (data.chatType === 'table') {
          // Broadcast to all users in the table room except the sender
          socket.to(receiverId).emit('receive_message', {
            _id: message._id,
            sender: senderId,
            receiver: receiverId,
            text,
            chatType: 'table',
            createdAt: message.createdAt
          });
        } else {
          // Emit to the receiver's personal user room
          io.to(receiverId.toString()).emit('receive_message', {
            _id: message._id,
            sender: senderId,
            receiver: receiverId,
            text,
            chatType: 'friend',
            createdAt: message.createdAt
          });
        }

        // Acknowledge back to sender
        socket.emit('message_sent', {
          _id: message._id,
          tempId: data.tempId, // Echo back for UI replacement
          sender: senderId,
          receiver: receiverId,
          text,
          chatType: data.chatType,
          createdAt: message.createdAt
        });
      } catch (err) {
        console.error('Socket send_message error:', err.message);
        socket.emit('message_error', { error: err.message });
      }
    });

    socket.on('messages_read', (data) => {
      const { senderId, receiverId, chatType } = data;
      if (chatType === 'table') {
         socket.to(receiverId).emit('messages_read_receipt', { friendId: socket.userId, tableId: receiverId });
      } else {
         // Emit to original sender's personal room
         io.to(receiverId.toString()).emit('messages_read_receipt', { friendId: socket.userId });
      }
    });

    socket.on('join_table', (tableId) => {
      socket.join(tableId);
      console.log(`👤 User ${socket.id} joined table ${tableId}`);
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
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
};
