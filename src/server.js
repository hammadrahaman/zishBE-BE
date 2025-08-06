require('dotenv').config();
const app = require('./app');
const config = require('./config/config');
// const connectDatabase = require('./config/database');
const logger = require('./utils/logger');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Connect to database
// connectDatabase(); // Temporarily disabled

// Start server
const server = app.listen(config.PORT, () => {
  logger.info(`Server running in ${config.NODE_ENV} mode on port ${config.PORT}`);
  logger.info(`Health check available at http://localhost:${config.PORT}/health`);
  logger.info(`API available at http://localhost:${config.PORT}/api/${config.API_VERSION}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  // Don't exit on database connection errors
  if (err.name !== 'SequelizeHostNotFoundError') {
    server.close(() => {
      process.exit(1);
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
  });
});
