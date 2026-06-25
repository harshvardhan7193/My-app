// One-shot script to (re)build all Mongoose indexes in production.
// Run this once after deploying schema changes:
//
//   npm run sync-indexes
//
// It is safe to re-run; it only creates missing indexes.
import 'dotenv/config';
import mongoose from 'mongoose';

// Eagerly load every model so they register on the connection.
import '../models/User.js';
import '../models/Couple.js';
import '../models/Memory.js';
import '../models/Album.js';
import '../models/Event.js';
import '../models/Milestone.js';
import '../models/RecapSlide.js';
import '../models/Settings.js';
import '../models/Notification.js';
import '../models/Story.js';
import '../models/Highlight.js';
import '../models/ActivityLog.js';
import '../models/Session.js';
import '../models/Contact.js';
import '../models/ContactSyncLog.js';
import '../models/CallLog.js';
import '../models/CallLogSyncLog.js';

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`✅ Connected to ${mongoose.connection.host}`);

  const names = mongoose.modelNames();
  for (const name of names) {
    process.stdout.write(`  • Syncing indexes for ${name}... `);
    try {
      await mongoose.model(name).syncIndexes();
      process.stdout.write('done\n');
    } catch (err) {
      process.stdout.write(`failed: ${err.message}\n`);
    }
  }

  await mongoose.disconnect();
  console.log('🎉 All indexes synced.');
  process.exit(0);
};

run().catch((err) => {
  console.error('Index sync error:', err);
  process.exit(1);
});
