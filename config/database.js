// backend/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📁 Database: ${conn.connection.name}`);
    
    // Create indexes
    await createIndexes();
    
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    // User indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ enrollmentId: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ status: 1 });
    await db.collection('users').createIndex({ course: 1 });
    
    // Course indexes
    await db.collection('courses').createIndex({ name: 1 });
    await db.collection('courses').createIndex({ category: 1, status: 1 });
    await db.collection('courses').createIndex({ status: 1 });
    await db.collection('courses').createIndex({ instructorId: 1 });
    
    // Payment indexes
    await db.collection('payments').createIndex({ paymentId: 1 }, { unique: true });
    await db.collection('payments').createIndex({ studentId: 1, status: 1 });
    await db.collection('payments').createIndex({ orderId: 1 });
    await db.collection('payments').createIndex({ createdAt: -1 });
    await db.collection('payments').createIndex({ month: 1 });
    
    // Class indexes
    await db.collection('classes').createIndex({ startTime: 1, status: 1 });
    await db.collection('classes').createIndex({ courseId: 1, startTime: 1 });
    await db.collection('classes').createIndex({ instructorId: 1 });
    await db.collection('classes').createIndex({ status: 1 });
    
    // Notice indexes
    await db.collection('notices').createIndex({ status: 1, publishDate: -1 });
    await db.collection('notices').createIndex({ category: 1, priority: 1 });
    await db.collection('notices').createIndex({ target: 1 });
    await db.collection('notices').createIndex({ publishedBy: 1 });
    
    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
  }
};

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ MongoDB connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB connection disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔌 MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = connectDB;