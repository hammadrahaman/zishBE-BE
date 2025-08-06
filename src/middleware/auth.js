const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');
const { sendError } = require('../utils/responseHandler');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return sendError(res, 'Access denied. No token provided.', 401);
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return sendError(res, 'Token is not valid', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Account is deactivated', 401);
    }

    req.user = decoded;
    next();
  } catch (error) {
    return sendError(res, 'Token is not valid', 401);
  }
};

module.exports = auth;