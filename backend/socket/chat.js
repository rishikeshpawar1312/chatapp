const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

const connectedUsers = new Map();

const broadcastUserList = (io) => {
  const users = Array.from(connectedUsers.values()).map(user => ({
    id: user.id,
    username: user.username,
    role: user.role
  }));
  io.emit('users', users);
};

const setupSocket = (io) => {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.id);
      
      if (!user || !user.isActive) {
        return next(new Error('Authentication error'));
      }
      
      socket.user = {
        id: user._id,
        username: user.username,
        role: user.role
      };
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.user.username);
    
    connectedUsers.set(socket.id, socket.user);
    broadcastUserList(io);

    socket.on('sendMessage', async (messageData) => {
      try {
        const message = new Message({
          content: messageData.content,
          sender: socket.user.id
        });
        await message.save();
        const populatedMessage = await Message.findById(message._id).populate('sender', 'username');
        io.emit('message', {
          id: message._id,
          content: populatedMessage.content,
          sender: {
            username: populatedMessage.sender.username,
            id: populatedMessage.sender._id,
            role: socket.user.role
          }
        });
      } catch (error) {
        console.error('Error saving message:', error);
      }
    });

    socket.on('deleteMessage', async (messageId) => {
      if (socket.user.role === 'admin') {
        try {
          await Message.findByIdAndDelete(messageId);
          io.emit('messageDeleted', messageId);
        } catch (error) {
          console.error('Error deleting message:', error);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.user.username);
      connectedUsers.delete(socket.id);
      broadcastUserList(io);
    });
  });
};

module.exports = setupSocket;