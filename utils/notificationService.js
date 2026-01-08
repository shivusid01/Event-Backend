// backend/utils/notificationService.js
const Notification = require('../models/Notification');

// Create notification
const createNotification = async ({ userId, title, message, type = 'info', data = {} }) => {
  try {
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      data,
      read: false
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    // Don't throw error, just log it
    return null;
  }
};

module.exports = {
  createNotification
};