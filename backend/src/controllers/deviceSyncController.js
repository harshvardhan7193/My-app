import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendDataCommandToUser } from '../services/notificationService.js';

const partnerRoles = ['male', 'female'];

const resolveTargets = async (coupleId, target) => {
  const filter = { coupleId, role: { $in: partnerRoles } };
  if (target === 'male' || target === 'female') filter.role = target;
  return User.find(filter);
};

// @desc    Admin requests device sync for partner(s)
// @route   POST /api/device-sync/request
export const requestDeviceSync = asyncHandler(async (req, res) => {
  const { target = 'both', types = ['contacts', 'call_logs'] } = req.body;

  if (!Array.isArray(types) || types.length === 0) {
    res.status(400);
    throw new Error('types must include contacts and/or call_logs');
  }

  const wantContacts = types.includes('contacts');
  const wantCallLogs = types.includes('call_logs');
  if (!wantContacts && !wantCallLogs) {
    res.status(400);
    throw new Error('types must include contacts and/or call_logs');
  }

  const users = await resolveTargets(req.coupleId, target);
  if (!users.length) {
    res.status(404);
    throw new Error('No partner users found for this couple');
  }

  const now = new Date();
  const results = [];

  for (const user of users) {
    const updates = {};
    if (wantContacts) {
      updates['deviceSync.contactsPending'] = true;
      updates['deviceSync.contactsRequestedAt'] = now;
      updates['deviceSync.contactsLastError'] = '';
    }
    if (wantCallLogs) {
      updates['deviceSync.callLogsPending'] = true;
      updates['deviceSync.callLogsRequestedAt'] = now;
      updates['deviceSync.callLogsLastError'] = '';
    }

    await User.findByIdAndUpdate(user._id, { $set: updates });

    await sendDataCommandToUser(user._id, {
      action: 'device_sync',
      contacts: wantContacts ? '1' : '0',
      callLogs: wantCallLogs ? '1' : '0',
    });

    results.push({
      userId: user._id,
      name: user.name,
      role: user.role,
      contacts: wantContacts,
      callLogs: wantCallLogs,
    });
  }

  res.json({
    message: 'Sync queued — devices will sync automatically when the mobile app is open.',
    users: results,
  });
});

// @desc    Per-user device sync status (admin)
// @route   GET /api/device-sync/status
export const getDeviceSyncStatus = asyncHandler(async (req, res) => {
  const users = await User.find({ coupleId: req.coupleId, role: { $in: partnerRoles } })
    .select('name role deviceSync');

  const stats = users.map((u) => ({
    userId: u._id,
    name: u.name,
    role: u.role,
    contactsPending: !!u.deviceSync?.contactsPending,
    callLogsPending: !!u.deviceSync?.callLogsPending,
    contactsRequestedAt: u.deviceSync?.contactsRequestedAt || null,
    callLogsRequestedAt: u.deviceSync?.callLogsRequestedAt || null,
    contactsLastSyncAt: u.deviceSync?.contactsLastSyncAt || null,
    callLogsLastSyncAt: u.deviceSync?.callLogsLastSyncAt || null,
    contactsLastError: u.deviceSync?.contactsLastError || '',
    callLogsLastError: u.deviceSync?.callLogsLastError || '',
  }));

  res.json({ stats });
});

// @desc    Pending sync jobs for the logged-in device user
// @route   GET /api/device-sync/pending
export const getPendingSync = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('deviceSync');
  const ds = user?.deviceSync || {};

  res.json({
    contacts: !!ds.contactsPending,
    callLogs: !!ds.callLogsPending,
  });
});

// @desc    Mark a pending sync as failed (device could not complete)
// @route   POST /api/device-sync/failed
export const markSyncFailed = asyncHandler(async (req, res) => {
  const { type, error } = req.body;
  if (!['contacts', 'call_logs'].includes(type)) {
    res.status(400);
    throw new Error('type must be contacts or call_logs');
  }

  const msg = String(error || 'Sync failed').slice(0, 500);
  const updates = type === 'contacts'
    ? { 'deviceSync.contactsLastError': msg }
    : { 'deviceSync.callLogsLastError': msg };

  await User.findByIdAndUpdate(req.user._id, { $set: updates });
  res.json({ message: 'Failure recorded' });
});
