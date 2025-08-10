const express = require('express');
const {
  listItems,
  createItem,
  updateItem,
  deleteItem,
  placeOrder,
  listOrders,
  markPurchased,
  getInventoryStats,
} = require('../controller/inventoryController');

const router = express.Router();

// Items
router.get('/items', listItems);
router.post('/items', createItem);
router.put('/items/:id', updateItem);
router.delete('/items/:id', deleteItem);

// Orders
router.post('/orders', placeOrder);
router.get('/orders', listOrders);
router.put('/orders/:id/purchased', markPurchased);

// Stats for inventory dashboard
router.get('/stats', getInventoryStats);

module.exports = router;


