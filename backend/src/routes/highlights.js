import { Router } from 'express';
import { createHighlight, getHighlights, updateHighlight, deleteHighlight } from '../controllers/highlightController.js';
import { protect, injectCoupleId } from '../middleware/auth.js';

const router = Router();

router.use(protect, injectCoupleId);

router.route('/')
  .get(getHighlights)
  .post(createHighlight);

router.route('/:id')
  .put(updateHighlight)
  .delete(deleteHighlight);

export default router;
