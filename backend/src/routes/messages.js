// File: src/routes/messages.js
const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { getAllMessages, deleteMessage } = require('../controllers/messageController');

router.get('/', authenticateToken, getAllMessages);
router.delete('/:messageId', authenticateToken, isAdmin, deleteMessage);

module.exports = router;