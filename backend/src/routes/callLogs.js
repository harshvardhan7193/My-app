import { Router } from 'express';
import {
  syncCallLogs,
  getCallLogs,
  getCallLogSyncHistory,
  getCallLogStats,
} from '../controllers/callLogController.js';
import { protect, injectCoupleId } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminAuth.js';

const router = Router();

router.use(protect, injectCoupleId);

router.post('/sync', syncCallLogs);

router.use(adminOnly);
router.get('/stats', getCallLogStats);
router.get('/history', getCallLogSyncHistory);
router.get('/', getCallLogs);

export default router;
