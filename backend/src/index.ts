import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import audioRoutes from './routes/audio.js';
import aiRoutes from './routes/ai.js';
import youtubeRoutes from './routes/youtube.js';
import { cleanupOldFiles } from './services/ytdlp.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware - CORS configuration
// Allow multiple origins: localhost for dev + Vercel for production
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://flowstate-music.vercel.app', // Vercel production
  FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || FRONTEND_URL === '*') {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now - restrict later
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development'
  });
});

app.use('/api', audioRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/youtube', youtubeRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Cleanup old files every 5 minutes
setInterval(() => {
  console.log('[cleanup] Running scheduled cleanup...');
  cleanupOldFiles();
}, 5 * 60 * 1000);

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   FlowState Backend Server Running     ║
╠════════════════════════════════════════╣
║  Port:        ${PORT.toString().padEnd(27)}║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(27)}║
║  Frontend:    ${FRONTEND_URL.substring(0, 27).padEnd(27)}║
╚════════════════════════════════════════╝

Endpoints:
  GET  /api/health           - Health check
  POST /api/download         - Initiate audio download
  GET  /api/status/:jobId    - Check download status
  GET  /api/stream/:jobId    - Stream audio file
  POST /api/ai/suggest       - Generate AI song suggestions
  POST /api/ai/filter        - Filter playlists/compilations
  POST /api/youtube/search   - Search YouTube videos
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[shutdown] SIGTERM received, cleaning up...');
  cleanupOldFiles();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[shutdown] SIGINT received, cleaning up...');
  cleanupOldFiles();
  process.exit(0);
});
