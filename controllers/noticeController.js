const Notice = require('../models/Notice');
const User = require('../models/User');

// @desc    Create new notice
// @route   POST /api/notices
// @access  Private/Admin
const createNotice = async (req, res) => {
  try {
    const {
      title,
      content,
      category,
      priority,
      target,
      targetClass,
      publishDate,
      expiryDate,
      isImportant,
      attachments
    } = req.body;

    // Create notice
    const notice = await Notice.create({
      title,
      content,
      category: category || 'general',
      priority: priority || 'medium',
      target: target || 'all',
      targetClass: target === 'specific_class' ? targetClass : undefined,
      publishedBy: req.user._id,
      status: 'published',
      publishDate: publishDate || new Date(),
      expiryDate,
      isImportant: isImportant || false,
      attachments: attachments || []
    });

    res.status(201).json({
      success: true,
      message: 'Notice created successfully',
      notice
    });
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all notices (Admin view)
// @route   GET /api/notices
// @access  Private/Admin
const getAllNotices = async (req, res) => {
  try {
    const { 
      status, 
      category, 
      priority, 
      page = 1, 
      limit = 10,
      search 
    } = req.query;
    
    let query = {};
    
    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Filter by priority
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    
    // Search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const notices = await Notice.find(query)
      .populate('publishedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Notice.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: notices.length,
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      notices
    });
  } catch (error) {
    console.error('Get notices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get notices for students
// @route   GET /api/notices/student
// @access  Private/Student
const getStudentNotices = async (req, res) => {
  try {
    const { 
      category, 
      priority, 
      important,
      page = 1, 
      limit = 10 
    } = req.query;
    
    let query = {
      status: 'published',
      publishDate: { $lte: new Date() }
    };
    
    // Only show notices that haven't expired
    query.$or = [
      { expiryDate: { $exists: false } },
      { expiryDate: { $gt: new Date() } }
    ];
    
    // Filter by student's class or all notices
    query.$or = [
      { target: 'all' },
      { target: 'students' },
      { 
        target: 'specific_class',
        targetClass: req.user.class 
      }
    ];
    
    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Filter by priority
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    
    // Filter by important
    if (important === 'true') {
      query.isImportant = true;
    }
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const notices = await Notice.find(query)
      .populate('publishedBy', 'name')
      .sort({ 
        isImportant: -1,
        priority: -1,
        publishDate: -1 
      })
      .skip(skip)
      .limit(limitNum);
    
    // Check if student has read each notice
    const noticesWithReadStatus = notices.map(notice => {
      const isRead = notice.readBy?.some(
        read => read.userId.toString() === req.user._id.toString()
      );
      
      return {
        ...notice.toObject(),
        isRead,
        readCount: notice.readBy?.length || 0
      };
    });
    
    const total = await Notice.countDocuments(query);
    
    // Get unread count
    const unreadCount = await Notice.countDocuments({
      ...query,
      readBy: { 
        $not: { 
          $elemMatch: { 
            userId: req.user._id 
          } 
        } 
      }
    });
    
    res.status(200).json({
      success: true,
      count: notices.length,
      total,
      unreadCount,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      notices: noticesWithReadStatus
    });
  } catch (error) {
    console.error('Get student notices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single notice
// @route   GET /api/notices/:id
// @access  Private
const getNoticeById = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id)
      .populate('publishedBy', 'name email');
    
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }
    
    // Check if user can view this notice
    if (req.user.role === 'student') {
      if (notice.status !== 'published') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this notice'
        });
      }
      
      // Check if notice is targeted to student's class
      if (notice.target === 'specific_class' && notice.targetClass !== req.user.class) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this notice'
        });
      }
    }
    
    // Mark as read for student
    if (req.user.role === 'student') {
      const isRead = notice.readBy?.some(
        read => read.userId.toString() === req.user._id.toString()
      );
      
      if (!isRead) {
        notice.readBy.push({
          userId: req.user._id,
          readAt: new Date()
        });
        notice.views += 1;
        await notice.save();
      }
    }
    
    res.status(200).json({
      success: true,
      notice
    });
  } catch (error) {
    console.error('Get notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update notice
// @route   PUT /api/notices/:id
// @access  Private/Admin
const updateNotice = async (req, res) => {
  try {
    let notice = await Notice.findById(req.params.id);
    
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }
    
    // Update fields
    const updatableFields = [
      'title', 'content', 'category', 'priority', 'target',
      'targetClass', 'publishDate', 'expiryDate', 'isImportant',
      'attachments', 'status'
    ];
    
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        notice[field] = req.body[field];
      }
    });
    
    await notice.save();
    
    res.status(200).json({
      success: true,
      message: 'Notice updated successfully',
      notice
    });
  } catch (error) {
    console.error('Update notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete notice
// @route   DELETE /api/notices/:id
// @access  Private/Admin
const deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }
    
    await notice.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Notice deleted successfully'
    });
  } catch (error) {
    console.error('Delete notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Mark notice as read
// @route   POST /api/notices/:id/read
// @access  Private/Student
const markAsRead = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }
    
    const isRead = notice.readBy?.some(
      read => read.userId.toString() === req.user._id.toString()
    );
    
    if (!isRead) {
      notice.readBy.push({
        userId: req.user._id,
        readAt: new Date()
      });
      notice.views += 1;
      await notice.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Notice marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get notice statistics
// @route   GET /api/notices/stats/overview
// @access  Private/Admin
const getNoticeStats = async (req, res) => {
  try {
    const total = await Notice.countDocuments();
    const published = await Notice.countDocuments({ status: 'published' });
    const draft = await Notice.countDocuments({ status: 'draft' });
    const archived = await Notice.countDocuments({ status: 'archived' });
    
    // Recent notices
    const recentNotices = await Notice.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('publishedBy', 'name')
      .select('title category priority publishDate views');
    
    // Category distribution
    const categoryStats = await Notice.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgViews: { $avg: '$views' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Views per day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const viewsStats = await Notice.aggregate([
      {
        $match: {
          publishDate: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$publishDate' }
          },
          totalViews: { $sum: '$views' },
          noticeCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.status(200).json({
      success: true,
      stats: {
        total,
        published,
        draft,
        archived
      },
      categories: categoryStats,
      views: viewsStats,
      recent: recentNotices
    });
  } catch (error) {
    console.error('Get notice stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get unread notices count for student
// @route   GET /api/notices/student/unread-count
// @access  Private/Student
const getUnreadCount = async (req, res) => {
  try {
    const query = {
      status: 'published',
      publishDate: { $lte: new Date() },
      $or: [
        { target: 'all' },
        { target: 'students' },
        { 
          target: 'specific_class',
          targetClass: req.user.class 
        }
      ],
      readBy: { 
        $not: { 
          $elemMatch: { 
            userId: req.user._id 
          } 
        } 
      }
    };
    
    const unreadCount = await Notice.countDocuments(query);
    const importantUnread = await Notice.countDocuments({
      ...query,
      isImportant: true
    });
    
    res.status(200).json({
      success: true,
      unreadCount,
      importantUnread
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  createNotice,
  getAllNotices,
  getStudentNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
  markAsRead,
  getNoticeStats,
  getUnreadCount
};