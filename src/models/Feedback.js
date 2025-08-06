const { DataTypes } = require('sequelize');

const Feedback = (sequelize) => {
  return sequelize.define('Feedback', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    customer_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'Anonymous',
      validate: {
        len: [1, 255],
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,  // Changed to allow null
      defaultValue: null,  // Changed to null instead of "Not provided"
      validate: {
        len: [0, 255],
        // Custom validator that only validates email format if value is provided
        isEmailOrEmpty(value) {
          if (value && value.trim() !== '') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              throw new Error('Must be a valid email address');
            }
          }
        }
      },
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
        isInt: true,
      },
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,  // Changed to allow null
      defaultValue: null,  // Changed to null
      validate: {
        len: [0, 2000],  // Changed to allow empty
      },
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'feedback',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['rating'],
      },
      {
        fields: ['timestamp'],
      },
      {
        fields: ['date'],
      },
    ],
  });
};

module.exports = Feedback; 