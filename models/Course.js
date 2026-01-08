// backend/models/Course.js
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Course name is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
      enum: [
      'Engineering', 
      'Medical', 
      'Civil Services', 
      'School', 
      'Science',         // Add Science
      'Commerce',        // Add Commerce
      'All Classes',     // Add All Classes
      'General'
    ]
  },
  // fee: {
  //   type: Number,
  //   required: [true, 'Fee is required'],
  //   min: 0
  // },
  // duration: {
  //   type: String,
  //   required: [true, 'Duration is required']
  // },
  instructor: {
    type: String,
    required: [true, 'Instructor is required']
  },
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  subjects: [{
    type: String,
    required: true
  }],
  features: [{
    type: String
  }],
  batches: [{
    name: String,
    timing: String,
    days: [String],
    maxStudents: Number,
    currentStudents: { type: Number, default: 0 }
  }],
  totalStudents: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'upcoming'],
    default: 'active'
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  thumbnail: {
    type: String,
    default: ''
  },
  studyMaterial: [{
    title: String,
    fileUrl: String,
    uploadedAt: Date
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Course', courseSchema);