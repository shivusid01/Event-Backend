// backend/utils/generateToken.js
const jwt = require('jsonwebtoken');

/**
 * Generate JWT token
 * @param {Object} payload - The payload to encode in the token
 * @param {string} payload.id - User ID
 * @param {string} payload.role - User role
 * @param {string} payload.email - User email
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

/**
 * Generate refresh token
 * @param {Object} payload - The payload to encode in the token
 * @returns {string} Refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh', {
    expiresIn: '30d',
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Generate password reset token
 * @param {string} userId - User ID
 * @returns {string} Password reset token
 */
const generatePasswordResetToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'password_reset' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

/**
 * Generate email verification token
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @returns {string} Email verification token
 */
const generateEmailVerificationToken = (userId, email) => {
  return jwt.sign(
    { id: userId, email: email, type: 'email_verification' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

/**
 * Generate student enrollment token
 * @param {Object} studentData - Student data
 * @returns {string} Enrollment token
 */
const generateEnrollmentToken = (studentData) => {
  return jwt.sign(
    { 
      ...studentData, 
      type: 'enrollment',
      timestamp: Date.now() 
    },
    process.env.JWT_SECRET,
    { expiresIn: '48h' }
  );
};

/**
 * Generate payment session token
 * @param {Object} paymentData - Payment data
 * @returns {string} Payment session token
 */
const generatePaymentSessionToken = (paymentData) => {
  return jwt.sign(
    { 
      ...paymentData, 
      type: 'payment_session',
      timestamp: Date.now() 
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

/**
 * Decode token without verification (for reading payload)
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if token is expired
 */
const isTokenExpired = (token) => {
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return false;
  } catch (error) {
    return error.name === 'TokenExpiredError';
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  generatePasswordResetToken,
  generateEmailVerificationToken,
  generateEnrollmentToken,
  generatePaymentSessionToken,
  decodeToken,
  isTokenExpired
};