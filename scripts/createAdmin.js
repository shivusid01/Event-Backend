// backend/createAdmin.js - ये file बनाएं
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// User model import करें
const User = require('./models/User');

async function createAdminUser() {
  try {
    // MongoDB connect करें
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Admin user के details
    const adminEmail = 'admin@example.com';
    const adminPassword = 'Admin@123';
    const adminName = 'System Administrator';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('⚠️ Admin user already exists');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      
      // Update role to admin if not already
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('✅ Updated user role to admin');
      }
      
      await mongoose.disconnect();
      return;
    }

    // Create new admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const adminUser = new User({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      phone: '9876543210',
      role: 'admin',
      status: 'active',
      enrollmentId: 'ADMIN001'
    });

    await adminUser.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('Role: admin');

    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  }
}

createAdminUser();