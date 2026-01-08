// backend/controllers/contactController.js
const { sendContactFormEmail } = require('../utils/emailService');

/**
 * Handle contact form submission
 * @route POST /api/contact/submit
 * @access Public
 */
const submitContactForm = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required'
      });
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Prepare form data
    const formData = {
      name: name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : '',
      subject: subject ? subject.trim() : 'General Inquiry',
      message: message.trim(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };

    console.log('📧 Contact form submission:', {
      name: formData.name,
      email: formData.email,
      subject: formData.subject
    });

    // Send email to admin
    const emailSent = await sendContactFormEmail(formData);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send email. Please try again later.'
      });
    }

    // Success response
    res.status(200).json({
      success: true,
      message: 'Thank you for contacting us! We will get back to you soon.',
      data: {
        name: formData.name,
        email: formData.email,
        subject: formData.subject
      }
    });

  } catch (error) {
    console.error('🔥 Contact form error:', error);
    next(error);
  }
};

module.exports = {
  submitContactForm
};