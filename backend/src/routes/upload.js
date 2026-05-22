import { Router } from 'express';
import multer from 'multer';
import { uploadFile, deleteFile } from '../controllers/uploadController.js';
import { protect, injectCoupleId } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Multer config — memory storage, 100MB limit, allow any file format.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, _file, cb) => cb(null, true),
});

router.use(protect, injectCoupleId);

router.post('/', uploadLimiter, upload.single('file'), uploadFile);
// publicId may contain `/` (Cloudinary folders) — the client must URL-encode it
router.delete('/:publicId', deleteFile);

export default router;
