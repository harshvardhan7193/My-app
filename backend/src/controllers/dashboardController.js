import Memory from '../models/Memory.js';
import Album from '../models/Album.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get dashboard aggregated data
// @route   GET /api/dashboard
export const getDashboard = asyncHandler(async (req, res) => {
  const coupleId = req.coupleId;

  const [
    memoriesCount,
    albumsCount,
    recentMemories,
    partner,
    settings,
    upcomingEvents,
  ] = await Promise.all([
    Memory.countDocuments({ coupleId }),
    Album.countDocuments({ coupleId }),
    Memory.find({ coupleId }).sort({ date: -1 }).limit(5).select('title img date'),
    User.findOne({ coupleId, _id: { $ne: req.user._id } }).select('name avatar mood'),
    Settings.findOne({ coupleId }),
    Event.find({ coupleId, date: { $gte: new Date() } }).sort({ date: 1 }).limit(3),
  ]);

  // Calculate days together
  let daysTogether = 0;
  let daysUntilAnniversary = null;
  if (settings?.anniversaryDate) {
    const anniv = new Date(settings.anniversaryDate);
    daysTogether = Math.floor((Date.now() - anniv.getTime()) / (1000 * 60 * 60 * 24));

    // Next anniversary
    const now = new Date();
    const nextAnniv = new Date(now.getFullYear(), anniv.getMonth(), anniv.getDate());
    if (nextAnniv < now) nextAnniv.setFullYear(now.getFullYear() + 1);
    daysUntilAnniversary = Math.ceil((nextAnniv - now) / (1000 * 60 * 60 * 24));
  }

  res.json({
    memoriesCount,
    albumsCount,
    daysTogether,
    daysUntilAnniversary,
    recentMemories,
    partner,
    upcomingEvents,
  });
});
