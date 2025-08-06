const { DataTypes } = require('sequelize');

const Order = (sequelize) => {
  return sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    customer_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    customer_phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    customer_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    order_status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'),
      defaultValue: 'pending',
      allowNull: false,
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
      defaultValue: 'pending',
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.ENUM('cash', 'card', 'upi', 'online'),
      allowNull: true,
    },
    special_instructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    delivery_address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    order_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
};

module.exports = Order; 