const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('express-async-errors');

const config = require('./config/config');
const corsOptions = require('./config/cors');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

// Import routes
const routes = require('./routes');

// Create Express app
const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Basic middleware
app.use(helmet()); // Security headers
app.use(compression()); // Gzip compression
app.use(cors(corsOptions)); // CORS configuration
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } })); // Logging
app.use(express.json({ limit: '10mb' })); // JSON parsing
app.use(express.urlencoded({ extended: true })); // URL encoding

// Rate limiting
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use(`/api/${config.API_VERSION}`, routes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;