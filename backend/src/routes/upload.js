import { Router } from 'express';
import multer from 'multer';
import {
  uploadFile,
  deleteFile,
  getUploadSignature,
} from '../controllers/uploadController.js';
import { protect, injectCoupleId } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Multer config — memory storage, 100MB limit, allow any file format.
// Only the legacy /api/upload endpoint uses this; the new direct-to-
// Cloudinary path doesn't touch multer at all.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, _file, cb) => cb(null, true),
});

router.use(protect, injectCoupleId);

// Primary upload path: client gets a signed signature and POSTs the file
// straight to api.cloudinary.com. Tiny JSON response, no file bytes through
// Vercel.
router.post('/signature', uploadLimiter, getUploadSignature);

// Legacy server-proxied upload — fallback only. Slow for large files and
// can saturate the SPA's HTTP/2 connection to this origin.
router.post('/', uploadLimiter, upload.single('file'), uploadFile);
// publicId may contain `/` (Cloudinary folders) — the client must URL-encode it
router.delete('/:publicId', deleteFile);

export default router;
