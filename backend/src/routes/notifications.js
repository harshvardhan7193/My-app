import { Router } from 'express';
import { sendNotification, getHistory, sendChatNotification, sendNudge, getMyNotifications, getUnreadNotificationCount, markNotificationRead } from '../controllers/notificationController.js';
import { protect, injectCoupleId } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminAuth.js';

const router = Router();

router.use(protect, injectCoupleId);

// User-facing routes
router.post('/chat-push', sendChatNotification);
router.post('/nudge', sendNudge);
router.get('/mine', getMyNotifications);
router.get('/unread-count', getUnreadNotificationCount);
router.patch('/:id/read', markNotificationRead);

// Admin-only routes
router.use(adminOnly);
router.post('/send', sendNotification);
router.get('/history', getHistory);

export default router;
