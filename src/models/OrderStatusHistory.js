const { DataTypes } = require('sequelize');

const OrderStatusHistory = (sequelize) => {
  return sequelize.define('OrderStatusHistory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id',
      },
    },
    old_status: {
      type: DataTypes.STRING(20),
      allowNull: true, // Can be null for first status
    },
    new_status: {
      type: DataTypes.STRING(20),
      allowNull: false, // This was the missing required field
    },
    changed_by: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    changed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'order_status_history',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
};

module.exports = OrderStatusHistory; 