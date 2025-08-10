const connectDatabase = require('../config/database');

let sequelize;

async function ensureConnection() {
  if (!sequelize) {
    sequelize = await connectDatabase();
  }
}

// GET /api/v1/stats/revenue
// Returns paid-only daily and monthly revenue in IST timezone
const getRevenueStats = async (req, res) => {
  try {
    await ensureConnection();

    const [rows] = await sequelize.query(`
      SELECT
        COALESCE(SUM(CASE
          WHEN created_at AT TIME ZONE 'Asia/Kolkata' >= date_trunc('day',   now() AT TIME ZONE 'Asia/Kolkata')
           AND created_at AT TIME ZONE 'Asia/Kolkata' <  date_trunc('day',   now() AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 day'
        THEN total_amount END), 0) AS daily_revenue,
        COALESCE(SUM(CASE
          WHEN created_at AT TIME ZONE 'Asia/Kolkata' >= date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata')
           AND created_at AT TIME ZONE 'Asia/Kolkata' <  date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 month'
        THEN total_amount END), 0) AS monthly_revenue
      FROM orders
      WHERE payment_status = 'paid'
    `);

    const daily = parseFloat(rows?.[0]?.daily_revenue ?? 0) || 0;
    const monthly = parseFloat(rows?.[0]?.monthly_revenue ?? 0) || 0;

    res.json({
      success: true,
      data: {
        daily_revenue: daily,
        monthly_revenue: monthly,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue statistics',
      error: error.message,
    });
  }
};

module.exports = { getRevenueStats };


