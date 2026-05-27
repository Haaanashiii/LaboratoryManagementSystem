const logger = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next();
  const timestamp = new Date().toISOString();
  const level = process.env.NODE_ENV === 'production' ? 'INFO' : 'LOG';
  console.log(`[${timestamp}] ${level} ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
};

module.exports = logger;
