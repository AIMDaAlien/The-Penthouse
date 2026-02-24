/**
 * Rate Limiting Middleware
 * 
 * Protects API endpoints from abuse with tiered rate limits:
 * - Strict: Auth endpoints (prevent brute force)
 * - Moderate: Message sending (prevent spam)
 * - Lenient: General API (normal usage)
 */

const rateLimit = require('express-rate-limit');

// Store for rate limit data (in-memory, consider Redis for production cluster)
const createLimiter = (options) => rateLimit({
  windowMs: options.windowMs,
  max: options.max,
  message: { error: options.message || 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in test environment
  skip: (req, res) => {
    if (process.env.NODE_ENV === 'test') return true;
    if (typeof options.skip === 'function') return options.skip(req, res);
    return false;
  },
});

/**
 * Strict Rate Limit - Auth endpoints
 * 5 attempts per minute per IP
 * Prevents brute force login attempts
 */
const authLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: 'Too many login attempts, please wait a minute before trying again.'
});

/**
 * Registration Rate Limit
 * 10 registrations per hour per IP
 * Prevents mass account creation
 */
const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many registration attempts. Please wait before trying again.'
});

/**
 * Message Rate Limit - Spam prevention
 * 30 messages per minute per user
 */
const messageLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Slow down! Too many messages sent.'
});

/**
 * Upload Rate Limit - File uploads
 * 10 uploads per minute
 */
const uploadLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many uploads, please wait before uploading more files.'
});

/**
 * API Rate Limit - General endpoints
 * 100 requests per minute per IP
 */
const apiLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests, please slow down.',
  // Auth endpoints have their own dedicated limiters.
  // Excluding them from the global API bucket avoids false positives behind reverse proxies.
  skip: (req) => req.path.startsWith('/auth') || req.path === '/health',
});

/**
 * Friend Request Rate Limit
 * 20 friend requests per hour
 */
const friendRequestLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many friend requests sent. Please wait before sending more.'
});

/**
 * Refresh Token Rate Limit
 * 30 refresh requests per hour per IP
 */
const refreshLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: 'Too many token refresh attempts. Please wait and try again.'
});

/**
 * Logout Rate Limit
 * 120 logout requests per hour per IP
 */
const logoutLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 120,
  message: 'Too many logout requests. Please slow down.'
});

/**
 * Forgot Password Rate Limit
 * 5 requests per hour per IP
 */
const forgotPasswordLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many password reset requests. Please wait before trying again.'
});

/**
 * Strict Debug Endpoint Limit
 * 10 requests per hour per IP
 */
const debugLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many debug requests.'
});

module.exports = {
  authLimiter,
  registerLimiter,
  messageLimiter,
  uploadLimiter,
  apiLimiter,
  friendRequestLimiter,
  refreshLimiter,
  logoutLimiter,
  forgotPasswordLimiter,
  debugLimiter,
};
