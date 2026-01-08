// backend/controllers/courseController.js
const Course = require('../models/Course');
const User = require('../models/User');

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
const getAllCourses = async (req, res, next) => {
  try {
    const { category, status, featured } = req.query;
    
    let query = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (featured === 'true') {
      query.featured = true;
    }
    
    const courses = await Course.find(query)
      .populate('instructorId', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: courses.length,
      courses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
const getCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructorId', 'name email qualifications')
      .populate('batches.currentStudents');
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    res.status(200).json({
      success: true,
      course
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new course
// @route   POST /api/courses
// @access  Private/Admin
// backend/controllers/courseController.js में createCourse update करें:

const createCourse = async (req, res, next) => {
  try {
    const {
      name,
      description,
      category,
      instructor,
      status = 'active',
      classType = 'course'
    } = req.body;
    
    // Check if course already exists
    const courseExists = await Course.findOne({ name });
    if (courseExists) {
      return res.status(400).json({
        success: false,
        message: 'Course/Class with this name already exists'
      });
    }
    
    const course = await Course.create({
      name,
      description,
      category,
      instructor,
      status,
      classType
    });
    
    res.status(201).json({
      success: true,
      course,
      message: 'Course/Class created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private/Admin
const updateCourse = async (req, res, next) => {
  try {
    let course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    // Update fields
    const updatableFields = [
      'name', 'description', 'category', 'fee', 'duration',
      'instructor', 'subjects', 'features', 'batches',
      'status', 'startDate', 'endDate', 'thumbnail'
    ];
    
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        course[field] = req.body[field];
      }
    });
    
    await course.save();
    
    res.status(200).json({
      success: true,
      course,
      message: 'Course updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private/Admin
const deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    // Check if course has students
    if (course.totalStudents > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete course with enrolled students'
      });
    }
    
    await course.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Enroll student in course
// @route   POST /api/courses/:id/enroll
// @access  Private/Student
const enrollCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    if (course.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Course is not active for enrollment'
      });
    }
    
    // Check if student is already enrolled
    const user = await User.findById(req.user.id);
    if (user.course === course.name) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }
    
    // Update student's course
    user.course = course.name;
    await user.save();
    
    // Update course student count
    course.totalStudents += 1;
    await course.save();
    
    res.status(200).json({
      success: true,
      message: 'Successfully enrolled in course',
      course: {
        id: course._id,
        name: course.name,
        fee: course.fee
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get course statistics
// @route   GET /api/courses/stats
// @access  Private/Admin
const getCourseStats = async (req, res, next) => {
  try {
    const totalCourses = await Course.countDocuments();
    const activeCourses = await Course.countDocuments({ status: 'active' });
    const totalStudents = await User.countDocuments({ role: 'student' });
    
    // Get revenue from payments
    const Payment = require('../models/Payment');
    const payments = await Payment.find({ status: 'completed' });
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Get course-wise enrollment
    const courseEnrollments = await User.aggregate([
      { $match: { role: 'student', course: { $ne: '' } } },
      { $group: { _id: '$course', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    res.status(200).json({
      success: true,
      stats: {
        totalCourses,
        activeCourses,
        totalStudents,
        totalRevenue,
        courseEnrollments
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollCourse,
  getCourseStats
};