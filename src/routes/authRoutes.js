const express = require('express');
const { register, login, getProfile } = require('../controller/authController');
const auth = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

// Protected routes
router.get('/profile', auth, getProfile);

module.exports = router;