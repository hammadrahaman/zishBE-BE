const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { sendError } = require('../utils/responseHandler');
const connectDatabase = require('../config/database');
const UserSqlModel = require('../models/UserSql');

let sequelize;
let UserSql;

async function ensureUserModel() {
  if (UserSql) return UserSql;
  sequelize = await connectDatabase();
  UserSql = UserSqlModel(sequelize);
  return UserSql;
}

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return sendError(res, 'Access denied. No token provided.', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || config.JWT_SECRET);
    const User = await ensureUserModel();
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return sendError(res, 'Token is not valid', 401);
    }

    if (user.is_active === false) {
      return sendError(res, 'Account is deactivated', 401);
    }

    req.user = decoded;
    next();
  } catch (error) {
    return sendError(res, 'Token is not valid', 401);
  }
};

module.exports = auth;