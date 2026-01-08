// backend/controllers/userController.js
const User = require('../models/User');
const Payment = require('../models/Payment');

// =================== STUDENT REGISTRATION ===================
// @desc    Register new student (Admin only)
// @route   POST /api/users/register-student
// @access  Private/Admin
const registerStudent = async (req, res) => {
  try {
    console.log('📝 Admin registering student with data:', req.body);

    const {
      name,
      email,
      phone,
      parentPhone,
      class: studentClass,
      address,
      enrollmentDate
    } = req.body;

    // ✅ Validation
    if (!name || !email || !phone) {
      console.log('❌ Validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Name, email and phone are required fields'
      });
    }

    // Check if student already exists
    const studentExists = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { phone: phone }
      ] 
    });

    if (studentExists) {
      console.log('❌ Student already exists:', studentExists.email);
      return res.status(400).json({
        success: false,
        message: 'Student with this email or phone already exists'
      });
    }

    // Generate enrollment ID
    const enrollmentId = `ENR${Date.now().toString().slice(-6)}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;

    // ✅ Create student in database
    const student = new User({
      name,
      email: email.toLowerCase(),
      phone,
      parentPhone,
      class: studentClass,
      address,
      enrollmentId: enrollmentId,
      enrollmentDate: enrollmentDate || new Date(),
      password: 'welcome123', // Default password
      role: 'student',
      status: 'active',
      isVerified: true
    });

    // Save to database
    await student.save();
    
    console.log('✅ Student saved to database:', {
      id: student._id,
      name: student.name,
      email: student.email,
      enrollmentId: student.enrollmentId
    });

    // Send response (don't send password)
    const studentResponse = {
      _id: student._id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      enrollmentId: student.enrollmentId,
      class: student.class,
      status: student.status,
      enrollmentDate: student.enrollmentDate,
      createdAt: student.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      student: studentResponse
    });

  } catch (error) {
    console.error('❌ Register student error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate field value entered',
        field: Object.keys(error.keyPattern)[0]
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =================== GET ALL STUDENTS ===================
// @desc    Get all students
// @route   GET /api/users/students
// @access  Private/Admin
const getAllStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, class: studentClass, search } = req.query;
    
    // Build query
    let query = { role: 'student' };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (studentClass && studentClass !== 'all') {
      query.class = studentClass;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { enrollmentId: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Execute query with pagination
    const students = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    const total = await User.countDocuments(query);
    
    // Get additional stats for each student
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const payments = await Payment.find({ 
          studentId: student._id, 
          status: 'completed' 
        });
        
        const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
        
        return {
          ...student,
          totalPaid,
          paymentCount: payments.length,
          lastPayment: payments.length > 0 ? payments[0].paidDate : null
        };
      })
    );
    
    res.status(200).json({
      success: true,
      count: students.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      students: studentsWithStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =================== GET SINGLE STUDENT ===================
// @desc    Get single student
// @route   GET /api/users/students/:id
// @access  Private/Admin
const getStudent = async (req, res) => {
  try {
    const student = await User.findById(req.params.id)
      .select('-password')
      .lean();
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Get payment history
    const payments = await Payment.find({ studentId: student._id })
      .sort({ createdAt: -1 })
      .populate('courseId', 'name');
    
    res.status(200).json({
      success: true,
      student: {
        ...student,
        payments
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =================== UPDATE STUDENT ===================
// @desc    Update student
// @route   PUT /api/users/students/:id
// @access  Private/Admin
const updateStudent = async (req, res) => {
  try {
    const { name, email, phone, class: studentClass, status, address } = req.body;
    
    // Build update object
    const updateFields = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (phone) updateFields.phone = phone;
    if (studentClass) updateFields.class = studentClass;
    if (status) updateFields.status = status;
    if (address) updateFields.address = address;
    
    const student = await User.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    res.status(200).json({
      success: true,
      student,
      message: 'Student updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =================== DELETE STUDENT ===================
// @desc    Delete student
// @route   DELETE /api/users/students/:id
// @access  Private/Admin
const deleteStudent = async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Check if student has payments
    const payments = await Payment.find({ studentId: student._id });
    if (payments.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete student with payment history'
      });
    }
    
    await student.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =================== GET STUDENT DASHBOARD STATS ===================
// @desc    Get student dashboard stats
// @route   GET /api/users/dashboard/stats
// @access  Private/Student
const getStudentDashboardStats = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get payments
    const payments = await Payment.find({ studentId });
    const totalPaid = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const pendingPayments = payments.filter(p => p.status === 'pending');
    
    res.status(200).json({
      success: true,
      stats: {
        payments: {
          totalPaid,
          pendingAmount: pendingPayments.reduce((sum, p) => sum + p.amount, 0),
          pendingCount: pendingPayments.length,
          totalTransactions: payments.length
        },
        student: {
          name: req.user.name,
          email: req.user.email,
          enrollmentId: req.user.enrollmentId,
          class: req.user.class
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =================== GET ALL USERS ===================
// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    let query = {};
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =================== GET INSTRUCTORS ===================
// @desc    Get all instructors
// @route   GET /api/users/instructors
// @access  Private/Admin
const getInstructors = async (req, res) => {
  try {
    const instructors = await User.find({ 
      role: 'teacher' 
    }).select('name email phone');
    
    res.status(200).json({
      success: true,
      count: instructors.length,
      instructors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// backend/controllers/userController.js में नीचे की तरफ export से पहले add करें:

// =================== SEND CREDENTIALS ===================
// @desc    Send student credentials
// @route   POST /api/users/send-credentials/:id
// @access  Private/Admin
const sendCredentials = async (req, res) => {
  try {
    const student = await User.findById(req.params.id)
      .select('name email enrollmentId');
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Generate temporary password if not exists
    const tempPassword = 'welcome123';
    
    // In production, you would send email here
    // For now, return credentials in response
    
    const credentials = {
      name: student.name,
      email: student.email,
      enrollmentId: student.enrollmentId,
      password: tempPassword,
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`
    };

    res.status(200).json({
      success: true,
      message: 'Credentials ready to send',
      credentials,
      note: 'In production, these would be emailed to the student'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =================== SEND MESSAGE ===================
// @desc    Send message to student
// @route   POST /api/users/send-message/:id
// @access  Private/Admin
const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const student = await User.findById(req.params.id)
      .select('name email phone');
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Here you would typically:
    // 1. Send SMS (using Twilio, etc.)
    // 2. Send Email
    // 3. Save message to database
    
    res.status(200).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        student: student.name,
        email: student.email,
        phone: student.phone,
        message,
        timestamp: new Date()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =================== MARK COURSE COMPLETED ===================
// @desc    Mark student course as completed
// @route   PUT /api/users/mark-completed/:id
// @access  Private/Admin
const markCourseCompleted = async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    student.status = 'completed';
    student.courseCompletedDate = new Date();
    
    await student.save();

    res.status(200).json({
      success: true,
      message: 'Course marked as completed',
      student: {
        id: student._id,
        name: student.name,
        status: student.status,
        courseCompletedDate: student.courseCompletedDate
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =================== GET STUDENT PAYMENTS ===================
// @desc    Get student's payment history
// @route   GET /api/users/:id/payments
// @access  Private/Admin
const getStudentPayments = async (req, res) => {
  try {
    const studentId = req.params.id;
    
    const payments = await Payment.find({ studentId })
      .populate('courseId', 'name')
      .sort({ createdAt: -1 });

    const totalPaid = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    res.status(200).json({
      success: true,
      count: payments.length,
      totalPaid,
      payments
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =================== EXPORT STUDENTS CSV ===================
// @desc    Export students data as CSV
// @route   GET /api/users/export/students
// @access  Private/Admin
const exportStudentsCSV = async (req, res) => {
  try {
    const { startDate, endDate, status, class: studentClass } = req.query;
    
    let query = { role: 'student' };
    
    // Apply filters
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (studentClass && studentClass !== 'all') {
      query.class = studentClass;
    }
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const students = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();
    
    // CSV headers
    const headers = [
      'Name', 'Email', 'Phone', 'Parent Phone', 'Class',
      'Enrollment ID', 'Status', 'Address', 'Enrollment Date',
      'Registration Date'
    ];
    
    // CSV rows
    const rows = students.map(student => [
      `"${student.name}"`,
      student.email,
      student.phone,
      student.parentPhone || '',
      student.class || '',
      student.enrollmentId || '',
      student.status || '',
      `"${student.address || ''}"`,
      student.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString() : '',
      new Date(student.createdAt).toLocaleDateString()
    ]);
    
    // Create CSV content
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    // Set headers for file download
    const filename = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(csvContent);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Export failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};






// =================== EXPORTS ===================
module.exports = {
  registerStudent,
  getAllStudents,
  getStudent,
  updateStudent,
  deleteStudent,
  getStudentDashboardStats,
  getAllUsers,
  getInstructors,
  sendCredentials,
  sendMessage,
  markCourseCompleted,
  getStudentPayments,
  exportStudentsCSV
};