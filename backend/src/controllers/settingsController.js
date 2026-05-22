import Settings from '../models/Settings.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne({ coupleId: req.coupleId });
  if (!settings) {
    settings = await Settings.create({ coupleId: req.coupleId });
  }
  res.json(settings);
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.findOneAndUpdate(
    { coupleId: req.coupleId },
    req.body,
    { new: true, upsert: true, runValidators: true }
  );
  res.json(settings);
});
