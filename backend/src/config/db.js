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
    cached.promise = mongoose
      .connect(process.env.MONGO_URI, {
        // Keep connections lean for serverless; tweak if you upsize.
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 10_000,
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
