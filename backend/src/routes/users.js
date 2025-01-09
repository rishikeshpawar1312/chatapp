// File: src/routes/users.js
const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { getAllUsers, updateUser } = require('../controllers/userController');

router.get('/', authenticateToken, isAdmin, getAllUsers);
router.patch('/:userId', authenticateToken, isAdmin, updateUser);

module.exports = router;