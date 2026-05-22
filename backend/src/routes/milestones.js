import { Router } from 'express';
import { getMilestones, createMilestone, updateMilestone, deleteMilestone, reorderMilestones } from '../controllers/milestoneController.js';
import { protect, injectCoupleId } from '../middleware/auth.js';

const router = Router();

router.use(protect, injectCoupleId);

router.route('/').get(getMilestones).post(createMilestone);
router.put('/reorder', reorderMilestones);
router.route('/:id').put(updateMilestone).delete(deleteMilestone);

export default router;
