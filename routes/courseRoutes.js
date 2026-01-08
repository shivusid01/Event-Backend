// backend/routes/courseRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollCourse,
  getCourseStats
} = require('../controllers/courseController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Public routes
router.get('/', getAllCourses);
router.get('/:id', getCourse);

// Protected routes
router.use(protect);

// Student routes
router.post('/:id/enroll', authorize('student'), enrollCourse);

// Admin routes
router.post('/', authorize('admin'), createCourse);
router.put('/:id', authorize('admin'), updateCourse);
router.delete('/:id', authorize('admin'), deleteCourse);
router.get('/stats/dashboard', authorize('admin'), getCourseStats);

module.exports = router;