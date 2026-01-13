// backend/controllers/authController.js
const User = require('../models/User');
const {
  generateToken,
  generatePasswordResetToken,
  verifyToken,
} = require('../utils/generateToken');
const {
  sendWelcomeEmail,
  sendPasswordResetEmail,
} = require('../utils/emailService');

/* ======================================================
   REGISTER
====================================================== */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, course, grade } = req.body;

    // ✅ Required fields
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password and phone are required',
      });
    }

    // ✅ Email normalization
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log('📝 REGISTER ATTEMPT:', { 
      name, 
      email: normalizedEmail, 
      phone,
      course 
    });

    // ✅ Check existing user by email
    const existingUser = await User.findOne({ 
      email: normalizedEmail 
    });
    
    if (existingUser) {
      console.log('❌ Email already exists:', normalizedEmail);
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
        field: 'email'
      });
    }

    // ✅ Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: password,
      phone: phone.trim(),
      course: course || '',
      grade: grade || '',
      role: 'student',
      status: 'active',
      isVerified: false
    });

    console.log('✅ User created successfully:', {
      id: user._id,
      email: user.email,
      enrollmentId: user.enrollmentId
    });

    const token = generateToken({
      id: user._id,
      role: user.role,
      email: user.email,
    });

    // Remove password
    user.password = undefined;

    res.status(201).json({
      success: true,
      token,
      user,
      message: 'Registration successful',
    });
  } catch (error) {
    console.error('❌ REGISTRATION ERROR:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Duplicate ${field} value entered`,
        field: field
      });
    }
    
    next(error);
  }
};

/* ======================================================
   LOGIN
====================================================== */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 LOGIN DEBUG: Request received', { 
      email, 
      hasPassword: !!password 
    });

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // ✅ Email को lowercase और trim करें
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log('🔍 Searching for user with email:', normalizedEmail);
    
    // ✅ .select('+password') सही है
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    
    if (!user) {
      console.log('❌ User not found for email:', normalizedEmail);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    console.log('✅ User found:', {
      id: user._id,
      email: user.email,
      hasPasswordField: !!user.password,
      passwordLength: user.password?.length || 0
    });

    // ✅ Password comparison
    console.log('🔑 Starting password comparison...');
    const isMatch = await user.comparePassword(password);
    console.log('🔑 Password comparison result:', isMatch);

    if (!isMatch) {
      console.log('❌ Password does not match for user:', user.email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check user status
    if (user.status && user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated',
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken({
      id: user._id,
      role: user.role,
      email: user.email,
    });

    // Remove password from response
    user.password = undefined;

    console.log('✅ Login successful for:', user.email);

    res.status(200).json({
      success: true,
      token,
      user,
      message: 'Login successful',
    });
  } catch (error) {
    console.error('🔥 LOGIN ERROR DETAILS:', {
      message: error.message,
      stack: error.stack,
      email: req.body?.email
    });
    next(error);
  }
};


/* ======================================================
   LOGOUT (GET + POST SAFE)
====================================================== */
const logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

/* ======================================================
   GET CURRENT USER
====================================================== */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/* ======================================================
   UPDATE PROFILE
====================================================== */
const updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = { ...req.body };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      user,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/* ======================================================
   UPDATE PASSWORD
====================================================== */
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current and new password are required',
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/* ======================================================
   FORGOT PASSWORD
====================================================== */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          'If an account exists with this email, a reset link has been sent',
      });
    }

    const resetToken = generatePasswordResetToken(user._id);

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000;
    await user.save();

    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetToken,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset email sent',
    });
  } catch (error) {
    next(error);
  }
};

/* ======================================================
   RESET PASSWORD
====================================================== */
const resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    const { resettoken } = req.params;

    const decoded = verifyToken(resettoken);

    if (!decoded || decoded.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: resettoken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    next(error);
  }
};

/* ======================================================
   VERIFY EMAIL
====================================================== */
const verifyEmail = async (req, res, next) => {
  try {
    const decoded = verifyToken(req.params.token);

    if (!decoded || decoded.type !== 'email_verification') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    next(error);
  }
};

// backend/controllers/authController.js में getProfile function को यह update करें:

const getProfile = async (req, res) => {
  try {
    console.log('👤 Fetching profile for user ID:', req.user.id);
    console.log('👤 User object from token:', req.user);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const user = await User.findById(req.user.id)
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .lean();

    console.log('👤 Database query result:', user ? 'User found' : 'User not found');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('👤 User data from DB:', {
      id: user._id,
      name: user.name,
      email: user.email,
      class: user.class,
      role: user.role
    });

    // Get payment stats for student (optional - if Payment model exists)
    let paymentStats = {};
    try {
      if (user.role === 'student') {
        const Payment = require('../models/Payment');
        const payments = await Payment.find({ studentId: user._id });
        const totalPaid = payments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        
        paymentStats = {
          totalPaid,
          totalPayments: payments.length,
          lastPayment: payments.length > 0 ? payments[0].paidDate : null
        };
        
        console.log('💰 Payment stats:', paymentStats);
      }
    } catch (paymentError) {
      console.log('⚠️ Payment stats not available:', paymentError.message);
      // Continue without payment stats
    }

    // Combine user data with stats
    const profileData = {
      ...user,
      ...paymentStats
    };

    console.log('✅ Profile data ready to send');

    res.status(200).json({
      success: true,
      data: profileData
    });

  } catch (error) {
    console.error('❌ Get profile error DETAILS:', {
      message: error.message,
      stack: error.stack,
      user: req.user
    });
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, phone, parentPhone, address, class: studentClass } = req.body;
    
    // Fields that can be updated
    const updateFields = {};
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;
    if (parentPhone) updateFields.parentPhone = parentPhone;
    if (address) updateFields.address = address;
    if (studentClass) updateFields.class = studentClass;

    // Find and update user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


module.exports = {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  getProfile,      // Add this
  updateProfile 
};
