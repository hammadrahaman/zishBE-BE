


const { Sequelize } = require('sequelize');
const config = require('./config');
const logger = require('../utils/logger');

// PostgreSQL connection using Sequelize
const connectPostgreSQL = async () => {
  try {
    // Construct connection string with SSL parameters
    const connectionString = 'postgresql://neondb_owner:npg_G52VKTncfOHF@ep-steep-resonance-a13uhpzv-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

    const sequelize = new Sequelize(connectionString, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: process.env.NODE_ENV === 'development' ? console.log : false
    });

    await sequelize.authenticate();
    logger.info('PostgreSQL connected successfully');
    return sequelize;
  } catch (error) {
    logger.error('PostgreSQL connection failed:', error);
    throw error;
  }
};

// Main database connection function
const connectDatabase = async () => {
  try {
    logger.info('Attempting to connect to PostgreSQL...');
    return await connectPostgreSQL();
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

module.exports = connectDatabase;