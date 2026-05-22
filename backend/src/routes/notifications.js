import { Router } from 'express';
import { sendNotification, getHistory } from '../controllers/notificationController.js';
import { protect, injectCoupleId } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminAuth.js';

const router = Router();

router.use(protect, injectCoupleId, adminOnly);

router.post('/send', sendNotification);
router.get('/history', getHistory);

export default router;
