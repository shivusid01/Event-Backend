const express = require('express');
const router = express.Router();
const {
  createClass,
  deleteClass,
  getAllClasses,
  getUpcomingClasses,
  getLiveClasses,
  joinClass
} = require('../controllers/classController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Public routes
router.get('/upcoming', getUpcomingClasses);
router.get('/live', getLiveClasses);

// Protected routes
router.use(protect);

// Student routes
router.get('/', getAllClasses);
router.post('/:id/join', authorize('student'), joinClass);

// Admin routes
router.post('/', authorize('admin'), createClass);
router.delete('/:id', authorize('admin'), deleteClass);

module.exports = router;