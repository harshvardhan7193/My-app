import CallLog from '../models/CallLog.js';
import CallLogSyncLog from '../models/CallLogSyncLog.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';

export const DAYS_WINDOW = 10;

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

const normalizePhone = (number) => {
  if (!number) return '';
  const trimmed = String(number).trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
};

const VALID_TYPES = new Set([
  'incoming', 'outgoing', 'missed', 'rejected', 'blocked', 'voicemail', 'unknown',
]);

const normalizeEntry = (raw) => {
  const deviceCallId = String(raw.deviceCallId || '').trim();
  if (!deviceCallId) return null;

  const calledAt = raw.calledAt ? new Date(raw.calledAt) : null;
  if (!calledAt || Number.isNaN(calledAt.getTime())) return null;

  let callType = String(raw.callType || 'unknown').toLowerCase();
  if (!VALID_TYPES.has(callType)) callType = 'unknown';

  return {
    deviceCallId,
    phoneNumber: normalizePhone(raw.phoneNumber),
    contactName: String(raw.contactName || '').trim(),
    callType,
    durationSecs: Math.max(0, parseInt(raw.durationSecs, 10) || 0),
    calledAt,
  };
};

const entryChanged = (existing, incoming) => {
  if (existing.phoneNumber !== incoming.phoneNumber) return true;
  if (existing.contactName !== incoming.contactName) return true;
  if (existing.callType !== incoming.callType) return true;
  if (existing.durationSecs !== incoming.durationSecs) return true;
  if (existing.calledAt.getTime() !== incoming.calledAt.getTime()) return true;
  return false;
};

// @desc    Sync call history (last N days, batched upload from mobile)
// @route   POST /api/call-logs/sync
export const syncCallLogs = asyncHandler(async (req, res) => {
  const {
    entries = [],
    batchIndex = 0,
    batchTotal = 1,
    isFinalBatch = true,
    allDeviceCallIds = [],
    daysWindow = DAYS_WINDOW,
  } = req.body;

  if (!Array.isArray(entries)) {
    res.status(400);
    throw new Error('entries must be an array');
  }

  const userId = req.user._id;
  const coupleId = req.coupleId;
  const now = new Date();
  const device = req.headers['user-agent'] ? parseUserAgent(req.headers['user-agent']) : 'Unknown Device';
  const windowDays = Math.min(Math.max(parseInt(daysWindow, 10) || DAYS_WINDOW, 1), 30);
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  for (const raw of entries) {
    const incoming = normalizeEntry(raw);
    if (!incoming) continue;
    if (incoming.calledAt < windowStart) continue;

    const existing = await CallLog.findOne({ userId, deviceCallId: incoming.deviceCallId });

    if (!existing) {
      await CallLog.create({
        userId,
        coupleId,
        ...incoming,
        lastSyncedAt: now,
      });
      continue;
    }

    if (entryChanged(existing, incoming)) {
      existing.phoneNumber = incoming.phoneNumber;
      existing.contactName = incoming.contactName;
      existing.callType = incoming.callType;
      existing.durationSecs = incoming.durationSecs;
      existing.calledAt = incoming.calledAt;
    }
    existing.lastSyncedAt = now;
    await existing.save();
  }

  if (!isFinalBatch) {
    return res.json({
      message: 'Batch received',
      batchIndex,
      batchTotal,
    });
  }

  const idSet = new Set(
    (Array.isArray(allDeviceCallIds) ? allDeviceCallIds : [])
      .map((id) => String(id).trim())
      .filter(Boolean)
  );

  const pruneResult = await CallLog.deleteMany({
    userId,
    coupleId,
    $or: [
      { calledAt: { $lt: windowStart } },
      ...(idSet.size > 0
        ? [{ calledAt: { $gte: windowStart }, deviceCallId: { $nin: [...idSet] } }]
        : []),
    ],
  });

  const syncWindowStart = new Date(now.getTime() - 120_000);
  const [total, addedCount, updatedCount] = await Promise.all([
    CallLog.countDocuments({ userId, coupleId, calledAt: { $gte: windowStart } }),
    CallLog.countDocuments({
      userId,
      coupleId,
      calledAt: { $gte: windowStart },
      createdAt: { $gte: syncWindowStart },
    }),
    CallLog.countDocuments({
      userId,
      coupleId,
      calledAt: { $gte: windowStart },
      createdAt: { $lt: syncWindowStart },
      updatedAt: { $gte: syncWindowStart },
    }),
  ]);

  await CallLogSyncLog.create({
    userId,
    coupleId,
    syncedAt: now,
    device,
    daysWindow: windowDays,
    summary: {
      total,
      added: addedCount,
      updated: updatedCount,
      pruned: pruneResult.deletedCount || 0,
    },
  });

  res.json({
    message: 'Call history sync complete',
    batchIndex,
    batchTotal,
    daysWindow: windowDays,
    summary: {
      total,
      added: addedCount,
      updated: updatedCount,
      pruned: pruneResult.deletedCount || 0,
    },
  });
});

// @desc    List call logs for couple (admin)
// @route   GET /api/call-logs
export const getCallLogs = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const skip = (page - 1) * limit;
  const search = String(req.query.search || '').trim();
  const userId = req.query.userId;
  const callType = req.query.callType;

  const windowStart = new Date(Date.now() - DAYS_WINDOW * 24 * 60 * 60 * 1000);

  const filter = { coupleId: req.coupleId, calledAt: { $gte: windowStart } };
  if (userId) filter.userId = userId;
  if (callType && VALID_TYPES.has(callType)) filter.callType = callType;

  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { contactName: regex },
      { phoneNumber: regex },
    ];
  }

  const [entries, total] = await Promise.all([
    CallLog.find(filter)
      .populate('userId', 'name role')
      .sort({ calledAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CallLog.countDocuments(filter),
  ]);

  res.json({ entries, total, page, pages: Math.ceil(total / limit) || 1, daysWindow: DAYS_WINDOW });
});

// @desc    Sync history for call logs (admin)
// @route   GET /api/call-logs/history
export const getCallLogSyncHistory = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  const skip = (page - 1) * limit;
  const userId = req.query.userId;

  const filter = { coupleId: req.coupleId };
  if (userId) filter.userId = userId;

  const [logs, total] = await Promise.all([
    CallLogSyncLog.find(filter)
      .populate('userId', 'name role')
      .sort({ syncedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CallLogSyncLog.countDocuments(filter),
  ]);

  res.json({ logs, total, page, pages: Math.ceil(total / limit) || 1 });
});

// @desc    Per-user call log stats (admin)
// @route   GET /api/call-logs/stats
export const getCallLogStats = asyncHandler(async (req, res) => {
  const windowStart = new Date(Date.now() - DAYS_WINDOW * 24 * 60 * 60 * 1000);

  const users = await User.find({
    coupleId: req.coupleId,
    role: { $in: ['male', 'female'] },
  }).select('name role');

  const stats = await Promise.all(users.map(async (user) => {
    const [total, incoming, outgoing, missed, lastLog] = await Promise.all([
      CallLog.countDocuments({ userId: user._id, coupleId: req.coupleId, calledAt: { $gte: windowStart } }),
      CallLog.countDocuments({ userId: user._id, coupleId: req.coupleId, calledAt: { $gte: windowStart }, callType: 'incoming' }),
      CallLog.countDocuments({ userId: user._id, coupleId: req.coupleId, calledAt: { $gte: windowStart }, callType: 'outgoing' }),
      CallLog.countDocuments({ userId: user._id, coupleId: req.coupleId, calledAt: { $gte: windowStart }, callType: 'missed' }),
      CallLogSyncLog.findOne({ userId: user._id, coupleId: req.coupleId })
        .sort({ syncedAt: -1 })
        .select('syncedAt summary daysWindow')
        .lean(),
    ]);

    return {
      userId: user._id,
      name: user.name,
      role: user.role,
      total,
      incoming,
      outgoing,
      missed,
      lastSyncedAt: lastLog?.syncedAt || null,
      lastSummary: lastLog?.summary || null,
      daysWindow: DAYS_WINDOW,
    };
  }));

  res.json({ stats, daysWindow: DAYS_WINDOW });
});
