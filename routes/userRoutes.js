// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const {
  registerStudent,
  getAllStudents,
  getInstructors, 
  getStudent,
  updateStudent,
  deleteStudent,
  getStudentDashboardStats,
  getAllUsers,
  sendCredentials,
  sendMessage,
  markCourseCompleted,
  getStudentPayments,
  exportStudentsCSV
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All routes are protected
router.use(protect);

// Student routes
router.post('/register-student', protect, authorize('admin'), registerStudent);
router.get('/students', authorize('admin'), getAllStudents);
router.get('/students/:id', authorize('admin'), getStudent);
router.put('/students/:id', authorize('admin'), updateStudent);
router.delete('/students/:id', authorize('admin'), deleteStudent);

router.post('/send-credentials/:id', authorize('admin'), sendCredentials);
router.post('/send-message/:id', authorize('admin'), sendMessage);
router.put('/mark-completed/:id', authorize('admin'), markCourseCompleted);
router.get('/:id/payments', authorize('admin'), getStudentPayments);
router.get('/export/students', authorize('admin'), exportStudentsCSV);

// Get all instructors
router.get('/instructors', authorize('admin'), getInstructors)
// Student dashboard
router.get('/dashboard/stats', authorize('student'), getStudentDashboardStats);

// Admin only routes
router.get('/', authorize('admin'), getAllUsers);

module.exports = router;