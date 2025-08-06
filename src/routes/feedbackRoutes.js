const express = require('express');
const {
  submitFeedback,
  getAllFeedback,
  getFeedbackStats,
} = require('../controller/feedbackController');

const router = express.Router();

// Public routes
router.post('/', submitFeedback);

// Admin routes (you can add auth middleware here later)
router.get('/', getAllFeedback);
router.get('/stats', getFeedbackStats);

module.exports = router; 