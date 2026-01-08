// backend/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  handleFailedPayment,
  handleWebhook,
  checkPaymentStatus,
  getPaymentAnalytics,
  getPayments,
  getPayment,
  getStudentPayments,
   getAdminPayments,
  downloadInvoice,
  initiateRefund,
  getPaymentStats
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Public webhook route (no auth required)
router.post('/webhook', handleWebhook);

// All other routes are protected
router.use(protect);

// Student routes
router.post('/create-order', protect, authorize('student'), createOrder);
router.post('/verify', protect, authorize('student'), verifyPayment);
router.post('/failed', protect, authorize('student'), handleFailedPayment);
router.get('/student', protect, authorize('student'), getStudentPayments);
router.get('/status/:orderId',protect, checkPaymentStatus);
// backend/routes/paymentRoutes.js - Add this route
router.get('/:id', getPayment);
router.get('/:id/invoice', downloadInvoice);
// ✅ ADMIN ROUTES
router.get('/', protect, authorize('admin'), getPayments); // ✅ Line 25
router.get('/analytics', protect, authorize('admin'), getPaymentAnalytics);
router.get('/stats/overview', protect, authorize('admin'), getPaymentStats);
router.post('/:id/refund', protect, authorize('admin'), initiateRefund);
module.exports = router;