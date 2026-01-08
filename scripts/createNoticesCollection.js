const mongoose = require('mongoose');
require('dotenv').config();

const noticeSchema = new mongoose.Schema({
  title: String,
  content: String,
  category: String,
  priority: String,
  target: String,
  targetClass: String,
  publishedBy: mongoose.Schema.Types.ObjectId,
  status: String,
  publishDate: Date,
  expiryDate: Date,
  isImportant: Boolean,
  attachments: Array,
  views: Number,
  readBy: Array
}, { timestamps: true });

const Notice = mongoose.models.Notice || mongoose.model('Notice', noticeSchema);

const migrateNotices = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    // Check if collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const noticeCollection = collections.find(c => c.name === 'notices');
    
    if (!noticeCollection) {
      console.log('📝 Creating notices collection...');
      
      // Create sample notices for testing
      const sampleNotices = [
        {
          title: 'Welcome to the Institute',
          content: 'We welcome all new students to our institute. Please attend the orientation session on Monday.',
          category: 'general',
          priority: 'medium',
          target: 'all',
          status: 'published',
          publishDate: new Date(),
          views: 0,
          readBy: []
        },
        {
          title: 'Monthly Test Schedule',
          content: 'Monthly tests will be conducted from next week. Please check the schedule.',
          category: 'exam',
          priority: 'high',
          target: 'students',
          status: 'published',
          publishDate: new Date(),
          isImportant: true,
          views: 0,
          readBy: []
        }
      ];
      
      await Notice.insertMany(sampleNotices);
      console.log('✅ Sample notices created');
    } else {
      console.log('✅ Notices collection already exists');
    }
    
    await mongoose.disconnect();
    console.log('✅ Migration completed');
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

migrateNotices();