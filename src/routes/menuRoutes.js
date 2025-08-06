const express = require('express');
const {
  getAllMenuItems,
  getMenuItemsByCategory,
  getAvailableMenuItems,
} = require('../controller/menuController');

const router = express.Router();

// Public routes
router.get('/items', getAllMenuItems);
router.get('/items/available', getAvailableMenuItems);
router.get('/items/category/:categoryId', getMenuItemsByCategory);

module.exports = router; 