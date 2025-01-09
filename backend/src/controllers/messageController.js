// File: src/controllers/messageController.js
const Message = require('../models/Message');

const getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find().populate('sender', 'username');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching messages' });
  }
};

const deleteMessage = async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.messageId);
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting message' });
  }
};

module.exports = { getAllMessages, deleteMessage };