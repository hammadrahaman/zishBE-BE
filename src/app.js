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

// Debug logging for routes
app.use((req, res, next) => {
  console.log('Request URL:', req.url);
  console.log('Request Method:', req.method);
  console.log('Request Headers:', req.headers);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Add this before the API routes mount
app.get('/test', (req, res) => {
  res.json({ message: 'Root test endpoint working' });
});

// API routes
app.use(`/api/${config.API_VERSION}`, routes);

// Add this right after mounting API routes
app.get('/api/v1/test', (req, res) => {
  res.json({ message: 'API test endpoint working' });
});

// List all registered routes
console.log('Registered Routes:');
function printRoutes(stack, path = '') {
  stack.forEach(r => {
    if (r.route) {
      console.log(`${Object.keys(r.route.methods).join(', ').toUpperCase()} ${path}${r.route.path}`);
    } else if (r.name === 'router') {
      printRoutes(r.handle.stack, path + r.regexp.source.replace('^\\', '').replace('\\/?(?=\\/|$)', ''));
    }
  });
}
printRoutes(app._router.stack);

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