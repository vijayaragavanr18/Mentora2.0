import cors from 'cors';
import express from 'express';
import path from 'path';
import server from '../utils/server/express-server';
import { registerRoutes } from './router';
import { loggerMiddleware } from './middleware';

process.loadEnvFile(path.resolve(process.cwd(), '.env'));

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
});

// Create server
const app = server();

console.log('[Init] Setting up PageLM server...');

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cors({
  origin: process.env.VITE_FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(loggerMiddleware);
app.use(app.serverStatic('/storage', './storage'));

// Health check
app.get('/ping', (_req: any, res: any) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    version: '1.0.0',
    server: 'PageLM Express Server'
  });
});

console.log('[Init] Registering routes...');
try {
  registerRoutes(app);
  console.log('[Init] Routes registered successfully');
} catch (error) {
  console.error('[Init] Error registering routes:', error);
  process.exit(1);
}

// Start server
const PORT = Number.parseInt(process.env.PORT || '5000');
console.log(`[Init] About to call app.listen(${PORT})...`);
const httpServer = app.listen(PORT, () => {
  console.log(`[PageLM] Server running on ${process.env.VITE_BACKEND_URL || `http://localhost:${PORT}`}`);
  console.log(`[PageLM] Repository: https://github.com/vijayaragavanr18/pagelm`);
  console.log(`[PageLM] Ready to accept connections!`);
});

console.log(`[Init] listen() returned:`, httpServer ? 'valid server object' : 'null/undefined');
console.log(`[Init] Server address:`, httpServer.address());

httpServer.on('error', (err) => {
  console.error('[Server] Fatal error:', err);
});

httpServer.on('listening', () => {
  console.log('[Server] listening event fired');
});

httpServer.on('close', () => {
  console.log('[Server] Server closed!');
});

// Ensure httpServer stays referenced
httpServer.ref();

// Keep-alive timer to prevent process exit
const keepAlive = setInterval(() => {
  if (httpServer.listening) {
    console.log(`[KeepAlive] Server running on port ${PORT}, connections: ${httpServer.connections}`);
  } else {
    console.log('[KeepAlive] Server is NOT listening!');
  }
}, 30000);

// Don't let the timer be garbage collected
keepAlive.ref();

console.log('[Init] Server initialization complete, process will stay alive');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('[Shutdown] Received SIGINT, closing server...');
  clearInterval(keepAlive);
  httpServer.close(() => {
    console.log('[Shutdown] Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('[Shutdown] Received SIGTERM, closing server...');
  clearInterval(keepAlive);
  httpServer.close(() => {
    console.log('[Shutdown] Server closed');
    process.exit(0);
  });
});