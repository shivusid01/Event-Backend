// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  register,
  login,
  logout,
  getMe,
  getProfile,
  updateProfile,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Validation middleware
const registerValidation = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .trim()
    .escape()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail().withMessage('Please include a valid email')
    .normalizeEmail()
    .isLength({ max: 100 }).withMessage('Email must be less than 100 characters'),
  
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .isLength({ max: 128 }).withMessage('Password must be less than 128 characters'),
  
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .trim()
    .matches(/^[0-9]{10}$/).withMessage('Phone number must be 10 digits'),
  
  body('course')
    .optional()
    .trim()
    .escape(),
  
  body('grade')
    .optional()
    .trim()
    .escape()
];

const loginValidation = [
  body('email')
    .isEmail().withMessage('Please include a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail().withMessage('Please include a valid email')
    .normalizeEmail()
];

const resetPasswordValidation = [
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .isLength({ max: 128 }).withMessage('Password must be less than 128 characters')
];

const updateDetailsValidation = [
  body('name')
    .optional()
    .trim()
    .escape()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .optional()
    .isEmail().withMessage('Please include a valid email')
    .normalizeEmail(),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/).withMessage('Phone number must be 10 digits'),
  
  body('address')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 500 }).withMessage('Address must be less than 500 characters'),
  
  body('grade')
    .optional()
    .trim()
    .escape(),
  
  body('bloodGroup')
    .optional()
    .trim()
    .escape(),
  
  body('fatherName')
    .optional()
    .trim()
    .escape(),
  
  body('motherName')
    .optional()
    .trim()
    .escape(),
  
  body('emergencyContact')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/).withMessage('Emergency contact must be 10 digits')
];

const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    .isLength({ max: 128 }).withMessage('New password must be less than 128 characters')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/forgotpassword', forgotPasswordValidation, forgotPassword);
router.put('/resetpassword/:resettoken', resetPasswordValidation, resetPassword);
router.get('/verifyemail/:token', verifyEmail);

// Protected routes
router.get('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetailsValidation, updateDetails);
router.put('/updatepassword', protect, updatePasswordValidation, updatePassword);

// Admin only routes (optional - if you want to add admin auth features)
// router.post('/create-admin', protect, authorize('admin'), createAdmin);
// Profile routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
module.exports = router;