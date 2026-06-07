import cloudinary from '../config/cloudinary.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Issue a short-lived signed upload signature so the client can POST
//          files DIRECTLY to Cloudinary instead of routing 100MB payloads
//          through our Vercel serverless function.
//
//          Why this matters: when the file streams through `/api/upload`, it
//          goes Client → Vercel(frontend rewrite) → Vercel(backend function)
//          → multer-in-RAM → Cloudinary. That path saturates the SPA's single
//          HTTP/2 connection to our origin, so every other small JSON API
//          call gets starved behind the upload's flow-control window. By
//          uploading direct to api.cloudinary.com (different origin, separate
//          connection), the rest of the app stays snappy during big uploads.
// @route   POST /api/upload/signature
// @access  Private (couple member)
export const getUploadSignature = asyncHandler(async (req, res) => {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = `loveapp/${req.coupleId}`;

  // Cloudinary signs the alphabetical concatenation of these param values
  // plus the api_secret. The client MUST submit identical values back to
  // api.cloudinary.com or Cloudinary will reject the upload as tampered.
  // We intentionally do NOT sign a `transformation`: eager transforms
  // would slow the upload response, and `f_auto,q_auto` delivery URLs do
  // the same compression work on-demand at the CDN edge.
  const paramsToSign = { timestamp, folder };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );

  res.json({
    signature,
    timestamp,
    folder,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
});

// @desc    Upload file to Cloudinary (LEGACY — fallback only).
//          Kept around so existing clients keep working during a deploy
//          rollout. New code paths use getUploadSignature + direct upload.
// @route   POST /api/upload
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  // Upload buffer to Cloudinary
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `loveapp/${req.coupleId}`,
        resource_type: 'auto',
        transformation: [
          { quality: 'auto:good', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(req.file.buffer);
  });

  res.status(201).json({
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
    resourceType: result.resource_type,
    originalFilename: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });
});

// @desc    Delete file from Cloudinary
// @route   DELETE /api/upload/:publicId
export const deleteFile = asyncHandler(async (req, res) => {
  const { publicId } = req.params;

  // Decode the publicId (may contain slashes encoded as dashes)
  const result = await cloudinary.uploader.destroy(publicId);

  if (result.result !== 'ok') {
    res.status(400);
    throw new Error('Failed to delete file from Cloudinary');
  }

  res.json({ message: 'File deleted from Cloudinary' });
});
