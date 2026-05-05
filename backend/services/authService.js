const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/generateToken');
const { generateUniqueKey } = require('../utils/hashGenerator');
const validators = require('../utils/validators');

/**
 * Register new user
 * @param {object} userData - User data
 * @returns {object} - User and tokens
 */
const registerUser = async (userData) => {
  // Validate input
  if (!validators.validateEmail(userData.email)) {
    const error = new Error('Invalid email format');
    error.statusCode = 400;
    throw error;
  }

  const passwordValidation = validators.validatePassword(userData.password);
  if (!passwordValidation.isValid) {
    const error = new Error(passwordValidation.errors.join(', '));
    error.statusCode = 400;
    throw error;
  }

  if (!validators.validateRole(userData.role)) {
    const error = new Error('Invalid role');
    error.statusCode = 400;
    throw error;
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    const error = new Error('User already exists');
    error.statusCode = 400;
    throw error;
  }

  // Create user
  const user = new User({
    name: userData.name,
    email: userData.email,
    password: userData.password,
    role: userData.role,
    department: userData.department || null,
  });

  await user.save();

  // Generate tokens
  const token = generateToken({ id: user._id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
    },
    token,
    refreshToken,
  };
};

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} uniqueKey - MFA unique key (optional)
 * @returns {object} - User and tokens
 */
const loginUser = async (email, password, uniqueKey = null) => {
  // Find user
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Check if account is locked
  if (user.isAccountLocked()) {
    const error = new Error('Account is locked. Please try again later.');
    error.statusCode = 423; // Locked
    throw error;
  }

  // Verify password
  const isPasswordValid = await user.matchPassword(password);
  if (!isPasswordValid) {
    await user.incLoginAttempts();
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Check MFA if enabled
  if (user.mfaEnabled && !uniqueKey) {
    throw new Error('MFA_REQUIRED');
  }

  if (user.mfaEnabled && uniqueKey !== user.uniqueKey) {
    const error = new Error('Invalid MFA key');
    error.statusCode = 401;
    throw error;
  }

  // Reset login attempts on successful login
  user.loginAttempts = 0;
  user.lockUntil = null;
  user.lastLogin = new Date();
  await user.save();

  // Generate tokens
  const token = generateToken({ id: user._id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
    },
    token,
    refreshToken,
  };
};

/**
 * Enable MFA for user
 * @param {string} userId - User ID
 * @returns {string} - Unique key
 */
const enableMFA = async (userId) => {
  const user = await User.findById(userId);
  const uniqueKey = generateUniqueKey();

  user.uniqueKey = uniqueKey;
  user.mfaEnabled = true;
  await user.save();

  return uniqueKey;
};

/**
 * Disable MFA for user
 * @param {string} userId - User ID
 */
const disableMFA = async (userId) => {
  await User.findByIdAndUpdate(userId, {
    mfaEnabled: false,
    uniqueKey: null,
  });
};

module.exports = {
  registerUser,
  loginUser,
  enableMFA,
  disableMFA,
};
