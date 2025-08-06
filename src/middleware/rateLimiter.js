const rateLimit = require('express-rate-limit');
const config = require('../config/config');

const rateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT.windowMs,
  max: config.RATE_LIMIT.max,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = rateLimiter;