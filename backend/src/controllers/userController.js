import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get current user profile
// @route   GET /api/users/me
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json(user);
});

// @desc    Update own profile
// @route   PUT /api/users/me
export const updateMe = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'location', 'birthday', 'avatar', 'mood', 'bio', 'preferredTheme'];
  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const updateOp = { $set: updates };
  if (req.body.fcmToken) {
    updateOp.$addToSet = { fcmTokens: req.body.fcmToken };
  }

  let user = await User.findByIdAndUpdate(req.user._id, updateOp, { new: true, runValidators: true });
  
  if (user && user.fcmTokens && user.fcmTokens.length > 5) {
    user.fcmTokens = user.fcmTokens.slice(-5);
    user = await user.save({ validateBeforeSave: false });
  }

  res.json(user);
});

// @desc    Deregister FCM Token
// @route   DELETE /api/users/me/fcm-token
export const deregisterFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400);
    throw new Error('Token is required');
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { fcmTokens: token } },
    { new: true }
  );

  res.json({ message: 'Token deregistered successfully' });
});

// @desc    Get partner profile
// @route   GET /api/users/partner
export const getPartner = asyncHandler(async (req, res) => {
  const partner = await User.findOne({
    coupleId: req.coupleId,
    _id: { $ne: req.user._id },
  });

  if (!partner) {
    res.status(404);
    throw new Error('Partner not found');
  }

  res.json(partner);
});

// @desc    List both users (admin)
// @route   GET /api/users
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ coupleId: req.coupleId });
  res.json(users);
});

// @desc    Update any user (admin)
// @route   PUT /api/users/:id
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, coupleId: req.coupleId },
    req.body,
    { new: true, runValidators: true }
  );

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json(user);
});
