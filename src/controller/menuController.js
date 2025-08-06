const { Sequelize } = require('sequelize');
const config = require('../config/config');
const MenuItemModel = require('../models/MenuItem');
const logger = require('../utils/logger');
const connectDatabase = require('../config/database');

let sequelize;
let MenuItem;

// Initialize models
async function initializeModels() {
  try {
    sequelize = await connectDatabase();
    MenuItem = MenuItemModel(sequelize);
    return true;
  } catch (error) {
    logger.error('Failed to initialize menu models:', error);
    throw error;
  }
}

// Test endpoint
const testConnection = async (req, res) => {
  try {
    console.log('🧪 Testing database connection...');
    
    // Test database connection
    await sequelize.authenticate();
    
    console.log('✅ Database test successful');
    res.status(200).json({
      success: true,
      message: 'API connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Test connection failed:', error);
    res.status(500).json({
      success: false,
      message: 'API connection failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

// Get all menu items
const getAllMenuItems = async (req, res) => {
  try {
    // Ensure models are initialized
    if (!sequelize) {
      await initializeModels();
    }

    console.log('📋 Fetching all menu items...');
    
    const menuItems = await MenuItem.findAll({
      order: [
        ['category_id', 'ASC'],
        ['name', 'ASC']
      ]
    });

    console.log(`✅ Found ${menuItems.length} menu items`);

    const response = {
      success: true,
      count: menuItems.length,
      data: menuItems.map(item => ({
        id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        category_id: item.category_id,
        description: item.description,
        image_url: item.image_url,
        is_available: item.is_available,
        preparation_time_minutes: item.preparation_time_minutes,
        created_at: item.created_at,
        updated_at: item.updated_at,
      })),
    };

    logger.info(`Retrieved ${menuItems.length} menu items`);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching menu items:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching menu items',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

// Get menu items by category
const getMenuItemsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const menuItems = await MenuItem.findAll({
      where: {
        category_id: categoryId
      },
      order: [['name', 'ASC']]
    });

    const response = {
      success: true,
      count: menuItems.length,
      category_id: parseInt(categoryId),
      data: menuItems.map(item => ({
        id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        category_id: item.category_id,
        description: item.description,
        image_url: item.image_url,
        is_available: item.is_available,
        preparation_time_minutes: item.preparation_time_minutes,
        created_at: item.created_at,
        updated_at: item.updated_at,
      })),
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching menu items by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching menu items by category',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

// Get available menu items only
const getAvailableMenuItems = async (req, res) => {
  try {
    const menuItems = await MenuItem.findAll({
      where: {
        is_available: true
      },
      order: [
        ['category_id', 'ASC'],
        ['name', 'ASC']
      ]
    });

    const response = {
      success: true,
      count: menuItems.length,
      data: menuItems.map(item => ({
        id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        category_id: item.category_id,
        description: item.description,
        image_url: item.image_url,
        is_available: item.is_available,
        preparation_time_minutes: item.preparation_time_minutes,
        created_at: item.created_at,
        updated_at: item.updated_at,
      })),
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching available menu items:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available menu items',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

// Add this new function
const checkItemsAvailability = async (req, res) => {
  try {
    const { itemIds } = req.body;
    
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or empty item IDs provided'
      });
    }

    const items = await MenuItem.findAll({
      where: {
        id: itemIds
      }
    });

    // Check if all requested items exist
    const foundIds = items.map(item => item.id);
    const missingIds = itemIds.filter(id => !foundIds.includes(id));
    
    if (missingIds.length > 0) {
      return res.status(404).json({
        success: false,
        message: 'Some menu items not found',
        missingItems: missingIds
      });
    }

    // Check if all items are available
    const unavailableItems = items.filter(item => !item.is_available);
    
    if (unavailableItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some menu items are not available',
        unavailableItems: unavailableItems.map(item => ({
          id: item.id,
          name: item.name
        }))
      });
    }

    res.status(200).json({
      success: true,
      message: 'All items are available'
    });
  } catch (error) {
    logger.error('Error checking item availability:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking item availability',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Initialize models when the module is loaded
initializeModels().catch(error => {
  logger.error('Failed to initialize menu models:', error);
});

module.exports = {
  testConnection,
  getAllMenuItems,
  getMenuItemsByCategory,
  getAvailableMenuItems,
  checkItemsAvailability
}; 