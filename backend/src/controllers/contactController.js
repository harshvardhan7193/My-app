import Contact from '../models/Contact.js';
import ContactSyncLog from '../models/ContactSyncLog.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';

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

const normalizeContact = (raw) => {
  const deviceContactId = String(raw.deviceContactId || '').trim();
  if (!deviceContactId) return null;

  const phones = (raw.phones || [])
    .map((p) => ({
      label: String(p.label || '').trim(),
      number: normalizePhone(p.number),
    }))
    .filter((p) => p.number);

  const emails = (raw.emails || [])
    .map((e) => ({
      label: String(e.label || '').trim(),
      address: String(e.address || '').trim().toLowerCase(),
    }))
    .filter((e) => e.address);

  return {
    deviceContactId,
    displayName: String(raw.displayName || '').trim(),
    phones,
    emails,
  };
};

const contactChanged = (existing, incoming) => {
  if (existing.displayName !== incoming.displayName) return true;
  if (existing.isActive === false) return true;
  if (JSON.stringify(existing.phones) !== JSON.stringify(incoming.phones)) return true;
  if (JSON.stringify(existing.emails) !== JSON.stringify(incoming.emails)) return true;
  return false;
};

// @desc    Sync phone contacts (batched upload from mobile)
// @route   POST /api/contacts/sync
export const syncContacts = asyncHandler(async (req, res) => {
  const {
    contacts = [],
    batchIndex = 0,
    batchTotal = 1,
    isFinalBatch = true,
    allDeviceContactIds = [],
  } = req.body;

  if (!Array.isArray(contacts)) {
    res.status(400);
    throw new Error('contacts must be an array');
  }

  const userId = req.user._id;
  const coupleId = req.coupleId;
  const now = new Date();
  const device = req.headers['user-agent'] ? parseUserAgent(req.headers['user-agent']) : 'Unknown Device';

  let added = 0;
  let updated = 0;
  const changes = [];

  for (const raw of contacts) {
    const incoming = normalizeContact(raw);
    if (!incoming) continue;

    const existing = await Contact.findOne({ userId, deviceContactId: incoming.deviceContactId });

    if (!existing) {
      await Contact.create({
        userId,
        coupleId,
        ...incoming,
        lastSyncedAt: now,
        isActive: true,
      });
      added += 1;
      if (changes.length < 50) {
        changes.push({ action: 'added', deviceContactId: incoming.deviceContactId, displayName: incoming.displayName });
      }
      continue;
    }

    if (contactChanged(existing, incoming)) {
      existing.displayName = incoming.displayName;
      existing.phones = incoming.phones;
      existing.emails = incoming.emails;
      existing.lastSyncedAt = now;
      existing.isActive = true;
      await existing.save();
      updated += 1;
      if (changes.length < 50) {
        changes.push({ action: 'updated', deviceContactId: incoming.deviceContactId, displayName: incoming.displayName });
      }
    } else {
      existing.lastSyncedAt = now;
      existing.isActive = true;
      await existing.save();
    }
  }

  let removed = 0;

  if (isFinalBatch) {
    const idSet = new Set(
      (Array.isArray(allDeviceContactIds) ? allDeviceContactIds : [])
        .map((id) => String(id).trim())
        .filter(Boolean)
    );

    if (idSet.size > 0) {
      const stale = await Contact.find({
        userId,
        coupleId,
        isActive: true,
        deviceContactId: { $nin: [...idSet] },
      });

      for (const doc of stale) {
        doc.isActive = false;
        doc.lastSyncedAt = now;
        await doc.save();
        removed += 1;
        if (changes.length < 50) {
          changes.push({ action: 'removed', deviceContactId: doc.deviceContactId, displayName: doc.displayName });
        }
      }
    }

    const syncWindowStart = new Date(now.getTime() - 120_000);
    const [total, addedCount, updatedCount] = await Promise.all([
      Contact.countDocuments({ userId, coupleId, isActive: true }),
      Contact.countDocuments({
        userId,
        coupleId,
        isActive: true,
        createdAt: { $gte: syncWindowStart },
      }),
      Contact.countDocuments({
        userId,
        coupleId,
        isActive: true,
        createdAt: { $lt: syncWindowStart },
        updatedAt: { $gte: syncWindowStart },
      }),
    ]);

    await ContactSyncLog.create({
      userId,
      coupleId,
      syncedAt: now,
      device,
      summary: {
        total,
        added: addedCount,
        updated: updatedCount,
        removed,
      },
      changes,
    });

    await User.findByIdAndUpdate(userId, {
      $set: {
        'deviceSync.contactsPending': false,
        'deviceSync.contactsLastSyncAt': now,
        'deviceSync.contactsLastError': '',
      },
    });

    return res.json({
      message: 'Sync complete',
      batchIndex,
      batchTotal,
      summary: { total, added: addedCount, updated: updatedCount, removed },
    });
  }

  res.json({
    message: 'Batch received',
    batchIndex,
    batchTotal,
    summary: { added, updated, removed: 0 },
  });
});

// @desc    List contacts for couple (admin)
// @route   GET /api/contacts
export const getContacts = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const skip = (page - 1) * limit;
  const search = String(req.query.search || '').trim();
  const userId = req.query.userId;

  const filter = { coupleId: req.coupleId, isActive: true };
  if (userId) filter.userId = userId;

  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { displayName: regex },
      { 'phones.number': regex },
      { 'emails.address': regex },
    ];
  }

  const [contacts, total] = await Promise.all([
    Contact.find(filter)
      .populate('userId', 'name role')
      .sort({ displayName: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Contact.countDocuments(filter),
  ]);

  res.json({ contacts, total, page, pages: Math.ceil(total / limit) || 1 });
});

// @desc    Sync history for couple (admin)
// @route   GET /api/contacts/history
export const getContactHistory = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  const skip = (page - 1) * limit;
  const userId = req.query.userId;

  const filter = { coupleId: req.coupleId };
  if (userId) filter.userId = userId;

  const [logs, total] = await Promise.all([
    ContactSyncLog.find(filter)
      .populate('userId', 'name role')
      .sort({ syncedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ContactSyncLog.countDocuments(filter),
  ]);

  res.json({ logs, total, page, pages: Math.ceil(total / limit) || 1 });
});

// @desc    Per-user contact stats (admin)
// @route   GET /api/contacts/stats
export const getContactStats = asyncHandler(async (req, res) => {
  const users = await User.find({
    coupleId: req.coupleId,
    role: { $in: ['male', 'female'] },
  }).select('name role');

  const stats = await Promise.all(users.map(async (user) => {
    const [total, lastLog] = await Promise.all([
      Contact.countDocuments({ userId: user._id, coupleId: req.coupleId, isActive: true }),
      ContactSyncLog.findOne({ userId: user._id, coupleId: req.coupleId })
        .sort({ syncedAt: -1 })
        .select('syncedAt summary')
        .lean(),
    ]);

    return {
      userId: user._id,
      name: user.name,
      role: user.role,
      total,
      lastSyncedAt: lastLog?.syncedAt || null,
      lastSummary: lastLog?.summary || null,
    };
  }));

  res.json({ stats });
});
