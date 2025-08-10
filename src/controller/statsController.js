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

// GET /api/v1/stats/dashboard
// Returns pending/unpaid/unpaid amount/completed and top 20 fast-moving items
const getDashboardStats = async (req, res) => {
  try {
    await ensureConnection();

    // Pending orders: not delivered (completed) and not cancelled
    const [[{ pending_orders }]] = await sequelize.query(`
      SELECT COUNT(*)::int AS pending_orders
      FROM orders
      WHERE order_status NOT IN ('cancelled','delivered')
    `);

    // Unpaid orders and amount (exclude cancelled)
    const [[{ unpaid_orders, unpaid_amount }]] = await sequelize.query(`
      SELECT COUNT(*)::int AS unpaid_orders,
             COALESCE(SUM(total_amount), 0)::numeric AS unpaid_amount
      FROM orders
      WHERE payment_status <> 'paid'
        AND order_status <> 'cancelled'
    `);

    // Completed orders: delivered and paid
    const [[{ completed_orders }]] = await sequelize.query(`
      SELECT COUNT(*)::int AS completed_orders
      FROM orders
      WHERE order_status = 'delivered' AND payment_status = 'paid'
    `);

    // Fast moving items: top 20 by quantity across all time (exclude cancelled orders)
    const [fastItems] = await sequelize.query(`
      SELECT oi.item_name, SUM(oi.quantity)::int AS total_quantity
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.order_status <> 'cancelled'
      GROUP BY oi.item_name
      ORDER BY total_quantity DESC
      LIMIT 20
    `);

    res.json({
      success: true,
      data: {
        pending_orders: pending_orders || 0,
        unpaid_orders: unpaid_orders || 0,
        unpaid_amount: parseFloat(unpaid_amount || 0),
        completed_orders: completed_orders || 0,
        fast_moving_items: fastItems.map(r => ({ item_name: r.item_name, total_quantity: parseInt(r.total_quantity, 10) })),
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message,
    });
  }
};

// GET /api/v1/stats/dashboard/export
// Streams a CSV of dashboard metrics including revenue
const exportDashboardCsv = async (req, res) => {
  try {
    await ensureConnection();

    // Reuse the above queries and revenue
    const [[{ pending_orders }]] = await sequelize.query(`
      SELECT COUNT(*)::int AS pending_orders FROM orders WHERE order_status NOT IN ('cancelled','delivered')
    `);
    const [[{ unpaid_orders, unpaid_amount }]] = await sequelize.query(`
      SELECT COUNT(*)::int AS unpaid_orders, COALESCE(SUM(total_amount), 0)::numeric AS unpaid_amount
      FROM orders WHERE payment_status <> 'paid' AND order_status <> 'cancelled'
    `);
    const [[{ completed_orders }]] = await sequelize.query(`
      SELECT COUNT(*)::int AS completed_orders FROM orders WHERE order_status = 'delivered' AND payment_status = 'paid'
    `);
    const [fastItems] = await sequelize.query(`
      SELECT oi.item_name, SUM(oi.quantity)::int AS total_quantity
      FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE o.order_status <> 'cancelled'
      GROUP BY oi.item_name
      ORDER BY total_quantity DESC
      LIMIT 20
    `);
    const [revRows] = await sequelize.query(`
      SELECT
        COALESCE(SUM(CASE
          WHEN created_at AT TIME ZONE 'Asia/Kolkata' >= date_trunc('day',   now() AT TIME ZONE 'Asia/Kolkata')
           AND created_at AT TIME ZONE 'Asia/Kolkata' <  date_trunc('day',   now() AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 day'
        THEN total_amount END), 0) AS daily_revenue,
        COALESCE(SUM(CASE
          WHEN created_at AT TIME ZONE 'Asia/Kolkata' >= date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata')
           AND created_at AT TIME ZONE 'Asia/Kolkata' <  date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 month'
        THEN total_amount END), 0) AS monthly_revenue
      FROM orders WHERE payment_status = 'paid'
    `);

    const daily = parseFloat(revRows?.[0]?.daily_revenue ?? 0) || 0;
    const monthly = parseFloat(revRows?.[0]?.monthly_revenue ?? 0) || 0;

    // Build CSV content
    const lines = [];
    lines.push('"=== CAFE DASHBOARD METRICS ==="');
    lines.push(`"Generated on:","${new Date().toISOString()}"`);
    lines.push('');
    lines.push('"SUMMARY"');
    lines.push(`"Pending Orders:","${pending_orders || 0}"`);
    lines.push(`"Unpaid Orders:","${unpaid_orders || 0}"`);
    lines.push(`"Unpaid Amount:","${parseFloat(unpaid_amount || 0).toFixed(2)}"`);
    lines.push(`"Completed Orders:","${completed_orders || 0}"`);
    lines.push(`"Daily Revenue:","${daily.toFixed(2)}"`);
    lines.push(`"Monthly Revenue:","${monthly.toFixed(2)}"`);
    lines.push('');
    lines.push('"FAST MOVING ITEMS (TOP 20)"');
    lines.push('"Item Name","Total Quantity"');
    fastItems.forEach(r => {
      const item = String(r.item_name || '').replace(/"/g, '""');
      lines.push(`"${item}","${r.total_quantity}"`);
    });

    const csv = lines.join('\n');
    const filename = `dashboard-export-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to export dashboard metrics', error: error.message });
  }
};

module.exports = { getRevenueStats, getDashboardStats, exportDashboardCsv };


