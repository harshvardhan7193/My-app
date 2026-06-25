import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';

import connectDB from './src/config/db.js';
import { initFirebase } from './src/config/firebase.js';
import { startScheduler, stopScheduler } from './src/services/scheduler.js';
import { errorHandler, notFound } from './src/middleware/errorHandler.js';

// Route imports
import authRoutes from './src/routes/auth.js';
import userRoutes from './src/routes/users.js';
import memoryRoutes from './src/routes/memories.js';
import albumRoutes from './src/routes/albums.js';
import eventRoutes from './src/routes/events.js';
import milestoneRoutes from './src/routes/milestones.js';
import recapSlideRoutes from './src/routes/recapSlides.js';
import settingsRoutes from './src/routes/settings.js';
import notificationRoutes from './src/routes/notifications.js';
import uploadRoutes from './src/routes/upload.js';
import dashboardRoutes from './src/routes/dashboard.js';
import chatRoutes from './src/routes/chat.js';
import storyRoutes from './src/routes/stories.js';
import highlightRoutes from './src/routes/highlights.js';
import contactRoutes from './src/routes/contacts.js';
import callLogRoutes from './src/routes/callLogs.js';
import deviceSyncRoutes from './src/routes/deviceSync.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security ─────────────────────────────────────
app.use(helmet());

// Build allowed origins from CLIENT_URL plus optional CLIENT_URLS (comma-separated).
// Useful for Netlify previews / multiple deployment URLs.
const buildAllowedOrigins = () => {
  const origins = new Set();
  const primary = process.env.CLIENT_URL || 'http://localhost:5173';
  origins.add(primary);
  origins.add(primary.replace('localhost', '127.0.0.1'));
  (process.env.CLIENT_URLS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((o) => origins.add(o));
  return origins;
};
const allowedOrigins = buildAllowedOrigins();

app.use(cors({
  origin: (origin, cb) => {
    // Allow non-browser tools (no Origin header) and configured frontend origins.
    if (!origin || allowedOrigins.has(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

// Vercel terminates TLS in front of the function; trust proxy so secure cookies
// and req.protocol/req.ip work correctly behind it.
app.set('trust proxy', 1);

// ─── Body Parsing ─────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Logging ──────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Health Check ─────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/recap-slides', recapSlideRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/highlights', highlightRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/call-logs', callLogRoutes);
app.use('/api/device-sync', deviceSyncRoutes);

// ─── Error Handling ───────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start / Export ────────────────────────────────────────

// On Vercel, the serverless entrypoint at api/index.js bootstraps the app and
// imports `app` from this file. We must NOT call app.listen() in that case.
// Locally, we boot the DB, scheduler, and the HTTP listener.
if (!process.env.VERCEL) {
  const start = async () => {
    await connectDB();
    initFirebase();
    startScheduler();

    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/api/health\n`);
    });

    const shutdown = async (signal) => {
      console.log(`\n${signal} received — shutting down gracefully...`);
      server.close(async (err) => {
        if (err) console.error('HTTP server close error:', err);
        try {
          await mongoose.disconnect();
          console.log('✅ Mongo disconnected');
        } catch (e) {
          console.error('Mongo disconnect error:', e);
        }
        stopScheduler();
        process.exit(err ? 1 : 0);
      });

      setTimeout(() => {
        console.error('Shutdown timeout — forcing exit');
        process.exit(1);
      }, 10_000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  };

  start();
}

export default app;
