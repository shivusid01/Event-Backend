// backend/server.js - UPDATED CORS CONFIGURATION
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

// CORS Configuration - UPDATED
const allowedOrigins = [
  process.env.APP_URL || 'http://localhost:5173',
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5175',  // ✅ Added your current frontend port
  'http://localhost:5174',
  'http://localhost:3000',
  'https://dashboard.razorpay.com',
  'https://event-backend-brown.vercel.app',  // ✅ Added your backend URL as frontend
  'http://event-backend-brown.vercel.app',    // ✅ Added HTTP version
  'https://sharma-institute-frontend.vercel.app', // ✅ If you have separate frontend
  'http://sharma-institute-frontend.vercel.app'   // ✅ HTTP version
];

// ✅ SIMPLIFIED CORS CONFIGURATION
app.use(cors({
  origin: ['http://localhost:5173', 'https://your-frontend.vercel.app'],
  credentials: true
}));
// ✅ ALTERNATIVE: ALLOW ALL ORIGINS (For testing)
// app.use(cors({
//   origin: '*',
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
// }));

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
    
    // Log CORS headers
    console.log('🌐 Origin:', req.headers.origin);
    console.log('📨 Headers:', {
      'access-control-request-method': req.headers['access-control-request-method'],
      'access-control-request-headers': req.headers['access-control-request-headers']
    });
    
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

// connectDB();

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

let isConnected = false;

async function connectToMongoDB() {
  try{
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log('🗄️ Connected to MongoDB');
  }catch(error){
    console.error('❌ Error Connecting to MongoDB:', error);
  }
}

app.use(async (req, res, next) => {
  if (!isConnected) {
    await connectToMongoDB();
  }
  next();
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

/* ===================== ROOT ENDPOINT ===================== */

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Event Backend API is running 🚀",
    availableEndpoints: [
      "/api/health",
      "/api/auth",
      "/api/users",
      "/api/courses",
      "/api/payments",
      "/api/classes",
      "/api/notices",
      "/api/contact"
    ],
    cors: {
      allowedOrigins: allowedOrigins,
      status: "Active"
    }
  });
});

/* ===================== CORS TEST ENDPOINT ===================== */

app.get('/api/cors-test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CORS Test Successful',
    origin: req.headers.origin,
    allowedOrigins: allowedOrigins,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
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
    cors: {
      allowedOrigins: allowedOrigins,
      originHeader: req.headers.origin
    }
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
  
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS Error: Origin not allowed',
      origin: req.headers.origin,
      allowedOrigins: allowedOrigins,
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

module.exports = app;