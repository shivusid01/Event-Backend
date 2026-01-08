// fixAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function fixAdmin() {
  // MongoDB connect करें
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coaching_institute');
  console.log('✅ MongoDB connected');
  
  // User model लोड करें
  const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: String,
    phone: String,
    enrollmentId: String
  });
  
  const User = mongoose.model('User', UserSchema);
  
  // पुराना admin delete करें
  await User.deleteOne({ email: 'admin@example.com' });
  console.log('🗑️ Old admin deleted');
  
  // नया password hash करें
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Admin@123', salt);
  console.log('🔐 Password hashed');
  
  // नया admin user create करें
  await User.create({
    name: 'System Admin',
    email: 'admin@example.com',
    password: hashedPassword,
    phone: '9876543210',
    role: 'admin',
    enrollmentId: 'ADMIN001'
  });
  
  console.log('\n✅✅✅ ADMIN USER CREATED ✅✅✅');
  console.log('===============================');
  console.log('📧 Email: admin@example.com');
  console.log('🔑 Password: Admin@123');
  console.log('👑 Role: admin');
  console.log('===============================');
  
  // Close connection
  await mongoose.disconnect();
  console.log('\n✅ Done! Now try logging in.');
}

// Run the function
fixAdmin().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});