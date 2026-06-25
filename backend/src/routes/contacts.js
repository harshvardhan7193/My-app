import { Router } from 'express';
import {
  syncContacts,
  getContacts,
  getContactHistory,
  getContactStats,
} from '../controllers/contactController.js';
import { protect, injectCoupleId } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminAuth.js';

const router = Router();

router.use(protect, injectCoupleId);

// Couple members sync their phone contacts
router.post('/sync', syncContacts);

// Admin-only read endpoints
router.use(adminOnly);
router.get('/stats', getContactStats);
router.get('/history', getContactHistory);
router.get('/', getContacts);

export default router;
