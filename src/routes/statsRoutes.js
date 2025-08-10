const express = require('express');
const { getRevenueStats, getDashboardStats, exportDashboardCsv } = require('../controller/statsController');

const router = express.Router();

// Revenue stats (daily and monthly, paid-only)
router.get('/revenue', getRevenueStats);
router.get('/dashboard', getDashboardStats);
router.get('/dashboard/export', exportDashboardCsv);

module.exports = router;


