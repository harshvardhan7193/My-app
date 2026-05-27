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

export const trackActivity = async (req, res, next) => {
  // Only track authenticated requests
  if (!req.user || !req.coupleId) return next();

  const now = new Date();
  const userId = req.user._id;
  const coupleId = req.coupleId;
  const device = parseUserAgent(req.headers['user-agent']);

  // Throttle database writes: only write if lastSeen is >15 seconds ago
  const shouldUpdate = !req.user.lastSeen || (now - new Date(req.user.lastSeen)) > 15_000;

  if (shouldUpdate) {
    // Perform presence/session operations asynchronously to not block client thread
    (async () => {
      try {
        // Update user state
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: now
        });

        // Check for active session in the last 30 minutes
        const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
        let activeSession = await Session.findOne({
          user: userId,
          endTime: { $gte: thirtyMinsAgo }
        }).sort({ endTime: -1 });

        if (activeSession) {
          // Update active session duration and end time
          activeSession.endTime = now;
          activeSession.durationMins = Math.max(
            1,
            Math.round((now.getTime() - activeSession.startTime.getTime()) / 60000)
          );
          await activeSession.save();
        } else {
          // Create new session
          await Session.create({
            user: userId,
            coupleId,
            device,
            startTime: now,
            endTime: now,
            durationMins: 1
          });

          // Log the automated "Opened the app" activity
          await ActivityLog.create({
            user: userId,
            coupleId,
            action: 'Opened the app',
            category: 'auth',
            device
          });
        }
      } catch (err) {
        console.error('Error tracking activity session:', err);
      }
    })();
  }

  // Hook into response completion to automatically track successful operations
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
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
      } else if (method === 'PUT' && path === '/api/users/me') {
        if (req.body.mood) {
          action = 'Changed mood status';
          category = 'settings';
        }
      }

      if (action) {
        ActivityLog.create({
          user: userId,
          coupleId,
          action,
          category,
          device
        }).catch(err => console.error('Auto Activity Log Error:', err));
      }
    }
  });

  next();
};
