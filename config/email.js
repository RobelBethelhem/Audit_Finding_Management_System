require('dotenv').config();

/**
 * Email configuration
 * These settings can be overridden by environment variables
 */
module.exports = {
  // SMTP server settings
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_SECURE === 'true' || false,
  
  // Authentication
  user: process.env.EMAIL_USER || 'audit-system@example.com',
  password: process.env.EMAIL_PASSWORD || 'your-password',
  
  // Default sender
  from: process.env.EMAIL_FROM || 'Zemen Bank Audit System <audit-system@example.com>',
  
  // Email sending options
  replyTo: process.env.EMAIL_REPLY_TO || 'no-reply@example.com',
  
  // Rate limiting (optional)
  rateLimit: {
    maxConnections: parseInt(process.env.EMAIL_MAX_CONNECTIONS || '5', 10),
    maxMessages: parseInt(process.env.EMAIL_MAX_MESSAGES || '100', 10),
    rateDelta: parseInt(process.env.EMAIL_RATE_DELTA || '1000', 10) // 1 second
  }
};