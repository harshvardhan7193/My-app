import { Router } from 'express';
import { getMessages, deleteMessage } from '../controllers/chatController.js';
import { protect, injectCoupleId } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminAuth.js';

const router = Router();

// Chat moderation endpoints are admin-only — couple members read/write via Firebase RTDB directly
router.use(protect, injectCoupleId, adminOnly);

router.get('/messages', getMessages);
router.delete('/messages/:id', deleteMessage);

export default router;
