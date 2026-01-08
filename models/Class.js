const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Class title is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: [true, 'Category is required']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required']
  },
  topic: {
    type: String,
    required: [true, 'Topic is required']
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required']
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Duration is required'],
    min: 15
  },
  endTime: {
    type: Date
  },
  meetingLink: {
    type: String,
    required: [true, 'Meeting link is required']
  },
  meetingPlatform: {
    type: String,
    enum: ['google_meet', 'zoom', 'microsoft_teams'],
    default: 'google_meet'
  },
  instructorName: {
    type: String,
    required: [true, 'Instructor name is required']
  },
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  visibility: {
    type: String,
    enum: ['all_students', 'specific_course'],
    default: 'all_students'
  },
  targetAudience: [{
    type: String
  }],
  attendees: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: Date,
    durationAttended: Number
  }],
  recordingLink: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Auto-calculate endTime
classSchema.pre('save', function(next) {
  if (this.startTime && this.duration) {
    this.endTime = new Date(this.startTime.getTime() + this.duration * 60000);
  }
  next();
});

// Indexes for faster queries
classSchema.index({ startTime: 1, status: 1 });
classSchema.index({ instructorId: 1 });
classSchema.index({ status: 1, startTime: 1 });

module.exports = mongoose.model('Class', classSchema);