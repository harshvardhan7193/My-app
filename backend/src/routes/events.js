import { Router } from 'express';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../controllers/eventController.js';
import { protect, injectCoupleId } from '../middleware/auth.js';
import { trackActivity } from '../middleware/trackActivity.js';

const router = Router();

router.use(protect, injectCoupleId, trackActivity);

router.route('/').get(getEvents).post(createEvent);
router.route('/:id').put(updateEvent).delete(deleteEvent);

export default router;
