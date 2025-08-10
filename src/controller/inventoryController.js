const connectDatabase = require('../config/database');

let sequelize;
async function ensureConnection() {
  if (!sequelize) {
    sequelize = await connectDatabase();
  }
}

// Helpers
function mapItemRow(row) {
  return {
    id: row.id,
    name: row.name,
    unit_label: row.unit_label,
    rate: Number(row.rate),
    category: row.category,
    status: row.status,
    created_by: row.created_by || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// GET /api/v1/inventory/items?status=active|inactive|all
const listItems = async (req, res) => {
  try {
    await ensureConnection();
    const { status = 'active' } = req.query;
    const where = status === 'all' ? '' : 'WHERE status = :status';
    const [rows] = await sequelize.query(
      `SELECT id, name, unit_label, rate, category, status, created_by, created_at, updated_at
       FROM inventory_items ${where}
       ORDER BY name ASC`,
      { replacements: { status } }
    );
    return res.json({ success: true, data: rows.map(mapItemRow) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to list items', error: String(err) });
  }
};

// POST /api/v1/inventory/items
const createItem = async (req, res) => {
  try {
    await ensureConnection();
    const { name, unit_label, rate, category, status = 'active', created_by } = req.body || {};
    const [rows] = await sequelize.query(
      `INSERT INTO inventory_items (name, unit_label, rate, category, status, created_by)
       VALUES (:name, :unit_label, :rate, :category, :status, :created_by)
       RETURNING id, name, unit_label, rate, category, status, created_by, created_at, updated_at`,
      { replacements: { name, unit_label, rate, category, status, created_by } }
    );
    return res.status(201).json({ success: true, data: mapItemRow(rows[0]) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create item', error: String(err) });
  }
};

// PUT /api/v1/inventory/items/:id
const updateItem = async (req, res) => {
  try {
    await ensureConnection();
    const { id } = req.params;
    const { name, unit_label, rate, category, status } = req.body || {};
    const [rows] = await sequelize.query(
      `UPDATE inventory_items
       SET name = COALESCE(:name, name),
           unit_label = COALESCE(:unit_label, unit_label),
           rate = COALESCE(:rate, rate),
           category = COALESCE(:category, category),
           status = COALESCE(:status, status),
           updated_at = now()
       WHERE id = :id
       RETURNING id, name, unit_label, rate, category, status, created_by, created_at, updated_at`,
      { replacements: { id, name, unit_label, rate, category, status } }
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Item not found' });
    return res.json({ success: true, data: mapItemRow(rows[0]) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update item', error: String(err) });
  }
};

// DELETE /api/v1/inventory/items/:id
const deleteItem = async (req, res) => {
  try {
    await ensureConnection();
    const { id } = req.params;
    try {
      await sequelize.query(`DELETE FROM inventory_items WHERE id = :id`, { replacements: { id } });
      return res.json({ success: true });
    } catch (e) {
      const msg = String(e);
      // If the item is referenced by order lines, soft-disable instead of hard delete
      if (msg.includes('foreign key') || msg.includes('violates foreign key constraint') || msg.includes('23503')) {
        await sequelize.query(
          `UPDATE inventory_items SET status = 'inactive', updated_at = now() WHERE id = :id`,
          { replacements: { id } }
        );
        return res.json({ success: true, data: { softDeleted: true }, message: 'Item is used in orders; marked inactive instead.' });
      }
      throw e;
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete item', error: String(err) });
  }
};

// POST /api/v1/inventory/orders
// body: { ordered_by, notes?, items: [{ inventory_item_id, quantity }] }
const placeOrder = async (req, res) => {
  const t = await (await ensureConnection(), sequelize).transaction();
  try {
    const { ordered_by, notes = null, items = [] } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'No items provided' });
    }
    const [orderRows] = await sequelize.query(
      `INSERT INTO inventory_orders (ordered_by, notes)
       VALUES (:ordered_by, :notes) RETURNING id, ordered_at`,
      { replacements: { ordered_by, notes }, transaction: t }
    );
    const orderId = orderRows[0].id;

    for (const it of items) {
      await sequelize.query(
        `INSERT INTO inventory_order_items (
           order_id, inventory_item_id, item_name_snapshot, unit_label_snapshot, unit_rate_snapshot, quantity, line_amount
         )
         SELECT :order_id, i.id, i.name, i.unit_label, i.rate, :qty, (:qty * i.rate)
         FROM inventory_items i WHERE i.id = :item_id`,
        { replacements: { order_id: orderId, item_id: it.inventory_item_id, qty: it.quantity }, transaction: t }
      );
    }

    await sequelize.query(
      `UPDATE inventory_orders o
       SET total_amount = COALESCE((SELECT SUM(line_amount) FROM inventory_order_items WHERE order_id = o.id), 0),
           updated_at = now()
       WHERE o.id = :order_id`,
      { replacements: { order_id: orderId }, transaction: t }
    );

    await t.commit();

    return res.status(201).json({ success: true, data: { order_id: orderId } });
  } catch (err) {
    await t.rollback();
    return res.status(500).json({ success: false, message: 'Failed to place order', error: String(err) });
  }
};

// GET /api/v1/inventory/orders?status=pending|purchased|all&user=<username>
const listOrders = async (req, res) => {
  try {
    await ensureConnection();
    const { status = 'all', user } = req.query;
    const filters = [];
    const params = {};
    if (status !== 'all') { filters.push('o.status = :status'); params.status = status; }
    if (user) { filters.push('o.ordered_by = :user'); params.user = user; }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const [rows] = await sequelize.query(
      `SELECT o.id,
              o.status,
              o.total_amount,
              o.ordered_by,
              o.ordered_at,
              o.purchased_at,
              COALESCE(json_agg(json_build_object(
                'itemName', oi.item_name_snapshot,
                'unit', oi.unit_label_snapshot,
                'rate', oi.unit_rate_snapshot,
                'quantity', oi.quantity,
                'lineAmount', oi.line_amount
              ) ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
       FROM inventory_orders o
       LEFT JOIN inventory_order_items oi ON oi.order_id = o.id
       ${where}
       GROUP BY o.id
       ORDER BY o.ordered_at DESC`,
      { replacements: params }
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to list orders', error: String(err) });
  }
};

// PUT /api/v1/inventory/orders/:id/purchased
const markPurchased = async (req, res) => {
  try {
    await ensureConnection();
    const { id } = req.params;
    const { purchased_by } = req.body || {};
    const [rows] = await sequelize.query(
      `UPDATE inventory_orders
       SET status = 'purchased', purchased_at = now(), purchased_by = :purchased_by, updated_at = now()
       WHERE id = :id AND status = 'pending'
       RETURNING id`,
      { replacements: { id, purchased_by } }
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Order not found or already purchased' });

    // optional history insert, ignore errors
    await sequelize.query(
      `INSERT INTO inventory_order_status_history (order_id, old_status, new_status, changed_by, note)
       VALUES (:id, 'pending', 'purchased', :purchased_by, 'Marked purchased')`,
      { replacements: { id, purchased_by } }
    ).catch(() => {});

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to mark purchased', error: String(err) });
  }
};

module.exports = {
  listItems,
  createItem,
  updateItem,
  deleteItem,
  placeOrder,
  listOrders,
  markPurchased,
};



// GET /api/v1/inventory/stats
// Returns: pending_orders, purchased_orders, pending_amount, purchased_amount
const getInventoryStats = async (req, res) => {
  try {
    await ensureConnection();
    const [[row]] = await sequelize.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0)::int AS pending_orders,
        COALESCE(SUM(CASE WHEN status = 'purchased' THEN 1 ELSE 0 END), 0)::int AS purchased_orders,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END), 0)::numeric AS pending_amount,
        COALESCE(SUM(CASE WHEN status = 'purchased' THEN total_amount ELSE 0 END), 0)::numeric AS purchased_amount
      FROM inventory_orders
    `);
    return res.json({ success: true, data: row });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to get inventory stats', error: String(err) });
  }
};

module.exports.getInventoryStats = getInventoryStats;