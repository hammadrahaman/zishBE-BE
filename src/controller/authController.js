const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { sendResponse, sendError } = require('../utils/responseHandler');
const logger = require('../utils/logger');
const connectDatabase = require('../config/database');
const UserSqlModel = require('../models/UserSql');

let sequelize;
let UserSql;

async function initUserModel() {
  if (UserSql) return UserSql;
  sequelize = await connectDatabase();
  UserSql = UserSqlModel(sequelize);
  return UserSql;
}

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE,
  });
};

// Register new user (Postgres)
const register = async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const User = await initUserModel();

    // Check if user exists
    const existing = await User.findOne({ where: { username } });
    if (existing) {
      return sendError(res, 'User already exists', 400);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      username,
      password: hashedPassword,
      role: role || 'user',
    });

    // Generate token
    const token = generateToken(user.id);

    logger.info(`New user registered: ${username}`);

    sendResponse(res, {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      token,
    }, 'User registered successfully', 201);
  } catch (error) {
    logger.error('Registration error:', error);
    sendError(res, 'Registration failed', 500);
  }
};

// Login user (Postgres)
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const User = await initUserModel();

    // Check if user exists
    const user = await User.findOne({ where: { username, is_active: true } });
    if (!user) {
      return sendError(res, 'Invalid credentials', 401);
    }

    // Validate password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return sendError(res, 'Invalid credentials', 401);
    }

    // Update last_login
    await user.update({ last_login: new Date() });

    // Generate token
    const token = generateToken(user.id);

    logger.info(`User logged in: ${username}`);

    sendResponse(res, {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      token,
    }, 'Login successful');
  } catch (error) {
    logger.error('Login error:', error);
    sendError(res, 'Login failed', 500);
  }
};

// Get current user profile (Postgres)
const getProfile = async (req, res) => {
  try {
    const User = await initUserModel();
    const user = await User.findByPk(req.user.userId, { attributes: { exclude: ['password'] } });
    if (!user) return sendError(res, 'User not found', 404);
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