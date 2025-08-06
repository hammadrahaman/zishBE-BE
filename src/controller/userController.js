const User = require('../models/User');
const { sendResponse, sendError } = require('../utils/responseHandler');
const logger = require('../utils/logger');

// Get all users
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments();

    sendResponse(res, {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }, 'Users retrieved successfully');
  } catch (error) {
    logger.error('Get users error:', error);
    sendError(res, 'Failed to get users', 500);
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    sendResponse(res, user, 'User retrieved successfully');
  } catch (error) {
    logger.error('Get user by ID error:', error);
    sendError(res, 'Failed to get user', 500);
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.params.id;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, email },
      { new: true, runValidators: true }
    ).select('-password');

    logger.info(`User updated: ${updatedUser.email}`);

    sendResponse(res, updatedUser, 'User updated successfully');
  } catch (error) {
    logger.error('Update user error:', error);
    sendError(res, 'Failed to update user', 500);
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    logger.info(`User deleted: ${user.email}`);

    sendResponse(res, null, 'User deleted successfully');
  } catch (error) {
    logger.error('Delete user error:', error);
    sendError(res, 'Failed to delete user', 500);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};