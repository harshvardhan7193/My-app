import Highlight from '../models/Highlight.js';
import Story from '../models/Story.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Create a new highlight
// @route   POST /api/highlights
// @access  Private
export const createHighlight = asyncHandler(async (req, res) => {
  const { title, coverUrl, stories } = req.body;

  if (!title || !coverUrl || !stories || stories.length === 0) {
    res.status(400);
    throw new Error('Please provide a title, cover image, and at least one story');
  }

  const highlight = await Highlight.create({
    title,
    coverUrl,
    stories,
    coupleId: req.coupleId,
    createdBy: req.user._id,
  });

  const populated = await Highlight.findById(highlight._id).populate({
    path: 'stories',
    populate: { path: 'user', select: 'name avatar role' }
  });

  res.status(201).json(populated);
});

// @desc    Get all highlights for the couple
// @route   GET /api/highlights
// @access  Private
export const getHighlights = asyncHandler(async (req, res) => {
  const highlights = await Highlight.find({ coupleId: req.coupleId })
    .populate({
      path: 'stories',
      populate: { path: 'user', select: 'name avatar role' }
    })
    .sort({ createdAt: -1 });

  res.json(highlights);
});

// @desc    Update a highlight (add/remove stories, change cover/title)
// @route   PUT /api/highlights/:id
// @access  Private
export const updateHighlight = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, coverUrl, stories } = req.body;

  const highlight = await Highlight.findById(id);

  if (!highlight) {
    res.status(404);
    throw new Error('Highlight not found');
  }

  if (highlight.coupleId.toString() !== req.coupleId.toString()) {
    res.status(403);
    throw new Error('Not authorized to edit this highlight');
  }

  if (title) highlight.title = title;
  if (coverUrl) highlight.coverUrl = coverUrl;
  if (stories) highlight.stories = stories;

  await highlight.save();

  const populated = await Highlight.findById(highlight._id).populate({
    path: 'stories',
    populate: { path: 'user', select: 'name avatar role' }
  });

  res.json(populated);
});

// @desc    Delete a highlight
// @route   DELETE /api/highlights/:id
// @access  Private
export const deleteHighlight = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const highlight = await Highlight.findById(id);

  if (!highlight) {
    res.status(404);
    throw new Error('Highlight not found');
  }

  if (highlight.coupleId.toString() !== req.coupleId.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this highlight');
  }

  await Highlight.deleteOne({ _id: id });

  res.json({ message: 'Highlight deleted successfully' });
});
