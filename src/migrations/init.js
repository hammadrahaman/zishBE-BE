const { Sequelize } = require('sequelize');
require('dotenv').config();
const config = require('../config/config');

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Create Sequelize instance using the connection string
    const sequelize = new Sequelize(config.PG_CONFIG.url, {
      dialect: 'postgres',
      dialectOptions: config.PG_CONFIG.dialectOptions,
      logging: console.log
    });

    // Test the connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Initialize models
    const MenuItem = require('../models/MenuItem')(sequelize);
    const Order = require('../models/Order')(sequelize);
    const OrderItem = require('../models/OrderItem')(sequelize);
    const OrderStatusHistory = require('../models/OrderStatusHistory')(sequelize);

    // Set up associations
    Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
    OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
    OrderItem.belongsTo(MenuItem, { foreignKey: 'menu_item_id', as: 'menuItem' });
    Order.hasMany(OrderStatusHistory, { foreignKey: 'order_id', as: 'statusHistory' });
    OrderStatusHistory.belongsTo(Order, { foreignKey: 'order_id' });

    // Sync all models
    console.log('Syncing database models...');
    await sequelize.sync({ force: true }); // Be careful with force: true in production!
    
    console.log('Database synchronized successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    if (error.original) {
      console.error('Original error:', error.original);
    }
    process.exit(1);
  }
}

// Add error handler for unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

initializeDatabase(); 