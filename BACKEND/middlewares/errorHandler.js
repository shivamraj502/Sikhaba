function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);

  // CORS rejection from cors.js
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'Origin not allowed' });
  }

  const status = err.status || err.statusCode || 500;

  res.status(status).json({
    message: status === 500 ? 'Internal server error' : err.message,
  });
}

module.exports = errorHandler;