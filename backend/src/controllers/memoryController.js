import Memory from '../models/Memory.js';
import asyncHandler from '../utils/asyncHandler.js';
import cloudinary from '../config/cloudinary.js';
import { sendPushToPartner } from '../services/notificationService.js';
import { isAdmin, notDeletedFilter } from '../utils/accessControl.js';

// @desc    List all memories (with filters)
// @route   GET /api/memories
export const getMemories = asyncHandler(async (req, res) => {
  const { category, search, favorites, limit = 50, page = 1 } = req.query;
  const filter = { coupleId: req.coupleId, ...notDeletedFilter(req) };

  if (category && category !== 'All') filter.category = category;
  if (favorites === 'true') filter.favorite = true;
  if (search) filter.title = { $regex: search, $options: 'i' };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [memories, total] = await Promise.all([
    Memory.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit)).populate('uploadedBy', 'name avatar'),
    Memory.countDocuments(filter),
  ]);

  res.json({ memories, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

// @desc    Get single memory
// @route   GET /api/memories/:id
export const getMemory = asyncHandler(async (req, res) => {
  const memory = await Memory.findOne({
    _id: req.params.id,
    coupleId: req.coupleId,
    ...notDeletedFilter(req),
  }).populate('uploadedBy', 'name avatar');
  if (!memory) { res.status(404); throw new Error('Memory not found'); }
  res.json(memory);
});

// @desc    Create memory
// @route   POST /api/memories
export const createMemory = asyncHandler(async (req, res) => {
  const memory = await Memory.create({
    ...req.body,
    uploadedBy: req.user._id,
    coupleId: req.coupleId,
  });

  const senderName = req.user.name || 'your partner';
  await sendPushToPartner(req.user._id, req.coupleId, {
    title: `📸 New memory from ${senderName}`,
    body: memory.title || "A new photo was added to your gallery",
    imageUrl: memory.imageUrl,
    data: { url: `/memory/${memory._id}` }
  }, 'media');

  res.status(201).json(memory);
});

// @desc    Update memory
// @route   PUT /api/memories/:id
export const updateMemory = asyncHandler(async (req, res) => {
  const memory = await Memory.findOne({
    _id: req.params.id,
    coupleId: req.coupleId,
    ...notDeletedFilter(req),
  });
  if (!memory) { res.status(404); throw new Error('Memory not found'); }
  Object.assign(memory, req.body);
  await memory.save();
  res.json(memory);
});

// @desc    Toggle favorite
// @route   PATCH /api/memories/:id/favorite
export const toggleFavorite = asyncHandler(async (req, res) => {
  const memory = await Memory.findOne({
    _id: req.params.id,
    coupleId: req.coupleId,
    ...notDeletedFilter(req),
  });
  if (!memory) { res.status(404); throw new Error('Memory not found'); }
  memory.favorite = !memory.favorite;
  await memory.save();
  res.json(memory);
});

// @desc    Delete memory
// @route   DELETE /api/memories/:id
export const deleteMemory = asyncHandler(async (req, res) => {
  const memory = await Memory.findOne({
    _id: req.params.id,
    coupleId: req.coupleId,
    ...notDeletedFilter(req),
  });
  if (!memory) { res.status(404); throw new Error('Memory not found'); }

  if (isAdmin(req) && req.query.permanent === 'true') {
    if (memory.imgPublicId) {
      try {
        await cloudinary.uploader.destroy(memory.imgPublicId);
      } catch (err) {
        console.error(`Cloudinary destroy failed for ${memory.imgPublicId}:`, err.message);
      }
    }
    await memory.deleteOne();
    return res.json({ message: 'Memory permanently deleted' });
  }

  memory.deletedAt = new Date();
  memory.deletedBy = req.user._id;
  await memory.save();
  res.json({ message: 'Memory deleted', softDeleted: true });
});
