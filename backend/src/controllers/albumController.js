import Album from '../models/Album.js';
import asyncHandler from '../utils/asyncHandler.js';
import cloudinary from '../config/cloudinary.js';

// Best-effort destroy — never throws so a missing/orphan asset doesn't fail a delete request
const destroyAsset = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error(`Cloudinary destroy failed for ${publicId}:`, err.message);
  }
};

export const getAlbums = asyncHandler(async (req, res) => {
  const albums = await Album.find({ coupleId: req.coupleId }).sort({ date: -1 }).populate('createdBy', 'name avatar');
  res.json(albums);
});

export const getAlbum = asyncHandler(async (req, res) => {
  const album = await Album.findOne({ _id: req.params.id, coupleId: req.coupleId }).populate('createdBy', 'name avatar');
  if (!album) { res.status(404); throw new Error('Album not found'); }
  res.json(album);
});

export const createAlbum = asyncHandler(async (req, res) => {
  const album = await Album.create({ ...req.body, createdBy: req.user._id, coupleId: req.coupleId });
  res.status(201).json(album);
});

export const updateAlbum = asyncHandler(async (req, res) => {
  const album = await Album.findOneAndUpdate({ _id: req.params.id, coupleId: req.coupleId }, req.body, { new: true });
  if (!album) { res.status(404); throw new Error('Album not found'); }
  res.json(album);
});

export const deleteAlbum = asyncHandler(async (req, res) => {
  const album = await Album.findOneAndDelete({ _id: req.params.id, coupleId: req.coupleId });
  if (!album) { res.status(404); throw new Error('Album not found'); }

  // Clean up Cloudinary assets: cover + every photo
  await destroyAsset(album.coverPublicId);
  await Promise.all((album.photos || []).map((p) => destroyAsset(p.publicId)));

  res.json({ message: 'Album deleted' });
});

export const addPhoto = asyncHandler(async (req, res) => {
  const album = await Album.findOne({ _id: req.params.id, coupleId: req.coupleId });
  if (!album) { res.status(404); throw new Error('Album not found'); }
  album.photos.push(req.body);
  await album.save();
  res.status(201).json(album);
});

export const deletePhoto = asyncHandler(async (req, res) => {
  const album = await Album.findOne({ _id: req.params.id, coupleId: req.coupleId });
  if (!album) { res.status(404); throw new Error('Album not found'); }

  const removed = album.photos.find(p => p._id.toString() === req.params.photoId);
  album.photos = album.photos.filter(p => p._id.toString() !== req.params.photoId);
  await album.save();

  if (removed) await destroyAsset(removed.publicId);

  res.json(album);
});
