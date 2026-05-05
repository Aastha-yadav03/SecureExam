const express = require('express');
const accessLogController = require('../controllers/accessLogController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all users (Admin only)
router.get('/users', authorize('admin'), accessLogController.getAllUsers);

// Get access logs (Admin only)
router.get('/logs', authorize('admin'), accessLogController.getAccessLogs);

// Get user access history
router.get('/user/:userId/history', accessLogController.getUserAccessHistory);

// Get audit trail (Admin only)
router.get('/audit', authorize('admin'), accessLogController.getAuditTrail);

// Get suspicious activities (Admin only)
router.get('/suspicious', authorize('admin'), accessLogController.getSuspiciousActivities);

module.exports = router;
