import { Router } from 'express';
import { getMe, updateMe, getPartner, getAllUsers, updateUser } from '../controllers/userController.js';
import { protect, injectCoupleId } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminAuth.js';

const router = Router();

router.use(protect, injectCoupleId);

// Self-service: any authenticated couple member
router.get('/me', getMe);
router.put('/me', updateMe);
router.get('/partner', getPartner);

// Admin-only: listing all users and editing any user
router.get('/', adminOnly, getAllUsers);
router.put('/:id', adminOnly, updateUser);

export default router;
