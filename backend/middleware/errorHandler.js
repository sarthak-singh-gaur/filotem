const logger = require('../utils/logger');

/**
 * 404 Not Found Middleware
 */
function notFoundHandler(req, res, _next) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

/**
 * Global Centralized Error Handler Middleware
 */
function globalErrorHandler(err, req, res, _next) {
  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, err);

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: `Invalid identifier format for field: ${err.path}`
    });
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation failed',
      details: messages
    });
  }

  // Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {});
    return res.status(409).json({
      error: `Resource with duplicate field already exists: ${fields.join(', ')}`
    });
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token has expired' });
  }

  const statusCode = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    error: isProd && statusCode === 500 ? 'Internal Server Error' : err.message,
    ...(!isProd && { stack: err.stack })
  });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler
};

