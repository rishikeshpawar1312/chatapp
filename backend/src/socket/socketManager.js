// File: src/socket/socketManager.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

class SocketManager {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map();
  }

  authenticate = async (socket, next) => {
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
  };

  broadcastUserList = () => {
    const users = Array.from(this.connectedUsers.values()).map(user => ({
      id: user.id,
      username: user.username,
      role: user.role
    }));
    this.io.emit('users', users);
  };

  handleConnection = (socket) => {
    console.log('User connected:', socket.user.username);
    this.connectedUsers.set(socket.id, socket.user);
    this.broadcastUserList();

    socket.on('sendMessage', this.handleMessage(socket));
    socket.on('deleteMessage', this.handleDeleteMessage(socket));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  };

  handleMessage = (socket) => async (messageData) => {
    try {
      const message = new Message({
        content: messageData.content,
        sender: socket.user.id
      });
      await message.save();
      const populatedMessage = await Message.findById(message._id).populate('sender', 'username');
      this.io.emit('message', {
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
  };

  handleDeleteMessage = (socket) => async (messageId) => {
    if (socket.user.role === 'admin') {
      try {
        await Message.findByIdAndDelete(messageId);
        this.io.emit('messageDeleted', messageId);
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }
  };

  handleDisconnect = (socket) => {
    console.log('User disconnected:', socket.user.username);
    this.connectedUsers.delete(socket.id);
    this.broadcastUserList();
  };
}

module.exports = SocketManager;