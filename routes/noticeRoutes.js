const express = require('express');
const router = express.Router();
const {
  createNotice,
  getAllNotices,
  getStudentNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
  markAsRead,
  getNoticeStats,
  getUnreadCount
} = require('../controllers/noticeController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Admin routes
router.post('/', protect, authorize('admin'), createNotice);
router.get('/', protect, authorize('admin'), getAllNotices);
router.get('/stats/overview', protect, authorize('admin'), getNoticeStats);
router.put('/:id', protect, authorize('admin'), updateNotice);
router.delete('/:id', protect, authorize('admin'), deleteNotice);

// Student routes
router.get('/student', protect, authorize('student'), getStudentNotices);
router.get('/student/unread-count', protect, authorize('student'), getUnreadCount);
router.post('/:id/read', protect, authorize('student'), markAsRead);

// Common routes
router.get('/:id', protect, getNoticeById);

module.exports = router;