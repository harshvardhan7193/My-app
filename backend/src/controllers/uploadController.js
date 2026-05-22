import cloudinary from '../config/cloudinary.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Upload file to Cloudinary
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
