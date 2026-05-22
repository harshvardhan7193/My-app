import { Router } from 'express';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../controllers/eventController.js';
import { protect, injectCoupleId } from '../middleware/auth.js';

const router = Router();

router.use(protect, injectCoupleId);

router.route('/').get(getEvents).post(createEvent);
router.route('/:id').put(updateEvent).delete(deleteEvent);

export default router;
