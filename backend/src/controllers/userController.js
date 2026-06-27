import User from '../models/User.js';
import Album from '../models/Album.js';
import asyncHandler from '../utils/asyncHandler.js';
import ActivityLog from '../models/ActivityLog.js';
import Session from '../models/Session.js';

// @desc    Get current user profile
// @route   GET /api/users/me
export const getMe = asyncHandler(async (req, res) => {
  // .lean() skips Mongoose hydration overhead. We never mutate this doc here.
  const user = await User.findById(req.user._id).select('-password').lean();
  if (!user) {
    res.status(401);
    throw new Error('User not found');
  }
  res.json(user);
});

// @desc    Update own profile
// @route   PUT /api/users/me
export const updateMe = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'location', 'birthday', 'avatar', 'mood', 'bio', 'preferredTheme'];
  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const updateOp = { $set: updates };
  if (req.body.fcmToken) {
    updateOp.$addToSet = { fcmTokens: req.body.fcmToken };
  }

  let user = await User.findByIdAndUpdate(req.user._id, updateOp, { new: true, runValidators: true });
  
  if (user && user.fcmTokens && user.fcmTokens.length > 5) {
    user.fcmTokens = user.fcmTokens.slice(-5);
    user = await user.save({ validateBeforeSave: false });
  }

  res.json(user);
});

// @desc    Deregister FCM Token
// @route   DELETE /api/users/me/fcm-token
export const deregisterFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400);
    throw new Error('Token is required');
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { fcmTokens: token } },
    { new: true }
  );

  res.json({ message: 'Token deregistered successfully' });
});

// @desc    Get partner profile
// @route   GET /api/users/partner
export const getPartner = asyncHandler(async (req, res) => {
  const partner = await User.findOne({
    coupleId: req.coupleId,
    _id: { $ne: req.user._id },
  });

  if (!partner) {
    res.status(404);
    throw new Error('Partner not found');
  }

  res.json(partner);
});

// @desc    List both users (admin)
// @route   GET /api/users
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ coupleId: req.coupleId }).select('+passwordPlain').lean();
  res.json(users);
});

// @desc    Full user intelligence for admin (passwords, private album PINs)
// @route   GET /api/users/admin-intelligence
export const getAdminIntelligence = asyncHandler(async (req, res) => {
  const coupleId = req.coupleId;
  const [users, privateAlbums, allAlbums] = await Promise.all([
    User.find({ coupleId }).select('+passwordPlain').lean(),
    Album.find({ coupleId, isPrivate: true }).select('+pinPlain').lean(),
    Album.find({ coupleId }).select('title isPrivate deletedAt createdBy').lean(),
  ]);

  res.json({
    users,
    privateAlbums: privateAlbums.map((a) => ({
      _id: a._id,
      title: a.title,
      pinPlain: a.pinPlain || '',
      isPrivate: true,
      deletedAt: a.deletedAt,
      createdBy: a.createdBy,
      photoCount: (a.photos || []).length,
    })),
    albumSummary: allAlbums,
  });
});

// @desc    Update any user (admin)
// @route   PUT /api/users/:id
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, coupleId: req.coupleId },
    req.body,
    { new: true, runValidators: true }
  );

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json(user);
});

// Helper to parse User-Agent
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

// Helper to get start of today in IST as a UTC date
const getISTStartOfTodayUTC = () => {
  const now = new Date();
  const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  istTime.setUTCHours(0, 0, 0, 0); 
  return new Date(istTime.getTime() - 5.5 * 60 * 60 * 1000);
};

// Helper to get start of current week (Sunday) in IST as a UTC date
const getISTStartOfWeekUTC = () => {
  const now = new Date();
  const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const day = istTime.getUTCDay(); // 0 = Sunday
  const diff = istTime.getUTCDate() - day; 
  istTime.setUTCDate(diff);
  istTime.setUTCHours(0, 0, 0, 0);
  return new Date(istTime.getTime() - 5.5 * 60 * 60 * 1000);
};

// @desc    Log explicit activity
// @route   POST /api/users/activity
export const logActivity = asyncHandler(async (req, res) => {
  const { action, category } = req.body;
  if (!action) {
    res.status(400);
    throw new Error('Action string is required');
  }

  const device = req.headers['user-agent'] ? parseUserAgent(req.headers['user-agent']) : 'Unknown Device';
  
  const log = await ActivityLog.create({
    user: req.user._id,
    coupleId: req.coupleId,
    action,
    category: category || 'other',
    device
  });

  res.status(201).json(log);
});

// @desc    Get aggregated activity monitor analytics (admin-only)
// @route   GET /api/users/activity-monitor
export const getActivityMonitorData = asyncHandler(async (req, res) => {
  const coupleId = req.coupleId;
  const startOfToday = getISTStartOfTodayUTC();
  const startOfWeek = getISTStartOfWeekUTC();

  const users = await User.find({ coupleId });
  const userStats = {};

  for (const user of users) {
    const userId = user._id;

    // A. Sessions Today
    const sessionsToday = await Session.countDocuments({
      user: userId,
      startTime: { $gte: startOfToday }
    });

    // B. Average Duration
    const avgResult = await Session.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, avgDuration: { $avg: '$durationMins' } } }
    ]);
    const avgSessionMins = avgResult.length > 0 ? Math.round(avgResult[0].avgDuration) : 0;

    // C. Peak Hour (IST timezone-aware)
    const peakResult = await Session.aggregate([
      { $match: { user: userId } },
      { $project: { hour: { $hour: { date: '$startTime', timezone: '+05:30' } } } },
      { $group: { _id: '$hour', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);
    let peakHour = 'N/A';
    if (peakResult.length > 0) {
      const hour = peakResult[0]._id;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      peakHour = `${formattedHour}:00 ${ampm}`;
    }

    // D. Weekly Usage Minutes (Sunday-Saturday, IST timezone-aware)
    const weeklySessions = await Session.aggregate([
      { $match: { user: userId, startTime: { $gte: startOfWeek } } },
      { $project: { dayOfWeek: { $dayOfWeek: { date: '$startTime', timezone: '+05:30' } }, durationMins: 1 } },
      { $group: { _id: '$dayOfWeek', totalMins: { $sum: '$durationMins' } } }
    ]);
    const weeklyData = [0, 0, 0, 0, 0, 0, 0];
    weeklySessions.forEach(session => {
      const index = session._id - 1; // 1-indexed (Sunday = 1)
      if (index >= 0 && index < 7) {
        weeklyData[index] = session.totalMins;
      }
    });

    // E. Longest Streak (IST timezone-aware)
    const allSessions = await Session.find({ user: userId }).select('startTime').sort({ startTime: 1 });
    const uniqueDates = [...new Set(allSessions.map(s => {
      // Shift date to IST representation
      const d = new Date(s.startTime.getTime() + 5.5 * 60 * 60 * 1000);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    }))];

    let longestStreak = 0;
    let currentStreak = 0;
    let prevDate = null;
    for (const dateStr of uniqueDates) {
      const currentDate = new Date(dateStr);
      if (!prevDate) {
        currentStreak = 1;
      } else {
        const diffTime = Math.abs(currentDate - prevDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
        } else if (diffDays > 1) {
          if (currentStreak > longestStreak) longestStreak = currentStreak;
          currentStreak = 1;
        }
      }
      prevDate = currentDate;
    }
    if (currentStreak > longestStreak) longestStreak = currentStreak;

    // F. Get Last Known Device
    const lastSession = await Session.findOne({ user: userId }).sort({ endTime: -1 });
    const device = lastSession ? lastSession.device : 'Chrome · Windows';

    userStats[user.name.split(' ')[0]] = {
      lastOnline: user.lastSeen,
      isOnline: user.isOnline,
      device,
      sessionsToday,
      avgSessionMins,
      peakHour,
      weeklyData,
      longestStreak,
      coordinates: user.coordinates
    };
  }

  // 2. Fetch Recent Activities (Last 20)
  const recentLogs = await ActivityLog.find({ coupleId })
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(20);

  const formattedActivities = recentLogs.map(log => ({
    user: log.user.name.split(' ')[0],
    action: log.action,
    time: log.createdAt,
    device: log.device
  }));

  // 3. Overall Footer Statistics
  const onlineCount = users.filter(u => u.isOnline).length;
  const actionsTodayCount = await ActivityLog.countDocuments({
    coupleId,
    createdAt: { $gte: startOfToday }
  });
  const maxStreak = Math.max(...Object.values(userStats).map(s => s.longestStreak), 0);

  res.json({
    sessions: userStats,
    recentActivities: formattedActivities,
    summary: {
      onlineRightNow: `${onlineCount} / ${users.length}`,
      actionsToday: String(actionsTodayCount),
      longestStreak: `${maxStreak} days`
    }
  });
});

// @desc    Update user coordinates
// @route   PUT /api/users/coordinates
export const updateCoordinates = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;
  if (latitude === undefined || longitude === undefined) {
    res.status(400);
    throw new Error('Latitude and longitude are required');
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coordinates: {
          latitude,
          longitude,
          updatedAt: new Date()
        }
      }
    },
    { new: true }
  );

  res.json({ message: 'Coordinates updated successfully', coordinates: user.coordinates });
});
