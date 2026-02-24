/**
 * Global Error Handling Middleware
 * 
 * Centralizes error handling for the entire application.
 * Ensures consistent error responses and proper logging.
 */

const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);

  // Default error status and message
  let status = 500;
  let message = 'Internal Server Error';
  let error = 'Something went wrong';

  // Handle specific error types
  if (err.type === 'entity.parse.failed') {
    // JSON parsing error
    status = 400;
    message = 'Invalid JSON payload';
    error = 'Bad Request';
  } else if (err && err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = 'Uploaded file is too large';
    error = 'Payload Too Large';
  } else if (typeof err.code === 'string' && (
    err.code === 'SQLITE_READONLY' ||
    err.code === 'SQLITE_CANTOPEN' ||
    err.code === 'SQLITE_BUSY' ||
    err.code === 'SQLITE_LOCKED' ||
    err.code === 'SQLITE_IOERR'
  )) {
    status = 503;
    message = 'Database is temporarily unavailable. Please try again.';
    error = 'Service Unavailable';
  } else if (err.code === 'SQLITE_CONSTRAINT') {
    // Database constraint violation
    status = 409;
    message = 'Data conflict occurred';
    error = 'Conflict';
  } else if (err.name === 'ValidationError') {
    // Mongoose/Sequelize style validation error (future proofing)
    status = 400;
    message = err.message;
    error = 'Validation Error';
  } else if (err.message === 'Origin not allowed by CORS') {
    status = 403;
    message = err.message;
    error = 'Forbidden';
  } else if (err.message === 'Insufficient storage') {
    status = 507;
    message = 'Insufficient storage';
    error = 'Insufficient Storage';
  }

  // Send response
  res.status(status).json({
    error,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
