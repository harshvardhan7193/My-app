import { Router } from 'express';
import { getMemories, getMemory, createMemory, updateMemory, toggleFavorite, deleteMemory } from '../controllers/memoryController.js';
import { protect, injectCoupleId } from '../middleware/auth.js';

const router = Router();

router.use(protect, injectCoupleId);

router.route('/').get(getMemories).post(createMemory);
router.route('/:id').get(getMemory).put(updateMemory).delete(deleteMemory);
router.patch('/:id/favorite', toggleFavorite);

export default router;
