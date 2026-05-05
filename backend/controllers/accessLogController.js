const accessLogService = require('../services/accessLogService');
const User = require('../models/User');

/**
 * Get all users (Admin only)
 */
const getAllUsers = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Users retrieved successfully',
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get access logs
 */
const getAccessLogs = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const filters = {
      userId: req.query.userId,
      action: req.query.action,
      paperId: req.query.paperId,
      status: req.query.status,
      limit: parseInt(req.query.limit) || 100,
    };

    const logs = await accessLogService.getAccessLogs(filters);

    res.status(200).json({
      message: 'Access logs retrieved successfully',
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user access history
 */
const getUserAccessHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Users can only view their own history unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const logs = await accessLogService.getUserAccessHistory(userId);

    res.status(200).json({
      message: 'User access history retrieved successfully',
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get audit trail
 */
const getAuditTrail = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const filters = {
      performedBy: req.query.performedBy,
      entityType: req.query.entityType,
      severity: req.query.severity,
      action: req.query.action,
      limit: parseInt(req.query.limit) || 100,
    };

    const trail = await accessLogService.getAuditTrail(filters);

    res.status(200).json({
      message: 'Audit trail retrieved successfully',
      count: trail.length,
      data: trail,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get suspicious activities
 */
const getSuspiciousActivities = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const activities = await accessLogService.getSuspiciousActivities();

    res.status(200).json({
      message: 'Suspicious activities retrieved successfully',
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getAccessLogs,
  getUserAccessHistory,
  getAuditTrail,
  getSuspiciousActivities,
};
