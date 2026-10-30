// Global Express Error Handler

function errorHandler(err, req, res, next) {
  console.error('Unhandled Error:', err);

  // SQLite constraint violations
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({
      success: false,
      message: 'A record with this identifier (e.g. SKU or Name) already exists.',
      error: err.message
    });
  }

  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return res.status(409).json({
      success: false,
      message: 'Cannot perform operation because this item is referenced by existing sales or records.',
      error: err.message
    });
  }

  if (err.code === 'SQLITE_CONSTRAINT_CHECK') {
    return res.status(400).json({
      success: false,
      message: 'Database check constraint failed (e.g. negative values or invalid ranges).',
      error: err.message
    });
  }

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}

module.exports = errorHandler;
