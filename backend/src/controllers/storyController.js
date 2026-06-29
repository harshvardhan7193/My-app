import Story from "../models/Story.js";
import Highlight from "../models/Highlight.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendPushToPartner } from "../services/notificationService.js";
import { isAdmin, notDeletedFilter } from "../utils/accessControl.js";

const ALLOWED_STORY_EMOJIS = ["❤️", "😂", "💋", "😘", "🔥", "👏"];

const populateStory = (id) =>
  Story.findById(id)
    .populate("user", "name avatar role")
    .populate("reactions.user", "name avatar role");

const loadAuthorizedStory = async (req, res, id) => {
  const story = await Story.findById(id);

  if (!story) {
    res.status(404);
    throw new Error("Story not found");
  }

  if (story.coupleId.toString() !== req.coupleId.toString()) {
    res.status(403);
    throw new Error("Not authorized to access this story");
  }

  if (!isAdmin(req) && story.deletedAt) {
    res.status(404);
    throw new Error("Story not found");
  }

  return story;
};

// @desc    Create a new story
// @route   POST /api/stories
// @access  Private
export const createStory = asyncHandler(async (req, res) => {
  const { mediaUrl, mediaType, caption } = req.body;

  if (!mediaUrl) {
    res.status(400);
    throw new Error("Please provide a media URL");
  }

  const story = await Story.create({
    mediaUrl,
    mediaType: mediaType || "image",
    caption: caption || "",
    user: req.user._id,
    coupleId: req.coupleId,
    views: [req.user._id], // creator automatically views their story
  });

  const populatedStory = await Story.findById(story._id).populate(
    "user",
    "name avatar role",
  );

  const senderName = req.user.name || "your partner";
  try {
    await sendPushToPartner(
      req.user._id,
      req.coupleId,
      {
        title: `✨ ${senderName} added a story`,
        body: story.caption || "Tap to view their new story",
        data: { url: `/dashboard` },
      },
      "media",
    );
  } catch (err) {
    console.error("[stories] partner push failed:", err.message);
  }

  res.status(201).json(populatedStory);
});

// @desc    Get active stories for the couple (expiresAt > now)
// @route   GET /api/stories
// @access  Private
export const getActiveStories = asyncHandler(async (req, res) => {
  const now = new Date();

  const stories = await Story.find({
    coupleId: req.coupleId,
    expiresAt: { $gt: now },
    ...notDeletedFilter(req),
  })
    .populate("user", "name avatar role")
    .sort({ createdAt: 1 }); // Chronological order of play

  res.json(stories);
});

// @desc    Get archived/all stories for the couple (for creating highlights)
// @route   GET /api/stories/archive
// @access  Private
export const getArchivedStories = asyncHandler(async (req, res) => {
  const stories = await Story.find({
    coupleId: req.coupleId,
    ...notDeletedFilter(req),
  })
    .populate("user", "name avatar role")
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
    throw new Error("Story not found");
  }

  // Ensure story belongs to the couple
  if (story.coupleId.toString() !== req.coupleId.toString()) {
    res.status(403);
    throw new Error("Not authorized to view this story");
  }

  if (!isAdmin(req) && story.deletedAt) {
    res.status(404);
    throw new Error("Story not found");
  }

  if (!story.views.includes(userId)) {
    story.views.push(userId);
    await story.save();
  }

  const populated = await Story.findById(id).populate(
    "user",
    "name avatar role",
  );
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
    throw new Error("Story not found");
  }

  // Authorize
  if (story.coupleId.toString() !== req.coupleId.toString()) {
    res.status(403);
    throw new Error("Not authorized to delete this story");
  }

  if (!isAdmin(req) && story.deletedAt) {
    res.status(404);
    throw new Error("Story not found");
  }

  if (isAdmin(req) && req.query.permanent === "true") {
    await Story.deleteOne({ _id: id });
    await Highlight.updateMany(
      { coupleId: req.coupleId, stories: id },
      { $pull: { stories: id } },
    );
    return res.json({ message: "Story permanently deleted" });
  }

  story.deletedAt = new Date();
  story.deletedBy = req.user._id;
  await story.save();

  res.json({ message: "Story deleted successfully", softDeleted: true });
});

// @desc    Toggle like on a story
// @route   PATCH /api/stories/:id/like
// @access  Private
export const toggleStoryLike = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const story = await loadAuthorizedStory(req, res, id);

  if (story.user.toString() === userId.toString()) {
    res.status(400);
    throw new Error("Cannot like your own story");
  }

  const likeIndex = story.likes.findIndex(
    (uid) => uid.toString() === userId.toString(),
  );
  const wasLiked = likeIndex !== -1;

  if (wasLiked) {
    story.likes.splice(likeIndex, 1);
  } else {
    story.likes.push(userId);
  }

  await story.save();

  if (!wasLiked) {
    const senderName = req.user.name || "Your partner";
    try {
      await sendPushToPartner(
        req.user._id,
        req.coupleId,
        {
          title: `${senderName} liked your story`,
          body: story.caption || "Tap to view",
          data: { url: "/dashboard" },
        },
        "media",
      );
    } catch (err) {
      console.error("[stories] like push failed:", err.message);
    }
  }

  const populated = await populateStory(id);
  res.json(populated);
});

// @desc    React to a story with an emoji
// @route   POST /api/stories/:id/react
// @access  Private
export const reactToStory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { emoji } = req.body;
  const userId = req.user._id;
  const story = await loadAuthorizedStory(req, res, id);

  if (story.user.toString() === userId.toString()) {
    res.status(400);
    throw new Error("Cannot react to your own story");
  }

  if (!emoji || !ALLOWED_STORY_EMOJIS.includes(emoji)) {
    res.status(400);
    throw new Error("Invalid reaction emoji");
  }

  const existingIndex = story.reactions.findIndex(
    (r) => r.user.toString() === userId.toString(),
  );
  const previousEmoji =
    existingIndex !== -1 ? story.reactions[existingIndex].emoji : null;

  if (existingIndex !== -1) {
    story.reactions[existingIndex].emoji = emoji;
    story.reactions[existingIndex].createdAt = new Date();
  } else {
    story.reactions.push({ user: userId, emoji });
  }

  await story.save();

  if (previousEmoji !== emoji) {
    const senderName = req.user.name || "Your partner";
    try {
      await sendPushToPartner(
        req.user._id,
        req.coupleId,
        {
          title: `${senderName} reacted ${emoji} to your story`,
          body: story.caption || emoji,
          data: { url: "/dashboard" },
        },
        "media",
      );
    } catch (err) {
      console.error("[stories] react push failed:", err.message);
    }
  }

  const populated = await populateStory(id);
  res.json(populated);
});

// @desc    Remove reaction from a story
// @route   DELETE /api/stories/:id/react
// @access  Private
export const removeStoryReaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const story = await loadAuthorizedStory(req, res, id);

  story.reactions = story.reactions.filter(
    (r) => r.user.toString() !== userId.toString(),
  );
  await story.save();

  const populated = await populateStory(id);
  res.json(populated);
});
