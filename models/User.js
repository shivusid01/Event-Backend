// backend/models/User.js - FULLY UPDATED (MERGED, NOTHING REMOVED)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  // ===== BASIC INFO =====
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    unique: true
  },
  parentPhone: {
    type: String,
    default: ''
  },

  // ===== AUTH =====
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },

  role: {
    type: String,
    enum: ['student', 'admin', 'teacher'],
    default: 'student'
  },

  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  lastLogin: {
    type: Date
  },

  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // ===== PROFILE =====
  profileImage: {
    type: String,
    default: ''
  },

  class: {
    type: String,
    default: ''
  },

  grade: {
    type: String,
    default: ''
  },

  address: {
    type: String,
    default: ''
  },

  fatherName: {
    type: String,
    default: ''
  },

  motherName: {
    type: String,
    default: ''
  },

  emergencyContact: {
    type: String,
    default: ''
  },

  bloodGroup: {
    type: String,
    default: ''
  },

  // ===== COURSE (BEST SOLUTION – BOTH STRING + REF) =====
  course: {
    type: String,
    default: ''
  },

  courseRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
  },

  // ===== ENROLLMENT =====
  enrollmentId: {
    type: String,
    unique: true,
    sparse: true
  },

  enrollmentDate: {
    type: Date,
    default: Date.now
  },

  // ===== SETTINGS =====
  settings: {
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: true }
  },

  // ===== PAYMENTS =====
  payments: [{
    amount: Number,
    date: Date,
    status: String,
    transactionId: String,
    description: String
  }],

  // ===== ATTENDANCE =====
  attendance: [{
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    },
    date: Date,
    status: String,
    duration: Number
  }],

  // ===== PASSWORD RESET =====
  resetPasswordToken: String,
  resetPasswordExpire: Date

}, {
  timestamps: true
});


// ================= PASSWORD HASH =================
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});


// ================= ENROLLMENT ID =================
userSchema.pre('save', async function(next) {
  if (this.isNew && this.role === 'student' && !this.enrollmentId) {
    try {
      const year = new Date().getFullYear();
      const count = await this.constructor.countDocuments({
        role: 'student',
        enrollmentDate: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      });
      this.enrollmentId = `STU${year}${String(count + 1).padStart(4, '0')}`;
    } catch {
      const random = Math.floor(1000 + Math.random() * 9000);
      this.enrollmentId = `STU${new Date().getFullYear()}${random}`;
    }
  }
  next();
});


// ================= COURSE SYNC =================
userSchema.pre('save', async function(next) {
  if (this.isModified('courseRef') && this.courseRef) {
    try {
      const Course = mongoose.model('Course');
      const courseData = await Course.findById(this.courseRef).select('name');
      if (courseData) this.course = courseData.name;
    } catch (err) {
      console.error('Course sync error:', err);
    }
  }
  next();
});

userSchema.pre('save', async function(next) {
  if (this.isModified('course') && this.course && !this.courseRef) {
    try {
      const Course = mongoose.model('Course');
      const courseData = await Course.findOne({
        name: { $regex: new RegExp(this.course, 'i') }
      });
      if (courseData) this.courseRef = courseData._id;
    } catch (err) {
      console.error('Course find error:', err);
    }
  }
  next();
});


// ================= JWT =================
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};


// ================= PASSWORD MATCH =================
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};


// ================= HELPERS =================
userSchema.methods.isEnrolledInCourse = function(courseId) {
  if (!this.courseRef) return false;
  return this.courseRef.toString() === courseId.toString();
};

userSchema.methods.addAttendance = function(classId, duration) {
  this.attendance.push({
    classId,
    date: new Date(),
    status: 'present',
    duration
  });
};

userSchema.methods.addPayment = function(amount, status, transactionId, description) {
  this.payments.push({
    amount,
    date: new Date(),
    status,
    transactionId,
    description: description || 'Course Fee'
  });
};

userSchema.methods.getStudentClasses = async function() {
  const Class = mongoose.model('Class');
  return await Class.find({ courseId: this.courseRef })
    .populate('courseId', 'name')
    .populate('instructorId', 'name')
    .sort({ startTime: -1 });
};

userSchema.methods.getActiveCourse = function() {
  return {
    id: this.courseRef,
    name: this.course,
    hasReference: !!this.courseRef
  };
};

userSchema.methods.updateCourseRefFromName = async function() {
  if (this.course && !this.courseRef) {
    const Course = mongoose.model('Course');
    const courseData = await Course.findOne({
      name: { $regex: new RegExp(this.course, 'i') }
    });
    if (courseData) {
      this.courseRef = courseData._id;
      await this.save();
      return true;
    }
  }
  return false;
};


// ===== VIRTUAL (BACKWARD COMPATIBILITY) =====
userSchema.virtual('courseId').get(function() {
  return this.courseRef;
});

userSchema.virtual('courseId').set(function(value) {
  this.courseRef = value;
});

module.exports = mongoose.model('User', userSchema);
