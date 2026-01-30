require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { initializeDatabase } = require('./database');
const { initializeWebSocket } = require('./websocket');

// Import routes
const authRoutes = require('./routes/auth');
const messagesRoutes = require('./routes/messages');
const chatsRoutes = require('./routes/chats');
const serversRoutes = require('./routes/servers');
const mediaRoutes = require('./routes/media');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket
const io = initializeWebSocket(server);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      mediaSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "wss:", "ws:", "https://api.giphy.com", "https://api.klipy.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io available to routes
app.set('io', io);

// Static files for uploads
app.use('/uploads', express.static('data/uploads'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/servers', serversRoutes);
app.use('/api/invites', require('./routes/server_invites'));
app.use('/api/media', mediaRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'The Penthouse', version: '1.0.0' });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  const frontendPath = path.join(__dirname, '../../web/dist');

  // Serve static files
  app.use(express.static(frontendPath));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
}

// Initialize database and start server
const PORT = process.env.PORT || 3000;

async function start() {
  await initializeDatabase();

  server.listen(PORT, () => {
    console.log(`🏠 The Penthouse server running on port ${PORT}`);
    console.log(`📡 WebSocket ready for connections`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = { app, server };
