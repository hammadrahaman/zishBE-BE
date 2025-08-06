require('dotenv').config();

// Construct the connection string with SSL parameters
const connectionString = `postgresql://${process.env.PG_USERNAME}:${process.env.PG_PASSWORD}@${process.env.PG_HOST}/${process.env.PG_DATABASE}?sslmode=require`;

module.exports = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 8000,
    API_VERSION: process.env.API_VERSION || 'v1',
    
    // PostgreSQL config for Neon
    PG_CONFIG: {
      url: connectionString,
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
    },
    
    // CORS
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : 
      ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8000'],
      
    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',

    // Rate limiting
    RATE_LIMIT: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // Limit each IP to 100 requests per windowMs
    }
};