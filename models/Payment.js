const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  class: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentId: {
    type: String,
    unique: true,
    sparse: true
  },
  orderId: {
    type: String,
    required: true
  },
  razorpayPaymentId: {
    type: String
  },
  razorpaySignature: {
    type: String
  },
  method: {
    type: String,
    enum: ['razorpay', 'stripe', 'paypal', 'bank_transfer', 'upi'],
    default: 'razorpay'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  description: {
    type: String,
    required: true
  },
  month: {
    type: String,
    required: true
  },
  dueDate: {
    type: Date
  },
  paidDate: {
    type: Date
  },
  invoiceUrl: {
    type: String
  },
  refunds: [{
    amount: Number,
    reason: String,
    date: Date,
    status: String,
    refundId: String,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for faster queries
paymentSchema.index({ studentId: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ paidDate: -1 });
paymentSchema.index({ orderId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ razorpayPaymentId: 1 }, { unique: true, sparse: true });

// Generate payment ID if not exists
paymentSchema.pre('save', function(next) {
  if (!this.paymentId) {
    this.paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);