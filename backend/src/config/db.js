import mongoose from 'mongoose';

// Cache the connection across hot reloads (dev) and serverless invocations (Vercel).
// On Vercel, every cold-started lambda reuses this if the container is warm.
const cached = global.__mongooseConn || (global.__mongooseConn = { conn: null, promise: null });

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set');
  }

  if (!cached.promise) {
    const isProd = process.env.NODE_ENV === 'production';
    cached.promise = mongoose
      .connect(process.env.MONGO_URI, {
        // Serverless-friendly defaults.
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 10_000,
        // Fail fast instead of silently queuing while disconnected.
        bufferCommands: false,
        // CRITICAL: never auto-build indexes in production. They get built once
        // by a one-shot script (npm run sync-indexes) and re-running on every
        // cold start is the #1 source of latency on serverless platforms.
        autoIndex: !isProd,
      })
      .then((conn) => {
        console.log(`✅ MongoDB connected: ${conn.connection.host}`);
        return conn;
      })
      .catch((err) => {
        cached.promise = null; // allow retry on next invocation
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

export default connectDB;
