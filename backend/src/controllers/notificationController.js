import Notification from '../models/Notification.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendPushToUser } from '../services/notificationService.js';

// @desc    Send push notification via FCM (Admin)
// @route   POST /api/notifications/send
export const sendNotification = asyncHandler(async (req, res) => {
  const { title, body, target, category, imageUrl, scheduledFor } = req.body;

  let status = 'pending';
  
  if (scheduledFor) {
    // Phase 6: Scheduler handles this
    const notification = await Notification.create({
      title, body, target, category, imageUrl, status,
      scheduledFor: new Date(scheduledFor),
      coupleId: req.coupleId,
    });
    return res.status(201).json(notification);
  }

  // Not scheduled, send immediately
  const filter = { coupleId: req.coupleId };
  if (target === 'male') filter.role = 'male';
  if (target === 'female') filter.role = 'female';

  const users = await User.find(filter);
  let totalSuccess = 0;
  
  for (const user of users) {
    const result = await sendPushToUser(user._id, { title, body, imageUrl }, category, false, req.coupleId);
    if (result) totalSuccess += result.success;
  }
  
  status = totalSuccess > 0 ? 'delivered' : 'failed';

  // Save to history (admin sends create one generic record without userId)
  const notification = await Notification.create({
    title, body, target, category, imageUrl, status,
    sentAt: new Date(),
    coupleId: req.coupleId,
  });

  res.status(201).json(notification);
});

// @desc    Get admin notification history
// @route   GET /api/notifications/history
export const getHistory = asyncHandler(async (req, res) => {
  // Only generic (admin) notifications lack a userId. User specific ones have userId.
  const notifications = await Notification.find({ coupleId: req.coupleId, userId: { $exists: false } }).sort({ createdAt: -1 }).limit(50);
  res.json(notifications);
});

// @desc    Send chat notification (from frontend)
// @route   POST /api/notifications/chat-push
export const sendChatNotification = asyncHandler(async (req, res) => {
  const { recipientId, messagePreview } = req.body;
  if (!recipientId || !messagePreview) {
    return res.status(400).json({ message: 'Missing recipientId or messagePreview' });
  }

  // Very basic in-memory rate limiting (debounce)
  // In production with multiple instances, use Redis.
  const cacheKey = `chat_push_${recipientId}`;
  const now = Date.now();
  if (global[cacheKey] && now - global[cacheKey] < 30000) {
    return res.status(200).json({ message: 'Rate limited (30s debounce)' });
  }
  global[cacheKey] = now;

  const senderName = req.user.name;
  await sendPushToUser(recipientId, {
    title: `New message from ${senderName}`,
    body: messagePreview,
    data: { url: '/chat' }
  }, 'chat');

  res.status(200).json({ message: 'Chat notification triggered' });
});

// --- User Facing APIs (Phase 8) ---

// @desc    Send a nudge to partner
// @route   POST /api/notifications/nudge
export const sendNudge = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const partnerRole = req.user.role === 'male' ? 'female' : 'male';
  const partner = await User.findOne({ coupleId: req.coupleId, role: partnerRole });

  if (!partner) {
    return res.status(404).json({ message: 'Partner not found' });
  }

  const cacheKey = `nudge_${partner._id}`;
  const now = Date.now();
  if (global[cacheKey] && now - global[cacheKey] < 30000) {
    return res.status(200).json({ message: 'Rate limited (30s debounce)' });
  }
  global[cacheKey] = now;

  const senderName = req.user.name.split(' ')[0];
  await sendPushToUser(partner._id, {
    title: 'Thinking of you! ❤️',
    body: message || `${senderName} sent you a nudge.`,
    data: { url: '/profile' }
  }, 'nudge');

  res.status(200).json({ message: 'Nudge sent successfully' });
});

// @desc    Get user notification history
// @route   GET /api/notifications/mine
export const getMyNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({ 
    coupleId: req.coupleId, 
    userId: req.user._id 
  }).sort({ sentAt: -1, createdAt: -1 }).skip(skip).limit(limit);

  const total = await Notification.countDocuments({ coupleId: req.coupleId, userId: req.user._id });
  
  res.json({ notifications, total, page, pages: Math.ceil(total / limit) });
});

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
export const getUnreadNotificationCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ 
    coupleId: req.coupleId, 
    userId: req.user._id,
    readAt: null
  });
  
  res.json({ count });
});

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { readAt: new Date() },
    { new: true }
  );
  
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }
  
  res.json(notification);
});
