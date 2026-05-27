const express = require('express');
const http = require('http');
const dns = require('dns');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const dotenv = require('dotenv');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const User = require('./models/User');

// Load environment variables
dotenv.config();

// Startup security check — catches misconfigured secrets before the server accepts traffic
const securityWarnings = [];
if (!process.env.MONGODB_URI) securityWarnings.push('MONGODB_URI is not set');
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
  securityWarnings.push('JWT_SECRET is missing or too short (need 32+ chars)');
if (process.env.NODE_ENV === 'production') {
  if (!process.env.CORS_ORIGIN) securityWarnings.push('CORS_ORIGIN is not set for production');
  if (process.env.ENABLE_DEV_EMAIL_BYPASS === 'true')
    securityWarnings.push('ENABLE_DEV_EMAIL_BYPASS=true in production — set to false');
}
if (securityWarnings.length > 0) {
  securityWarnings.forEach(w => console.error(`⛔  CONFIG: ${w}`));
  if (process.env.NODE_ENV === 'production') process.exit(1);
}

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const borrowRequestRoutes = require('./routes/borrowRequestRoutes');
const statsRoutes = require('./routes/statsRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportsRoutes = require('./routes/reportsRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');
const { initGridFS } = require('./config/gridfs');
const { maintenanceModeGuard } = require('./middleware/maintenanceMode');
const { initSocket } = require('./socket');

const app = express();
let server;

const parseTrustProxySetting = (value) => {
  if (!value) return false;

  const normalized = String(value).trim().toLowerCase();
  if (!normalized || normalized === 'false' || normalized === '0' || normalized === 'off') {
    return false;
  }

  if (normalized === 'true' || normalized === '1' || normalized === 'on') {
    return true;
  }

  if (normalized === 'loopback' || normalized === 'linklocal' || normalized === 'uniquelocal') {
    return normalized;
  }

  const asNumber = Number(normalized);
  if (Number.isInteger(asNumber) && asNumber >= 0) {
    return asNumber;
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const trustProxySetting = parseTrustProxySetting(process.env.TRUST_PROXY);
if (trustProxySetting !== false) {
  app.set('trust proxy', trustProxySetting);
  console.log(`ℹ️  Express trust proxy enabled: ${JSON.stringify(trustProxySetting)}`);
}

// Optional: Force Node's DNS resolver (useful when SRV lookups fail due to
// broken/blocked system DNS configuration).
if (process.env.DNS_SERVERS) {
  const dnsServers = process.env.DNS_SERVERS
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  if (dnsServers.length > 0) {
    dns.setServers(dnsServers);
    console.log(`ℹ️  Using custom DNS servers: ${dns.getServers().join(', ')}`);
  }
}

const ensureAdminAccount = async () => {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || !password) {
    console.warn('⚠️  ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin account setup.');
    return;
  }

  // If any admin already exists, do nothing
  const existingAdmin = await User.findOne({ role: 'admin' }).select('_id');
  if (existingAdmin) return;

  // Promote existing user if the email already exists
  const existingByEmail = await User.findOne({ email }).select('_id role status');
  if (existingByEmail) {
    existingByEmail.role = 'admin';
    if (existingByEmail.status !== 'active') existingByEmail.status = 'active';
    await existingByEmail.save();
    console.log(`✅ Promoted ${email} to admin role`);
    return;
  }

  // Password hashing is handled by the User model pre-save bcrypt hook.
  await User.create({ email, password, name: 'System Administrator', role: 'admin', status: 'active' });
  console.log(`✅ Created admin account: ${email}`);
};

// Middleware
const defaultDevOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
];
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === 'production' && configuredOrigins.length === 0) {
  console.error('FATAL: CORS_ORIGIN is not set. Set it to your frontend domain (e.g. https://yourdomain.com) in the production .env file.');
  process.exit(1);
}

const allowedOrigins = Array.from(new Set(
  process.env.NODE_ENV === 'production'
    ? configuredOrigins
    : [...defaultDevOrigins, ...configuredOrigins]
));
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin || allowedOrigins[0]);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  frameguard: { action: 'deny' },
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(mongoSanitize());
app.use(xss());
app.use(logger);
app.use(maintenanceModeGuard);

// Serve uploaded files
const path = require('path');
const uploadDir = process.env.UPLOAD_PATH
  ? path.resolve(__dirname, process.env.UPLOAD_PATH)
  : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDir));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Rate limiting (A07:2025 — Authentication Failures)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later.' }
});
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/borrow-requests', borrowRequestRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin/audit-logs', auditLogRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportsRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Database connection
mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
  console.log('✅ MongoDB connected successfully');

  await ensureAdminAccount();
  
  // Initialize GridFS after MongoDB connection
  initGridFS();

  const PORT = Number(process.env.PORT) || 3000;
  const httpServer = http.createServer(app);
  initSocket(httpServer, allowedOrigins);
  
  // Start server
  server = httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(` Port ${PORT} is already in use.`);
      console.error('   Close the other process using this port, or set a different PORT in backend/.env.');
    } else {
      console.error(' Server error:', err);
    }
    process.exit(1);
  });
})
.catch((err) => {
  console.error(' MongoDB connection error:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  if (server) {
    server.close(() => process.exit(1));
    return;
  }
  process.exit(1);
});

module.exports = app;
