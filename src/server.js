require('dotenv').config();
const app = require('./app');
const config = require('./config/config');
const connectDatabase = require('./config/database');
const logger = require('./utils/logger');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Connect to database and start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Find an available port
    const port = process.env.PORT || config.PORT || 8000;

    // Start server
    const server = app.listen(port, () => {
      logger.info(`Server running in ${config.NODE_ENV} mode on port ${port}`);
      logger.info(`Health check available at http://localhost:${port}/health`);
      logger.info(`API available at http://localhost:${port}/api/${config.API_VERSION}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use. Please try a different port.`);
        process.exit(1);
      } else {
        throw err;
      }
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

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
