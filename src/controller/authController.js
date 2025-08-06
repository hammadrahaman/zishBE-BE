const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');
const { sendResponse, sendError } = require('../utils/responseHandler');
const logger = require('../utils/logger');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE,
  });
};

// Register new user
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 'User already exists', 400);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    logger.info(`New user registered: ${email}`);

    sendResponse(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      token,
    }, 'User registered successfully', 201);
  } catch (error) {
    logger.error('Registration error:', error);
    sendError(res, 'Registration failed', 500);
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return sendError(res, 'Invalid credentials', 401);
    }

    // Validate password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return sendError(res, 'Invalid credentials', 401);
    }

    // Generate token
    const token = generateToken(user._id);

    logger.info(`User logged in: ${email}`);

    sendResponse(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      token,
    }, 'Login successful');
  } catch (error) {
    logger.error('Login error:', error);
    sendError(res, 'Login failed', 500);
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    sendResponse(res, user, 'Profile retrieved successfully');
  } catch (error) {
    logger.error('Get profile error:', error);
    sendError(res, 'Failed to get profile', 500);
  }
};

module.exports = {
  register,
  login,
  getProfile,
};