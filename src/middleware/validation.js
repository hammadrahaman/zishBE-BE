const Joi = require('joi');
const { sendError } = require('../utils/responseHandler');

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().min(2).max(50).required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('user', 'admin', 'super_admin').optional(),
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  email: Joi.string().email(),
});

// Validation middleware functions
const validateRegister = (req, res, next) => {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    return sendError(res, error.details[0].message, 400);
  }
  next();
};

const validateLogin = (req, res, next) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return sendError(res, error.details[0].message, 400);
  }
  next();
};

const validateUpdateUser = (req, res, next) => {
  const { error } = updateUserSchema.validate(req.body);
  if (error) {
    return sendError(res, error.details[0].message, 400);
  }
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateUpdateUser,
};