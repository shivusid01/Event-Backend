// backend/server.js - SIMPLIFIED VERSION (No security packages required)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const classRoutes = require('./routes/classRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const contactRoutes = require('./routes/contactRoutes');

// Import DB connection
const connectDB = require('./config/database');

// Initialize app
const app = express();

/* ===================== MIDDLEWARE ===================== */

// CORS Configuration
const allowedOrigins = [
  process.env.APP_URL || 'http://localhost:5173',
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://dashboard.razorpay.com'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, webhooks)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      
      // Log blocked origins for debugging
      console.log(`🛡️ CORS blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Razorpay-Signature',
      'Accept',
      'Origin'
    ],
  })
);

// Handle preflight requests
app.options('*', cors());

// Body parsers
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString(); // Store raw body for webhook verification
  }
}));
app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb'
}));

// Request logger (DEBUG PURPOSE)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`➡️ ${req.method} ${req.originalUrl}`);
    
    // Log body for non-sensitive routes
    const sensitiveRoutes = ['/api/auth/login', '/api/auth/register'];
    if (req.body && Object.keys(req.body).length > 0 && 
        !sensitiveRoutes.includes(req.path)) {
      console.log('📦 Body:', req.body);
    }
    
    // Log headers for webhooks
    if (req.path.includes('/webhook')) {
      console.log('📨 Headers:', req.headers);
    }
    
    next();
  });
}

/* ===================== STATIC FILES ===================== */

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ===================== DATABASE ===================== */

connectDB();

// Handle database connection events
mongoose.connection.on('connected', () => {
  console.log('🗄️ MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

/* ===================== ROUTES ===================== */

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/contact', contactRoutes);

/* ===================== WEBHOOK ROUTES ===================== */

// Special middleware for webhook raw body
app.use('/api/payments/webhook', (req, res, next) => {
  // Razorpay webhook requires raw body for signature verification
  if (req.rawBody) {
    try {
      req.body = JSON.parse(req.rawBody);
    } catch (error) {
      console.error('Error parsing webhook body:', error);
    }
  }
  next();
});

/* ===================== HEALTH CHECK ===================== */

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV,
  });
});

/* ===================== TEST ENDPOINTS ===================== */

// Test Razorpay configuration
app.get('/api/test/razorpay', (req, res) => {
  const config = {
    razorpay_key: process.env.RAZORPAY_KEY_ID ? '✅ Configured' : '❌ Not configured',
    razorpay_secret: process.env.RAZORPAY_KEY_SECRET ? '✅ Configured' : '❌ Not configured',
    webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET ? '✅ Configured' : '❌ Not configured',
    frontend_url: process.env.FRONTEND_URL || '❌ Not configured',
  };
  
  res.status(200).json({
    success: true,
    message: 'Razorpay Configuration Check',
    config,
    instructions: 'Set missing environment variables in .env file'
  });
});

// Test email service
app.get('/api/test/email', async (req, res) => {
  try {
    // Check if email service is configured
    const emailConfig = {
      email_user: process.env.EMAIL_USER || process.env.SMTP_USER ? '✅ Configured' : '❌ Not configured',
      email_host: process.env.EMAIL_HOST || process.env.SMTP_HOST ? '✅ Configured' : '❌ Not configured',
    };
    
    res.status(200).json({
      success: true,
      message: 'Email Configuration Check',
      config: emailConfig,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Email service test error',
      error: error.message,
    });
  }
});

/* ===================== 404 HANDLER ===================== */

app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

/* ===================== GLOBAL ERROR HANDLER ===================== */

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error
  console.error('🔥 ERROR:', {
    message: err.message,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
  
  // Special handling for Razorpay errors
  if (err.name === 'RazorpayError') {
    console.error('💳 Razorpay Error:', err);
    return res.status(400).json({
      success: false,
      message: 'Payment gateway error',
      error: err.message,
    });
  }
  
  // Handle mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message),
    });
  }
  
  // Handle mongoose duplicate key errors
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value entered',
      field: Object.keys(err.keyPattern)[0],
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
    });
  }
  
  // Error response
  const errorResponse = {
    success: false,
    message,
  };
  
  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }
  
  res.status(statusCode).json(errorResponse);
});

/* ===================== GRACEFUL SHUTDOWN ===================== */

// Handle graceful shutdown
const gracefulShutdown = () => {
  console.log('🔄 Received shutdown signal, closing connections...');
  
  // Close server
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    // Close database connection
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcing shutdown');
    process.exit(1);
  }, 10000);
};

// Listen for shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
  process.exit(1);
});

/* ===================== START SERVER ===================== */

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Coaching Institute Backend API`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`💳 Razorpay: ${process.env.RAZORPAY_KEY_ID ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`📧 Email: ${process.env.EMAIL_USER || process.env.SMTP_USER ? '✅ Configured' : '❌ Not configured'}`);
  console.log('='.repeat(50));
  console.log('📋 Available Routes:');
  console.log('  - /api/health               - Health check');
  console.log('  - /api/auth/*              - Authentication');
  console.log('  - /api/users/*             - User management');
  console.log('  - /api/courses/*           - Course management');
  console.log('  - /api/payments/*          - Payment processing');
  console.log('  - /api/classes/*           - Class management');
  console.log('  - /api/notices/*           - Notice management');
  console.log('  - /api/contact/*           - Contact form');
  console.log('  - /api/test/razorpay       - Test Razorpay config');
  console.log('  - /api/test/email          - Test Email config');
  console.log('='.repeat(50));
});

// Export for testing
module.exports = app;