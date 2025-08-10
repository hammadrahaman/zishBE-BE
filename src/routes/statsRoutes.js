const express = require('express');
const { getRevenueStats, getDashboardStats, exportDashboardCsv, getSalesInsights, getOrdersInsights } = require('../controller/statsController');

const router = express.Router();

// Revenue stats (daily and monthly, paid-only)
router.get('/revenue', getRevenueStats);
router.get('/dashboard', getDashboardStats);
router.get('/dashboard/export', exportDashboardCsv);
router.get('/sales', getSalesInsights);
router.get('/orders-insights', getOrdersInsights);

module.exports = router;


