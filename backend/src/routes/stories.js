import { Router } from 'express';
import {
  createStory,
  getActiveStories,
  getArchivedStories,
  viewStory,
  deleteStory,
  toggleStoryLike,
  reactToStory,
  removeStoryReaction,
} from '../controllers/storyController.js';
import { protect, injectCoupleId } from '../middleware/auth.js';

const router = Router();

router.use(protect, injectCoupleId);

router.route('/')
  .get(getActiveStories)
  .post(createStory);

router.get('/archive', getArchivedStories);

router.patch('/:id/view', viewStory);
router.patch('/:id/like', toggleStoryLike);
router.post('/:id/react', reactToStory);
router.delete('/:id/react', removeStoryReaction);
router.delete('/:id', deleteStory);

export default router;
