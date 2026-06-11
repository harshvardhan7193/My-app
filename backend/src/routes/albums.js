import { Router } from 'express';
import {
  getAlbums,
  getAlbum,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  addPhoto,
  deletePhoto,
  deletePhotos,
  movePhotos,
  getPrivateAlbums,
  unlockAlbum,
  resetAlbumPin,
} from '../controllers/albumController.js';
import { protect, injectCoupleId } from '../middleware/auth.js';
import { trackActivity } from '../middleware/trackActivity.js';
import { requireVaultToken } from '../middleware/albumPrivacy.js';

const router = Router();

router.use(protect, injectCoupleId, trackActivity);

// Vault-gated operations come BEFORE the generic /:id matchers so the
// literal "/private" segment isn't captured as an albumId.
router.get('/private', requireVaultToken, getPrivateAlbums);
router.post('/:id/reset-pin', requireVaultToken, resetAlbumPin);

// Per-album unlock: the route itself is open (since the user might not
// yet have a vault token at the moment they tap a private album), but
// the unlockAlbum controller still requires the album to exist + be
// private + the supplied PIN to match before it returns a token.
router.post('/:id/unlock', unlockAlbum);

// createAlbum branches inside the controller: a non-private album works
// like before; a private album additionally requires a vault token,
// enforced here so we never accidentally create a private album for an
// un-vaulted caller.
router.post('/', (req, res, next) => {
  if (req.body?.isPrivate) return requireVaultToken(req, res, next);
  return next();
}, createAlbum);

router.route('/').get(getAlbums);
router.route('/:id').get(getAlbum).put(updateAlbum).delete(deleteAlbum);
router.post('/:id/photos', addPhoto);
router.delete('/:id/photos', deletePhotos); // Bulk delete
router.post('/:id/move-photos', movePhotos); // Bulk move
router.delete('/:id/photos/:photoId', deletePhoto);

export default router;
