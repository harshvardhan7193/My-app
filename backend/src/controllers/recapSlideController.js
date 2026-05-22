import RecapSlide from '../models/RecapSlide.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getSlides = asyncHandler(async (req, res) => {
  const slides = await RecapSlide.find({ coupleId: req.coupleId }).sort({ order: 1 });
  res.json(slides);
});

export const createSlide = asyncHandler(async (req, res) => {
  const count = await RecapSlide.countDocuments({ coupleId: req.coupleId });
  const slide = await RecapSlide.create({ ...req.body, order: count, coupleId: req.coupleId });
  res.status(201).json(slide);
});

export const updateSlide = asyncHandler(async (req, res) => {
  const slide = await RecapSlide.findOneAndUpdate({ _id: req.params.id, coupleId: req.coupleId }, req.body, { new: true });
  if (!slide) { res.status(404); throw new Error('Slide not found'); }
  res.json(slide);
});

export const deleteSlide = asyncHandler(async (req, res) => {
  const slide = await RecapSlide.findOneAndDelete({ _id: req.params.id, coupleId: req.coupleId });
  if (!slide) { res.status(404); throw new Error('Slide not found'); }
  res.json({ message: 'Slide deleted' });
});

export const reorderSlides = asyncHandler(async (req, res) => {
  const { order } = req.body;
  const ops = order.map(item => ({
    updateOne: { filter: { _id: item.id, coupleId: req.coupleId }, update: { order: item.order } }
  }));
  await RecapSlide.bulkWrite(ops);
  res.json({ message: 'Slides reordered' });
});
