import { Router } from 'express';
import {
  requestDeviceSync,
  getDeviceSyncStatus,
  getPendingSync,
  markSyncFailed,
} from '../controllers/deviceSyncController.js';
import { protect, injectCoupleId } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminAuth.js';

const router = Router();

router.use(protect, injectCoupleId);

router.get('/pending', getPendingSync);
router.post('/failed', markSyncFailed);

router.use(adminOnly);
router.post('/request', requestDeviceSync);
router.get('/status', getDeviceSyncStatus);

export default router;
