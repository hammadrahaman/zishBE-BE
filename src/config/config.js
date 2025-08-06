

module.exports = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 8000,
    API_VERSION: process.env.API_VERSION || 'v1',
    
    // Database configs
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/zish_cafe',
    
    // PostgreSQL config
    PG_CONFIG: {
      host: process.env.PG_HOST || 'localhost',
      port: process.env.PG_PORT || 5432,
      database: process.env.PG_DATABASE || 'zish_cafe',
      username: process.env.PG_USERNAME || 'postgres',
      password: process.env.PG_PASSWORD || 'password',
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
    },
    
    // MySQL config
    MYSQL_CONFIG: {
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT || 3306,
      database: process.env.MYSQL_DATABASE || 'zish_cafe',
      username: process.env.MYSQL_USERNAME || 'root',
      password: process.env.MYSQL_PASSWORD || 'password',
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
    },
    
    // JWT config
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
    JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
    
    // Rate limiting
    RATE_LIMIT: {
      windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
      max: process.env.RATE_LIMIT_MAX_REQUESTS || 100
    },
    
    // CORS
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : 
      ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8000'],
      
    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
  };