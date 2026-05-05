const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/login', authController.login);

// Protected routes
router.post('/register', authenticate, authController.register);
router.post('/mfa/enable', authenticate, authController.enableMFA);
router.post('/mfa/disable', authenticate, authController.disableMFA);

module.exports = router;
