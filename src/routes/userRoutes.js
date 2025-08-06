const express = require('express');
const {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require('../controller/userController');
const auth = require('../middleware/auth');
const { validateUpdateUser } = require('../middleware/validation');

const router = express.Router();

// All user routes require authentication
router.use(auth);

router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', validateUpdateUser, updateUser);
router.delete('/:id', deleteUser);

module.exports = router;