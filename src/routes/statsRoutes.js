const express = require('express');
const { getRevenueStats } = require('../controller/statsController');

const router = express.Router();

// Revenue stats (daily and monthly, paid-only)
router.get('/revenue', getRevenueStats);

module.exports = router;


