// backend/controllers/paymentController.js - COMPLETE UPDATED VERSION
const Payment = require('../models/Payment');
const User = require('../models/User');
const Course = require('../models/Course');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { 
  sendPaymentConfirmationEmail, 
  sendAdminPaymentNotification,
  sendSMS 
} = require('../utils/emailService');
const { generatePaymentSessionToken } = require('../utils/generateToken');
const { createNotification } = require('../utils/notificationService');

// Initialize Razorpay with error handling
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Webhook signature verification
const verifyWebhookSignature = (body, signature) => {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
  return expectedSignature === signature;
};

// @desc    Create Razorpay order with enhanced validation
// @route   POST /api/payments/create-order
// @ac cess  Private/Student
const createOrder = async (req, res) => {
  try {
    const { amount, month , description } = req.body;
       // frontend se ₹ rupees
        // Validation
    if (!amount || !month) {
      return res.status(400).json({
        success: false,
        message: 'Amount and month are required',
      });
    }

    const amountInPaise = amount * 100;   // paisa me convert

     console.log('Creating Razorpay order:', {
      amount,
      amountInPaise,
      month,
      description
    });

    // 🔥 Ye line hai jahan Razorpay order create hota hai
    const order = await razorpay.orders.create({
      amount: amountInPaise,  // number, paisa
      currency: 'INR',         // string
      receipt: `fee_${month}`,  // string
       notes: {
        description: description || `Fees for ${month}`,
      }
    });

    res.json({
      success: true,
      order,
      key_id: process.env.RAZORPAY_KEY_ID,
      month
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// backend/controllers/paymentController.js - getAdminPayments function add करें

// @desc    Get all payments for admin
// @route   GET /api/payments/admin/all
// @access  Private/Admin
const getAdminPayments = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      search,
      startDate, 
      endDate,
      class: studentClass 
    } = req.query;
    
    let query = {};
    
    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Class filter
    if (studentClass && studentClass !== 'all') {
      query.class = studentClass;
    }
    
    // Date range filter
    if (startDate && endDate) {
      query.paidDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Search functionality (student name, email, transaction ID)
    if (search) {
      // Find student IDs that match search
      const students = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { enrollmentId: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const studentIds = students.map(s => s._id);
      
      if (studentIds.length > 0) {
        query.studentId = { $in: studentIds };
      } else {
        // Also search in payment fields
        query.$or = [
          { orderId: { $regex: search, $options: 'i' } },
          { razorpayPaymentId: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
    }
    
    // Get total count
    const total = await Payment.countDocuments(query);
    
    // Get payments with pagination and populate student details
    const payments = await Payment.find(query)
      .populate('studentId', 'name email phone enrollmentId')
      .sort({ createdAt: -1, paidDate: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
    
    // Calculate statistics
    const completedPayments = payments.filter(p => p.status === 'completed');
    const pendingPayments = payments.filter(p => p.status === 'pending');
    const failedPayments = payments.filter(p => p.status === 'failed');
    
    const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingAmount = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const failedAmount = failedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // Get current month revenue
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    const currentMonthRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paidDate: {
            $gte: new Date(currentYear, currentMonth - 1, 1),
            $lt: new Date(currentYear, currentMonth, 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    // Get class-wise statistics
    const classStats = await Payment.aggregate([
      {
        $match: {
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$class',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      payments,
      stats: {
        totalRevenue,
        pendingAmount,
        failedAmount,
        currentMonthRevenue: currentMonthRevenue.length > 0 ? currentMonthRevenue[0].total : 0,
        completedCount: completedPayments.length,
        pendingCount: pendingPayments.length,
        failedCount: failedPayments.length,
        totalTransactions: payments.length
      },
      classStats,
      summary: {
        avgTransaction: completedPayments.length > 0 ? totalRevenue / completedPayments.length : 0,
        successRate: total > 0 ? (completedPayments.length / total) * 100 : 0
      }
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Verify payment with enhanced notifications
// @route   POST /api/payments/verify
// @access  Private/Student
// backend/controllers/paymentController.js - verifyPayment function को UPDATED करें

// backend/controllers/paymentController.js - verifyPayment function को UPDATED करें

const verifyPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      amount,
      description,
      month,
      class: studentClass,
      studentName 
    } = req.body;

    const studentId = req.user.id;

    console.log('✅ Payment verification request:', {
      razorpay_order_id,
      razorpay_payment_id,
      studentId,
      amount,
      month,
      class: studentClass
    });

    // ✅ 1. Verify signature with Razorpay
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed - Invalid signature'
      });
    }

    // ✅ 2. Check if payment already exists
    let payment = await Payment.findOne({ 
      orderId: razorpay_order_id,
      studentId: studentId
    });

    if (payment) {
      console.log('ℹ️ Payment already exists, updating...');
      
      // Update existing payment
      payment.status = 'completed';
      payment.razorpayPaymentId = razorpay_payment_id;
      payment.paidDate = new Date();
      payment.razorpaySignature = razorpay_signature;
    } else {
      console.log('🆕 Creating new payment record...');
      
      // Create new payment record
      payment = new Payment({
        studentId: studentId,
        studentName: studentName,
        orderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        amount: amount,
        description: description || 'Monthly Fee',
        month: month,
        class: studentClass,
        method: 'razorpay',
        status: 'completed',
        paidDate: new Date(),
        receipt: `receipt_${razorpay_order_id}`,
        paymentId: `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      });
    }

    // ✅ 3. Save payment to database
    await payment.save();

    console.log('💾 Payment saved to database:', {
      paymentId: payment.paymentId,
      amount: payment.amount,
      status: payment.status
    });

    // ✅ 4. Update user's payment history
    const user = await User.findById(studentId);
    if (user) {
      user.payments.push({
        amount: amount,
        date: new Date(),
        status: 'completed',
        transactionId: razorpay_payment_id,
        description: description
      });
      await user.save();
    }

    // ✅ 5. Send response
    res.json({
      success: true,
      message: 'Payment verified and saved successfully',
      data: {
        paymentId: payment.paymentId,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        amount: amount,
        status: 'completed',
        date: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Verify payment error backend:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Payment verification failed',
      error: error.message 
    });
  }
};
// backend/controllers/paymentController.js में verifyPayment function के बाद

// @desc    Handle failed payments
// @route   POST /api/payments/failed
// @access  Private/Student
// backend/controllers/paymentController.js - Add this function if missing
const handleFailedPayment = async (req, res, next) => {
  try {
    const { orderId, errorReason } = req.body;
    const studentId = req.user.id;

    const payment = await Payment.findOne({ 
      orderId, 
      studentId,
      status: 'pending'
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    payment.status = 'failed';
    payment.failedAt = new Date();
    payment.errorMessage = errorReason || 'Payment failed';
    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Payment marked as failed',
      payment
    });

  } catch (error) {
    next(error);
  }
};

// Add to module.exports
module.exports = {
  // ... existing exports
  handleFailedPayment
};

// @desc    Razorpay webhook handler
// @route   POST /api/payments/webhook
// @access  Public (called by Razorpay)
const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body;
    
    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ success: false });
    }
    
    const event = body.event;
    const paymentData = body.payload.payment.entity;
    const orderData = body.payload.order.entity;
    
    console.log(`📢 Razorpay Webhook: ${event}`, {
      paymentId: paymentData.id,
      orderId: orderData.id,
      status: paymentData.status
    });
    
    // Handle different webhook events
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(paymentData, orderData);
        break;
        
      case 'payment.failed':
        await handlePaymentFailed(paymentData, orderData);
        break;
        
      case 'refund.created':
        await handleRefundCreated(body.payload.refund.entity, paymentData);
        break;
        
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }
    
    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false });
  }
};

// Helper: Handle payment captured
const handlePaymentCaptured = async (paymentData, orderData) => {
  try {
    let payment = await Payment.findOne({ orderId: orderData.id });
    
    if (!payment) {
      payment = await Payment.findOne({ razorpayPaymentId: paymentData.id });
    }
    
    if (payment && payment.status !== 'completed') {
      payment.status = 'completed';
      payment.razorpayPaymentId = paymentData.id;
      payment.paidDate = new Date();
      await payment.save();
      
      console.log(`✅ Webhook: Payment ${paymentData.id} marked as completed`);
    }
  } catch (error) {
    console.error('Error in handlePaymentCaptured:', error);
  }
};

// Helper: Handle payment failed
const handlePaymentFailed = async (paymentData, orderData) => {
  try {
    const payment = await Payment.findOne({ orderId: orderData.id });
    
    if (payment) {
      payment.status = 'failed';
      payment.failedAt = new Date();
      payment.errorMessage = paymentData.error_description || 'Payment failed';
      await payment.save();
      
      console.log(`❌ Webhook: Payment ${orderData.id} marked as failed`);
    }
  } catch (error) {
    console.error('Error in handlePaymentFailed:', error);
  }
};

// Helper: Handle refund created
const handleRefundCreated = async (refundData, paymentData) => {
  try {
    const payment = await Payment.findOne({ razorpayPaymentId: paymentData.id });
    
    if (payment) {
      payment.refunds.push({
        amount: refundData.amount / 100,
        reason: refundData.notes?.reason || 'Customer request',
        date: new Date(refundData.created_at * 1000),
        status: refundData.status,
        refundId: refundData.id
      });
      
      if (refundData.amount === paymentData.amount) {
        payment.status = 'refunded';
      } else {
        payment.status = 'partially_refunded';
      }
      
      await payment.save();
      console.log(`🔄 Webhook: Refund ${refundData.id} processed for payment ${paymentData.id}`);
    }
  } catch (error) {
    console.error('Error in handleRefundCreated:', error);
  }
};

// @desc    Check payment status
// @route   GET /api/payments/status/:orderId
// @access  Private
const checkPaymentStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    
    const payment = await Payment.findOne({ orderId })
      .populate('studentId', 'name email')
      .populate('courseId', 'name');
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Check authorization
    if (req.user.role === 'student' && payment.studentId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // If payment is pending, check with Razorpay
    if (payment.status === 'pending') {
      try {
        const razorpayOrder = await razorpay.orders.fetch(orderId);
        if (razorpayOrder.status === 'paid') {
          payment.status = 'completed';
          payment.paidDate = new Date();
          await payment.save();
        }
      } catch (razorpayError) {
        console.error('Error fetching Razorpay order:', razorpayError);
      }
    }
    
    res.status(200).json({
      success: true,
      payment: payment
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment analytics for admin
// @route   GET /api/payments/analytics
// @access  Private/Admin
const getPaymentAnalytics = async (req, res, next) => {
  try {
    const { timeframe = 'monthly' } = req.query;
    const today = new Date();
    
    let startDate;
    switch (timeframe) {
      case 'daily':
        startDate = new Date(today.setDate(today.getDate() - 1));
        break;
      case 'weekly':
        startDate = new Date(today.setDate(today.getDate() - 7));
        break;
      case 'monthly':
        startDate = new Date(today.setMonth(today.getMonth() - 1));
        break;
      case 'yearly':
        startDate = new Date(today.setFullYear(today.getFullYear() - 1));
        break;
      default:
        startDate = new Date(today.setMonth(today.getMonth() - 1));
    }
    
    // Get payment statistics
    const stats = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
          pendingAmount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
          totalTransactions: { $sum: 1 },
          completedTransactions: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failedTransactions: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
        }
      }
    ]);
    
    // Get recent payments
    const recentPayments = await Payment.find({ 
      status: 'completed',
      paidDate: { $gte: startDate }
    })
    .populate('studentId', 'name email enrollmentId')
    .populate('courseId', 'name')
    .sort({ paidDate: -1 })
    .limit(10);
    
    // Get payment method distribution
    const methodStats = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$method',
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      timeframe,
      stats: stats[0] || {
        totalRevenue: 0,
        pendingAmount: 0,
        totalTransactions: 0,
        completedTransactions: 0,
        failedTransactions: 0
      },
      recentPayments,
      methodStats,
      summary: {
        averagePayment: stats[0] ? stats[0].totalRevenue / stats[0].completedTransactions : 0,
        successRate: stats[0] ? (stats[0].completedTransactions / stats[0].totalTransactions) * 100 : 0
      }
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private/Admin
// backend/controllers/paymentController.js - getPayments function को UPDATE करें

// @desc    Get all payments (Admin के लिए)
// @route   GET /api/payments
// @access  Private/Admin
// @desc    Get all payments (Admin के लिए)
// @route   GET /api/payments
// @access  Private/Admin
const getPayments = async (req, res, next) => {
  try {
    const { 
      status, 
      startDate, 
      endDate, 
      studentId, 
      page = 1, 
      limit = 20,
      class: studentClass,
      search 
    } = req.query;
    
    console.log('🔍 Admin fetching payments with filters:', req.query);
    
    let query = {};
    
    // ✅ Status filter
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // ✅ Class filter
    if (studentClass && studentClass !== 'all') {
      query.class = studentClass;
    }
    
    // ✅ Search functionality
    if (search && search.trim() !== '') {
      try {
        // Search in student collection first
        const students = await User.find({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { enrollmentId: { $regex: search, $options: 'i' } }
          ]
        }).select('_id');
        
        const studentIds = students.map(s => s._id);
        
        if (studentIds.length > 0) {
          query.studentId = { $in: studentIds };
        } else {
          // Search in payment fields
          query.$or = [
            { orderId: { $regex: search, $options: 'i' } },
            { razorpayPaymentId: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { class: { $regex: search, $options: 'i' } },
            { month: { $regex: search, $options: 'i' } },
            { studentName: { $regex: search, $options: 'i' } }
          ];
        }
      } catch (searchError) {
        console.error('Search error:', searchError);
      }
    }
    
    // ✅ Date range filter
    if (startDate || endDate) {
      query.$or = [];
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        query.$or.push({
          paidDate: { $gte: start, $lte: end }
        });
        query.$or.push({
          createdAt: { $gte: start, $lte: end }
        });
      } else if (startDate) {
        const start = new Date(startDate);
        query.$or.push({ paidDate: { $gte: start } });
        query.$or.push({ createdAt: { $gte: start } });
      } else if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.$or.push({ paidDate: { $lte: end } });
        query.$or.push({ createdAt: { $lte: end } });
      }
      
      // If $or array is empty, remove it
      if (query.$or.length === 0) {
        delete query.$or;
      }
    }
    
    console.log('✅ Final query:', JSON.stringify(query, null, 2));
    
    // ✅ सभी payments fetch करें
    const payments = await Payment.find(query)
      .populate('studentId', 'name email enrollmentId phone')
      .sort({ createdAt: -1, paidDate: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
    
    const total = await Payment.countDocuments(query);
    
    console.log(`✅ Found ${payments.length} payments out of ${total} total`);
    
    // Calculate statistics - ALL payments
    const completedPayments = await Payment.find({ ...query, status: 'completed' });
    const pendingPayments = await Payment.find({ ...query, status: 'pending' });
    const failedPayments = await Payment.find({ ...query, status: 'failed' });
    
    const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingAmount = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const failedAmount = failedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // Current month revenue
    const currentDate = new Date();
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    currentMonthEnd.setHours(23, 59, 59, 999);
    
    const currentMonthRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          $or: [
            { paidDate: { $gte: currentMonthStart, $lte: currentMonthEnd } },
            { createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    // Get unique classes for filter dropdown
    const uniqueClasses = await Payment.distinct('class', query);
    
    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      payments,
      stats: {
        totalRevenue,
        pendingAmount,
        failedAmount,
        currentMonthRevenue: currentMonthRevenue.length > 0 ? currentMonthRevenue[0].total : 0,
        completedCount: completedPayments.length,
        pendingCount: pendingPayments.length,
        failedCount: failedPayments.length,
        totalTransactions: total
      },
      filters: {
        availableClasses: uniqueClasses.filter(c => c).sort(),
        availableStatuses: ['completed', 'pending', 'failed']
      },
      queryInfo: {
        appliedFilters: Object.keys(req.query).filter(k => req.query[k] && k !== 'page' && k !== 'limit'),
        searchUsed: !!search
      }
    });
    
  } catch (error) {
    console.error('❌ Error in getPayments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message
    });
  }
};

// @desc    Get single payment
// @route   GET /api/payments/:id
// @access  Private
const getPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('studentId', 'name email phone enrollmentId address')
      .populate('courseId', 'name fee duration instructor');
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Check if user is authorized to view this payment
    if (req.user.role === 'student' && payment.studentId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment'
      });
    }
    
    res.status(200).json({
      success: true,
      payment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student's payments
// @route   GET /api/payments/student/:studentId
// @access  Private/Student
// backend/controllers/paymentController.js में

// backend/controllers/paymentController.js - getStudentPayments function को UPDATED करें

// backend/controllers/paymentController.js - COMPLETE FIXED VERSION

// backend/controllers/paymentController.js - getStudentPayments function

const getStudentPayments = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    
    console.log('📋 Fetching REAL payments for student:', studentId);

    // ✅ केवल completed और failed payments, NO pending
    const payments = await Payment.find({ 
      studentId: studentId,
      status: { $in: ['completed', 'failed'] } // केवल ये दो status
    })
    .sort({ createdAt: -1, paidDate: -1 })
    .lean();

    console.log(`✅ Found ${payments.length} real payments (completed/failed)`);

    // ✅ REAL payments के लिए calculate - NO mock data
    const totalPaid = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const failedAmount = payments
      .filter(p => p.status === 'failed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const stats = {
      completed: payments.filter(p => p.status === 'completed').length,
      failed: payments.filter(p => p.status === 'failed').length,
      totalPaid: totalPaid, // REAL amount
      failedAmount: failedAmount, // REAL amount
      totalTransactions: payments.length
    };

    res.status(200).json({
      success: true,
      count: payments.length,
      payments: payments,
      stats: stats
    });
    
  } catch (error) {
    console.error('❌ Error in getStudentPayments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch payments'
    });
  }
};

// @desc    Download invoice
// @route   GET /api/payments/:id/invoice
// @access  Private
const downloadInvoice = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('studentId', 'name email enrollmentId address phone')
      .populate('courseId', 'name');
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Check authorization
    if (req.user.role === 'student' && payment.studentId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this invoice'
      });
    }
    
    // Generate detailed invoice HTML
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice - ${payment.paymentId}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8fafc;
            padding: 40px;
          }
          
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
            overflow: hidden;
          }
          
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px;
            text-align: center;
            color: white;
          }
          
          .header h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          
          .header p {
            opacity: 0.9;
            font-size: 16px;
          }
          
          .invoice-meta {
            display: flex;
            justify-content: space-between;
            background: #f1f5f9;
            padding: 24px 40px;
            border-bottom: 1px solid #e2e8f0;
          }
          
          .meta-item h3 {
            color: #64748b;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          
          .meta-item p {
            color: #1e293b;
            font-size: 16px;
            font-weight: 600;
          }
          
          .content {
            padding: 40px;
          }
          
          .section {
            margin-bottom: 32px;
          }
          
          .section-title {
            color: #475569;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e2e8f0;
          }
          
          .details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 24px;
          }
          
          .detail-item {
            background: #f8fafc;
            padding: 16px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          
          .detail-label {
            color: #64748b;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 4px;
          }
          
          .detail-value {
            color: #1e293b;
            font-size: 16px;
            font-weight: 600;
          }
          
          .payment-table {
            width: 100%;
            border-collapse: collapse;
            margin: 24px 0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }
          
          .payment-table th {
            background: #f1f5f9;
            color: #475569;
            font-weight: 600;
            padding: 16px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          
          .payment-table td {
            padding: 16px;
            border-bottom: 1px solid #f1f5f9;
          }
          
          .total-section {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            padding: 24px;
            border-radius: 12px;
            margin-top: 32px;
            text-align: center;
          }
          
          .total-amount {
            font-size: 36px;
            font-weight: 700;
            color: #0369a1;
            margin: 8px 0;
          }
          
          .status-badge {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .status-completed {
            background: #dcfce7;
            color: #166534;
          }
          
          .status-pending {
            background: #fef3c7;
            color: #92400e;
          }
          
          .status-failed {
            background: #fee2e2;
            color: #991b1b;
          }
          
          .status-refunded {
            background: #e0f2fe;
            color: #0369a1;
          }
          
          .footer {
            text-align: center;
            padding: 32px;
            color: #64748b;
            font-size: 14px;
            border-top: 1px solid #e2e8f0;
            background: #f8fafc;
          }
          
          .footer-logo {
            font-size: 20px;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 8px;
          }
          
          @media print {
            body {
              background: white;
              padding: 0;
            }
            
            .invoice-container {
              box-shadow: none;
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <!-- Header -->
          <div class="header">
            <h1>EduCoach Pro</h1>
            <p>Official Payment Invoice</p>
          </div>
          
          <!-- Invoice Meta -->
          <div class="invoice-meta">
            <div class="meta-item">
              <h3>Invoice Number</h3>
              <p>${payment.paymentId || payment._id.toString().substring(0, 8).toUpperCase()}</p>
            </div>
            <div class="meta-item">
              <h3>Issue Date</h3>
              <p>${new Date(payment.paidDate || payment.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
            </div>
            <div class="meta-item">
              <h3>Status</h3>
              <span class="status-badge status-${payment.status}">${payment.status}</span>
            </div>
          </div>
          
          <!-- Content -->
          <div class="content">
            <!-- Student Details -->
            <div class="section">
              <h2 class="section-title">Student Information</h2>
              <div class="details-grid">
                <div class="detail-item">
                  <div class="detail-label">Full Name</div>
                  <div class="detail-value">${payment.studentId.name}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Enrollment ID</div>
                  <div class="detail-value">${payment.studentId.enrollmentId}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Email Address</div>
                  <div class="detail-value">${payment.studentId.email}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Phone Number</div>
                  <div class="detail-value">${payment.studentId.phone || 'N/A'}</div>
                </div>
              </div>
            </div>
            
            <!-- Payment Details -->
            <div class="section">
              <h2 class="section-title">Payment Details</h2>
              <table class="payment-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Course</th>
                    <th>Month</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${payment.description}</td>
                    <td>${payment.courseId ? payment.courseId.name : 'General'}</td>
                    <td>${payment.month || 'N/A'}</td>
                    <td>₹${payment.amount.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
              
              <div class="total-section">
                <div class="detail-label">Total Amount</div>
                <div class="total-amount">₹${payment.amount.toLocaleString('en-IN')}</div>
                <div class="detail-value">${payment.method ? payment.method.charAt(0).toUpperCase() + payment.method.slice(1) : ''} Payment</div>
              </div>
            </div>
            
            <!-- Transaction Details -->
            <div class="section">
              <h2 class="section-title">Transaction Information</h2>
              <div class="details-grid">
                <div class="detail-item">
                  <div class="detail-label">Transaction ID</div>
                  <div class="detail-value">${payment.razorpayPaymentId || payment.orderId || 'N/A'}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Payment Method</div>
                  <div class="detail-value">${payment.method ? payment.method.replace('_', ' ').toUpperCase() : 'N/A'}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Payment Date</div>
                  <div class="detail-value">${new Date(payment.paidDate || payment.createdAt).toLocaleString('en-IN')}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Receipt Number</div>
                  <div class="detail-value">${payment.receipt || 'N/A'}</div>
                </div>
              </div>
            </div>
            
            <!-- Refunds Section (if any) -->
            ${payment.refunds && payment.refunds.length > 0 ? `
            <div class="section">
              <h2 class="section-title">Refunds</h2>
              <table class="payment-table">
                <thead>
                  <tr>
                    <th>Refund ID</th>
                    <th>Amount</th>
                    <th>Reason</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${payment.refunds.map(refund => `
                    <tr>
                      <td>${refund.refundId || 'N/A'}</td>
                      <td>₹${refund.amount.toLocaleString('en-IN')}</td>
                      <td>${refund.reason || 'N/A'}</td>
                      <td>${new Date(refund.date).toLocaleDateString('en-IN')}</td>
                      <td>${refund.status || 'N/A'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <div class="footer-logo">EduCoach Pro</div>
            <p>123 Education Street, Knowledge City, Delhi - 110001</p>
            <p>Phone: +91 98765 43210 • Email: accounts@educoachpro.com</p>
            <p>GSTIN: 07AABCE1234F1Z5 • PAN: AABCE1234F</p>
            <p style="margin-top: 16px; font-size: 12px;">
              This is a computer-generated invoice. No signature required.
            </p>
          </div>
        </div>
        
        <script>
          // Auto-print on load (optional)
          window.onload = function() {
            // Uncomment below line to auto-print
            // window.print();
          };
        </script>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${payment.paymentId || payment._id}.html"`);
    res.send(invoiceHTML);
  } catch (error) {
    next(error);
  }
};

// @desc    Initiate refund
// @route   POST /api/payments/:id/refund
// @access  Private/Admin
const initiateRefund = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed payments can be refunded'
      });
    }
    
    if (!payment.razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay payment ID not found'
      });
    }
    
    const { amount, reason } = req.body;
    const refundAmount = amount || payment.amount;
    
    // Validate refund amount
    if (refundAmount > payment.amount) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount cannot exceed original payment amount'
      });
    }
    
    // Create refund in Razorpay
    const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
      amount: Math.round(refundAmount * 100),
      speed: 'normal',
      notes: {
        reason: reason || 'Customer request',
        refundedBy: req.user.name,
        refundedByEmail: req.user.email,
        refundedAt: new Date().toISOString(),
        originalPaymentId: payment._id.toString()
      }
    });
    
    // Update payment record
    payment.refunds.push({
      amount: refundAmount,
      reason: reason || 'Customer request',
      date: new Date(refund.created_at * 1000),
      status: refund.status,
      refundId: refund.id,
      processedBy: req.user.id
    });
    
    if (refundAmount === payment.amount) {
      payment.status = 'refunded';
    } else {
      payment.status = 'partially_refunded';
    }
    
    await payment.save();
    
    // Get student details for notification
    const student = await User.findById(payment.studentId);
    
    res.status(200).json({
      success: true,
      refund: {
        id: refund.id,
        amount: refundAmount,
        status: refund.status,
        createdAt: new Date(refund.created_at * 1000)
      },
      payment: {
        id: payment._id,
        newStatus: payment.status,
        refundsCount: payment.refunds.length
      },
      student: student ? {
        name: student.name,
        email: student.email
      } : null,
      message: 'Refund initiated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment statistics
// @route   GET /api/payments/stats/overview
// @access  Private/Admin
const getPaymentStats = async (req, res, next) => {
  try {
    // Get total revenue
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // Get monthly revenue for current year
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paidDate: { $gte: new Date(`${currentYear}-01-01`) }
        }
      },
      {
        $group: {
          _id: { $month: '$paidDate' },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    // Get payment method distribution
    const methodDistribution = await Payment.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$method',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);
    
    // Get pending payments count
    const pendingCount = await Payment.countDocuments({ status: 'pending' });
    const failedCount = await Payment.countDocuments({ status: 'failed' });
    const completedCount = await Payment.countDocuments({ status: 'completed' });
    const refundedCount = await Payment.countDocuments({ status: 'refunded' });
    
    // Get today's revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paidDate: { $gte: today, $lt: tomorrow }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // Get top paying students
    const topStudents = await Payment.aggregate([
      {
        $match: { status: 'completed' }
      },
      {
        $group: {
          _id: '$studentId',
          totalPaid: { $sum: '$amount' },
          paymentCount: { $sum: 1 }
        }
      },
      { $sort: { totalPaid: -1 } },
      { $limit: 5 }
    ]);
    
    // Populate student names for top students
    const topStudentsWithNames = await Promise.all(
      topStudents.map(async (student) => {
        const studentInfo = await User.findById(student._id).select('name email enrollmentId');
        return {
          ...student,
          student: studentInfo
        };
      })
    );
    
    res.status(200).json({
      success: true,
      stats: {
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
        todayRevenue: todayRevenue.length > 0 ? todayRevenue[0].total : 0,
        totalTransactions: completedCount + failedCount + refundedCount,
        pendingCount,
        failedCount,
        completedCount,
        refundedCount,
        monthlyRevenue,
        methodDistribution,
        topStudents: topStudentsWithNames
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  checkPaymentStatus,
  getPaymentAnalytics,
  getPayments,
  getPayment,
  handleFailedPayment,
  getStudentPayments,
  downloadInvoice,
  initiateRefund,
  getPaymentStats
};