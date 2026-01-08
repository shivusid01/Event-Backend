const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  category: {
    type: String,
    enum: ['general', 'exam', 'payment', 'holiday', 'academic', 'event', 'system'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  target: {
    type: String,
    enum: ['all', 'students', 'teachers', 'specific_class'],
    default: 'all'
  },
  targetClass: {
    type: String
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date
  },
  isImportant: {
    type: Boolean,
    default: false
  },
  attachments: [{
    name: String,
    url: String,
    fileType: String
  }],
  views: {
    type: Number,
    default: 0
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for faster queries
noticeSchema.index({ status: 1, publishDate: -1 });
noticeSchema.index({ target: 1, targetClass: 1 });
noticeSchema.index({ isImportant: 1, publishDate: -1 });

module.exports = mongoose.model('Notice', noticeSchema);