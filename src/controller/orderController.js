const { Sequelize } = require('sequelize');
const config = require('../config/config');
const MenuItemModel = require('../models/MenuItem');
const OrderModel = require('../models/Order');
const OrderItemModel = require('../models/OrderItem');
const OrderStatusHistoryModel = require('../models/OrderStatusHistory');
const logger = require('../utils/logger');
const connectDatabase = require('../config/database');

let sequelize;
let MenuItem;
let Order;
let OrderItem;
let OrderStatusHistory;

// Initialize models
async function initializeModels() {
  try {
    sequelize = await connectDatabase();
    
    // Initialize models
    MenuItem = MenuItemModel(sequelize);
    Order = OrderModel(sequelize);
    OrderItem = OrderItemModel(sequelize);
    OrderStatusHistory = OrderStatusHistoryModel(sequelize);

    // Set up associations
    Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
    OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
    OrderItem.belongsTo(MenuItem, { foreignKey: 'menu_item_id', as: 'menuItem' });
    Order.hasMany(OrderStatusHistory, { foreignKey: 'order_id', as: 'statusHistory' });
    OrderStatusHistory.belongsTo(Order, { foreignKey: 'order_id' });

    return true;
  } catch (error) {
    logger.error('Failed to initialize models:', error);
    throw error;
  }
}

// Place new order
const placeOrder = async (req, res) => {
  try {
    // Ensure models are initialized
    if (!sequelize) {
      await initializeModels();
    }

    const transaction = await sequelize.transaction();
    
    try {
      const { customerName, customerPhone, customerEmail, items, specialInstructions } = req.body;

      console.log('Received order request:', {
        customerName,
        customerPhone,
        customerEmail,
        items,
        specialInstructions
      });

      // Validate required fields
      if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Customer name and items are required',
        });
      }

      // Fetch menu items and validate within transaction
      const menuItemIds = items.map(item => item.menuItemId);
      const menuItems = await MenuItem.findAll({
        where: {
          id: menuItemIds,
          is_available: true,
        },
        transaction
      });

      console.log('Found menu items:', menuItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price
      })));

      if (menuItems.length !== menuItemIds.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Some menu items are not available',
          availableItems: menuItems.map(item => item.id),
          requestedItems: menuItemIds
        });
      }

      // Calculate total amount
      let totalAmount = 0;
      const orderItemsData = [];

      for (const item of items) {
        const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
        if (!menuItem) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Menu item with ID ${item.menuItemId} not found`,
          });
        }

        const itemTotal = menuItem.price * item.quantity;
        totalAmount += itemTotal;

        orderItemsData.push({
          menu_item_id: item.menuItemId,
          quantity: item.quantity,
          item_name: menuItem.name,
          item_price: menuItem.price,
          subtotal: itemTotal,
          special_instructions: item.specialInstructions || null,
        });
      }

      // Create order within transaction
      const orderData = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone || "Not provided",
        customer_email: customerEmail || "Not provided",
        total_amount: totalAmount,
        special_instructions: specialInstructions || null,
        payment_method: 'cash',
        order_status: 'pending',
        payment_status: 'pending'
      };

      console.log('Creating order with data:', orderData);

      const order = await Order.create(orderData, { transaction });

      // Create order items within transaction
      const orderItemsWithOrderId = orderItemsData.map(item => ({
        ...item,
        order_id: order.id,
      }));

      await OrderItem.bulkCreate(orderItemsWithOrderId, { transaction });

      // Create initial status history
      await OrderStatusHistory.create({
        order_id: order.id,
        old_status: null,
        new_status: 'pending',
        changed_by: 'system',
        notes: 'Order placed',
        changed_at: new Date()
      }, { transaction });

      // Commit transaction
      await transaction.commit();

      res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        data: {
          id: order.id,
          customerName: order.customer_name,
          customerPhone: order.customer_phone,
          customerEmail: order.customer_email,
          totalAmount: parseFloat(order.total_amount),
          status: order.order_status,
          paymentStatus: order.payment_status,
          items: orderItemsData,
          createdAt: order.created_at,
        },
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error placing order:', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to place order',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  } catch (error) {
    logger.error('Error placing order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

// Get all orders (admin)
const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, phone, startDate, endDate } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};

    // Apply filters
    if (status) {
      whereClause.order_status = status;
    }

    if (phone) {
      whereClause.customer_phone = { [Sequelize.Op.like]: `%${phone}%` };
    }

    if (startDate || endDate) {
      whereClause.created_at = {};
      if (startDate) {
        whereClause.created_at[Sequelize.Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.created_at[Sequelize.Op.lte] = new Date(endDate);
      }
    }

    const orders = await Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              attributes: ['id', 'name', 'description'],
            },
          ],
        },
        {
          model: OrderStatusHistory,
          as: 'statusHistory',
          order: [['created_at', 'DESC']],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Transform the data to match the frontend expectations
    const transformedOrders = orders.rows.map(order => ({
      id: order.id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.customer_email,
      total_amount: order.total_amount,
      order_status: order.order_status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      special_instructions: order.special_instructions,
      delivery_address: order.delivery_address,
      order_date: order.order_date || order.created_at,
      estimated_delivery_time: order.estimated_delivery_time,
      actual_delivery_time: order.actual_delivery_time,
      cancelled_at: order.cancelled_at,
      cancelled_reason: order.cancelled_reason,
      cancelled_by: order.cancelled_by,
      created_at: order.created_at,
      updated_at: order.updated_at,
      items: order.items || []
    }));

    // Return in the format expected by frontend
    res.json({
      success: true,
      data: transformedOrders,
      totalCount: orders.count,
      totalPages: Math.ceil(orders.count / limit),
      currentPage: parseInt(page)
    });

  } catch (error) {
    logger.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message,
    });
  }
};

// Get orders by customer phone
const getOrdersByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    const orders = await Order.findAll({
      where: {
        customer_phone: { [Sequelize.Op.like]: `%${phone}%` },
      },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              attributes: ['id', 'name', 'description'],
            },
          ],
        },
        {
          model: OrderStatusHistory,
          as: 'statusHistory',
          order: [['created_at', 'DESC']],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    res.json({
      success: true,
      data: orders,
      count: orders.length,
    });

  } catch (error) {
    logger.error('Error fetching orders by phone:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message,
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, changedBy = 'admin', notes } = req.body;

    console.log('Updating order status:', { id, status, changedBy, notes });

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      console.log('Invalid status:', status);
      return res.status(400).json({
        success: false,
        message: 'Invalid order status',
      });
    }

    // Find order
    const order = await Order.findByPk(id);
    if (!order) {
      console.log('Order not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    console.log('Found order:', order.dataValues);

    // Check if order is already cancelled
    if (order.order_status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change status of cancelled order',
      });
    }

    const oldStatus = order.order_status;

    // Update order status - simplified without transaction for now
    await order.update({ order_status: status });

    console.log('Order status updated successfully from', oldStatus, 'to', status);

    // Fetch updated order with items
    const updatedOrder = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              attributes: ['id', 'name', 'description'],
            },
          ],
        },
      ],
    });

    // Transform the response to match frontend expectations
    const transformedOrder = {
      id: updatedOrder.id,
      customer_name: updatedOrder.customer_name,
      customer_phone: updatedOrder.customer_phone,
      customer_email: updatedOrder.customer_email,
      total_amount: updatedOrder.total_amount,
      order_status: updatedOrder.order_status,
      payment_status: updatedOrder.payment_status,
      payment_method: updatedOrder.payment_method,
      special_instructions: updatedOrder.special_instructions,
      delivery_address: updatedOrder.delivery_address,
      order_date: updatedOrder.order_date || updatedOrder.created_at,
      estimated_delivery_time: updatedOrder.estimated_delivery_time,
      actual_delivery_time: updatedOrder.actual_delivery_time,
      cancelled_at: updatedOrder.cancelled_at,
      cancelled_reason: updatedOrder.cancelled_reason,
      cancelled_by: updatedOrder.cancelled_by,
      created_at: updatedOrder.created_at,
      updated_at: updatedOrder.updated_at,
      items: updatedOrder.items || []
    };

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: transformedOrder,
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    logger.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message,
    });
  }
};

// Update payment status
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentMethod } = req.body;

    console.log('Updating payment status:', { id, paymentStatus, paymentMethod });

    // Validate payment status
    const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status',
      });
    }

    // Find order
    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Update payment status and method
    const updateData = { payment_status: paymentStatus };
    if (paymentMethod) {
      updateData.payment_method = paymentMethod;
    }

    await order.update(updateData);

    console.log('Payment status updated successfully');

    // Fetch updated order
    const updatedOrder = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              attributes: ['id', 'name', 'description'],
            },
          ],
        },
      ],
    });

    // Transform the response
    const transformedOrder = {
      id: updatedOrder.id,
      customer_name: updatedOrder.customer_name,
      customer_phone: updatedOrder.customer_phone,
      customer_email: updatedOrder.customer_email,
      total_amount: updatedOrder.total_amount,
      order_status: updatedOrder.order_status,
      payment_status: updatedOrder.payment_status,
      payment_method: updatedOrder.payment_method,
      special_instructions: updatedOrder.special_instructions,
      delivery_address: updatedOrder.delivery_address,
      order_date: updatedOrder.order_date || updatedOrder.created_at,
      estimated_delivery_time: updatedOrder.estimated_delivery_time,
      actual_delivery_time: updatedOrder.actual_delivery_time,
      cancelled_at: updatedOrder.cancelled_at,
      cancelled_reason: updatedOrder.cancelled_reason,
      cancelled_by: updatedOrder.cancelled_by,
      created_at: updatedOrder.created_at,
      updated_at: updatedOrder.updated_at,
      items: updatedOrder.items || []
    };

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: transformedOrder,
    });

  } catch (error) {
    console.error('Error updating payment status:', error);
    logger.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message,
    });
  }
};

// Cancel order (soft delete)
const cancelOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { reason = 'Cancelled by customer', cancelledBy = 'customer' } = req.body;

    // Find order
    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if order can be cancelled
    if (order.order_status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel delivered order',
      });
    }

    if (order.order_status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled',
      });
    }

    const oldStatus = order.order_status;

    // Update order status to cancelled
    await order.update({
      order_status: 'cancelled',
      cancelled_at: new Date(),
      cancellation_reason: reason,
      cancelled_by: cancelledBy,
    }, { transaction });

    // Create status history entry
    await OrderStatusHistory.create({
      order_id: id,
      old_status: oldStatus,
      new_status: 'cancelled',
      changed_by: cancelledBy,
      notes: `Order cancelled: ${reason}`,
    }, { transaction });

    await transaction.commit();

    // Fetch updated order
    const cancelledOrder = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              attributes: ['id', 'name', 'description'],
            },
          ],
        },
        {
          model: OrderStatusHistory,
          as: 'statusHistory',
          order: [['created_at', 'DESC']],
        },
      ],
    });

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: cancelledOrder,
    });

  } catch (error) {
    await transaction.rollback();
    logger.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message,
    });
  }
};

// Initialize models when the module is loaded
initializeModels().catch(error => {
  logger.error('Failed to initialize models:', error);
});

module.exports = {
  placeOrder,
  getAllOrders,
  getOrdersByPhone,
  updateOrderStatus,
  updatePaymentStatus,
  cancelOrder,
}; 