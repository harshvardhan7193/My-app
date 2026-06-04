import User from '../models/User.js';
import Session from '../models/Session.js';
import ActivityLog from '../models/ActivityLog.js';

// Parse User-Agent header into clean readable client strings
const parseUserAgent = (ua) => {
  if (!ua) return 'Unknown Device';
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';

  return `${browser} · ${os}`;
};

// Per-process throttle: avoid writing presence rows on every API call.
// On Vercel each warm container has its own Map, which is fine — the goal is
// to prevent thrashing when the same user hits the API many times per second.
const lastSeenByUser = new Map();
const PRESENCE_THROTTLE_MS = 30_000; // write at most every 30s

export const trackActivity = async (req, res, next) => {
  if (!req.user || !req.coupleId) return next();

  const now = Date.now();
  const userId = String(req.user._id);
  const lastTouched = lastSeenByUser.get(userId) || 0;
  const shouldUpdate = now - lastTouched > PRESENCE_THROTTLE_MS;

  if (shouldUpdate) {
    lastSeenByUser.set(userId, now);
    const coupleId = req.coupleId;
    const device = parseUserAgent(req.headers['user-agent']);
    const nowDate = new Date(now);

    // Run presence work AFTER the response is sent so it never adds latency.
    // We cannot rely on Vercel keeping the function alive, so we awaitable-fan-out
    // these writes and don't block the response. Worst case on Vercel: the writes
    // are best-effort. Better: deploy this app to a long-running host.
    res.on('finish', () => {
      Promise.allSettled([
        User.updateOne({ _id: userId }, { isOnline: true, lastSeen: nowDate }),
        (async () => {
          const thirtyMinsAgo = new Date(now - 30 * 60 * 1000);
          const activeSession = await Session.findOne({
            user: userId,
            endTime: { $gte: thirtyMinsAgo },
          })
            .sort({ endTime: -1 })
            .select('_id startTime')
            .lean();

          if (activeSession) {
            const durationMins = Math.max(
              1,
              Math.round((now - new Date(activeSession.startTime).getTime()) / 60000)
            );
            await Session.updateOne(
              { _id: activeSession._id },
              { endTime: nowDate, durationMins }
            );
          } else {
            await Session.create({
              user: userId,
              coupleId,
              device,
              startTime: nowDate,
              endTime: nowDate,
              durationMins: 1,
            });
            await ActivityLog.create({
              user: userId,
              coupleId,
              action: 'Opened the app',
              category: 'auth',
              device,
            });
          }
        })(),
      ]).catch((err) => console.error('trackActivity (post-response) error:', err));
    });
  }

  // Hook into response completion to log specific successful operations.
  res.on('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;

    let action = null;
    let category = 'other';
    const path = req.baseUrl + req.path;
    const method = req.method;

    if (method === 'POST' && path === '/api/memories') {
      action = 'Created a memory';
      category = 'memory';
    } else if (method === 'POST' && path === '/api/events') {
      action = 'Added a calendar event';
      category = 'event';
    } else if (method === 'POST' && path.match(/\/api\/albums\/[a-f\d]{24}\/photos/i)) {
      action = 'Uploaded a photo to Albums';
      category = 'album';
    } else if (method === 'POST' && path === '/api/albums') {
      action = 'Created an album';
      category = 'album';
    } else if (method === 'PUT' && path === '/api/users/me' && req.body?.mood) {
      action = 'Changed mood status';
      category = 'settings';
    }

    if (action) {
      const device = parseUserAgent(req.headers['user-agent']);
      ActivityLog.create({
        user: req.user._id,
        coupleId: req.coupleId,
        action,
        category,
        device,
      }).catch((err) => console.error('Auto Activity Log Error:', err));
    }
  });

  next();
};
