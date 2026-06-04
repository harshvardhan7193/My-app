// Vercel serverless entrypoint. All HTTP traffic to this deployment is rewritten
// to this function via vercel.json, which then defers to the Express app.
import app from '../server.js';
import connectDB from '../src/config/db.js';
import { initFirebase } from '../src/config/firebase.js';

let bootstrap;

const ensureBootstrapped = () => {
  if (!bootstrap) {
    bootstrap = (async () => {
      await connectDB();
      try {
        initFirebase();
      } catch (err) {
        console.error('Firebase init failed:', err?.message || err);
      }
    })();
  }
  return bootstrap;
};

export default async function handler(req, res) {
  try {
    await ensureBootstrapped();
  } catch (err) {
    console.error('Bootstrap failed:', err?.message || err);
    res.status(500).json({ message: 'Service initialization failed' });
    return;
  }
  return app(req, res);
}
