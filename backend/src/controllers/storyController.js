import Story from '../models/Story.js';
import Highlight from '../models/Highlight.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Create a new story
// @route   POST /api/stories
// @access  Private
export const createStory = asyncHandler(async (req, res) => {
  const { mediaUrl, mediaType, caption } = req.body;

  if (!mediaUrl) {
    res.status(400);
    throw new Error('Please provide a media URL');
  }

  const story = await Story.create({
    mediaUrl,
    mediaType: mediaType || 'image',
    caption: caption || '',
    user: req.user._id,
    coupleId: req.coupleId,
    views: [req.user._id] // creator automatically views their story
  });

  const populatedStory = await Story.findById(story._id).populate('user', 'name avatar role');

  res.status(201).json(populatedStory);
});

// @desc    Get active stories for the couple (expiresAt > now)
// @route   GET /api/stories
// @access  Private
export const getActiveStories = asyncHandler(async (req, res) => {
  const now = new Date();
  
  const stories = await Story.find({
    coupleId: req.coupleId,
    expiresAt: { $gt: now }
  })
  .populate('user', 'name avatar role')
  .sort({ createdAt: 1 }); // Chronological order of play

  res.json(stories);
});

// @desc    Get archived/all stories for the couple (for creating highlights)
// @route   GET /api/stories/archive
// @access  Private
export const getArchivedStories = asyncHandler(async (req, res) => {
  const stories = await Story.find({
    coupleId: req.coupleId
  })
  .populate('user', 'name avatar role')
  .sort({ createdAt: -1 }); // Newest first

  res.json(stories);
});

// @desc    Mark story as viewed by current user
// @route   PATCH /api/stories/:id/view
// @access  Private
export const viewStory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const story = await Story.findById(id);

  if (!story) {
    res.status(404);
    throw new Error('Story not found');
  }

  // Ensure story belongs to the couple
  if (story.coupleId.toString() !== req.coupleId.toString()) {
    res.status(403);
    throw new Error('Not authorized to view this story');
  }

  if (!story.views.includes(userId)) {
    story.views.push(userId);
    await story.save();
  }

  const populated = await Story.findById(id).populate('user', 'name avatar role');
  res.json(populated);
});

// @desc    Delete a story
// @route   DELETE /api/stories/:id
// @access  Private
export const deleteStory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const story = await Story.findById(id);

  if (!story) {
    res.status(404);
    throw new Error('Story not found');
  }

  // Authorize
  if (story.coupleId.toString() !== req.coupleId.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this story');
  }

  await Story.deleteOne({ _id: id });

  // Cascade: drop this story id from any highlights that referenced it
  await Highlight.updateMany(
    { coupleId: req.coupleId, stories: id },
    { $pull: { stories: id } }
  );

  res.json({ message: 'Story deleted successfully' });
});
