// backend/utils/emailService.js - COMPLETE UPDATED VERSION
const nodemailer = require('nodemailer');

/**
 * Comprehensive Email Service for Coaching Institute
 * Handles all email notifications including payment confirmations
 */

// Create transporter with enhanced configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || process.env.SMTP_PORT || 587,
    secure: process.env.EMAIL_PORT == 465 || process.env.SMTP_PORT == 465,
    auth: {
      user: process.env.EMAIL_USER || process.env.SMTP_USER,
      pass: process.env.EMAIL_PASS || process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    },
    pool: true, // Use connection pooling
    maxConnections: 5,
    maxMessages: 100
  });
};

/**
 * Send welcome email to new student
 */
const sendWelcomeEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"EduCoach Pro" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to: options.email,
      subject: 'Welcome to EduCoach Pro - Your Learning Journey Begins! 🎓',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
            .content { padding: 30px; background: #f9f9f9; }
            .footer { padding: 20px; text-align: center; background: #f1f1f1; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .credentials { background: #fff; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to EduCoach Pro!</h1>
              <p>Your academic excellence journey starts here</p>
            </div>
            
            <div class="content">
              <h2>Hello ${options.name},</h2>
              <p>Congratulations on joining EduCoach Pro! We're excited to have you as part of our learning community.</p>
              
              <div class="credentials">
                <h3>Your Account Details:</h3>
                <p><strong>Enrollment ID:</strong> ${options.enrollmentId}</p>
                <p><strong>Course:</strong> ${options.course}</p>
                <p><strong>Email:</strong> ${options.email}</p>
                ${options.password ? `<p><strong>Temporary Password:</strong> ${options.password}</p>` : ''}
              </div>
              
              <p>Here's what you can do next:</p>
              <ul>
                <li>Complete your profile in the student dashboard</li>
                <li>Explore course materials and schedule</li>
                <li>Join upcoming classes</li>
                <li>Connect with instructors and peers</li>
              </ul>
              
              <a href="${process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">Login to Your Dashboard</a>
              
              <p>If you have any questions, feel free to contact our support team.</p>
              
              <p>Best regards,<br>
              EduCoach Pro Team</p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} EduCoach Pro. All rights reserved.</p>
              <p>123 Education Street, Knowledge City</p>
              <p>Phone: +91 98765 43210 | Email: support@educoachpro.com</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${options.email}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending welcome email: ${error.message}`);
    return false;
  }
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const resetLink = `${process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${options.resetToken}`;
    
    const mailOptions = {
      from: `"EduCoach Pro Support" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to: options.email,
      subject: 'Password Reset Request - EduCoach Pro',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8d7da; padding: 20px; text-align: center; color: #721c24; border-radius: 10px 10px 0 0; }
            .content { padding: 30px; background: #f9f9f9; }
            .footer { padding: 20px; text-align: center; background: #f1f1f1; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { color: #856404; background-color: #fff3cd; padding: 10px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🔐 Password Reset Request</h2>
            </div>
            
            <div class="content">
              <p>Hello ${options.name},</p>
              
              <p>We received a request to reset your password for your EduCoach Pro account.</p>
              
              <p>Click the button below to reset your password:</p>
              
              <a href="${resetLink}" class="button">Reset Your Password</a>
              
              <div class="warning">
                <p><strong>⚠️ Important:</strong></p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this password reset, please ignore this email.</p>
              </div>
              
              <p>If the button doesn't work, copy and paste this link in your browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 12px;">${resetLink}</p>
              
              <p>Best regards,<br>
              EduCoach Pro Support Team</p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} EduCoach Pro</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${options.email}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending password reset email: ${error.message}`);
    return false;
  }
};

/**
 * Send payment confirmation email to student
 * Enhanced with better design and mobile responsiveness
 */
const sendPaymentConfirmationEmail = async ({ email, name, payment, invoiceUrl, course, status = 'completed' }) => {
  try {
    const transporter = createTransporter();
    
    const subject = status === 'completed' 
      ? `Payment Confirmation - ${payment.paymentId}`
      : `Payment Failed - ${payment.paymentId}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: #1e293b;
            background: #f8fafc;
            padding: 20px;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
          }
          
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
          }
          
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
          }
          
          .header p {
            opacity: 0.9;
            font-size: 16px;
            font-weight: 400;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .greeting {
            font-size: 18px;
            color: #475569;
            margin-bottom: 24px;
          }
          
          .message {
            color: #64748b;
            font-size: 16px;
            margin-bottom: 32px;
            line-height: 1.7;
          }
          
          .payment-card {
            background: #f8fafc;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            border: 1px solid #e2e8f0;
          }
          
          .payment-card h3 {
            color: #475569;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
          }
          
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          
          .detail-row:last-child {
            border-bottom: none;
          }
          
          .detail-label {
            color: #64748b;
            font-size: 14px;
            font-weight: 500;
          }
          
          .detail-value {
            color: #1e293b;
            font-size: 15px;
            font-weight: 600;
          }
          
          .amount-highlight {
            color: #10b981;
            font-size: 20px;
            font-weight: 700;
          }
          
          .status-badge {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .status-completed {
            background: #d1fae5;
            color: #065f46;
          }
          
          .status-failed {
            background: #fee2e2;
            color: #991b1b;
          }
          
          .action-buttons {
            margin: 32px 0;
            text-align: center;
          }
          
          .btn {
            display: inline-block;
            padding: 14px 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
          }
          
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
          }
          
          .secondary-btn {
            background: #f1f5f9;
            color: #475569;
            margin-left: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          
          .secondary-btn:hover {
            background: #e2e8f0;
            transform: translateY(-2px);
          }
          
          .note {
            background: #f0f9ff;
            border-left: 4px solid #0ea5e9;
            padding: 16px;
            border-radius: 8px;
            margin: 24px 0;
          }
          
          .note p {
            color: #0369a1;
            font-size: 14px;
          }
          
          .support-section {
            text-align: center;
            margin-top: 40px;
            padding-top: 32px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 14px;
          }
          
          .support-section a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
          }
          
          .footer {
            background: #f1f5f9;
            padding: 24px 30px;
            text-align: center;
            color: #64748b;
            font-size: 13px;
            line-height: 1.5;
          }
          
          .footer-logo {
            font-size: 20px;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 8px;
          }
          
          @media (max-width: 600px) {
            body {
              padding: 10px;
            }
            
            .header {
              padding: 30px 20px;
            }
            
            .content {
              padding: 30px 20px;
            }
            
            .btn {
              display: block;
              width: 100%;
              margin-bottom: 12px;
              padding: 16px;
            }
            
            .secondary-btn {
              margin-left: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <!-- Header -->
          <div class="header">
            <h1>EduCoach Pro</h1>
            <p>${status === 'completed' ? '🎉 Payment Successful!' : '⚠️ Payment Failed'}</p>
          </div>
          
          <!-- Content -->
          <div class="content">
            <h2 class="greeting">Dear ${name},</h2>
            
            <p class="message">
              ${status === 'completed' 
                ? 'Thank you for your payment! Your transaction has been processed successfully.'
                : 'Unfortunately, your payment could not be processed. Please try again.'}
            </p>
            
            <!-- Payment Details Card -->
            <div class="payment-card">
              <h3>Payment Details</h3>
              
              <div class="detail-row">
                <span class="detail-label">Payment ID</span>
                <span class="detail-value">${payment.paymentId || 'N/A'}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Amount</span>
                <span class="detail-value amount-highlight">₹${payment.amount.toLocaleString('en-IN')}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Description</span>
                <span class="detail-value">${payment.description}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Date</span>
                <span class="detail-value">${new Date(payment.paidDate || payment.createdAt || Date.now()).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
              
              ${course ? `
              <div class="detail-row">
                <span class="detail-label">Course</span>
                <span class="detail-value">${course}</span>
              </div>
              ` : ''}
              
              <div class="detail-row">
                <span class="detail-label">Status</span>
                <span class="status-badge status-${status}">${status.toUpperCase()}</span>
              </div>
              
              ${payment.razorpayPaymentId ? `
              <div class="detail-row">
                <span class="detail-label">Transaction ID</span>
                <span class="detail-value">${payment.razorpayPaymentId}</span>
              </div>
              ` : ''}
            </div>
            
            <!-- Action Buttons -->
            <div class="action-buttons">
              ${status === 'completed' && invoiceUrl ? `
                <a href="${invoiceUrl}" class="btn">📄 Download Receipt</a>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/payment-history" class="btn secondary-btn">📊 View Payment History</a>
              ` : `
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/payment" class="btn">🔄 Try Payment Again</a>
              `}
            </div>
            
            <!-- Notes -->
            ${status === 'completed' ? `
            <div class="note">
              <p>💡 <strong>Important:</strong> Keep this receipt for your records. It can be used for tax purposes and fee verification.</p>
            </div>
            ` : `
            <div class="note">
              <p>💡 <strong>Tip:</strong> If payment continues to fail, try using a different payment method or contact your bank.</p>
            </div>
            `}
            
            <!-- Support Section -->
            <div class="support-section">
              <p>Need help? Contact our support team:</p>
              <p>📞 <a href="tel:+919876543210">+91 98765 43210</a> | ✉️ <a href="mailto:support@educoachpro.com">support@educoachpro.com</a></p>
              <p style="margin-top: 8px; font-size: 12px;">Our support team is available 9 AM - 6 PM, Monday to Saturday</p>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <div class="footer-logo">EduCoach Pro</div>
            <p>123 Education Street, Knowledge City, Delhi - 110001</p>
            <p>GSTIN: 07AABCE1234F1Z5 • PAN: AABCE1234F</p>
            <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">
              This is an automated email. Please do not reply to this message.<br>
              © ${new Date().getFullYear()} EduCoach Pro. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await transporter.sendMail({
      from: `"EduCoach Pro Payments" <${process.env.EMAIL_USER || process.env.SMTP_USER || process.env.SMTP_FROM}>`,
      to: email,
      subject: subject,
      html: html,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    });
    
    console.log(`✅ Payment ${status} email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending payment email to ${email}:`, error.message);
    throw error;
  }
};

/**
 * Send admin payment notification
 * Enhanced with better design and actionable information
 */
const sendAdminPaymentNotification = async ({ email, adminName, payment, student, course }) => {
  try {
    const transporter = createTransporter();
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: #1e293b;
            background: #f8fafc;
            padding: 20px;
          }
          
          .email-container {
            max-width: 700px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
          }
          
          .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
          }
          
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
          }
          
          .header p {
            opacity: 0.9;
            font-size: 16px;
            font-weight: 400;
          }
          
          .alert-banner {
            background: #fff3cd;
            padding: 16px;
            text-align: center;
            border-bottom: 1px solid #ffeaa7;
          }
          
          .alert-banner strong {
            color: #856404;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .greeting {
            font-size: 18px;
            color: #475569;
            margin-bottom: 24px;
          }
          
          .payment-summary {
            background: #f0f9ff;
            border-radius: 12px;
            padding: 28px;
            margin: 24px 0;
            border: 1px solid #e0f2fe;
          }
          
          .summary-title {
            color: #0369a1;
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 24px;
          }
          
          .summary-item {
            background: white;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }
          
          .summary-label {
            color: #64748b;
            font-size: 13px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
          }
          
          .summary-value {
            color: #1e293b;
            font-size: 16px;
            font-weight: 600;
          }
          
          .amount-badge {
            font-size: 22px;
            font-weight: 700;
            color: #10b981;
          }
          
          .student-info {
            background: #f8fafc;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            border: 1px solid #e2e8f0;
          }
          
          .section-title {
            color: #475569;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
          }
          
          .student-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
          }
          
          .detail-item {
            padding: 12px 0;
          }
          
          .detail-label {
            color: #64748b;
            font-size: 14px;
            font-weight: 500;
          }
          
          .detail-value {
            color: #1e293b;
            font-size: 15px;
            font-weight: 600;
          }
          
          .action-required {
            background: #fef3c7;
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0;
            border: 1px solid #fde68a;
          }
          
          .action-title {
            color: #92400e;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .action-list {
            list-style: none;
            padding-left: 0;
          }
          
          .action-list li {
            padding: 10px 0;
            padding-left: 32px;
            position: relative;
            color: #92400e;
          }
          
          .action-list li:before {
            content: "✅";
            position: absolute;
            left: 0;
          }
          
          .button-group {
            display: flex;
            gap: 16px;
            margin: 32px 0;
            flex-wrap: wrap;
          }
          
          .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 14px 28px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
          }
          
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
          }
          
          .btn-secondary {
            background: #f1f5f9;
            color: #475569;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          
          .btn-secondary:hover {
            background: #e2e8f0;
          }
          
          .btn-danger {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
          }
          
          .footer {
            background: #f1f5f9;
            padding: 24px 30px;
            text-align: center;
            color: #64748b;
            font-size: 13px;
            line-height: 1.5;
            border-top: 1px solid #e2e8f0;
          }
          
          .notification-note {
            font-size: 12px;
            color: #94a3b8;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
          }
          
          @media (max-width: 600px) {
            body {
              padding: 10px;
            }
            
            .header {
              padding: 30px 20px;
            }
            
            .content {
              padding: 30px 20px;
            }
            
            .summary-grid {
              grid-template-columns: 1fr;
            }
            
            .button-group {
              flex-direction: column;
            }
            
            .btn {
              justify-content: center;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <!-- Header -->
          <div class="header">
            <h1>💰 New Payment Received</h1>
            <p>Real-time Admin Notification</p>
          </div>
          
          <!-- Alert Banner -->
          <div class="alert-banner">
            <strong>🔄 REAL-TIME UPDATE:</strong> A student has completed a payment. Immediate attention required.
          </div>
          
          <!-- Content -->
          <div class="content">
            <h2 class="greeting">Dear ${adminName},</h2>
            
            <!-- Payment Summary -->
            <div class="payment-summary">
              <h3 class="summary-title">💳 Payment Summary</h3>
              
              <div class="summary-grid">
                <div class="summary-item">
                  <div class="summary-label">Payment ID</div>
                  <div class="summary-value">${payment.paymentId || payment._id}</div>
                </div>
                
                <div class="summary-item">
                  <div class="summary-label">Amount</div>
                  <div class="summary-value amount-badge">₹${payment.amount.toLocaleString('en-IN')}</div>
                </div>
                
                <div class="summary-item">
                  <div class="summary-label">Date & Time</div>
                  <div class="summary-value">${new Date(payment.paidDate || Date.now()).toLocaleString('en-IN')}</div>
                </div>
                
                <div class="summary-item">
                  <div class="summary-label">Payment Method</div>
                  <div class="summary-value">${payment.method ? payment.method.toUpperCase() : 'RAZORPAY'}</div>
                </div>
              </div>
              
              <div class="summary-item">
                <div class="summary-label">Description</div>
                <div class="summary-value">${payment.description}</div>
              </div>
            </div>
            
            <!-- Student Information -->
            <div class="student-info">
              <h3 class="section-title">👨‍🎓 Student Information</h3>
              
              <div class="student-details">
                <div class="detail-item">
                  <div class="detail-label">Full Name</div>
                  <div class="detail-value">${student.name}</div>
                </div>
                
                <div class="detail-item">
                  <div class="detail-label">Enrollment ID</div>
                  <div class="detail-value">${student.enrollmentId}</div>
                </div>
                
                <div class="detail-item">
                  <div class="detail-label">Email</div>
                  <div class="detail-value">${student.email}</div>
                </div>
                
                ${student.phone ? `
                <div class="detail-item">
                  <div class="detail-label">Phone</div>
                  <div class="detail-value">${student.phone}</div>
                </div>
                ` : ''}
                
                ${course ? `
                <div class="detail-item">
                  <div class="detail-label">Course</div>
                  <div class="detail-value">${course.name || course}</div>
                </div>
                ` : ''}
              </div>
            </div>
            
            <!-- Action Required -->
            <div class="action-required">
              <h3 class="action-title">📋 Action Required</h3>
              
              <ul class="action-list">
                <li>Verify the payment in Razorpay dashboard</li>
                <li>Update student's fee status in system</li>
                <li>Send study materials if applicable</li>
                <li>Update attendance and progress records</li>
                <li>Notify academic team about new payment</li>
              </ul>
            </div>
            
            <!-- Action Buttons -->
            <div class="button-group">
              <a href="${process.env.ADMIN_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/payments/${payment._id}" class="btn">
                📊 View Payment Details
              </a>
              
              <a href="https://dashboard.razorpay.com/" target="_blank" class="btn btn-secondary">
                💳 Open Razorpay Dashboard
              </a>
              
              <a href="${process.env.ADMIN_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/students/${student._id || ''}" class="btn btn-secondary">
                👨‍🎓 View Student Profile
              </a>
            </div>
            
            <!-- Important Notes -->
            <div class="notification-note">
              <p><strong>📌 Important:</strong> This payment is automatically recorded in the system. Please verify all details.</p>
              <p><strong>⏰ Time:</strong> ${new Date().toLocaleTimeString('en-IN')}</p>
              <p><strong>📍 Location:</strong> IP Address logged for security purposes</p>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <p>EduCoach Pro Admin Portal</p>
            <p>This is an automated notification. You're receiving this because you're an admin.</p>
            <p>© ${new Date().getFullYear()} EduCoach Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await transporter.sendMail({
      from: `"EduCoach Pro Admin System" <${process.env.EMAIL_USER || process.env.SMTP_USER || process.env.SMTP_FROM}>`,
      to: email,
      subject: `💰 NEW PAYMENT: ${student.name} paid ₹${payment.amount} [${payment.paymentId}]`,
      html: html,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    });
    
    console.log(`✅ Admin payment notification sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending admin notification to ${email}:`, error.message);
    throw error;
  }
};

/**
 * Send class schedule notification
 */
const sendClassNotificationEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"EduCoach Pro Classes" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to: options.email,
      subject: `📚 Upcoming Class: ${options.class.subject} - ${options.class.topic}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #cce5ff; padding: 20px; text-align: center; color: #004085; border-radius: 10px 10px 0 0; }
            .content { padding: 30px; background: #f9f9f9; }
            .footer { padding: 20px; text-align: center; background: #f1f1f1; color: #666; font-size: 12px; }
            .class-info { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #17a2b8; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .reminder { background: #fff3cd; padding: 10px; border-radius: 5px; margin: 15px 0; color: #856404; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>📅 Class Reminder</h2>
              <p>Don't miss your upcoming class</p>
            </div>
            
            <div class="content">
              <p>Hello ${options.name},</p>
              
              <p>This is a reminder about your upcoming class:</p>
              
              <div class="class-info">
                <h3>${options.class.subject}</h3>
                <p><strong>Topic:</strong> ${options.class.topic}</p>
                <p><strong>Date & Time:</strong> ${new Date(options.class.startTime).toLocaleString()}</p>
                <p><strong>Duration:</strong> ${options.class.duration} minutes</p>
                <p><strong>Instructor:</strong> ${options.class.instructorName}</p>
                <p><strong>Meeting Link:</strong> ${options.class.meetingLink}</p>
                ${options.class.meetingPassword ? `<p><strong>Meeting Password:</strong> ${options.class.meetingPassword}</p>` : ''}
              </div>
              
              <div class="reminder">
                <p>💡 <strong>Preparation Tips:</strong></p>
                <ul>
                  <li>Join 5 minutes before the scheduled time</li>
                  <li>Check your internet connection</li>
                  <li>Have your study material ready</li>
                  <li>Prepare questions in advance</li>
                </ul>
              </div>
              
              <a href="${options.class.meetingLink}" class="button">Join Class Now</a>
              
              <p>If you're unable to attend, the recording will be available in your dashboard after the class.</p>
              
              <p>Best regards,<br>
              EduCoach Pro Academic Team</p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} EduCoach Pro</p>
              <p>This is an automated notification. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ Class notification email sent to ${options.email}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending class notification email: ${error.message}`);
    return false;
  }
};

/**
 * Send notice/announcement email
 */
const sendNoticeEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"EduCoach Pro Notices" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to: options.emails.join(', '),
      subject: `📢 Important Notice: ${options.notice.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; border-radius: 10px 10px 0 0; border-left: 5px solid #6c757d; }
            .content { padding: 30px; background: #f9f9f9; }
            .footer { padding: 20px; text-align: center; background: #f1f1f1; color: #666; font-size: 12px; }
            .notice-body { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin: 20px 0; }
            .priority-high { border-left: 5px solid #dc3545; }
            .priority-medium { border-left: 5px solid #ffc107; }
            .priority-low { border-left: 5px solid #28a745; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header ${options.notice.priority === 'high' ? 'priority-high' : options.notice.priority === 'medium' ? 'priority-medium' : 'priority-low'}">
              <h2>📢 Important Notice</h2>
              <p>${options.notice.category.toUpperCase()} • ${options.notice.priority.toUpperCase()} Priority</p>
            </div>
            
            <div class="content">
              <h3>${options.notice.title}</h3>
              
              <div class="notice-body">
                ${options.notice.content.split('\n').map(paragraph => `<p>${paragraph}</p>`).join('')}
                
                ${options.notice.attachments && options.notice.attachments.length > 0 ? `
                  <div style="margin-top: 20px;">
                    <h4>📎 Attachments:</h4>
                    <ul>
                      ${options.notice.attachments.map(attachment => 
                        `<li><a href="${attachment.url}">${attachment.name}</a></li>`
                      ).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>
              
              <p><strong>Published:</strong> ${new Date(options.notice.publishDate).toLocaleDateString()}</p>
              ${options.notice.expiryDate ? `<p><strong>Valid Until:</strong> ${new Date(options.notice.expiryDate).toLocaleDateString()}</p>` : ''}
              
              <p>You can view this notice and all previous notices in your student dashboard.</p>
              
              <a href="${process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/student/notices" style="color: #007bff; text-decoration: none;">→ View All Notices</a>
              
              <p>Best regards,<br>
              EduCoach Pro Administration</p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} EduCoach Pro</p>
              <p>This is an automated notification. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ Notice email sent to ${options.emails.length} recipients`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending notice email: ${error.message}`);
    return false;
  }
};

/**
 * Send report email
 */
const sendReportEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"EduCoach Pro Reports" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to: options.email,
      subject: `📊 Automated Report: ${options.reportType} - ${new Date().toLocaleDateString()}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #e2e3e5; padding: 20px; text-align: center; color: #383d41; border-radius: 10px 10px 0 0; }
            .content { padding: 30px; background: #f9f9f9; }
            .footer { padding: 20px; text-align: center; background: #f1f1f1; color: #666; font-size: 12px; }
            .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
            .stat-box { background: white; padding: 15px; border-radius: 5px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .stat-value { font-size: 24px; font-weight: bold; color: #007bff; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>📊 Automated System Report</h2>
              <p>${options.reportType} • ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div class="content">
              <p>Hello Admin,</p>
              
              <p>Here is your automated ${options.reportType} report:</p>
              
              <div class="stats">
                ${options.data.stats ? Object.entries(options.data.stats).map(([key, value]) => `
                  <div class="stat-box">
                    <div class="stat-value">${value}</div>
                    <div>${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
                  </div>
                `).join('') : ''}
              </div>
              
              ${options.data.summary ? `
                <div style="margin: 20px 0; padding: 15px; background: white; border-radius: 5px;">
                  <h4>Summary:</h4>
                  <p>${options.data.summary}</p>
                </div>
              ` : ''}
              
              ${options.data.insights && options.data.insights.length > 0 ? `
                <div style="margin: 20px 0; padding: 15px; background: #fff3cd; border-radius: 5px;">
                  <h4>🔍 Key Insights:</h4>
                  <ul>
                    ${options.data.insights.map(insight => `<li>${insight}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
              
              ${options.attachment ? `
                <p>📎 <a href="${options.attachment}">Download detailed report</a></p>
              ` : ''}
              
              <p>You can view more detailed analytics in your admin dashboard.</p>
              
              <a href="${process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/dashboard" style="color: #007bff; text-decoration: none;">→ Go to Admin Dashboard</a>
              
              <p>Best regards,<br>
              EduCoach Pro Reporting System</p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} EduCoach Pro</p>
              <p>This is an automated report generated by the system.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: options.attachment ? [
        {
          filename: `report-${options.reportType}-${Date.now()}.pdf`,
          path: options.attachment
        }
      ] : []
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ Report email sent to ${options.email}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending report email: ${error.message}`);
    return false;
  }
};

/**
 * Send contact form email
 */
const sendContactFormEmail = async (formData) => {
  try {
    const transporter = createTransporter();
    
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || process.env.SMTP_USER;
    
    if (!adminEmail) {
      console.error('❌ Admin email not configured in .env');
      return false;
    }

    const mailOptions = {
      from: `"EduCoach Pro Contact Form" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to: adminEmail,
      replyTo: formData.email,
      subject: `📧 New Contact Form: ${formData.subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
            .content { padding: 30px; }
            .footer { padding: 20px; text-align: center; background: #f1f5f9; color: #64748b; font-size: 14px; }
            .info-box { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .label { color: #64748b; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
            .value { color: #1e293b; font-size: 16px; margin-bottom: 15px; }
            .message-box { background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; white-space: pre-wrap; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 New Contact Form Submission</h1>
              <p>EduCoach Pro Website</p>
            </div>
            
            <div class="content">
              <h2>Contact Details</h2>
              
              <div class="info-box">
                <div class="label">From</div>
                <div class="value">${formData.name}</div>
                
                <div class="label">Email</div>
                <div class="value">${formData.email}</div>
                
                <div class="label">Phone</div>
                <div class="value">${formData.phone || 'Not provided'}</div>
                
                <div class="label">Subject</div>
                <div class="value">${formData.subject}</div>
                
                <div class="label">Submitted At</div>
                <div class="value">${new Date(formData.timestamp).toLocaleString()}</div>
              </div>
              
              <h3>Message:</h3>
              <div class="message-box">${formData.message}</div>
              
              <p><strong>Action Required:</strong></p>
              <p>Please respond to this inquiry within 24 hours. You can reply directly to ${formData.email}.</p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} EduCoach Pro. All rights reserved.</p>
              <p>This is an automated email from the contact form system.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ Contact form email sent to admin: ${adminEmail}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error sending contact form email: ${error.message}`);
    return false;
  }
};

/**
 * Simple SMS function (mock - can integrate with Twilio, MessageBird, etc.)
 */
const sendSMS = async ({ to, message }) => {
  try {
    // Mock SMS sending
    console.log(`📱 SMS sent to ${to}: ${message}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending SMS:', error);
    return false;
  }
};

/**
 * Test email service
 */
const testEmailService = async () => {
  try {
    const transporter = createTransporter();
    
    await transporter.verify();
    console.log('✅ Email server is ready to send messages');
    
    const testMailOptions = {
      from: `"EduCoach Pro" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to: process.env.EMAIL_USER || process.env.SMTP_USER,
      subject: 'Test Email - EduCoach Pro Email Service',
      text: 'This is a test email to verify the email service is working properly.',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; text-align: center; }
            .success { color: #28a745; font-size: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">✅ Email Service Test Successful!</h1>
            <p>This email confirms that the EduCoach Pro email service is working correctly.</p>
            <p>Server Time: ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `
    };
    
    await transporter.sendMail(testMailOptions);
    console.log('✅ Test email sent successfully');
    return true;
  } catch (error) {
    console.error(`❌ Email service test failed: ${error.message}`);
    return false;
  }
};

// Export all functions
module.exports = {
  createTransporter,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPaymentConfirmationEmail,
  sendAdminPaymentNotification,
  sendClassNotificationEmail,
  sendNoticeEmail,
  sendReportEmail,
  sendContactFormEmail,
  sendSMS,
  testEmailService
};