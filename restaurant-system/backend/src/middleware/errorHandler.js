const logger = require('../utils/logger');

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  logger.error(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  if (err.stack && process.env.NODE_ENV === 'development') logger.debug(err.stack);

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(422).json({
      success: false,
      message: 'Validation Error',
      errors: err.errors?.map(e => ({ field: e.path, message: e.message })),
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
