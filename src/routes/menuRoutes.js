const express = require('express');
const {
  getAllMenuItems,
  getMenuItemsByCategory,
  getAvailableMenuItems,
  checkItemsAvailability,
} = require('../controller/menuController');

const router = express.Router();

// Add more test routes to help debug
router.get('/test', (req, res) => {
  res.json({ message: 'GET menu/test is working' });
});

router.post('/test', (req, res) => {
  res.json({ 
    message: 'POST menu/test is working',
    body: req.body 
  });
});

// Public routes
router.get('/items', getAllMenuItems);
router.get('/items/available', getAvailableMenuItems);
router.get('/items/category/:categoryId', getMenuItemsByCategory);
router.post('/items/check-availability', checkItemsAvailability);

// Add a catch-all route for debugging
router.use('*', (req, res) => {
  res.status(404).json({
    message: 'Menu route not found',
    path: req.originalUrl,
    method: req.method,
    baseUrl: req.baseUrl,
    url: req.url
  });
});

module.exports = router; 