/**
 * Input Validation Middleware
 * 
 * Validates and sanitizes user input to prevent:
 * - SQL injection (parameterized queries already handle this)
 * - XSS attacks (sanitize HTML in messages)
 * - Invalid data (ensure proper types and formats)
 */

const { body, param, query, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');

/**
 * Handle validation errors
 * Returns 400 with error details if validation fails
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

/**
 * Sanitize HTML content in messages
 * Allows basic formatting but strips dangerous tags
 */
const sanitizeMessageContent = (content) => {
  if (!content) return content;
  
  return sanitizeHtml(content, {
    allowedTags: [], // Strip all HTML tags for now (plain text only)
    allowedAttributes: {},
    textFilter: (text) => text, // Keep text content
  }).trim();
};

// ─────────────────────────────────────────────────────────────
// Auth Validation Rules
// ─────────────────────────────────────────────────────────────

const validateRegister = [
  body('username')
    .trim()
    .toLowerCase()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be 3-20 characters')
    .matches(/^[a-z0-9_@.-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, @, ., and -'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Display name cannot exceed 50 characters'),
  
  handleValidation
];

const validateLogin = [
  body('username')
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage('Username is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidation
];

const validateForgotPassword = [
  body('email').isEmail().withMessage('Valid email is required'),
  handleValidation
];

const validateResetPassword = [
  body('token').notEmpty().withMessage('Token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  handleValidation
];

// ─────────────────────────────────────────────────────────────
// Message Validation Rules
// ─────────────────────────────────────────────────────────────

const validateMessage = [
  body('content')
    .optional()
    .customSanitizer(sanitizeMessageContent)
    .isLength({ max: 4000 })
    .withMessage('Message cannot exceed 4000 characters'),
  
  body('type')
    .optional()
    .isIn(['text', 'image', 'video', 'file', 'voice', 'gif', 'sticker'])
    .withMessage('Invalid message type'),
  
  handleValidation
];

const validateEditMessage = [
  param('messageId')
    .isInt({ min: 1 })
    .withMessage('Invalid message ID'),
  
  body('content')
    .trim()
    .customSanitizer(sanitizeMessageContent)
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ max: 4000 })
    .withMessage('Message cannot exceed 4000 characters'),
  
  handleValidation
];

// ─────────────────────────────────────────────────────────────
// Chat Validation Rules
// ─────────────────────────────────────────────────────────────

const validateCreateGroup = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Group name must be 1-50 characters'),
  
  body('memberIds')
    .optional()
    .isArray()
    .withMessage('Member IDs must be an array'),
  
  handleValidation
];

const validateStartDm = [
  body('userId')
    .isInt({ min: 1 })
    .withMessage('Invalid user ID'),
  
  handleValidation
];

// ─────────────────────────────────────────────────────────────
// Server Validation Rules
// ─────────────────────────────────────────────────────────────

const validateCreateServer = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Server name must be 1-50 characters'),
  
  handleValidation
];

const validateCreateChannel = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Channel name must be 1-50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Channel name can only contain letters, numbers, underscores, and hyphens'),
  
  handleValidation
];

// ─────────────────────────────────────────────────────────────
// Friend Validation Rules
// ─────────────────────────────────────────────────────────────

const validateFriendRequest = [
  body('userId')
    .isInt({ min: 1 })
    .withMessage('Invalid user ID'),
  
  handleValidation
];

const validateUserId = [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('Invalid user ID'),
  
  handleValidation
];

const validateRequestId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid request ID'),
  
  handleValidation
];

// ─────────────────────────────────────────────────────────────
// Search Validation
// ─────────────────────────────────────────────────────────────

const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query too long'),
  
  handleValidation
];

module.exports = {
  // Utility
  handleValidation,
  sanitizeMessageContent,
  
  // Auth
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  
  // Messages
  validateMessage,
  validateEditMessage,
  
  // Chats
  validateCreateGroup,
  validateStartDm,
  
  // Servers
  validateCreateServer,
  validateCreateChannel,
  
  // Friends
  validateFriendRequest,
  validateUserId,
  validateRequestId,
  
  // Search
  validateSearch,
};
