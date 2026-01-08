const Class = require('../models/Class');

// @desc    Create new class
// @route   POST /api/classes
// @access  Private/Admin
const createClass = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      subject,
      topic,
      startTime,
      duration,
      meetingLink,
      meetingPlatform = 'google_meet',
      instructorName,
      instructorId,
      targetAudience = ['all'],
      visibility = 'all_students'
    } = req.body;

    // Validate required fields
    if (!title || !subject || !startTime || !duration || !meetingLink || !instructorName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const newClass = await Class.create({
      title,
      description,
      category,
      subject,
      topic,
      startTime: new Date(startTime),
      duration: parseInt(duration),
      meetingLink,
      meetingPlatform,
      instructorName,
      instructorId: instructorId || req.user.id,
      targetAudience,
      visibility,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Class scheduled successfully',
      class: newClass
    });

  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all classes for students
// @route   GET /api/classes
// @access  Private
const getAllClasses = async (req, res) => {
  try {
    const { status, limit = 20 } = req.query;
    
    let query = {};
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Only show classes visible to all students or relevant to user
    query.$or = [
      { visibility: 'all_students' },
      { targetAudience: 'all' }
    ];
    
    // If user is student, also show classes for their class/grade
    if (req.user.role === 'student' && req.user.class) {
      query.$or.push({ targetAudience: req.user.class });
    }
    
    const classes = await Class.find(query)
      .sort({ startTime: 1 })
      .limit(parseInt(limit))
      .select('-attendees -__v');
    
    res.status(200).json({
      success: true,
      count: classes.length,
      classes
    });

  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get upcoming classes
// @route   GET /api/classes/upcoming
// @access  Public
const getUpcomingClasses = async (req, res) => {
  try {
    const now = new Date();
    
    const upcomingClasses = await Class.find({
      status: 'scheduled',
      startTime: { $gt: now }
    })
    .sort({ startTime: 1 })
    .limit(10)
    .select('title subject topic startTime duration instructorName meetingLink');
    
    // Format the response
    const formattedClasses = upcomingClasses.map(cls => ({
      _id: cls._id,
      title: cls.title,
      subject: cls.subject,
      topic: cls.topic,
      startTime: cls.startTime,
      duration: cls.duration,
      instructorName: cls.instructorName,
      meetingLink: cls.meetingLink,
      formattedTime: formatTime(cls.startTime),
      formattedDate: formatDate(cls.startTime)
    }));
    
    res.status(200).json({
      success: true,
      count: formattedClasses.length,
      classes: formattedClasses
    });

  } catch (error) {
    console.error('Error fetching upcoming classes:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get live classes
// @route   GET /api/classes/live
// @access  Public
const getLiveClasses = async (req, res) => {
  try {
    const now = new Date();
    
    const liveClasses = await Class.find({
      status: 'live',
      startTime: { $lte: now },
      endTime: { $gte: now }
    })
    .sort({ startTime: 1 })
    .select('title subject topic startTime duration instructorName meetingLink attendees');
    
    const formattedClasses = liveClasses.map(cls => ({
      _id: cls._id,
      title: cls.title,
      subject: cls.subject,
      topic: cls.topic,
      startTime: cls.startTime,
      duration: cls.duration,
      instructorName: cls.instructorName,
      meetingLink: cls.meetingLink,
      studentCount: cls.attendees.length,
      elapsedTime: Math.floor((now - cls.startTime) / 60000) // minutes
    }));
    
    res.status(200).json({
      success: true,
      count: formattedClasses.length,
      classes: formattedClasses
    });

  } catch (error) {
    console.error('Error fetching live classes:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Join a class
// @route   POST /api/classes/:id/join
// @access  Private/Student
const joinClass = async (req, res) => {
  try {
    const classId = req.params.id;
    
    const classItem = await Class.findById(classId);
    
    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    // Check if class is live or upcoming
    const now = new Date();
    if (classItem.startTime > now) {
      return res.status(400).json({
        success: false,
        message: 'Class has not started yet'
      });
    }
    
    if (classItem.endTime < now) {
      return res.status(400).json({
        success: false,
        message: 'Class has ended'
      });
    }
    
    // Check if already joined
    const alreadyJoined = classItem.attendees.some(
      attendee => attendee.studentId.toString() === req.user.id
    );
    
    if (!alreadyJoined) {
      classItem.attendees.push({
        studentId: req.user.id,
        joinedAt: now
      });
      
      await classItem.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Joined class successfully',
      meetingLink: classItem.meetingLink
    });

  } catch (error) {
    console.error('Error joining class:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Helper functions
const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};
// @desc    Delete a class
// @route   DELETE /api/classes/:id
// @access  Private/Admin
const deleteClass = async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    
    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    // Check if user is admin or created this class
    if (req.user.role !== 'admin' && classItem.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this class'
      });
    }
    
    await classItem.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Class deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  createClass,
  getAllClasses,
  getUpcomingClasses,
  getLiveClasses,
  joinClass,
  deleteClass
};