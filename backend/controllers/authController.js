const authService = require('../services/authService');
const accessLogService = require('../services/accessLogService');

/**
 * Register user (Admin only)
 */
const register = async (req, res, next) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      const error = new Error('Only administrators can create user accounts');
      error.statusCode = 403;
      throw error;
    }

    const { name, email, password, role, department } = req.body;

    const result = await authService.registerUser({
      name,
      email,
      password,
      role: role || 'faculty',
      department,
    });

    // Log access
    await accessLogService.logAccess({
      userId: req.user.id,
      action: 'created',
      resourceType: 'user',
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      details: `Admin ${req.user.email} created user: ${email}`,
    });

    res.status(201).json({
      message: 'User registered successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
const login = async (req, res, next) => {
  try {
    const { email, password, uniqueKey } = req.body;

    const result = await authService.loginUser(email, password, uniqueKey);

    // Log access
    await accessLogService.logAccess({
      userId: result.user.id,
      action: 'viewed',
      resourceType: 'user',
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      details: `User logged in: ${email}`,
    });

    res.status(200).json({
      message: 'Login successful',
      ...result,
    });
  } catch (error) {
    if (error.message === 'MFA_REQUIRED') {
      return res.status(200).json({
        message: 'MFA required',
        error: 'MFA_REQUIRED',
      });
    }
    next(error);
  }
};

/**
 * Enable MFA
 */
const enableMFA = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const uniqueKey = await authService.enableMFA(req.user.id);

    // Log access
    await accessLogService.logAccess({
      userId: req.user.id,
      action: 'updated',
      resourceType: 'user',
      ipAddress: req.clientIp,
      userAgent: req.userAgent,
      details: 'MFA enabled',
    });

    res.status(200).json({
      message: 'MFA enabled successfully',
      uniqueKey: uniqueKey,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Disable MFA
 */
const disableMFA = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    await authService.disableMFA(req.user.id);

    res.status(200).json({
      message: 'MFA disabled successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  enableMFA,
  disableMFA,
};
