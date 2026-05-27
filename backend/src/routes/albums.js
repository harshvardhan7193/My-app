import { Router } from 'express';
import { getAlbums, getAlbum, createAlbum, updateAlbum, deleteAlbum, addPhoto, deletePhoto } from '../controllers/albumController.js';
import { protect, injectCoupleId } from '../middleware/auth.js';
import { trackActivity } from '../middleware/trackActivity.js';

const router = Router();

router.use(protect, injectCoupleId, trackActivity);

router.route('/').get(getAlbums).post(createAlbum);
router.route('/:id').get(getAlbum).put(updateAlbum).delete(deleteAlbum);
router.post('/:id/photos', addPhoto);
router.delete('/:id/photos/:photoId', deletePhoto);

export default router;
