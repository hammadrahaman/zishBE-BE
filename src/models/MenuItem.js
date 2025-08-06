const { DataTypes } = require('sequelize');

const MenuItem = (sequelize) => {
  return sequelize.define('MenuItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    preparation_time_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
      },
    },
  }, {
    tableName: 'menu_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['category_id'],
      },
      {
        fields: ['is_available'],
      },
    ],
  });
};

module.exports = MenuItem; 