import { Router } from 'express';
import { 
  getMe, 
  updateMe, 
  getPartner, 
  getAllUsers,
  getAdminIntelligence,
  updateUser, 
  deregisterFcmToken,
  logActivity,
  getActivityMonitorData,
  updateCoordinates
} from '../controllers/userController.js';
import { protect, injectCoupleId } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminAuth.js';
import { trackActivity } from '../middleware/trackActivity.js';

const router = Router();

router.use(protect, injectCoupleId, trackActivity);

// Self-service: any authenticated couple member
router.get('/me', getMe);
router.put('/me', updateMe);
router.delete('/me/fcm-token', deregisterFcmToken);
router.get('/partner', getPartner);
router.post('/activity', logActivity);
router.put('/coordinates', updateCoordinates);

// Admin-only: listing all users, editing any user, and viewing activity monitor
router.get('/activity-monitor', adminOnly, getActivityMonitorData);
router.get('/admin-intelligence', adminOnly, getAdminIntelligence);
router.get('/', adminOnly, getAllUsers);
router.put('/:id', adminOnly, updateUser);

export default router;
