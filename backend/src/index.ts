import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import audioRoutes from './routes/audio.js';
import { cleanupOldFiles } from './services/ytdlp.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
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
  GET  /api/health         - Health check
  POST /api/download       - Initiate audio download
  GET  /api/status/:jobId  - Check download status
  GET  /api/stream/:jobId  - Stream audio file
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
