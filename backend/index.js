const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const { setupRedisAdapter, closeRedis } = require('./config/redis');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

// Enforce mandatory environment variables
if (!process.env.JWT_SECRET) {
  logger.error('FATAL ERROR: JWT_SECRET is not configured in the environment.');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP. Please try again later.' }
});

// ---------------------------------------------------------------------------
// CORS – allow the Vite dev server + any deployed frontends
// ---------------------------------------------------------------------------
const envOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : [];
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  ...envOrigins
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    // Allow development / staging origins if configured permissively
    cb(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '8mb' }));

// Apply general API rate limiting
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ---------------------------------------------------------------------------
// Socket.io
// ---------------------------------------------------------------------------
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
app.set('io', io);

// Attach Redis adapter for horizontal scaling (falls back to in-memory if unset)
setupRedisAdapter(io);

// ---------------------------------------------------------------------------
// MongoDB Connection
// ---------------------------------------------------------------------------
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    logger.error('❌ MONGODB_URI is not set in environment.');
    return;
  }
  try {
    await mongoose.connect(mongoUri, {
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4 if needed
    });
    logger.info('✅ Filotem Platform – MongoDB connected');
  } catch (err) {
    logger.error('❌ MongoDB connection error:', err.message);
    if (err.message.includes('handshake failure') || err.message.includes('SSL')) {
      logger.warn('TIP [CONNECTION BLOCKED]: Your IP address is not whitelisted in MongoDB Atlas.');
      logger.warn('   -> Go to MongoDB Atlas > Network Access > Add your Current IP Address.');
    } else if (err.message.includes('bad auth')) {
      logger.warn('TIP [BAD SECRETS]: Database username or password is incorrect.');
      logger.warn('   -> Verify credentials in backend/.env MONGODB_URI.');
    }
    process.exit(1);
  }
};

connectDB();

// ---------------------------------------------------------------------------
// REST Routes
// ---------------------------------------------------------------------------
const authRoutes   = require('./routes/auth');
const userRoutes   = require('./routes/users');
const friendRoutes = require('./routes/friends');
const msgRoutes    = require('./routes/messages');
const tableRoutes  = require('./routes/tables');
const badgeRoutes  = require('./routes/badges');
const uploadRoutes = require('./routes/uploads');

app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/friends',  friendRoutes);
app.use('/api/messages', msgRoutes);
app.use('/api/tables',   tableRoutes);
app.use('/api/badges',   badgeRoutes);
app.use('/api/uploads',  uploadRoutes);

// Health-check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    platform: 'filotem',
    ts: Date.now(),
    uptime: process.uptime()
  });
});

// ---------------------------------------------------------------------------
// Socket.io – real-time messaging
// ---------------------------------------------------------------------------
const setupSocket = require('./socket/chat');
setupSocket(io);

// ---------------------------------------------------------------------------
// 404 & Centralized Error Handling
// ---------------------------------------------------------------------------
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Filotem API running on port ${PORT}`);
});

// ---------------------------------------------------------------------------
// Graceful Process Lifecycle Shutdown
// ---------------------------------------------------------------------------
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed.');

    try {
      await io.close();
      logger.info('Socket.io connections closed.');

      await closeRedis();
      logger.info('Redis connections closed.');

      await mongoose.disconnect();
      logger.info('MongoDB disconnected.');

      logger.info('Graceful shutdown completed successfully.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during graceful shutdown:', err);
      process.exit(1);
    }
  });

  // Force exit if drain exceeds 10 seconds
  setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s. Forcing exit.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
