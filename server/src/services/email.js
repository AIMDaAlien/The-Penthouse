/**
 * Email Service
 * 
 * Handles sending emails for account recovery and notifications.
 * Uses nodemailer with SMTP transport.
 */

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send password reset email
 * @param {string} to - Recipient email
 * @param {string} token - Reset token
 * @returns {Promise<void>}
 */
async function sendPasswordResetEmail(to, token, username) {
  // In development, log the token if SMTP is not configured
  if (!process.env.SMTP_HOST) {
    console.log('----------------------------------------');
    console.log(`📧 MOCK EMAIL TO: ${to}`);
    console.log(`👤 USER: ${username}`);
    console.log(`🔑 RESET TOKEN: ${token}`);
    console.log('----------------------------------------');
    return;
  }

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"The Penthouse" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: 'Password Reset Request',
    html: `
      <h2>Hello ${username},</h2>
      <p>You requested a password reset for your account at The Penthouse.</p>
      <p>Please use the following token to reset your password:</p>
      <h3 style="background-color: #f0f0f0; padding: 10px; display: inline-block;">${token}</h3>
      <p>This token will expire in 1 hour.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error; // Let the caller handle/log the error
  }
}

module.exports = {
  sendPasswordResetEmail,
};
