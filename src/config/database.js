


const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');
const config = require('./config');
const logger = require('../utils/logger');

// MongoDB connection using Mongoose
const connectMongoDB = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

// PostgreSQL connection using Sequelize
const connectPostgreSQL = async () => {
  try {
    const sequelize = new Sequelize(config.PG_CONFIG);
    await sequelize.authenticate();
    logger.info('PostgreSQL connected successfully');
    return sequelize;
  } catch (error) {
    logger.error('PostgreSQL connection failed:', error);
    process.exit(1);
  }
};

// MySQL connection using Sequelize
const connectMySQL = async () => {
  try {
    const sequelize = new Sequelize(config.MYSQL_CONFIG);
    await sequelize.authenticate();
    logger.info('MySQL connected successfully');
    return sequelize;
  } catch (error) {
    logger.error('MySQL connection failed:', error);
    process.exit(1);
  }
};

// Main database connection function
const connectDatabase = async () => {
  // Default to MongoDB, but you can switch based on environment or preference
  const dbType = process.env.DB_TYPE || 'mongodb';
  
  switch (dbType.toLowerCase()) {
    case 'mongodb':
      await connectMongoDB();
      break;
    case 'postgresql':
    case 'postgres':
      return await connectPostgreSQL();
    case 'mysql':
      return await connectMySQL();
    default:
      logger.warn(`Unknown database type: ${dbType}. Defaulting to MongoDB.`);
      await connectMongoDB();
  }
};

module.exports = connectDatabase;