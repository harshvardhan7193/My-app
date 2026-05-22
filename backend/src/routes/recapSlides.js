import { Router } from 'express';
import { getSlides, createSlide, updateSlide, deleteSlide, reorderSlides } from '../controllers/recapSlideController.js';
import { protect, injectCoupleId } from '../middleware/auth.js';

const router = Router();

router.use(protect, injectCoupleId);

router.route('/').get(getSlides).post(createSlide);
router.put('/reorder', reorderSlides);
router.route('/:id').put(updateSlide).delete(deleteSlide);

export default router;
