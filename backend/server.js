const express = require('express');
const dns = require('dns');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
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

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');
const { initGridFS } = require('./config/gridfs');

const app = express();
let server;

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
const allowedOrigins = process.env.CORS_ORIGIN
  ? [process.env.CORS_ORIGIN]
  : ['http://localhost:5173', 'http://localhost:5174'];
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

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
app.use('/api/users', userRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/borrow-requests', borrowRequestRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin/audit-logs', auditLogRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Database connection
mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
  console.log('✅ MongoDB connected successfully');

  await ensureAdminAccount();
  
  // Initialize GridFS after MongoDB connection
  initGridFS();
  
  // Start server
  const PORT = Number(process.env.PORT) || 3000;
  server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use.`);
      console.error('   Close the other process using this port, or set a different PORT in backend/.env.');
    } else {
      console.error('❌ Server error:', err);
    }
    process.exit(1);
  });
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
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
