import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { getMessaging } from '../config/firebase.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Send push notification via FCM
// @route   POST /api/notifications/send
export const sendNotification = asyncHandler(async (req, res) => {
  const { title, body, target, category, imageUrl } = req.body;

  // Find target user(s) FCM tokens
  const filter = { coupleId: req.coupleId };
  if (target === 'male') filter.role = 'male';
  if (target === 'female') filter.role = 'female';

  const users = await User.find(filter).select('fcmToken name');
  const tokens = users.filter(u => u.fcmToken).map(u => u.fcmToken);

  let status = 'delivered';

  if (tokens.length > 0) {
    try {
      const message = {
        notification: { title, body, ...(imageUrl && { imageUrl }) },
        tokens,
      };
      await getMessaging().sendEachForMulticast(message);
    } catch (error) {
      console.error('FCM send error:', error);
      status = 'failed';
    }
  } else {
    // No tokens registered — mark as delivered anyway (for dev)
    console.warn('No FCM tokens found for target:', target);
  }

  // Save to history
  const notification = await Notification.create({
    title, body, target, category, imageUrl, status,
    sentAt: new Date(),
    coupleId: req.coupleId,
  });

  res.status(201).json(notification);
});

// @desc    Get notification history
// @route   GET /api/notifications/history
export const getHistory = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ coupleId: req.coupleId }).sort({ createdAt: -1 }).limit(50);
  res.json(notifications);
});
