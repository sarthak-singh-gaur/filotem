const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// ---------------------------------------------------------------------------
// CORS – allow the Vite dev server + any deployed frontends
// ---------------------------------------------------------------------------
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  // Add production URLs here later
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, true); // permissive in dev – tighten for production
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// ---------------------------------------------------------------------------
// Socket.io
// ---------------------------------------------------------------------------
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
app.set('io', io);

// ---------------------------------------------------------------------------
// MongoDB Connection
// ---------------------------------------------------------------------------
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      // Common options for Atlas in some environments
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4 if needed
    });
    console.log('✅ Filotem Platform – MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    if (err.message.includes('handshake failure') || err.message.includes('SSL')) {
      console.warn('⚠️  TIP [CONNECTION BLOCKED]: Your IP address is not whitelisted in MongoDB Atlas.');
      console.warn('   -> Go to MongoDB Atlas > Network Access > Add your Current IP Address.');
    } else if (err.message.includes('bad auth')) {
      console.warn('⚠️  TIP [BAD SECRETS]: Database username or password is incorrect.');
      console.warn('   -> Verify credentials in backend/.env MONGODB_URI.');
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

app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/friends',  friendRoutes);
app.use('/api/messages', msgRoutes);
app.use('/api/tables',   tableRoutes);
app.use('/api/badges',   badgeRoutes);

// Health-check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', platform: 'filotem', ts: Date.now() });
});

// ---------------------------------------------------------------------------
// Socket.io – real-time messaging
// ---------------------------------------------------------------------------
const setupSocket = require('./socket/chat');
setupSocket(io);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Filotem API running on port ${PORT}`);
});
