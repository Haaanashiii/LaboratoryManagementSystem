const express = require('express');
const http = require('http');
const dns = require('dns');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const User = require('./models/User');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const borrowRequestRoutes = require('./routes/borrowRequestRoutes');
const statsRoutes = require('./routes/statsRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

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
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    const devEmail = 'admin@its.ac.id';
    const devPassword = 'Admin123!';

    const devAdmin = await User.findOne({ email: devEmail }).select('+password role status');
    if (devAdmin) {
      devAdmin.role = 'admin';
      devAdmin.status = 'active';
      devAdmin.password = devPassword;
      await devAdmin.save();
      console.log('✅ Development admin account refreshed: admin@its.ac.id');
      return;
    }

    await User.create({
      email: devEmail,
      password: devPassword,
      name: 'Development Admin',
      role: 'admin',
      status: 'active'
    });

    console.log('✅ Development admin account created: admin@its.ac.id');
    return;
  }

  const existingAdmin = await User.findOne({ role: 'admin' }).select('_id email');
  if (existingAdmin) {
    return;
  }

  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || !password) {
    console.warn('⚠️  No admin user exists and ADMIN_EMAIL/ADMIN_PASSWORD are not set.');
    return;
  }

  const existingByEmail = await User.findOne({ email }).select('_id role status');
  if (existingByEmail) {
    existingByEmail.role = 'admin';
    if (existingByEmail.status !== 'active') {
      existingByEmail.status = 'active';
    }
    await existingByEmail.save();
    console.log(`✅ Promoted ${email} to admin role`);
    return;
  }

  // Password hashing is handled by the User model pre-save bcrypt hook.
  await User.create({
    email,
    password,
    name: 'System Administrator',
    role: 'admin',
    status: 'active'
  });

  console.log(`✅ Created default admin account: ${email}`);
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
const allowedOrigins = Array.from(new Set(
  process.env.NODE_ENV === 'production'
    ? (configuredOrigins.length > 0 ? configuredOrigins : defaultDevOrigins)
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
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
app.use(xss());
app.use(logger);
app.use(maintenanceModeGuard);

// Serve uploaded files
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

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
