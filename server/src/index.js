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
const pushRoutes = require('./routes/push');
const friendsRoutes = require('./routes/friends');
const appUpdateRoutes = require('./routes/app_update');

const app = express();
const server = http.createServer(app);
const isProduction = process.env.NODE_ENV === 'production';
const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};
let shuttingDown = false;
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured');
}
const parseOrigins = (raw) => (raw || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const configuredOrigins = parseOrigins(process.env.CORS_ORIGIN);
const wildcardConfigured = configuredOrigins.includes('*');
const allowWildcard = !isProduction && (configuredOrigins.length === 0 || wildcardConfigured);

if (isProduction && (configuredOrigins.length === 0 || wildcardConfigured)) {
  throw new Error('CORS_ORIGIN must be explicitly configured in production and cannot use "*"');
}

const originValidator = allowWildcard
  ? true
  : (origin, cb) => {
      if (!origin) return cb(null, true); // allow native/mobile clients without Origin header
      if (configuredOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Origin not allowed by CORS'));
    };

// Initialize WebSocket
const io = initializeWebSocket(server, {
  origin: originValidator,
  methods: ['GET', 'POST'],
  credentials: !allowWildcard,
});

// Middleware
const { apiLimiter } = require('./middleware/rateLimit');
const errorHandler = require('./middleware/errorHandler');

// Ensure client IP is preserved behind Caddy/reverse-proxy
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for landing page if needed
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
// CORS Configuration
const corsOptions = {
  origin: originValidator,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: !allowWildcard
};
app.use(cors(corsOptions));
const jsonLimit = process.env.JSON_BODY_LIMIT || '256kb';
const urlencodedLimit = process.env.URLENCODED_BODY_LIMIT || '256kb';
app.use(express.json({ limit: jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: urlencodedLimit }));

// Global Rate Limiting for API routes
app.use('/api', apiLimiter);

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
app.use('/api/push', pushRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/app', appUpdateRoutes);

// Global Error Handler
app.use(errorHandler);

// Health check
app.get('/api/health', (req, res) => {
  let version = 'unknown';
  try {
    // In Dockerfile.production, server/package.json is copied to /app/package.json.
    // In dev, this resolves to server/package.json.
    // eslint-disable-next-line import/no-dynamic-require, global-require
    version = require('../package.json').version || version;
  } catch (_) {
    // ignore
  }
  res.json({ status: shuttingDown ? 'shutting_down' : 'ok', app: 'The Penthouse', version });
});

// Serve landing page and APK downloads
const path = require('path');
const publicPath = path.join(__dirname, '../public');
const downloadsPath = path.join(__dirname, '../data/downloads');

// Serve static assets (landing page CSS/JS/images)
app.use(express.static(publicPath));

// Serve APK downloads
app.use('/downloads', express.static(downloadsPath));

// Landing page for root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Initialize database and start server
const PORT = process.env.PORT || 3000;

async function start() {
  await initializeDatabase();

  // Keepalive alignment for reverse proxies and long-lived chat traffic
  server.keepAliveTimeout = toPositiveInt(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS, 65000);
  server.headersTimeout = toPositiveInt(process.env.HTTP_HEADERS_TIMEOUT_MS, 66000);
  server.requestTimeout = toPositiveInt(process.env.HTTP_REQUEST_TIMEOUT_MS, 30000);

  // Track sockets so we can force-close on shutdown.
  const sockets = new Set();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  const gracefulShutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}; draining connections...`);

    // Stop accepting new HTTP connections.
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });

    // Stop socket.io accepting new connections and close existing.
    try {
      io.close();
    } catch (_) {
      // ignore
    }

    // Force close remaining sockets after grace period.
    const forceAfterMs = toPositiveInt(process.env.SHUTDOWN_FORCE_AFTER_MS, 20000);
    setTimeout(() => {
      for (const socket of sockets) {
        try { socket.destroy(); } catch (_) {}
      }
      process.exit(0);
    }, forceAfterMs).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  server.listen(PORT, () => {
    console.log(`🏠 The Penthouse server running on port ${PORT}`);
    console.log(`📡 WebSocket ready for connections`);
  });
}

if (require.main === module) {
  start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = { app, server };
