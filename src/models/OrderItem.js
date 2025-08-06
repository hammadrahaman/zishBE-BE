const { DataTypes } = require('sequelize');

const OrderItem = (sequelize) => {
  return sequelize.define('OrderItem', {
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
    menu_item_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Can be null if menu item is deleted later
      references: {
        model: 'menu_items',
        key: 'id',
      },
    },
    // Snapshot data at time of order (in case menu item changes later)
    item_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    item_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    special_instructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
  }, {
    tableName: 'order_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['order_id'],
      },
      {
        fields: ['menu_item_id'],
      },
    ],
  });
};

module.exports = OrderItem;
