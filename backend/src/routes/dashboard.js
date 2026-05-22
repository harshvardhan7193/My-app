import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { protect, injectCoupleId } from '../middleware/auth.js';

const router = Router();

router.use(protect, injectCoupleId);

router.get('/', getDashboard);

export default router;
