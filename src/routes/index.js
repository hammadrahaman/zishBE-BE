const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const menuRoutes = require('./menuRoutes');
const feedbackRoutes = require('./feedbackRoutes');
const orderRoutes = require('./orderRoutes');

const router = express.Router();

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/menu', menuRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/orders', orderRoutes);

// Default API info
router.get('/', (req, res) => {
  res.json({
    message: 'Backend API is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      menu: '/api/v1/menu',
      feedback: '/api/v1/feedback',
      orders: '/api/v1/orders',
    },
  });
});

module.exports = router;