/**
 * Async Handler Wrapper
 * 
 * eliminates the need for try-catch blocks in every route handler.
 * Automatically catches errors and passes them to the next middleware (errorHandler).
 * 
 * Usage:
 * router.get('/', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
