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

    // Pending orders: strictly orders with status 'pending'
    const [[{ pending_orders }]] = await sequelize.query(`
      SELECT COUNT(*)::int AS pending_orders
      FROM orders
      WHERE order_status = 'pending'
    `);

    // Unpaid orders and amount (exclude cancelled)
    const [[{ unpaid_orders, unpaid_amount }]] = await sequelize.query(`
      SELECT COUNT(*)::int AS unpaid_orders,
             COALESCE(SUM(total_amount), 0)::numeric AS unpaid_amount
      FROM orders
      WHERE payment_status <> 'paid'
        AND order_status <> 'cancelled'
    `);

    // Completed orders: UI "completed" maps to DB enum 'delivered' (and support text 'completed' if present)
    const [[{ completed_orders }]] = await sequelize.query(`
      SELECT COUNT(*)::int AS completed_orders
      FROM orders
      WHERE order_status::text IN ('delivered','completed') AND payment_status = 'paid'
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
      SELECT COUNT(*)::int AS pending_orders FROM orders WHERE order_status = 'pending'
    `);
    const [[{ unpaid_orders, unpaid_amount }]] = await sequelize.query(`
      SELECT COUNT(*)::int AS unpaid_orders, COALESCE(SUM(total_amount), 0)::numeric AS unpaid_amount
      FROM orders WHERE payment_status <> 'paid' AND order_status <> 'cancelled'
    `);
    const [[{ completed_orders }]] = await sequelize.query(`
      SELECT COUNT(*)::int AS completed_orders FROM orders WHERE order_status::text IN ('delivered','completed') AND payment_status = 'paid'
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



// GET /api/v1/stats/sales?start=YYYY-MM-DD&end=YYYY-MM-DD
// Paid-only sales and top items within a date range (IST). Used for both dashboard revenue and insights paid section
const getSalesInsights = async (req, res) => {
  try {
    await ensureConnection();

    const { start, end } = req.query;

    // Default to current month if not provided
    const [rangeRows] = await sequelize.query(`
      SELECT 
        date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata')::date AS start_date,
        (date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 month' - INTERVAL '1 day')::date AS end_date
    `);
    const defaultStart = rangeRows?.[0]?.start_date;
    const defaultEnd = rangeRows?.[0]?.end_date;

    const startDate = start || defaultStart;
    const endDate = end || defaultEnd;

    // Summary: orders count and total paid sales in range
    const [[summary]] = await sequelize.query(
      `SELECT 
         COUNT(*)::int AS orders_count,
         COALESCE(SUM(total_amount), 0)::numeric AS total_sales
       FROM orders
       WHERE payment_status = 'paid'
         AND (created_at) >= (CAST(:start AS date))
         AND (created_at) <  (CAST(:end AS date) + INTERVAL '1 day')
      `,
      { replacements: { start: startDate, end: endDate } }
    );

    // Top items sold (by quantity) paid-only within range
    const [topItems] = await sequelize.query(
      `SELECT oi.item_name, SUM(oi.quantity)::int AS total_quantity
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.payment_status = 'paid'
         AND (o.created_at) >= (CAST(:start AS date))
         AND (o.created_at) <  (CAST(:end AS date) + INTERVAL '1 day')
       GROUP BY oi.item_name
       ORDER BY total_quantity DESC
       LIMIT 20`,
      { replacements: { start: startDate, end: endDate } }
    );

    return res.json({
      success: true,
      data: {
        start: String(startDate),
        end: String(endDate),
        orders_count: summary?.orders_count || 0,
        total_sales: parseFloat(summary?.total_sales || 0),
        top_items: topItems.map(r => ({ item_name: r.item_name, total_quantity: parseInt(r.total_quantity, 10) })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch sales insights', error: error.message });
  }
};

module.exports.getSalesInsights = getSalesInsights;

// GET /api/v1/stats/orders-insights?start=YYYY-MM-DD&end=YYYY-MM-DD
// Completed (completed) orders; totals and top items
const getOrdersInsights = async (req, res) => {
  try {
    await ensureConnection();
    const { start, end } = req.query;

    const [rangeRows] = await sequelize.query(`
      SELECT date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata')::date AS start_date,
             (date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 month' - INTERVAL '1 day')::date AS end_date
    `);
    const startDate = start || rangeRows?.[0]?.start_date;
    const endDate = end || rangeRows?.[0]?.end_date;

    const [[summary]] = await sequelize.query(
      `SELECT COUNT(*)::int AS completed_orders_count,
              COALESCE(SUM(total_amount), 0)::numeric AS completed_orders_amount
       FROM orders
       WHERE order_status::text IN ('delivered','completed')
         AND (created_at) >= (CAST(:start AS date))
         AND (created_at) <  (CAST(:end AS date) + INTERVAL '1 day')`,
      { replacements: { start: startDate, end: endDate } }
    );

    const [[totals]] = await sequelize.query(
      `SELECT COALESCE(SUM(oi.quantity), 0)::int AS total_items_sold
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.order_status::text IN ('delivered','completed')
         AND (o.created_at) >= (CAST(:start AS date))
         AND (o.created_at) <  (CAST(:end AS date) + INTERVAL '1 day')`,
      { replacements: { start: startDate, end: endDate } }
    );

    const [topItems] = await sequelize.query(
      `SELECT oi.item_name, SUM(oi.quantity)::int AS total_quantity
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.order_status::text IN ('delivered','completed')
         AND (o.created_at) >= (CAST(:start AS date))
         AND (o.created_at) <  (CAST(:end AS date) + INTERVAL '1 day')
       GROUP BY oi.item_name
       ORDER BY total_quantity DESC
       LIMIT 20`,
      { replacements: { start: startDate, end: endDate } }
    );

    res.json({
      success: true,
      data: {
        start: String(startDate),
        end: String(endDate),
        completed_orders_count: summary?.completed_orders_count || 0,
        completed_orders_amount: parseFloat(summary?.completed_orders_amount || 0),
        total_items_sold: parseInt(totals?.total_items_sold || 0, 10),
        top_items: topItems.map(r => ({ item_name: r.item_name, total_quantity: parseInt(r.total_quantity, 10) })),
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders insights', error: error.message });
  }
};

module.exports.getOrdersInsights = getOrdersInsights;