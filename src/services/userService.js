const User = require('../models/User');

class UserService {
  // Get user by email
  static async getUserByEmail(email) {
    return await User.findOne({ email });
  }

  // Get user by ID
  static async getUserById(id) {
    return await User.findById(id);
  }

  // Create new user
  static async createUser(userData) {
    const user = new User(userData);
    return await user.save();
  }

  // Update user
  static async updateUser(id, userData) {
    return await User.findByIdAndUpdate(id, userData, {
      new: true,
      runValidators: true,
    });
  }

  // Delete user
  static async deleteUser(id) {
    return await User.findByIdAndDelete(id);
  }

  // Get users with pagination
  static async getUsers(page = 1, limit = 10, filter = {}) {
    const skip = (page - 1) * limit;
    
    const users = await User.find(filter)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Update last login
  static async updateLastLogin(userId) {
    return await User.findByIdAndUpdate(userId, {
      lastLogin: new Date(),
    });
  }
}

module.exports = UserService;