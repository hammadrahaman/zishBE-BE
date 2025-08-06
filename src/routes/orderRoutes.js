const express = require('express');

const router = express.Router();

// Test route to verify routes are working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Order routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Test database connection
router.get('/test-db', async (req, res) => {
  try {
    const { Sequelize } = require('sequelize');
    const config = require('../config/config');
    
    const sequelize = new Sequelize(config.PG_CONFIG);
    await sequelize.authenticate();
    
    res.json({
      success: true,
      message: 'Database connection successful',
      config: {
        host: config.PG_CONFIG.host,
        database: config.PG_CONFIG.database,
        port: config.PG_CONFIG.port
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Test if tables exist
router.get('/test-tables', async (req, res) => {
  try {
    const { Sequelize } = require('sequelize');
    const config = require('../config/config');
    
    const sequelize = new Sequelize(config.PG_CONFIG);
    
    // Check if tables exist
    const [orders] = await sequelize.query("SELECT COUNT(*) FROM orders");
    const [orderItems] = await sequelize.query("SELECT COUNT(*) FROM order_items");
    const [menuItems] = await sequelize.query("SELECT COUNT(*) FROM menu_items");
    
    res.json({
      success: true,
      message: 'Tables exist',
      tableData: {
        orders: orders[0].count,
        order_items: orderItems[0].count,
        menu_items: menuItems[0].count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Tables check failed',
      error: error.message
    });
  }
});

// Load the database controller with detailed error handling
console.log('🔄 Attempting to load order controller...');

try {
  const orderController = require('../controller/orderController');
  const { placeOrder, getAllOrders, getOrdersByPhone, updateOrderStatus, updatePaymentStatus, cancelOrder } = orderController;
  
  console.log('✅ Order controller loaded successfully');
  
  // Real database routes
  router.post('/', async (req, res) => {
    try {
      console.log('📝 Placing order with data:', JSON.stringify(req.body, null, 2));
      await placeOrder(req, res);
    } catch (error) {
      console.error('❌ Error in placeOrder:', error);
      res.status(500).json({
        success: false,
        message: 'Error placing order',
        error: error.message
      });
    }
  });
  
  router.get('/', async (req, res) => {
    try {
      console.log('📋 Getting all orders...');
      await getAllOrders(req, res);
    } catch (error) {
      console.error('❌ Error in getAllOrders:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting orders',
        error: error.message
      });
    }
  });
  
  router.get('/customer/:phone', getOrdersByPhone);
  router.put('/:id/status', updateOrderStatus);
  router.put('/:id/payment', updatePaymentStatus);
  router.delete('/:id', cancelOrder);
  
} catch (error) {
  console.error('❌ Failed to load order controller:', error.message);
  console.error('❌ Full error:', error);
  
  // Fallback routes that show the error
  router.post('/', (req, res) => {
    res.status(500).json({
      success: false,
      message: 'Order controller failed to load',
      error: error.message,
      instruction: 'Check server logs and database connection'
    });
  });
  
  router.get('/', (req, res) => {
    res.status(500).json({
      success: false,
      message: 'Order controller failed to load',
      error: error.message
    });
  });
}

module.exports = router;