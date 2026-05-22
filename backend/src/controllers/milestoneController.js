import Milestone from '../models/Milestone.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getMilestones = asyncHandler(async (req, res) => {
  const milestones = await Milestone.find({ coupleId: req.coupleId }).sort({ order: 1 });
  res.json(milestones);
});

export const createMilestone = asyncHandler(async (req, res) => {
  const count = await Milestone.countDocuments({ coupleId: req.coupleId });
  const milestone = await Milestone.create({ ...req.body, order: count, coupleId: req.coupleId });
  res.status(201).json(milestone);
});

export const updateMilestone = asyncHandler(async (req, res) => {
  const milestone = await Milestone.findOneAndUpdate({ _id: req.params.id, coupleId: req.coupleId }, req.body, { new: true });
  if (!milestone) { res.status(404); throw new Error('Milestone not found'); }
  res.json(milestone);
});

export const deleteMilestone = asyncHandler(async (req, res) => {
  const milestone = await Milestone.findOneAndDelete({ _id: req.params.id, coupleId: req.coupleId });
  if (!milestone) { res.status(404); throw new Error('Milestone not found'); }
  res.json({ message: 'Milestone deleted' });
});

export const reorderMilestones = asyncHandler(async (req, res) => {
  const { order } = req.body; // Array of { id, order }
  const ops = order.map(item => ({
    updateOne: { filter: { _id: item.id, coupleId: req.coupleId }, update: { order: item.order } }
  }));
  await Milestone.bulkWrite(ops);
  res.json({ message: 'Milestones reordered' });
});
