// File: src/controllers/userController.js
const User = require('../models/User');

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role, isActive },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error updating user' });
  }
};

module.exports = { getAllUsers, updateUser };
