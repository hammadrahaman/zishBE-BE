require('dotenv').config();
const { Sequelize } = require('sequelize');
const config = require('./src/config/config');

const testConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    const sequelize = new Sequelize(config.PG_CONFIG);
    
    await sequelize.authenticate();
    console.log('✅ Supabase connection successful!');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    process.exit(1);
  }
};

testConnection(); 